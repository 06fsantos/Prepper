# Author: Cosmos DB note(s)

Type: task
Status: resolved
Blocked by: 01

## Question

Author fluency-level vault note(s) on **Azure Cosmos DB** — named twice in the brief. The vault's DB
corpus is entirely SQL Server OLTP; Cosmos is a different mental model. Via `/author`, at the
type/topic decided in 01. Must cover:

- **Partition-key design** — the single most important decision; hot partitions; logical vs physical.
- **Request Units (RU/s)** — the cost/throughput model, provisioned vs serverless/autoscale.
- **Consistency levels** — the five (strong → eventual, bounded staleness, session, consistent
  prefix); map them onto the vault's `consistency-models` / `pacelc` theory.
- **Single-partition vs cross-partition queries** and why the second is expensive.
- **Document modelling** vs relational 3NF (link `normalization-to-third-normal-form`): embed vs
  reference, denormalization for read.
- The honest "when Cosmos over SQL, when not" tradeoff.

## Decided attachment (from 01)

- **Type:** Lesson → `content/lessons/`
- **`topic:`** `nosql-databases`, `distributed-systems`
- **Also mint the new Term** `content/terms/nosql-databases.md` with `topic: databases` (this ticket
  owns it — Cosmos is its first note; the topic is named for expansion beyond one store).
- Files to mint: **1 Term + 1 Lesson**.

Resolved when the note(s) pass `npm run validate` and cover the above at fluency depth.

## Answer

Authored via `/author` and validated clean (`npm run validate`: no violations, 184 notes). Three
notes minted:

- **Term** `content/terms/nosql-databases.md` (`topic: databases`) — this ticket owns it; Cosmos is
  its first note. Framed as "give up schema/joins for scale + access-shaped layout + tunable
  consistency", worked through a specific store rather than a product tour.
- **Lesson** `content/lessons/azure-cosmos-db.md` (`topic: nosql-databases, distributed-systems`;
  `prerequisites: choosing-a-datastore, consistency-models`). Covers all six required areas:
  partition-key design (logical 20 GB / physical 50 GB + 10k RU/s, hot partitions, high-cardinality
  + even + query-aligned, immutable, synthetic/hierarchical keys); Request Units (~1 RU per 1 KB
  point read, writes > reads > point reads, provisioned/autoscale/serverless, 429 on overflow); the
  five consistency levels mapped explicitly onto [[consistency-models]] + [[pacelc]] (strong reads
  cost 2× RU / half throughput); single- vs cross-partition queries (fan-out RU tax that grows with
  the container); document modelling vs [[normalization-to-third-normal-form|3NF]] (embed-for-read
  vs reference); and the when-Cosmos-vs-SQL tradeoff (a recall block: global reach / horizontal
  scale / per-request consistency vs joins + multi-entity ACID, with the back-of-envelope
  fits-on-one-machine tiebreaker). 3 quiz blocks interleaved (mcq / cloze / recall).
- **Cheat sheet** `content/cheat-sheets/nosql-databases-cheat-sheet.md` — the durable 20%, written
  with the topic's first Lesson so the two-Lesson warning never fires.

Facts grounded in the three primary Microsoft Learn pages (partitioning, request-units,
consistency-levels), fetched live during authoring; no `RESOURCES.md` change needed (the existing
Azure/Learn and DDIA entries cover it). The reinsurance angle (auditable treaty/booking history,
treaty-then-version partition key) is woven into the tradeoff prose per the ticket's intent.
