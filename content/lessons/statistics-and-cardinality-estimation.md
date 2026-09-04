---
id: 01M1GF4Z6BTRX4A5GJ2560QRRT
title: Statistics and cardinality estimation
topic:
  - query-performance
prerequisites:
  - reading-an-execution-plan
---

The optimiser never looks at the data. It looks at a summary of the data — **statistics** — and
every estimate it makes about how many rows a predicate will match comes from there. That
estimate is the **cardinality**, and it is the input to every strategic choice in a plan: seek or
scan, which join algorithm, how much memory to grant, whether a lookup per row is affordable.

Which gives the single most useful fact in query performance: **a wrong estimate does not make a
plan a little worse, it makes the optimiser solve a different problem.** A plan built for ten
thousand rows is a good plan for ten thousand rows and a disaster for a million, and nothing
about the query text will tell you which one you got.

## What a statistic actually holds

A statistic describes the distribution of values in one column or a set of columns. It cannot
store every value — that would be as large as the data — so it stores a **histogram**: the range
of values divided into at most 200 steps, each recording a boundary value, how many rows equal
that boundary, and how many fall in the range below it. Alongside the histogram sits a **density
vector**, which summarises how many distinct values there are, and a header saying when the
statistic was last built and how much of the table was sampled to build it.

Two hundred steps for any column of any size is the compromise that makes everything else about
statistics behave the way it does — it is why they stay small and cheap, and it is why skew hurts.

SQL Server builds them largely without being asked. Creating an index creates a statistic on its
key; auto-creation adds single-column statistics for columns that appear in predicates; and
auto-update refreshes a statistic once enough of the underlying table has changed.

## Reading one: `DBCC SHOW_STATISTICS`

This is the one command in this Lesson worth typing from memory, because its output *is* the
diagnosis.

```sql
DBCC SHOW_STATISTICS('Orders', 'Status');
```

It returns three result sets, and each answers a different question.

**The header** says `Updated`, `Rows`, and `Rows Sampled`. This is the staleness check: how long
ago was this built, how big was the table then, and how much of it was actually looked at. A
statistic built when the table held a tenth of its current rows is a statistic describing a
different table. A `Rows Sampled` far below `Rows` means the histogram is an extrapolation from a
sample, which is usually fine and occasionally the whole problem.

**The density vector** gives selectivity — roughly, one divided by the number of distinct values
— and for a multi-column statistic it gives it per prefix.

**The histogram** is the distribution itself, one row per step:

```
RANGE_HI_KEY   RANGE_ROWS   EQ_ROWS   DISTINCT_RANGE_ROWS   AVG_RANGE_ROWS
Pending                 0    100000                     1              1
Shipped                 0    900000                     1              1
```

`EQ_ROWS` is what the optimiser will estimate for `WHERE Status = 'Pending'`. Comparing that
number against what you know to be true is the fastest way to confirm or eliminate a statistics
problem — and it is a comparison you can make in seconds, against a `SELECT COUNT(*)`.

The other views for listing which statistics exist on a table, when each was last updated, and
how many modifications have accumulated since, collect in [[sql-server-performance-dmvs]].

## How an estimate becomes a bad plan

Take a table of a million orders where `Status` is `'Pending'` for 1% of rows and `'Shipped'` for
the rest, and a nonclustered index on `Status`.

```sql
SELECT * FROM Orders WHERE Status = 'Pending';
```

The histogram says 10,000 rows match, which is 1% of the table. The optimiser prices two
strategies: seek the index and do a lookup per matching row, or scan the table. Ten thousand
lookups is cheap and a million-row scan is not, so it seeks. Correct decision, fast query.

Now let the business run for a year. Orders accumulate faster than they are fulfilled and the
ratio inverts: 99% `'Pending'`. If the statistic has not been refreshed — and auto-update's
threshold is a proportion of the table, so a large table can drift a long way before it fires —
the optimiser still believes 10,000, still chooses the seek, and now performs the lookup for
nearly a million rows instead of ten thousand. Each of those is a random access into the table.
The scan it rejected would have been far cheaper.

(The row counts here are illustrative arithmetic for the shape of the failure, not a measurement.
What is real is the mechanism: the plan was correct for the data the optimiser was told about.)

