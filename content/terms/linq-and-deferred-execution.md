---
id: 01M1P5JNFAZBAFAHFXG05HDGTD
title: LINQ and deferred execution
topic:
  - csharp-type-fundamentals
---

LINQ is C#'s query syntax over sequences, and its defining behaviour is that a query describes work
without doing it: the operators over `IEnumerable<T>` run only when the result is iterated, and the
same query can be built in memory or translated to SQL depending on whether it stands on
`IEnumerable<T>` or `IQueryable<T>`.
