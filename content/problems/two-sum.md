---
id: 01M0Z7K6MVKS85Z4G5YRXEZJVJ
title: Two Sum
kind: coding
difficulty: easy
topic:
  - hash-maps
practices:
  - hash-map-lookup-cost
source:
  - https://leetcode.com/problems/two-sum/
  - https://neetcode.io/problems/two-integer-sum
---

## Prompt

Given an array of integers and a target, return the indices of the two entries that sum
to the target. Exactly one such pair exists, and an entry may not be used twice.

## Constraints

- 2 ≤ array length ≤ 10⁴
- Values and target fit in a 32-bit signed integer.
- Exactly one valid answer exists.

## Hints

1. The brute force is a nested loop. What is the inner loop actually *doing*?
2. It is asking "have I already seen `target - current`?" — that is a membership question.
3. A [[hash-maps|hash map]] answers membership in constant time. What would you store in
   it, and what would you look up?

## Solution

Walk the array once. At each entry, ask the map whether the complement has already been
seen; if it has, the answer is that entry's index and this one. Otherwise record the
current value against its index and continue.

Storing *after* the lookup is what stops an entry pairing with itself.

```csharp
public int[] TwoSum(int[] nums, int target) {
    var seen = new Dictionary<int, int>();
    for (var i = 0; i < nums.Length; i++) {
        var complement = target - nums[i];
        if (seen.TryGetValue(complement, out var j)) {
            return [j, i];
        }
        seen[nums[i]] = i;
    }
    return [];
}
```

## Complexity

`O(n)` time — one pass, with a constant-time lookup inside it. `O(n)` space for the map,
which in the worst case holds every entry but the last.

This is the trade [[hash-map-lookup-cost]] describes, in its smallest form: linear memory
spent to delete the inner scan.

## Follow-ups

- What changes if the array is sorted? (Two pointers, `O(1)` space.)
- What if more than one pair is valid and all are wanted?
- What if the array does not fit in memory?
