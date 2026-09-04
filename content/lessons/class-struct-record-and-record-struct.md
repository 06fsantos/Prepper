---
id: 01M1P5HK4GKX5EMNCWSJ2ST2ZN
title: Class, struct, record, and record struct
topic:
  - records-structs-and-modifiers
prerequisites:
  - value-types-versus-reference-types
---

C# gives you four ways to declare a data type, and picking the right one is a design question an
interviewer uses to check that you understand two independent axes at once: **how the type is stored
and copied**, and **how equality is decided**. The two axes are set by different keywords, and the
whole point of `record struct` is that you can choose both independently. The base mechanics — what a
copy copies, what `==` compares — are [[value-types-versus-reference-types]]; this note is about
which declaration to reach for.

The one-line map:

- **`class`** — reference type, copied by reference, and equality is **identity** by default (are
  these the same object?).
- **`struct`** — value type, copied by value on every assignment and every argument pass, and
  equality is **structural** by default (do the fields match?).
- **`record`** (a.k.a. `record class`) — still a reference type, but the compiler *generates*
  value-based equality, a readable `ToString`, and `with` non-destructive mutation.
- **`record struct`** — a value type *and* it gets the same compiler-generated value equality, so you
  keep struct layout without hand-writing `Equals`.

## Storage is one axis, equality is the other

`class` versus `struct` decides storage and copy semantics. `record` versus plain decides whether the
compiler writes your equality members for you. They are orthogonal, which is why all four cells of the
grid exist:

| | reference type | value type |
| --- | --- | --- |
| **identity / default equality** | `class` | `struct` |
| **generated value equality** | `record` (`record class`) | `record struct` |

```quiz 01M1P5HK4GPQVBXMBD2YG3WE0R
You need an immutable data-holder passed around a lot, compared by its contents, and you do *not*
want per-copy value semantics. Which declaration fits?

- [x] `record` — a reference type with generated value equality
  > A `record class` keeps reference-copy semantics while comparing by content, which is exactly this brief.
- [ ] `struct` — a value type compared by its fields
  > A plain `struct` is copied on every pass, which the brief rules out, and its default equality is slow.
- [ ] `class` — a reference type compared by content
  > A plain `class` compares identity, not content, unless you hand-write every equality member.
- [ ] `ref struct` — a value type confined to the stack
  > A `ref struct` is a stack-only tool for spans, not a general data-holder passed and stored freely.
```

## What `record` generates for you

Declaring a `record` makes the compiler emit, from the record's fields and positional parameters, a
whole equality and printing suite you would otherwise write by hand: `Equals`, `GetHashCode`, `==`
and `!=`, an implementation of `IEquatable<T>`, a `ToString` that prints the members, and a `with`
expression for non-destructive mutation.

```csharp
record Point(int X, int Y);

var a = new Point(1, 2);
var b = a with { Y = 9 };   // a is untouched; b is a new Point(1, 9)
bool same = a == new Point(1, 2);   // true — compared by value, not identity
```

`with` copies the record and overrides just the named members, which is how you "mutate" an immutable
value: you make a changed copy rather than editing in place. This is the reach-for-it reason to pick a
record over a class — you get value semantics and readable output for free, and you never desync
`Equals` and `GetHashCode` by editing one and forgetting the other.

```quiz 01M1P5HK4GMHJ0K6NCMGW54D4X cloze
A `record`'s `with` expression produces a {{copy}} of the record with the named members changed,
leaving the original {{unchanged}} — non-destructive mutation.
```

## The senior detail: generated equality beats reflection

Here is the mechanical point that separates a memorised answer from an understood one. A plain
`struct` you never gave an `Equals` to still *has* one — `ValueType.Equals`, the default structural
comparison — but it works by **reflection**: it walks the type's fields at run time to compare them,
which is slow enough to matter for a struct used as a dictionary key or compared in a hot loop.

A `record` (class or struct) does not fall back to reflection. The compiler generates an `Equals` and
`GetHashCode` that compare **every field and property directly**, member by member, with no run-time
type-walking — and it wires up `IEquatable<T>` so hash-based collections call the strongly-typed,
allocation-free path. So a `record struct` is the way to get value equality on a value type *without*
paying the reflection cost, and naming that trade — "the record generates the comparison the plain
struct would have done reflectively" — is the senior-level answer to "how does a record's equality
differ from a struct's?"

```quiz 01M1P5HK4GQGGV1P1EPQJW6ZP7
Why is a `record struct`'s equality faster than the default `Equals` on an equivalent plain `struct`?

- [x] The compiler generates direct field-by-field comparison, avoiding run-time reflection
  > The record's generated `Equals` compares members directly, whereas `ValueType.Equals` walks fields reflectively.
- [ ] It compares object identity, which is a single reference check
  > Value types have no identity to compare, and a record struct compares by value, not by reference.
- [ ] It caches the hash code so equality never recomputes anything
  > No such caching is generated; the speed comes from skipping reflection, not from caching.
- [ ] It skips comparing some fields to save time
  > It compares every field and property — it is just faster because the comparison is generated, not reflective.
```

## In an interview

Lead with the two axes: "`class` versus `struct` picks storage and copy semantics; `record` versus
plain picks whether the compiler writes value equality." Then place the four: a `record class` for
immutable reference-typed data compared by content, a `struct` for small short-lived values, a
`record struct` when you want value layout *and* value equality without the reflection tax, and a
plain `class` when identity is the point (an entity with a lifetime, not a value). The follow-up is
almost always the reflection detail above — that is where the question is really aimed.

Primary source worth reading in full: the .NET reference on
[records](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/records).
