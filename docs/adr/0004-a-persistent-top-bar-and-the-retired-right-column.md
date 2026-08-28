# A persistent top bar, and the retired right column

Prepper's controls were scattered down the left rail -- the app's name, the rail's own collapse
toggle, search, the theme switch, reader mode -- and the right of every page was a 320px column
holding a table of contents and a graph panel that was, on most pages, four nodes in a 250px
box. The app is now framed by **one fixed top bar carrying every control**, a left rail that
collapses to **zero width**, **no right column at all**, and a graph that opens as a modal on
purpose rather than sitting at the edge of the page being ignored.

## Why there is a bar at all, given this app's aversion to chrome

[ADR 0003](0003-material-3-as-the-chromes-token-vocabulary.md) and `CONTEXT.md` both record
that Prepper's chrome "states only what is true": no breadcrumb, no next/previous, no progress
bar, no review-queue badge. A reader could reasonably read a new persistent bar as a reversal.

It is not. That rule is about chrome **implying things that are false** -- a reading order that
does not exist, per-user state the app does not keep. A top bar implies nothing about the
content. It holds controls that already existed and gives them a fixed place, which is the
opposite failure mode from inventing a progress indicator. The test the rule actually applies
is *does this element assert something the app does not know?*, and the bar asserts nothing.

## `header`, not a new layout position

Quartz's layout positions are fixed at `left | right | beforeBody | afterBody | header | footer`
(`quartz/plugins/loader/types.ts`), and this repo does not edit Quartz. `header` was unused, and
`DefaultFrame.tsx` renders it inside `<header>` and -- decisively -- **outside the
`.popover-hint` that the search preview clones**. That clone is the hazard which forced
`prepper/sidebar`'s control into `left` rather than `beforeBody`, and it does not reach here.

`grid-header` is the centre column's top cell, not a banner; Quartz's grid has no full-width
row. So the bar is `position: fixed` and publishes its height as a token that content offsets
against. That is a workaround, and it is the honest one: the alternative was a new position in
upstream's layout enum, which means editing a file this repo has committed to never editing.

## The rail's control moved out, and a documented constraint was retired

`prepper/sidebar` had two placement constraints written down as load-bearing: the toggle must
be a **direct child of the rail**, because the collapse rule hid the rail's other children by
selector and the way back had to survive that; and it must not be in `beforeBody`, for the
popover-hint reason above.

The first is now gone, and deliberately. It was never a fact about the world -- it was a
consequence of collapsing via `.sidebar.left > *:not(.prepper-sidebar-toggle)`. Once the
control lives in the bar, the rail is hidden **whole**, which is simpler than what it replaced.
The second constraint survives untouched and is why the bar is at `header` rather than
`beforeBody`.

This is recorded because a future reader will find the old note in git history, or a stale copy
of it, and reinstate a constraint that was retired on purpose.

## One rail, two presentations, one remembered word

Below 800px there is no column to collapse: Quartz lays the left rail out as a strip across the
top of the page, which meant a phone reader met the whole topic tree above every article and
had no way to dismiss it -- the collapse control was not even rendered down there. So the rail
takes a second presentation: absent until the bar's control calls it up, and then fixed over
the article rather than stacked above it.

The decision worth recording is **not to give that a state of its own**. `prepper/topics` had a
CSS-only checkbox drawer at a breakpoint of its own (900px), which is a second stateful control
over the same rail; it is retired. What replaces it is the same control, the same
`prepper-sidebar` key and the same `<head>` script, and the meaning of the one remembered word
is resolved by giving the attribute **three** values rather than two: absent is each width's own
default, `hidden` differs from absent only above 800px, `shown` only below it. A remembered
`shown` is written but never applied from storage -- it decays to absent on every load and every
navigation, which is invisible on a desktop and is the drawer closing itself behind a reader who
followed a link out of it.

Two prices, both paid on purpose. The closed drawer is the **markup's** default rather than a
script's, so a scriptless phone reader gets no drawer over the article -- but also no way to
open one; the way into the library without a script is the app's name in the bar, a plain link
to an entry page that *is* the topic index. And `toggle.js` now asks `matchMedia` which
presentation is on screen, because a press means "put the rail away if it is there, call it up
if it is not" and that is a different direction at each width. That is one breakpoint literal
duplicated between a script and a stylesheet, which is cheaper than the alternative: a script
that guesses from a measurement jsdom cannot take.

## The right column is gone rather than resized

The graph panel is promoted to the modal Quartz already ships, and the backlinks panel moves to
`afterBody` beside "This practises" and "This unlocks" -- which is where `prepper/edges`'
own reasoning had always put typed edges, backlinks being the untyped leftover. That leaves the
table of contents, which is one narrow list and does not need a column.

The alternative was keeping a narrower right column. Rejected: the complaint was *unused space*,
and redistributing an empty column is not the same as not having one.

## The measure survives, and the boundary moved from page to body

The source document asked for the central content to be "substantially wider" and not
"constrained to a narrow central column". Overruled for prose, accepted for indexes.

That observation was made against the **home page**, whose body is a topic index -- a list
scanned in two dimensions, rendered in a column sized for one. A Lesson's column is not empty;
it is full of prose, and ~38rem is roughly 75 characters, which is the entire point of ADR 0003's
reading-surface exemption.

So the rule is now stated against **what a page's body is**, not against which page it is: a
prose body keeps the measure and spends reclaimed width on margin; a topic-index body is wide
and multi-column and spends it on columns. A Term page is both at once -- thin prose above its
generated index -- and the boundary runs between them on the page.

## Consequences

- **Motion tokens now exist, and ADR 0003 is amended.** The rail's collapse is eased, which
  makes that ADR's "nothing of ours animates" false. `prepper/tokens` gains Material's full
  motion role set, computed wholesale like every other role set it holds. One prohibition rides
  with it and is asserted by a test: **`<details>` never animates** -- not the Problem seal,
  not a heading fold, not a topic-tree fold. Those elements are shut by the HTML specification
  before a stylesheet loads, before a script runs, and inside the search preview pane, and all
  three properties are load-bearing. An eased `<details>` is a script-dependent seal wearing a
  costume.
- **Collapsed means gone, not an icon rail.** The board that prompted this work drew a
  collapsed strip of icons. There is no icon for "Big-O notation": the rail's contents are
  author-written topic names, and an icon rail would be a column of identical generic glyphs.
- **Reader mode must hide the bar too, or not exist.** A control that hides the chrome while
  the chrome's most prominent element stays on screen does not do what it says. It fades the
  bar with the rails, on upstream's own `reader-mode` attribute and with upstream's own
  hover-to-restore gesture, so there is one gesture rather than two that nearly agree.
- **404 becomes a laid-out page.** Upstream's 404 page type declares `frame: "minimal"`, which
  renders the message and the footer and no chrome at all -- so "the bar is on every page"
  was false for the one page a lost reader is most likely to be on, and most in need of a way
  out of. `layout.byPageType` overrides the frame to `default`; the rails and everything in
  them stay cleared, because a missing page has nothing to put in them. The `template` field
  that does this is honoured by the loader and documented in its own types but is missing from
  upstream's YAML schema, so an editor reading the schema flags the line.
- **The graph is reached deliberately or not at all.** No ambient panel means no glanceable
  graph. Accepted: it was not legible at 250px anyway.
- **`prepper/topics` renders one index in views that now differ in density, not just in
  position.** The rail stays a bare foldable name list; home and Term indexes get cards and
  columns. The single `TopicTree` source stays single -- that is what stops the rail and the
  home page disagreeing about what is filed where.
