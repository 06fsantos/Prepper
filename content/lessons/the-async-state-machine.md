---
id: 01M195XCR1HAYE28DQMD0YZETR
title: The async state machine
topic:
  - async-await
---

An `async` method is not compiled as a method. The compiler rewrites its body into a **state
machine** — a struct with a field for the current state, a field for every local that has to
survive an `await`, a field per awaiter type, and a `MoveNext()` method holding the whole
original body as a jump table keyed on the state.

```csharp
async Task<int> GetValueAsync()
{
    int a = await StepOneAsync();
    int b = await StepTwoAsync(a);
    return a + b;
}
```

What is left of `GetValueAsync` itself is an entry point: zero-initialise the struct **on the
stack**, call `MoveNext()` once, return whatever the builder hands back. That is the fact the
rest of this note is a consequence of — the state machine starts on the stack, and something
has to happen before it can leave.

## The `IsCompleted` check is the whole game

Inside `MoveNext()`, every `await` compiles to roughly this shape:

```csharp
var awaiter = StepOneAsync().GetAwaiter();
if (!awaiter.IsCompleted)
{
    // suspend: save state, hook up the continuation, return
    _state = 0;
    _awaiter = awaiter;
    _builder.AwaitUnsafeOnCompleted(ref awaiter, ref this);
    return;
}
// already complete: keep going, on this thread, right now
```

If the awaited operation is **already complete** by the time it is awaited — a cache hit, a
buffered read, a `Task` that finished while you were doing something else — the method simply
keeps running synchronously on the current thread. Nothing is captured, nothing is queued,
nothing is allocated for the state machine at all.

Only the other branch costs anything. To suspend, the runtime has to:

- **promote the state-machine struct to the heap**, because it has to outlive this call to
  `MoveNext()`;
- **capture the ambient `ExecutionContext`** so it flows to wherever the continuation resumes,
  and the [[capturing-a-synchronization-context|synchronization context]], so the continuation
  knows *where* to resume;
- **hook a continuation onto the awaiter**, so completing the awaited work calls back into
  `MoveNext()`.

```quiz 01M195XCR26XV9MZA3E92AN3ZK
A method awaits a `Task` that has already completed by the time it is awaited. How many heap
allocations does that `await` cause for the state machine itself?

- [x] None — nothing suspended, so nothing was promoted
  > `IsCompleted` was true, so execution continued inline and the struct stayed on the stack.
- [ ] One — the state machine is boxed on every call
  > Promotion is lazy. It happens the first time the method actually has to suspend.
- [ ] Two — one for the machine, one for the continuation
  > Neither is needed here, and on modern .NET the two are one object anyway.
- [ ] One per `await` the method's body contains
  > Allocation follows suspensions taken at runtime, not `await` keywords in the source.
```

This is why `async` all the way through a cache-hit-heavy hot path is so much cheaper than it
looks. The word `await` appears everywhere; the suspensions do not.

## On modern .NET, a suspension costs one object

Having to promote the struct, capture context, and attach a continuation sounds like several
allocations, and historically it was. On .NET Framework each suspension allocated a boxed state
machine, an `Action` delegate, a `MoveNextRunner`, an `ExecutionContext` copy and more.

Modern .NET special-cases its own `Task` and `ValueTask` awaiters: the box **is** the task. The
runtime allocates an `AsyncStateMachineBox<TStateMachine>` that derives from `Task<TResult>` and
holds the state machine as a field, and uses that same object directly as the continuation — no
separate delegate. One object, per suspending call, for the machinery.

Stephen Toub's [How Async/Await Really Works in C#](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/)
measures a benchmark of 1,000 calls each suspending 1,000 times: over five million allocations
and ~145 MB on .NET Framework, against roughly a thousand allocations and ~109 KB on .NET Core.
Those are that post's measurements of that benchmark — worth knowing as the shape of the change,
not as a number to quote about your own runtime.

```quiz 01M195XCR22JQJ8GK9DTWH5YKG cloze
The compiler emits the state machine as a {{struct}}, which lives on the stack until the method
first suspends. On modern .NET the object it is promoted into is also the returned {{Task}},
which is why a suspension costs one allocation rather than several.
```

## There is no "make it a class" switch

The compiler always emits a struct, and promotion to the heap is what "goes to the heap" means
here — there is no mode that emits a reference type up front and no attribute that asks for one.
So the only lever you have over async allocation is **how often the method actually suspends**,
and after that, [[valuetask-when-it-helps|what type it returns]].

That ordering matters more than it looks. Reaching for `ValueTask<T>` before knowing whether the
method suspends is optimising the branch that already costs nothing.

```quiz 01M195XCR2GYD1QXPQ3H8DD43W recall
A colleague says an `async` method allocates "a state machine plus a task" on every call, and
proposes rewriting a hot path to remove the `async` keyword. What is wrong with the premise?

> The state machine is a struct and starts on the stack. It is promoted to the heap only when
> the method actually suspends — when an awaited operation is not already complete. On modern
> .NET that promotion produces one object, and that object *is* the returned task rather than a
> separate allocation. A method whose awaits usually complete synchronously already allocates
> nothing for the machinery, so the rewrite would be paying in readability for a cost that is
> not being incurred. The question to answer first is how often the path suspends.
```

## What to take away

**Writing `await` costs nothing; taking a suspension costs one object.** Every other question
about async allocation — `ValueTask`, `ConfigureAwait`, how many awaits to write — is downstream
of knowing which of those two branches a given call takes.

Worth reading in full:
[How Async/Await Really Works in C#](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/).
It derives the whole transform, including the pre-`Task` history that explains why it looks the
way it does.
