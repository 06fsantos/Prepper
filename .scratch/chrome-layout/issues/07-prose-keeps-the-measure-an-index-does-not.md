# 07: Prose keeps the measure, an index does not

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
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

- [x] Seam 1: a Lesson, Reference, Cheat sheet and Problem each hold ~38rem at 1280/1600/1920px
- [x] Seam 1: the home page's body fills the available width
- [x] Seam 1: on a Term page the prose body is inside the measure **and** its generated index is not
- [x] The rule keys off what the body is, not off a page slug or filename
- [x] No horizontal page scroll at any supported width, rail collapsed or expanded

## Comments

**What the rule keys off.** One class, `prepper-generated-index`, rendered by the two views
whose output *is* an index -- `prepper/home`'s entry-page body and `prepper/topics`'
`TermIndex` section -- and one selector in `prepper/reading`,
`.page>#quartz-body:has(.prepper-generated-index)`. Nothing in the stylesheet names a slug, a
filename, a page title or a page type, and nothing in either index view names the layout. The
next generated index page inherits the layout by rendering the class; adding one to a list here
was never a step. The class is deliberately not on `TopicTree`, which the **rail** also renders
-- the rail's tree is navigation beside a page, not the page's body, and a marker there would
have made every page in the app an index page.

**What "wide" is.** The whole of the grid's second track:
`calc(100% - var(--prepper-sidebar) - 10px)` -- the prose track's own clamp with the measure
taken out of it. A prose page takes the smaller of the measure and what is available; an index
page takes what is available. No new custom property, no new number, and the track list still
sums to exactly the container (the rail's floor, the index, the margin's nothing, and two 5px
gaps), which is how "no horizontal scroll" is stated as arithmetic rather than hoped for.

Declared in **all three bands**, which is not redundancy: `:has()` makes the index selector
more specific than the plain one, so the wide band's rule would otherwise beat the tablet and
phone bands at widths they own. The tablet band is the two-track grid without its `min()`; the
phone band is one track of `100%`. Ticket 06's advice was followed exactly -- the second track
changes, no fourth track was added, and neither `--prepper-measure` nor `--prepper-sidebar` is
redefined anywhere, so `prepper/sidebar/sidebar.test.ts` stays green and the collapse still
moves nothing on an index page either.

**How the Term page's two halves are separated.** The width is given to the **column** and
taken back from everything in the column that is not the index, by two `max-width` rules
naming the two depths the index views sit at:

```css
… :has(.prepper-generated-index) > .center > *:not(.prepper-generated-index, :has(.prepper-generated-index)),
… :has(.prepper-generated-index) > .center > .page-footer > *:not(.prepper-generated-index) { max-width: var(--prepper-measure) }
```

The home page's index is a **direct child of `.center`** (a pageType body is not wrapped in an
`article` -- checked in the emitted markup, not assumed), and a Term's is inside `.page-footer`
under the note's own body. So what stays capped is the title block, the note's prose, the rule,
and on a Term the typed-edge rails standing beside the index; what is uncapped is the index and
its ancestors, which is exactly the chain that has to reach the track's full width for the
widening to mean anything. Definition and index therefore share a left edge and differ in
width, which is the relationship they are actually in.

The rejected alternative was to leave the track at the measure and let the index alone break
out into the margin. It cannot be written without restating the grid's arithmetic a second time
-- an element inside a track cannot ask how much margin is beside it -- and the restatement
would have gone stale the first time the grid changed. Ticket 06 said the same thing from the
other side.

