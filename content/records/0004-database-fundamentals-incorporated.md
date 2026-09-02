---
id: 01M1GGSWF9Q1WRX28Z6417B0AC
title: Database fundamentals incorporated from the teaching workspace
date: 2026-09-02
topic:
  - relational-design
  - sql-server-indexing
  - database-transactions
  - query-performance
---

The `learning-database-fundamentals` workspace in `../Playground/` is incorporated and done. Its
nine HTML lessons became ten Lessons, four Terms, four cheat sheets, three References, one Problem
and one Plan — [[reading-order-for-databases]], the vault's third — and nothing was written back
into it. It is not to be re-imported. The tenth Lesson,
[[deadlocks-blocking-and-lock-ordering]], is material the workspace planned and never wrote: it
existed only as three trailing supplement sections across sources 0003, 0005 and 0006, and was
gathered rather than invented.

**The prior knowledge it records is thin, and that is itself the finding.** This workspace's
`learning-records/` are authoring logs — one per lesson, written when the lesson was created,
describing didactic choices and what the *next* lesson may assume. Not one of them records
evidence that anything landed with the dev: no answered quiz, no correction, no disclosure of
depth. So this run had nothing to raise the floor with, and the next database Lesson should assume
coverage rather than command. What the logs do carry is a consistent authorial *intent* worth
keeping, because the notes were written to it: isolation is a spectrum and a choice rather than a
correctness switch, and a slow query is an execution problem before it is a schema problem. Both
are now the organising claim of a note — [[isolation-levels-and-row-versioning]] and
[[reading-an-execution-plan]] respectively.

**Three claims were corrected, and one worked example was rebuilt.** The pattern from the two
previous incorporations repeats exactly: the course is most confident where its citations stop.
It equates `SNAPSHOT` with `SERIALIZABLE` "plus row versioning", which write skew and the very
existence of update-conflict error 3960 contradict; it recommends `READ UNCOMMITTED` for reporting,
which the MS Learn page it cites does not (RCSI is what that page supports); and it states that SQL
Server parallelises a query estimated to cost more than "5 seconds", where 5 is a unitless optimiser
cost. [[sql-server-isolation-levels]] and [[execution-plan-operators]] carry the corrected
versions. Separately, source 0009's worked example is arithmetically incoherent — a bare `COUNT(*)`
over a clustered index scan cannot be made slow by a cardinality error, since the scan is the only
path either way — so [[diagnose-the-pending-orders-slowdown]] rebuilds the scenario around a seek
plus a key lookup per row, which is the shape in which the source's own numbers actually produce
the symptom. The general lesson, third time stated: **a teaching source's worked examples want
checking as hard as its claims**, because an example that does not compute survives review far more
easily than a sentence that is wrong.

**One boundary is worth recording for the next run.** Four topics were kept where a finer split was
twice available — `keys` / `normalization`, and `execution-plans` / `statistics` / `query-tuning` —
because each would have produced a card and a night-before sheet for a fragment of one interview
subject. The four that survive are the four questions someone sits down to study: the logical
schema, the physical structure, correctness under concurrency, and diagnosis after the fact.
