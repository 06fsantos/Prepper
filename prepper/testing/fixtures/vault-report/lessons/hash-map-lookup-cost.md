---
id: 01M0Z900000000000000001404
title: What a hash map lookup actually costs
topic:
  - hash-maps
---

A lookup hashes the key, indexes into the bucket array, and walks the bucket.

![[bucket-diagram.png]]

Two collision strategies are worth a note of their own: [[robin-hood-hashing]] and
[[open-addressing]]. Both are kinds of [[probing]].
