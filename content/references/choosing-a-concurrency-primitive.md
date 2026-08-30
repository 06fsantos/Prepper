---
id: 01M19M3YPV2VFBFYKCE1KDRG31
title: Choosing a concurrency primitive
topic:
  - concurrency-primitives
  - async-await
---

Which primitive answers which structural question, what each one costs, and which of them can
be held across an `await`. The primitives are not alternatives to one another — a real pipeline
uses several at once — so read this as *what is this one for*, not *pick one*.

How each one works, and where it stops working, is [[concurrency-primitives-compared]].

## The five, at a glance

| Primitive | The question it answers | What it costs | Reach for it when |
|---|---|---|---|
| `async`/`await` | *I am waiting; how do I not occupy a thread?* | A task and a state machine, allocated only if the call actually suspends | I/O — network, disk, database, timers |
| `Task.Run` | *I am working; how do I get off this thread?* | A task, plus a pool worker for the duration | One-off CPU-bound work, or breaking a sync chain |
| `Thread` | *How do I get a thread of my own?* | ~1 MB of reserved stack, for the thread's whole life | A small fixed set of long-lived loops |
| `Channel<T>` | *My two stages run at different speeds* | One buffered item per queued item, bounded by you | Producer/consumer pipelines that need backpressure |
| `lock` | *Many threads touch one piece of state* | Nothing per operation; serialisation is the cost | Short, in-process, CPU-cheap critical sections |

The progression is worth having in one line: **`async`/`await` is suspension, `Task.Run` is
parallelism on demand, `Thread` is dedicated parallelism, `Channel<T>` is decoupled parallelism
with backpressure, and `lock` is sharing without parallelism at all.**

Only the middle three are about *doing more at once*. Asking `async`/`await` for parallelism, or
`Task.Run` for scale, is how most of the confusion starts.

## The decision tree

Work down it in order. The first *yes* is the answer.

1. **Is it I/O-bound?** Network, disk, database, a timer, a remote service.
   → **`async`/`await`.** The thread is free during the wait, so concurrency is bounded by the
   remote side rather than by how many threads you have.
2. **Is it CPU-bound, and do you need it off this thread?**
   - One-off work → **`Task.Run`.** Bounded by cores, and by how fast the pool grows.
   - A long-lived loop that owns its thread → **`Thread`**, or `Task.Factory.StartNew` with
     `TaskCreationOptions.LongRunning`.
   - A stream of items with producers and consumers → **`Channel<T>`**, so the bound is
     explicit.
3. **Does concurrent code share mutable state?**
   → **`lock`**, or one of the alternatives below when the critical section has to survive an
   `await`.
4. **None of the above?** You may not need concurrency here. Sequential code that is fast
   enough is not a design failure.

## Mutual exclusion: what survives an `await`

This is the table to have cold, because "make the method async" turns a working `lock` into
code that does not compile, and the substitution is not obvious.

| Primitive | Use when | Async-safe? | Notes |
|---|---|---|---|
| `lock` (`Monitor`) | Short, in-process, CPU-cheap critical sections | **No** — you cannot `await` inside one | Thread-affine and reentrant per thread |
| `SemaphoreSlim` | The same job, but the section spans an `await`; or bounding concurrency to *N* | **Yes**, via `WaitAsync` | The standard async-lock substitute. Not reentrant |
| `Mutex` | Mutual exclusion *across processes* (a named mutex) | **No** | Heavier than `lock`; rarely what you want in-process |
| `ReaderWriterLockSlim` | Reads vastly outnumber writes and may run concurrently | **No** | Watch for writer starvation; no async variant |
| `Interlocked` | One variable, atomically — a counter, a flag, a compare-and-swap | Lock-free, so the question does not arise | The cheapest option when the critical section is one field |
| `ConcurrentDictionary` and friends | A collection shared across threads | **Yes** | Internally striped locking; compound operations still need care |
| `Channel<T>` | Producer/consumer with backpressure | **Yes** | Preferred over a hand-rolled queue plus lock plus signal |

**`lock` and `SemaphoreSlim` are not interchangeable in both directions.** `lock` is reentrant
— the thread already holding it can take it again — and `SemaphoreSlim` is not, so a recursive
path that was fine under `lock` deadlocks against itself once converted.

## Work too long for a pooled thread

```csharp
Task.Factory.StartNew(
    () => CpuBoundWork(),
    CancellationToken.None,
    TaskCreationOptions.LongRunning,
    TaskScheduler.Default);
```

`LongRunning` is a **hint** to the scheduler that this work should not occupy a pooled worker;
the default scheduler answers it with a dedicated thread. It is worth reaching for when work
will hold a thread for a long time, because a handful of such items look to the pool exactly
like [[thread-pool-scheduling-and-starvation|work arriving faster than it can be served]], and
the pool responds by injecting threads that unrelated short-lived work did not need.

## Three that cost people points

- **`await Task.Run(() => SomeIoMethod())`.** A pool worker is parked on blocking I/O for the
  whole call *and* a task is allocated to await it. `Task.Run` never makes an API
  asynchronous; it only moves the block onto another thread — worth something off a UI thread,
  nearly nothing on a server. Call the `*Async` overload.
- **A `lock` held across I/O.** The critical section becomes as long as a network round trip,
  and you cannot rescue it by making the method async, because `await` inside a `lock` does not
  compile. `SemaphoreSlim.WaitAsync` is the substitution.
- **`async void`.** The caller cannot await it, so it cannot observe completion, and a
  `try`/`catch` at the call site catches only what ran before the first suspension. After that,
  the exception is raised on the `SynchronizationContext`
  [[capturing-a-synchronization-context|captured when the method started]] — and where there is
  no context, it takes the process down. The one legitimate use is an event handler whose
  signature the framework fixed. Everywhere else, `async Task`.

Composition rules for the tasks these produce — how failures aggregate, and what `WhenAny`
leaves running — are [[composing-tasks-whenall-and-whenany]].

The model these all sit in is documented in
[Asynchronous programming (C# docs)](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/),
and what an `await` actually compiles to is
[How Async/Await Really Works in C#](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/).
