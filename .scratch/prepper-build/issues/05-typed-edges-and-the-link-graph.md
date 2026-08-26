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

**Status:** ready-for-agent

- [ ] All four edge kinds are computed, and an edge's type comes from the field it was written in
- [ ] A Lesson shows a "Read first" block naming its prerequisites
- [ ] A Lesson shows a "This unlocks" rail naming the Lessons that list it as a prerequisite
- [ ] A Lesson lists the Problems that practise it; a Problem names the Lesson it drills
- [ ] Untyped body links collect in one backlinks panel, labelled by the source note's `title` and sorted alphabetically
- [ ] A link written with an alias is still labelled by the source note's `title` in that panel
- [ ] No Library page renders a lock, a gate, or a disabled link on the basis of prerequisites
- [ ] Workshop notes produce neither a page nor a graph node
