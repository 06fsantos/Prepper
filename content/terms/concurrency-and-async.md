---
id: 01M1H08C6FV2RH4GEBTYYANMAK
title: Concurrency & Async in .NET
---

Doing more than one thing at a time without corrupting shared state or starving a thread. The
topics filed here run from the `async`/`await` model a request handler is written in, through the
thread pool that schedules the work, to the primitives that guard what two threads touch and the
allocation behaviour that decides how much the runtime has to collect.