**How the ToC collision was resolved: the list stands down.** One rule,
`.page>#quartz-body:has(.prepper-generated-index) > .toc { display: none }`, at every width.
The alternative -- letting the index run under the sticky list, since its track is
`minmax(0, 1fr)` and would shrink -- gives a column of wrapped single words beside a truncated
index, which is two bad columns instead of one good one. So the collision is settled by
deciding which of the two is that page's navigation, and on a page whose body is an index it is
the index: a Term's headings are a sentence or two of definition, while the index below is what
the reader came for and what they leave through. The home page never had a ToC anyway (no
headings, so upstream's component renders nothing), so only the Term case was ever real -- and
it is real: `reading-surface`'s Term now carries two H2s so the build actually emits both, and
the test asserts both are on the page before asserting one of them stands down. Two headings
rather than one because upstream's `minEntries` defaults to 1 and the check is `>`, so a
single-heading Term emits no list at all and the test would have passed vacuously.

**What is asserted where, all at seam 1.**

The claim is a **composition**, because neither half can make it alone: jsdom lays nothing out,
so no pixel is measured, and a stylesheet cannot say which of its rules reach a particular page.
So `bodySelectors(page)` **runs each of the two body selectors against the emitted page** with
`hast-util-select` (which handles `:has()` and `:not()` lists) and returns the ones that match;
the stylesheet half then evaluates what those selectors declare at a width. If the marker ever
stopped being rendered, or started being rendered on a Lesson, every width assertion changes
answer -- which is what makes it a test of the rule rather than of the CSS text.

- `prepper/reading/reading.test.ts`, new suite over `topic-index` (13 tests): the four prose
  page types match the plain body selector and nothing else; the home page and a Term match
  both; the four each come to 608px at 1280/1600/1920; the home page's centre track equals
  `container - 320 - 10` and is wider than the measure at each; the track list plus its gaps
  sums to the container at **360, 900, 1280, 1600 and 1920** -- one width from each band and
  both ends of the desktop one; a Term's `article` is reached by a capping rule and its index is
  not, and no box holding the index is either; and no prose page is reached by a capping rule at
  all.
- Same file, existing suite over `reading-surface` (+1): the Term emits a table of contents and
  an index, and the rule that stands the list down is there, unconditional on width.
- Same file, existing "only module that declares the page's grid" (+1 assertion): three index
  grids, one per band, from this module.
- `prepper/sidebar/sidebar.test.ts` (+1 assertion): those three are not conditioned on the rail
  either. Its 20 assertions are otherwise untouched and green -- the new grids are not
  conditioned on `data-prepper-sidebar`, so the shown/hidden track lists still deep-equal.

**Vacuity checked**, by breaking the build and watching the right tests go red, then reverting:
deleting the three index grids reds the six home-page tests and the grid-count test; deleting
the two capping rules reds the Term test and nothing else; deleting the ToC stand-down reds the
ToC test and nothing else; dropping the marker class off `prepper/home` reds the seven tests
that depend on the home page being an index; and widening the index track by the 10px of gaps
reds the three fill tests **and** the three sideways-scroll tests, which is the pair that has to
move together.

**Two changes to the shared harness.** `grid`, `container` and `floor` moved out of
`reading.test.ts` into `prepper/testing/stylesheets.ts`, as ticket 06 suggested, and `grid` and
`container` now take the selectors the page matches rather than assuming `.page>#quartz-body`.
And `container` **subtracts upstream's padding** instead of throwing on it: it used to assert
that nothing padded `#quartz-body`, which is true above 1200px and false below -- and the
sideways-scroll assertion had to run in the tablet and phone bands, where a container computed
without that `1rem` would have been 32px wrong in the direction that hides an overflow. The
`gap` is read off the sheet too, because lightningcss folds `column-gap`/`row-gap` into the
shorthand whose **second** value is the column one.

**Things worth knowing.**

- **`:has()` survives lightningcss** and comes out verbatim in the emitted sheet, confirmed on
  a full `npm run build` of the real vault as well as in fixtures. The minifier does drop the
  `*` from `*:not(...)`, which is why the tests read a rule's selector back off the sheet rather
  than matching a string this file wrote.
- **The prose on an index page is left-aligned in the wide track**, not centred, so navigating
  from a Lesson to a Term moves the text leftward. Deliberate: a definition centred over an
  index it does not line up with reads as two pages stacked. The shared left edge is the thing
  that makes them one page.
- **On a Term page the typed-edge rails are held to the measure**, standing beside the index
  rather than under it. They are lists of prose links and the index is the wide thing; if
  ticket 08's cards make that look wrong, it is one selector.
- **Nothing in this ticket animates**, and no `transition` or `animation` was added. Ticket 09
  still owns motion.

**Tests.** `npm test`: **505/505** (baseline 489 + 16 -- `reading.test.ts` 14 -> 30).
`npx tsc --noEmit` clean, `npx prettier --check` clean on everything touched. A full
`npm run build` of the real vault confirms every new rule is in the emitted stylesheet and the
marker class is on the entry page and on every Term.

**Docs updated.** `CLAUDE.md`'s reading-surface section gains the index rule and the ToC's
stand-down; `CONTEXT.md`'s **Reading surface** and **Chrome** entries no longer say the table
of contents is laid out in the margin unconditionally; ADR 0004's "The measure survives"
section gains how the rule is written given CSS can only see markup, how the Term page's halves
are separated, and the ToC decision with its rejected alternative; `prepper/README.md` (the
file tree and what `testing/stylesheets.ts` is for); the fixture README's `reading-surface`
entry (the Term's two headings and why two); `quartz.config.yaml`'s ToC, home and term-index
entries; and the module docs in `prepper/reading/index.ts`,
`prepper/reading/components/index.ts`, `prepper/home/index.ts`,
`prepper/topics/components/index.ts` and `prepper/testing/stylesheets.ts`. ADR 0003 needed no
change: the measure survives untouched and the exemption's argument is unaffected.

**For ticket 08.** The column is yours and the width is already there.

- The wide track is `calc(100% - var(--prepper-sidebar) - 10px)` and the index element gets
  **all** of it -- `div.prepper-home.prepper-generated-index` on the entry page,
  `section.prepper-topic-index.prepper-generated-index` on a Term. Cards go *inside* that; do
  not touch the grid, and do not add a `max-width` to the index itself, which is precisely what
  the two capping rules are written to avoid doing to it.
- **The marker class is a contract, not decoration.** Whatever markup the cards take, the
  outermost element of an index view keeps `prepper-generated-index` on it, or the page silently
  reverts to 38rem. Six tests fail if it goes, which is the intended alarm.
- `TopicTree` is shared by three placements (rail, entry page, Term page) and only two of them
  are indexes. The spec's "one index, two views, differing in density" means the density belongs
  to a *view*, so a card layout must not land on the rail's tree by being written into
  `TopicTree` itself -- the rail's `Sidebar()` and the two index bodies are the seam.
- The four note-type groups a topic can hold (`ul.prepper-topic-groups > li.prepper-topic-group`
  with `data-note-type`) are already the markup a column layout wants; `topic-index`'s *Hash
  maps* has all four, which is what makes "note-type groups as columns" assertable.
- **A Term's index arrives beside typed-edge rails**, in `.page-footer`, and those rails are
  capped at the measure by this ticket's second rule. If a card grid makes the foot of a Term
  page read badly, that rule is where the decision lives.
- The prose above an index is capped at the measure and left-aligned with it. A card grid that
  starts at a different left edge will read as a second page.
