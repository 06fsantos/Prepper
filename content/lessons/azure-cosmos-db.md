---
id: 01M37YEQDQBDCHS0T9HTBX629S
title: Azure Cosmos DB — partitioning, request units, and the five-level consistency dial
topic:
  - nosql-databases
  - distributed-systems
prerequisites:
  - choosing-a-datastore
  - consistency-models
---

Azure Cosmos DB is Microsoft's globally-distributed NoSQL store, and the reason to know it for a
design round is not its API surface but that it makes three distributed-systems trade-offs
**explicit knobs you set per container and per request** — how data is partitioned, how much
throughput you buy, and how strong a consistency you demand. Where a relational database hides
these behind a single node, Cosmos forces the decision into the open, which is exactly why it is a
good vehicle for narrating the tradeoffs the theory notes describe. Treat this Lesson as the
worked example that picks up where [[choosing-a-datastore]] leaves off: you have decided the data
is a self-contained aggregate at scale, and now you have to defend how you would actually run it.
Microsoft's own [Cosmos DB documentation on Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/)
is the primary source and the one to read in full.

## Partition-key design is the decision everything else rides on

Cosmos stores items in a container, and every item carries a **partition key** — a property you
choose whose value places the item in a **logical partition**. All items with the same partition
key value share a logical partition, and that is the unit that matters: a logical partition is
capped at **20 GB**, and it is the scope of a transaction (a stored procedure can only touch one).
Underneath, Cosmos hash-partitions the logical partitions across **physical partitions**, each of
which is an internal, fully-managed shard holding up to 50 GB and serving up to **10,000 RU/s** of
throughput. You never address a physical partition; you design the key and let the service split
and rebalance them as data and throughput grow. This is the same hash-and-spread mechanism
[[partitioning-replication-and-consistent-hashing|the Dynamo blueprint]] describes, packaged so the
only lever you hold is the key.

Because provisioned throughput is divided **evenly** across physical partitions, a key that sends
most traffic to a few values creates a **hot partition**: those partitions exhaust their share of
RU/s and start rejecting requests while the rest of the container sits idle. So a good partition key
has three properties at once — **high cardinality** (many distinct values, so data and load spread),
**even access** (no single value takes a disproportionate share of reads and writes), and, for a
read-heavy container, **alignment with your query filter** so reads can be routed to one partition
rather than fanned out. The key is also **immutable**: you cannot change an item's partition key
value in place, and you cannot change a container's key without copying the data to a new container.
It is the one decision you most want to get right up front, because it is the one you can least
cheaply revisit.

The classic trap is picking a key that is high-cardinality *or* query-aligned but not both. Using
`/id` gives perfect write distribution (every item is its own partition) and cheap point reads, but
any query that filters on something *other* than `id` must fan out across every partition. Using a
low-cardinality field like `status` or `country` reads conveniently but bunches all the data into a
handful of partitions that go hot under load. When no single field is both, the senior moves are a
**synthetic key** (concatenate fields to raise cardinality) or a **hierarchical key** (partition on
`tenantId` then `deviceId`, which also escapes the 20 GB per-value ceiling).

```quiz 01M37YEQDQAHV0BCH74Q907DX5
A multi-tenant telemetry store keeps one item per sensor reading. Reads almost always filter by
`tenantId`, but a handful of large tenants generate most of the writes. Which partition key is the
senior choice?

- [x] A hierarchical key of `tenantId` then `deviceId`, spreading a big tenant's writes across many partitions while keeping tenant-scoped reads routable
  > The `tenantId`-first hierarchy keeps the common read filter single-partition, and the second
    level fans a heavy tenant's writes across sub-partitions so no one logical partition goes hot or
    hits the 20 GB cap. It satisfies cardinality, even access, and query alignment together.
- [ ] `tenantId` alone, because reads filter on it and that keeps every tenant query single-partition
  > Reads route well, but a few large tenants concentrate writes and storage into a few logical
    partitions — those go hot and can breach the 20 GB per-partition limit while the rest sit idle.
- [ ] `/id`, because a unique id per reading gives perfect write distribution across all partitions
  > Writes spread perfectly, but the dominant read filters on `tenantId`, so every tenant query
    fans out across all physical partitions — the expensive cross-partition path this workload runs
    constantly.
- [ ] `deviceId` alone, because there are many devices so cardinality is high
  > Cardinality is high, but the key ignores the `tenantId` filter every read uses, so reads fan
    out across partitions even though writes distribute — high cardinality with no query alignment.
```

## Request Units are the currency, and everything you do spends them

