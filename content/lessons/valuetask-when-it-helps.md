---
id: 01M19J52DBHEPZDMNTGFM9K8CV
title: ValueTask buys back the synchronous path, and charges a contract for it
topic:
  - async-await
prerequisites:
  - the-async-state-machine
---

`ValueTask<T>` is a struct that holds **either** a `T` **or** a `Task<T>`. That one sentence
explains both what it is for and everything that goes wrong with it.

## The allocation it removes

Consider a method whose common case answers immediately — a cache hit, a read out of a buffer
that is already full — and whose rare case has to go somewhere slow:

```csharp
async Task<int> GetValueAsync(string key)
{
    if (_cache.TryGetValue(key, out var hit)) return hit;   // fast path
    var result = await FetchFromDatabaseAsync(key);         // slow path
    _cache[key] = result;
    return result;
}
```

The fast path takes no suspension, so it promotes no state machine to the heap. But the method
still has to hand the caller a `Task<int>`, and constructing a completed `Task<int>` generally
means allocating one. The async builder keeps a small cache of pre-made tasks for a handful of
values — `true`, `false`, a narrow range of small integers, a null reference — and outside those,
an object is allocated for a value the caller is about to read and throw away.

Change the return type to `ValueTask<int>` and the fast path allocates nothing at all: the struct
carries the `int` back by value. The slow path is unchanged — the struct then wraps the `Task<int>`
that the suspension produced, and awaiting it costs exactly what awaiting that task would have
cost. `ValueTask<T>` does not make suspension cheaper. It makes *not suspending* free.

So the ordering is: find out how often the method actually suspends first, because a method that
suspends nearly every call has nothing here to win.

```quiz 01M19J52DF5PFMGBDQQZPH9SCQ cloze
`ValueTask<T>` is a {{struct}} that holds either a result value or a `Task<T>`. It removes an
allocation only on the path where the method completes {{synchronously}}; on the path where it
suspends, it wraps the task that suspension already produced.
```

## The struct is copied, and that is the trap

A struct is copied on assignment, on being passed as an argument, and on being stored in a field.
Each copy holds the same fields — a value, or a reference to a task, or a reference to a
completion source and a token — and none of them coordinates with the others.

The contract the type ships with is therefore narrow: **await a `ValueTask<T>` exactly once, and
do it before it goes out of scope.**

```csharp
var vt = GetValueAsync(key);
int a = await vt;
int b = await vt;   // wrong: consuming the same result a second time
```

```csharp
private ValueTask<User> _pending = GetUserAsync(42);   // wrong: stored, awaited later
```

Neither of these fails loudly the way a null reference does. Depending on what the struct is
wrapping, the second consumption may hand back a stale value, throw about multiple continuations,
or read a result that belongs to somebody else. That last possibility is the one worth chasing
down, and the section on `IValueTaskSource<T>` below is where it comes from.

The rule has a companion in the other direction: do not `await` two `ValueTask<T>`s concurrently
the way you would two `Task<T>`s. Handing them to [[composing-tasks-whenall-and-whenany|`Task.WhenAll`]]
is not possible without converting them first, which is the type telling you something.

## Which one to return

Reach for `Task<T>` when:

- the method usually **does** suspend, so there is no synchronous path worth optimising;
- the method is **public API**, and you do not control what callers do with what you hand back;
- the result will be stored, passed on, or awaited more than once;
- you want ordinary async debugging and stack traces, which `Task<T>` has and struct semantics
  make fiddlier.

Reach for `ValueTask<T>` when:

- it is an **internal implementation detail** and you own every call site;
- the hot path really is synchronous completion, and you have **measured** that the allocation
  matters — see [[allocation-profiling-in-practice]] for what measuring that looks like;
- every caller awaits it immediately, or converts it immediately.

Stephen Toub's guidance in
[Understanding the Whys, Whats, and Whens of ValueTask](https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/)
is to default to `Task<T>` and treat `ValueTask<T>` as the exception you justify with a
measurement. The default is not a stylistic preference: `Task<T>` has no hidden contract, and a
type with no hidden contract cannot be held wrong.

```quiz 01M19J52DF6EC38AD48ZK7160D
A caller receives a `ValueTask<int>` and awaits the same variable twice. Why is that dangerous?

- [x] It is a struct, so the second await consumes a copy whose backing state may be gone
  > The fields were designed to be read once; a copy has no idea another read happened.
- [ ] `ValueTask<T>` is simply not an awaitable type more than once
  > It is awaitable every time you write it — the type offers no protection at all here.
- [ ] The second await allocates the `Task<T>` the first one avoided
  > Allocation is not what goes wrong; a wrong or foreign result is what goes wrong.
- [ ] The second await always blocks until the first continuation has resumed
  > There is no such interlock. Nothing sequences the two consumptions against each other.
```

