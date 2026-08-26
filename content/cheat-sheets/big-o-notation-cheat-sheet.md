---
id: 01M0Z7K6MV3WV5VQ3A7F286MST
title: Big-O notation — cheat sheet
topic: big-o-notation
---

Growth rates, cheapest first: `O(1)`, `O(log n)`, `O(n)`, `O(n log n)`, `O(n²)`, `O(2ⁿ)`.

- Constants and lower-order terms are dropped. `3n + 17` is `O(n)`.
- Nesting is not the rule — **total iterations** is. A two-pointer scan has two loops and
  is `O(n)`.
- Halving each step is `O(log n)`. Halving inside a pass over `n` is `O(n log n)`.
- `O(n log n)` is the floor for comparison sorting.
- Space is quoted separately from time, and both are usually asked for.

Big-O misleads at small `n`, because the dropped constants are the whole cost there.

Full treatment: [[big-o-notation-basics]].
