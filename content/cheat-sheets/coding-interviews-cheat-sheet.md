---
id: 01M1YH8FT3HQCSJR1A1GQZA02F
title: Coding interviews — cheat sheet
topic: coding-interviews
---

- **Same prompt, higher bar.** The algorithm is often the mid-level one. The senior signal sits
  *on top of* a correct solution, not in place of it — it grades the reasoning around the code.
- **Narrate before you code.** Restate the problem, name the brute force and its cost, then the
  improvement and *why*. This is also the cure for freezing: thinking out loud and going quiet
  are opposites, and the interviewer cannot tell "stuck" from "silent."
- **State the trade-off in cost.** Give time *and* space complexity unprompted; say which axis you
  optimised and why it fits the constraints. "Spent `O(n)` space to avoid a quadratic scan" is an
  argument; "here's my solution" is a guess.
- **Enumerate edge cases unprompted.** Empty, single element, `null`, duplicates, overflow. Being
  prompted "what if it's empty?" is a caught gap; listing them yourself is the habit.
- **Say how you'd test it.** Name the cases — happy path, each edge, an invariant that must hold.
  Owning correctness, not just a passing run, is the level's claim.
- **Prefer clear over clever.** A dense trick that saves nothing is a down-level move dressed up.
  Maintainable code the next engineer can change is the senior product.
- **The code-review round is this, explicit.** Find defects in others' code — reasoning about and
  improving someone else's work is the leadership act the whole round is really grading.

The reach-for-it signal: you finished early and the interviewer said "looks good." That is an
invitation, not a finish line — spend the time surfacing complexity, edge cases, tests, and the
alternative you rejected. Silence forfeits the points a correct answer earned you room to score.

Full treatment: [[the-senior-coding-signal]].
