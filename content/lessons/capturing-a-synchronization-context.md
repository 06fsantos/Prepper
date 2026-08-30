---
id: 01M195XCR2G9YHTBB59GZW9DPF
title: Synchronization context and ConfigureAwait(false)
topic:
  - async-await
prerequisites:
  - the-async-state-machine
---

When an `await` suspends, the continuation has to resume *somewhere*. The default
`TaskAwaiter` decides where by capturing two ambient things at the moment of suspension:

- **`SynchronizationContext.Current`**, if it is non-null — the continuation is then scheduled
  back onto it via `SynchronizationContext.Post`;
- **`TaskScheduler.Current`**, used instead when there is no synchronization context but a
  non-default scheduler is active.

A `SynchronizationContext` is an abstraction over "how do I run a delegate *here*". WinForms and
WPF install one that marshals the callback onto the UI thread's message loop. Classic ASP.NET
installed one that preserved request state. When none has been installed — console apps, worker
services, and **ASP.NET Core** — the base implementation's `Post` just calls
`ThreadPool.QueueUserWorkItem`, and the continuation resumes on whichever pool thread picks
it up.

So "capturing the context" does not mean "returning to the same thread". It means **resuming
through the same mechanism**: a message loop, a custom scheduler, or — in most modern server and
console code — nothing in particular, in which case any pool thread will do.

```quiz 01M195XCR27BBKHEP2SBRHQ9D0
A console app with no `SynchronizationContext` installed awaits a network call that suspends.
Where does the continuation resume?

- [x] On whichever thread-pool thread dequeues it
  > With no context installed, the default `Post` is a queue onto the thread pool.
- [ ] On the same thread that started the method
  > Nothing preserves thread identity here; there is no mechanism asking for it.
- [ ] On a thread dedicated to running continuations
  > No such thread exists. Continuations are ordinary thread-pool work items.
- [ ] On the thread that completed the awaited work
  > That thread queues the continuation rather than running it inline by default.
```

## What `ConfigureAwait(false)` actually changes

`ConfigureAwait(false)` sets one internal flag: `continueOnCapturedContext = false`. The awaiter
still reaches the suspension point the same way; it simply **skips capturing** the context and
scheduler, so the continuation runs wherever the antecedent's completion callback happens to run
— typically a pool thread — with no `Post` hop back.

That is the entire effect. It creates and destroys no thread affinity, adds and removes no
allocation, and does **nothing at all** when the awaited operation is already complete, because
then there is no continuation to schedule anywhere.

It also does not touch `ExecutionContext`, which flows across a suspension regardless. That is a
separate mechanism with a separate cost, and the two get conflated constantly — enough that it is
worth its own section below.

```quiz 01M195XCR36TJE4HN7H9KP8AJK cloze
`ConfigureAwait(false)` changes one thing about a suspending await: it skips capturing the
{{synchronization context}}. It has no effect when the awaited operation is already
{{complete}}, because in that case the method never suspends at all.
```

## The deadlock, and where it still lives

The canonical failure is blocking synchronously on an async method from a thread that owns a
context:

```csharp
// on a UI thread, which has a SynchronizationContext
void Button_Click(object sender, EventArgs e)
{
    var result = GetValueAsync().Result;   // blocks the UI thread
}

async Task<int> GetValueAsync()
{
    await Task.Delay(1000);                // captures the UI context
    return 42;                             // this continuation needs the UI thread
}
```

`.Result` blocks the UI thread. The continuation after `Task.Delay` was posted back to that same
UI context, which cannot run it, because the thread it needs is the one blocking. Neither side
moves.

The modern caveat matters as much as the example, because interviews probe it: **ASP.NET Core
has no `SynchronizationContext`.** `SynchronizationContext.Current` is null on request threads,
continuations resume on the thread pool, and this particular deadlock does not occur. WinForms
and WPF still have one, and so this is still live in desktop code. Classic ASP.NET had one, and
that is where most of the folklore was written.

That does not make blocking safe on ASP.NET Core — it makes it fail
[[thread-pool-scheduling-and-starvation|a different way]], which is worth keeping separate in your
head from the deadlock.

The guidance in [Stephen Toub's ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
is to use `ConfigureAwait(false)` in **general-purpose library code**, which does not know what
context called it, rather than reflexively in application code, which often specifically wants
the captured context in order to touch UI elements or request state afterwards. Read the
library-versus-app line as *skip the capture when you do not control the caller* — a NuGet
package can always be called from a WPF app — and not as *deadlocks are everywhere*.

```quiz 01M195XCR37RHENTX13XT7P0JS recall
Someone proposes adding `ConfigureAwait(false)` throughout an ASP.NET Core service "to prevent
deadlocks". What is wrong with the reasoning, and what is the honest case for the change?

> ASP.NET Core installs no `SynchronizationContext`, so there is nothing to capture and no
> context-based deadlock to prevent — the stated reason does not apply. The honest case is
> smaller: skipping the capture avoids a little per-suspension work, and it is genuinely
> required for reusable library code that might be called from a host that *does* install a
> context, such as a WPF app. It also would not have solved the real hazard of blocking on
> async work in a server, which is thread-pool starvation rather than a deadlock cycle.
```

## The other thing a suspension carries: `ExecutionContext`

Every suspension flows the current `ExecutionContext` to the continuation, via
`ExecutionContext.Capture`/`Run`. That is what carries `AsyncLocal<T>` values — and security and
impersonation context — across an `await`, so that ambient data set before the suspension is still
ambient after it.

It is also a real, measurable cost per suspension when `AsyncLocal` values are actually set, which
is why high-throughput logging scopes are a known hot-path expense: `ILogger.BeginScope` is backed
by `AsyncLocal`.

The part worth committing to memory is that **`ConfigureAwait(false)` does not eliminate this.**
It skips the synchronization context and the task scheduler. `ExecutionContext` flows regardless.

Awaiters expose two completion hooks for this reason — `INotifyCompletion.OnCompleted`, which
flows the context, and `ICriticalNotifyCompletion.UnsafeOnCompleted`, which skips the flow and is
cheaper. The compiler picks the unsafe variant on its own when it can prove no ambient context
needs to cross the `await`, which is one more reason that scattering `ConfigureAwait(false)`
everywhere is not the free win it is sometimes sold as: most of the context handling is already
being done for you.

```quiz 01M196BENK56J0EEDCE17S66W6
Which of these does `ConfigureAwait(false)` stop from crossing an `await`?

- [x] The synchronization context, and nothing else ambient
  > It clears one flag. `ExecutionContext`, and the `AsyncLocal` values in it, still flow.
- [ ] The execution context, so `AsyncLocal` values are dropped
  > That flow is unconditional. Dropping it is what `UnsafeOnCompleted` is for, not this.
- [ ] Both contexts, which is where the saving comes from
  > Only one of the two is optional, and it is not the one carrying ambient data.
- [ ] Nothing — it is a hint the runtime is free to ignore
  > It sets `continueOnCapturedContext` to false, which the awaiter honours every time.
```

## What to take away

**A suspension captures a mechanism for resuming, and `ConfigureAwait(false)` declines it.**
Everything else — which thread you land on, whether you deadlock, whether it matters at all —
follows from what mechanism happened to be installed where the method suspended.

Worth reading in full: the
[ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/). It is written as
a list of the misconceptions this topic attracts, which is the fastest way to find out which of
them you hold.
