---
id: 01M19JK11XBC0FJ5XTFS1QA4WN
title: Thread pool scheduling and starvation
topic:
  - dotnet-threadpool
prerequisites:
  - the-async-state-machine
  - capturing-a-synchronization-context
---

A continuation has to be run by *someone*, and that someone is almost always a thread-pool
worker. So the interesting question about the pool is not what it does with a work item — it
dequeues it and runs it — but **how many threads it keeps around to do that**, and what happens
when the answer is "not enough".

The pool changes its worker count two ways, and they answer different questions:

- **Hill climbing** — a continuous, throughput-driven control loop that nudges the count up or
  down while the pool is busy. It asks *given the current load, is more parallelism helping or
  hurting?*
- **Forced changes** — an immediate, bypass-the-loop reaction to two specific signals:
  **starvation** (work is queued and nothing has picked it up in time) and **thread timeout** (a
  worker has been idle long enough to retire). These ask *is something already going wrong right
  now?*

Most people carry the mental model "the pool adds a thread when it is busy". The accurate one is
that thread count is a parameter the runtime tunes by experiment, deliberately cautiously, with a
separate emergency path bolted on for the case where caution is the wrong answer.

## Where these facts come from, and how long they will hold

Everything in the next three sections is read out of the .NET runtime's **implementation**, not
out of its documentation. [Microsoft Learn's `ThreadPool` API
reference](https://learn.microsoft.com/en-us/dotnet/api/system.threading.threadpool) describes the
pool's behaviour at a high level and **does not document the injection algorithm at all** — no
hill climbing, no gate thread, no forced change. The algorithm lives in
[`PortableThreadPool.HillClimbing.cs`](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/PortableThreadPool.HillClimbing.cs),
with the surrounding machinery in `PortableThreadPool.cs`, `PortableThreadPool.GateThread.cs` and
`PortableThreadPool.WorkerThread.cs`.

That has two consequences worth holding while you read on.

**This describes `dotnet/runtime` as read on the `main` branch on 2026-08-30.** The citation is a
moving target: `main` is a branch, not a version, so the file behind that URL is free to say
something else tomorrow, and no permalinked commit is quoted here. If you need to know what a
specific runtime does, read the file on that runtime's release branch.

**Every constant below is a configurable default, not a contract.** The tuning values — sample
interval, wave period, gain exponent, maximum change per sample, target signal-to-noise ratio —
are overridable through `AppContext` switches, and the runtime is free to change the defaults in
any release without breaking anything it promised. Know the *shape* of the algorithm, which has
been stable for years and is what an interview is actually asking about. Do not build a system, or
a memorised number, on the constants.

## Hill climbing: thread count as a knob tuned by experiment

The name is literal. The algorithm treats "how many threads should be active" as a parameter it
climbs toward a local maximum, the way any optimiser does — by making a small change and observing
whether it helped.

`HillClimbing.Update`, which the pool calls on an interval, does roughly this:

- Samples **throughput** — work items completed per second — alongside the current thread count,
  on a rolling basis.
- Deliberately **perturbs** the thread count in a small square wave: add a few threads, take them
  away, repeatedly. This is a controlled experiment, not noise.
- Runs a **Goertzel algorithm** over the throughput signal — a frequency-domain technique that
  measures the amplitude of one specific frequency in a signal — to find out how strongly
  throughput responded *at the frequency of the wave it just injected*. That is what separates
  "throughput moved because of my threads" from "throughput moved because the load changed".
- Applies a non-linear gain and a **confidence factor** derived from how noisy the signal was, to
  decide how big a move to make. Weak or noisy signal, cautious step; strong and consistent
  signal, bigger step.
- Clamps the result between the pool's configured minimum and maximum thread counts.

The defaults at the time of reading put the wave period at four samples and the gain exponent at
2.0 — quoted to show the shape of the thing, and subject to the caveat above.

This is *why* a sudden flood of CPU-bound work ramps up gradually rather than instantly claiming
every core. The pool is not being slow by accident: reacting instantly to a noisy throughput
signal would make it thrash between thread counts, and a control loop that oscillates is worse
than one that lags.

```quiz 01M19JK11ZD3HKGM7KZSMKWY9R
A burst of short CPU-bound work items floods an idle pool. Why does effective parallelism ramp up
over time instead of arriving at once?

- [x] Hill climbing samples throughput and perturbs the count cautiously
  > It is a control loop deciding whether the last change helped, not a reaction to queue depth.
- [ ] The pool waits until the configured minimum count is reached
  > The minimum is a floor the pool starts from, not a gate it has to climb through first.
- [ ] The frequency analysis suspends injection until a collection runs
  > The Goertzel step measures a signal. It blocks nothing and knows nothing about the heap.
- [ ] Each work item must complete before the next thread is allowed
  > Queued items run concurrently on whatever threads exist; nothing serialises them.
```

## Starvation: when gradual is the wrong speed

Hill climbing is right for steady-state tuning and far too slow for an emergency. The emergency is
**starvation**: work items are sitting in the queue and no thread is picking them up, almost
always because every existing worker is itself blocked — on synchronous I/O, on a lock, or on a
blocking wait for a `Task`.

A dedicated **gate thread** watches for exactly this. When enough time has passed since the last
work item was dequeued while items are still waiting — the runtime's own
`SufficientDelaySinceLastDequeue` check — it calls `ForceChange` on the hill climber directly,
tagged as a `Starvation` transition, which bypasses the sampling loop and injects a thread now.

Two things about that reaction matter more than the mechanism:

- **It is not instant.** The gate thread runs on its own schedule and injection is gradual — one
  thread at a time, not a batch sized to the queue. From outside, that reads as a latency cliff
  that persists for a while and then slowly heals, rather than a blip.
- **New threads are not free.** Each one needs a stack allocated by the OS, so the recovery you
  are waiting on is also work you are paying for.

Starvation-triggered injection is a **safety net, not a performance feature**. A service whose
steady-state throughput depends on the gate thread firing has not found a capacity problem to
solve with `SetMinThreads`; it has a blocking call somewhere in its request path.

```quiz 01M19JK11ZMFXQYNT9BA851GP0 cloze
The pool changes its worker count two ways. The gradual one is a control loop that samples
{{throughput}} and adjusts. The immediate one is a forced change, triggered either when the gate
thread sees {{starvation}} — queued work nobody has dequeued in time — or when an idle worker
{{times out}}, which moves the count in the other direction.
```

## Thread timeout: shrinking back down

Growth is only half of it. A worker that has gone long enough without picking up work decides on
its own to exit — `WorkerThread.ShouldExitWorker()` — and that path *also* calls `ForceChange`,
this time tagged `ThreadTimedOut`, dropping the tracked count immediately rather than waiting for
hill climbing's next sample.

So `ForceChange` is not "the starvation mechanism". It is the general bypass: **an immediate,
skip-the-sampling correction whenever the pool learns something the slow loop would take too long
to notice.** Starvation is the case where that means *add*; an idle timeout is the case where it
means *remove*, keeping a burst's worth of threads from lingering and holding OS resources after
the burst is over.

```quiz 01M19JK11Z1V9M4JYA2RTEP4DG
What does `ForceChange` represent in the pool's design?

- [x] An immediate correction that skips the sampling loop entirely
  > Both callers — starvation and an idle worker retiring — need a change before the next sample.
- [ ] A permanent switch that turns the hill-climbing loop off
  > Disabling the loop is a separate configuration switch, and it is a diagnostic tool.
- [ ] A configuration value applied once when the process starts
  > It is called at runtime, repeatedly, by threads reacting to what they just observed.
- [ ] The mechanism that raises the pool's configured maximum count
  > It moves the current count within the configured bounds and never changes them.
```

## Turning it off, to find out whether it is the problem

The hill-climbing loop can be disabled outright with the
`System.Threading.ThreadPool.HillClimbing.Disable` configuration switch. That is a **diagnostic**,
not a production setting: it exists so you can isolate whether an observed threading problem is
caused by the injection algorithm's pacing or simply by more work than the pool has threads for.
If behaviour is identical with the loop disabled, the algorithm was never the story.

Reach for it while investigating, and take it back out afterwards.

## Blocking on a task costs you the pool

Which brings us to the reason any of this is worth knowing. Calling `.Result` or `.Wait()` on a
task has **two distinct failure modes**, and they are constantly conflated — including in
interviews, which is usually where the question is actually aimed.

**The deadlock** is the famous one, and it is narrow. It needs a `SynchronizationContext` that
runs continuations on one specific thread: a WinForms or WPF UI thread, or classic ASP.NET's
request context. The blocking thread is the thread the continuation was posted back to, so neither
side can move. Its signature is distinctive: queue length climbs, CPU sits idle, and requests time
out **in clusters** rather than randomly. That mechanism is
[[capturing-a-synchronization-context|a story about what a suspension captured]], and **ASP.NET
Core installs no context at all**, so it does not happen there.

**The starvation** is the universal one, and it is the reason the deadlock's absence buys you
nothing. Blocking a worker thread on async work means that thread sits there, doing nothing, for
the entire duration of the operation, unable to serve anything else. There is no cycle and nothing
is stuck — you have simply thrown a thread away for the length of an I/O call. Under load that
drains the pool faster than the gate thread refills it, and the result is a latency cliff that
arrives past some concurrency threshold and was invisible below it.

Deadlock is a **liveness** failure; starvation is a **throughput** failure. They are diagnosed
differently:

- The deadlock shows up as threads blocked in a wait with your own code on the stack *and* a
  context in the picture, with the queue growing and the CPU idle.
- Starvation shows up in the same dump as blocked threads, but the tell is the pool itself:
  queue length climbing while the thread count is stepping up, under load, on a host with no
  synchronization context to deadlock against.

Both have one fix, and it is not a bigger pool: **async all the way**. Never block on a task from
a thread that might be needed to complete it, and thread `await` up the call stack until it
reaches something that is genuinely allowed to block — `Main`, a message loop, a test.

```quiz 01M19JK11ZY90WCFWD9A119HTN recall
An ASP.NET Core service calls `.Result` on an HTTP call in its request path. A colleague says this
is safe because ASP.NET Core cannot deadlock. Reconstruct what actually happens under load, and
why it is a thread-pool problem rather than a correctness one.

> They are right about the deadlock and wrong about the consequence. ASP.NET Core installs no
> `SynchronizationContext`, so there is no continuation waiting on the blocked thread and no
> cycle. What happens instead is that each blocked request holds a worker thread for the entire
> duration of the HTTP call while doing no work at all. At low concurrency there are spare
> threads and nothing shows. Past some concurrency threshold the pool runs out of ready workers,
> queued work — including the continuations that would finish the in-flight requests — sits
> waiting, and the gate thread starts force-injecting threads one at a time. That injection is
> gradual and each thread costs a stack, so latency degrades sharply and recovers slowly. Nothing
> is incorrect; throughput has simply collapsed, which is why it looks like a capacity problem and
> is not one.
```

## What to take away

**The pool's size is an experiment, and blocking a pool thread sabotages it.** Hill climbing tunes
the count slowly and on purpose; the gate thread's forced injection is the emergency path, gradual
in its own right and never something to rely on in steady state. Every blocking wait you write
takes a worker out of circulation for the length of an operation the worker was not needed for.

Worth reading in full: Stephen Toub's [ConfigureAwait
FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/) for the blocking half, and — if you
want the pool's own logic rather than a description of it — a skim of
[`PortableThreadPool.HillClimbing.cs`](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/PortableThreadPool.HillClimbing.cs)
itself, with the caveat above about which branch you are reading.

Which threads exist in the first place, and how a work item reaches one, is
[[worker-threads-and-io-completion]]. What each symptom above looks like from the outside, with
the counter to check, is [[diagnosing-thread-pool-symptoms]].
