# 11: Problems render, sealed

**What to build:** A Problem the dev can **attempt** — its answer not in their peripheral vision.

The body contract is **named H2 headings**, matched by heading text, with the build folding the AST
on heading boundaries: `## Prompt`, `## Constraints`, `## Hints`, `## Solution`, `## Complexity`,
`## Follow-ups`. Which are required depends on the declared `kind`:

| kind | required sections |
|---|---|
| coding | `Prompt`, `Solution`, `Complexity` |
| system-design | `Prompt`, `Solution` |
| behavioural | `Prompt`, `Solution` |

`kind` is **declared, never inferred** — it is the one sub-classification the type-is-the-directory
rule cannot derive from a path. `difficulty` is compared **only within a kind**: a `hard`
behavioural question is not equivalent to a `hard` graph problem, and a mixed-kind list is never
sorted by difficulty alone.

**`## Solution` and `## Complexity` seal with CSS alone — no JS initialisation.** This is
load-bearing, not a preference: Quartz's search preview pane fetches a result's real HTML and
injects its elements, so a JS-initialised seal would render **open** there and a search result would
leak a solution. Pure CSS seals wherever the markup lands, and is correct with JS disabled.
`## Complexity` is sealed as firmly as `## Solution` — "O(n) time, O(n) space" tells the dev it is a
hash map before they have thought. The two unseal **independently**, in place. `## Follow-ups`
renders open: reading it before attempting sharpens the attempt.

Sealing is a **rendering rule of the app alone**. The vault conceals nothing, and a Problem read in
Obsidian shows everything at once, which is correct for the author.

A **pointer problem** carries `source`, an ordered list of URLs rendered as chips **labelled by
host** with nothing authored per link; the **first** is the attempt link, because that is the click
made most often. Its `## Prompt` carries a one-line paraphrase in the dev's own words, so the note
is self-describing in search and in the topic index even though the prompt lives elsewhere.

**Blocked by:** 05, 03

**Status:** resolved

- [x] The build folds a Problem body on its H2 boundaries, matched by heading text
- [x] `## Solution` and `## Complexity` emit sealed with no JS involved in the sealing
- [x] Each seals and unseals independently of the other
- [x] `## Follow-ups` renders open; `## Constraints` renders open
- [x] `## Hints` emits as an ordered ladder, one hint per top-level list item, ready for 12's control
- [x] `source` renders as chips labelled by host, and the first URL is presented as the attempt link
- [x] A mixed-kind list is never ordered by difficulty across kinds
- [x] Error: an unknown `kind` or an unknown `difficulty`
- [x] Error: a required H2 missing for the declared `kind`
- [x] Error: a `source` list with no well-formed URL on a pointer problem
