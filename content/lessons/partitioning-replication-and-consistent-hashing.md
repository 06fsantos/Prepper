---
id: 01M1XYM9A7XECTM46KCGHZTMKD
title: Partitioning, replication, and consistent hashing — the Dynamo blueprint
topic:
  - system-design
prerequisites:
  - the-cap-theorem
  - consistency-models
---

Once a dataset outgrows a single machine — too big to fit, or too hot to serve — you reach for
two moves, and the senior skill is keeping them apart in your head because they buy different
things. **Partitioning** (also called sharding) splits the data across machines so each holds a
slice: it buys capacity and throughput. **Replication** copies each slice onto several machines:
it buys survival, so the slice is still there when a machine dies. You almost always want both,
and Amazon's [Dynamo paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
is the canonical blueprint for combining them — it is the design under Cassandra, Riak, and
DynamoDB. Lead the interview with what the design *gives up*: Dynamo deliberately sacrifices
[[the-cap-theorem|consistency under failure]] to stay always-writable, which makes it the
concrete, engineered face of the **AP** choice.

## Partitioning: why not just `hash(key) mod N`?

The obvious way to spread keys over `N` machines is `hash(key) % N` — compute a number from the
key, take it modulo the machine count, and that is the machine. It works right up until `N`
changes. Add one machine to go from 4 to 5 and the modulus changes for almost every key, so
almost every key now maps to a different machine and has to move. A single node joining or
failing triggers a near-total reshuffle of the data, and while that reshuffle runs the cache is
cold and the network is saturated. For a system that adds and loses machines routinely, that is
disqualifying.

**Consistent hashing** is the fix, and it is worth being able to draw. Imagine the hash output
laid out as a ring — `0` at the top, wrapping back around. Hash each *machine* onto a point on
the ring, and hash each *key* onto a point too. A key belongs to the first machine you meet
going clockwise from the key's point. Now add a machine: it lands somewhere on the ring and
takes over only the keys between it and the previous machine going clockwise — a `1/N` slice.
Every other key stays exactly where it was. Remove a machine and only *its* keys move, to the
next node clockwise. The blast radius of a membership change drops from "almost everything" to
"one machine's share".

```quiz 01M1XYM9A8D37FPH5W8KG7E7Z1
A cluster uses `hash(key) % N` to place keys across `N` servers and you add one server. What is
the problem consistent hashing exists to solve?

- [x] Changing `N` remaps almost every key, so nearly all data must move at once
  > `% N` ties every key's location to the machine count, so a single join or failure reshuffles
    the whole dataset. Consistent hashing moves only the ~`1/N` share between the changed node
    and its neighbour, leaving every other key in place.
- [ ] Modulo hashing sends every key to the same server, creating one hot node
  > A decent hash spreads keys evenly across servers; the even spread is not the problem.
    The problem is what happens to that mapping the moment `N` changes.
- [ ] Modulo is slower to compute than hashing a key onto a ring position
  > Both are cheap arithmetic and the compute cost is not the issue. The issue is how much data
    has to relocate when the server count changes, not how fast a placement is computed.
- [ ] Modulo hashing cannot replicate a key onto more than one server
  > Replication is a separate move layered on top of placement, and either scheme can do it.
    What `% N` fails at is placement stability when membership changes.
```

One refinement worth naming so you are not caught out: a handful of machines hashed onto the
ring rarely land evenly, so one machine can own a disproportionate arc. Dynamo's answer is
**virtual nodes** — each physical machine is hashed onto the ring many times, as many small
arcs rather than one big one, which smooths the distribution and lets a more powerful machine
carry proportionally more by claiming more virtual nodes.

## Replication: the preference list

Partitioning alone means each key lives on exactly one machine, so that machine dying takes the
data with it. Replication layers on top: instead of one owner, a key is stored on the **N**
machines encountered clockwise from its ring position — Dynamo calls this the key's *preference
list*. `N` is the replication factor, typically 3. Consistent hashing did the placement; walking
clockwise picks the replicas, so the two mechanisms compose cleanly on the same ring.

Now the [[the-cap-theorem|CAP]] decision becomes concrete. When a partition or a slow node means
some replicas cannot be reached, Dynamo keeps accepting reads and writes on whichever replicas
*are* reachable rather than refusing service. That is the **AP** choice made physical: the
replicas are allowed to diverge, and the price is paid later at reconciliation.

## Reconciliation: versioning, not locking

