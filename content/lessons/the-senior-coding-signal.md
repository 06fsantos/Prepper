---
id: 01M1YH8FT10D0YRVN77J8BSGZ6
title: The senior coding signal — narrate, weigh trade-offs, enumerate edge cases, and test
topic:
  - coding-interviews
prerequisites:
  - what-senior-means-as-a-level
---

In a senior coding round the algorithm is usually not the point. The prompt is often the *same*
one handed to a mid-level candidate — invert a tree, find the two numbers that sum to a target,
detect a cycle — and a clean, correct, working solution delivered in silence is a
[[what-senior-means-as-a-level|down-level]] signal, because it proves the skill without proving
the scope. The senior bar sits on top of correctness, not in place of it: it grades what you say
*around* the solution. So the thing to rehearse until it is automatic is not more exotic
algorithms — it is the narration, the trade-off, the edge cases, and the test, wrapped around
problems you can already solve.

This is also the round where the mission's third failure mode bites hardest. Going quiet under
pressure reads, to an interviewer, exactly like being stuck — and the fix and the senior signal
are the *same act*: thinking out loud. Narrating your approach is simultaneously how you avoid
freezing and how you earn the level, which is why it is worth over-practising the talk track when
the algorithm itself already comes easily.

## Narrate the approach before you write a line

The first move is to say what you are going to do before you do it: restate the problem in your
own words, name the approach you are reaching for and *why*, and only then start typing. A senior
candidate who says "the brute force is a nested loop, `O(n²)`, but I can trade
[[hash-maps|a hash set]] for a single pass and get it to `O(n)` — let me do that" has, in one
sentence, shown they see the solution space rather than the first thing that compiles. The junior
move is to start coding the moment the problem is understood; the senior move is to make the plan
audible so the interviewer can follow — and redirect — your reasoning before you have sunk ten
minutes into a dead end.

This is not narration for its own sake. It gives the interviewer something to grade and gives
*you* a place to go when your mind blanks: there is always a brute force, and saying it out loud
buys the seconds to see the better one. A stated `O(n²)` baseline you then improve is a far
stronger signal than jumping straight to the optimal answer as if it were obvious — because the
job is reasoning under ambiguity, and reasoning you keep in your head cannot be scored.

```quiz 01M1YH8FT370Z1F8J07JC9H8M7
Given "return the first non-repeating character in a string," a candidate immediately writes a
correct single-pass solution using a frequency dictionary, silently, in two minutes. At the
senior bar, how does that read?

- [x] Strong on skill, thin on signal — the reasoning stayed unspoken
  > Correct and efficient, but the round grades the *thinking*, and none of it was audible. The
    fix is not a harder problem — it is narrating the brute force, the trade-off, and why the
    dictionary, out loud, so there is something to score.
- [ ] A clear senior pass — optimal and fast is the whole bar
  > Optimal-and-fast is the mid-level bar. Correctness is necessary at every level, so it cannot
    be the thing that separates a senior candidate; the trade-off reasoning is.
- [ ] A weak answer — a senior should have found a faster algorithm
  > Single-pass is already optimal here; there is no faster algorithm to find. The gap is in what
    was *said*, not in what was computed.
- [ ] Unrateable — the problem was too easy to level anyone
  > The same easy problem levels fine, because it is graded on the reasoning surfaced around it,
    which is exactly what was missing.
```

## Say the trade-off in the language of cost

Every non-trivial choice buys something and costs something, and naming both is the habit the
round is really testing — the same [[system-design-is-graded-on-process|trade-off reasoning]] the
design round grades, at the scale of a single function. The hash-set pass above cuts time from
`O(n²)` to `O(n)` and *spends* `O(n)` memory to do it; sorting the input first might remove the
need for extra space but costs `O(n log n)` time and mutates the caller's array. State the
[[big-o-notation|complexity]] of what you wrote in both time and space, unprompted, and say which
axis you optimised and why it is the right one for the stated constraints. "I chose the hash set
because the problem says nothing about memory pressure but does say `n` is large, so I'd rather
spend space than a quadratic scan" is an engineering argument. "Here's my solution" is a guess
that happened to be right.

```quiz 01M1YH8FT3T3SZ2Z57EKYT11W6 cloze
The senior coding bar sits on top of {{correctness}}, not in place of it. Four habits earn it:
narrate the approach {{before}} you code; state the {{time and space}} complexity of your
solution unprompted and say which you optimised; enumerate {{edge cases}} without being asked;
and say how you would {{test}} it. Under pressure, the first habit doubles as the cure for going
quiet.
```

