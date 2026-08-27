---
id: 01M0Z900000000000000000603
title: What a hash map lookup costs
topic:
  - hash-maps
---

A lookup hashes the key straight to its bucket, so the average case is constant time.

```quiz 01M0Z900000000000000000604
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Constant time, one scan
  > Nothing is scanned unless buckets collide. See [[collision-handling]].
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```

Resizing is what keeps the buckets evenly occupied, and it is not free.

```quiz 01M0Z900000000000000000605 cloze
A hash map trades {{memory}} for lookup speed, and degrades to {{O(n)}} when every key
lands in one bucket. A `{{literal}}` inside a code span is not a hole.
```

The worst case is a denial-of-service vector, which is why hashes are seeded per process.

```quiz 01M0Z900000000000000000606 recall
Explain why an insert is O(1) amortised rather than O(1).

> Crossing the load factor triggers a resize that rehashes every entry, which is O(n). It
> happens rarely enough that the cost spread over all inserts stays constant.
```

A quiz body that has to show code needs a longer outer fence.

~~~~quiz 01M0Z900000000000000000607
What does this print for a key that is present?

```java
System.out.println(map.get("k"));
```

- [x] The value, in constant time
  > The key hashes straight to its bucket.
- [ ] Nothing, it does not compile
  > `get` is defined on every map.
~~~~

Nothing outside the first fence mentions collisions.
