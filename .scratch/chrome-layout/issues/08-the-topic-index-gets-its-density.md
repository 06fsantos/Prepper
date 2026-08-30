# 08: The topic index gets its density

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
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

- [x] Seam 1: the home page and a Term page emit the card markup; a Lesson does not
- [x] Seam 1: the rail's markup is unchanged from ticket 03 -- still a bare foldable name list
- [x] `TopicTree` is not forked; the views share one data path
- [x] Column count responds to available width, including when the rail collapses
- [x] No horizontal page scroll at any supported width
- [x] The footer sits under the content on a long page and at the foot of the viewport on a short
      one, with no manufactured gap

## Comments

**How the three views diverge without forking the tree.** The seam is the **wrapper and nothing
under it**. All three reach `topicIndex()` / `topicOf()` over the same link graph, and all three
render `filed()` -- one new function, the note-type group list or the line saying the topic is
empty -- below whatever heading they draw. What differs is what is wrapped round that:

| View       | Function     | Where                   | Shape                                   |
| ---------- | ------------ | ----------------------- | --------------------------------------- |
| `sidebar`  | `TopicTree`  | the rail, every page    | a bare foldable name list               |
| entry page | `TopicCards` | `prepper/home`'s body   | a card per topic, note types as columns |
| term-index | `TermIndex`  | a Term's `.page-footer` | the one card for the page's own topic   |

`TopicCards` is a **sibling** of `TopicTree`, not a parameter on it. A `density` flag would have
put both jobs inside one function and made every future change to either read as a change to
both; two functions over one `filed()` says exactly where the divergence is allowed to be.
`prepper/home` imports the new one instead of the old one and is otherwise untouched. The stated
fact is asserted by comparison rather than by snapshot: `a card holds exactly what the rail holds
under the same topic` reads *Hash maps* out of the entry page's card and out of the rail on a
Problem three directories away and demands the two be equal, so the test fails on divergence
rather than on redecoration.

**The card is a topic**, which is the rule that settles the Term page. A Term has exactly one
topic, so its "In this topic" section *is* the card rather than containing one -- same surface,
same border, same columns, a different heading because repeating the page title two lines under
itself would be noise. One card design in the app, not two.

**The CSS is scoped on the card's own classes and never on `prepper-generated-index`.** That was
deliberate twice: the marker is `prepper/reading`'s contract for how wide the *column* is, so
hanging a density off it would make one class mean two things -- and `reading.test.ts` and
`sidebar.test.ts` both **count** the rules whose selector holds that class and whose body holds
`grid-template-columns`, expecting exactly three. A card grid scoped on the marker would have
been a fourth, and two suites would have gone red for a reason neither is about.

**How column count follows width.** `repeat(auto-fit, minmax(min(<floor>, 100%), 1fr))`, at both
levels -- 18rem for the cards across the index, 9rem for the note-type groups across a card. No
media query, no offset, and nothing conditioned on `data-prepper-sidebar` anywhere in it: the
grid is told the narrowest a column may be and works out how many fit in whatever container it
has been given, so the count follows the window, the page's own 1500px cap and the index track
without knowing that any of them exist. The `min(…, 100%)` on the floor is what makes "no
horizontal scroll at any supported width" true rather than true-at-the-widths-anyone-checked: a
bare `minmax` floor is a width the track takes even when the container is narrower than it.

Verified in a browser at 1600 (three card columns, two group columns), 900 (one card column,
three group columns) and with the rail collapsed, as well as through the declared-rule tests.

**On "including when the rail collapses" -- the honest answer.** Above 800px, collapsing the rail
does **not** give the index more width, and that is ticket 03's settled decision rather than
something this ticket dodged. The rail's track stays `minmax(320px, 1fr)` in every state, which
is what makes the collapse move nothing; on an index page the centre track has already taken
everything the margin had, so the only width a collapse could return is the 320px on the **left**,
and giving it to the index moves the index's left edge -- which is the jump. Reclaiming it also
cannot be written: `sidebar.test.ts` forbids any rule conditioned on the collapse whose subject is
not the rail itself, and rightly. So what this ticket guarantees is the part that is actually in
its gift: the count is a pure function of the container, so it follows any change in available
width the layout ever decides to hand it.

**The footer.** It was stranded a third of the way up the empty space under a short page, and
the cause was not a margin: the left rail is `height: 100vh` and spans every grid row, so its
height was distributed across the rows it spanned -- **the footer's own included** -- and the
footer sat at the top of a row that had been stretched underneath it. Two declarations, in
`prepper/reading`, which owns the page's layout:

- `.page > #quartz-body { min-height: calc(100vh - var(--prepper-topbar-height)) }` -- the page
  is a windowful tall in its own right. It used to depend on the rail for that, and the rail is
  `display: none` whenever it is collapsed or below 800px, so the footer moved when the furniture
  did.
- `.page > #quartz-body > footer { align-self: end }` -- free space stretches the auto rows the
  way the grid always did, and the footer rides the bottom of the last one.

Nothing is manufactured: no spacer, no margin, no minimum height on the footer, no `100vh` on
anything carrying content. On a page longer than the window there is no free space, no stretch,
and the footer follows the content immediately. The test asserts those two rules and then asserts
that **no third rule** invents the space, which is the failure mode the ticket names.

