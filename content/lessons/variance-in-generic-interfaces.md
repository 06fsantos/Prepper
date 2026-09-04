---
id: 01M1P5GD8F74AGAZZEJX1NNKE0
title: Variance in generic interfaces
topic:
  - generics
prerequisites:
  - how-generics-are-specialised-at-runtime
---

`Cat` derives from `Animal`, so a `Cat` is an `Animal`. Is a `List<Cat>` a `List<Animal>`? No — and
if it were, you could add a `Dog` to it through the `List<Animal>` view. But an
`IEnumerable<Cat>` *is* an `IEnumerable<Animal>`, and that one is safe. **Variance is the rule that
decides when a generic type built from `Cat` is assignable to the same generic type built from
`Animal`: it is allowed only where the type parameter appears in one direction, marked with `out` or
`in`, and — the runtime fact that ties this whole topic together — it applies to reference types
only.**

## Invariant by default

By default a generic type is **invariant**: `IList<Cat>` and `IList<Animal>` have no assignment
relationship at all, in either direction, even though `Cat : Animal`. This is not the compiler being
timid — it is the only safe default. `IList<T>` both hands `T` out (the indexer's getter) and takes
`T` in (`Add`), so allowing conversion in *either* direction would let you smuggle a `Dog` in through
an `IList<Animal>` reference or read an `Animal` out where a `Cat` was promised. When a parameter is
used both ways, invariance is the only sound choice.

```quiz 01M1P5GD8FJ3HWETQHFHDT86YH
Why is `IList<T>` invariant — no conversion between `IList<Cat>` and `IList<Animal>` in either
direction?

- [x] `T` is used both as input (`Add`) and output (the getter), so neither direction is safe
  > A parameter used in both positions cannot vary safely, so invariance is the only sound default.
- [ ] Interfaces can never be variant, only classes and delegates can
  > Interfaces are the main place variance lives; classes cannot be variant at all.
- [ ] The JIT forbids any conversion between two closed generic types
  > Variant conversions between closed generics are exactly what `out`/`in` enable.
```

## out for covariance, in for contravariance

Variance becomes safe when the type parameter is used in **one position only**, and you mark that
with a keyword on the parameter declaration
([covariance and contravariance](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance)):

- **`out T` — covariance.** `T` may appear only in **output** positions (return values, property
  getters). `IEnumerable<out T>` is the canonical case: it only ever *produces* `T`, so an
  `IEnumerable<Cat>` is safely an `IEnumerable<Animal>` — every `Cat` it yields is an `Animal`.
  Covariance preserves the direction of the subtype relationship: `Cat → Animal` gives
  `IEnumerable<Cat> → IEnumerable<Animal>`.
- **`in T` — contravariance.** `T` may appear only in **input** positions (method arguments).
  `Action<in T>` is the canonical case: it only ever *consumes* `T`, so an `Action<Animal>` is
  safely an `Action<Cat>` — anything that can act on any `Animal` can certainly act on a `Cat`.
  Contravariance *reverses* the direction: `Cat → Animal` gives `Action<Animal> → Action<Cat>`.

The memory hook: **`out` = it comes out = covariant; `in` = it goes in = contravariant.** A single
interface can do both — `Func<in T, out TResult>` is contravariant in its argument and covariant in
its result — precisely because each parameter is confined to one position.

```quiz 01M1P5GD8FG9NK15ZB7662XD1P
`IEnumerable<out T>` is covariant and `Action<in T>` is contravariant. Which assignment is legal?

- [x] `IEnumerable<Animal> a = someIEnumerableOfCat;`
  > `out` is covariant: an enumerable that only yields `Cat` safely yields `Animal`.
- [ ] `IEnumerable<Cat> c = someIEnumerableOfAnimal;`
  > That is the wrong direction for covariance; not every `Animal` yielded is a `Cat`.
- [ ] `Action<Animal> a = someActionOfCat;`
  > `in` reverses the direction: `Action<Animal>` converts to `Action<Cat>`, not the other way.
```

## Why variance is reference-types-only

This is where the topic closes back on
[[how-generics-are-specialised-at-runtime]]. Variance is fundamentally an **assignment
compatibility** rule: it lets a reference of one closed generic type be stored in a variable of
another, without copying or converting the underlying object — the same bits, viewed through a
different static type. That only works when the two instantiations share one representation, which,
from the specialisation lesson, is exactly the case for reference types: they all share **one**
JIT-compiled body, so an `IEnumerable<Cat>` and an `IEnumerable<Animal>` are the same code over
pointer-sized references and the conversion is a no-op at run time.

Value types break this. Each value-type argument is reified as its own **distinct, unrelated native
type** with its own layout — `IEnumerable<int>` and `IEnumerable<object>` share no representation, and
there is no subtype relationship between `int` and `object` to vary along anyway (the bridge between
them is boxing, a copy, not an assignment). So a value-type argument makes the parameter
**invariant** regardless of `out`/`in`: `IEnumerable<int>` is *not* an `IEnumerable<object>`. Variance
is a reference-type-only feature because it rides on the shared reference-type representation, and
value types do not have one.

```quiz 01M1P5GD8GQ85GTK31G6HWR7R6 cloze
Variance applies to {{reference types}} only, because they share one JIT-compiled body so a variant
conversion is a no-op. A value-type argument is reified as a distinct native type, so the parameter
stays {{invariant}} — `IEnumerable<int>` is not an `IEnumerable<object>`.
```

## In an interview

Start from invariance and *why* it is the default: a parameter used both in and out cannot vary
safely. Then give the two keywords with their canonical types — `IEnumerable<out T>` is covariant
because it only produces `T`; `Action<in T>` is contravariant because it only consumes `T` — and the
hook that `out` comes out and `in` goes in. The senior flourish, and the thing that shows you
understand the runtime rather than the syntax, is the last part: variance is reference-types-only
because it is an assignment over the shared reference-type representation, and value-type
instantiations are distinct native types with nothing to vary along — so `IEnumerable<int>` is not an
`IEnumerable<object>`.

Primary source worth reading in full: the .NET guide on
[covariance and contravariance in generics](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance).
