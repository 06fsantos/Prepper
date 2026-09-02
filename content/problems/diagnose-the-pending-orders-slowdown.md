---
id: 01M1GGWTPQEE79YAY3DE0WDVGV
title: Diagnose the pending orders slowdown
kind: system-design
difficulty: medium
topic:
  - query-performance
practices:
  - statistics-and-cardinality-estimation
  - fixing-a-slow-query
---

## Prompt

A nightly job pulls the list of orders still sitting in `Pending` and hands it to an operations
team. A month ago it finished in seconds; it now takes about five minutes and is starting to
overrun the window it was given. Nothing was deployed in that month — same statement, same
schema, same server — but the business has changed underneath it: the table has grown, and far
more of the orders in it are stuck in `Pending` than used to be. You are given access to the
database and nothing else. Say how you would find out what the engine is actually doing, what
you would change, why you would change that rather than the other things available to you, and
how you would prove afterwards that it worked and did not cost something elsewhere.

## Constraints

- SQL Server. One OLTP database; the report reads the live `Orders` table.
- `Orders` holds roughly a million rows and is clustered on `OrderID`.
- `IX_Orders_Status` — nonclustered, keyed on `Status` alone — already exists.
- The report returns several columns per pending order, not a count.
- Auto-update statistics is at its default setting and nobody runs a maintenance job.
- No deployment, schema change or configuration change in the month the slowdown appeared.
- The job runs once a night, off-hours, and is read-only.

## Hints

1. Two things changed in that month and one of them did not. The statement is identical; the data
   is not. Which of the two does the engine make its decisions from, and when did it last look at
   it?
2. The cheapest evidence in the building is two numbers that sit side by side on every operator of
   an actual plan. A large ratio between them says something no timing can.
3. The plan being run is a good plan — for a table that no longer exists. Work out what would have
   to be true for the engine to have chosen it, then work out what it would choose if it knew the
   truth. The fix is one statement, and the plan it produces will look *worse* than the one it
   replaced.

## Solution

**The numbers below are illustrative arithmetic, not measurements.** They are round figures chosen
so the ratio is legible — a million-row table, a thousand rows against nine hundred and ninety
thousand — and the five-minutes-to-two-seconds figure is the same kind of illustration. What the
worked example is teaching is the *shape* of the ratio and what it implies about the plan; treat
any specific duration as a stand-in for whatever you measure on the day.

### Baseline before touching anything

`SET STATISTICS IO ON` and `SET STATISTICS TIME ON`, and record logical reads and CPU alongside
elapsed time. Logical reads are the number to lead with: elapsed time on a shared box moves with
everything else running, while pages touched is a property of the plan and barely varies run to
run. Without that number recorded first there is no way to say afterwards whether the fix was the
fix or the server was quiet.

### The diagnosis is one comparison

Capture the **actual** plan, not the estimated one, and compare estimated rows against actual rows
on each operator — the technique is [[reading-an-execution-plan]]. Here the plan is a nested loop
whose outer input is an index seek on `IX_Orders_Status` and whose inner input is a key lookup into
the clustered index, and the seek carries an estimate of **1,000 rows** against an actual of
**990,000**. That is the whole diagnosis: a ratio of about 990×, and it is not a small error but a
different problem being solved.

Run the arithmetic out loud, because it is what converts a ratio into five minutes. A key lookup is
a root-to-leaf traversal of the clustered index, done once per row the seek produced. Priced at a
thousand rows that is a thousand traversals, which is nothing. Executed against nine hundred and
ninety thousand rows it is nine hundred and ninety thousand of them — random single-row access
repeated until it has walked the whole table the hard way. The engine did not choose a bad plan; it
chose a good plan for a thousand rows and was then handed a million.

Confirm the cause rather than assuming it:

```sql
DBCC SHOW_STATISTICS('Orders', 'IX_Orders_Status');
```

The header answers the staleness question — `Updated` a month old, `Rows` a fraction of what the
table now holds — and the histogram answers the distribution question: `EQ_ROWS` for `Pending`
sitting at about a thousand while the table has nine hundred and ninety thousand of them. What the
statistic describes and what the table contains are a month apart. Reading those three result sets
is [[statistics-and-cardinality-estimation]].

**If the header comes back fresh, this is a different problem and the branch matters.** Accurate
statistics with a wrong estimate points at skew inside a histogram step, at a plan cached for
different parameter values, or at a predicate the optimiser cannot see through — each with its own
signature and its own fix, and none of them fixed by the statement below. Say which one you are
testing rather than reaching for the first remedy.

### The fix is one statement, and it is the least drastic one available

```sql
UPDATE STATISTICS Orders (Status) WITH FULLSCAN;
```

Narrow, because one statistic is what is wrong and refreshing every statistic on the table is a
larger read than the problem justifies. `WITH FULLSCAN` because the column is now severely
skewed — one value holds nearly the whole table — and a sample is exactly what misrepresents that.

