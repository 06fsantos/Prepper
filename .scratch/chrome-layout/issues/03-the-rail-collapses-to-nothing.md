# 03: The rail collapses to nothing, and the article does not move

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
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

- [ ] Seam 2: the article column's bounding box is identical before and after a collapse, at
      1280px, 1600px and 1920px
- [ ] The collapsed rail has zero width; the rail is hidden whole, not child-by-child
- [ ] The toggle in the top bar collapses and restores the rail, and `aria-pressed` reflects state
- [ ] Seam 2: `prepper-sidebar` is the only key written; every other key still trips the tripwire
- [ ] `remember.js` still runs in the `<head>`; no flash of an uncollapsed rail
- [ ] `prepper/sidebar/index.ts` and `CLAUDE.md` no longer call the retired placement load-bearing
- [ ] The three named test files are rewritten, not trimmed
- [ ] Nothing in this ticket's CSS carries a `transition` or `animation`
