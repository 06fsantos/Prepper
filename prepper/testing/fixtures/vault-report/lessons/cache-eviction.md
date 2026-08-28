---
id: 01M0Z900000000000000001405
title: Choosing what to evict
topic:
  - hash-maps
  - eviction
---

A cache that never evicts is a map. What it evicts is the whole of what makes it a cache,
and the cost of finding the victim depends on [[load-factor-tuning]].

The layouts that make eviction cheap are [[robin-hood-hashing]], [[open-addressing]] and
[[linear-probing]].
