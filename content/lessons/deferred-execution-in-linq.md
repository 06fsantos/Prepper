---
id: 01M1P5JNFB0X1R8MYJ5VYXXTBA
title: Deferred execution in LINQ
topic:
  - linq-and-deferred-execution
---

A LINQ query is a description of work, not the work itself. When you write
`var adults = people.Where(p => p.Age >= 18)`, nothing is filtered. No list is allocated, the
predicate has not run once, and `adults` holds a query object that *knows how* to produce the
results. The one-line version an interviewer wants: **a LINQ query over `IEnumerable<T>` executes
when the query variable is iterated, not when it is created.** The Microsoft docs put it exactly
that way — queries "are always executed when the query variable is iterated over, not when the query
variable is created."

This is **deferred execution**, and it is built on iterator `yield`. Each operator wraps its source
in an iterator that pulls one element at a time, so the whole chain runs lazily, element by element,
the moment a `foreach` — or any consumer that walks the sequence — asks for the first item.

## What "iterated" means

The trigger is enumeration, and several things enumerate. A `foreach` does. So does
`ToList()`, `ToArray()`, `Count()`, `First()`, `Single()`, `Sum()`, and `Aggregate()` — each walks
the sequence to produce its answer. Until one of those happens, the query is inert.

```csharp
var query = numbers.Where(n => n > 10);   // nothing runs here
foreach (var n in query) { /* the predicate runs now, once per element */ }
```

Because the predicate has not run at construction, a query captures its source and its lambdas *by
reference to the moment of iteration*, not the moment of definition. Change the source between
building the query and iterating it, and the query sees the new data — a genuine surprise the first
time you meet it.

```quiz 01M1P5JNFB4QSB00F2KZABD323
`var q = list.Where(x => x > 0);` runs on `list = {1, 2}`. You then add `3` to `list`, and only
after that write `foreach (var x in q)`. What does the loop see?

- [x] `1, 2, 3` — the query runs at iteration, over the list as it is then
  > Deferred execution means the `Where` walks the source at `foreach` time, so the later `3` is included.
- [ ] `1, 2` — the query captured the list's contents when it was written
  > No snapshot is taken at construction; the query holds the source, not a copy of its elements.
- [ ] `1, 2, 3` — but only because `Where` eagerly re-scans on every add
  > `Where` does not watch the list; it simply has not run at all until the `foreach` iterates it.
```

## Deferred versus immediate operators

Not every operator defers. The split is worth memorising, because it is the whole game:

- **Deferred** (return a sequence, run lazily): `Where`, `Select`, `OrderBy`, `Take`, `Skip`,
  `Distinct`, `Concat`, `GroupBy`, `Reverse`. They hand back an iterator and do nothing yet.
- **Immediate** (return a scalar or a materialised collection, run now): `ToList`, `ToArray`,
  `ToDictionary`, `Count`, `Sum`, `First`, `Single`, `Any`, `Average`, `Aggregate`. They must walk
  the sequence to compute their result, so they force execution on the spot.

The rule of thumb: if the return type is another `IEnumerable<T>`, it defers; if it is a `T`, an
`int`, or a concrete `List<T>`, it runs. `ToList()` is the standard way to say "run this now and keep
the result."

```quiz 01M1P5JNFBZB4W8ND83TD66SJ7 cloze
An operator that returns another sequence, like `Where` or `Select`, uses {{deferred}} execution and
runs nothing until iterated; an operator that returns a scalar or a concrete collection, like
{{ToList}} or `Count`, forces the query to run immediately.
```

```quiz 01M1P5JNFB3744KYVR7AN9KN48
You have `var q = data.Where(...).Select(...);` and want the query to run right now and keep the
result. Which single call does that?

- [x] `.ToList()`, which walks the sequence once and returns a concrete `List<T>`
  > `ToList` is immediate: it enumerates the pipeline now and materialises the results into a list.
- [ ] `.Where(...)`, which starts the pipeline running as each stage is added
  > `Where` is deferred; adding it composes another lazy stage and executes nothing yet.
- [ ] `.AsEnumerable()`, which triggers execution of the whole chain immediately
  > `AsEnumerable` only changes the static type; it stays deferred and runs nothing on its own.
```

## Why it is powerful, and where it bites

Laziness composes. `people.Where(...).Select(...).Take(5)` never builds an intermediate filtered
list and then a projected list; it streams, and `Take(5)` stops the whole pipeline after five
elements flow through. On a large or infinite source, that is the difference between reading five
rows and reading a million.

The cost is that the query is a live thing, not a value. Iterate it twice and the entire pipeline
runs twice — which becomes a correctness and performance bug the moment the source is a database
call or the predicate has side effects. That trap has its own lesson:
[[the-multiple-enumeration-trap]]. And when the source is a database, *where* execution happens
matters as much as *when* — see [[iqueryable-versus-ienumerable]].

In an interview, say the mechanism out loud: "LINQ defers — this query runs when I iterate it, not
here." Then reach for the consequence the question is fishing for, which is almost always either
double enumeration or the `IQueryable` boundary.

Primary source worth reading in full: the .NET guide to
[deferred execution and lazy evaluation](https://learn.microsoft.com/en-us/dotnet/standard/linq/deferred-execution-lazy-evaluation).
