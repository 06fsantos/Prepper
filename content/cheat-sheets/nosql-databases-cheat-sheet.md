---
id: 01M37YEQDQ7304DD29W842MVXZ
title: NoSQL databases — cheat sheet
topic: nosql-databases
---

The night-before sheet, taught through Azure Cosmos DB as the worked example. NoSQL trades the
fixed schema and general joins for horizontal scale, a layout shaped to one access pattern, and
tunable consistency — Cosmos makes all three explicit knobs.

**Partition key — the decision everything rides on.**

- Item's partition key value → its **logical partition** (cap **20 GB**; scope of a transaction).
- Logical partitions hash-spread across **physical partitions** (internal; 50 GB, **10,000 RU/s** each; auto-split).
- Good key = **high cardinality** + **even access** + **aligned with the query filter**. Miss one → **hot partition** (starves on its even RU share → 429s).
- Key is **immutable**. No single field both high-cardinality and query-aligned → **synthetic** or **hierarchical** key.

**Request Units (RU) — the one currency.**

- **~1 RU = a 1 KB point read** by id + partition key. Writes > reads; queries > point reads. Deterministic; returned on every response.
- Modes: **provisioned** (fixed, steady load), **autoscale** (spiky), **serverless** (light/intermittent).
- Exceed a partition's RU/s → **HTTP 429**, retry-after hint. Steady 429s = under-provisioning *or* a hot partition.

**Five consistency levels (strong → weak)** — the [[consistency-models]] spectrum as a setting:

- **Strong** (linearizable) · **Bounded staleness** (≤ K versions or T time) · **Session** (default; read-your-writes in a session) · **Consistent prefix** (never out of order) · **Eventual** (converges, no ordering).
- **Stronger reads cost more**: strong + bounded staleness read from a two-replica quorum → **half the read throughput** per RU/s. This is [[pacelc|PACELC]]: consistency vs latency even with no partition.

**Document modelling** — not [[normalization-to-third-normal-form|3NF]]. **Embed** what's read together, bounded, and changes together; **reference** what's large, shared, or updated independently. Model the document around the read; own the denormalized drift.

**Cross-partition queries** — filter *includes* the partition key → **in-partition**, cheap. Otherwise **fans out to every physical partition**, +RU each, and the cost grows as the container splits. Key choice and query shape are one decision.

**When Cosmos over SQL:** global distribution + low-latency multi-region, elastic horizontal scale, self-contained aggregate by key, per-request consistency tuning. **Stay relational** for ad-hoc queries, joins, and multi-entity [[transactions-and-acid|ACID]] (Cosmos scopes a transaction to one logical partition). If a [[back-of-envelope-estimation|back-of-envelope estimate]] says it fits on one machine, one relational node wins — reaching for Cosmos is over-engineering.

Full treatment: [[azure-cosmos-db]]. Selection comes first in [[choosing-a-datastore]].
