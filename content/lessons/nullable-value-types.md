---
id: 01M1NJP99G85MRQ7S7H5KVR9VC
title: Nullable value types
topic:
  - value-and-reference-types
prerequisites:
  - value-types-versus-reference-types
---

`int?` looks like it adds `null` to `int` by magic, but there is no magic: `int?` is shorthand for
`Nullable<T>`, an ordinary `struct` that pairs the value with a `bool` saying whether there is
one. Knowing that it is a struct — a [value type](value-and-reference-types) — is what makes the
rest of its behaviour predictable instead of surprising.

```csharp
public struct Nullable<T> where T : struct
{
    public bool HasValue { get; }
    public T Value { get; }   // throws InvalidOperationException if HasValue is false
}
```

Two consequences fall straight out of that shape. First, `T` must itself be a non-nullable value
type — you cannot write `int??` or make a reference type nullable this way, because the constraint
is `where T : struct`. Second, a `null` `int?` is not a null reference: it is a real `Nullable<int>`
struct sitting inline in its variable, with `HasValue == false`. It occupies space; it is never a
dereference risk.

```quiz 01M1NJP99G64W55R1GAKMMMWQN
`int? x = null;`. What is `x`, in memory terms?

- [x] A `Nullable<int>` struct whose `HasValue` field is `false`
  > `int?` is a value type; a "null" one is a real struct with the flag cleared, not a null reference.
- [ ] A null reference of type `int`, like a null string
  > Value types have no null reference; the nullability is a `bool` field inside the struct.
- [ ] A boxed `int` on the heap holding a sentinel value
  > No boxing and no sentinel; the state lives in the struct's own `HasValue` field.
```

## Reading the value safely

`Value` throws `InvalidOperationException` when `HasValue` is false, so reaching for `.Value`
without checking is the classic bug. The safe accessors:

- `x.HasValue` — the boolean test; `x != null` compiles to the same thing.
- `x ?? fallback` — the value, or a fallback you supply if it is null.
- `x.GetValueOrDefault()` — the value, or the underlying type's default (`0`, `false`, …).
- `if (x is int v)` — pattern match that binds the unwrapped value in one step.

## Lifted operators, and the null that is neither

Operators are **lifted** over `Nullable<T>`: `a + b` on two `int?` returns `int?`, and the result is
`null` if either operand is null. The trap is the comparison operators. If either side is null,
`<`, `>`, `<=` and `>=` all return **false** — so `a < b` being false does **not** imply `a >= b`.
Two nulls are equal under `==` (both null → true) but a null is neither less than nor greater than
anything.

```quiz 01M1NJP99GSS4SNBNYJEEFJKMX
`int? a = 10;`. What do `a >= null` and `a < null` evaluate to?

- [x] Both `false` — any ordering comparison with null is false
  > With a null operand, `<`, `>`, `<=`, `>=` all yield false, so neither direction is true.
- [ ] `a >= null` is `true` because 10 outranks nothing
  > Ordering comparisons do not treat null as a low value; a null operand makes them false.
- [ ] Both throw because null has no ordering
  > They do not throw — they silently return false, which is the actual trap.
```

## Boxing a nullable is special

Because [boxing](boxing-and-unboxing) crosses into the heap, `Nullable<T>` gets a special rule the
CLR bakes in: boxing a null `int?` produces a **null reference**, not a boxed struct; boxing a
non-null `int?` boxes the underlying `int`, not the `Nullable<int>` wrapper. So `((int?)5).GetType()`
returns `System.Int32`, and there is no such runtime type as "boxed nullable" to unbox back to.

```quiz 01M1NJP99GH449WCZ07SZV9PDA cloze
Boxing a `Nullable<T>` whose `HasValue` is false yields a {{null}} reference; boxing one with a
value boxes the underlying {{T}}, not the wrapper.
```

## In an interview

Say it is a struct first — `Nullable<T>` with a `HasValue` flag — and the rest lands: it is not a
null reference, `.Value` can throw, comparisons with null are all false, and boxing collapses to the
underlying type or to a plain null. The reach-for-it is representing "no value" for a value type,
most often a database column that can be `NULL`.

Primary source worth reading in full: the .NET reference on
[nullable value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types).
