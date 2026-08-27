---
id: 01M0Z900000000000000000706
title: Two answers and none
topic:
  - hash-maps
---

The first fence marks two options correct.

```quiz 01M0Z900000000000000000707
Which of these are constant time on average?

- [x] A lookup by key
  > The key hashes straight to its bucket.
- [x] An insert of a new key
  > Amortised over the resizes it triggers.
- [ ] A scan for a value
  > Values are not indexed by anything.
```

The second marks none.

```quiz 01M0Z900000000000000000708
A hash map lookup, average case, costs what?

- [ ] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```
