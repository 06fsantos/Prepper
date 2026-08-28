---
id: 01M0Z900000000000000000902
title: Writing a binary search
topic:
  - binary-search
---

Everything below the first heading folds; this paragraph does not, because a reader who
cannot see anything cannot choose a section.

## The invariant

The answer is always inside `[lo, hi]`, and every step shrinks that range.

### Why half-open beats closed

`[lo, hi)` has one fewer off-by-one in it, because the empty range is `lo == hi`.

#### The one that still bites

Computing the midpoint as `(lo + hi) / 2` overflows in a fixed-width integer.

### Where the loop ends

When the range is empty, `lo` is the insertion point.

## Common mistakes

Returning `mid` from a lower-bound search is the one everybody writes first. The definition
is in [[binary-search]], and it is written here and nowhere else in the note.
