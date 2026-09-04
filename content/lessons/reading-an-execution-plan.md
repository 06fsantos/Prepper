---
id: 01M1GF292P20Q0NRJ7FTBFN9EW
title: Reading an execution plan
topic:
  - query-performance
prerequisites:
  - clustered-and-nonclustered-indexes
---

SQL is declarative: the query says what rows are wanted and says nothing about how to get them.
Everything about *how* is decided by the **query optimiser**, which considers a number of
candidate strategies, costs each one against what it believes about the data, and picks the
cheapest. The result of that decision is the **execution plan**.

This is why a slow query cannot be diagnosed by reading the query. The text is the same text it
was when it was fast; what changed is the plan, or what the optimiser believed when it chose the
plan. Reading a plan is how you find out which — and it is the one skill that turns "the
dashboard is slow" into a specific claim about a specific operator.

## A plan is a tree, and rows flow up it

Every plan is a tree of operators. The leaves reach the data; each parent consumes the rows its
children produce and does one thing to them; the root produces the result.

```
[SELECT]
   ↑
[Stream Aggregate]            -- GROUP BY
   ↑
[Hash Match (Left Outer Join)]
   ├── [Index Seek]  Customers  WHERE State = 'CA'
   └── [Index Scan]  Orders
```

Reading it means starting at the leaves. Customers are found by a seek on a useful index; orders
are read in their entirety by a scan; the join brings the two streams together; the aggregate
groups and counts; the result goes out. Four sentences, and they say what the engine is going to
do.

Two things about how the tree runs are worth knowing because they explain otherwise-confusing
numbers. Operators are **pipelined**: a parent pulls rows from its child one at a time rather
than waiting for the child to finish, so the whole tree is running at once. And a child can be
executed **many times** — the inner side of a nested loop join runs once per outer row, which is
why one operator's cost can be the query.

## Two numbers on every operator: cost and rows

**Cost** is the optimiser's estimate of the work an operator represents, shown as a percentage of
the plan's total. It is where to look first — an operator at 90% of a slow plan is the query — and
it is worth knowing what it is *not*. Cost is a unitless estimate produced by a model, computed
before the query ran, from what the optimiser believed about the data. It is not a measurement of
time, and when the beliefs are wrong the percentages are wrong too, which is exactly the case you
are usually investigating.

**Rows** is the cardinality: how many rows the operator produces. This is the number that decides
everything else. Whether to seek or scan, which join algorithm to use, how much memory to ask for
— every one of those choices is made from an estimated row count, so a wrong estimate does not
make the plan slightly worse, it makes the optimiser answer a different question than the one it
was asked.

## Estimated and actual are two different plans, and comparing them is the technique

An **estimated plan** is what the optimiser intends, available without running the query. An
**actual plan** is captured by running it, and carries the real row counts alongside the estimates
as well as runtime warnings.

Comparing the two, operator by operator, is the single highest-value move in query diagnosis.
When an operator says it expected 500 rows and produced 50,000, that gap is the explanation for
everything downstream: a plan built for 500 rows — a nested loop, a small memory grant, a lookup
per row — is a reasonable plan for 500 rows and a catastrophe for 50,000. The query is not slow
because the operator is slow. It is slow because the optimiser was told the wrong size.

Where those beliefs come from, why they go stale, and what to do about it is
[[statistics-and-cardinality-estimation]]. What to do once you have found the gap is
[[fixing-a-slow-query]].

```quiz 01M1GF292QZDY1GN1WRQX7BW00
An actual plan shows a Nested Loops join whose outer input estimated 500 rows and produced
50,000. The plan is slow. What is the most useful conclusion?

- [x] The estimate was wrong, and the join strategy was chosen for a size that never occurred
  > A nested loop executes its inner side once per outer row. Chosen for 500 rows it is
  > reasonable; run for 50,000 it does a hundred times the probes the optimiser priced in.
- [ ] Nested Loops is the wrong operator here and should be hinted to a Hash Match
  > Forcing the operator treats the symptom and leaves the bad estimate in place, where it will
  > pick the wrong memory grant and the wrong index for the next query too.
- [ ] The join is slow because 50,000 rows is simply a lot of rows to join
  > Fifty thousand rows is small. What costs here is the *shape* the estimate produced, which is
  > why the gap and not the row count is the finding.
- [ ] The plan is stale and needs to be recompiled to pick up the current row counts
  > Recompiling produces a new plan from the same beliefs. Unless what the optimiser believes
  > about the data changes, the new plan is the old plan.
```

## Access, join, and the rest

You do not need a catalogue of operators to read a plan. You need to know which of three
questions each operator is answering.

**How is the data reached?** A **scan** reads an entire structure; a **seek** navigates to the
rows the predicate wants. That distinction, and why the optimiser sometimes correctly prefers a
scan, is [[clustered-and-nonclustered-indexes]]. A **lookup** is the seek's companion cost — the
jump back to the table for columns the index does not carry, charged per row, and removed by
[[covering-indexes-and-included-columns]].

