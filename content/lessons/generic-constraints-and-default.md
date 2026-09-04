---
id: 01M1P5GD8F9FXPWTH4D1QJQM3Y
title: Generic constraints and default(T)
topic:
  - generics
prerequisites:
  - how-generics-are-specialised-at-runtime
---

Inside `class Cache<T>`, the type `T` is a black box: the compiler knows nothing about it, so you can
assign it, store it, and compare it for reference equality, and almost nothing else. A **constraint**
is how you buy back capability — `where T : something` is a promise about `T` that the compiler
checks at every call site, and in exchange it lets the body of the generic use `T` as if it were that
something. **A constraint is not decoration; it is what turns an opaque type parameter into one you
can call methods on, construct, or treat as non-null — often without the boxing or reflection you
would otherwise need.**

## The clauses, and what each one buys

Each constraint unlocks a specific capability
([constraints on type parameters](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters)):

- **`where T : class`** — `T` is a reference type. You may compare it to `null` meaningfully and
  assign `null` to it. This selects the *shared* reference-type instantiation from the previous
  lesson.
- **`where T : struct`** — `T` is a non-nullable value type. The payoff is mechanical: the compiler
  knows `T` will be reified as a value type, so operations on it stay unboxed. This is how
  `Nullable<T>` constrains its own parameter.
- **`where T : new()`** — `T` has a public parameterless constructor, so the body may write
  `new T()`. Without it, `new T()` will not compile, because the compiler cannot know a constructor
  exists.
- **`where T : notnull`** — `T` is a non-nullable type (value or reference). It is the constraint
  `Dictionary<TKey, TValue>` puts on its key.
- **`where T : IComparable<T>`** (any interface or base class) — the highest-value one. It lets the
  body call the interface's members **directly on `T`**, and this is the crux: calling
  `x.CompareTo(y)` through the constraint is a **constrained call** that does *not* box a value-type
  `T`, whereas the same call through a plain `object` or via reflection would. The constraint is what
  makes generic algorithms over value types allocation-free.

```quiz 01M1P5GD8F0GMBY5BQN6GQHKH7
Inside `T Max<T>(T a, T b) where T : IComparable<T>`, why can the body write `a.CompareTo(b)` with no
boxing of a value-type `T`?

- [x] The interface constraint lets the compiler emit a constrained call directly on `T`
  > The constraint proves `T` has `CompareTo`, so the call binds to `T` itself without going through `object`.
- [ ] Value types are always compared by reference, so no box is needed
  > Value types are not compared by reference, and without the constraint the call would box.
- [ ] The JIT boxes `T` once and caches the box for reuse
  > No box happens at all; the constrained call is the mechanism that avoids it.
```

You can also stack them, in a required order — `where T : class, IDisposable, new()` — and constrain
several parameters independently. The rule to remember is that `class`/`struct` come first, an
explicit base class or interfaces in the middle, and `new()` last.

```quiz 01M1P5GD8FYK7CS9TPFXPZ68TM
Which constraint must a generic method carry for its body to legally call `new T()`?

- [x] `where T : new()`, promising a public parameterless constructor
  > Only this constraint proves a constructor exists, so `new T()` compiles.
- [ ] `where T : class`, since only reference types can be constructed
  > `class` says nothing about constructors, and value types are constructible too.
- [ ] No constraint, because `new T()` falls back to reflection
  > The compiler will not silently emit reflection; without `new()` the call is an error.
```

## default(T) resolves per instantiation

`default(T)` is the value you reach for when you need "the absence of a `T`" — the initial slot of a
backing array, the return when a lookup misses. Its meaning is decided **per instantiation**, at run
time, by the reification from the previous lesson: for a reference type `T`, `default(T)` is `null`;
for a value type `T`, it is the **zeroed value** — `0` for `int`, `false` for `bool`, a struct with
every field zeroed ([default values](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/default-values)).
This is exactly why you cannot write `T x = null` in an unconstrained generic — `null` is not a legal
value for every `T` — but you *can* always write `T x = default`. The one gotcha to name: for a value
type, `default(T)` is a real, usable zero value, not a sentinel for "missing", so a method like
`Dictionary.TryGetValue` returning `default` for an `int` value hands you `0`, which is
indistinguishable from a stored `0` — the `bool` return is what tells you it missed.

```quiz 01M1P5GD8FN4X68PTA7GWAPMCB cloze
`default(T)` is resolved {{per instantiation}}: it is {{null}} for a reference type and the zeroed
value for a value type, which is why an unconstrained generic can write `T x = default` but not
`T x = null`.
```

## In an interview

Frame a constraint as *buying back capability from an opaque type parameter*, then give the concrete
lever: an interface constraint lets you call the interface's members directly on `T` with no boxing
and no reflection, which is what makes generic algorithms over value types allocation-free. Know the
five clauses cold — `class`, `struct`, `new()`, `notnull`, and interface/base — and what each
unlocks. For `default(T)`, the sharp point is that it is resolved per instantiation off the same
reification that specialises the type: `null` for references, a zeroed value for value types, and
therefore `T x = default` always compiles where `T x = null` does not.

Primary source worth reading in full: the .NET guide on
[constraints on type parameters](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters).
