---
id: 01M0Z7K6MV03TVRN9QSK1R7FP1
title: First pass on complexity and hash maps
date: 2026-08-26
topic:
  - big-o-notation
  - hash-maps
---

Wrote [[big-o-notation-basics]] and [[hash-map-lookup-cost]], then did [[two-sum]] cold.

What actually stuck: reading cost off *total iterations* rather than nesting depth. I had
been counting `for` loops, which is why the two-pointer scan kept looking quadratic to me.

What did not: I still reached for the brute force on Two Sum first and only saw the map
after writing the nested loop out. The complement framing — "have I seen `target - x`" —
is the thing to drill, not the solution.

Next: a lesson on two pointers, since the follow-up on Two Sum went nowhere.