**How are two streams combined?** Three join algorithms, each right for a different shape.
**Nested loops** runs the inner side once per outer row: excellent when the outer input is small
and the inner side is seekable, quadratic-feeling when it is not. **Hash match** builds a hash
table from one input and probes it with the other: the choice for large, unsorted inputs, and it
needs memory to hold the build side. **Merge join** walks two inputs that are already sorted on
the join key in step: cheap when an index supplies the ordering, and it drags in a sort when
nothing does.

**What is done to the rows on the way up?** Filters, sorts, aggregates, and the operators that
distribute and gather work across threads when the query goes parallel. The one worth naming is
**Sort**, because it is both expensive and often avoidable: an index already in the required order
removes it entirely, which is the argument for putting an `ORDER BY` column into an index key.

A sort — or a hash join's build side — that does not fit in the memory the optimiser granted it
**spills to `tempdb`**, and the actual plan says so with a warning. That is a disk write in the
middle of what should be an in-memory operation, and it is one of the more dramatic gaps between
a plan that looks fine and a query that is not. A spill almost always traces back to an
underestimated row count: the grant was sized for the estimate.

Modern SQL Server can correct some of these choices at runtime instead of living with the
estimate: a batch-mode adaptive join picks its algorithm from the real build-side count, and
memory-grant feedback resizes a grant that spilled so the next run does not. These **intelligent
query processing** features are gated on the database's compatibility level and catalogued in
[[execution-plan-operators#Runtime adaptation and intelligent query processing]]. They soften a
bad estimate; they do not remove it — which is why the finding is still the estimate, not the
operator.

The individual operators, the warnings to look for and what each one means are collected in
[[execution-plan-operators]].

```quiz 01M1GF292Q7E53XS4JV9MTN1S6 cloze
A plan is a {{tree}} of operators whose leaves reach the data and whose rows flow upwards. Each
operator carries a {{cost}}, which is a unitless estimate rather than a measurement of time, and
a row count. An {{estimated}} plan is available without running the query; an {{actual}} plan
carries the real row counts beside the estimates. The gap between the two is the finding, because
every strategic choice — access method, join algorithm, memory grant — is made from the
{{estimate}}. A sort granted too little memory {{spills}} to `tempdb`, which the actual plan
warns about.
```

## Capturing one

In SQL Server Management Studio, the estimated plan is `Ctrl+L` and the actual plan is `Ctrl+M`
followed by running the query; both appear as a graphical tree in their own results tab, and
hovering an operator shows its full property list — estimated and actual rows, the predicate it
applied, whether it spilled, how many times it executed. Azure Data Studio's equivalents are
*Explain* and *Enable Actual Plan*.

Two habits make the difference. **Always reach for the actual plan** when the query can be run;
the estimated plan cannot show you the gap that is usually the answer. And **read the properties,
not the picture** — the thickness of an arrow is a rendering of the estimated row count, which is
precisely the number in doubt.

```quiz 01M1GF292QK88JQ8APTE956115 recall
An interviewer says: "A query that ran in 200 milliseconds now takes 40 seconds. The code has not
changed. How do you find out why?" Walk through your first few minutes.

> The query text is the same, so what changed is the plan or what the optimiser believed when it
> made the plan. I want the actual plan, because I need real row counts and not just intentions.
>
> First I find the expensive operator — the one carrying most of the plan's cost — so I have a
> place to look rather than a whole tree.
>
> Then I compare estimated against actual rows on that operator and its children. That comparison
> is what tells me which of the two kinds of problem I have. A large gap means the optimiser was
> working from wrong beliefs about the data, and the shape of the plan was chosen for a size that
> never occurred — a nested loop doing a hundred times the probes it was priced for, a memory
> grant too small so a sort spilled to `tempdb`, a lookup per row on far more rows than expected.
> That points me at statistics and at how the data has grown or skewed.
>
> If the estimates are close to the actuals, the plan is a reasonable plan for the data and the
> problem is elsewhere: an access path that has no index to use so it scans, a predicate written
> in a way that cannot be sought on, or a query that genuinely has to touch that much data.
>
> I would also check whether it is slow or whether it is waiting. A query blocked behind another
> transaction's locks is not a plan problem at all, and the plan will look perfectly healthy.
>
> Along the way I want to know what changed in the world: data volume, a new distribution of
> values, a dropped or added index, a statistics update, a server upgrade. Something did.
```

## What this buys you in the room

Plan reading is the difference between "I would add an index" and a diagnosis. The sequence is:
find the most expensive operator, compare its estimated rows against its actual rows, and say
which of the two stories you are in — wrong beliefs, or a genuinely expensive job. Everything
after that follows from which one it is.

The one thing to go and read in full is Microsoft's
[execution plans documentation](https://learn.microsoft.com/en-us/sql/relational-databases/performance/execution-plans),
which covers how plans are produced and cached, the difference between estimated and actual, and
the properties each operator exposes.
