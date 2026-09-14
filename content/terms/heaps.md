---
id: 01M2G2PHQ6974M5T09QV3M4A7M
title: Heaps
topic:
  - data-structures-and-algorithms
---

A binary heap is a complete [[trees|tree]] kept in an array where every parent orders before its
children, so the smallest (or largest) element is always at the root — the structure behind a
**priority queue**. Peeking the extreme is [[big-o-notation|O(1)]] and pushing or popping is
`O(log n)`, which is what makes a heap the default answer to a **top-K** question: keep a heap of
size `k` and let everything worse fall out.
