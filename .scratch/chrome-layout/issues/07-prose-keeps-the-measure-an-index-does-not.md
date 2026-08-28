# 07: Prose keeps the measure, an index does not

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
Blocked by: 06

## What to build

The layout rule that decides which pages hold the ~38rem measure and which are laid out wide --
written against **what the page's body is**, never against which page it is.

- A page whose body is **prose** -- Lesson, Reference, Cheat sheet, Problem -- keeps the measure.
  Width reclaimed from the right column becomes margin.
- A page whose body is a **topic index** -- the generated home page, a Term page's generated
  index -- is laid out wide. Width reclaimed becomes columns.

Today those are the home page and the Term pages, but write the rule so the next generated
index page inherits it rather than needing a special case.

**A Term page is both**, and this is the main hazard in the ticket: a thin prose body -- a
sentence or two of definition, or an area overview where the topic has no Lessons -- followed by
the generated index. The measure governs the prose above; the index below is free to be wider
than it. Getting this wrong in either direction is the failure mode.

This ticket delivers the rule and its tests. The cards come in ticket 08; a wide single-column
index is an acceptable intermediate state here.

**The measure is not up for negotiation.** The source document asked for a "substantially wider"
central column; that observation was made against the home page, whose body is a list scanned in
two dimensions. A Lesson's column is full of prose and 38rem is about 75 characters, which is
what the measure is for (ADR 0003 and `prepper/reading`'s own commentary). This effort does not
touch the reading surface's typography.

## Acceptance criteria

- [ ] Seam 1: a Lesson, Reference, Cheat sheet and Problem each hold ~38rem at 1280/1600/1920px
- [ ] Seam 1: the home page's body fills the available width
- [ ] Seam 1: on a Term page the prose body is inside the measure **and** its generated index is not
- [ ] The rule keys off what the body is, not off a page slug or filename
- [ ] No horizontal page scroll at any supported width, rail collapsed or expanded
