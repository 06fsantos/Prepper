---
id: 01M1GFAAY6BF98J585W40SEVVW
title: Query performance — cheat sheet
topic: query-performance
---

**SQL says what, the optimiser decides how.** A slow query cannot be diagnosed by reading the
query — the text has not changed. The **plan** changed, or what the optimiser *believed* when it
chose the plan.

**A plan is a tree.** Leaves reach the data, rows flow up, the root returns the result. Operators
are **pipelined** (a parent pulls from its child; everything runs at once) and a child may run
**many times** — the inner side of a nested loop runs once per outer row.

**Two numbers on every operator:**

- **Cost** — a unitless *estimate*, as a percentage of the plan. Where to look first. **Not a
  measurement of time**, and computed from the same beliefs you are investigating.
- **Rows** — the cardinality. Decides everything: access method, join algorithm, memory grant.

**The technique is estimated vs. actual.** An estimated plan is intent; an **actual** plan carries
real row counts and runtime warnings. A big gap means *the optimiser solved a different problem*
— a plan built for 500 rows is a good plan for 500 rows and a disaster for 50,000. Estimates that
match the actuals mean the plan is reasonable and the problem is elsewhere.

**Three questions each operator answers:**

- **How is data reached** — scan (all of it) / seek (navigate) / **lookup** (per-row jump back for
  columns the index lacks).
- **How are streams joined** — **nested loops** (inner side once per outer row; small outer,
  seekable inner) · **hash match** (build + probe; large unsorted inputs; needs memory) · **merge**
  (two pre-sorted inputs; cheap when an index supplies the order).
- **What happens on the way up** — filter, **sort** (expensive, and removed outright by an index
  in the right order), aggregate, parallelism operators.

A sort or hash build that exceeds its memory grant **spills to `tempdb`** — the actual plan warns.
A spill almost always traces back to an underestimated row count.

**Statistics are where the beliefs come from.** A **histogram** of at most **200 steps** per
column, plus a density vector and a header. `DBCC SHOW_STATISTICS('Table','Col')` returns those
three: the **header** answers staleness (`Updated`, `Rows`, `Rows Sampled`), the **histogram**'s
`EQ_ROWS` is the estimate for an equality predicate — compare it against a `COUNT(*)` in seconds.
Refresh with `UPDATE STATISTICS T (Col)`, add `WITH FULLSCAN` for skewed data. An index rebuild
refreshes statistics as a side effect, which is why "we rebuilt and it got faster" is such an
uninformative story.

**Four ways an estimate goes wrong, and how to tell them apart:**

| Cause | Signature | Fix |
| ----- | --------- | --- |
| Stale statistics | Drifts with time; "fine for months, then wasn't" | `UPDATE STATISTICS` |
| **Skew** | Wrong for *one value*, fine for the rest; 200 steps assume even spread | `FULLSCAN`, `OPTIMIZE FOR` |
| **Parameter sniffing** | Depends on *which call came first*; stats are perfect | `RECOMPILE` / `OPTIMIZE FOR` |
| Correlation | Two predicates combined (`City` + `Country`); estimator assumes independence | multi-column stats/index |

Predicates the optimiser cannot see through — an expression, a local variable, an implicit
conversion — get a fixed guess instead of a histogram lookup.

**Three paths to a fix, in this order:**

1. **Index** — scan where a seek is possible → key on the predicate; repeated lookups → `INCLUDE`;
   expensive sort → key in that order.
2. **Rewrite** — when the *shape* hides the answer.
3. **Hint** — freezes today's decision into the source. Last resort.

The first two change what is true, so the optimiser keeps choosing and keeps adapting. Missing
index suggestions in a plan mean "it wanted to seek and couldn't" — a signal, not a design.

**Rewrite patterns:** take the function off the column (`WHERE OrderDate >= DATEADD(...)`, not
`WHERE DATEDIFF(...) <= 30`) · split an `OR` across different columns into two seekable branches
combined with `UNION` (not `UNION ALL` — duplicates) · give the optimiser a join rather than a
correlated subquery. **Every rewrite must return the same rows** — prove it with `EXCEPT` both
ways; `NULL`s and outer joins are where equivalence breaks.

**Before any of the three, check the cause is fixable by them:** stale statistics → update, not
index. **Blocked, not slow** → the plan looks healthy because it is; that is a locking problem.
Genuinely reading that much data → ask for less.

**Validating:** baseline first. **Lead with logical reads** (`SET STATISTICS IO ON`) — a property
of the plan, stable run to run — not elapsed time on a shared server. Compare *ranges* over
several runs, not one number. Then check side effects: a new index is paid for by every write, so
test a realistic write workload; a rewrite must be row-equivalent; neighbouring queries share the
same indexes.

**Prioritise by duration × frequency.** 100ms × 10,000/day beats 30s × 1/day, and users are
waiting on the first.

**The reach-for-it signal:** "it was fast last month and nothing changed." Something changed —
data volume, distribution, or which parameters compiled the cached plan.

Operator-by-operator lookup: [[execution-plan-operators]]. DMVs and Query Store queries:
[[sql-server-performance-dmvs]].
Full treatment: [[reading-an-execution-plan]], then [[statistics-and-cardinality-estimation]],
then [[fixing-a-slow-query]].