If two sides of a partition both accept a write to the same key, you end up with two versions
and no clock you can trust to say which came last. Dynamo does **not** try to prevent this with
locking — locking would sacrifice the availability the whole design is built to preserve.
Instead it *detects* the conflict with object versioning (vector clocks): each version carries a
summary of the writes it descends from, so the system can tell a version that supersedes another
(keep the newer) from two versions that genuinely diverged (a real conflict). A true conflict is
handed to the application to resolve, which is why Dynamo's shopping cart *merges* divergent
carts rather than dropping either — losing an "add to cart" is worse than showing a
deleted item again. This is [[consistency-models|eventual consistency]] with the seams showing:
the store guarantees the versions converge, and leaves *what converged means* to whoever knows
the data.

## Quorums: the tunable overlap

The last piece is how many replicas must answer. With `N` replicas, Dynamo lets you set **W**,
the number that must acknowledge a write, and **R**, the number consulted on a read. The single
most useful fact here is the quorum inequality: when **W + R > N**, the set of replicas a read
touches must overlap the set the last write reached by at least one node, so a read is guaranteed
to see the latest write. Set `W + R ≤ N` and you trade that guarantee for lower latency and
higher availability — a read might miss the newest write, which is exactly the eventual-consistency
bargain, now expressed as two dials you can turn per workload.

```quiz 01M1XYM9A8G82R7S3GRF38DQ2J cloze
With `N` replicas per key, a write waits for {{W}} acknowledgements and a read consults {{R}}
replicas. The read is guaranteed to observe the most recent write whenever {{W + R > N}},
because the read set and the write set must then share at least one replica. Choosing values
whose sum is `≤ N` trades that guarantee for lower {{latency}} and higher availability.
```

The dials also let you shape the workload's character: a high `W` with `R = 1` makes reads cheap
and writes expensive (good for read-heavy data), while `W = 1` with a high `R` does the reverse.
This is the same read/write asymmetry a [[back-of-envelope-estimation|back-of-envelope estimate]]
surfaces — the estimate tells you which way the traffic leans, and the quorum settings are where
you act on it.

```quiz 01M1XYM9A86A9BFTNR0D3F1R74 recall
An interviewer asks you to design the storage for a large shopping-cart service: always
writable, even during a network partition, across many machines. Sketch how you would partition,
replicate, and reconcile — and name the trade-off you are making.

> I would place keys with **consistent hashing** on a ring so that adding or losing a machine
> moves only that machine's ~`1/N` share of keys, not the whole dataset, and use virtual nodes
> so the load spreads evenly. Each cart key is **replicated** onto the next `N` machines
> clockwise — the preference list, say `N = 3` — so a machine dying does not lose the cart.
>
> Because the requirement is *always writable*, I would take the **AP** side of CAP: keep
> accepting writes on whatever replicas are reachable during a partition and let them diverge,
> rather than refusing service to stay consistent. That means two versions of a cart can exist,
> so I reconcile by **versioning** — detect the divergence and **merge** the carts (union the
> items) rather than picking a winner, because dropping an added item is the costly error here.
>
> The trade-off I am naming out loud: I am giving up strong consistency under failure to keep
> the cart always available, and paying for it with reconciliation logic the application has to
> own. For a cart that is the right call; for a payments ledger it would be wrong, and I would
> switch to a consistent (CP) design instead. I would also tune quorums — a modest `W` and `R`
> with `W + R ≤ N` — to keep both reads and writes fast, accepting that a read may occasionally
> miss the very latest write.
```

## What to take away

Partitioning and replication are two moves for two jobs: partition for capacity, replicate for
survival, and Dynamo composes them on one consistent-hashing ring — placement by ring position,
replicas by walking clockwise. Consistent hashing exists so that a membership change moves one
machine's share instead of the whole dataset; virtual nodes keep the shares even. On top of that,
Dynamo makes the [[the-cap-theorem|AP]] choice explicit: stay writable under failure, let
replicas diverge, and reconcile with versioning and application-level merges rather than locking
— [[consistency-models|eventual consistency]] built on purpose. The quorum inequality `W + R > N`
is the one line of arithmetic to carry: it is the dial between a guaranteed-fresh read and a fast,
always-available one. Lead with the sacrifice, then draw the ring.

Worth reading in full:
[Amazon's Dynamo paper (SOSP 2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
— section 4, the "system architecture" walk through partitioning, replication, versioning, and
quorums, is the part that repays a close read, because every NoSQL store you will be asked about
is a variation on the choices made there.
