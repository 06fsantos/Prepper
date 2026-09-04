---
id: 01M1P5FTXEQ9YD9B2DMJ3FKYZ6
title: The Equals and GetHashCode contract
topic:
  - equality-and-hashing
prerequisites:
  - value-types-versus-reference-types
---

`Equals` and `GetHashCode` are two methods on `object`, and they are bound by a contract that
most bugs in this area come from breaking. The one sentence to lead with: **if two objects are
equal, they must return the same hash code — so you can never override one without overriding the
other.** The reverse is not required, and that asymmetry is the whole thing.

`Equals` answers "are these two objects the same?" `GetHashCode` returns an `int` that is a
*bucket hint* — a hash-based collection uses it to decide which bucket an object belongs in, then
falls back to `Equals` to confirm a match inside that bucket. The [`Object.GetHashCode`
documentation](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode) states the
contract precisely, and it is worth reading in full because the failures downstream are all
consequences of these few rules.

## The three rules

1. **Equal objects must have equal hash codes.** If `a.Equals(b)` is true, then
   `a.GetHashCode() == b.GetHashCode()` must also be true. This is the rule that forces you to
   override both methods together.
2. **A hash code must not change while the object is in use as a key.** The collection computed a
   bucket from the hash *once*, at insert; if the hash later changes, the object is now filed under
   a bucket the lookup will never visit.
3. **The hash need not be unique.** Two unequal objects are *allowed* to collide on the same hash
   code — that is just a bucket collision, resolved by `Equals`. Aiming for uniqueness is not the
   job; aiming for a good *spread* is.

```quiz 01M1P5FTXE7X4N0V4ZEAA8E2BW
Which direction does the contract actually require?

- [x] Equal objects must return equal hash codes
  > This is the binding rule. The reverse — equal hashes implying equal objects — is not required, because collisions are legal and resolved by `Equals`.
- [ ] Equal hash codes must mean the objects are equal
  > Two unequal objects may share a hash code; that is an ordinary collision, not a contract violation. `Equals` breaks the tie.
- [ ] Unequal objects must return unequal hash codes
  > A hash is not an identity. Collisions are expected and handled; demanding uniqueness misreads what the hash is for.
```

## Why overriding Equals obliges overriding GetHashCode

Say you override `Equals` on a `class` so that two orders with the same id compare equal, but you
leave `GetHashCode` as inherited. The inherited `object.GetHashCode` is based on *reference
identity*, so your two "equal" orders get **different** hash codes. Now they land in different
buckets. A `Dictionary` or `HashSet` checks the bucket the hash points to and never even reaches
the `Equals` you carefully wrote — the two objects it would call equal never meet.

The result is a collection that behaves incoherently: `dict.ContainsKey(order)` returns `false` for
a key that is, by your own definition, present. This is why the compiler and analyzers warn when you
override one and not the other, and why the safe move is to always write them as a pair.

```quiz 01M1P5FTXEG0CG8MPESDT2D661 cloze
If you override `Equals` but leave `GetHashCode` inherited, two equal objects can hash to
{{different}} buckets, so a hash-based collection consults `Equals` in the {{wrong}} bucket and
never finds the match.
```

## Derive the hash only from immutable fields

Rule 2 — a hash must not change while the object is a key — has a direct consequence for *which*
fields you feed into `GetHashCode`: **only the ones that never change.** Microsoft's own guidance is
to compute the hash from immutable state. If you hash a mutable field and then mutate it while the
object sits in a dictionary, you have moved the object's "correct" bucket out from under the entry
that is already filed. (The mechanics of that failure are the subject of
[[why-a-mutable-key-corrupts-a-dictionary]].)

In practice this means: prefer immutable types for keys; if a type must be mutable, hash only the
fields that form its stable identity, and if it has none, it has no business being a key. The modern
tools make this easy — `HashCode.Combine(field1, field2)` builds a well-distributed hash from the
chosen fields, and a `record` generates a correct `Equals`/`GetHashCode` pair over all its members
for you.

```quiz 01M1P5FTXEHWJ6VP7Q8FJR4JYY
You are writing `GetHashCode` for a type used as a dictionary key. Which fields should feed it?

- [x] Only fields that never change while the object is a key
  > A hash that shifts under a live key files it in a bucket lookups no longer visit. Immutable identity fields keep the bucket stable.
- [ ] Every field the type has, for the best possible spread
  > Spread matters, but hashing a mutable field trades correctness for it — the key drifts to a bucket the collection cannot reach.
- [ ] A single incrementing counter unique to each instance
  > That breaks rule one: two equal objects would then hash differently and never compare equal inside a collection.
```

## In an interview

State the contract as a single implication — equal implies equal-hash — and then name the two
consequences an interviewer is really after: you override the pair together, and you hash only
immutable fields. If asked *why* the pair must move together, walk the bucket path out loud: the
collection hashes first to pick a bucket, and only calls `Equals` inside it, so a wrong hash means
the right `Equals` is never reached. Mention that `GetHashCode` is a bucket hint and not an id — it
is not unique, not stable across processes, and leaning on it for persistence or security is a red
flag.

Primary source worth reading in full: the [.NET reference on
`Object.GetHashCode`](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode),
whose remarks section is the contract itself.