## Enumerate the edge cases before you are asked

Reaching for the boundary conditions unprompted is one of the clearest senior tells, because it
shows you think about the input space rather than the happy path. Before or just after coding,
walk the degenerate inputs out loud: the empty collection, the single element, `null` or an
absent value, duplicates, integer overflow on a sum, a negative number where you assumed
positives. In C# specifically, this is where you decide whether the method throws
`ArgumentNullException`, returns a sentinel, or leans on the nullable-reference-type annotations
to make "can this be null" a compile-time question — and *saying* which and why is the signal.
An interviewer who has to prompt "what if the array is empty?" has caught a gap; one who watches
you list it yourself has seen the habit.

## Say how you would test it, and prefer clear over clever

Two moves close the loop. First, describe the tests you would write — not "it works", but the
specific cases: the happy path, each edge case you just enumerated, and a property that must hold
(the output is sorted, the count is conserved, the result round-trips). Naming tests demonstrates
the ownership the level claims: you are responsible for the code being *right*, not merely for it
running once in front of the interviewer. Second, when the clever one-liner and the readable
ten-liner are both correct, prefer the readable one and say why — a dense LINQ chain that
recomputes on every access, or a bit-twiddling trick that saves nothing measurable, is a
[[what-senior-means-as-a-level|down-level]] move dressed as sophistication. Maintainable code
that the next engineer can change is the senior product; clever code that only you can read is a
liability you are advertising.

## The code-review round is this shift, institutionalised

Some loops now include a **code-review round**: you are handed a few hundred lines of
deliberately flawed code and asked to find the defects. It is the same shift made explicit —
from "can you produce a correct solution" to "can you reason about and improve code someone else
wrote", which is a [[what-senior-means-as-a-level|leadership]] act in a way that writing fresh
code is not. The behaviours are the mirror image of the ones above: narrate what you read, name
the bug *and* the class of bug (this off-by-one, and the missing test that would have caught it),
weigh the fix against its blast radius, and separate "this is a correctness bug" from "this is a
style preference." Treat it as the round telling you plainly what every coding round is grading
underneath.

```quiz 01M1YH8FT3YA0Y50JENH20NMT7 recall
You solve a coding problem correctly and efficiently with five minutes to spare, and the
interviewer says "looks good." You could sit in silence. What should you do with the time to
convert a mid-level pass into a senior one?

> Use the time to surface everything the clean solution left unsaid — because that unsaid part is
> exactly what the senior bar scores. Concretely, out loud:
>
> - **State the complexity both ways.** "This is `O(n)` time and `O(n)` space; I traded the extra
>   space to avoid a quadratic scan, which is the right call given the constraints — but if memory
>   were tight I'd sort first for `O(n log n)` time and `O(1)` extra space instead." Now the choice
>   is a defended decision, not a lucky default.
> - **Walk the edge cases against the code.** Empty input, one element, `null`, duplicates,
>   overflow — point at where each is handled, and name any I decided to reject with an exception
>   versus handle silently.
> - **Name the tests.** The happy path, each edge case, and an invariant that must hold. "That's
>   what I'd put in the test file before calling this done."
> - **Offer the alternative and why I didn't take it.** Showing I saw the other design and chose
>   against it on its trade-offs is the ownership-of-ambiguity signal the level is about.
>
> The interviewer's "looks good" is an invitation to demonstrate the scope, not a finish line.
> Silence forfeits the points the correct answer just earned you the room to score.
```

## What to take away

The senior coding round grades the *reasoning around* a correct solution, not a harder algorithm.
Narrate the approach before you write it — which is also the cure for freezing; state the time and
space [[big-o-notation|trade-off]] and which axis you optimised; enumerate the edge cases
unprompted; say how you would test it; and prefer maintainable code over clever code, out loud and
on purpose. The code-review round is that same standard made into a station of its own. The
algorithm is table stakes; the audible reasoning is the level.

Worth reading in full: the
[levels.fyi SWE level framework](https://www.levels.fyi/blog/swe-level-framework.html) — it draws
the mid/senior scope lines that make "same prompt, different bar" concrete, and it is where the
code-review round shows up as an explicit expression of the shift from writing code to reasoning
about it.
