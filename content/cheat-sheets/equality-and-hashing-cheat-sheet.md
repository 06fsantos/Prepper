---
id: 01M1P5FTXEQD4EM4WSPJ77RYTH
title: Equality and hashing — cheat sheet
topic: equality-and-hashing
---

- **The contract:** equal objects must return equal hash codes. So override `Equals` and
  `GetHashCode` **together**, never one alone.
- The reverse is not required: two unequal objects **may** share a hash code — that is a collision,
  resolved by `Equals`. A hash is a bucket hint, not an id.
- **Hash only from immutable fields.** A hash must not change while the object is a key.
- **Mutable key = stranded entry.** The hash is fixed once at insert; mutate a hash-feeding field and
  lookups compute a new hash, search a different bucket, and never reach the entry — still present,
  still counted, unreachable. `Equals` is only consulted inside the bucket the hash chose.
- **`==` vs `Equals`:** `==` is a static operator bound at **compile time** to the declared type;
  `Equals` is virtual, dispatched at **run time** on the actual type. For a reference type, `==`
  defaults to identity even after you override `Equals` — overload `operator ==` for them to agree.
- **`IEquatable<T>`:** strongly-typed `Equals(T)`, no boxing; generic collections prefer it over the
  `object`-based overload.
- **`record` / `record struct`:** generate value-based `Equals`, `GetHashCode`, `==`/`!=`, and
  `IEquatable<T>` over all members — the boilerplate-free coherent set.
- `GetHashCode` is **not** unique, **not** stable across processes or runs — never persist it.

The reach-for-it signal: any type you put in a `Dictionary` or `HashSet`, or compare with `==` after
overriding `Equals` — check the pair moves together and the hash comes from fields that cannot change.

Full treatment: [[why-a-mutable-key-corrupts-a-dictionary]], with the contract in
[[the-equals-and-gethashcode-contract]] and the operator split in
[[equals-versus-the-equality-operator]].
