---
id: 01M1GF7TECSMA3Z5NXPM2SF4VQ
title: Fixing a slow query
topic:
  - query-performance
prerequisites:
  - reading-an-execution-plan
  - statistics-and-cardinality-estimation
---

Diagnosis narrows a slow query to a cause. Acting on it means choosing between three
interventions, and they are not interchangeable — each fixes a different kind of problem and each
costs something different.

1. **Change the data structures** — add or modify an index, so the engine can reach the rows a
   cheaper way.
2. **Change the query** — rewrite it so the optimiser can see what it could not see before.
3. **Constrain the optimiser** — a hint, forcing a choice it would not have made.

They are in that order for a reason. The first two change what is *true* about the workload, so
the optimiser keeps making its own decisions and keeps adapting as the data moves. A hint replaces
its judgement with yours, permanently, on the evidence available today. The discipline this
Lesson is really about is choosing the least drastic fix that addresses the cause you actually
found — and then proving it worked.

## First: does the diagnosis point at a fix at all?

Before any of the three, check the finding against the intervention. Three of the commonest
causes are not fixed by any of them.

**A bad estimate with a stale statistic behind it** is fixed by `UPDATE STATISTICS`, not by an
index and certainly not by a hint. The plan was reasonable for the data the optimiser was told
about, and refreshing the summary lets it choose again — for every query over that column, not
just this one. That whole diagnosis is [[statistics-and-cardinality-estimation]].

**A query that is waiting rather than working** is a concurrency problem wearing a performance
costume. Its plan will look healthy, because it is; the time is spent blocked on someone else's
locks. See [[deadlocks-blocking-and-lock-ordering]].

**A query that genuinely has to read that much data** has no trick available. Aggregating a
hundred million rows costs what it costs, and the honest answers are to ask for less, to
pre-aggregate, or to run it somewhere other than the transactional system.

## Path 1 — indexing, the most common fix

Three plan shapes each point at a specific index, and the mapping is close to mechanical.

A **scan where a seek should be possible** means there is no index whose key supports the
predicate. A **lookup repeated for many rows** means the index found the rows but does not carry
the columns, which is a case for `INCLUDE`. An **expensive Sort** means nothing supplied the
ordering, which an index key in that order removes entirely.

Designing the index from the query is the procedure in
[[clustered-and-nonclustered-indexes]] and [[covering-indexes-and-included-columns]]:

```sql
SELECT SUM(TotalAmount)
FROM Orders
WHERE CustomerID = @CustID
  AND OrderDate BETWEEN @Start AND @End
  AND IsDeleted = 0;
```

```sql
CREATE NONCLUSTERED INDEX IX_Orders_Customer_Date
ON Orders(CustomerID, OrderDate)   -- equality first, range second
INCLUDE (TotalAmount)              -- carried, so no lookup
WHERE IsDeleted = 0;               -- filtered, so the index holds only live rows
```

SQL Server will also volunteer a **missing index suggestion** in the plan. Treat it as a signal
that *something* is missing rather than as a design: those suggestions are generated per query in
isolation, they habitually propose including every column in the `SELECT` list, and following
several of them produces a set of overlapping indexes that each cost every write. The useful
reading of one is "the optimiser wanted to seek on these columns and could not".

Every index is paid for on the write path forever, so the question to ask before adding one is
whether an existing index can be widened instead — adding a column to an `INCLUDE`, or extending
a key — and whether an existing index is now redundant and can go. Usage figures for that
judgement come from the DMVs in [[sql-server-performance-dmvs]].

