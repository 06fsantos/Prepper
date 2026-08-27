---
id: 01M0Z900000000000000000702
title: Two fences nobody named
topic:
  - hash-maps
---

The first fence carries no ULID at all.

```quiz
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```

The second was typed by hand instead of minted.

```quiz 01m0z900000000000000000703
What does a resize cost?

- [x] Linear time, once
  > Every entry is rehashed into the new bucket array.
- [ ] Constant time, always
  > Rehashing has to touch every entry.
```
