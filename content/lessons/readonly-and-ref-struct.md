---
id: 01M1P5HK4GZGAN53YCKAVMMS4X
title: readonly struct and ref struct
topic:
  - records-structs-and-modifiers
prerequisites:
  - value-types-versus-reference-types
  - class-struct-record-and-record-struct
---

Two modifiers turn a plain `struct` into something with a stronger guarantee. `readonly struct`
promises **immutability**; `ref struct` promises **stack confinement**. They are unrelated in what
they do, but they share an interview payoff: each one is a compiler-enforced rule, not a convention
you hope everyone follows.

## `readonly struct` — immutable by the compiler

Mark a `struct` `readonly` and the compiler forbids any member from mutating `this` — every field
must be `readonly` and there are no setters. This is worth more than tidiness. Recall from
[[value-types-versus-reference-types]] that a value type is copied wherever it flows; a `readonly`
struct passed by reference (see [[in-ref-and-out-parameters]]) lets the compiler *skip* the
**defensive copy** it would otherwise make to protect the caller from a method that might mutate the
value. A mutable struct passed `in` gets copied defensively on many member accesses; a `readonly
struct` does not, because there is nothing to defend against.

```csharp
readonly struct Money
{
    public readonly decimal Amount;
    public Money WithAmount(decimal a) => new Money(a); // returns a new value, never mutates this
}
```

```quiz 01M1P5HK4G6DS6Z2TYGQX44K8R
What does marking a `struct` as `readonly` let the compiler avoid when the value is passed by
reference?

- [x] The defensive copy it would make to guard against a mutating member call
  > A `readonly struct` cannot mutate `this`, so no defensive copy is needed on member access.
- [ ] The heap allocation that boxing the struct would otherwise require
  > `readonly` does not change boxing; that is about crossing into an `object`-typed slot.
- [ ] The bounds check performed when the struct is stored in an array
  > `readonly` has nothing to do with array bounds checks; it governs mutation of `this`.
- [ ] The reflection walk performed by the struct's default `Equals`
  > That cost is removed by making it a record struct, not by marking it `readonly`.
```

## `ref struct` — the one place the stack is a hard rule

There is a famous C# myth that "structs live on the stack." As Eric Lippert spells out, that is an
**implementation detail** — what the language actually guarantees is value *semantics*, not a storage
location; a struct that is a field of a class lives on the heap inside that object, and the JIT may
keep a "stack" local in a register
([The Truth About Value Types](https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-truth-about-value-types),
[The Stack Is An Implementation Detail](https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-stack-is-an-implementation-detail-part-one)).

`ref struct` is the single exception where the stack **is** a hard, enforced rule. A `ref struct` is
guaranteed to live only on the stack, and the compiler enforces it by banning every escape route:

- it **cannot be boxed** (no assignment to `object` or an interface);
- it **cannot be a field of a class** or of any non-`ref` struct;
- it **cannot be captured by a lambda** or a local function;
- it **cannot cross an `await`** or a `yield` boundary.

```quiz 01M1P5HK4G42NGT0XTH7PCC47X cloze
A `ref struct` is confined to the {{stack}}: it cannot be boxed, cannot be a field of a
{{class}}, cannot be captured by a lambda, and cannot cross an {{await}}.
```

## Why the rule exists: `Span<T>` and `Memory<T>`

The canonical `ref struct` is `Span<T>` — a lightweight window over stack, unmanaged, or managed
memory that is safe precisely *because* it can never outlive the stack frame that owns the memory it
points at. That safety is what forces the confinement rules above, and it has a direct consequence for
async code: because a `Span<T>` cannot be a field on a heap object and cannot cross an `await`, you
cannot hold one across an asynchronous call. **This is exactly why `Memory<T>` exists** — it is the
heap-friendly counterpart you *can* store and await, handing you a `Span<T>` only at the moment you
actually read the bytes.

```quiz 01M1P5HK4GQ2J677TJ207N85QY
Why can't you keep a `Span<T>` in a local across an `await` in an async method?

- [x] `Span<T>` is a `ref struct`, and a `ref struct` cannot cross an `await` boundary
  > An `await` may resume on the heap-hoisted state machine, which a stack-confined `ref struct` may not enter.
- [ ] `Span<T>` is a reference type, so awaiting it would race on shared memory
  > `Span<T>` is a value type — a `ref struct` — not a shared reference-typed object.
- [ ] `Span<T>` boxes when captured, and boxing is forbidden inside async methods
  > Async methods do not forbid boxing; the block is that a `ref struct` cannot be boxed or hoisted at all.
- [ ] `Span<T>` is immutable, so the compiler discards it at the await point
  > Immutability is unrelated; the barrier is stack confinement, which is why `Memory<T>` is the async tool.
```

## In an interview

Keep the two modifiers separate. `readonly struct` is about immutability and the defensive copies it
lets the compiler skip. `ref struct` is about stack confinement — and it is the *only* place where
"lives on the stack" is a guarantee rather than an implementation detail, so it is worth correcting
the myth and then naming the one genuine exception. If pushed on `Span<T>` versus `Memory<T>`, the
answer is the confinement rule: `Span` for synchronous hot paths, `Memory` when the bytes must survive
an `await`.

Primary source worth reading in full: the .NET language reference on
[`ref struct` types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct).
