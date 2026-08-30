---
id: 01M19JK11ZQSWY187KQNGGC65A
title: Worker threads and I/O completions
topic:
  - dotnet-threadpool
prerequisites:
  - thread-pool-scheduling-and-starvation
---

"The thread pool" is a single name for two separate pools with separate jobs and separate limits,
and underneath the pool that people mean, work does not reach a thread through one queue. Both
facts explain things that otherwise look like magic: why a server handling thousands of concurrent
HTTP calls needs nothing like thousands of threads, and why a deeply recursive `Task.Run` fan-out
does not collapse under contention.

## Two pools, not one

```text
Worker threads:  run queued user delegates — Task continuations, Task.Run
                 callbacks, QueueUserWorkItem. This is the pool that hill
                 climbing sizes and that starvation detection watches.

I/O threads:     service completed overlapped I/O — socket and file
                 notifications arriving from the OS — and get the
                 continuation running. Configured separately, through the
                 second parameter of ThreadPool.SetMinThreads and
                 ThreadPool.SetMaxThreads.
```

`ThreadPool.SetMaxThreads(workerThreads, completionPortThreads)` takes two numbers because there
are two limits. Raising the worker count does nothing for I/O completion capacity, and vice versa
— a fact worth knowing mostly because it makes the "just call `SetMinThreads` higher" reflex even
less useful than it already was.

The name "completion port" is Windows' — an I/O completion port is an OS object — and the runtime
implements the same idea differently on other platforms. Treat the split as **a division of labour
between threads that wait for the OS and threads that run your delegates**, not as a promise about
which thread type runs which line of your code. That detail is implementation, it varies by
platform, and it has changed across runtime versions.

## Why async I/O scales past the worker count

Here is the part that matters. While an async I/O operation is **in flight**, it is not consuming
a worker thread. There is no thread parked inside `SendAsync` waiting for bytes. The request has
been handed to the OS, the state machine has suspended, and the only thing left behind is a
continuation registered to run when the completion arrives.

So the cost of a thousand concurrent outbound HTTP calls is a thousand suspended state machines —
objects on the heap — and *not* a thousand threads. Threads are needed only at the moments work
actually happens: dispatching each completion, and running each continuation. Those moments are
short and they are spread out.

This is the whole reason [[httpclient]] scales the way it does, and the reason the
[[thread-pool-scheduling-and-starvation|sync-over-async failure]] is as sharp as it is. The same
thousand calls made with `.Result` need a thousand worker threads, because each one has parked a
worker for the entire duration of the call. Same work, same I/O, and a difference in thread demand
of three orders of magnitude — bought purely by not blocking.

The corollary is the mistake in the other direction: wrapping a *synchronous* I/O call in
`Task.Run` does not make it async. It moves the blocking onto a pool thread instead of the calling
one. Nothing has been saved and a worker has been spent; the fix is the `*Async` overload, not a
different thread to block on.

```quiz 01M19JK11ZKQMHE3N1XCMH0WVB
A service shows flat throughput while CPU sits mostly idle, and its thread count keeps climbing.
Which of these would produce that?

- [x] Synchronous I/O calls wrapped in `Task.Run` rather than awaited
  > Each one parks a worker thread on a blocking wait, so threads grow and no CPU is used.
- [ ] Async I/O calls awaited normally throughout the request path
  > An in-flight async operation holds no worker thread, so the count would not climb.
- [ ] Too many I/O threads relative to the configured worker maximum
  > Completion dispatch is brief; an excess of those threads does not stall user work.
- [ ] CPU-bound work queued faster than hill climbing can add threads
  > That saturates the cores it does have. The symptom would be busy CPU, not idle.
```

## How a work item finds a thread

The obvious design for a pool is one global queue that every worker pulls from. That is half of
what the runtime does, and the half that would be a contention bottleneck on its own.

Each worker also gets a **local queue** of its own, held in its
`ThreadPoolWorkQueueThreadLocals`. When code running on a pool thread queues new work — the common
case for `Task.Run` inside a task, or a continuation scheduling more work — the item goes into
that thread's local queue rather than the global one. A worker looking for work checks:

1. **Its own local queue, LIFO** — most recently queued item first.
2. **The global queue, FIFO** — everything queued from outside the pool.
3. **Other threads' local queues**, by stealing from them.

The LIFO ordering of the local queue is a cache argument. Work a thread just queued is work whose
data that thread just touched, so running it next is likely to find that data still in cache.
Taking the *oldest* local item instead would systematically pick the coldest one.

**Work stealing** is what keeps the local queues from becoming private backlogs. A thread with
nothing of its own and an empty global queue takes an item from another thread's local queue
rather than idling next to someone else's pile. Between them, the local queue removes most of the
contention on the single global queue under fan-out, and stealing restores the load balancing that
the global queue was providing.

That combination is why a deeply recursive `Task.Run` tree — each level spawning children that
spawn children — scales well rather than serialising on one lock. The recursion is queueing almost
entirely into local queues, at the depth where the data is hot, and idle threads pull the excess
sideways.

```quiz 01M19JK11ZMMNBATHK9KD5DNZN cloze
A pool worker looks for its next item in three places, in order: its own local queue, serviced
{{LIFO}}; then the global queue, serviced {{FIFO}}; then, when both are empty, it {{steals}} from
another thread's local queue.
```

## Putting the two halves together

The two mechanisms answer different halves of "who runs this?".

The **two-pool split** says that waiting for the network does not need a thread of yours at all,
which is why concurrency in a server is bounded by memory and connections rather than by the
worker count. The **local queues and stealing** say that once a work item does exist, getting it
onto a thread costs almost no coordination, which is why fine-grained fan-out is viable in the
first place.

Both fail the same way, and it is worth naming: they only hold while nothing blocks. A worker
parked on a blocking wait is not servicing its local queue, is not available to steal, and is not
dispatching anything — and its local queue is now a backlog only a stealing thread can reach.

```quiz 01M19JK11ZKH6KVDR32ETNXSY4 recall
Explain why a server can hold ten thousand concurrent async HTTP calls with a worker pool sized in
the dozens, and what has to be true of the code for that to hold.

> An async operation that is in flight holds no worker thread. The request has been handed to the
> OS and the method has suspended, leaving a continuation registered against the eventual
> completion; the state machine sits on the heap, costing memory rather than a thread. Threads are
> needed only for the brief moments of real work — dispatching the completion and running each
> continuation — which are short and staggered across the ten thousand calls, so a few dozen
> workers absorb them comfortably. What has to be true is that nothing in the path blocks: one
> `.Result`, one `.Wait()`, or one synchronous call wrapped in `Task.Run` converts a suspension
> back into an occupied thread, and the scaling argument collapses to one thread per in-flight
> call.
```

## What to take away

**Waiting is free; running is what costs a thread.** The pool separates the threads that wait on
the OS from the threads that run your delegates, and it routes work to the latter through
per-thread local queues with stealing rather than through one contended global queue. Both designs
exist so that thread count tracks *work in progress* instead of *operations outstanding* — and
both are undone by any code that blocks a worker.

Worth reading in full: the pool's own implementation, in
[`PortableThreadPool.cs` and its
siblings](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/PortableThreadPool.cs)
in `dotnet/runtime` — with the same caveat that applies to anything read there: it is
implementation on a moving branch, not a documented contract, and
[Microsoft Learn's `ThreadPool` reference](https://learn.microsoft.com/en-us/dotnet/api/system.threading.threadpool)
documents the API surface without the mechanism. The files were read on `main` on 2026-08-30.