Recompile and the estimate lands near 990,000. The optimiser now prices a lookup per row at what it
costs, discards the seek, and takes a **clustered index scan** instead: five minutes down to about
two seconds, on the illustrative figures.

**The new plan looks worse and that is the lesson.** A seek was replaced by a scan, which is the
direction everybody is trained to read as a regression. It is not, because the fastest way to read
99% of a table is to read the table once in order rather than to visit it a million times at
random. A plan operator is not good or bad on its own; it is good or bad for a row count, and the
row count is the thing that changed.

Do not carry away a percentage from this. The point at which a seek-plus-lookup stops being worth
it — the *tipping point* — is priced in **pages**, not in a share of rows: it arrives when the
lookups would read more pages than the table has. Where that lands depends on how many rows fit on
an 8KB page, so a wide table tips at a far smaller fraction of its rows than a narrow one, and
"about a third" is an observation about common tables rather than a rule the optimiser applies.

### The three things not to do, and why each is tempting

**Do not add an index.** There is already an index on `Status`, and it was being used. Nothing about
the access path was missing; the *price* the optimiser put on it was wrong. Adding a second index
would leave the wrong belief in place and charge every write for the privilege — and the missing
index suggestion the plan may volunteer is a signal that the optimiser wanted something, not a
design ([[clustered-and-nonclustered-indexes]]).

**Do not hint the scan.** `WITH (INDEX(0))` or `OPTION (...)` would produce the right plan tonight
and freeze it. The backlog is a temporary state of the business: when operations clear it and
`Pending` returns to a fraction of a percent, the seek is the correct plan again and the hint will
not allow it. A hint is a decision made on today's distribution and written into the source where
nobody can tell whether the condition it was for still holds. The narrow band where one is right —
parameter sniffing, where the statistics are accurate and the cached plan is the problem — is not
this.

**Do not rebuild the index.** `ALTER INDEX ... REBUILD` would fix the symptom, because a rebuild
reads every row and refreshes the statistic as a side effect. It works by accident, at many times
the cost, and it leaves the team with the folklore that rebuilding indexes makes things faster
rather than with the knowledge of what was actually wrong.

### The structural fix, if this report is going to keep running

Refreshing the statistic corrects the estimate; it does not make the report cheap. If it matters,
the durable change is a **covering** index — `Status` as the key, the report's columns carried in
`INCLUDE` — which removes the key lookup regardless of which plan is chosen, and whose usefulness
does not depend on what fraction of the table is `Pending`:

```sql
CREATE NONCLUSTERED INDEX IX_Orders_Status_Report
ON Orders(Status)
INCLUDE (OrderID, CustomerID, OrderDate, TotalAmount);
```

That is [[covering-indexes-and-included-columns]], and the cost is stated rather than skipped: every
insert, update and delete on `Orders` now maintains one more structure, forever, for a report that
runs once a night. Whether that trade is worth making is exactly the question, and the honest answer
here may be no.

One instinct to name and reject: a **filtered** index on `WHERE Status = 'Pending'`. Filtered indexes
earn their keep when the predicate selects a small slice, and this predicate now selects 99% of the
rows — the filtered index would be a second copy of the table, maintained alongside the first.

### Proving it

Re-measure the same way you baselined, and do four things rather than one. Compare **logical reads**,
not just duration, because a change that halves the clock and does not move the reads may have
changed nothing. Compare **distributions**: several runs of each version, and the improvement is real
when the new version's worst run beats the old version's best. Check **what else moved** — if an
index went in, run a realistic write workload against production-scale data, and check the queries
that share those structures, because a large win here and a moderate regression across ten
neighbours is a net loss. And **rank what to do next by impact**, duration × frequency rather than
duration, which the query statistics DMVs in [[sql-server-performance-dmvs]] produce directly and
which Query Store keeps over time. The discipline is [[fixing-a-slow-query]].

### The answer that is not about the database

Say this part unprompted, because it is what separates a tuner from an engineer. Ninety-nine percent
of orders sitting in `Pending` is not a data-volume story, it is a **broken pipeline**: something
that used to move orders out of that state has stopped. The query got slow because the system got
sick, and the tuning fix makes the report finish while leaving the sickness in place. Fix the
estimate tonight so operations get their list, and open the other ticket in the same breath.

## Follow-ups

- You update the statistic and the estimate is still wrong. Where do you go next, and what would
  each candidate cause look like in the plan?
- Operations clear the backlog and `Pending` falls back to a fraction of a percent. Does anything
  you did become wrong, and would you have known?
- The same statement is a stored procedure that is fast for one caller and slow for another, with
  freshly built statistics. Different problem or the same one?
- The report cannot be moved off the OLTP database and now has to run hourly instead of nightly.
  What changes about your answer?
- The plan turns out to be healthy — estimates matching actuals, few reads — and the five minutes
  are spent waiting. What are you looking at now?
