---
id: 01M0Z900000000000000000904
title: Median of two sorted arrays
topic:
  - interviewing
kind: coding
difficulty: hard
practices:
  - hash-map-lookup-cost
---

## Prompt

Given two sorted arrays, return the median of the two of them combined.

## Solution

Binary search the shorter array for the partition that splits both into halves of equal
size.

## Complexity

`O(log min(m, n))` time, `O(1)` space.

## Variants

An H2 the contract has no name for. It is the author's, so it renders as they wrote it.
