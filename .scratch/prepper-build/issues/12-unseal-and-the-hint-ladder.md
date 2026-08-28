# 12: Unseal and the hint ladder work in the browser

**What to build:** The click behaviour over 11's markup. Two things, both custom elements with no
build step.

**Unseal**: a sealed section opens **in place** so scroll position holds, and the dev can read the
complexity without the solution. The seal itself is CSS (11) — this ticket only adds the click, and
the seal must still be closed with JS disabled and when the markup is injected into the search
preview pane. That is the property worth testing hardest: **a search result never leaks a solution.**

**The hint ladder**: `## Hints` is revealed **one at a time** by a "next hint" control, so the dev
can take the smallest nudge that unblocks them rather than the whole ladder at once. The ordering
is semantic — hint one is a nudge, the last is near the answer — so revealing is strictly in order.
Hints may use JS, unlike the seal.

Seam 2, over markup produced by the build.

**Blocked by:** 11

**Status:** resolved

- [x] Clicking a sealed section's control expands it in place, with scroll position held
- [x] Opening `## Complexity` leaves `## Solution` closed, and vice versa
- [x] The sections render closed with JS disabled
- [x] A Problem injected into the search preview pane renders with its sections still sealed
- [x] "Next hint" reveals exactly one further hint per activation, in authored order
- [x] The control disappears or disables once the last hint is revealed
- [x] The seam-2 tests run against markup emitted by the build

## Comments

**Resolved.** Two behaviours, and the ticket's "both custom elements" turned out to be one
custom element and a deliberate absence.

**Unseal is the browser's, and Prepper ships no script for it.** Ticket 11 sealed with a
`<details>`, so the control the reader clicks is a `<summary>` and the open-in-place
behaviour, the independence of the two seals, and the scroll position holding are all the
element's own. A script here would have to fight the behaviour it was duplicating — and it
would be the exact script whose absence in the search preview pane the seal depends on. So
this half of the ticket is a documented decision plus the tests that pin it, including one
that runs `@quartz-community/search`'s own preview mechanism step for step: fetch the
result's page, parse it with `DOMParser` (which never runs a script), clone every
`.popover-hint`, splice the clones into a **live** Prepper page with Prepper's scripts
already running. The injected copy arrives shut, with the solution prose present in it —
sealing hides a section from the page, not from the Library.

**The hint ladder is ours**, `prepper/problems/hints.js`: one custom element,
`<prepper-hint-ladder>`, no build step. It hides every rung on upgrade and appends one
control — "Show a hint", then "Next hint", then disabled and saying "That was the last
hint". Revealing is strictly the first still-hidden rung, so it is always in authored order,
and a nested bullet arrives with the rung above it rather than costing a click of its own.
It can hide in JavaScript for the reason the seal cannot: the degraded state is every hint
on screen, which is what the vault says and what Obsidian shows. A custom element rather
than a listener because Quartz navigates as an SPA and the search pane splices in cloned
pages — both are "a tag entered the document", which is the one event the browser will
always tell a custom element about.

Quartz **extracts a plugin's inline JS into a hashed file under `static/` and minifies it**,
which is what settled how seam 2 finds Prepper's scripts among Quartz's: the `prepper-`
prefix on the tag name, a string literal, is the only part of the file that survives.

Built:

- `prepper/problems/hints.js` — the ladder's control.
- `prepper/problems/index.ts` — the `<prepper-hint-ladder>` wrapper, the control's styles,
  and the `js` external resource; plus the two paragraphs saying why one half is a script
  and the other is not.
- `prepper/testing/browser.ts` — **seam 2**: build a fixture through seam 1, load an
  emitted page into jsdom, run Prepper's scripts and none of Quartz's. `{ scripts: false }`
  is the reader with JavaScript off. `openSearchPreview` is the pane.
- `prepper/problems/browser.test.ts` — 16 tests over `problem-sections`, which needed no
  change: the fixture already carries a three-rung ladder with a nested bullet under rung
  two, and a Problem with no `## Hints` at all.
- `jsdom` and `@types/jsdom` as devDependencies, and the lockfile that follows from them.