## The public-API version of the same mistake

The failure that actually reaches production is a library exporting a `ValueTask`-returning method:

```csharp
public ValueTask<User> GetUserAsync(int id) =>
    _cache.TryGetValue(id, out var user)
        ? new ValueTask<User>(user)
        : new ValueTask<User>(FetchFromDatabaseAsync(id));
```

Everything about that signature says "a task, but cheaper". Nothing about it says "consume this
exactly once, here, now". A caller in another assembly who stores it in a field, awaits it in two
branches, or hands it to a helper has broken a rule they were never shown — and had the method
returned `Task<User>`, all three would have been fine.

That is the whole argument for the default. The saving is yours; the contract is the caller's.

## Converting out: `AsTask`

When you receive a `ValueTask<T>` and need to do any of the forbidden things, convert it
immediately, at the point of receipt, before anything has had a chance to copy it:

```csharp
Task<int> t = SomeAsync().AsTask();
int a = await t;
int b = await t;   // fine: Task<T> is safe to await repeatedly
```

If the `ValueTask<T>` was wrapping a plain value, `AsTask()` allocates the `Task<T>` that the
struct existed to avoid. That is not a defeat — it is the trade stated honestly. You are paying
back the synchronous-path saving in exchange for a value that obeys the rules you need.

## Why the contract is a contract and not a convention

The two shapes described so far — a value, or a `Task<T>` — would make double-awaiting merely
wasteful. The reason it is genuinely unsafe is the third shape, which is what the high-throughput
BCL APIs use.

`ValueTask<T>` can also wrap an **`IValueTaskSource<T>`** together with a `short` version token.
The source is an object the API owns and **reuses**, typically backed by
`ManualResetValueTaskSourceCore<T>`:

```csharp
sealed class ReceiveSource : IValueTaskSource<int>
{
    private ManualResetValueTaskSourceCore<int> _core;   // reused, not allocated per call

    public ValueTask<int> ReceiveAsync()
    {
        _core.Reset();                                    // bumps the version token
        // ... start the OS-level asynchronous receive ...
        return new ValueTask<int>(this, _core.Version);   // no Task on the heap at all
    }

    void OnCompletion(int bytesRead) => _core.SetResult(bytesRead);

    public int GetResult(short token) => _core.GetResult(token);
    public ValueTaskSourceStatus GetStatus(short token) => _core.GetStatus(token);
    public void OnCompleted(Action<object?> c, object? s, short token, ValueTaskSourceOnCompletedFlags f)
        => _core.OnCompleted(c, s, token, f);
}
```

This is how `Socket.ReceiveAsync` and `PipeReader.ReadAsync` allocate nothing per call even when
the operation genuinely goes asynchronous: the awaitable is a struct pointing at a per-connection
object that is reset and handed out again for the next operation. The allocation is per
*connection*, not per *call*.

And that is the mechanism behind the rule. The version token is what makes a consumption valid;
`Reset()` invalidates the previous one. An await after the source has been reset for the *next*
operation is not reading a stale copy of your own result — it is reading, or corrupting, whatever
that source is doing now. `GetResult` is entitled to throw about the token, and a race can get
past that check and return the wrong caller's data. The contract is hard because the object
underneath is shared, and it is shared on purpose.

```quiz 01M19J52DF44P0QCK6XJVJ8VFR recall
An interviewer asks how `Socket.ReceiveAsync` avoids allocating a `Task` per call under load, and
what that has to do with the rule about awaiting a `ValueTask` once. Answer both.

> The socket implements `IValueTaskSource<T>` itself, backed by a reusable
> `ManualResetValueTaskSourceCore<T>` held per socket rather than per call. Each receive resets
> that core, which bumps its version token, and returns a `ValueTask<int>` wrapping the source
> plus that token — so nothing is allocated even on the asynchronous path.
>
> The two facts are the same fact. Because the backing object is reused, a second await of a
> `ValueTask` is not re-reading a private copy of a finished result; the source may already have
> been reset and put to work on the next operation, and the token that made the first consumption
> valid no longer identifies anything. That is why the single-await rule is enforced by a version
> check rather than left to convention — and why `AsTask()` exists for every case where you cannot
> guarantee it.
```

## What to take away

**`ValueTask<T>` sells you the synchronous path and bills you a usage contract.** Return it when
you own both sides of the call and have measured the win; return `Task<T>` when anyone else is
holding it. When you receive one and cannot obey the rule, `AsTask()` immediately and pay the
allocation on purpose.

Worth reading in full:
[Understanding the Whys, Whats, and Whens of ValueTask](https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/).
It works through the `IValueTaskSource<T>` case and the exact list of things you may not do with a
`ValueTask`, which is shorter and stranger than most people expect.
