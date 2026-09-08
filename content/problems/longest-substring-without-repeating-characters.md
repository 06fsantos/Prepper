---
id: 01M214CYD6QQYG1QKD9JHKBFB2
title: Longest Substring Without Repeating Characters
kind: coding
difficulty: medium
topic:
  - data-structures-and-algorithms
practices:
  - common-coding-patterns
source:
  - https://leetcode.com/problems/longest-substring-without-repeating-characters/
  - https://neetcode.io/problems/longest-substring-without-repeating-characters
---

## Prompt

Given a string, return the length of the longest run of consecutive characters that contains no
repeated character.

## Constraints

- 0 ≤ string length ≤ 5·10⁴.
- Characters may be letters, digits, symbols, or spaces.
- The run must be contiguous — a subsequence with gaps does not count.

## Hints

1. A brute force checks every contiguous run for duplicates. What work does re-checking overlapping
   runs repeat?
2. Keep a range over the string and remember which characters it currently holds.
3. When the incoming character is already inside the range, advance the range's start until it is
   not — never move the start backwards.

## Solution

This is the [[common-coding-patterns|sliding-window pattern]]. Maintain a window `[left, right]`
holding a set of the characters currently inside it. Extend `right` one character at a time; if that
character is already in the set, the window has a duplicate, so drop characters from `left` — pulling
each out of the set — until the duplicate is gone. After each extension the window is valid again, so
its size is a candidate for the best seen.

Because `left` only ever moves forward and each character enters and leaves the set at most once, the
whole thing is one pass despite the inner loop. `HashSet<char>.Add` returning `false` for a member
already present is what drives the shrink without a separate lookup.

```csharp
public int LengthOfLongestSubstring(string s) {
    var seen = new HashSet<char>();
    int best = 0, left = 0;
    for (int right = 0; right < s.Length; right++) {
        while (!seen.Add(s[right]))       // duplicate: shrink from the left until it fits
            seen.Remove(s[left++]);
        best = Math.Max(best, right - left + 1);
    }
    return best;
}
```

## Complexity

`O(n)` time — `right` advances `n` times and `left` advances at most `n` times in total, so the
inner loop is amortised, not nested. `O(k)` space, where `k` is the size of the character alphabet:
the set never holds more than one of each distinct character.

## Follow-ups

- Return the substring itself, not just its length.
- What if you want the longest run with *at most two* distinct characters instead of zero repeats?
- If the alphabet is fixed and small (say ASCII), can you replace the set with an array and drop the
  hashing?
