---
id: 01M214CXHPQJ608PBGAY5VV9YH
title: Common coding patterns and when to reach for each
topic:
  - data-structures-and-algorithms
  - coding-interviews
prerequisites:
  - big-o-notation-basics
---

A senior coding round is not won by knowing more algorithms — [[the-senior-coding-signal]] is
clear that the skeleton is table stakes and the audible reasoning around it is the level. But
there is a small, fixed vocabulary of patterns that most prompts reduce to, and the win is having
each one so automatic that recognising it and writing its skeleton costs you no working memory,
leaving all of it for the narration you are actually graded on. This is that vocabulary — eight
patterns, each with its *tell* (the phrase in a prompt that should trigger it), its cost, and a
skeleton to make reflexive. Learning these eight cold is a different act from grinding a large
problem list for coverage: breadth-for-coverage is the mid-level reading of the round, and this is
the fluency the [[coding-interviews|round]] rewards spending.

## Two pointers

**Tell:** the input is **sorted** (or can be), and the answer is a pair or a partition — "find two
that sum to X", "is it a palindrome", "move zeroes to the end". Two indices walk toward each other,
and each comparison rules out a whole side, so no nested scan is needed.

**Cost:** `O(n)` time, `O(1)` extra space.

```csharp
public int[] TwoSumSorted(int[] nums, int target) {
    int lo = 0, hi = nums.Length - 1;
    while (lo < hi) {
        int sum = nums[lo] + nums[hi];
        if (sum == target) return [lo, hi];
        if (sum < target) lo++;   // too small: raise the floor
        else hi--;                // too big: lower the ceiling
    }
    return [];
}
```

## Sliding window

**Tell:** the **longest or shortest contiguous run** — substring, subarray — that satisfies a
property. A window `[left, right]` grows on the right and shrinks from the left the moment it
breaks the property, so every element enters and leaves at most once.

**Cost:** `O(n)` time, `O(k)` space for whatever the window tracks.

```csharp
public int LongestUnique(string s) {
    var seen = new HashSet<char>();
    int best = 0, left = 0;
    for (int right = 0; right < s.Length; right++) {
        while (!seen.Add(s[right]))       // duplicate: shrink until it fits
            seen.Remove(s[left++]);
        best = Math.Max(best, right - left + 1);
    }
    return best;
}
```

```quiz 01M214CXQ98ZZB6D6JNZXTAK6G
A prompt asks for the length of the longest contiguous substring with no repeated character.
Before writing anything, which pattern does that phrasing point at?

- [x] Sliding window — grow and shrink a contiguous range
  > "Longest contiguous run satisfying a property" is the sliding-window tell almost verbatim:
    extend the window on the right, and shrink from the left the moment the property breaks.
- [ ] Binary search — halve a sorted or monotonic space
  > Binary search needs a sorted array or a monotonic answer to bisect; a longest-run question
    over an arbitrary string offers neither.
- [ ] Two pointers — converge from the two ends of sorted input
  > Converging pointers need sorted input and answer a pair-or-partition question, not the size
    of a best contiguous run.
- [ ] Graph traversal — visit each reachable node exactly once
  > There is no graph here: a string is linear, and nothing is being reached through edges.
```

## Binary search

**Tell:** a **sorted** array, or any question whose answer lives on a **monotonic** axis you can
probe ("smallest capacity that finishes in time"). Each step discards half the range. The two
things that go wrong are the loop's bounds and the mid calculation — write them the same way every
time.

**Cost:** `O(log n)` time, `O(1)` space.

