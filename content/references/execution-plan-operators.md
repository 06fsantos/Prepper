---
id: 01M1GGVZJPCCPEET0FGXWDZP52
title: Execution plan operators
topic:
  - query-performance
---

The operator you are looking at, what it means, what puts it there, and what removes it. How a
plan is shaped and how to read one is [[reading-an-execution-plan]]; this is the catalogue you
open once you have found the operator carrying the cost.

Microsoft's [Showplan logical and physical operators reference](https://learn.microsoft.com/en-us/sql/relational-databases/showplan-logical-and-physical-operators-reference)
is the exhaustive list. What follows is the subset that appears in a diagnosis.

## Red flags

Six things worth reacting to on sight. None of them is wrong on its own — each is a claim about
the data that may or may not be true, and the second column is the question to ask before
touching anything.

| What you see | What it means | Usual cause | What removes it |
|---|---|---|---|
| **Table Scan** / **Clustered Index Scan** on a large table, high cost | Every row read, start to finish | No index the predicate can seek on, or a predicate that cannot be sought — see [[clustered-and-nonclustered-indexes]] | An index whose leading key column matches the filter; or making the predicate sargable |
| **Key Lookup** / **RID Lookup**, executed many times | A nonclustered index found the rows but does not carry every column the query asked for, so each row costs a jump back to the base table | A `SELECT` list wider than the index | `INCLUDE` the missing columns — [[covering-indexes-and-included-columns]] |
| **Sort**, high cost | Rows are being ordered at query time | `ORDER BY`, `GROUP BY`, a merge join, or a `DISTINCT` with no index supplying the order | An index already in the required order, which deletes the operator rather than speeding it up |
| **Estimated rows far from actual rows** | The plan was chosen for a size that never occurred | Stale, sampled or skewed statistics; a local variable the optimiser cannot sniff — [[statistics-and-cardinality-estimation]] | Fix the estimate, not the operator |
| **Implicit conversion warning** | A comparison is converting the *column*, so it is no longer a bare column on one side | A parameter or literal whose type differs from the column's — the `NVARCHAR` against `VARCHAR` case is the classic | Match the types at the call site |
| **Spill warning** on a Sort or Hash Match | The operator exceeded its memory grant and wrote to `tempdb` | The grant was sized from the estimate, and the estimate was low | Almost always the cardinality fix above |

**A scan is not automatically a defect.** When a query genuinely touches most of a table, the
optimiser prefers a scan on purpose, and forcing a seek makes it slower. The red flag is a scan
whose *output* is a small fraction of what it read.

**A lookup is not automatically a defect either.** A handful of them is cheaper than widening the
index and paying for it on every write. The flag is the execution count, which the operator's
properties carry, not the operator's presence.

## Access operators

| Operator | What it does | Cost shape |
|---|---|---|
| **Index Seek** (clustered or nonclustered) | Navigates the B+ tree to the rows the predicate selects | Proportional to rows returned, plus a tree descent |
| **Index Scan** (clustered or nonclustered) | Reads the whole index in leaf order | Proportional to the size of the index |
| **Table Scan** | Reads a heap in full — a table with no clustered index | Proportional to the size of the table |
| **Key Lookup** | Fetches remaining columns from a clustered index, once per row | Per row. The number that matters is the execution count |
| **RID Lookup** | The same, into a heap, by row identifier | Per row |

A **seek with a residual predicate** is the case worth recognising: the operator seeks on what the
index key supports and then tests the rest of the `WHERE` clause on every row it returned. It
reads as a seek and costs like a partial scan, and the tell is that the operator's *rows read*
greatly exceeds its *rows output*.

## Join operators

Three algorithms. The optimiser picks from estimated cardinality, whether an input is already
sorted on the join key, and how much memory it expects to get — so a "wrong" join type is nearly
always a symptom of a wrong estimate rather than a decision to override.

| Join | How it works | Chosen when | Fails when |
|---|---|---|---|
| **Nested Loops** | For each row of the outer input, find matches in the inner input | The outer input is small and the inner side is seekable on the join key | The outer input turns out large. The inner side runs once per outer row, so the work scales with their product |
| **Hash Match** | Builds a hash table from the smaller (build) input, then probes it with the other | Large, unsorted inputs, and no useful index on the join key | The build side does not fit its memory grant, and it spills to `tempdb` |
| **Merge Join** | Walks two inputs sorted on the join key in step | Both inputs arrive already sorted — usually from indexes on the join columns | Nothing supplies the order, so the plan pays for a Sort that may itself spill |

The scaling that matters in an interview: nested loops does work proportional to the outer row
count times the per-row inner cost, while hash and merge are each one pass over both inputs. That
is why a nested loop chosen for a small outer input is the join that degrades most violently when
the estimate was wrong — it is doing exactly what it was designed to do, many more times than it
was priced for.

`OPTION (LOOP JOIN | HASH JOIN | MERGE JOIN)` and `INNER HASH JOIN`-style hints exist. Reaching
for one treats the symptom and leaves the bad estimate in place, where it will pick the wrong
memory grant and the wrong access path for the next query too — see [[fixing-a-slow-query]].

## Aggregate operators

`GROUP BY`, `DISTINCT`, `COUNT` and friends land on one of two operators.

| Operator | Requires | Memory | Chosen when |
|---|---|---|---|
| **Stream Aggregate** | Input sorted by the grouping columns | Holds one group at a time | The input is already sorted — typically because an index on the grouping columns supplies the order |
| **Hash Match (Aggregate)** | Nothing | Holds one entry per distinct group | The input is unsorted and the optimiser would rather hash than sort |

