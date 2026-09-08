---
id: 01M214CY7P3N0G3BNKBN1DXT1T
title: Binary Search
kind: coding
difficulty: easy
topic:
  - data-structures-and-algorithms
practices:
  - common-coding-patterns
source:
  - https://leetcode.com/problems/binary-search/
  - https://neetcode.io/problems/binary-search
---

## Prompt

Given an array of distinct integers sorted in ascending order and a target value, return the index
at which the target appears, or `-1` if it is not present.

## Constraints

- 1 ≤ array length ≤ 10⁴; values and target fit in a 32-bit signed integer.
- The array is sorted ascending and all values are distinct.
- The expected running time is logarithmic in the array length — a linear scan does not meet it.

## Hints

1. You are told the array is sorted. What does one comparison against the middle element let you
   conclude about everything to one side of it?
2. If the middle is too small, the answer cannot be in the left half; if too big, not in the right.
3. Track the live range with two inclusive bounds and shrink it by half each step.

## Solution

This is the [[common-coding-patterns|binary-search pattern]] in its plainest form. Keep an
inclusive range `[lo, hi]` that is the part of the array still worth looking at. Each step reads the
middle element: if it is the target you are done; if it is smaller than the target the target must
lie to its right, so raise `lo`; otherwise lower `hi`. When the range empties the target was never
there.

Two details are where this goes wrong under pressure, so fix them once: compute the midpoint as
`lo + (hi - lo) / 2` rather than `(lo + hi) / 2`, which can overflow when the bounds are large; and
be consistent that the bounds are *inclusive*, which is what makes the loop condition `lo <= hi`
and the updates `mid + 1` / `mid - 1`.

```csharp
public int Search(int[] nums, int target) {
    int lo = 0, hi = nums.Length - 1;     // inclusive bounds
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;     // this form cannot overflow
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

## Complexity

`O(log n)` time — each step discards half the remaining range, so the range is exhausted in about
`log₂ n` steps. `O(1)` space: two indices and no allocation.

## Follow-ups

- What changes if the array may contain duplicates and you want the *first* index of the target?
- How would you find the insertion point — where the target *would* go — when it is absent?
- The array is rotated at an unknown pivot but otherwise sorted. Can you still get `O(log n)`?
