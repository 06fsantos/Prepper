---
id: 01M13SGR0MCCMT82G1E7XXJED7
title: Valid Parentheses
kind: coding
difficulty: easy
topic:
  - stacks
practices:
  - what-a-stack-is-for
source:
  - https://leetcode.com/problems/valid-parentheses/
  - https://neetcode.io/problems/validate-parentheses
---

## Prompt

Given a string of only the six bracket characters `()[]{}`, say whether it is well formed:
every bracket closed by one of the same type, and closed in the order it was opened.

## Constraints

- 1 ≤ string length ≤ 10⁴
- The string contains only `(`, `)`, `[`, `]`, `{` and `}`.

## Hints

1. `([)]` is invalid and `([])` is valid, so counting each kind of bracket cannot be enough.
   What does the difference depend on?
2. It depends on *order*: a closer has to answer the most recent unclosed opener.
3. "Most recent, first" is one data structure — see [[stacks]].

## Solution

Push every opener. On a closer, the top of the stack must be its matching opener: pop it and
carry on, or fail immediately if the stack is empty or the top does not match. The string is
valid when the whole of it is consumed and the stack is empty — a leftover opener is a
bracket nobody closed.

The empty check at the end is the half that is easy to forget: `(` alone never fails during
the scan.

```csharp
public bool IsValid(string s) {
    var pairs = new Dictionary<char, char> { [')'] = '(', [']'] = '[', ['}'] = '{' };
    var open = new Stack<char>();
    foreach (var c in s) {
        if (pairs.TryGetValue(c, out var opener)) {
            if (open.Count == 0 || open.Pop() != opener) {
                return false;
            }
        } else {
            open.Push(c);
        }
    }
    return open.Count == 0;
}
```

## Complexity

`O(n)` time — each character is pushed at most once and popped at most once. `O(n)` space
for the stack, worst case a string of nothing but openers.

## Follow-ups

- What if the string may contain other characters, which are simply ignored?
- What if you must return the index of the first bracket that broke the rule?
- What is the longest valid substring of an invalid string?