```quiz 01M1GF7TED1KVKPZN8P24X0ZVT
A join is slow. The plan shows a Hash Match whose inner input is a Clustered Index Scan, and
every operator's estimated rows are close to its actual rows. What is the most likely fix?

- [x] A nonclustered index on the join predicate's columns
  > Accurate estimates rule out statistics: the optimiser priced this plan correctly and it was
  > still the cheapest available, which means the access path it needed did not exist.
- [ ] `UPDATE STATISTICS` on both tables, since a scan usually means a bad estimate
  > It often does, but not here — the estimates match the actuals, so refreshing them would
  > produce the same beliefs and therefore the same plan.
- [ ] A hint forcing a loop join and an index seek on the inner side
  > There is no index for a seek to use, so the hint would force a plan that cannot be built,
  > and hinting before the structural fix locks in today's data volumes.
- [ ] Rewriting the join as two queries combined with `UNION ALL`
  > Rewriting helps when the query's shape hides something from the optimiser. Nothing here is
  > hidden; the access path is simply missing.
```

## Path 2 — rewriting, when the shape is what hides the answer

A rewrite is worth reaching for when the optimiser cannot use what exists because of how the
query is phrased. Three patterns cover most of it.

**Take the function off the column.** A predicate is only seekable if the indexed column stands
alone on one side of the comparison.

```sql
-- Not sargable: the function must be evaluated per row, so the index on OrderDate is unusable.
WHERE YEAR(OrderDate) = 2024
WHERE DATEDIFF(day, OrderDate, GETDATE()) <= 30

-- Sargable: the same rows, with the arithmetic moved to the constant side.
WHERE OrderDate >= '2024-01-01' AND OrderDate < '2025-01-01'
WHERE OrderDate >= DATEADD(day, -30, GETDATE())
```

The same applies to implicit conversions: comparing an `NVARCHAR` parameter against a `VARCHAR`
column can force a conversion on the column side and cost the seek, silently. The plan flags it
as a warning.

**Split an `OR` across different columns.** `WHERE CustomerID = 5 OR Status = 'Pending'` cannot
be served by one seek, because no single index is sorted by both. The optimiser's usual recourse
is to scan. Written as two branches, each branch can seek its own index:

```sql
SELECT ... FROM Orders WHERE CustomerID = 5
UNION
SELECT ... FROM Orders WHERE Status = 'Pending';
```

Note `UNION`, not `UNION ALL`: rows matching both predicates would otherwise appear twice, and
that is exactly the kind of difference a rewrite introduces by accident.

**Give the optimiser a join instead of a per-row subquery.** A correlated subquery expresses "for
each outer row, go and check", and while the optimiser can often flatten one into a join, it
cannot always. A join states the relationship directly and leaves the optimiser free to choose
the order and the algorithm.

The rule over all three: **a rewrite must return exactly the same rows.** `NULL`s, duplicates and
outer-join semantics are where equivalence quietly breaks. Prove it rather than assume it —
`EXCEPT` in both directions over the two result sets returns nothing when they agree — and keep
the original query in a comment beside the rewrite, because the next person needs to know what it
was meant to mean.

## Path 3 — hints, and why they are last

```sql
SELECT ... FROM Orders WITH (INDEX(IX_Orders_Customer_Date)) WHERE CustomerID = 5;
SELECT ... OPTION (LOOP JOIN);
SELECT ... OPTION (RECOMPILE);
```

A hint is a decision made on today's statistics, today's data volume and today's hardware, and
then frozen into the source. When the table grows tenfold, the optimiser would have changed its
mind and the hint will not let it.

There is a narrow band where a hint is the right answer: parameter sniffing, where the statistics
are accurate and the *cached plan* is the problem, and `OPTION (RECOMPILE)` or `OPTIMIZE FOR` is
addressing exactly that. Outside it, a hint usually means a structural fix was not found.

If one goes in, write down next to it why it exists and what would make it unnecessary. An
undocumented hint is unremovable, because nobody can tell whether the condition it was for still
holds.

```quiz 01M1GF7TED0SKT47M09G17Y7PH cloze
The three interventions, in order of preference: change the {{index}}es, {{rewrite}} the query,
and only then apply a {{hint}}. The first two are preferred because the optimiser keeps choosing
and keeps {{adapting}} as the data changes, where a hint freezes a decision made on today's data.
A predicate is only seekable — {{sargable}} — if the indexed column stands alone on one side of
the comparison. And any rewrite must be proved to return the same {{rows}}.
```

