---
id: 01M1GGSW9JS3HMAXQW30680CZB
title: A reading order for databases
topic:
  - relational-design
  - sql-server-indexing
  - database-transactions
  - query-performance
---

Everything the vault holds about relational databases, in the order that makes each note land — what
a relation and a key are, then how rows are physically stored and found, then what happens when two
sessions touch them at once, then why a query the schema should serve quickly does not. The vault
carries no reading order of its own: `prerequisites` is a graph and there are no lesson numbers.
This is one path through that graph, and where a note disagrees with this page the note wins.

The shape worth noticing before starting: **the first note is under everything else**. A key is what
an index is built on, what a foreign key checks, and what a transaction locks — so the relational
model is not an introductory chapter to be skipped, it is the thing the other nine notes are about
from three different angles.

The second thing worth noticing: **the three later topics are three different questions about the
same table**. Indexing asks how to find a row, transactions ask what happens when two sessions want
it, and query performance asks why the optimiser did not use the index you built. They are read in
that order because each is easiest to see once the one before it is in place — not because a real
system meets them in that order.

## The order

| # | Read | Scope | Why here |
|---|---|---|---|
| 1 | [[the-relational-model-and-keys]] | Concept | What a relation, a primary key and a foreign key actually promise. Everything below is a consequence, and it is the prerequisite the vault records for the root of all three other topics |
| 2 | [[normalization-to-third-normal-form]] | Concept | Removing a dependency by decomposing a table. Read second because it is the rest of the logical schema and the last note before storage — and note it is a leaf: nothing below depends on it |
| 3 | [[clustered-and-nonclustered-indexes]] | **SQL Server** | The first physical note: a B+ tree, the one clustered index, the many nonclustered ones, and the seek-versus-scan distinction that steps 8–10 are unreadable without |
| 4 | [[covering-indexes-and-included-columns]] | **SQL Server** | The lookup, and the index that removes it. Read straight after 3: it is the same structure paying a second visit to the table, and the first note where an index has a write cost worth naming |
| 5 | [[transactions-and-acid]] | Mostly concept | What a transaction guarantees, one property at a time. A hinge — it needs nothing from 3 and 4, and everything below it needs this |
| 6 | [[isolation-levels-and-row-versioning]] | **SQL Server** | Which anomalies each level admits, and what row versioning buys. This is the note behind the `READ COMMITTED SNAPSHOT` question, which is the one most likely to be pushed on |
| 7 | [[deadlocks-blocking-and-lock-ordering]] | Mostly concept | What locking does when two sessions collide, and the one discipline that prevents it. Last in the concurrency run because a deadlock is only legible once you know what took the locks |
| 8 | [[reading-an-execution-plan]] | **SQL Server** | The diagnostic loop starts here, and this is the only topic whose notes start from a symptom. The vault names step 3 as its prerequisite: a plan is a list of seeks, scans and joins |
| 9 | [[statistics-and-cardinality-estimation]] | **SQL Server** | Why the optimiser chose that plan. Read after 8, because the estimate-versus-actual gap is a thing you first have to be able to see on a plan |
| 10 | [[fixing-a-slow-query]] | **SQL Server** | The three levers — the index, the query shape, the hint — and the validation discipline. Last, because every fix is chosen from what 8 and 9 diagnosed |

Steps 1–2 are one sitting and they are the schema-design interview on their own. Steps 3–4 are the
second. Steps 5–7 are the third, and they are the run most likely to be asked about under the words
"two people booked the last seat". Steps 8–10 are one continuous loop and are best read together
rather than a week apart — read the plan, find the cardinality error, apply a fix.

## Look these up rather than reading them

- [[sql-server-isolation-levels]] — the anomaly-by-level matrix, the selection guide and the
  `SET TRANSACTION ISOLATION LEVEL` syntax, side by side. Open it at step 6 and leave it open;
  step 6 deliberately teaches the levels one at a time and carries no grid.
- [[execution-plan-operators]] — the operator catalogue and the red flags. The companion to step 8
  rather than a step of its own: step 8 teaches how a plan is shaped and read, this says what the
  boxes in it mean.
- [[sql-server-performance-dmvs]] — every DMV and `DBCC` incantation the set names, in one place.
  Wanted from step 9 onward, and the note steps 4, 9 and 10 link to rather than pasting a query.

## Practice checkpoint

After step 10: [[diagnose-the-pending-orders-slowdown]]. It is the whole diagnostic loop in one
conversation — a query that was fast when 1% of orders were `Pending` and is not now — and it is
where steps 8, 9 and 10 stop being three separate notes.

## The SQL-Server-specific half, stated plainly

Six of the ten steps are about one engine, and that is a scoping decision this vault made rather
than a claim that databases are a Microsoft subject. The relational model, normalization, and what
ACID and the isolation anomalies *are* belong to the relational tradition and to the SQL standard;
B+ tree mechanics are general but the clustered/nonclustered split as taught here is SQL Server's
particular arrangement; execution plans, statistics maintenance, row versioning and every DMV are
one product's implementation.

What actually transfers, and to what:

| The idea | Elsewhere it looks like |
|---|---|
| Keys, foreign keys, normal forms | Unchanged everywhere with a relational engine, and the vocabulary is the SQL standard's rather than any vendor's |
| A B+ tree index over the rows | Universal — PostgreSQL, MySQL and SQLite all default to one. What differs is the *table*: InnoDB clusters on the primary key the way SQL Server clusters, while PostgreSQL's heap has no clustered index at all, so its every index is a "nonclustered" one over a heap |
| Covering a query so the table is never visited | PostgreSQL calls it an index-only scan and needs the visibility map to allow it; MySQL calls it a covering index. An `INCLUDE` clause for non-key columns exists in PostgreSQL 11+ as well |
| The four isolation levels and the anomalies they admit | The SQL standard's, so the names are the same. The mapping is not: PostgreSQL implements `READ UNCOMMITTED` as `READ COMMITTED` and its `SERIALIZABLE` is serializable snapshot isolation, and Oracle's default read is a snapshot rather than a locking read |
| Snapshot reads instead of shared locks | PostgreSQL and Oracle are MVCC by default and have no locking-read mode to switch off; RCSI is SQL Server offering the same thing as an option, with a version store in `tempdb` to pay for it |
| Deadlock detection, and lock ordering as the fix | Every engine detects cycles and kills a victim. The discipline is identical; only the error number and the retry idiom change |
| Reading a plan to find the estimate/actual gap | `EXPLAIN (ANALYZE, BUFFERS)` in PostgreSQL, `EXPLAIN ANALYZE` in MySQL 8.0.18+. The reasoning is the same and the operator names are not |
| Statistics driving cardinality estimation | Universal, and stale statistics are a universal cause of a bad plan. `ANALYZE` in PostgreSQL, `ANALYZE TABLE` in MySQL — the auto-update thresholds are per-engine |

The two claims that survive any engine: **an index is a physical structure serving a specific
query and it is paid for on every write**, and **a plan is chosen from an estimate, so a wrong
estimate is the first thing to suspect when the plan is wrong**. If the interview is not a SQL
Server interview, those two plus steps 1, 2, 5 and 7 are the parts to carry; everything about
clustered indexes, row versioning and DMVs is scoped and should be said to be.

## The night before

[[relational-design-cheat-sheet]], [[sql-server-indexing-cheat-sheet]],
[[database-transactions-cheat-sheet]] and [[query-performance-cheat-sheet]]. A reading order is for
the fortnight before; a cheat sheet is for the morning of.
