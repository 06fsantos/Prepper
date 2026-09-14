---
id: 01M2G2PHQ5VHG63GMN8RKQQSA8
title: Trees
topic:
  - data-structures-and-algorithms
---

A hierarchy of nodes descending from a single root, each node holding a value and links to its
children with no cycles — the [[graphs|graph]] special case an interview reaches for most, usually
as a **binary tree**. Most tree questions are a traversal: level by level (BFS, a queue) or all the
way down one branch first (DFS, recursion or a stack), each visiting every node once at
[[big-o-notation|O(n)]] and turning on the same visited-frontier bookkeeping.
