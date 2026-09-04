---
id: 01M1P5FTXE9SFNMKR6J5G2SZWY
title: Why a mutable key corrupts a dictionary
topic:
  - equality-and-hashing
prerequisites:
  - the-equals-and-gethashcode-contract
  - hash-map-lookup-cost
---

This is the canonical senior probe on equality, because it has a single mechanical answer that is
either right or wrong. The setup: you put an object in a `Dictionary` as a key, then mutate a field
that feeds its hash code. The one-line answer an interviewer wants: **the entry is now filed in the
bucket for its old hash, but every lookup computes the new hash and searches a different bucket, so
the entry is effectively lost even though it is still in the dictionary.**

Nothing throws. Nothing is removed. The dictionary's `Count` still includes the entry. It has simply
become unreachable through the key you would use to reach it.

## The mechanism, step by step

A `Dictionary` stores an entry by computing `key.GetHashCode()` **once, at insert**, reducing that
hash to a bucket index, and placing the entry in that bucket. It never recomputes the stored key's
hash afterwards — recall from [[hash-map-lookup-cost]] that a dictionary buckets by hash and *then*
confirms the match with `Equals`. That two-step — hash to find the bucket, `Equals` to confirm — is
the whole cost model, and it is exactly what mutation breaks.

Walk it through:

```csharp
var key = new MutableKey { Id = 1 };   // hashes to, say, bucket 3
var dict = new Dictionary<MutableKey, string>();
dict[key] = "hello";                    // entry filed in bucket 3

key.Id = 2;                             // hash now points at bucket 7

dict.TryGetValue(key, out var v);       // computes new hash → looks in bucket 7 → miss
dict.ContainsKey(key);                  // false — bucket 7 has no such entry
```

The entry is sitting in bucket 3. The lookup, using the mutated key, hashes to bucket 7 and searches
there. Bucket 7 does not contain the entry, so the search reports a miss — and it never even reaches
the `Equals` call that might have matched, because `Equals` is only consulted *within the bucket the
hash chose*. The right bucket is never visited.

```quiz 01M1P5FTXE0JVTBX805Y58NF6G
An object is a dictionary key. You mutate a hash-feeding field. What has actually gone wrong?

- [x] The entry stays in the old bucket while lookups now search the new one
  > The hash was fixed at insert. Mutation moves where lookups *look*, not where the entry *sits*, so the two no longer meet.
- [ ] The dictionary throws when the key's hash changes
  > Nothing detects the change. There is no exception and no eviction — the entry just becomes silently unreachable.
- [ ] The entry is removed from the dictionary automatically
  > It is still present and still counted. It is stranded, not deleted — which is exactly what makes the bug hard to see.
```

A lookup that lands in the wrong bucket short-circuits before `Equals` is ever asked — the match is
lost not because the objects fail to compare equal, but because they are never compared at all.

## Why the hash is computed only once

You might ask: why doesn't the dictionary just rehash the stored key on every lookup and stay
correct? Because the entire value of a hash map is that a lookup is O(1) — hash the key, jump to the
bucket, done. Rehashing every stored key on every operation would defeat that, and there is no event
the dictionary could subscribe to that says "a key's fields just changed." The contract pushes the
obligation the other way: **the key promises not to change its hash.** The collection is fast
*because* it trusts that promise, and corrupts *when* the promise is broken.

This is also why the fix is never "make the dictionary smarter." The fix is to keep the promise: use
an immutable type as the key, or derive `GetHashCode` only from fields that never change — the rule
from [[the-equals-and-gethashcode-contract]]. A `record` or a key built from readonly fields cannot
drift, so the bug cannot occur.

```quiz 01M1P5FTXEKESP521A1YRPKSXS cloze
A dictionary computes a key's hash {{once}}, at insert, and never recomputes it for the stored key —
which is what keeps lookup {{O(1)}}, and also why a key that changes its hash strands its own entry.
```

## The senior framing

The trap in the junior answer is to say "the dictionary breaks" without the mechanism. The senior
answer names *which* structure holds the stale value (the bucket index derived at insert), *what*
the lookup does differently (recomputes the hash, picks a new bucket), and *why* `Equals` never
saves you (it is only called inside the chosen bucket). If pushed on the fix, do not reach for
defensive rehashing — reach for immutability, and state the underlying rule: hash only from fields
that cannot change while the object is a key.

```quiz 01M1P5FTXEKX016QBF7J7418GP recall
Without using the words "it breaks," explain to an interviewer exactly why mutating a hash-feeding
field on a live dictionary key strands the entry.

> The hash is computed once at insert and fixes the entry's bucket. Mutating a hash-feeding field
> changes what a lookup computes, so the lookup jumps to a different bucket and searches there. The
> entry is still in its original bucket, which the lookup never visits, and because `Equals` is only
> consulted inside the bucket the hash selected, the match is never even tested. The entry is present
> and counted but unreachable through that key. The fix is an immutable key, or hashing only
> never-changing fields.
```

## In an interview

Answer in three beats: filed once, looked up elsewhere, `Equals` never reached. Then close the loop
back to the contract — this is the concrete cost of rule two, that a key's hash must not change while
it is in use — and give the fix as immutability rather than cleverness. That progression, from
symptom to mechanism to the rule it violates, is the signal that you understand the machine and not
just the war story.

Primary source worth reading in full: the [remarks on
`Object.GetHashCode`](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode), which
spell out that the hash must not change while the object serves as a key and that it should be derived
from immutable fields.
