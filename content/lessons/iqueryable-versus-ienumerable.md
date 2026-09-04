---
id: 01M1P5JNFBTWQMBAJ5TWK8W86E
title: IQueryable versus IEnumerable
topic:
  - linq-and-deferred-execution
prerequisites:
  - deferred-execution-in-linq
---

The same LINQ query — `source.Where(x => x.Total > 100)` — can run in two completely different
places depending on one thing: the static type of `source`. If it is `IEnumerable<T>`, the query runs
**in your process**, in C#, over objects already in memory. If it is `IQueryable<T>`, the query is
handed to a **provider** — Entity Framework Core, most often — that translates it to SQL and runs it
**at the database**. The one-line version: `IEnumerable<T>` compiles the lambda to a *delegate*;
`IQueryable<T>` compiles it to an *expression tree*.

## Delegates versus expression trees

When you write `.Where(x => x.Total > 100)` against `IEnumerable<T>`, the lambda becomes a compiled
`Func<T, bool>` — executable code. LINQ-to-Objects calls it once per element, in-process. There is
nothing to translate; it just runs.

Against `IQueryable<T>`, the *same lambda* is compiled to an `Expression<Func<T, bool>>` — a data
structure describing the code: "a greater-than, whose left is the `Total` property, whose right is the
constant 100." The query is not executable; it is a **description** the provider walks. EF Core reads
that expression tree and emits `WHERE [Total] > 100` in SQL, so the filtering happens in the database
engine and only the matching rows come back over the wire.

```quiz 01M1P5JNFBR0S5E3BQGF1614CE
The compiler turns the *same* `x => x.Total > 100` lambda into different things for `IEnumerable<T>`
and `IQueryable<T>`. What, respectively?

- [x] A delegate that runs in-process, and an expression tree a provider translates
  > `IEnumerable` gets executable `Func`; `IQueryable` gets an `Expression` tree EF Core turns into SQL.
- [ ] An expression tree the database runs, and a delegate that runs in-process
  > It is the other way round — `IQueryable` is the one carrying the translatable expression tree.
- [ ] A delegate in both cases, differing only in where the delegate executes
  > `IQueryable` cannot use a compiled delegate; the provider needs the tree as data to emit SQL.
```

## The boundary is where SQL stops and iteration begins

This is the senior point, and it is worth stating precisely. An `IQueryable` stays translatable only
while every operator in the chain is one the provider understands. The moment you call an operator
that runs against `IEnumerable` — or a method the provider cannot translate to SQL — **execution
materialises everything up to that point and pulls it into the app**, and the rest of the chain runs
in memory.

Two ways to fall off the cliff, both common:

- **Switching to `IEnumerable` too early.** `db.Orders.AsEnumerable().Where(o => o.Total > 100)`
  pulls *every* order into the process and filters in C#. The `Where` is now LINQ-to-Objects. What
  should have been a `WHERE` clause is a full table read streamed over the wire, then discarded.
- **Calling something the provider can't translate.** A predicate that calls a local C# method EF
  Core has no SQL for forces the same fallback (or throws) — it cannot become part of the tree.

```csharp
// Good: the filter is an expression tree → SQL WHERE, one row set comes back
var big = db.Orders.Where(o => o.Total > 100).ToList();

// Bad: AsEnumerable() ends translation → every row loaded, then filtered in memory
var big = db.Orders.AsEnumerable().Where(o => o.Total > 100).ToList();
```

Getting that line wrong turns an indexed `WHERE` into a full scan pulled across the network — the
kind of regression you diagnose by [[reading-an-execution-plan]] and finding a scan where a
[[what-an-index-is|seek]] belonged. The query was correct; it just ran in the wrong place.

```quiz 01M1P5JNFBTZPW7G32J55CGF7X cloze
An `IQueryable` chain is translated to SQL only while every operator stays translatable; inserting
{{AsEnumerable}} (or calling a method the provider can't translate) ends translation, so everything
up to that point is {{materialised}} into the app and the rest of the query runs in memory.
```

## Deferred either way — but deferred to different machines

Both interfaces defer: building the query runs nothing, and iterating it — `foreach`, `ToList`,
`Count` — is what executes it, exactly as [[deferred-execution-in-linq|deferred execution]]
describes. The difference is *where* that execution lands. Enumerating an `IEnumerable` runs C# over
in-memory objects; enumerating an `IQueryable` sends SQL to the database. So the
[[the-multiple-enumeration-trap|multiple-enumeration trap]] is sharper here: a second enumeration of
an `IQueryable` is a second round trip to the database, not just a second in-memory pass.

```quiz 01M1P5JNFBNQG36FKVBGWE1EB2
Why does calling `.AsEnumerable()` before a `.Where(...)` on an EF Core query hurt performance?

- [x] It ends SQL translation, so all rows load into the app and `Where` filters in memory
  > After `AsEnumerable()` the `Where` is LINQ-to-Objects; the database returns every row first.
- [ ] It forces the database to run the filter twice, once per interface
  > The database runs nothing after `AsEnumerable()`; the filter has moved entirely into the process.
- [ ] It converts the expression tree to faster compiled SQL ahead of time
  > There is no faster SQL — translation stops, and the filter no longer reaches the database at all.
```

In an interview, the frame to offer is: "`IQueryable` composes SQL; `IEnumerable` iterates objects.
I want the filtering and paging to stay `IQueryable` so it runs in the database, and I only drop to
`IEnumerable` — with `AsEnumerable` or `ToList` — once I've narrowed the set to what the app actually
needs."

Primary source worth reading in full: the API reference for
[`IQueryable<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.linq.iqueryable-1).
