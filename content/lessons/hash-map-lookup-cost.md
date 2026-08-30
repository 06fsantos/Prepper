---
id: 01M0Z7K6MVF280WCYA4RX0JP85
title: The cost of a hash map lookup
topic:
  - hash-maps
prerequisites:
  - big-o-notation-basics
---

The sentence "hash map lookup is `O(1)`" is true often enough to plan around and false
often enough to be worth understanding. This lesson is about the gap.

## The average case

A lookup hashes the key, reduces the hash to a bucket index, and reads that bucket. All
three steps are independent of how many entries the map holds, which is where the `O(1)`
comes from. Nothing is scanned.

That claim rests on the buckets being roughly evenly occupied. The map maintains this by
resizing: once the load factor — entries divided by buckets — crosses a threshold,
it allocates a larger bucket array and rehashes everything into it. The resize is `O(n)`,
but it happens rarely enough that the *amortised* cost of an insert stays constant.

## The worst case

If every key hashes to the same bucket, the map degenerates into a linked list and lookup
becomes `O(n)`. This is not a theoretical concern — it is a denial-of-service vector, and
it is why runtimes seed their string hashes randomly per process.

```quiz 01M0Z7K6MVWXZ4M68CH7HN1JC7
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Constant time, one scan
  > Nothing is scanned unless buckets collide. See [[hash-maps]].
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```

## What this buys you in an interview

The reason to reach for a hash map is almost always the same: you have a nested loop that
is searching for something, and the inner search can become a lookup. That collapses
`O(n²)` to `O(n)` at the cost of `O(n)` memory — see [[two-sum]] for the canonical
instance of the trade.

Say the trade out loud when you make it. "I will spend linear memory to drop the inner
scan" is the sentence an interviewer is listening for.
