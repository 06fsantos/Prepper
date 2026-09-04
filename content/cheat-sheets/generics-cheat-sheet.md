---
id: 01M1P5GD8HAFJ8J05FJNSZDX44
title: Generics — cheat sheet
topic: generics
---

- **Reified, not erased.** C# generics keep the type argument at run time (Java erases to `Object`).
  `typeof(List<int>)` is a real distinct type with its own method table.
- **One body for references, one per value type.** Every reference is pointer-sized, so all reference
  type arguments share one JIT-compiled instantiation; each value type gets its own specialised body.
- **`List<int>` never boxes.** The value-type instantiation stores `int`s inline, like `int[]` — the
  whole reason generics replaced `ArrayList`.
- **Constraints buy capability.** `where T :`
  - `class` / `struct` — reference / non-nullable value type.
  - `new()` — lets the body call `new T()`.
  - `notnull` — non-nullable (value or reference); `Dictionary`'s key constraint.
  - `IInterface` / base — call the interface's members **directly on `T`, unboxed**, no reflection.
- **`default(T)` is per instantiation:** `null` for reference types, the zeroed value for value types.
  So `T x = default` always compiles; `T x = null` does not.
- **Variance = assignment between closed generics:**
  - `out T` = covariant, output-only. `IEnumerable<out T>`: `IEnumerable<Cat>` → `IEnumerable<Animal>`.
  - `in T` = contravariant, input-only. `Action<in T>`: `Action<Animal>` → `Action<Cat>`.
  - Invariant by default (parameter used both ways, e.g. `IList<T>`).
- **Variance is reference-types-only** — it rides the shared reference-type body; value-type
  instantiations are distinct native types, so `IEnumerable<int>` is *not* `IEnumerable<object>`.

The reach-for-it signal: any "does this box / how many code bodies / is `X<Cat>` an `X<Animal>`"
question — all three answers trace back to reification.

Full treatment: [[how-generics-are-specialised-at-runtime]], then
[[generic-constraints-and-default]] and [[variance-in-generic-interfaces]].
