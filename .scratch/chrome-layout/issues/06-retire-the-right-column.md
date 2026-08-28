# 06: Retire the right column

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
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

- [ ] Seam 1: nothing renders in `right` on any page type; the column is gone from the grid
- [ ] Seam 1: the backlinks panel emits under the article, after "This unlocks"
- [ ] The table of contents is a sticky margin element and does not occupy a column
- [ ] Seam 1: a Lesson's article column measures ~38rem at 1280px, 1600px and 1920px
- [ ] No `Prepper:` comment or module README describes the retired column
- [ ] `npm test` and `npx tsc --noEmit` pass
