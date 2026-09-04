---
id: 01M1NJP99GPWSTMN6114FTK8SD
title: Value and reference types — cheat sheet
topic: value-and-reference-types
---

- **Value type** (`struct`, `enum`, all built-ins bar `string`/`object`): the variable *is* the
  instance. **Reference type** (`class`, `interface`, delegate, array, `string`): the variable holds
  a reference to an instance on the heap.
- Assignment/argument/return **copies the instance** for a value type, the **reference** for a
  reference type. A struct with a reference field copies the reference — the pointee is shared.
- Storage is about the *variable*, not the type: a value type is stored **inline** wherever it
  lives — stack for a local, heap for a field of a class, heap when boxed. Retire "value types live
  on the stack."
- Default equality: reference types compare **identity**, value types compare **fields**
  (reflection-based, slow — override `Equals`/`GetHashCode` or use `record struct`).
- **Boxing** bridges the two: a value type wrapped in a heap `object`, implicitly. A hidden
  allocation; generics (`List<T>`) avoid it. Unboxing is an explicit cast to the *exact* type.

The reach-for-it signal: "why did that other variable change?" (shared reference), or unexplained
allocations on a value-only path (boxing).

Full treatment: [[value-types-versus-reference-types]], then [[boxing-and-unboxing]] and
[[nullable-value-types]].
