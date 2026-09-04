---
id: 01M1P5HK4GV4JA4E70C9CPK2SA
title: Records, structs, and modifiers — cheat sheet
topic: records-structs-and-modifiers
---

Two independent axes: **storage/copy** (`class` vs `struct`) and **equality** (plain vs `record`).

- `class` — reference, copied by reference, **identity** equality.
- `struct` — value, **copied on every assignment/pass**, structural equality by default.
- `record` (`record class`) — reference type; compiler generates value `Equals`/`GetHashCode`/`==`/`IEquatable<T>`, `ToString`, and `with`.
- `record struct` — value type **and** generated value equality.

**The senior line:** a plain `struct`'s default `Equals` compares fields by **reflection** (slow). A
`record`/`record struct` generates **direct field-by-field** comparison — no reflection. That is the
reason to reach for `record struct` over a hand-tuned struct as a dictionary key.

`with` = non-destructive mutation: a **copy** with named members changed; original untouched.

Modifiers:

- `readonly struct` — immutable; lets the compiler **skip defensive copies** when passed by reference.
- `ref struct` — **stack-confined**, and the *one* place "lives on the stack" is an enforced rule, not
  an implementation detail (Eric Lippert). Cannot be boxed, be a class field, be captured by a lambda,
  or cross an `await`. `Span<T>` is the canonical one; `Memory<T>` is the awaitable counterpart.

Parameter modes (all pass **by reference**):

- `in` — read-only; pass a large value cheaply. **Only pays off on a `readonly struct`** — otherwise a
  defensive copy per member access erases the gain.
- `ref` — read-write; caller must initialise first.
- `out` — write obligation; callee must assign on every path (the `TryParse` pattern).

The reach-for-it signal: "class vs struct vs record — when?" and "how does a record's equality differ
from a struct's?" — answer with the two axes plus the reflection point.

Full treatment: [[class-struct-record-and-record-struct]], [[readonly-and-ref-struct]],
[[in-ref-and-out-parameters]].
