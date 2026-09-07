---
id: 01M1XVE1FTA4WBRK9S8ZH95XXN
title: The CAP theorem — under a partition, you choose consistency or availability
topic:
  - distributed-systems
---

The CAP theorem is a statement about what you have to **give up**, and leading with the
sacrifice rather than the acronym is what makes it a senior answer instead of a flashcard. It
says: when the network splits a distributed system into groups of nodes that cannot talk to
each other — a **partition** — you can keep every node answering requests, or you can keep
every node agreeing on the data, but not both. One of the two has to yield, and the
interesting engineering is in choosing *which*, deliberately, for the workload in front of you.

The result began as **Brewer's conjecture**, presented at PODC 2000, and became a theorem when
Seth Gilbert and Nancy Lynch
[proved it in 2002](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf). Their proof
is worth knowing exists, because "it's proven" is a different claim from "it's a rule of
thumb", and the precision of their three definitions is where most of the confusion around CAP
dissolves.

## The three properties, defined precisely

The whole theorem turns on what the three words actually mean, and each is narrower than its
everyday sense:

- **Consistency (C)** — in Gilbert & Lynch's proof this is **linearizability**, also called
  atomic consistency: there is a single, up-to-date copy of the data as far as any client can
  tell, so every read returns the most recent write. It is *not* the "C" of ACID
  [[transactions-and-acid|transactions]], which is about a database moving between valid
  states; the shared letter is a genuine trap.
- **Availability (A)** — every request that reaches a **non-failing** node gets a
  non-error response. Not "fast", not "usually up" — every working node must actually answer
  rather than hang or refuse.
- **Partition tolerance (P)** — the system keeps operating even when the network drops
  arbitrarily many messages between nodes. A partition is not a node crashing; it is nodes that
  are each alive and serving but unable to reach one another.

```quiz 01M1XVE1FV3XG8VE3VJMYADTCZ
The "C" in CAP and the "C" in ACID are the same guarantee.

- [x] False — CAP's C is linearizability (one up-to-date copy, reads see the latest write)
  > CAP's consistency is about all nodes agreeing on the current value at once. ACID's is
    about a single transaction moving the database between valid states. Different concerns
    that happen to share a letter — a classic interview trap.
- [ ] True — both mean the data is never in an invalid state
  > This is the trap. ACID's C is about transactional invariants on one database; CAP's C is
    linearizability across nodes — every read reflects the latest write. Reasoning about a
    distributed design from the ACID definition will mislead you.
```

## "Pick two of three" is the wrong reading

The popular gloss — *choose two of C, A, P* — makes it sound as if all three are on the menu
and you cross one off. In a real distributed system they are not symmetric. **Partitions are
not something you choose to have.** Networks drop packets, links fail, a switch reboots; over
enough machines and enough time a partition is a certainty, not a design option. So a system
that "gives up P" for C and A only means *a system that is not actually distributed* — a single
node, where the question never arises.

That collapses the choice. For any system that spans machines, P is mandatory, and CAP is
really a binary decision about **what happens during the partition you cannot prevent**:

- **CP** — preserve **C**onsistency, sacrifice **A**vailability. When nodes cannot coordinate,
  refuse to serve rather than risk returning stale or conflicting data. The minority side of a
  split stops answering.
- **AP** — preserve **A**vailability, sacrifice **C**onsistency. Keep answering on every side
  of the split and let the copies diverge, then reconcile once the partition heals. This is the
  [[partitioning-replication-and-consistent-hashing|Dynamo]] lineage.

```quiz 01M1XVE1FVY5XHEWK39PRKKVH5 cloze
Because a network partition is inevitable rather than optional, a distributed system cannot
truly trade away {{partition tolerance}}. So CAP reduces to one decision made *during* a
partition: a {{CP}} system stops serving on the disconnected side to protect consistency, while
an {{AP}} system keeps serving everywhere and lets the replicas diverge, reconciling later.
```

## CAP says nothing when the network is healthy

The sharpest limit of CAP — and the thing that marks a candidate who has thought past the
acronym — is that it only speaks about the moment of partition. When the network is fine, CAP
imposes no trade-off at all, yet a real system is still choosing every millisecond between
answering a read from the nearest replica (fast, possibly stale) and confirming with a quorum
first (slow, fresh). That everyday trade-off is invisible to CAP, and it is exactly what
[[pacelc|PACELC]] adds: *else* — when there is no partition — you still trade **L**atency
against **C**onsistency. Reach for PACELC when someone treats a healthy system as if it were
free of trade-offs.

The other honest caveat is in the proof itself. Gilbert & Lynch showed the impossibility is
absolute in the **asynchronous** model, where nodes have no clocks and cannot tell a slow
message from a lost one. In the **partially synchronous** model — where timeouts exist — you
still cannot have both C and A under a partition, but a system can make weaker, useful
guarantees using time. CAP is a hard wall, not a counsel of despair.

## Choosing a side is a product decision

Which letter you sacrifice is not a matter of taste; it follows from what the data is *for*.
Money movement, inventory counts, unique-username registration — anywhere a stale or divergent
answer is a correctness bug — argues for **CP**: better to reject the request than to
double-spend. A social feed, a "likes" count, a product-page view — anywhere an answer that is
seconds out of date is harmless — argues for **AP**: better to serve slightly stale than to
show an error. The senior move is to name the workload's tolerance for staleness first, then
let CAP tell you which guarantee you are allowed to keep.

```quiz 01M1XVE1FV5H2992X3D90QXNY2 recall
You are designing the checkout service for a store: it decrements the stock count when an order
is placed. A network partition splits your database replicas. An interviewer asks whether you
would keep taking orders on both sides of the split. What do you say, and in CAP's vocabulary
what have you chosen?

> I would stop taking orders on at least one side — this wants to be **CP**. If both sides of
> the partition keep decrementing the same stock independently, they will oversell: two
> customers buy the last unit because neither replica can see the other's write. That is a
> correctness bug that costs real money and real refunds, so availability is the right thing to
> sacrifice here. Concretely, the minority side of the split refuses writes (or the whole
> service does) until the partition heals and the replicas can agree again.
>
> The contrast is worth stating out loud to show I know it is a *choice*: if this were a
> "customers viewing this item" counter rather than stock, I would go **AP** — keep serving on
> both sides, let the counts drift, and reconcile afterward, because a wrong view count for a
> few seconds harms nobody. Same system, opposite decision, driven by what a stale answer costs.
```

## What to take away

CAP is a proven impossibility, not a slogan: under a partition you cannot have both
linearizable consistency and full availability, so you pick **CP** or **AP** on purpose, guided
by what a stale answer costs the business. Partition tolerance is not the letter you trade —
it is forced on you by physics — and CAP falls silent the instant the network is healthy, which
is the gap [[pacelc|PACELC]] exists to fill. Retries across a partition need the extra property
that repeating a request does no harm: that is [[idempotency-and-safe-retries|idempotency]],
and it is what lets an AP system reconcile safely.

Worth reading in full:
[Gilbert & Lynch's proof](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf) — short
for a theory paper, and the three definitions in section 2 are the part that repays a careful
read, because almost every CAP misconception is really a definition being used loosely.
