---
id: 01M0Z900000000000000000021
title: What a hash map lookup costs
topic:
  - hash-map
---

A lookup hashes the key straight to its bucket, so the average case is constant time.

```quiz 01M0Z900000000000000000022
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Constant time, one scan
  > Nothing is scanned unless buckets collide. See [[collision-handling]].
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```

The lesson's own prose links to [[hash-map]], and nothing outside the fence mentions
collisions.
