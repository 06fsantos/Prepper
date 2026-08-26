---
id: 01M0Z7K6MV5KT6FTA11N33T110
title: Big-O notation, from first principles
topic:
  - big-o-notation
---

[[big-o-notation|Big-O]] answers one question: as the input gets bigger, what happens to
the work? Not *how long does this take* — that depends on the machine, the compiler, and
what else is running — but *how does the time change when `n` changes*.

## Why constants are dropped

An algorithm that does `3n + 17` steps and one that does `n` steps are both `O(n)`,
because for large enough `n` the `3` and the `17` stop mattering next to the growth. This
feels like cheating the first few times. It is not: the constants are real, but they are
properties of the implementation, and Big-O is deliberately a statement about the
*algorithm*.

The practical consequence is that Big-O can mislead at small `n`. An `O(n²)` insertion
sort beats an `O(n log n)` merge sort on twenty elements, which is why real sort
implementations switch strategies below a threshold.

## The shapes worth knowing cold

- **`O(1)`** — the work does not depend on `n`. An array index. A [[hash-maps|hash map]]
  lookup, on average.
- **`O(log n)`** — each step halves the remaining work. Binary search.
- **`O(n)`** — one pass. Summing an array.
- **`O(n log n)`** — the comparison-sorting floor. Merge sort, heap sort.
- **`O(n²)`** — a nested pass over the same input. The naive pairwise scan.

## Reading a loop

The habit to build is reading cost off the structure rather than deriving it. A single
loop over `n` is `O(n)`. A loop inside a loop, both over `n`, is `O(n²)`. A loop that
halves its range is `O(log n)`. A loop over `n` containing a halving loop is
`O(n log n)`.

Where this gets interesting is when the inner loop's bound is not `n`. Two nested loops
whose *total* iterations across the whole outer loop is `n` — a two-pointer scan, say —
is `O(n)`, not `O(n²)`. Counting total work beats counting nesting depth.