```csharp
public int Search(int[] nums, int target) {
    int lo = 0, hi = nums.Length - 1;     // inclusive bounds
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;     // this form cannot overflow
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

## Hash maps (recap)

**Tell:** a **membership or seen-before** question — "have I already met the complement", "count
occurrences", "group by a key". This is the round's most common move, and the whole of
[[hash-map-lookup-cost]]: a nested search becomes a constant-time lookup, collapsing `O(n²)` to
`O(n)` for `O(n)` memory. [[two-sum]] is its smallest form.

```csharp
var seen = new Dictionary<int, int>();
for (int i = 0; i < nums.Length; i++) {
    if (seen.TryGetValue(target - nums[i], out int j)) return [j, i];
    seen[nums[i]] = i;                 // store after the lookup, or an entry pairs with itself
}
```

## Stacks (recap)

**Tell:** **most-recent-first** — matching brackets, undo, "next greater element". A
[[stacks|stack]] is LIFO, and the easy-to-forget edge case is the leftover at the end, exactly the
kind [[valid-parentheses]] drills.

```csharp
var stack = new Stack<char>();
foreach (char c in s) {
    if (c is '(' or '[' or '{') stack.Push(c);
    else if (stack.Count == 0 || !Matches(stack.Pop(), c)) return false;
}
return stack.Count == 0;               // a leftover opener means unbalanced
```

```quiz 01M214CXWVAZSEA18XFW591FHF cloze
State the cost before you write the code, because the round grades it. Binary search runs in
{{O(log n)}} time because each step discards half the range. A graph traversal that touches every
node and edge once is {{O(V+E)}}. A hash-map membership pass spends {{O(n)}} space to drop a
quadratic scan to `O(n)` time.
```

## Graph traversal — BFS and DFS

**Tell:** anything reachable through **edges** — a grid of connected cells, a dependency chain, a
network. Both BFS (a queue, shortest path in an unweighted graph) and DFS (recursion or an explicit
stack) visit each node once; the load-bearing part is the **visited set** that stops you revisiting.
The grid form below marks cells in place, and [[number-of-islands]] is the canonical drill.

**Cost:** `O(V+E)` time — every node and edge once — and `O(V)` space for the visited set and the
frontier. See [[graphs]].

```csharp
void Dfs(char[][] grid, int r, int c) {
    if (r < 0 || c < 0 || r >= grid.Length || c >= grid[0].Length || grid[r][c] != '1')
        return;                        // out of bounds, or water, or already visited
    grid[r][c] = '0';                  // mark visited by sinking the cell
    Dfs(grid, r + 1, c); Dfs(grid, r - 1, c);
    Dfs(grid, r, c + 1); Dfs(grid, r, c - 1);
}
```

## Trees (DFS/BFS)

**Tell:** a **binary tree** and a question about depth, levels, or a root-to-leaf path — "level
order", "maximum depth", "is it balanced", "lowest common ancestor". A [[trees|tree]] is a
[[graphs|graph]] with no cycles, so the same two traversals apply: DFS (recursion, natural for depth
and path questions) and BFS (a queue, natural for anything asked *by level*). The grid DFS above is
this pattern on a graph with four neighbours; a tree just has named `left`/`right` ones.

**Cost:** `O(n)` time — every node once — and `O(h)` space for the recursion stack or the widest
level, where the height `h` is `O(log n)` balanced and `O(n)` degenerate.

```csharp
IList<IList<int>> LevelOrder(TreeNode root) {
    var levels = new List<IList<int>>();
    if (root is null) return levels;
    var queue = new Queue<TreeNode>();
    queue.Enqueue(root);
    while (queue.Count > 0) {
        int width = queue.Count;           // fix this level's size before draining it
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

The canonical drill is [[binary-tree-level-order-traversal]]: the tell is "one list per level", and
capturing `width` before the inner loop is the move that keeps the levels apart.

```quiz 01M2G2PHQ6RXEBCTPRFC596X7V
A prompt gives you a binary tree and asks for its node values **grouped by depth — one list per
level, top to bottom**. Which traversal writes that out most directly?

- [x] BFS with a queue, draining one level at a time
  > "Grouped by depth, one list per level" is the breadth-first tell: fix the queue's size at the
    start of each level, drain exactly that many nodes, and enqueue their children for the next.
- [ ] DFS by recursion, one branch to the bottom first
  > DFS reaches the deepest node before its siblings, so the levels come out interleaved; it can be
    made to work by threading a depth through, but it is not the direct fit BFS is.
- [ ] Two pointers converging from both ends
  > Two pointers needs a linear, ordered sequence with two ends to walk toward each other; a tree
    branches, so there are no such ends.
- [ ] Binary search over the node values
  > Binary search needs a sorted or monotonic axis to halve; an arbitrary binary tree's values are
    not globally ordered, and the question is about shape, not lookup.
```

## Heaps / top-K

**Tell:** the **K largest, smallest, or most frequent**, or a stream where you repeatedly need the
current extreme — "top K", "K closest points", "merge K sorted lists". Sorting the whole input to
read the top off costs `O(n log n)`; a [[heaps|heap]] capped at size `k` answers the K question in
`O(n log k)` and never holds more than `k` items. Often it follows a hash-map counting pass, which
is what makes it the natural next step after the recap above.

**Cost:** `O(n log k)` time, `O(k)` space — cheaper than the `O(n log n)` full sort whenever `k` is
much smaller than `n`, which is the whole point of the pattern.

```csharp
int[] TopKFrequent(int[] nums, int k) {
    var counts = new Dictionary<int, int>();
    foreach (int n in nums)
        counts[n] = counts.GetValueOrDefault(n) + 1;   // hash-map pass first
    var heap = new PriorityQueue<int, int>();           // min-heap keyed by frequency
    foreach (var (value, freq) in counts) {
        heap.Enqueue(value, freq);
        if (heap.Count > k) heap.Dequeue();             // over the cap: drop the least frequent
    }
    return heap.UnorderedItems.Select(x => x.Element).ToArray();
}
```

The drill is [[top-k-frequent-elements]] — the canonical hash-map-then-heap combo, and the reason to
narrate *why a min-heap of size `k`* rather than sorting all the counts.

```quiz 01M2G2PHQ6ENSVE3XX5YWYX6EH cloze
You need the k most frequent values out of `n`. Sorting everything to read the top off costs
{{O(n log n)}}, but keeping a min-[[heaps|heap]] capped at size `k` gets there in {{O(n log k)}}
while ever holding only `k` items: push each candidate and {{pop}} the moment the heap grows past
`k`, so the weakest is what falls out.
```

## What to take away

Eight patterns cover most of what a coding round asks: two pointers and sliding window over a
sequence, binary search over a sorted or monotonic space, hash maps for membership, stacks for
most-recent-first, BFS/DFS over a graph, the same two traversals over a tree, and a heap for the
top K. Make each one's tell and skeleton automatic so the
recognition is free — and then spend the working memory you saved on narrating the trade-off,
enumerating the edge cases, and naming the tests, which is the [[the-senior-coding-signal|thing the
round is really scoring]].

```quiz 01M214CY2BM3HX6Y50WGDTH5XD recall
A friend suggests you grind all 150 problems on a popular list before your senior loop. Given how
this round is graded, what is the sharper use of the same time?

> Learn the *fixed core* of patterns cold — the eight here — and then practise the ones you already
> recognise **out loud**, rehearsing the narration, the trade-off, the edge cases, and the tests.
>
> Grinding 150 for coverage optimises breadth of algorithms, which is the mid-level bar: at the
> senior bar the prompt is usually one you can already solve, and a clean silent solution is a
> down-level signal. The 150 is worth *borrowing* a handful from as narration reps, not completing
> for its own sake. Automatic pattern-recognition frees the working memory; the audible reasoning
> is what the freed memory is spent on, and what actually earns the level.
```

Worth reading in full: the [NeetCode roadmap](https://neetcode.io/roadmap), which organises the
common patterns as a dependency graph — a good map of the fixed core, to be mined for a few
representative problems rather than completed end to end.
