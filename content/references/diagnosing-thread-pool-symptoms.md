---
id: 01M19M3YPXHCZMJ2M321ST5CX1
title: Diagnosing thread pool symptoms
topic:
  - dotnet-threadpool
  - async-await
---

You have a latency complaint and a running process. This is the symptom-first lookup: what the
shape of the problem suggests, and which number to go and read before believing it. The
mechanism behind every row is [[thread-pool-scheduling-and-starvation]].

## Symptom to cause

| What you are seeing | Most likely cause | Where to look |
|---|---|---|
| A latency *cliff* under load, with the thread count stepping up rather than jumping | The pool is being force-fed threads because work is queueing — injection is gradual and the gate thread's reaction is not instant | `threadpool-thread-count` and `threadpool-queue-length`, over time rather than at one moment |
| Fine at low load, sharp degradation past some concurrency threshold | Sync-over-async — `.Result` or `.Wait()` holding workers that should be running continuations | A process dump: threads blocked in `Task.Wait`/`Monitor.Wait` with your own code on the stack |
| CPU nearly idle, throughput flat, queue growing | Threads are blocked, not busy. Often I/O wrapped in `Task.Run`, which parks a worker on synchronous I/O | Search for `Task.Run` around a call that has an `*Async` overload |
| Requests timing out **in clusters**, queue climbing, CPU idle | The classic deadlock — needs a `SynchronizationContext`, so WinForms, WPF or classic ASP.NET, never ASP.NET Core | The blocked thread *and* what posted the continuation back to it |
| Allocation rate and GC pause time climbing alongside the latency | Not the pool. A different problem wearing the same symptom | `alloc-rate`, `time-in-gc` — see [[allocation-profiling-in-practice]] |

The last row is there because it is the one misdiagnosis that wastes a whole afternoon: a
starved pool and a thrashing heap both present as *latency got worse under load*, and the fix
for one does nothing for the other.

## Deadlock or starvation — they are not the same failure

Both come from blocking on a task, and interviews conflate them constantly.

| | Deadlock | Starvation |
|---|---|---|
| Needs | a `SynchronizationContext` — WinForms, WPF, classic ASP.NET | nothing; universal, ASP.NET Core included |
| The failure | a cycle: the continuation needs the thread that is waiting for it | wasted throughput: a worker sits idle for the length of an I/O call |
| Kind | **liveness** — it will never finish | **throughput** — everything finishes, slowly |
| Tell | timeouts in clusters, queue climbing, CPU idle | fine below a concurrency threshold, a cliff above it |

Why a context is the precondition for one and not the other is
[[capturing-a-synchronization-context]]. Both have the same fix, and it is not a bigger pool:
**async all the way** — never block on a task from a thread that might be needed to complete
it.

## What to run

```sh
dotnet-counters monitor -p <pid> --counters System.Runtime
```

| Counter | Reads as |
|---|---|
| `threadpool-thread-count` | how many workers exist right now |
| `threadpool-queue-length` | work with nobody running it — the starvation signal |
| `threadpool-completed-items-count` | throughput, which is the thing hill climbing is trying to maximise |
| `time-in-gc`, `alloc-rate` | whether you are in the wrong document |

Counter names are the tool's surface and are versioned like any other surface: confirm them
against `dotnet-counters list` on the runtime in front of you. Counters first for triage, a
`dotnet-trace` capture second once you know where to look — see
[[allocation-profiling-in-practice]] for the capture half.

For the dump, the thing to establish is **why** a thread is not running: blocked in a wait with
your code on the stack is sync-over-async; blocked in a wait with a message loop or a request
context in the picture is the deadlock; not blocked at all, and merely absent, means the pool
has not grown to meet the queue yet.

## Two conclusions to distrust

- **"Raise `SetMinThreads`."** It buys ready threads for the blocking call to waste, and the
  blocking call is still there. It is a legitimate stopgap during an incident and never the
  finding.
- **"The pool is coping — injection is keeping up."** Steady-state throughput that depends on
  the *starvation-avoidance* path is itself the diagnosis. That path is the emergency one;
  needing it routinely means something in the request path is blocking, not that the pool is
  undersized.

`ThreadPool.ThreadCount`, `PendingWorkItemCount` and `CompletedWorkItemCount` expose the same
three numbers in-process, which is what to log when the incident is not reproducible under a
profiler. The blocking half is covered precisely in Stephen Toub's
[ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/); the injection
behaviour is implementation rather than contract, and lives in
[`dotnet/runtime`](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/PortableThreadPool.HillClimbing.cs)
with the caveats [[thread-pool-scheduling-and-starvation|that Lesson records]].
