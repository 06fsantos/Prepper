---
id: 01M214CYK0ZFR81PM5E54KKECJ
title: Number of Islands
kind: coding
difficulty: medium
topic:
  - graphs
practices:
  - common-coding-patterns
source:
  - https://leetcode.com/problems/number-of-islands/
  - https://neetcode.io/problems/count-number-of-islands
---

## Prompt

Given a rectangular grid whose cells are each marked as land or water, return how many islands it
contains. An island is a maximal group of land cells joined horizontally or vertically, and
everything off the edges of the grid counts as water.

## Constraints

- 1 ≤ rows, columns ≤ 300.
- Each cell is either land (`'1'`) or water (`'0'`).
- Cells touching only at a corner (diagonally) are *not* connected.

## Hints

1. If you find a land cell, every land cell reachable from it by up/down/left/right steps belongs to
   the same island. How would you visit all of them at once?
2. Scan the grid; each time you meet a land cell you have not accounted for, that is one new island.
3. When you start on that cell, mark every cell of its island as seen so the outer scan does not
   count it a second time.

## Solution

This is [[graphs|graph traversal]] over a grid — the [[common-coding-patterns|BFS/DFS pattern]],
where the neighbours of a cell are its four orthogonal adjacencies. Walk the grid cell by cell.
Each time you hit a land cell, increment the island count and then *flood* that island: visit every
land cell reachable from it and mark it as visited so it is never counted again. The outer scan then
only ever starts a flood at a cell belonging to an island not yet seen.

Marking visited *in place* — sinking each land cell to water as it is visited — avoids a separate
visited structure, at the cost of mutating the input; say that trade out loud, and offer a separate
`bool[,]` visited set if the caller must keep the grid. The recursion below is DFS; a queue would
make it BFS with the same `O(rows·cols)` cost.

```csharp
public int NumIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.Length; r++)
        for (int c = 0; c < grid[0].Length; c++)
            if (grid[r][c] == '1') { count++; Sink(grid, r, c); }
    return count;
}

private void Sink(char[][] grid, int r, int c) {
    if (r < 0 || c < 0 || r >= grid.Length || c >= grid[0].Length || grid[r][c] != '1')
        return;                       // off-grid, water, or already sunk
    grid[r][c] = '0';                 // mark visited by sinking it
    Sink(grid, r + 1, c); Sink(grid, r - 1, c);
    Sink(grid, r, c + 1); Sink(grid, r, c - 1);
}
```

## Complexity

`O(rows·cols)` time — every cell is examined by the outer scan once and sunk by a flood at most
once. `O(rows·cols)` space in the worst case: for one grid that is entirely land, the DFS recursion
stack (or a BFS queue) can hold on the order of every cell.

## Follow-ups

- The grid is far too large to fit in memory at once. How would you count islands in a stream of
  rows?
- What changes if diagonal neighbours also connect cells?
- How would you return the *size* of the largest island instead of the count?
