# Chrome layout — spec

Labels: `ready-for-agent`
Status: ready-for-agent

Source documents: `prepper_ux_ui_updates.md` and its accompanying board, supplied 2026-08-28.
Decisions below were settled in a grilling session on the same date; where a source document
asked for something this repo had already decided against, the resolution is recorded inline.

## Problem statement

Opening Prepper lands on the topic index, and the page is mostly empty. A ~38rem column of
topic names sits in the middle of a wide window with two Graph View panels beside it, both
nearly blank, and a footer stranded below. Collapsing the left rail swaps the page's
`grid-template-columns` outright, so the prose column jumps sideways. The app's controls --
the rail toggle, search, the theme switch, reader mode -- are scattered down the left rail
with no persistent place of their own, and the app's own name is one of them.

Three of these are defects rather than matters of taste, and one is a bug:

- **The graph panel renders twice on every page.** `grep -c 'class="graph"' public/**/*.html`
  returns 2 -- on the home page and on every Lesson -- while `@quartz-community/graph` appears
  exactly once in `quartz.config.yaml`. Layout resolution is placing it twice. The source
  document reads this as "the graph panels are almost empty"; half of that observation is one
  panel drawn twice.
- **The collapse jumps.** `prepper/sidebar` collapses by redeclaring the three-column grid,
  which moves the centre column. The requirement is that the prose not move; easing the move
  is a different and lesser thing.
- **Below 800px the left rail is the page's top strip**, unconditionally, with the collapse
  control not rendered at all -- so a phone reader gets the entire topic tree stacked above
  every article and no way to dismiss it. The source document did not notice this.

## Solution

**One persistent top bar, a left rail that collapses to nothing, no right column, and a graph
that opens on purpose.**

### The top bar

A new module, `prepper/topbar`, at Quartz's **`header` layout position** -- which this repo
does not currently use and which `DefaultFrame.tsx` renders inside `<header>`, **outside the
`.popover-hint` that the search preview clones**. That last fact is why the hazard which
forced `prepper/sidebar` into `left` rather than `beforeBody` does not apply here.

`grid-header` is the centre column's top cell, not a banner -- Quartz's grid
(`quartz/styles/variables.scss`) has no full-width row -- so the bar is `position: fixed` and
spans the viewport, and page content is offset by a `--prepper-topbar-height` token rather
than by a hard-coded number.

Contents, left to right:

| Slot   | Holds                                                              |
| ------ | ------------------------------------------------------------------ |
| Left   | Rail toggle, then the app name **Prepper**                          |
| Centre | Search                                                              |
| Right  | Theme toggle, reader mode, graph                                    |

`page-title`, `darkmode`, `reader-mode` and `prepper/search` move out of the `left` rail
into the bar; the `toolbar` layout group in `quartz.config.yaml` is retired with them.

Reader mode must hide the top bar as well as the rail. A control that hides the chrome while
the chrome's most prominent element stays on screen does not do what it says; if hiding the
bar proves unworkable, **delete the control** rather than ship it half-working.

### The rail

`prepper/sidebar` keeps its one `localStorage` key and its `<head>` script, and changes what
"collapsed" means: the rail's column goes to **zero width**, and the way back is the top bar's
toggle. Two things follow.

The control is no longer a direct child of the rail, so the collapse rule no longer has to
hide the rail's siblings by selector while sparing one of them -- the rail is hidden whole.
This is a **simplification** of what is there now, and it retires a constraint that
`prepper/sidebar`'s own documentation calls load-bearing. That documentation must be updated,
not left to contradict the code.

The collapsed state is **not an icon rail**, notwithstanding the board's caption. The rail's
contents are a topic tree of author-written names, and there is no icon for "Big-O notation";
any icon rail would be a column of identical generic glyphs, which is the failure the source
document itself names in its item 10.

Below 800px the bar stays and the rail becomes an **overlay drawer** opened by the same
toggle, rather than the page's top strip.

### The graph

Quartz's graph plugin already ships a global-graph modal, opened from the panel's expand icon
or by Ctrl/Cmd-G. That modal is promoted to the top bar's graph control, and **the rail panel
is removed entirely**. A 250px box at the edge of the page showing four nodes is the "large
container for tiny content" the source document objects to; the answer is to open the graph
deliberately, at size, not to enlarge the box.

The double-render is fixed as part of this -- and its cause identified, not merely
deduplicated, since a layout resolution that places a singly-configured plugin twice will do
it again to the next component.

### The right column

With the graph gone, `right` holds the table of contents and `prepper/edges`' backlinks panel.
The column is **removed**:

- **Backlinks move to `afterBody`**, joining "This practises" and "This unlocks".
  `prepper/edges` already argues that a typed edge belongs in context and that backlinks are
  the leftover bucket; the foot of the article, next to the other rails, is where that bucket
  belongs and where every other rail already is.
- **The table of contents becomes a sticky element in the margin**, not a 320px column.

This is what actually resolves the source document's item 7. Redistributing 320px of empty
column is not the same as not having one.

### The measure

