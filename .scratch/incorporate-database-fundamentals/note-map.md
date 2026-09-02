# Note map: incorporating `learning-database-fundamentals`

Status: **phase 3 complete — the run is done.** All ten Lessons, four Terms, four cheat sheets,
three References, the Problem, the Plan (`content/plans/reading-order-for-databases.md`) and the
Record (`content/records/0004-database-fundamentals-incorporated.md`) are on disk. `npm run
validate` reports **no violations across 79 notes**, `npx tsc --noEmit` is clean and `npm test`
passes 543/543. Awaiting the dev's review and commit.

Source workspace: `../Playground/learning-database-fundamentals/` — nine HTML lessons (~181KB),
nine learning records, a `RESOURCES.md` of seven sources and one gap, a `LESSON_PLAN.md`, a
`GLOSSARY.md`, and a `SENIOR_ENGINEER_SUPPLEMENT.md`. Procedure:
[`docs/agents/incorporating-teaching-workspaces.md`](../../docs/agents/incorporating-teaching-workspaces.md).

Note contracts are **not** restated here. Every agent reads
[`.agents/skills/author/`](../../.agents/skills/author/SKILL.md) directly.

**This run is serial, not fanned out.** The dev asked for the lessons to be processed linearly,
so phase 2 is one subagent per topic run **one at a time, in source order** — not four in
parallel worktrees. The cheat-sheet invariant (one agent owns a topic's sheet) is unchanged;
what serial ordering additionally buys is that every cross-topic prerequisite is already on
disk when the agent that needs it starts, so only the root Lesson has to be written in phase 1.

## Topics — four

| `topic` value          | Term file                              | Title                       |
| ---------------------- | -------------------------------------- | --------------------------- |
| `relational-design`    | `content/terms/relational-design.md`    | Relational schema design    |
| `sql-server-indexing`  | `content/terms/sql-server-indexing.md`  | SQL Server indexing         |
| `database-transactions`| `content/terms/database-transactions.md`| Transactions and isolation  |
| `query-performance`    | `content/terms/query-performance.md`    | Query performance           |

The boundaries, stated once so no agent has to guess:

- `relational-design` is **the logical schema** — what a relation is, what a key promises, and
  how dependencies are removed by decomposition. Nothing in it is about how rows are stored or
  how fast a query runs.
- `sql-server-indexing` is **the physical structure** — B+ trees, the clustered/nonclustered
  split, what an index covers, and what an index costs a write. It is design-time: what to
  build, before anything is slow.
- `database-transactions` is **correctness under concurrency** — what a transaction guarantees,
  which anomalies each isolation level admits, and what locking does when two sessions collide.
- `query-performance` is **diagnosis after the fact** — reading a plan, why the optimiser chose
  it, and the three levers that change it. It is the only topic whose notes start from a symptom.

A finer split was considered and refused twice. Splitting `relational-design` into `keys` and
`normalization` gives two cards and two night-before sheets for one interview subject that is
always asked as one. Splitting `query-performance` into `execution-plans`, `statistics` and
`query-tuning` gives three cards for a single diagnostic loop — read the plan, find the
cardinality error, apply a fix — which nobody studies in thirds.

`database-transactions` carries the workspace's mission sentence about `READ COMMITTED SNAPSHOT`
and `SNAPSHOT`, which is why isolation is not filed under `query-performance` despite the
locking/blocking overlap.

## The map — twenty-four notes

### Lessons (ten)

**One Lesson per source lesson**, with one addition and one extraction:

- **Lesson 7 is new material gathered from three supplements.** Locking, blocking and deadlocks
  was `LESSON_PLAN.md`'s planned 0007 and was never written as a source lesson; its material
  exists, scattered across the "Senior Engineer Supplement" H2s of sources 0003, 0005 and 0006.
  It is gathered rather than invented. See the caution under **Uncited claims** below — this is
  the Lesson most exposed to it.
- **0006's decision framework is extracted** to a Reference, and Lesson 6 does not restate it.

| #  | Filename | `topic` | `prerequisites` | Source | Phase |
| -- | -------- | ------- | --------------- | ------ | ----- |
| 1  | `the-relational-model-and-keys` | `relational-design` | — | 0001 whole | **1 ✅** |
| 2  | `normalization-to-third-normal-form` | `relational-design` | 1 | 0002 whole | **2 ✅** |
| 3  | `clustered-and-nonclustered-indexes` | `sql-server-indexing` | 1 | 0003 whole | **2 ✅** |
| 4  | `covering-indexes-and-included-columns` | `sql-server-indexing` | 3 | 0004 §§1–7 + supp. write amplification, included-column size | **2 ✅** |
| 5  | `transactions-and-acid` | `database-transactions` | 1 | 0005 §§1–5 + supp. "Consistency ≠ Correctness" | **2 ✅** |
| 6  | `isolation-levels-and-row-versioning` | `database-transactions` | 5 | 0006 §§1–3, 5–6 (the levels themselves) + supp. RCSI vs SNAPSHOT, version store | **2 ✅** |
| 7  | `deadlocks-blocking-and-lock-ordering` | `database-transactions` | 5, 6 | 0005 supp. §§2–3 + 0006 supp. §4 + 0003 supp. §1 | **2 ✅** |
| 8  | `reading-an-execution-plan` | `query-performance` | 3 | 0007 §§1–4, 7 | **2 ✅** |
| 9  | `statistics-and-cardinality-estimation` | `query-performance` | 8 | 0008 whole | **2 ✅** |
| 10 | `fixing-a-slow-query` | `query-performance` | 8, 9 | 0009 §§1–5, 7 + supp. §§1–3 | **2 ✅** |

**Prerequisites are a spine with two forks.** Lesson 1 sits under the whole vault-side subject:
keys are what an index is built on and what a transaction locks. Lesson 3 sits under Lesson 8
because a plan is unreadable without seek-versus-scan. Nothing else earns an edge —
`normalization-to-third-normal-form` is not a prerequisite of the indexing Lessons though it is
topically adjacent, because nothing in a B+ tree depends on 3NF.

Note that Lesson 2 has **no** downstream edge at all. That is correct and not an omission.

### References (three) — phase 3

| Filename | `topic` | Source |
| -------- | ------- | ------ |
| `sql-server-isolation-levels` ✅ | `database-transactions` | 0006 §§"The Isolation Spectrum", "Decision Framework", "Setting Isolation Levels in T-SQL" |
| `execution-plan-operators` ✅ | `query-performance` | 0007 §"Red Flags" + supp. §§1, 3, 4 (MAXDOP, join types, aggregates) |
| `sql-server-performance-dmvs` ✅ | `query-performance` | 0004 supp. §1, 0006 supp. §2, 0008 §"Checking Statistics", 0009 §"Validating Your Fix" |

**The rule that keeps a Reference from being a second copy of a Lesson:** material the source
presents as something to *look up* becomes a Reference, and the Lesson that owns the surrounding
prose does **not** restate it.

So: the anomaly × level matrix, the six-way "which level" guide and the `SET TRANSACTION
ISOLATION LEVEL` / `ALTER DATABASE` syntax are Reference-only, and Lesson 6 teaches the levels
one at a time with their scenarios and no comparison grid. 0007's five red-flag operators are
Reference-only, and Lesson 8 teaches how a plan is shaped and read without cataloguing
operators. Every DMV and `DBCC` incantation in the workspace collects into one Reference, and
Lessons 4, 9 and 10 name the DMV they mean and link rather than pasting the query — with one
exception, `DBCC SHOW_STATISTICS`, whose three result sets *are* Lesson 9's argument.

Sections that read as prose stay in their Lesson even when they are lookup-flavoured: 0009's
three rewriting patterns are Lesson 10's argument and are not extracted.

### Cheat sheets (four) — phase 2, one per topic agent

`relational-design-cheat-sheet`, `sql-server-indexing-cheat-sheet`,
`database-transactions-cheat-sheet`, `query-performance-cheat-sheet`.

Written **once, after that topic's last Lesson**, never rewritten per Lesson. `author/SKILL.md`'s
per-Lesson habit is suspended for the duration of this run, as in the two previous incorporations.

### Problem (one) — phase 3, via `/import`

`diagnose-the-pending-orders-slowdown`, `kind: system-design`, `topic: query-performance`,
`practices: [statistics-and-cardinality-estimation, fixing-a-slow-query]`. From 0009's worked
example — a query that was fast at 1% `Pending` and takes five minutes at 99%, with the plan
showing a 990× estimate/actual gap. Lesson 10 therefore teaches the three paths and the
validation discipline **without** working that scenario end to end.

### Plan (one) — phase 3

`reading-order-for-databases`, spanning all four topics. Sibling of the two existing Plans.

### Record (one) — phase 3

`content/records/0004-database-fundamentals-incorporated.md`.

## What does not cross

- `SENIOR_ENGINEER_SUPPLEMENT.md` is **not a second source.** Its sections are already folded
  into the lessons as the trailing "Senior Engineer Supplement" H2s — verified heading by
  heading against all nine files. Read the lessons; do not read the supplement as additional
  material, or the same argument gets authored twice.
- `GLOSSARY.md` does not cross. It is the workspace's vocabulary control, and this vault's
  equivalent is `content/terms/` plus the `topic` vocabulary itself. Its definitions are already
  the prose of the lessons that introduce them.
- `LESSON_PLAN.md` is **stale** — it lists 0007 as "Locking, Blocking & Deadlocks" and marks
  0005–0009 as not started, while nine lessons exist on disk and 0007 is execution plans. Trust
  the `lessons/` directory, never the plan. The capstone 0010 it plans was never written and is
  not being invented here.
- **Columnstore indexes** (0003 supp. §3) cross only as a sentence in Lesson 3 naming what they
  are for. `MISSION.md` scopes the subject to OLTP design and performance; an OLAP storage model
  is a different run.
- **Adaptive joins / query feedback** (0007 supp. §5) do not cross. Four sentences, no source
  behind them, and version-gated on SQL Server 2017+.

## Uncited claims — the specific ones to soften

The workspace is a course written to teach, and it states mechanism more confidently than its
citations support. Three claims are worth naming because each would do real damage as a quiz
answer:

1. **"SNAPSHOT is like SERIALIZABLE with row versioning."** It is not. Snapshot isolation
   prevents dirty, non-repeatable and phantom reads and is still not serialisable — write skew
   survives it, which is exactly why the update-conflict error (3960) exists at all. Say what
   snapshot prevents and say that a conflicting write fails at commit; do not equate the two
   levels, and do not make the equation a quiz answer.
2. **"READ UNCOMMITTED is the right choice for a report"** (quiz 6.1 and the decision
   framework). The source recommends it; the cited MS Learn page does not. Reduce it to what the
   level *does* — no shared locks, so dirty reads and a risk of reading a row twice or missing
   one entirely — and let the reader draw the conclusion. RCSI is the answer that page actually
   supports.
3. **Every number in 0004's and 0009's worked examples** — "1,000 lookups", "990,000 lookups",
   "5 minutes to 2 seconds" — is illustrative arithmetic invented by the course, not a measured
   result. Keep them as worked arithmetic, framed as such, and never as a benchmark.

**Version-pinned facts** — that `READ COMMITTED` is the SQL Server default, that Query Store
arrived in SQL Server 2016, that `DBCC DBREINDEX` is deprecated — carry the version and the date
verified in the note's own body.

## Which names an agent may link

Link freely to any note this map names and to any note already on disk; **never invent a name
that is in neither.** A forward link is the authoring queue only when it guesses the name the
note will actually take.
