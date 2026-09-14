---
id: 01M2G2Y0ASNKD66YZ0WEJDR299
title: Binary Tree Level Order Traversal
kind: coding
difficulty: medium
topic:
  - trees
practices:
  - common-coding-patterns
source:
  - https://leetcode.com/problems/binary-tree-level-order-traversal/
  - https://neetcode.io/problems/level-order-traversal-of-binary-tree
---

## Prompt

Given the root of a binary tree, return its node values grouped by depth: one list per level, ordered
from the root's level down to the deepest, and left to right within each level. An empty tree returns
an empty list.

## Constraints

- The number of nodes is in the range 0 to 2000.
- Each node's value is in the range -1000 to 1000.
- The tree is not guaranteed to be balanced.

## Hints

1. The output is grouped by level, so you need to know where one level ends and the next begins. What
   structure hands you nodes in the order you first reach them?
2. Before you start draining a level, how many nodes are in it? Capture that count first.
3. Process exactly that many nodes, collecting their values and enqueueing their children — those
   children are precisely the next level.

## Solution

This is [[trees|tree]] traversal by breadth — the [[common-coding-patterns|BFS pattern]] — because
"one list per level" is asking for nodes in the order a queue produces them. The one move that makes
it clean is capturing the queue's size *before* the inner loop: at the top of each outer iteration the
queue holds exactly the current level, so freezing that width and draining precisely that many nodes
keeps the levels apart. Everything each of those nodes enqueues is the next level, and the outer loop
picks it up on its next turn.

DFS can produce the same grouping by threading a depth through the recursion and indexing into the
result, but BFS matches the shape of the question, so reach for it and say why.

```csharp
public IList<IList<int>> LevelOrder(TreeNode root) {
    var levels = new List<IList<int>>();
    if (root is null) return levels;              // empty tree: no levels

    var queue = new Queue<TreeNode>();
    queue.Enqueue(root);
    while (queue.Count > 0) {
        int width = queue.Count;                  // freeze this level's size before draining
        var level = new List<int>();
        for (int i = 0; i < width; i++) {
            TreeNode node = queue.Dequeue();
            level.Add(node.val);
            if (node.left is not null) queue.Enqueue(node.left);
            if (node.right is not null) queue.Enqueue(node.right);
        }
        levels.Add(level);
    }
    return levels;
}
```

## Complexity

`O(n)` time, where `n` is the number of nodes — each is enqueued and dequeued exactly once, and its
value read once. `O(n)` space: the result holds every value, and the queue peaks at the width of the
widest level, which for the bottom level of a full tree is about `n/2`.

## Follow-ups

- Return the levels bottom-up instead of top-down. What is the cheapest change?
- Return a zigzag order — left-to-right on one level, right-to-left on the next.
- Return just the rightmost node of each level (the "right side view"). What do you keep from each
  level's drain?