This is the classic "it was fine for months and then one day it wasn't". No deployment, no schema
change, no new index — the distribution moved and the summary did not. Spotting it is exactly the
estimated-versus-actual comparison from [[reading-an-execution-plan]]: a seek that estimated
10,000 rows and produced 990,000.

```quiz 01M1GF4Z6C7NNZJG9PBZBQD2QG
An actual plan shows an Index Seek with estimated rows 100 and actual rows 100,000, followed by a
Key Lookup. Nothing about the query or the schema has changed in six months. What do you check
first?

- [x] `DBCC SHOW_STATISTICS` on the filtered column — when it was updated, and what it claims
  > The header gives staleness and the histogram gives the claimed row count for that value.
  > Comparing the claim against a `COUNT(*)` confirms or eliminates the theory in seconds.
- [ ] Index fragmentation, since the lookup cost has clearly grown over six months
  > Fragmentation makes reads somewhat less efficient; it does not make the optimiser expect a
  > thousandth of the rows. The estimate is the anomaly and it does not come from fragmentation.
- [ ] Whether the index needs rebuilding to restore the plan it used to produce
  > A rebuild would incidentally refresh the statistic, which is why it sometimes appears to fix
  > this — but it is an expensive way to do it and it obscures what the cause was.
- [ ] Whether the query should be hinted to scan the table instead of seeking
  > Fixing the estimate lets the optimiser make that choice itself, and for every other query
  > over that column too. A hint fixes one statement and freezes it.
```

## Refreshing them

```sql
UPDATE STATISTICS Orders (Status);              -- one statistic, default sample
UPDATE STATISTICS Orders;                       -- every statistic on the table
UPDATE STATISTICS Orders (Status) WITH FULLSCAN; -- read every row rather than sampling
```

`UPDATE STATISTICS` is the direct instrument and the one to reach for. `WITH FULLSCAN` reads the
whole table, which costs more and is worth it for a column whose distribution is skewed enough
that a sample misrepresents it.

