# 05: The link graph — four typed edge kinds, rendered in context

**What to build:** The whole-vault index of links, computed once at build, with edges **typed by
the field they sit in and never by inline syntax**:

| source | edge |
|---|---|
| `prerequisites` | *prerequisite-of* |
| `topic` | *about* |
| `practices` | *practices* |
| body wikilink | *relates-to* (untyped) |

Typed edges render **inline, in context**, where the reader is already looking: prerequisites as
a "Read first" block at the top of a Lesson, their inverse as a "This unlocks" rail at the bottom,
and `practices` in both directions so a Lesson lists the Problems that drill it and a Problem
names the Lesson it drills. Untyped edges collect in **one backlinks panel**, labelled by the
source note's `title` — never by the alias, which was fitted to another sentence — and sorted
alphabetically so the list stays stable as the vault grows.

**Nothing is ever gated.** The prerequisite DAG is a build-time integrity property, not a runtime
permission system: no Lesson, no Problem, and no quiz is ever locked, so prerequisites stay a
signal and a re-read is never obstructed.

The build gives a page and a graph node to **Library content only** (`lesson`, `reference`,
`problem`, `term`, `cheat-sheet`). Workshop notes are neither.

**Blocked by:** 04

**Status:** resolved

- [x] All four edge kinds are computed, and an edge's type comes from the field it was written in
- [x] A Lesson shows a "Read first" block naming its prerequisites
- [x] A Lesson shows a "This unlocks" rail naming the Lessons that list it as a prerequisite
- [x] A Lesson lists the Problems that practise it; a Problem names the Lesson it drills
- [x] Untyped body links collect in one backlinks panel, labelled by the source note's `title` and sorted alphabetically
- [x] A link written with an alias is still labelled by the source note's `title` in that panel
- [x] No Library page renders a lock, a gate, or a disabled link on the basis of prerequisites
- [x] Workshop notes produce neither a graph node nor an edge
- [ ] Workshop notes produce no page — **deferred to 06**

**The page half of the Workshop boundary is 06's.** Removing a note from the corpus is a
Quartz **filter** ([02, mechanism 2](02-spike-the-unrun-mechanisms.md)), and a filter drops
a note from `content[]` *before any emitter sees it* — which is exactly why 03 disabled
`remove-draft`. Validation is an emitter over the whole corpus, and `research` and `record`
have required fields of their own, so a filter added here would silently stop validating
every Workshop note in the vault. Reconciling those two is the ticket where the boundary is
guarded, not this one. What 05 owns and delivers is the graph half: a Workshop note is
neither a node nor the source of an edge, so it never renders in a rail or a backlinks
panel, whatever page it still has.
