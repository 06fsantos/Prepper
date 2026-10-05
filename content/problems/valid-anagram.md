---
id: 01M12KJJW115BKNJZXGYN5G118
title: Valid Anagram
kind: coding
difficulty: easy
topic:
  - hash-maps
practices:
  - hash-map-lookup-cost
source:
  - https://leetcode.com/problems/valid-anagram/
  - https://neetcode.io/problems/is-anagram
---

## Prompt

Given two strings, decide whether the second is a rearrangement of the first — the same
characters, each appearing the same number of times, in any order. Return `true` or `false`.

## Constraints

- 1 ≤ length of either string ≤ 5 × 10⁴
- Both strings are lowercase English letters.

## Hints

1. Two strings of different lengths can never be a rearrangement of one another. That is one
   line, and it removes a whole class of input.
2. "The same characters, the same number of times" is a claim about *counts*, not about
   order. What would you have to build to compare counts?
3. Sorting both strings would work. What does it cost, and what would you have to give up to
   beat it?

## Solution

Compare the two strings by character count rather than by content. Walk the first string
building a count per character, then walk the second decrementing; if a count ever goes
negative, or a character appears that was never counted, the second string has something the
first does not. Lengths being equal, a clean pass means every count landed back at zero.

The length check first is not just an optimisation — it is what lets the second pass get away
with only looking for negatives.

```csharp
public bool IsAnagram(string s, string t) {
    if (s.Length != t.Length) return false;

    var counts = new Dictionary<char, int>();
    foreach (var c in s) {
        counts[c] = counts.GetValueOrDefault(c) + 1;
    }

    foreach (var c in t) {
        if (!counts.TryGetValue(c, out var count) || count == 0) return false;
        counts[c] = count - 1;
    }

    return true;
}
```

## Complexity

`O(n)` time — two passes, each doing a constant-time [[hash-maps|map]] operation per
character. `O(k)` space, where `k` is the size of the alphabet: the map holds one entry per
*distinct* character, so with the constraint above it never exceeds 26 regardless of `n`.

That bound is why the counting approach beats sorting's `O(n log n)` here — the same trade
[[hash-map-lookup-cost]] describes, except the memory it spends is capped by the alphabet
rather than by the input.

## Follow-ups

- What changes if the strings are Unicode rather than lowercase ASCII?
- How would you group a whole list of words into sets of anagrams?
- What if you had to answer this for many pairs drawn from the same fixed dictionary?