Rebuilding an index also refreshes its statistic as a side effect, with a full scan, because the
rebuild has read every row anyway. That is genuinely useful and it is also why "we rebuilt the
indexes and it got faster" is such a common and such an uninformative story — the rebuild may
have done nothing and the statistics update may have done everything. `DBCC DBREINDEX` is the old
form of that operation and Microsoft has listed it as deprecated in favour of `ALTER INDEX ...
REBUILD` for many versions (verified against
[the statistics documentation](https://learn.microsoft.com/en-us/sql/relational-databases/statistics/statistics)
and the index maintenance guidance, September 2026).

The maintenance question worth being able to answer is *when*. Auto-update is on by default and
is adequate for most tables; it is sometimes turned off deliberately to keep recompilations out
of business hours, at which point statistics maintenance becomes a scheduled job somebody has to
own. A table that is bulk-loaded should have its statistics updated at the end of the load rather
than left to a threshold, because the first query after the load is exactly the one that will be
compiled against the pre-load picture.

On a large **partitioned** table that question gets its own answer. A plain `UPDATE STATISTICS`
reads across every partition, so a nightly load that touched only yesterday's partition still
pays to re-read the whole history. **Incremental statistics** (SQL Server 2014+) keep a
per-partition summary and merge them into the table-level histogram, which lets you refresh only
the partition that changed — `UPDATE STATISTICS Orders (Status) WITH RESAMPLE ON PARTITIONS (n)`
— instead of the entire table. They are switched on per statistic with `WITH INCREMENTAL = ON`.
The catch is that the merged histogram is still capped at the same 200 steps for the whole table:
incremental buys cheaper *maintenance* on a big table, not finer *resolution* (verified
2026-09-04, [the statistics documentation](https://learn.microsoft.com/en-us/sql/relational-databases/statistics/statistics)).

```quiz 01M1GF4Z6C17173FS0SA3S6QE8 cloze
Statistics summarise a column's distribution as a {{histogram}} of at most {{200}} steps, plus a
density vector and a header. The estimate the optimiser derives from them is the {{cardinality}},
and it is the input to every plan choice. `DBCC {{SHOW_STATISTICS}}` returns three result sets;
the {{header}} one carries the `Updated` timestamp that answers the staleness question. The
direct way to refresh is {{UPDATE STATISTICS}}, and `WITH {{FULLSCAN}}` reads every row instead
of sampling.
```

## Four ways estimates go wrong that are not staleness

Updating statistics is the first move and it is not always the answer. Four other causes, each
with a different signature.

**Skew inside a step.** The histogram assumes values are spread evenly within a step. When one
value dominates — a tenant with a hundred times the rows of any other, a `'system'` user, a
default value nobody cleared — the estimate for that value is averaged towards its neighbours and
is wrong no matter how fresh the statistic is. Two hundred steps is not enough resolution for
severe skew, and the symptom is that the plan is fine for most parameter values and terrible for
one.

**Parameter sniffing.** A plan is compiled once, for the parameter values of the *first*
execution, and then cached and reused. A stored procedure first called with a rare status
compiles a plan for a few rows, and every later call with a common status reuses it. This is
skew's evil twin — the statistics are perfect and the plan is still wrong — and it is why the same
procedure can be fast for one caller and slow for another with no change in between. The available
answers are `OPTION (RECOMPILE)` to compile per execution and pay the compilation cost,
`OPTION (OPTIMIZE FOR (@p = <value>))` to compile for a chosen representative value, or
`OPTIMIZE FOR UNKNOWN` to use the average density instead of any sniffed value.

**Correlation between columns.** The optimiser estimates a multi-predicate filter by combining
per-column estimates, which assumes the columns are independent. `WHERE City = 'Lisbon' AND
Country = 'Portugal'` is not two independent conditions, and treating it as such underestimates
the result badly. A multi-column statistic — which an index on those columns creates — captures
the leading column's histogram and density information for the combination.

**Predicates the optimiser cannot see through.** A predicate over an expression, a local variable
whose value is unknown at compile time, or a value that must be implicitly converted before it
can be compared, cannot be looked up in a histogram. The optimiser falls back to a fixed guess,
and the plan is built on that guess. This is the same family as sargability — writing the
predicate against the bare column is what keeps the statistic usable.

```quiz 01M1GF4Z6CSZE9KKHZ6MRMZNE7 recall
An interviewer says: "A stored procedure is fast for most of our customers and takes minutes for
our biggest one. Statistics were updated last night. What is going on?"

> Fresh statistics rules out staleness, and the fact that it depends on *which* customer points
> at the distribution rather than at the query.
>
> The likeliest cause is parameter sniffing. The procedure's plan was compiled for whichever
> customer id happened to be passed first, cached, and reused for everyone since. If that was a
> customer with a handful of rows, the plan is a nested loop with a lookup per row — perfectly
> good for them, and it does that lookup a million times for the large customer.
>
> Underneath it is data skew: one customer having a hundred times the rows of the average. The
> histogram has at most two hundred steps and assumes even distribution within a step, so even a
> freshly built statistic can estimate that customer badly.
>
> I would confirm by capturing the actual plan for the slow call and comparing estimated to
> actual rows. A large gap with a plan shaped for the small case is the signature, and I would
> check what the cached plan was compiled for.
>
> For the fix I would weigh three. `OPTION (RECOMPILE)` gives every call a plan for its own
> parameter and pays a compilation each time, which suits a procedure that is not called in a
> tight loop. `OPTIMIZE FOR` a representative value makes the plan predictable, at the cost of
> being deliberately wrong for the extremes. Splitting the procedure so the skewed case takes a
> different path is more work and the most honest fix when there are genuinely two workloads.
>
> I would also look at whether an index makes the bad plan survivable — if the lookup is what
> costs, covering the query removes the per-row cost regardless of which plan is chosen.
```

## What this buys you in the room

When a plan is wrong, "the statistics are stale" is a good first hypothesis and a bad only
hypothesis. The stronger answer names the mechanism and says how to tell it apart from the
others: staleness moves with time and is fixed by `UPDATE STATISTICS`; skew depends on which
value you ask for; sniffing depends on which call came first; correlation shows up when two
predicates combine. Each has a different fix, and saying which one you are testing is what turns
guesswork into diagnosis.

The one thing to go and read in full is Microsoft's
[statistics documentation](https://learn.microsoft.com/en-us/sql/relational-databases/statistics/statistics),
which covers how statistics are created and updated, the auto-update thresholds, and what the
histogram and density vector contain.
