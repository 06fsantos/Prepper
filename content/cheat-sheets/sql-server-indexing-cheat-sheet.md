---
id: 01M1GEP9DKK5EZ1EEHNDMSQ639
title: SQL Server indexing — cheat sheet
topic: sql-server-indexing
---

**An index is bought, not given.** Every index speeds up some reads and slows down every write
to its table. There is no good index in the abstract — only an index that is good for a query.

**The two kinds, and the one sentence each:**

- **Clustered** — the physical order of the rows; the table *is* the index. **Exactly one** per
  table, because rows are only in one order at a time. No clustered index means a **heap**.
- **Nonclustered** — a separate structure sorted by its own key, whose entries carry the
  clustered key as a pointer back. Many per table.

Both are **B+ trees**: balanced and sorted, so a search costs the *depth* of the tree, `O(log n)`
— a seek — against `O(n)` for a table scan. Nodes hold many keys, so millions of rows are a
handful of levels. Doubling the table adds at most a level; doubling a scan doubles the work.

**Seek vs. scan vs. lookup** — the three words the whole subject is argued in. A seek navigates.
A scan reads everything. A **lookup** is the jump back to the table for columns the nonclustered
index does not hold, charged **once per matching row** — negligible for one, dominant for a
thousand.

**The clustered key is copied into every entry of every nonclustered index.** So key width is not
a local decision: `INT` 4 bytes, `BIGINT` 8, GUID 16 — and a random GUID also lands every insert
in the middle of the tree, splitting pages.

**Design starts at the query text**, reading four things off it:

| Read this        | It decides                                              |
| ---------------- | ------------------------------------------------------- |
| `WHERE` / `JOIN` | key columns — what is navigated by                      |
| `ORDER BY`/`GROUP BY` | key order — a sort operator removed from the plan  |
| `SELECT` list    | `INCLUDE` columns — the lookup removed                  |
| Selectivity      | whether a seek beats the scan the optimiser would pick  |

**Composite column order is the design decision.** An index is sorted by its leading column
first, like a phone book by surname then forename. `(A, B)` seeks `A = 5` then range-scans `B`;
`(B, A)` cannot, because `A` is only sorted *within* each `B`. Rule: **equality predicates
first, range last**. And an index on `(A)` is redundant beside one on `(A, B)`.

**Sargability** — a predicate is only seekable if the indexed column stands alone on one side.
`WHERE YEAR(OrderDate) = 2024` is a scan; `WHERE OrderDate >= '2024-01-01' AND OrderDate <
'2025-01-01'` is the same rows as a seek. Nothing about the index changed.

**Covering: key vs. included columns.** Keys are stored at every level of the tree and are what
a seek and an `ORDER BY` use. `INCLUDE` columns live only in the **leaves**, in no order — they
can be read, never searched. So a wide column that is only in the `SELECT` list belongs in
`INCLUDE`, which keeps the upper levels narrow. "Covering" is a relationship to a **query**, not
a property of the index: add a column to the `SELECT` list and the lookup is back.

**Filtered index** — an index with its own `WHERE`, holding a subset of rows. Smaller, cheaper to
maintain, better statistics. Needs a natural, stable split with most queries on one side, and the
optimiser must be able to *prove* the query stays inside the filter — a parameterised predicate
often defeats that.

**What it costs the write path**, three faces worth naming separately:

- **Write amplification** — five nonclustered indexes make one insert into six structures
  maintained. An `UPDATE` to any indexed column, key *or* included, is a delete-and-reinsert.
- **Locking** — writes hold locks on the table and every index they maintain, and a large enough
  write escalates to coarser locks.
- **Memory and fragmentation** — indexes compete with data for the buffer pool; page splits leave
  gaps, so the engine reads pages that are mostly empty.

**The trade is the read:write ratio, not the table size.** A thousand-row match run a thousand
times a second is a million lookups saved. A hundred thousand inserts a second for one nightly
report is the same index and the opposite answer.

**Dropping one:** an index with no seeks or scans and a high update count is pure cost. Sample
usage over *weeks* — the counters reset on restart, and the monthly job has to be in the window.
Queries in [[sql-server-performance-dmvs]].

**Columnstore** exists, is column-organised and compressed, and is for analytical scans over
large fact tables. Name it, say OLAP, move on.

**The reach-for-it signal:** a plan with a seek followed by a per-row lookup, or a filter on a
column that is wrapped in a function.

Full treatment: [[clustered-and-nonclustered-indexes]], then
[[covering-indexes-and-included-columns]].
