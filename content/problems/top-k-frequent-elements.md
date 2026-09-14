---
id: 01M2G2Y0AVF0GPVYP2PFJBAV98
title: Top K Frequent Elements
kind: coding
difficulty: medium
topic:
  - heaps
  - hash-maps
practices:
  - common-coding-patterns
source:
  - https://leetcode.com/problems/top-k-frequent-elements/
  - https://neetcode.io/problems/top-k-elements-in-list
---

## Prompt

Given an array of integers and a number `k`, return the `k` values that occur most often. The answer
is guaranteed to be unique, and it may be returned in any order.

## Constraints

- 1 ≤ `nums.length` ≤ 10^5.
- Each value is in the range -10^4 to 10^4.
- `k` is in the range 1 to the number of distinct values in `nums`.
- The set of `k` most frequent elements is unique.

## Hints

1. You need each value's frequency before you can rank anything. What structure counts occurrences in
   one pass?
2. Sorting all the distinct values by frequency answers it, but sorts more than the `k` you need. What
   do you actually have to keep on hand?
3. A structure that holds only the `k` best seen so far — evicting the weakest whenever it overflows —
   never sorts the long tail you are going to throw away.

## Solution

Two [[common-coding-patterns|patterns]] in sequence: a [[hash-maps|hash-map]] counting pass, then a
[[heaps|heap]] to pull the top `k` off the counts. Count every value's frequency in one linear pass,
then feed the distinct `(value, frequency)` pairs into a min-heap keyed by frequency, capped at size
`k` — push each pair, and the moment the heap grows past `k`, pop, which discards the least frequent
seen so far. Whatever survives is the `k` most frequent, because anything more frequent than the
current `k` best would have evicted one of them rather than being evicted itself.

The cap is the point of the pattern: sorting all `m` distinct counts is `O(m log m)`, but a heap of
size `k` is `O(m log k)`, which is a real saving when `k` is much smaller than the number of distinct
values. C#'s `PriorityQueue<TElement, TPriority>` is a min-heap, so keying on frequency and dequeuing
on overflow removes the *lowest* frequency, which is exactly what a top-`k` cap wants.

```csharp
public int[] TopKFrequent(int[] nums, int k) {
    var counts = new Dictionary<int, int>();
    foreach (int n in nums)
        counts[n] = counts.GetValueOrDefault(n) + 1;   // one-pass frequency count

    var heap = new PriorityQueue<int, int>();           // min-heap keyed by frequency
    foreach (var (value, freq) in counts) {
        heap.Enqueue(value, freq);
        if (heap.Count > k) heap.Dequeue();             // over the cap: evict the least frequent
    }

    var result = new int[k];
    for (int i = 0; i < k; i++) result[i] = heap.Dequeue();
    return result;
}
```

## Complexity

`O(m log k)` time, where `m` is the number of *distinct* values — the counting pass is `O(n)` over the
input, and each of the `m` pairs costs `O(log k)` against a heap that never exceeds size `k`. `O(m)`
space for the count map, plus `O(k)` for the heap. This beats the `O(m log m)` of sorting all the
counts whenever `k` is well below `m`.

## Follow-ups

- Bucket sort by frequency indexes into an array of size `n` and reads the top `k` off the high end in
  `O(n)` — no heap, no log factor. When is that the better answer?
- The values arrive as an unbounded stream and you must keep the current top `k` at all times. What do
  you hold, and what does each new element cost?
- What changes if `k` can be as large as the number of distinct values?
