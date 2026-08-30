---
id: 01M19JK11ZE8A9RWKZ6TBDFD5S
title: The .NET thread pool — cheat sheet
topic: dotnet-threadpool
---

**The one fact everything hangs off:** an async operation **in flight holds no thread**. A blocked
one holds a worker for the whole operation. Every thread-pool failure worth the name is that
difference, multiplied by concurrency.

**The pool sizes itself two ways.**

- **Hill climbing** — a control loop that samples throughput, perturbs the thread count in a small
  square wave, and uses frequency analysis to tell "throughput moved because of my threads" from
  "throughput moved because the load did". Deliberately gradual: an instant reaction to a noisy
  signal would thrash.
- **Forced change** — bypasses the loop. The **gate thread** injects a thread on **starvation**
  (queued work, nothing dequeued in time); an idle **worker timing out** drops the count. Same
  mechanism, both directions.
- Injection is **gradual and not instant**, and every new thread costs an OS stack. Depending on it
  in steady state is the diagnosis, not the fix.

**All of that is implementation, not contract.** It lives in `dotnet/runtime`'s
`PortableThreadPool*.cs`; Microsoft Learn's `ThreadPool` reference does not document the algorithm.
Every tuning constant is an `AppContext`-overridable default on a moving branch. Learn the shape,
never a number.

**Two pools, two limits.** Worker threads run your delegates — continuations, `Task.Run`,
`QueueUserWorkItem` — and are what hill climbing sizes. A separate set services OS I/O
completions, configured through the *second* argument of `SetMinThreads`/`SetMaxThreads`. Raising
one does nothing for the other.

**Work reaches a worker through three places, in order:** its own **local queue, LIFO** (cache-hot,
and where work queued *from* a pool thread lands); the **global queue, FIFO**; then **stealing**
from another thread's local queue. That is why fine-grained, deeply recursive `Task.Run` fan-out
scales instead of serialising on one lock.

**Blocking on a task has two failure modes — do not conflate them.**

|                | Deadlock                                    | Starvation                                     |
| -------------- | ------------------------------------------- | ---------------------------------------------- |
| Needs          | a `SynchronizationContext` (WinForms, WPF, classic ASP.NET) | nothing; universal, ASP.NET Core included |
| Cause          | a cycle — the continuation needs the blocked thread | wasted threads — no cycle, just lost throughput |
| Looks like     | queue climbing, CPU idle, timeouts in clusters | fine at low load, sharp cliff past a concurrency threshold |

One fix for both: **async all the way**. Never block on a task from a thread that may be needed to
complete it.

**Three reflexes to distrust:**

- `Task.Run` around a *synchronous* I/O call — moves the blocking onto a pool thread and saves
  nothing. Use the `*Async` overload.
- Raising `SetMinThreads` to cure a latency cliff — buys ready threads to waste, and leaves the
  blocking call in place.
- "ASP.NET Core can't deadlock, so `.Result` is fine here" — true premise, wrong conclusion.

The reach-for-it signal: latency that is fine below some concurrency and falls off a cliff above
it, with the thread count stepping up while CPU stays idle. Look for a blocking wait in the request
path before looking at capacity.

Full treatment: [[thread-pool-scheduling-and-starvation]] and
[[worker-threads-and-io-completion]]. Symptom-to-cause lookup:
[[diagnosing-thread-pool-symptoms]].
