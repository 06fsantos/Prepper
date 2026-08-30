---
id: 01M19JW2EMPJ6Q7C8799RWMCAE
title: Concurrency primitives — cheat sheet
topic: concurrency-primitives
---

**The one question that picks the primitive: am I *waiting*, or am I *working*?** Waiting is
`async`/`await`. Working is `Task.Run`, or a `Thread` if the work owns its thread for a
lifetime. Two stages at different speeds is `Channel<T>`. One piece of state touched by many
threads is `lock`. Everything below is a consequence.

- **`async`/`await` is suspension, not parallelism.** It frees the thread during the wait and
  starts nothing extra. One awaited call is no faster than the blocking version; a thousand of
  them are, because they do not need a thousand threads.
- **`Task.Run` is parallelism bounded by the pool**, which grows its worker count slowly and by
  experiment. Fine for a handful of CPU-bound items; wrong as a per-item pipeline.
- **`Thread` is a resource you count.** Its stack defaults to ~1 MB reserved on x64
  (configurable, platform-dependent). One per work item is a memory failure, not a slow one.
  Work too long-lived for a pooled worker → `TaskCreationOptions.LongRunning`, a *hint* that
  gets it a dedicated thread.
- **`Channel<T>` decouples, and the bound is the point.** A bounded channel suspends the writer
  when full and the reader when empty — neither blocks a thread. An unbounded `Queue<T>` hides
  the same mismatch until it becomes an out-of-memory far from its cause.
- **`lock` buys safety by serialising.** No per-operation allocation; the cost is that the
  critical section runs one at a time and a waiting thread does none of your work.

**The two mistakes that are actually asked about:**

- `await Task.Run(() => SomeIoMethod())` — a pool thread parked on blocking I/O *and* an
  awaited task. `Task.Run` around a blocking API never makes it asynchronous; it only **moves
  the block to another thread**, which is worth something off a UI thread and nearly nothing on
  a server.
- **A `lock` held across I/O.** The critical section is now a network round trip long, and you
  cannot fix it by going async — a `lock` is thread-affine and `await` inside one does not
  compile.

**`async void` cannot be awaited and cannot be caught.** A `try`/`catch` at the call site covers
only what runs before the first suspension. After that the exception is raised on the
`SynchronizationContext` captured when the method started — the message loop on a UI framework,
and nothing at all where there is no context, which takes the process down. The only legitimate
use is a UI event handler whose signature the framework fixed. Everywhere else, `async Task`.

The reach-for-it signals: a thread doing nothing but waiting → async. A thread doing nothing but
waiting *for a lock* → shorten the critical section or stop sharing the state. A queue that only
ever grows → bound it. `new Thread` inside a loop → you wanted the pool.

Full treatment: [[concurrency-primitives-compared]]. The side-by-side selection tables —
including the async-safe alternatives to `lock` — are [[choosing-a-concurrency-primitive]].
