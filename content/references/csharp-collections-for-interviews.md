---
id: 01M0Z7K6MVBHM319YKVNXS030P
title: C# collections for interviews
topic:
  - hash-maps
---

Which BCL type to reach for when the whiteboard says "use a map" or "use a set", and what
each one costs.

| Need | Type | Lookup | Notes |
|---|---|---|---|
| Key → value | `Dictionary<K,V>` | `O(1)` avg | Unordered. `TryGetValue` over `ContainsKey` + indexer. |
| Membership | `HashSet<T>` | `O(1)` avg | `Add` returns `false` if already present. |
| Sorted by key | `SortedDictionary<K,V>` | `O(log n)` | Red-black tree. |
| Sorted, bulk-loaded | `SortedList<K,V>` | `O(log n)` | Array-backed; inserts are `O(n)`. |
| FIFO / LIFO | `Queue<T>` / `Stack<T>` | — | BFS and DFS respectively. |
| Priority | `PriorityQueue<T,P>` | — | Min-heap. Not stable. |

Two things that cost people points:

- **`Dictionary` iteration order is not insertion order** and is not guaranteed at all.
  If the answer depends on order, this is the wrong type.
- **`TryGetValue` hashes once**; `ContainsKey` followed by the indexer hashes twice.

Costs come from [[hash-map-lookup-cost]] and the growth rates in
[[big-o-notation-cheat-sheet]].
