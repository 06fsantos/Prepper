---
id: 01M0Z900000000000000000803
title: What a hash map lookup costs
topic:
  - hash-maps
  - complexity
---

A lookup hashes the key, indexes into the bucket array, and walks the bucket it lands in.
The walk is what the average case is about: with a load factor near one the bucket holds a
handful of entries, so the walk is short and the whole lookup is constant time.

> Constant time is a statement about growth, not about speed. A hash lookup can be slower
> than a binary search over eight elements and still be the constant-time one.

Two topics on purpose: this note is filed under both, and under neither more than the other.
