---
id: 01M1YQ54TKFNXPJNEBE5Z3R7ZX
title: A reading order for the coding round
topic:
  - coding-interviews
  - big-o-notation
  - hash-maps
  - stacks
  - equality-and-hashing
---

Everything the vault holds for the coding screen and the two coding rounds, in the order that makes
each note land — first what the round actually grades on top of a correct answer, then the notation
and the one data structure that most answers turn on, then the C# equality probe that a senior coding
round reliably reaches for. The vault carries no reading order of its own — `prerequisites` is a graph
and there are no lesson numbers — so this is one path through that graph, and where a note disagrees
with this page the note wins.

The thing to hold before starting: in a senior coding round **the algorithm is usually not the point.**
The prompt is often the same one a mid-level candidate gets, and a clean, correct, silent solution is a
*down-level* signal. So this path spends almost no time on exotic algorithms and most of it on the two
things the round is really scoring — the reasoning you say out loud around a solution you can already
write, and a small base of fundamentals (complexity, hash maps, equality) fluent enough to be automatic
under pressure. Read [[the-senior-coding-signal]] first and the rest of the path reads as "the base the
signal is spent on"; skip it and the fundamentals below look like the point, which is the mid-level
reading of the round.

## The order

| # | Read | Scope | Why here |
|---|------|-------|----------|
| 1 | [[what-senior-means-as-a-level]] | Concept | The master lens, shared with every round and not about coding at all: "senior" is a scope claim — ownership of ambiguity, leadership, end-to-end delivery. It is the prerequisite the note at step 2 records, and it is why the same easy prompt levels differently. Read first and the coding round resolves into "prove the scope on top of a correct answer" |
| 2 | [[the-senior-coding-signal]] | Concept | What the round grades that correctness does not: narrate the approach *before* you code (which is also the cure for the mission's freezing failure mode), state the time-and-space trade-off unprompted, enumerate edge cases without being asked, and say how you would test it. It prerequisites step 1 and is the hub the whole path hangs off — everything below is a fundamental this note tells you to *spend* out loud. It also covers the code-review round, so that station needs no step of its own |
| 3 | [[big-o-notation-basics]] | Concept | The language the step-2 trade-off is stated in. You cannot "give time and space complexity unprompted" without the notation cold: why constants drop, the shapes worth knowing (`O(1)`, `O(log n)`, `O(n)`, `O(n log n)`, `O(n²)`), and reading cost off a loop's structure. Read before the tools so the tools have a vocabulary to be measured in |
| 4 | [[hash-map-lookup-cost]] | Concept | The single most common move in the round, and the canonical trade the signal is about: a nested search becomes a lookup, collapsing `O(n²)` to `O(n)` for `O(n)` memory. It prerequisites step 3 because the whole payoff is stated in growth. Learn *why* the lookup is `O(1)` on average — and where it degenerates — so the trade you narrate is a defended decision, not a memorised reflex |
| 5 | [[the-equals-and-gethashcode-contract]] | .NET | The moment you lean on hash maps, the senior probe is "what makes a valid key." The contract in one implication — equal objects must return equal hash codes, so you override the pair together and hash only immutable fields. C#-specific in its method names, universal in its rule |
| 6 | [[why-a-mutable-key-corrupts-a-dictionary]] | .NET | The canonical senior equality probe, because it has a single mechanical answer that is right or wrong: mutate a hash-feeding field on a live key and the entry is filed in its old bucket while every lookup searches the new one — present, counted, unreachable. It prerequisites both step 5 and step 4, which is exactly why it is last: it is the two of them collided into one war story |

Steps 1–2 are the round; steps 3–6 are the base it is spent on. If you are short on time, 2 and 4 are the
irreducible pair — the signal you are graded on, and the one tool most answers turn on — but read in this
order the base arrives already framed as something to narrate rather than something to merely know.

## Practice checkpoints

The reading is the smaller half; the round is a performance, so the practice is solving *out loud* against
the disciplines in step 2. Place the Problems like this:

- **After step 4**, drill the hash-map trade on [[two-sum]] and [[contains-duplicate]] — both are the exact
  `O(n²)`→`O(n)` collapse the lesson describes, one returning a pair of indices and one a membership answer.
  Do not just solve them: narrate the brute force and its cost, say the trade as you make it ("linear memory
  to drop the inner scan"), list the edge cases (empty, one element, no pair, duplicates, overflow on the
  sum), and name the tests — that rehearsal *is* the point of these easy problems.
- **Alongside them**, [[valid-parentheses]] widens the base past hash maps to a second structure, the
  [[stacks|stack]]: "most recent opener, first" is LIFO, and the easy-to-forget edge case (a leftover opener
  at the end) is exactly the kind you practise surfacing unprompted.

There is no separate code-review Problem, and that is not a gap: [[the-senior-coding-signal]] folds that
round in, and the practice for it is the same habit read in reverse — narrate what you read, name the bug
*and* its class, and separate a correctness defect from a style preference.

## Look this up rather than reading it

- [[csharp-collections-for-interviews]] — which BCL type to reach for when the whiteboard says "use a map"
  or "use a set", and what each costs (`Dictionary` vs `HashSet` vs the sorted and priority variants,
  `TryGetValue` over `ContainsKey`-plus-indexer). This is a table you *scan* while choosing a structure
  mid-problem, not prose you read through, which is why it is not a step above.

## The .NET-specific half, stated plainly

Four of the six steps are language-independent: the senior signal (1–2), Big-O (3), and the hash-map trade
(4) are true in any language and any interview. **Two are .NET-specific — steps 5 and 6, the equality
pair** — because `Equals`/`GetHashCode`, `Dictionary`, and the exact corruption mechanics are C# names for
a contract every language with hash-based collections carries in its own vocabulary. The *rule* transfers
completely; the spelling does not:

| Ecosystem | The same contract | Note |
|---|---|---|
| Java | `equals()` and `hashCode()`, overridden together; `HashMap` / `HashSet` | The closest mirror — the contract wording is nearly identical, and a mutable key strands its entry the same way |
| Python | `__eq__` and `__hash__`; `dict` / `set` | Defining `__eq__` without `__hash__` makes the type *unhashable* — the language enforces "override both" by refusing to key on a half-done pair at all |
| C++ | `operator==` (or a `KeyEqual`) plus a `std::hash` specialisation; `std::unordered_map` / `unordered_set` | Equality and hashing are two separate template arguments you must supply for a custom key type |
| JavaScript | `Map` / `Set` compare object keys by **reference identity** and cannot be customised | The custom-key pattern does not exist — you serialise to a string key instead, which is a real difference to name rather than a `GetHashCode` equivalent to find |

The claim that survives the language: **a hash-based collection keys on a hash and confirms with equality,
so equal things must hash equally and a key's hash must not change while it is in use** — whatever the two
methods are called.

## The night before

[[coding-interviews-cheat-sheet]] for the graded signal, [[big-o-notation-cheat-sheet]] for the growth
shapes, [[hash-maps-cheat-sheet]] for the default tool, and [[equality-and-hashing-cheat-sheet]] for the
key contract. A reading order is for the fortnight before; a cheat sheet is for the morning of.