## Validating the fix

An unmeasured fix is a guess that has been deployed. Four steps, and the second is the one people
skip.

**Baseline before touching anything.** `SET STATISTICS IO ON` and `SET STATISTICS TIME ON` give
logical reads and CPU alongside elapsed time. **Logical reads are the metric to lead with**:
elapsed time on a shared server varies with everything else running, while the number of pages a
query touches is a property of the plan and is stable run to run. A fix that halves the duration
and does not move the reads may not have fixed anything.

**Compare distributions, not single runs.** Run each version several times and compare the ranges
rather than one number against one number. If the new version's worst run beats the old version's
best run, the improvement is real; two overlapping ranges are noise.

**Check what else the change touched.** This is the step that distinguishes tuning from
whack-a-mole. A new index is maintained by every write to that table, so the test is a realistic
write workload against production-scale data, not just the query that prompted it. A rewrite has
to be proved row-equivalent. And a query's plan change can move other queries too, because they
share the same indexes and the same buffer pool. A large win on one query and a moderate
regression on ten others is a net loss.

**Then decide what to fix next by impact, not by duration.** A query taking thirty seconds once a
day and a query taking a hundred milliseconds ten thousand times a day cost the server similar
totals, and the second one is the one users are waiting on. *Duration × frequency* is the ranking,
and the query statistics DMVs in [[sql-server-performance-dmvs]] produce it directly. Query Store
keeps the same history over time, which is what turns "is this slower than last week?" into a
question with an answer.

```quiz 01M1GF7TEEGAEZ6F5GG1TNER2R recall
An interviewer hands you a ticket: "This query is slow, please fix it." Talk through your whole
approach, start to finish.

> I would want two things before touching anything: a baseline, and a diagnosis.
>
> The baseline is logical reads and CPU as well as elapsed time, over several runs. Elapsed time
> on a shared server tells me as much about the other workload as about my query; logical reads
> are a property of the plan and barely move run to run. Without that I cannot tell afterwards
> whether I helped.
>
> For the diagnosis I capture the actual plan, find the operator carrying most of the cost, and
> compare its estimated rows against its actual rows. That comparison splits the problem in two.
> A large gap means the optimiser was working from wrong beliefs — stale statistics, skew, or a
> plan cached for different parameters — and the fix is to correct the beliefs rather than the
> plan. Estimates that match the actuals mean the plan is reasonable for the data, and the
> problem is the access path or the volume.
>
> I would also confirm it is actually slow rather than blocked. A query waiting on another
> transaction's locks has a perfectly healthy plan, and no amount of indexing helps it.
>
> Then the least drastic fix that matches the cause. Stale statistics: update them. A scan where
> a seek is possible, or a lookup per row: an index, and I would first ask whether an existing
> index can be widened rather than adding another, because every index is paid for on every
> write. A predicate wrapped in a function, or an `OR` across two columns: a rewrite, proved to
> return the same rows. A hint only for a cached-plan problem like parameter sniffing, documented
> with what would make it unnecessary.
>
> Then I validate. Re-measure the same way, run a realistic write workload if I added an index,
> and check I have not regressed neighbouring queries that share those structures.
>
> And I would ask whether this query is the one worth fixing at all. Duration times frequency is
> the ranking that matters — a hundred-millisecond query running ten thousand times a day is
> costing more than a thirty-second nightly report.
```

## What this buys you in the room

The answer interviewers are listening for is not a fix; it is an order. Diagnose before acting,
prefer the intervention that leaves the optimiser free to keep choosing, and measure the result
including what it cost elsewhere. Someone who says "I would add an index" has answered a
different question from someone who says "I would check the estimate against the actual first,
because if they match, an index is the fix and if they don't, it isn't."

The one thing to go and read in full is Microsoft's
[monitor and tune for performance](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitor-and-tune-for-performance)
guide, which is the index of SQL Server's own tooling for baselining, comparing plans over time,
and finding the queries worth fixing.
