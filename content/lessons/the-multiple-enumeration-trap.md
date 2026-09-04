---
id: 01M1P5JNFB82GRS6QDD26CQQGE
title: The multiple-enumeration trap
topic:
  - linq-and-deferred-execution
prerequisites:
  - deferred-execution-in-linq
---

An `IEnumerable<T>` is not a collection you hold — it is a recipe you can re-run. Because a LINQ
query [[deferred-execution-in-linq|defers execution]], enumerating the same query variable twice runs
the entire pipeline twice, from the source down. When the source is a `List<T>` already in memory,
that is merely wasteful. When the source is a database query, an HTTP call, or anything with side
effects, it is a bug.

## The shape of the bug

The classic version reads harmlessly:

```csharp
IEnumerable<Order> orders = db.Orders.Where(o => o.Total > 100);   // deferred: nothing has run

if (orders.Any())                       // enumeration #1 — hits the database
{
    foreach (var o in orders) { ... }   // enumeration #2 — hits the database AGAIN
}
```

`Any()` walks the sequence to answer "is there at least one?", which executes the query. The
`foreach` then walks it again, executing the query a second time. Two round trips to the database for
one logical read — and if rows changed in between, the `Any()` and the `foreach` can even disagree
about what data exists.

The danger is that `orders` *looks* like a collection. Nothing in the type says "I re-run every time
you touch me," so the second enumeration is invisible at the call site.

```quiz 01M1P5JNFBDTTFTQ3QR6C75G5X
`IEnumerable<Row> q = db.Query(...);` then `var n = q.Count();` followed by `foreach (var r in q)`.
How many times does the underlying query run against the source?

- [x] Twice — `Count()` enumerates it once and the `foreach` enumerates it again
  > Both `Count()` and `foreach` walk the sequence, and a deferred query re-executes on each walk.
- [ ] Once — the result is cached after the first enumeration
  > `IEnumerable<T>` caches nothing; each enumeration re-runs the whole pipeline from the source.
- [ ] Zero — assigning the query to `q` already executed it
  > Assignment only builds the deferred query; execution waits for the first enumeration.
```

## Why side effects make it a correctness bug, not just a slow one

If the pipeline has side effects — a `Select` that logs, a source that increments a counter, a
generator that reads the next network packet — each enumeration triggers them again. A sequence built
on a one-shot source (a network stream, a `yield` that consumes input) can even yield *different
elements* the second time, or nothing at all. So the failure is not "it is slow"; it is "the program
computed the wrong answer."

```quiz 01M1P5JNFBDE9Y8VB71CRKVP2G cloze
Enumerating an `IEnumerable` twice re-runs the whole {{pipeline}} each time; when the source is a
database query or has side effects, the fix is to materialise once with {{ToList}} (or `ToArray`) so
the work happens a single time.
```

## The analyzer that catches it, and the fix

.NET ships a code-analysis rule for exactly this: **`CA1851`, "Possible multiple enumerations of an
`IEnumerable` collection."** It flags a parameter or local of an enumerable type that is walked more
than once on some path, because the analyzer cannot prove the source is cheap and repeatable.

The fix is to **materialise once**: call `ToList()` or `ToArray()` to run the query a single time and
keep the results in a concrete collection, then work with that.

```csharp
List<Order> orders = db.Orders.Where(o => o.Total > 100).ToList();  // runs once, here

if (orders.Any())                       // now a cheap in-memory check
{
    foreach (var o in orders) { ... }   // same in-memory list, no second query
}
```

The judgement call: materialise when you will enumerate more than once, when the source is expensive
or one-shot, or when you need a stable snapshot. Keep it deferred when you enumerate exactly once and
want the streaming and short-circuiting that laziness buys — materialising a query you only walk once,
or one you were about to `Take(5)` from, throws away the very benefit of
[[deferred-execution-in-linq|deferred execution]].

```quiz 01M1P5JNFB60P9SANFQYFX4W2A
A method receives an `IEnumerable<T>` parameter and needs to both check `.Any()` and `foreach` over
it. What is the senior fix, and why?

- [x] Call `.ToList()` once at the top and use the list — it runs the source a single time
  > Materialising forces one enumeration and gives an in-memory collection safe to walk repeatedly.
- [ ] Leave it deferred — `IEnumerable` caches its results after the first pass
  > It does not cache; each of the two walks would re-execute the underlying source.
- [ ] Call `.Any()` twice so the counts always match up correctly
  > That adds a third enumeration and still re-runs a possibly-changed source each time.
```

Primary source worth reading in full: the rule page for
[CA1851: Possible multiple enumerations of an `IEnumerable` collection](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851).
