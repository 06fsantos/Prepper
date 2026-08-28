---
id: 01M0Z900000000000000001409
title: LRU cache
topic:
  - hash-maps
kind: coding
difficulty: medium
practices:
  - cache-eviction
  - robin-hood-hashing
  - linear-probing
---

## Prompt

Build a cache with a fixed capacity that evicts the least recently used entry.

## Solution

A hash map into the nodes of a doubly linked list.

## Complexity

Constant time per operation.
