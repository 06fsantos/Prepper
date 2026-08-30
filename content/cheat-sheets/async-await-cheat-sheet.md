---
id: 01M19J52DF1H1VZJ7663P0M7R5
title: async/await — cheat sheet
topic: async-await
---

**The one fact everything else hangs off:** the compiler emits the state machine as a **struct**
on the stack, and it is promoted to the heap only when the method **actually suspends**. Writing
`await` costs nothing; taking a suspension costs one object — and on modern .NET that object *is*
the returned `Task`, not a second allocation beside it.

- `await` compiles to `if (!awaiter.IsCompleted) { suspend }`. Already complete → keep running
  inline, on this thread, allocating nothing.
- So the lever on async allocation is **how often the path suspends**, and only after that, what
  the method returns.

**A suspension captures two things, and they are not the same thing:**

- **`SynchronizationContext`** (or `TaskScheduler`) — *where* to resume. `ConfigureAwait(false)`
  declines this, and nothing else.
- **`ExecutionContext`** — the `AsyncLocal<T>` values, security, impersonation. Flows
  **regardless**; `ConfigureAwait(false)` does not touch it.

Capturing a context does not mean returning to the same *thread*. It means resuming through the
same *mechanism* — a UI message loop, a custom scheduler, or nothing at all. **ASP.NET Core
installs no context**, so the classic `.Result` deadlock does not occur there; WinForms, WPF and
classic ASP.NET do install one, which is where the folklore comes from. Blocking on a server is
still wrong, just for a different reason.

Use `ConfigureAwait(false)` in **library code that does not control its caller**. Reflexively
sprinkling it through an app is not a deadlock cure.

**`ValueTask<T>` sells the synchronous path and bills a contract.**

- A struct holding *either* a `T`, *or* a `Task<T>`, *or* an `IValueTaskSource<T>` plus a version
  token. It removes the fast path's allocation and changes the suspending path not at all.
- **Await it exactly once, before it goes out of scope.** Do not store it, pass it on, or await it
  twice. Need any of those? `.AsTask()` at the point of receipt, and pay the allocation on purpose.
- The rule is hard rather than conventional because the third shape's backing object is **reused**
  (`ManualResetValueTaskSourceCore<T>`, per socket, not per call — that is how `Socket.ReceiveAsync`
  allocates nothing even asynchronously). A stale token is not reading your old result; it is
  reading somebody's live one.
- **Return `Task<T>` from public API.** The saving is yours; the contract is the caller's.

**Composition: `WhenAll` and `WhenAny` are synchronisation points, and nothing else.**

- Concurrency comes from **calling**, not from composing — both operations must be started before
  either is awaited. A lazy `Select` passed to `WhenAll` has started nothing; materialise it.
- `WhenAll` waits for **all**, even after one has failed. Awaiting it re-throws only the **first**
  exception; the rest are on the composed task's `.Exception.Flatten()`.
- `WhenAny` reports the winner and **cancels nothing**. The losers run on, holding what they hold,
  and the winner may have won by throwing — check `IsFaulted` before the result.
- `WhenAny(work, Task.Delay(...))` times out *your waiting*, not the work. A timeout with teeth is
  a `CancellationToken` threaded into the operation.
- Cancellation is **threaded, never inherited**: no `WhenAll` overload reaches the children, and a
  failing child cancels no siblings.
- Partial failure across a fan-out is better modelled as **data** — catch inside each child so
  `WhenAll` returns a mixture instead of unwinding the batch.
- Large N wants a **bound** (`SemaphoreSlim`, a channel, `Parallel.ForEachAsync`), not a bigger
  `WhenAll`. `WhenAll` is not a scheduler.

The reach-for-it signals: a hot path whose awaits mostly complete synchronously → measure before
reaching for `ValueTask<T>`. A library awaiting anything → `ConfigureAwait(false)`. Independent
operations awaited one after another → start them both first.

Full treatment: [[the-async-state-machine]], then
[[capturing-a-synchronization-context]], [[valuetask-when-it-helps]] and
[[composing-tasks-whenall-and-whenany]].
