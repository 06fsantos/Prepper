---
id: 01M195VTHXF90VHPTZ82QS1KX0
title: async/await
topic:
  - concurrency-and-async
---

The compiler transform underneath every `async` method in C#, and what it costs: a state
machine that stays on the stack until the method actually suspends, and a suspension that
captures a context, allocates, and hands the rest of the method to whoever completes the
awaited work.
