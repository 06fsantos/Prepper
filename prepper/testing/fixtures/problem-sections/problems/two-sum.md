---
id: 01M0Z900000000000000000903
title: Two sum
topic:
  - interviewing
kind: coding
difficulty: easy
practices:
  - hash-map-lookup-cost
source:
  - https://leetcode.com/problems/two-sum/
  - https://www.neetcode.io/problems/two-integer-sum
---

## Prompt

Given an array and a target, return the indices of the two entries that sum to it.

## Constraints

- Exactly one valid answer exists.
- An entry may not be used twice.

## Hints

1. The brute force is a nested loop. What is the inner loop actually asking?
2. It is asking whether the complement has been seen already.
   - Membership, not ordering.
3. Store each value against the index you saw it at.

## Solution

Walk the array once, asking a [[hash-maps|hash map]] whether the complement has been seen.
Store after the lookup, so an entry cannot pair with itself.

## Complexity

`O(n)` time, `O(n)` space.

## Follow-ups

- What changes if the array is sorted?
