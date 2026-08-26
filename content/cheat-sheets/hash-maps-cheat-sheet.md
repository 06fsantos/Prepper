---
id: 01M0Z7K6MVGA9BFFPHSVDPWK30
title: Hash maps — cheat sheet
topic: hash-maps
---

- Lookup, insert, delete: `O(1)` average, `O(n)` worst case when every key collides.
- Insert is `O(1)` **amortised** — resizes rehash everything and cost `O(n)`, rarely.
- Load factor = entries ÷ buckets. Crossing the threshold triggers the resize.
- Ordering is not guaranteed and must never be relied on.
- Keys must have consistent `GetHashCode` and `Equals`. A mutable key mutated after
  insertion is lost.

The reach-for-it signal: a nested loop whose inner half is a search. Trading `O(n)` memory
for dropping the inner scan turns `O(n²)` into `O(n)`.

Full treatment: [[hash-map-lookup-cost]].
