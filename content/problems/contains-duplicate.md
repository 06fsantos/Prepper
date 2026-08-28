---
id: 01M13SGR0KG08QBN3TS0571YY1
title: Contains Duplicate
kind: coding
difficulty: easy
topic:
  - hash-maps
practices:
  - hash-map-lookup-cost
source:
  - https://leetcode.com/problems/contains-duplicate/
  - https://neetcode.io/problems/duplicate-integer
---

## Prompt

Given an array of integers, say whether any value appears more than once. Return true if
some value occurs at least twice, and false if every value is distinct.

## Constraints

- 1 ≤ array length ≤ 10⁵
- Values fit in a 32-bit signed integer.

## Hints

1. The brute force compares every pair. What question is that comparison asking, over and
   over?
2. It is asking "have I seen this value before?" — a membership question, not an ordering
   one.
3. Membership in constant time is what a [[hash-maps|hash set]] is for. What has to be true
   the first time a lookup succeeds?

## Solution

Walk the array once, keeping a set of the values already seen. If a value is already in the
set, that is the duplicate and the answer is true; otherwise add it and continue. Falling
off the end means every value was distinct.

Sorting first and then scanning adjacent pairs also works and needs no extra structure, but
it costs `O(n log n)` to answer a question that never needed the order.

```csharp
public bool ContainsDuplicate(int[] nums) {
    var seen = new HashSet<int>();
    foreach (var n in nums) {
        if (!seen.Add(n)) {
            return true;
        }
    }
    return false;
}
```

`HashSet<T>.Add` returns false when the value was already present, which folds the lookup
and the insert into one hash of the key.

## Complexity

`O(n)` time — one pass, with a constant-time membership check inside it, which is the cost
[[hash-map-lookup-cost]] describes. `O(n)` space for the set, which in the all-distinct case
holds every value.

The sorting alternative inverts the trade: `O(n log n)` time for `O(1)` extra space.

## Follow-ups

- What if the array is already sorted?
- What if you must return the duplicated value, or all of them?
- What if the array does not fit in memory and arrives as a stream?