The lever is the same one as for `ORDER BY`: **an index whose key columns are the grouping
columns, in that order, produces sorted input**, and the plan becomes a Stream Aggregate with no
Sort in front of it. Without one, the optimiser chooses between adding a Sort and then streaming,
or hashing — and the hash table is sized by the number of distinct groups, so a high-cardinality
`GROUP BY` is the one that spills.

A **Stream Aggregate sitting directly on top of a Sort** is the shape to notice. The sort is
usually the real cost, and it is the part an index can delete.

## Parallelism, exchange operators, and MAXDOP

A plan goes parallel when its estimated cost exceeds the server's **cost threshold for
parallelism**, whose default is **5** — a figure in the optimiser's own unitless cost model, *not*
five seconds (SQL Server 2022; verified 2026-09-02, [cost threshold for parallelism](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-the-cost-threshold-for-parallelism-server-configuration-option)).
How many threads it may then use is bounded by **max degree of parallelism**, whose server option
defaults to `0`, meaning all available schedulers; SQL Server 2019 and later's setup recommends a
value derived from the core count at install time (verified 2026-09-02,
[max degree of parallelism](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-the-max-degree-of-parallelism-server-configuration-option)).

A parallel plan is recognised by the **Parallelism (Exchange)** operators that appear in it:

| Exchange | What it does |
|---|---|
| **Distribute Streams** | Takes one input stream and splits it across worker threads |
| **Repartition Streams** | Redistributes rows already on several threads, so that rows that must meet — matching join keys, matching groups — end up on the same one |
| **Gather Streams** | Collects the threads back into one stream, at the top of the parallel region |

Three consequences worth having ready:

- **Parallelism costs a fixed amount per query**, in thread startup, exchange and the final
  gather. A short OLTP query pays that and gains nothing, which is why servers running OLTP
  workloads commonly cap `MAXDOP` low while analytical workloads want it high. Where exactly to
  set it is a workload measurement, not a constant.
- **The memory grant is divided among the threads.** More parallelism therefore means less memory
  per Sort or Hash Match, which is one of the ways a query that only got faster on paper starts
  spilling to `tempdb`.
- **A `CXPACKET`/`CXCONSUMER` wait is not itself a problem.** Threads waiting on each other is what
  a parallel plan looks like from the outside; the finding is skew — one thread doing most of the
  rows — which the operator's per-thread actual row counts show.

Per-query override, which is the safe way to test the theory before changing a server setting:

```sql
SELECT ...
FROM ...
OPTION (MAXDOP 1);   -- 1 forces a serial plan; any n caps the degree at n
```

## Runtime adaptation and intelligent query processing

Everything above treats the plan as fixed once chosen: the optimiser costs the candidates from
its estimates, picks one, and the query runs it. **Intelligent query processing** (IQP) is the
family of features, added across SQL Server 2017–2022, that lets the engine correct a bad
estimate *while or after* the query runs rather than being stuck with the plan the estimate
produced. They belong in a diagnosis because they change the answer to "why did recompiling not
help?" — some of the belief-correction now happens with no recompile at all.

| Feature | Since | What it does |
|---|---|---|
| **Batch-mode adaptive join** | 2017 | The plan defers the join choice. It materialises the build input, and if the real row count crosses a stored threshold it runs a Hash Match, otherwise a Nested Loops — one plan, the algorithm decided at runtime from the actual count instead of the estimate |
| **Memory-grant feedback** | 2017 batch, 2019 row | A grant that spilled to `tempdb`, or one that reserved far more than the query touched, is resized for the next run and remembered on the cached plan — so a repeatedly-run query converges on a right-sized grant instead of spilling every time |
| **Interleaved execution** | 2017 | For constructs the optimiser cannot estimate up front — a multi-statement table-valued function the worst offender — it pauses optimisation, runs that part to get a real count, and finishes optimising with it rather than the fixed 100-row guess |

Two things to keep straight in the room:

- **They are compatibility-level gated.** A database restored at an older compatibility level
  runs on SQL Server 2022 without any of them, so "we upgraded the server and nothing got faster"
  is often a compatibility level that never moved; `ALTER DATABASE … SET COMPATIBILITY_LEVEL` is
  the switch (verified 2026-09-04, [intelligent query processing](https://learn.microsoft.com/en-us/sql/relational-databases/performance/intelligent-query-processing)).
- **They reduce the damage of a wrong estimate; they do not repair the estimate.** An adaptive
  join picks the right algorithm, but a downstream operator was still costed from the bad number,
  and memory-grant feedback needs several executions and backs off if the right size keeps
  oscillating. The finding is still a cardinality error, and
  [[statistics-and-cardinality-estimation]] is still where it is fixed.

## Three that cost people points

- **Calling a scan the bug.** The diagnosis is not "there is a scan", it is "this operator read
  ten million rows to return fifty". Say the ratio and you have described a missing index; say
  "scan bad, seek good" and you have described a slogan the optimiser will happily disprove.
- **Fixing the join type instead of the estimate.** A nested loop over a large outer input, a hash
  build that spilled, a merge join dragging a sort — all three are usually the *same* finding
  wearing three costumes, and that finding is a cardinality error upstream. Hinting the operator
  moves the damage rather than removing it.
- **Reading the picture rather than the properties.** Arrow thickness renders the *estimated* row
  count, and the estimate is exactly the number in doubt. Execution count, rows read versus rows
  output, spill level and per-thread row counts all live in the operator's property list, and each
  one of them is a finding the diagram cannot show.

Which DMVs surface these after the fact — plan cache, wait statistics, spills — is
[[sql-server-performance-dmvs]].
