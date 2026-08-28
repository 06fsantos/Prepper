# 03: The rail collapses to nothing, and the article does not move

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
Blocked by: 02

## What to build

Collapsing the left rail takes it to **zero width**, and the way back is the top bar's toggle.
The article column does not move by one pixel.

Today's collapse redeclares `grid-template-columns` on `.page > #quartz-body`, which shifts the
centre column sideways. That is the defect, and easing the move is a different and lesser
thing. Whatever replaces it, **prove** the non-movement rather than eyeballing it.

`prepper/sidebar` keeps its one `localStorage` key `prepper-sidebar`, keeps `remember.js` in the
`<head>` so a reader who collapsed the rail never sees it flash, and keeps the attribute on
`<html>`. What changes is what "collapsed" means and where the control lives.

Two simplifications follow from the control moving into the bar, and both must be carried
through rather than left half-done:

- The collapse rule no longer has to hide the rail's children **by selector while sparing one of
  them**. The rail is hidden whole.
- `prepper/sidebar/index.ts` and `CLAUDE.md` both state that the control being a **direct child
  of the rail** is load-bearing. After this ticket it is not. Update both. A stale
  "load-bearing" note is worse than no note, because the next reader preserves a constraint
  that was deliberately retired.

The collapsed state is **not an icon rail**. The rail's contents are author-written topic names
and there is no icon for "Big-O notation"; an icon rail would be a column of identical generic
glyphs.

Existing tests in `prepper/sidebar/sidebar.test.ts`, `toggling.test.ts` and
`prepper/reading/reading.test.ts` assert the old placement and the old collapse. They are
expected to fail. **Rewrite them to the new behaviour; do not delete an assertion because it
went red.**

## Acceptance criteria

- [x] Seam 2: the article column's bounding box is identical before and after a collapse, at
      1280px, 1600px and 1920px
- [x] The collapsed rail has zero width; the rail is hidden whole, not child-by-child
- [x] The toggle in the top bar collapses and restores the rail, and `aria-pressed` reflects state
- [x] Seam 2: `prepper-sidebar` is the only key written; every other key still trips the tripwire
- [x] `remember.js` still runs in the `<head>`; no flash of an uncollapsed rail
- [x] `prepper/sidebar/index.ts` and `CLAUDE.md` no longer call the retired placement load-bearing
- [x] The three named test files are rewritten, not trimmed
- [x] Nothing in this ticket's CSS carries a `transition` or `animation`

## Comments

**How the collapse works now.** One rule:

```css
@media all and (min-width: 800px) {
  :root[data-prepper-sidebar="hidden"] .page > #quartz-body .sidebar.left { display: none; }
}
```

That is the whole of it. The rail is hidden whole -- no per-child selector, no exception carved
out for a control that is no longer in there -- and `prepper/reading`'s grid is untouched. The
rail's track stays `minmax(var(--prepper-sidebar), 1fr)` whether or not a box is drawn in it,
so the width the rail gives up becomes margin and the centre column resolves against exactly
the same track list in both states. `--prepper-rail-collapsed` is deleted; nothing needs it.

The control moved to `header`/5 in `quartz.config.yaml`, which ticket 02 reserved for it, and
it renders first in the bar's left slot -- before `page-title` (10), both left of `.search`
(20) and its `margin-inline: auto`. Nothing about the bar was re-laid-out to accept it.
`toggle.js`, `remember.js`, the `prepper-sidebar` key and the `data-prepper-sidebar` attribute
on `<html>` are all unchanged.

**What was asserted for non-movement, and why it is equivalent.** The ticket asks for the
article's bounding box at 1280px, 1600px and 1920px. Seam 2 is jsdom, which performs **no
layout at all**: no viewport, no box tree, and `getBoundingClientRect` returns zeroes for
everything. A pixel measurement taken there would be a number the harness invented, so none was
taken and none is claimed. The proof was designed around the real capability instead, and it
comes in two halves that compose.

