# 08: The topic index gets its density

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
Blocked by: 07

## What to build

The home page and a Term page's generated index stop being a narrow list in a wide window and
become the landing the board draws: a **card per topic**, with the note-type groups
(`CHEAT SHEET`, `LESSONS`, `TERMS`, `REFERENCES`, `PROBLEMS`) as **columns within the card**
rather than stacked lists, under section headings.

**Keep one index, in three views.** `prepper/topics` already renders `sidebar` and `term-index`
from one `TopicTree`, and `prepper/home` imports the same component rather than reproducing it.
That is what stops the rail and the home page disagreeing about what is filed where, and it
stays. What changes is that the views diverge in **markup density, not in data**: the rail stays
a bare, foldable name list; the home and term-index views get the cards. If the divergence needs
a third view name, add one. **Do not fork the tree.**

Column count follows available width -- which is now a function of whether the rail is collapsed
-- through the grid, with no hard-coded offsets.

**The footer** comes in here too: it currently floats below a short page with a large gap above
it. It should sit under the content when the page is long and at the foot of the viewport when
it is short, without empty vertical space manufactured to place it.

## Acceptance criteria

- [ ] Seam 1: the home page and a Term page emit the card markup; a Lesson does not
- [ ] Seam 1: the rail's markup is unchanged from ticket 03 -- still a bare foldable name list
- [ ] `TopicTree` is not forked; the views share one data path
- [ ] Column count responds to available width, including when the rail collapses
- [ ] No horizontal page scroll at any supported width
- [ ] The footer sits under the content on a long page and at the foot of the viewport on a short
      one, with no manufactured gap
