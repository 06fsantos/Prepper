---
id: 01M1P5J8NBWGYJC3J495T546MV
title: Span and stackalloc
topic:
  - garbage-collection
prerequisites:
  - value-types-versus-reference-types
  - the-generational-heap
---

The cheapest object to collect is the one never allocated on the heap. `Span<T>` and `stackalloc` are
how modern C# works over a block of memory — slicing it, filling it, parsing it — **without a heap
allocation and so without giving the garbage collector anything to do.** The mechanism that makes that
safe is a single, strictly enforced runtime rule, and that rule is also the whole of the interview
question: it is why `Span<T>` cannot cross an `await`.

## `Span<T>` is a window, and it is stack-only

A `Span<T>` is not a container; it does not own or copy anything. It is a **window** — a pointer and a
length — over memory that already lives somewhere else: a managed array, a block of unmanaged memory,
or a chunk of the stack. Slicing an array into a `Span<T>` and writing through the span writes to the
original array, with no new allocation for the view.

What makes that safe is that `Span<T>` is a **`ref struct`**, and a `ref struct` is **confined to the
stack** — a hard, enforced runtime guarantee, not an implementation detail (the
[System.Span](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-span)
docs and [[records-structs-and-modifiers]] both frame it this way). The confinement means a `ref
struct` **cannot be a field of a class**, cannot be boxed, and cannot be captured by a lambda. The
compiler refuses all three. The reason is safety: a span points *into* live memory, and if a span
could be stored on the heap it might outlive the stack frame or array slice it points at, leaving a
window onto memory that has been reclaimed or moved. Keeping it on the stack keeps its lifetime bounded
by the frame that made it.

```quiz 01M1P5J8NBRJAZ8BRERJZN21WC
`Span<T>` is a `ref struct`. Which of these does the compiler forbid as a direct consequence?

- [x] Storing a `Span<T>` in a field of a class
  > A `ref struct` is stack-confined, so it cannot be a field on a heap object — the compiler blocks it.
- [ ] Slicing a `Span<T>` into a smaller `Span<T>`
  > Slicing is the core operation; it produces another stack-confined span and is entirely allowed.
- [ ] Passing a `Span<T>` as a method argument
  > Passing a span by value down the stack is fine; the confinement is about escaping to the heap.
- [ ] Writing through a `Span<T>` into the array it wraps
  > Writing through the window into the underlying array is exactly what a span is for.
```

## `stackalloc`: memory the GC never sees

`stackalloc` allocates a block on the **stack** rather than the managed heap, and a `Span<T>` is the
safe way to hold it:

```csharp
Span<byte> buffer = stackalloc byte[256];
// fill and use buffer here, within this method
```

Because the block is on the stack, it **is not tracked by the garbage collector and does not need to
be pinned** — two properties the
[stackalloc](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc)
docs state directly. There is nothing on the heap for the GC to mark, sweep, promote, or compact (see
[[the-generational-heap]] for what it would otherwise do). And "no pinning" matters because heap memory
handed to unmanaged code normally has to be **pinned** — fixed in place so a compacting collection does
not move it out from under the pointer — whereas stack memory never moves and never needs fixing. The
block simply vanishes when the method returns, which is also why `stackalloc` is for **small,
short-lived** buffers: it consumes the thread's finite stack, and a large or loop-driven `stackalloc`
risks a stack overflow.

```quiz 01M1P5J8NBVCEANDS3EE4Z2AHP cloze
Memory from `stackalloc` lives on the {{stack}}, so it is not tracked by the garbage collector and,
unlike heap memory passed to unmanaged code, does not need to be {{pinned}} — because stack memory
never moves during a collection.
```

## The senior point: why `Span<T>` cannot cross an `await`

Now the two halves meet. An `async` method that suspends at an `await` has its locals **lifted onto
the heap**, into a state-machine object, so they survive across the suspension while the thread goes off
to do other work (this is exactly the machinery [[the-async-state-machine]] describes). A local
captured by a lambda is lifted the same way, onto a display-class object on the heap.

But a `Span<T>` is a `ref struct` and **cannot live on the heap** — so it cannot be lifted, so it
**cannot survive an `await` and cannot be captured by a lambda.** The compiler rejects a span that is
still in scope across an `await`. This is not a limitation to work around; it is the stack-confinement
guarantee doing its job, refusing to let a window onto stack memory escape into a heap object that
outlives the frame.

That is precisely why **`Memory<T>` exists.** `Memory<T>` is the heap-friendly counterpart: an ordinary
struct (not a `ref struct`) that also represents a slice of memory but *can* be a field, *can* be
stored in the async state machine, and so *can* cross an `await`. The rule of thumb is the one to say
out loud: **`Span<T>` for the synchronous, stack-bound hot path; `Memory<T>` the moment the code goes
async** and the slice has to survive a suspension. You get a `Span<T>` back out of a `Memory<T>` with
`.Span` at the point of synchronous use, after the await has landed. Flagging that overlap — that the
GC-avoidance tool of the memory subject is constrained by the state-machine mechanics of the async
subject — is the kind of cross-topic answer a senior interview rewards.

```quiz 01M1P5J8NBSJCDN4D3E0BNZJJS
A method needs to hold a buffer slice across an `await`. Why must it use `Memory<T>` rather than
`Span<T>`?

- [x] `Span<T>` is a `ref struct` and cannot be lifted onto the heap-based async state machine
  > Crossing an await requires living in the state-machine object on the heap, which a ref struct cannot.
- [ ] `Span<T>` is slower than `Memory<T>`, so the async path avoids it for performance
  > It is not a speed choice; the compiler forbids a span across an await outright, on lifetime safety.
- [ ] `Memory<T>` copies the buffer while `Span<T>` shares it, and async needs its own copy
  > Both are windows over shared memory and copy nothing; the difference is heap-ability, not copying.
- [ ] `Span<T>` can only wrap stack memory, and async buffers are always on the heap
  > A span can wrap heap or unmanaged memory too; the barrier is that the span itself cannot be heap-stored.
```

## In an interview

The through-line: **`Span<T>`/`stackalloc` let you work over memory without allocating, and the
enforced `ref struct` stack-confinement is both what makes that safe and what stops a span crossing an
`await`.** Lead with "a `Span<T>` is a stack-only window, not a copy," name the three things
confinement forbids (heap field, boxing, lambda capture), and land on `Memory<T>` as the async answer.
If pushed on `stackalloc`, the details are: not GC-tracked, no pinning needed, small and short-lived
only. It is a rare interview seam that ties the memory model and the async model together in one rule,
which is exactly why it is worth having ready.

Primary source worth reading in full:
[System.Span overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-span).
</content>