*Seam 1, `prepper/sidebar/sidebar.test.ts`.* The emitted stylesheet is parsed into rules, each
carrying the `@media` conditions it is nested inside (a hand-rolled scanner: quote-aware,
`@layer`/`@supports` transparent, `@keyframes`/`@font-face` skipped). At each of the three
widths, the rules that apply are computed -- an undecidable media condition counts as
*applying*, so nothing hides from the assertion -- and then, for every rule conditioned on
`data-prepper-sidebar`:

- its **subject** (the last compound selector, which is the element the declarations land on)
  must be `.sidebar.left`, and never `#quartz-body`, `.center`, `article`, `.page`, `body`,
  `html` or `:root`;
- it must redefine **no custom property**, since the grid is written in `--prepper-measure` and
  `--prepper-sidebar` and a redefinition would move the column without naming it.

Stated the other way round as well, on the declaration rather than the selector: the list of
`grid-template-columns` values that apply to the page's grid at each width is computed twice --
once for a reader with the rail shown, once with it hidden -- and asserted **deep-equal**.

*Seam 2, `prepper/sidebar/toggling.test.ts`.* The premise the stylesheet argument rests on:
that the two states differ by exactly the attribute the argument is about. A click is taken,
and `#quartz-body`, `#quartz-body > .center` and `article` are compared with themselves before
and after -- tag, class list, inline style. Nothing gains a class, nothing gains an inline
width, no wrapper is inserted.

Together: the browser lays the article out from an identical set of rules in both states, at
each of the three widths. That is stronger than a measurement of one page in one engine, and it
is a fact this repo's seams can actually establish.

**The proof is not vacuous.** Checked by temporarily restoring the old collapse rule (the three
columns with the left one reduced to a gutter, plus `justify-content: center`, at
`min-width: 1200px`): 7 of the 14 assertions in `sidebar.test.ts` go red, including all six
width-specific ones. Then reverted.

**One trap worth knowing about.** `prepper/topics`' mobile drawer already renders
`<input id="prepper-sidebar-toggle">` -- an **id** with the same word as this control's
**class**. They do not collide in CSS (`#` vs `.`), but a bare `.prepper-sidebar-toggle` query
in a test reads ambiguously, so every selector in the tests names the tag:
`button.prepper-sidebar-toggle`. Ticket 04 replaces that drawer and should take the chance to
rename it.

**Tests.** `npm test`: 458/458 (baseline 447 + 11 -- `sidebar.test.ts` 6 -> 14,
`toggling.test.ts` 5 -> 7, `reading.test.ts` 7 -> 8; `layout.test.ts` unchanged at 21, with two
of its existing assertions extended to cover the toggle).
`npx tsc --noEmit` clean. `npx prettier --check` clean on every file touched.

**Docs updated.** `CLAUDE.md`'s "The hideable rail" section is rewritten -- the retired
"direct child of the rail" note is gone and replaced by what is actually load-bearing now, plus
how non-movement is proved. `prepper/sidebar/index.ts` and `prepper/sidebar/components/index.ts`
say the constraint was retired rather than leaving a stale copy. `quartz.config.yaml`'s entry
comment, `prepper/reading/index.ts`, `prepper/reading/components/index.ts` and
`prepper/README.md` follow. ADR 0004 already recorded the retirement (ticket 02 wrote it
forward-looking) and needed no change.

**For ticket 04.** The rail below 800px is untouched, on purpose: the collapse rule is scoped
to `min-width: 800px` and the control is `display: none` below it, exactly as before. So ticket
04 inherits a clean slate -- a control that already exists in the bar, is already wired, is
already remembered, and simply is not rendered on a phone. Turning it into the drawer's opener
means dropping the `max-width: 800px` hide, deciding what `data-prepper-sidebar` means below
800px (the default there is *shown*, which is the stacked strip the spec objects to, so the
drawer will likely want the opposite default), and retiring `prepper/topics`' own
checkbox-and-label drawer along with its `prepper-sidebar-toggle` id. Note also that
`prepper/topics`' drawer panel carries `transition: transform .2s` -- pre-existing, not this
ticket's, and ticket 09's to reconcile with the motion tokens.