Cosmos does not bill or throttle by CPU, IOPS, or connections directly; it normalises all of them
into one currency, the **Request Unit (RU)**. The reference point to memorise: **a point read of a
1 KB item by its id and partition key costs ~1 RU**. From there the cost model is intuitive —
**writes cost more than reads** (they update the item and every index), **queries cost more than
point reads**, and cost climbs with item size, the number of indexed properties, and query
complexity. The charge is deterministic: the same operation on the same data always costs the same
RUs, and the SDK returns the exact charge on every response, so you can measure rather than guess.

You provision throughput as **RU/s**, and there are three modes worth naming: **provisioned**
(you set a fixed RU/s, billed whether or not you use it — cheapest for steady, predictable load),
**autoscale** (Cosmos scales RU/s within a band as demand moves — for variable or spiky traffic),
and **serverless** (you provision nothing and pay per request consumed — for light or intermittent
workloads). When your consumption exceeds the RU/s available on a partition, Cosmos does not queue
you; it **rate-limits**, returning HTTP **429 (Request rate too large)** with a retry-after hint,
and the SDK retries after that delay. A steady stream of 429s is the signature of either
under-provisioning or — more often the interesting case — a **hot partition** starving on its even
share of the total.

## The five-level consistency dial is the headline feature

Most distributed NoSQL stores offer two settings, strong and eventual. Cosmos offers **five
well-defined levels**, and being able to name them and say what each costs is precisely the
"read past the buzzword" signal [[consistency-models]] describes — Cosmos is that spectrum made
into an account setting. From strongest to weakest:

- **Strong** — linearizability. A read always returns the most recent committed write; no client
  ever sees a stale or partial value. Across regions this is expensive: a write must commit to a
  global majority before it acknowledges, so write latency grows with the distance between your
  farthest regions, and it is unavailable with multiple write regions at all.
- **Bounded staleness** — reads may lag the latest write, but by a bounded amount you configure:
  at most **K versions** or **T time**, whichever comes first. The near-strong option for a
  globally distributed app that wants a ceiling on staleness without paying full linearizability.
- **Session** — the default, and the one most applications actually run on. Within a client
  session it guarantees **read-your-writes** and **monotonic reads** via a session token; outside
  the session it behaves as eventual. This is the [[consistency-models|session consistency]] the
  theory note flags as the practical sweet spot, offered here as a first-class level.
- **Consistent prefix** — reads never see writes **out of order**. You might see an old version,
  but you will never see update 3 before update 2. A batch committed in a transaction is always
  visible as a whole.
- **Eventual** — the weakest: replicas converge once writes stop, with no ordering guarantee. A
  reader can even see values go backwards. Correct for a like count or a non-threaded comment feed,
  where ordering buys nothing.

The knob is not free, and this is the part to say out loud: **stronger reads cost more RUs**.
Strong and bounded staleness serve reads from a two-replica quorum to guarantee freshness, so their
read throughput is **half** that of the three single-replica levels for the same provisioned RU/s.
That is the RU model and the consistency dial meeting: choosing strong consistency does not just
add latency, it doubles the RU cost of every read. This is [[pacelc|PACELC]] made concrete — under
a partition you trade consistency for availability, and *even in the healthy case* you trade
consistency for latency and, here, for throughput.

```quiz 01M37YEQDQWNFJAC8CMCW71ET3 cloze
A point read of a 1 KB item by id and partition key costs about {{1}} RU, and when you exceed the
RU/s available on a partition Cosmos rate-limits with HTTP status {{429}}. Cosmos offers {{5}}
consistency levels; the default is {{session}}, which guarantees read-your-writes within a client
session. Choosing strong consistency roughly {{halves}} read throughput for the same RU/s, because
strong reads are served from a two-replica quorum rather than a single replica.
```

## Cross-partition queries are where the RU bill hides

A query that includes an **equality filter on the partition key** is an **in-partition query**:
Cosmos routes it to the single physical partition that holds those items and it is cheap. A query
without the partition key — or filtering on a different field — is a **cross-partition query**: it
fans out to *every* physical partition, runs there, and merges the results, adding a few RU per
partition just for the fan-out on top of the query's own cost. On a small container with one or two
physical partitions this is negligible and not worth designing around. On a large container that has
split into dozens of partitions, a cross-partition query on the hot read path is a real and growing
tax — the cost scales with how far the container has grown, which is the worst kind of latent
problem. This is the concrete reason partition-key choice and query shape are **one decision**: the
key that makes your dominant query single-partition is the key that keeps its RU cost flat as you
scale. When several query shapes genuinely need different keys, that is what synthetic keys,
hierarchical keys, or a second copy of the data exist for.

## Document modelling: denormalize for the read, and own the drift

