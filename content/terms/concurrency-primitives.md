---
id: 01M195VTJ2ZYPJYNY580CT4CR0
title: Concurrency primitives
topic:
  - concurrency-and-async
---

`async`/`await`, `Task.Run`, `Thread`, `Channel<T>`, `lock` and the async-safe locks — and the
question of which one a piece of work wants. Each answers a different structural question about
the code, so choosing wrongly costs more than throughput.