**A ticket 03 defect found in a browser, and fixed here.** Collapsing the rail moved the article
column, at every width. Upstream declares no grid placement on `.center`, so it **auto-places**
into the first free cell -- the second column only for as long as the rail is a grid item in the
first one. `display: none` stops it being one, and the article slid into the rail's track and was
laid out at that track's width (441px at 1600px, against a 608px measure). Ticket 03's proof
could not see it: the proof is about the track list, and the track list is not what changed.

The fix is one declaration, `.page > #quartz-body > .center { grid-column: grid-center }` --
`grid-column` rather than `grid-area` so the row stays auto and the column lands exactly where it
always did with the rail present, and a **named line** rather than a number so it is right in all
three bands (second column in the wide and tablet grids, only column in the phone one) without
being restated in any of them. `sidebar.test.ts` gains an assertion that the placement exists,
unconditional and this module's, alongside its existing assertions about what the collapse may
not reach.

Verified in a browser before and after: with the rail hidden at 1600px, the article now occupies
496..1104 -- the same 608px, in the same place, as with the rail shown.

**A third, smaller fix.** A capped box on an index page was **centred** over the wide column
rather than pinned to its left edge. The only box with side margins of its own is the rule the
frame draws under the article, and a 38rem rule floating in the middle of a full-width column
reads as a second page beginning -- against ticket 07's own recorded decision that the shared
left edge is what makes a Term's definition and its index one page. One rule,
`margin-inline-start: 0` on the same two selectors the caps name.

**`folds.js` got smaller.** It carried a loop propagating a worked fold to every other element
with the same `data-fold` id, for exactly one page: the entry point, which rendered the rail's
view as its body *and* in the rail, so the two copies shared fold ids and had to be kept in step.
Cards do not fold and carry no fold id, so there is one foldable tree per page and the loop is
gone. Its `folds.test.ts` runs on a Problem and was unaffected.

**Things worth knowing.**

- **The backtick trap bit again, and prettier did not catch it.** A `` `.center` `` written inside
  a CSS comment in the styles template literal terminates the string, and the result still parses
  and still typechecks -- `styles` just becomes garbage, the module fails to load, and Quartz
  prints `Plugin "reading" declares components but failed to load them` and serves the page with
  the whole reading surface missing. `npx prettier --check` and `npx tsc --noEmit` were both clean.
  The reliable check is `npm run build 2>&1 | grep -i "failed to load"`, and it is worth running
  after any edit to a module's styles.
- **The cards carry no shadow.** Hierarchy is `surface-container-low` against the page, with an
  `outline-variant` border; elevation is spent only where something occludes (ADR 0003), and a
  region of the page does not.
- **The card heading is `title-large` with a rule under it.** Size alone did not carry it: Quartz
  sets an internal link at 600, so a topic name at a role weight of 500 read *lighter* than the
  notes filed under it. A line is the way to say "this names the rest of the card" without
  inventing a weight the type scale does not have.
- **Nothing in this ticket animates.** No `transition` and no `animation` was added; the topic
  module's own test still asserts the emitted sheet carries neither.

**Tests.** `npm test`: **519/519** (baseline 505 + 14 -- `topics.test.ts` 12 -> 24,
`reading.test.ts` 30 -> 31, `sidebar.test.ts` 20 -> 21). `npx tsc --noEmit` clean,
`npx prettier --check` clean on everything touched. A full `npm run build` of the real vault emits
every new rule, loads every plugin, and reports no validation violations.

**Docs updated.** `CLAUDE.md` (the topic-tree section is now "in three views" with the table, and
the reading-surface section gains the centre-column placement and the footer); `CONTEXT.md` (a new
**Topic card** term); `prepper/README.md` (the file tree for `topics`, `reading` and `home`, and
what `testing/stylesheets.ts` can and cannot see); ADR 0004 (two new sections -- the density
belonging to a view, and the two layout defects -- plus the amended consequence);
`quartz.config.yaml` (the two topics entries and the home entry); and the module docs in
`prepper/topics/index.ts`, `prepper/topics/components/index.ts`, `prepper/topics/folds.js`,
`prepper/home/index.ts` and `prepper/reading/components/index.ts`.

**For whoever takes ticket 09 (motion).** The prohibition is intact and nothing here needs
softening for it. Three things to know:

- **No `<details>` this ticket touched should ever animate**, and there is now one fewer of them:
  the entry page's cards are not `<details>` at all, so the only folds left in the app are the
  rail's tree, a note's headings and the Problem seal. `topics.test.ts`'s "the tree's own
  stylesheet has no breakpoint left in it" asserts the emitted component sheet matches neither
  `transition` nor `animation` **anywhere in it** -- that is the whole file, every module's CSS,
  so the first `transition` added by anyone reds it. That test will have to be narrowed when
  ticket 09 lands, and narrowing it to "no rule whose subject is a `<details>` or a `<summary>`"
  is the change that keeps its meaning.
- **`sidebar.test.ts`'s "nothing in the collapse moves"** asserts the same of the one sheet
  carrying `data-prepper-sidebar`. Ticket 09 eases the rail's collapse, so that one is the
  assertion the ticket is actually about, and it should become a statement about the token used
  rather than about the absence of the property.
- **A card is a plausible place to want a hover transition and is not worth one.** The cards are
  regions of a landing, not controls; the only motion the index has any business acquiring is the
  rail's collapse, which is ticket 09's own subject.
