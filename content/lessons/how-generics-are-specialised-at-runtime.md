---
id: 01M1P5GD8FTVFJBSXFDN69DDWQ
title: How generics are specialised at runtime
topic:
  - generics
prerequisites:
  - boxing-and-unboxing
---

The question that separates someone who has *read about* generics from someone who understands the
machine is "does `List<int>` box its elements?" The answer is no, and the reason is the one fact
worth carrying about C# generics: **they are a runtime feature, not compile-time erasure — the JIT
compiles real, specialised machine code per type argument, so `List<int>` stores raw `int`s with no
`object` in sight.** Java erases its generics down to `Object` and casts; the CLR does the opposite,
and every performance property of C# generics falls out of that difference.

## Reification, not erasure

When you write `List<T>`, the compiler emits one generic definition into IL — a blueprint with `T`
left open. Nothing is specialised yet. The specialisation happens at **run time**: the moment code
first constructs a `List<int>`, the JIT compiles a concrete instantiation whose storage and method
bodies are stamped out for `int`
([generics in the run time](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/generics-in-the-run-time)).
The type `List<int>` is a real, distinct type at run time with its own method table — you can ask it
for `typeof(List<int>)` and get a different object than `typeof(List<string>)`. This is why C#
generics are called **reified**: the type argument survives into the running program instead of
being erased away.

```quiz 01M1P5GD8F1DMM8KFJ2M33CMK7
How does the CLR represent a closed generic type like `List<int>` at run time?

- [x] As a real distinct type, JIT-compiled with `int`-sized storage
  > The type argument is reified: `List<int>` has its own method table and stores raw `int`s.
- [ ] As `List<object>` with a cast inserted at each call site
  > That is Java's erasure model, not the CLR's. C# keeps the type argument at run time.
- [ ] As the open definition `List<T>`, resolved fresh on each call
  > The instantiation is compiled once and reused, not resolved per call from the open form.
```

## One body for references, one body per value type

Here is the mechanism the interviewer is really after. The JIT does not blindly compile a fresh copy
for *every* type argument, because that would be wasteful — and it does not need to. Every reference,
whatever it points at, is the **same size**: a pointer. So the JIT compiles **one shared
instantiation for all reference types** and reuses it for `List<string>`, `List<object>`,
`List<Customer>` and every other reference type argument, because the generated code only ever moves
pointers around. Value types are different: an `int` is four bytes, a `Guid` is sixteen, a big
`struct` is bigger still, and their layouts differ. So the JIT compiles a **separate specialised
instantiation for each value type** used as a type argument
([generics in the run time](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/generics-in-the-run-time)).

The senior-level consequence follows immediately: fifty distinct *reference* types passed to
`List<T>` cost essentially one native code body between them; fifty distinct *value* types each force
their own JIT-compiled body and their own machine code. That is the real, if usually small, price of
value-type generic instantiation — code size and a little extra JIT work — and it is the flip side of
the performance win below.

```quiz 01M1P5GD8F2ABRZTA016QDZ60Q
You use `List<T>` with 50 different reference types and, separately, 50 different value types. What
does the JIT produce?

- [x] One shared body for all 50 reference types; a separate body per value type
  > Every reference is pointer-sized, so one body serves them all; each value type has its own layout.
- [ ] One shared body for all 100, since the IL definition is the same
  > Value types differ in size and layout, so they cannot share the reference-type body.
- [ ] A separate specialised body for each of the 100 type arguments
  > Reference types share one body; only value types force a distinct specialisation.
```

## Why this means `List<int>` never boxes

Now the payoff, and the reason this lesson has [[boxing-and-unboxing]] as its prerequisite. The old
non-generic `ArrayList` stored `object`, so putting an `int` into it **boxed** the value onto the
heap and pulling one out unboxed it — an allocation and a copy on every element, plus GC pressure and
cache misses across the collection. Generics were introduced precisely to kill that cost. Because the
JIT reifies `List<int>` with `int`-sized storage, the integers sit **inline** in the backing array
exactly as they would in an `int[]`. There is no `object`, so there is no box, so there is nothing to
allocate or unbox. Generics are the language's answer to boxing: the type parameter carries the
element type all the way down to the machine code, and the value never has to be smuggled through
`object` to be stored generically.

```quiz 01M1P5GD8FQVE2SAF764771K8Z cloze
`List<int>` never {{boxes}} its elements, because the JIT reifies a value-type instantiation whose
backing array stores `int`s {{inline}} — unlike the old `ArrayList`, which stored `object`.
```

## In an interview

Lead with the headline: C# generics are reified at run time, not erased like Java's. Then reach for
the mechanism the question is fishing for — one shared code body for all reference types because
every reference is pointer-sized, a separate specialised body per value type because their layouts
differ. The single most useful downstream fact is that this is *why* `List<int>` never boxes: the
value type is baked into the machine code, so the element sits inline with no trip through `object`.
If pushed on cost, name both sides honestly — no boxing and no indirection for value types, paid for
with a distinct JIT-compiled body per value type. This same reified-instantiation model is also what
makes `default(T)` resolve per type and what restricts variance to reference types, both of which are
separate lessons on this topic.

Primary source worth reading in full: the .NET guide on
[generics in the run time](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/generics-in-the-run-time).
