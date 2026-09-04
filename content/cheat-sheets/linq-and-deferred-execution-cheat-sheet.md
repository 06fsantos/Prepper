---
id: 01M1P5JNFBSHQD48B9D1M5NKPF
title: LINQ and deferred execution — cheat sheet
topic: linq-and-deferred-execution
---

- **Deferred execution**: a LINQ query runs when the query variable is *iterated*, not when it is
  *created*. Built on iterator `yield`. Building `people.Where(...)` allocates and runs nothing.
- **Deferred operators** return a sequence and stay lazy: `Where`, `Select`, `OrderBy`, `Take`,
  `Skip`, `Distinct`, `GroupBy`.
- **Immediate operators** return a scalar or concrete collection and force the query to run *now*:
  `ToList`, `ToArray`, `Count`, `First`, `Single`, `Any`, `Sum`.
- **Rule of thumb**: returns `IEnumerable<T>` → defers; returns `T` / `int` / `List<T>` → runs.
- **Multiple-enumeration trap**: enumerating an `IEnumerable` twice re-runs the whole pipeline twice.
  Two `foreach`/`Any`/`Count` over one query = two executions — two DB round trips if the source is a
  database, and possibly *different* data or double side effects. Analyzer **`CA1851`** flags it.
- **Fix**: materialise once with `ToList()` / `ToArray()` when you enumerate more than once or the
  source is expensive/one-shot. Keep it deferred when you walk it exactly once (streaming, `Take`).
- **`IEnumerable<T>` vs `IQueryable<T>`**: same lambda compiles to a **delegate** (runs in-process,
  LINQ-to-Objects) vs an **expression tree** (a provider like EF Core translates it to SQL, runs at
  the database).
- **The boundary**: an `IQueryable` chain stays SQL only while every operator is translatable.
  `AsEnumerable()` — or a method the provider can't translate — **ends translation**: everything so
  far is materialised into the app and the rest runs in memory. That turns a `WHERE` into a full
  table read over the wire.

The reach-for-it signal: any LINQ over a database, or any query variable you touch more than once.
Say out loud *when* it runs (iteration) and *where* it runs (in-process vs at the source).

Full treatment: [[deferred-execution-in-linq]], [[the-multiple-enumeration-trap]], and
[[iqueryable-versus-ienumerable]]. Collection Big-O is separate — see
[[csharp-collections-for-interviews]] and [[hash-map-lookup-cost]].