Cosmos stores JSON documents, so modelling data is not [[normalization-to-third-normal-form|3NF]].
The relational instinct is to give every fact one home and join it back at read time; the document
instinct is the opposite — **embed** the data you read together into one document so a read is one
lookup, not a join Cosmos does not offer. The rule of thumb: **embed** data that is read with its
parent, is bounded in size, and changes with it (an order and its line items); **reference** by id
data that is large, unbounded, or shared and updated independently (a product catalog many orders
point at). Embedding trades write cost and duplication for read locality — a denormalized copy is
fast to read and yours to keep in sync, because Cosmos will not do it for you. The whole game is to
**model the document around the read**, since the read is the operation you are optimising RUs and
latency for, and the partition key is the first and biggest expression of that same instinct.

## When Cosmos over SQL, and when not

The honest tradeoff, which is what a design round actually grades. Reach for Cosmos when the
workload wants what it is built for: **global distribution with low-latency reads and writes in
every region**, **elastic horizontal scale** past what one relational node serves, **a
self-contained aggregate accessed by a known key**, and **a consistency requirement you want to
tune per workload** rather than accept as fixed. Its SLA-backed single-digit-millisecond latency
and turnkey multi-region replication are genuinely hard to reproduce on a relational stack.

Stay with a relational store — the [[choosing-a-datastore|default]] — when the workload wants
*its* strengths: **ad-hoc queries you did not design for**, **joins across many-to-many
relationships**, and **multi-row [[transactions-and-acid|ACID transactions]]** spanning entities,
which in Cosmos are confined to a single logical partition. And the estimate that settles more of
these than any architecture debate: if a [[back-of-envelope-estimation|back-of-envelope estimate]]
says the data and traffic fit comfortably on one machine, a single relational node is simpler and
cheaper than any distributed store, and reaching for Cosmos is over-engineering. Cosmos earns its
cost when scale, global reach, or per-request consistency tuning are real requirements — not
because NoSQL is newer. As always, the retry safety that lets a client re-issue a write against an
eventually-consistent store without applying it twice is a separate property,
[[idempotency-and-safe-retries|idempotency]], and it is what makes building on the weaker levels
safe.

```quiz 01M37YEQDQ7F0S1GXFYW8NVZ5P recall
An interviewer says: "You've proposed Cosmos DB for the treaty-booking service. Sell me on it over
SQL Server — and be honest about what you're giving up." Answer at a senior level.

> I'd anchor on the workload, not the brand. Cosmos earns it here if the service is globally
> distributed and needs low-latency reads and writes close to users in several regions, if a
> booking is a self-contained aggregate I fetch and write by a known key, and if I want to tune
> consistency per operation — strong on the write that confirms a binding, session or eventual on a
> dashboard read. Cosmos gives me turnkey multi-region replication, elastic horizontal scale past a
> single node, and an explicit five-level consistency dial, and I'd design the partition key —
> probably a hierarchical key on something like treaty then version — so my dominant query stays
> single-partition and my RU cost stays flat as the container grows.
>
> What I'm giving up is real and I'd say so. I lose general-purpose joins and ad-hoc queries: I have
> to know my access patterns up front and model documents around the reads, and a query that
> doesn't include the partition key fans out across every physical partition and costs more RUs the
> larger I've grown. I lose multi-entity ACID transactions — Cosmos scopes a transaction to one
> logical partition — so anything that must atomically touch several aggregates is awkward and
> pushes me toward relational. And strong consistency across regions costs write latency and halves
> read throughput, so I'd reserve it for the operations that truly need it.
>
> The tiebreaker is scale. If a back-of-envelope estimate says this fits on one machine, I'd drop
> Cosmos and run a single SQL Server node — it's simpler, it gives me joins and full transactions
> for free, and reaching for a globally distributed store I don't need is a down-level tell. Cosmos
> is the answer when global reach, horizontal scale, or per-request consistency tuning are actual
> requirements.
```

## What to take away

Cosmos DB is worth knowing because it turns three distributed-systems trade-offs into knobs you set
and can talk about. **Partition-key design** is the load-bearing decision: pick a key that is
high-cardinality, evenly accessed, and aligned with your query filter, or pay for hot partitions and
cross-partition fan-out — and it is immutable, so get it right first. **Request Units** are the one
currency; ~1 RU for a 1 KB point read, more for writes and queries, and a 429 when a partition
runs out. The **five consistency levels** — strong, bounded staleness, session (the default),
consistent prefix, eventual — are [[consistency-models]] and [[pacelc|PACELC]] made into a setting,
and stronger reads cost latency *and* half the throughput. Model documents by **embedding for the
read** rather than normalizing. And reach for Cosmos over a [[choosing-a-datastore|relational
default]] only when global distribution, horizontal scale, or per-request consistency tuning are
real — never merely because it is NoSQL.

Worth reading in full: Microsoft's
[Cosmos DB documentation on partitioning](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview),
[request units](https://learn.microsoft.com/en-us/azure/cosmos-db/request-units), and
[consistency levels](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels) — the
three primary sources this Lesson compresses, each short and written by the team that runs the
service.
