# 06: Retire the right column

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
Blocked by: 05

## What to build

The `right` column is removed. Redistributing 320px of empty column is not the same as not
having one, and this is what actually resolves the source document's complaint.

With the graph gone (ticket 05), `right` holds two things, and each goes somewhere it belongs:

- **Backlinks move to `afterBody`.** `edges-backlinks` moves from `right` to `afterBody` at
  priority 30, joining "This practises" (10) and "This unlocks" (20). Reading order: what this
  note practises, what it unlocks, what else points here. `prepper/edges` already argues that a
  typed edge belongs in context and that backlinks are the leftover bucket; the foot of the
  article is where that bucket belongs and where every other rail already is.
- **The table of contents becomes a sticky element in the margin**, not a 320px column.

**Reclaim the width without touching the measure.** `prepper/reading`'s `~38rem` and the grid it
sits in are this repo's most argued-for rule. If the grid declaration has to change to drop a
column, the measure comes through unchanged -- **assert it**, do not assume it. On a prose page
the reclaimed width becomes margin; ticket 07 decides where it becomes something else.

Update the `Prepper:` comments on the moved `quartz.config.yaml` entries, and
`prepper/edges`' own documentation, to describe where things now are.

## Acceptance criteria

- [x] Seam 1: nothing renders in `right` on any page type; the column is gone from the grid
- [x] Seam 1: the backlinks panel emits under the article, after "This unlocks"
- [x] The table of contents is a sticky margin element and does not occupy a column
- [x] Seam 1: a Lesson's article column measures ~38rem at 1280px, 1600px and 1920px
- [x] No `Prepper:` comment or module README describes the retired column
- [x] `npm test` and `npx tsc --noEmit` pass

## Comments

**What the grid is now.** Two content tracks and two margins:

```css
grid-template-columns:
  minmax(var(--prepper-sidebar), 1fr)                                /* the rail */
  min(var(--prepper-measure), calc(100% - var(--prepper-sidebar) - 10px))
  minmax(0, 1fr);                                                    /* margin */
```

Upstream's third track is a fixed `320px` and ours is guaranteed **nothing**. That is the whole
of "removed rather than resized": the track takes zero when there is nothing spare, so it can
never take width from the measure, and what it does take is whatever the window has left over.
The centre track's clamp lost one sidebar -- one rail and two 5px gaps rather than two rails --
which makes it the same shape the 800--1200px band already had. Nothing else about the grid
moved, and there is still exactly one declaration per viewport band.

The `.right.sidebar` box is hidden outright. Quartz's frame renders it whether or not anything
is configured into the position, and upstream makes it `position: sticky`, `100vh` tall and
padded, so an empty one would still be a full-height box sitting in the margin. Both `right`
being empty (asserted per page type, on the markup) and the box being hidden (asserted on the
stylesheet) are needed; neither alone is the retirement.

**How the measure was proved to survive, and at which seam.** Seam 1, in
`prepper/reading/reading.test.ts`, at 1280px, 1600px and 1920px. It is an **evaluation of the
declared track list, not a measurement**, and the file says so where it makes the claim: jsdom
performs no layout, so a `getBoundingClientRect` taken at seam 2 would be a number the harness
invented. What is computed instead is what a browser would compute --

1. the rules that apply at the width, from the stylesheets the emitted page actually links, in
   link order;
2. the last `grid-template-columns` on `.page>#quartz-body` (never `.page[data-frame=...]`),
   split into tracks at paren depth zero;
3. the container the grid is laid out in, read off the sheet rather than assumed -- the smaller
   of the viewport and whatever `max-width` `.page` declares -- with an assertion that nothing
   pads `#quartz-body` at that width;
4. the centre track, with `var()` resolved from the declared custom properties and its `min()`
   and `calc()` worked out.

That comes to **608px = 38rem at all three widths**, container 1280px, 1500px and 1500px (the
page is capped at `calc(1200px + 300px)`). A second test asserts the shape rather than the
number: three tracks, both outer ones flexible, and their guaranteed floors `[320, 0]` -- which
is the sentence "the reclaimed width is margin" written as arithmetic.