**The ~38rem measure survives untouched on prose pages.** This is the one place the source
document is overruled.

Its item 4 asks that the central content be "substantially wider" and "not feel constrained to
a narrow central column". That observation was made against the **home page**, whose body is a
topic index -- a list scanned in two dimensions, in a column sized for one. A Lesson's column
is not empty; it is full of prose, and 38rem is about 75 characters, which is what the measure
is for ([ADR 0003](../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md), and
`prepper/reading`'s own commentary).

So the distinction is drawn by **what the page's body is**, not by which page it is:

- A page whose body is **prose** -- Lesson, Reference, Cheat sheet, Problem -- keeps the
  measure. Width reclaimed from the right column becomes margin.
- A page whose body is a **topic index** -- the generated home page, a Term page's generated
  index -- is laid out wide and multi-column. Width reclaimed becomes columns.

### Motion

`prepper/tokens` gains the full Material 3 motion role set -- the duration and easing tokens,
computed wholesale from Google's tables, the same way it already treats colour, type and
shape. Picking a motion subset by hand would make the module inconsistent with its own stated
method.

This reverses a decision recorded in ADR 0003, which must be amended rather than quietly
contradicted, and it arrives with one prohibition attached:

> **`<details>` never animates.** Not the Problem seal, not a heading fold, not a topic-tree
> fold. The architecture rests on those being shut by the HTML specification before a
> stylesheet loads and before a script runs, including inside the search preview pane. An
> eased `<details>` is a script-dependent seal wearing a costume.

Every animation must be disabled under `prefers-reduced-motion: reduce`.

### The home and Term index views

`prepper/home` imports `TopicTree` from `prepper/topics` so the two can never disagree about
what is filed where, and that stays. But "one index" was never meant to mean "identical
markup": the rail is a **jump list**, the home page is a **landing**.

The home and Term index views get the density the board draws -- a card per topic, note-type
groups as columns within it, section headings -- while the rail view stays a bare, foldable
name list. Rendered from the same data, through the same module, in two views, exactly as
`prepper/topics` already does for `sidebar` and `term-index`.

## Out of scope

- Any change to the reading surface's typography: the measure, the serif, the leading, the
  aside. ADR 0003's exemption stands and this effort does not touch it.
- `prepper/search`'s vendored CSS and `prepper/report`'s self-contained document. Both are
  outside the token system by ADR 0003 and stay outside it.
- The palette in `quartz.config.yaml`, still inert, still read only by `og-image`.

## Non-goals worth stating

The source document's item 12 asks for a visual hierarchy in which Topics is primary. On the
home page that is this effort's whole subject. On a **Lesson** the primary content is the
Lesson, and the topic index is navigation -- reading item 12 as "the topic index dominates
every page" would invert the app.

## Acceptance

- `grep -c 'class="graph"'` returns 0 in the rail on every built page, and the top bar's graph
  control opens the global graph.
- Toggling the rail does not move the article column by one pixel at any viewport width.
- The top bar is present on every laid-out page, including 404, spans the viewport, and no
  content renders underneath it.
- A Lesson's article column measures ~38rem at 1280px, 1600px and 1920px.
- The home page's topic index is multi-column and fills the available width.
- Nothing that is a `<details>` has a `transition` or `animation` on it.
- Every animation is inert under `prefers-reduced-motion: reduce`.
- Every icon-only control in the bar has an accessible name and a visible focus ring, and the
  rail toggle is operable from the keyboard.
- Below 800px the topic tree is not stacked above the article; it is a drawer.

## Tickets

Ten tracer-bullet slices, in dependency order. Each is sized for a single fresh context window
and is verifiable on its own.

| #                                                        | Ticket                                     | Blocked by |
| -------------------------------------------------------- | ------------------------------------------ | ---------- |
| [01](issues/01-one-graph-not-two.md)                      | One graph, not two                         | --         |
| [02](issues/02-the-top-bar.md)                            | The top bar (and reader mode with it)      | --         |
| [03](issues/03-the-rail-collapses-to-nothing.md)          | The rail collapses to nothing              | 02         |
| [04](issues/04-the-rail-is-a-drawer-below-800px.md)       | The rail is a drawer below 800px           | 03         |
| [05](issues/05-the-graph-opens-on-purpose.md)             | The graph opens on purpose                 | 01, 02     |
| [06](issues/06-retire-the-right-column.md)                | Retire the right column                    | 05         |
| [07](issues/07-prose-keeps-the-measure-an-index-does-not.md) | Prose keeps the measure, an index does not | 06      |
| [08](issues/08-the-topic-index-gets-its-density.md)       | The topic index gets its density           | 07         |
| [09](issues/09-motion-tokens-and-the-seal-that-never-animates.md) | Motion tokens, and the seal that never animates | 03 |
| [10](issues/10-the-bars-controls-from-the-keyboard.md)    | The bar's controls, from the keyboard      | 05         |

Two chains run from the start -- the graph bug (01) and the bar (02) -- and they meet at 05.
Motion (09) and accessibility (10) hang off the rail and the bar rather than off each other, so
neither gates the layout work.
