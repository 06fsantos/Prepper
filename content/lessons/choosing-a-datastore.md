---
id: 01M22V93853933ZRWCAG4H1226
title: Choosing a datastore
topic:
  - system-design
  - distributed-systems
prerequisites:
  - consistency-models
---

"SQL or NoSQL?" is the wrong question, and answering it that way is a down-level tell. There is
no default datastore and no ranking of them; there is a **workload**, and each family of store
is good at a different shape of workload and pays for it somewhere else. The senior move is to
read the workload out loud — how the data is accessed, what the queries look like, how strong
the consistency has to be, how it scales and where the writes land, and how connected the data
is — and let those signals pick the store. Then say what you gave up, because every one of these
choices gives something up. Martin Kleppmann's *[Designing Data-Intensive
Applications](https://dataintensive.net/)* is the book this Lesson compresses, and the one to
read in full.

This Lesson stops at the **selection**. Once you have picked a store that must scale past one
machine, how it actually partitions and replicates is a separate skill —
[[partitioning-replication-and-consistent-hashing|the Dynamo blueprint]] — and it picks up
exactly where this leaves off.

## The five families, and the one thing each is built for

Set aside brand names; there are five *data models*, and an interview is testing whether you can
match one to a workload.

- **Relational** (PostgreSQL, MySQL, SQL Server). Data is [[the-relational-model-and-keys|rows in
  typed tables]], [[normalization-to-third-normal-form|normalized]] so each fact lives once, and
  the engine joins them back together on demand. Built for **ad-hoc queries and relationships**:
  you do not have to know the questions in advance, because a query optimizer plans an access path
  from an [[what-an-index-is|index]] at run time, and a many-to-many relationship is just a join
  table. It is also where [[transactions-and-acid|ACID transactions]] are strongest — multi-row,
  multi-table atomic writes. What you give up is easy horizontal scale: joins and transactions
  assume the data is reachable together, which a single node makes true and sharding makes hard.
- **Document** (MongoDB, DynamoDB's document mode, Couchbase). A record is a self-contained
  JSON-like tree, stored and fetched as one unit. Built for **data loaded whole and a schema that
  moves**: if your access pattern is "give me this one aggregate — the order and all its line
  items — by id," a document has *locality* (one read, no join) and *schema flexibility* (fields
  vary per document, no migration to add one). What you give up is exactly what relational is best
  at: **many-to-many relationships and joins**. Related documents are joined in application code,
  and denormalized copies drift.
- **Key-value** (Redis, DynamoDB, Riak). A distributed hash map: a value fetched and stored by its
  key. Built for **point lookups at extreme scale and availability**. In the pure model you query
  by the key, not by what is inside the value — and that narrowness is the point: it is what lets
  the store partition trivially and stay [[the-cap-theorem|available]] under failure. (Some products
  layer richer operations over the model — Redis, for one, can query inside its values — without
  changing that scaling story.) Session stores, caches, user-profile-by-id. What you give up is
  every query that is not "by key."
- **Wide-column** (Cassandra, HBase, Bigtable). Rows grouped into column families, addressed by a
  **partition key** plus a clustering key. Built for a **known, fixed query pattern at enormous
  write throughput**: you design the table around the one query you will run, denormalizing freely,
  and in return you get linear write scaling — Cassandra's leaderless design in particular has no
  single leader to bottleneck, while HBase and Bigtable reach scale differently, by sharding key
  ranges across servers. What you give up is flexibility — a query the table was not shaped for is
  expensive or impossible, and there are no joins.
- **Graph** (Neo4j, Neptune). Nodes and edges as first-class things. Built for the case where **the
  relationships *are* the query**: "friends of friends who like X," a fraud ring, a recommendation
  path. Traversing many-to-many links of variable depth is a graph database's whole reason to
  exist, and it is where a relational store's join count explodes. What you give up is bulk
  analytics and easy horizontal scale — a graph is hard to shard because an edge can cross any two
  nodes.

```quiz 01M22V9386900BYMFQ3PH0QB8Q
A product team stores each user's shopping cart as a single object, always read and written whole
by the user's id, and the fields inside a cart change often as the product evolves. Which family
fits the *shape of the data* best, before any scaling argument?

- [x] Document — the cart is one self-contained aggregate, fetched whole with schema flexibility
  > The access pattern is "load this entire object by id," which is exactly the locality a document
    model buys, and the changing fields are what its schema-on-read flexibility is for. No join is
    needed because nothing outside the cart is read with it.
- [ ] Relational — a cart is rows, so a normalized schema with a join is the natural home
  > Normalizing splits the cart across tables and rejoins it on every read, paying for a flexibility
    (ad-hoc queries, many-to-many) this workload never uses. The cart is read as one whole object.
- [ ] Graph — a cart links a user to products, so model it as nodes and edges
  > There is no traversal here: nobody asks "carts reachable from this product two hops away." A
    graph store earns its keep when the relationships are the query, which this workload never does.
- [ ] Wide-column — carts are high-write, so shape a column family around them
  > That is a *scaling* argument, not a data-shape one, and it locks the table to one fixed query.
    The question is the data's shape first; wide-column's rigidity is a cost you take only when volume forces it.
```

## The signals that actually decide it

The families above are the answers; these are the questions you ask the workload, and each one
leans toward a different family. Run them in an interview out loud — the reasoning is the grade,
not the store you land on.

- **Access pattern.** Point lookup by a single key → key-value. Load one whole aggregate by id →
  document. Range scans and ad-hoc filters you did not anticipate → relational. One fixed query at
  huge volume → wide-column. Walk the relationships → graph.
- **Query shape.** Do you know the queries in advance, or not? A relational store plans *any* query
  at run time and is the safe answer when the access patterns are unknown or will change. Every
  NoSQL family trades that away: you design the store around the queries you have, and a new query
  shape can mean a new table or a migration.
- **Consistency need.** Does the data need [[transactions-and-acid|multi-object atomic writes]] and
  a strong-consistency guarantee — a ledger, an inventory count, anything where a stale or partial
  read is a real loss? That pulls hard toward relational. Can the data tolerate a stale read for
  speed and availability — a feed, a counter, a cache? Then an [[consistency-models|eventually
  consistent]] NoSQL store is not a compromise, it is the correct choice.
- **Scale and write pattern.** How much data, and which way does the traffic lean? A
  [[back-of-envelope-estimation|back-of-envelope estimate]] answers the binary question that
  matters: does this fit on one machine? If it does, a single relational node is simpler than any
  distributed store and you should not reach past it. If the writes genuinely outgrow one node,
  key-value and wide-column are built to spread horizontally in a way a joined relational schema
  is not.
- **Relationships.** How connected is the data, and are the connections themselves what you query?
  Isolated records by key → key-value. Tree-shaped, one-to-many, read as a unit → document.
  Many-to-many you join across → relational. Many-to-many you *traverse* at depth → graph.

```quiz 01M22V9386HAVB6972N1HW3ZKJ cloze
The single signal that most often rescues the relational default is that a store plans an
{{ad-hoc}} query at run time, so it is the safe pick when the access patterns are {{unknown}} or
will change. Every NoSQL family trades that away by making you design the store around the
{{queries}} you already have. The other pull toward relational is the need for multi-object atomic
writes — a full {{ACID}} transaction — where a partial or stale read is a real loss.
```

## Consistency: the honest version, not the folklore

The tidy story is "SQL is strongly consistent, NoSQL is eventually consistent." Carry it as a
*starting* heuristic and know why it is only that. Relational stores are typically a single
authoritative node — [[transactions-and-acid|ACID]], strong reads — and the classic NoSQL stores
grew out of the [[partitioning-replication-and-consistent-hashing|Dynamo]] lineage, which chose
[[the-cap-theorem|availability]] and [[consistency-models|eventual consistency]] to stay writable
across a partition. That is the grain of truth.

But the line has blurred, and a senior answer says so. Tunable consistency now reaches well past
the pure Dynamo stores, though the lever differs by lineage. The Dynamo-lineage key-value and
wide-column stores (Cassandra, Riak, DynamoDB's engine) expose the literal `W + R > N` quorum dial
the [[consistency-models|consistency-models Lesson]] works through, and let you demand a strong read
per query. Document stores like MongoDB reach a similar place by a different lever — single-primary
(leader-based) replication with per-operation write and read concerns — which is a related
consistency knob, not the same quorum arithmetic. Meanwhile a sharded, replicated relational cluster is itself a distributed system
subject to [[the-cap-theorem|CAP]]. So the real question is never "SQL or NoSQL"; it is
[[pacelc|PACELC]]'s: what does this store do *under a partition*, and what does it do the rest of
the time? Name the staleness the workload can tolerate first, then pick the store — and the
consistency knob — that meets it.

This is also where honesty about the limits of the exercise belongs. "Which store fits" is
**engineering judgement**, not a sourced number: two competent engineers can defend different
stores for the same prompt, and the interview grades the *defence* — the workload signals you named
and the trade-off you owned — not a match against an answer key. The families and their built-for
cases above are from DDIA; the mapping to your specific prompt is yours to argue.

```quiz 01M22V9386WTG7YS341SWF4W1E recall
An interviewer says: "You've picked a document store because the data is a self-contained aggregate.
I like it — but justify the *consistency*. Isn't NoSQL just eventually consistent, and doesn't that
disqualify it for anything that matters?" Answer at a senior level.

> I'd push back on the premise. "NoSQL is eventually consistent" is a heuristic from the store's
> Dynamo-lineage roots, not a law: consistency is **tunable** across modern stores, though the lever
> differs. A Dynamo-lineage key-value or wide-column store gives me the literal `W + R > N` quorum
> trade-off; a document store like MongoDB tunes through single-primary write and read concerns
> instead — a related knob, not the same quorum arithmetic. Either way I can demand a strong read on
> the writes that need it and take a fast, possibly stale read where staleness is cheap, so I don't
> have to accept one global setting.
>
> The framing I'd actually use is PACELC, not "SQL vs NoSQL." I'd state what this store does under a
> partition and what it does when healthy, and I'd set that per the data: if part of this aggregate
> is a ledger where a partial read is a real loss, that part wants strong consistency or a store
> that guarantees a multi-object ACID transaction, and I'd say so rather than hand-wave. The point
> is that consistency is a knob I choose from the workload's tolerance for a stale answer — it is
> not a fixed property that a data model hands me.
```

## What to take away

There is no default datastore. Read the **workload** — access pattern, query shape, consistency
need, scale and write pattern, relationships — and let those signals pick from five families:
**relational** for ad-hoc queries, joins and ACID; **document** for self-contained aggregates
loaded whole with a moving schema; **key-value** for point lookups at extreme scale; **wide-column**
for one fixed query at enormous write throughput; **graph** for when traversing the relationships
*is* the query. Each buys its strength by giving something up, and saying what you gave up is the
signal. Treat "SQL is strong, NoSQL is eventual" as a starting heuristic that modern tunable stores
have blurred, and reach for [[pacelc|PACELC]] over the "pick two" folklore. Then, once the store
has to outgrow one machine, follow the mechanics into
[[partitioning-replication-and-consistent-hashing|partitioning and replication]].

Worth reading in full: Martin Kleppmann's *[Designing Data-Intensive
Applications](https://dataintensive.net/)*, chapters 2 and 3 — the data models, and the storage
engines underneath them — which is where every "which store fits" argument in a design round is
ultimately settled.