**Vacuity checked**, by breaking the build and watching the right tests go red, then reverting:
`--prepper-measure: 50rem` reds all three width tests and the pre-existing measure test;
restoring the fixed `var(--prepper-sidebar)` third track reds the margin test and nothing else;
deleting the `.right.sidebar` hide reds the right-rail test; moving the ToC to `grid-center` at
900px reds the ToC test.

One thing the measure tests do **not** catch, stated rather than left to be discovered: a
restored 320px right column would leave the centre track at 608px too, because the clamp is not
binding at any width the page is laid out at. The margin test is what catches that, and it is
why it exists separately.

**A latent bug in the shared parser, found on the way.** `holds()` read every `(min|max)-width`
in a query and ignored a leading `not` -- and upstream's own
`@media not (min-width: 1200px) { .page > #quartz-body { padding: 0 1rem } }` is exactly that
shape. Left alone it would have had the container computed 32px short at 1280px, silently. `not`
is now decided, and a `not` over an undecidable condition still counts as applying, which is the
same conservative direction as everywhere else. No existing assertion changed value.

**Where the table of contents ended up.** In the margin, as a sticky element, placed from the
**`footer` layout position** -- and that choice is the non-obvious part of the ticket.

`footer` is not a statement about the foot of the page. Of Quartz's six positions,
`DefaultFrame` renders `left`, `right` and `footer` as children of `#quartz-body` and everything
else inside `.center`, so `footer` is the only position a component can be placed in and *be a
grid item*. That is what lets one CSS rule put the list in the grid's third area
(`grid-sidebar-right`, still named by upstream's `grid-template-areas`), `align-self: start`,
`position: sticky` -- which is the same mechanism the rails have always used, and it needs no
scroll container of its own. It is bounded by `--prepper-toc` (16rem) and `justify-self: start`,
so it hugs the prose rather than spreading across a 441px margin.

`beforeBody` was rejected for the reason `prepper/sidebar` is not in it: it sits inside the
`.popover-hint` the search preview clones, so every search result would have carried a table of
contents. `left` would have made it disappear with the rail, and `afterBody` renders inside
`.center`, where a margin element cannot go without being absolutely positioned against
something.

Its `top` is `calc(var(--prepper-topbar-height) + 2rem)`, never a literal -- the bar is fixed
over the page and a list stuck to `top: 0` would stick behind it. The "4rem appears exactly
once" test in `layout.test.ts` is about `prepper/topbar`'s own sheet and is untouched; this rule
is in `prepper/reading`'s.

**Below 1200px it is not rendered**, which is precisely what it already did: upstream's own
`.sidebar.right > .toc { display: none }` hid it there, and that selector stopped matching the
moment the list left the rail. So the behaviour is preserved rather than changed, and the
argument is the same one the ticket makes about columns -- where there is no margin there is no
room for a margin note, and a table of contents stacked under the article is a list of places
the reader has already been.

**The backlinks panel** moved from `right`/50 to `afterBody`/30, so the foot of an article now
reads: Practises, This unlocks, Backlinks -- typed edges first, the untyped leftover last. It
also gained the hairline the other three rails wear, which it had gone without because it used
to be chrome in a column; it is a rail among rails now and reads like one. `edges.test.ts` no
longer needs a second scope for it (`page.main` is `.center`, which includes the page footer),
and the test that used to pass `lesson.tree` for the panel alone is simplified rather than left
as an unexplained exception.

**The shared stylesheet reader.** Ticket 03's media-query-aware parser moved out of
`prepper/sidebar/sidebar.test.ts` into **`prepper/testing/stylesheets.ts`**, as the brief asked,
and grew what this ticket needed: `customProperties`, `tracks` (a track list split at paren
depth zero) and `pixels` (a CSS length evaluated with `var()`, `%`, `rem`, `min`, `max`, `calc`
and the four operators). The evaluator is a hand-written recursive-descent reader rather than
`Function`: it makes an unsupported unit an **error** instead of a plausible number, which
`Function` would have answered `80` to `80vw` and nobody would have caught. `sidebar.test.ts`
keeps the helpers that are about the collapse -- `conditional`, `displays`, `drawer`, `valued`
-- and its local `tracks` was renamed `gridDeclarations` to stop it colliding with the shared
one. Its assertions are unchanged and still 20 green.

**`layout.byPageType` cleaned up.** The `positions: right: []` clears for 404, folder and tag
are gone; with nothing configured into `right` at all, they were config describing a layout the
build no longer has. 404 keeps `beforeBody`, `left` and `afterBody` cleared and its
`template: default`. `@quartz-community/backlinks` (disabled, replaced by `prepper/edges`) lost
its `layout:` block for the same reason -- it named a position that no longer exists as a place.
It stays disabled, so the `defaultPosition` fallback pass that caused ticket 01's bug never
reaches it.

**`prepper/topbar` lost a media band.** Its sticky-rail rules were `.sidebar` at >=1200px plus
`.sidebar.left` at 800--1200px, split that way because upstream unsets the *right* rail's height
below 1200px. With one rail left, that is one rule at `min-width: 800px` on `.sidebar.left`, and
the behaviour is identical.

**Nothing in this ticket animates**, and no `transition` or `animation` was added anywhere;
ticket 09 still owns motion. A backtick inside a CSS comment was written and caught by
`prettier --check` before it could silently eat the module's stylesheet -- the warning in the
brief is real, and that is twice now.

**Tests.** `npm test`: **489/489** (baseline 480 + 9 -- `reading.test.ts` 8 -> 14,
`layout.test.ts` 24 -> 26, `edges.test.ts` 13 -> 14). `npx tsc --noEmit` clean,
`npx prettier --check` clean on everything touched. A full `npm run build` of the real vault
confirms: one `.toc` on a Lesson and on a Problem, none on the home page or 404 (no headings,
so the component renders nothing), `<div class="right sidebar"></div>` empty on every page, the
backlinks panel inside `.page-footer`, and every new rule present in the emitted stylesheet.

**Docs updated.** `CLAUDE.md` (the reading surface gains the grid and the margin; "the right
rail is untouched" is replaced by what happened to it; the edges summary says where the four
rails render), `CONTEXT.md` (**Chrome** and **Reading surface**), ADR 0004 (the right-column
section gains the three consequences: the `minmax(0, 1fr)` track, the `footer` placement, and
the retired `byPageType` clears), `docs/upstream-merges.md` (a fourth breakage shape: the frame
reparenting `footer` or renaming `grid-sidebar-right`), `prepper/README.md` (the file tree, and
a paragraph on what `testing/stylesheets.ts` is for), and the module docs in
`prepper/reading/index.ts`, `prepper/reading/components/index.ts`, `prepper/edges/index.ts`,
`prepper/edges/components/index.ts`, `prepper/sidebar/index.ts`, `prepper/topbar/index.ts`,
`prepper/topbar/components/index.ts` and the `Prepper:` comments in `quartz.config.yaml`.

**For ticket 07.** Everything you need is already in the grid, and the seam to assert it at is
built.

- The **wide band's third track is `minmax(0, 1fr)`**, and the second is
  `min(var(--prepper-measure), ...)`. An index page becomes wide by changing what the *second*
  track is for that page, not by adding a fourth: the two flexible margins already give the
  width back. Whatever selects an index page must not touch `--prepper-measure` or
  `--prepper-sidebar` in a way `prepper/sidebar/sidebar.test.ts` would see as a redefinition
  under the collapse.
- **`prepper/testing/stylesheets.ts` already does the arithmetic.** `pixels`, `tracks`,
  `customProperties` and the `grid`/`container`/`floor` helpers at the bottom of
  `reading.test.ts` are what "a Lesson, Reference, Cheat sheet and Problem each hold ~38rem at
  1280/1600/1920" is asserted with; the helpers are local to that file and are worth lifting if
  ticket 07 wants them for four page types.
- **The table of contents is in the margin the index will want**, at
  `grid-area: grid-sidebar-right`, `width: min(16rem, 100%)`. A Term page has a ToC *and* a
  generated index; a wide index laid out under the measure and a 16rem sticky list in the right
  margin will collide unless one of them gives way. Decide it deliberately -- the simplest
  answers are to let the index run under the ToC's track (it is `minmax(0, 1fr)`, so it will
  shrink) or to not render the ToC on a page whose body is an index.
- **The home page has no ToC at all** (no headings, the component returns null), so the home
  case is unencumbered.
- The `topic-index` fixture is the one with every page type at once; its `problems/two-sum` is
  the only page in it with headings, which is why the ToC assertions are on a Problem.
