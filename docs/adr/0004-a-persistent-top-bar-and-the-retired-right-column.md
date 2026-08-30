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

## The graph control is the plugin's own button, moved

`@quartz-community/graph` renders three things in one `.graph` element: a heading, a 250px
local panel with an expand button in its corner, and the global-graph modal that button opens.
Prepper wants the modal and not the panel, and the plugin offers no option for the modal alone.

The seam that avoids a fork is in the plugin's **client**, not its markup. It wires *every*
`.global-graph-icon` in the document and collects *every* `.global-graph-outer`, both by
document-wide queries and neither scoped to the rail, and its Ctrl/Cmd-G handler is a `keydown`
listener on `document` that never knew where the panel was. So the component is simply
**placed in `header` at priority 40** instead of in `right`, and the button it already renders
becomes the bar's graph control -- working, keyboard-shortcut and all, with no code of ours
between the press and the modal. The plugin stays a remote: not forked, not patched, not
vendored. The vendoring line in this repo is drawn at `prepper/search` and it did not have to
move.

What is left over is shaped from outside, and the two halves are split on a real distinction.
The heading and the box are **CSS**, in `prepper/topbar`, because CSS applies before the first
paint and a bar that showed a 250px panel until a script arrived would be worse than the panel.
The local `.graph-container` is **removed from the document** by `prepper/topbar/graph.js`,
because the plugin renders into every one it can find whether or not anything is on screen, so
hiding it would leave a canvas, a force simulation and a frame loop running on every page for
nothing. That removal always wins its race with the plugin's own render: the plugin registers
its `nav` listener only after two CDN libraries have loaded, and ours is registered at module
evaluation time.

Two smaller facts fall out. The modal needs no z-index of ours -- its own `9999` sits inside
the bar's stacking context, which resolves it above the bar's `1000` and the mobile drawer's
`999`. And the graph is now on **every** page type the bar is on, 404 and the generated folder
index included, because it is a control rather than a panel and those pages clear `right`
rather than `header`.

## The right column is gone rather than resized

The graph panel is promoted to the modal Quartz already ships, and the backlinks panel moves to
`afterBody` beside "This practises" and "This unlocks" -- which is where `prepper/edges`'
own reasoning had always put typed edges, backlinks being the untyped leftover. That leaves the
table of contents, which is one narrow list and does not need a column.

The alternative was keeping a narrower right column. Rejected: the complaint was *unused space*,
and redistributing an empty column is not the same as not having one.

Three consequences, recorded because each is a place the decision could be undone by accident.

**The grid's third track is `minmax(0, 1fr)`, not a width.** Upstream ends the desktop grid in a
fixed `320px`; ours ends in a track that is guaranteed nothing and takes only what is left over.
That is the difference between removing a column and narrowing one, and it is what makes the
reclaimed space *margin* on a prose page and available as *columns* on an index page. The
measure comes through the change unchanged -- 608px at 1280px, 1600px and 1920px -- and is
evaluated off the emitted stylesheet rather than assumed, because jsdom lays nothing out and a
measurement taken there would be invented.

**The table of contents is placed from the `footer` layout position**, which is not a statement
about the foot of the page: `DefaultFrame` renders `left`, `right` and `footer` as children of
the grid and everything else inside `.center`, so `footer` is the only position from which a
component can *be* a grid item. It is sticky against `var(--prepper-topbar-height)`, bounded by
`--prepper-toc`, and not rendered below 1200px -- which is what upstream already did with it
inside the rail. `beforeBody` was rejected for the reason `prepper/sidebar` is not in it either:
it sits inside the `.popover-hint` the search preview clones, and every search result would have
carried a table of contents.

**`layout.byPageType` no longer clears `right` for 404, folder and tag pages.** Those clears were
correct while something was configured into the position; with the position empty everywhere they
were config describing a layout the build does not have, which is the kind of line a later reader
trusts.

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

**How that is written, given CSS can only see markup.** The two index views render themselves
with one class, `prepper-generated-index`, and the reading surface asks `:has()` whether the
page holds one. Nothing in the layout names a slug, a filename, a page title or a page type, so
the next generated index page is laid out correctly by rendering that class rather than by
being added to a list -- which is the difference between a rule and a special case. The wide
page takes the whole of the grid's second track (`calc(100% - var(--prepper-sidebar) - 10px)`,
the prose track's own clamp with the measure taken out of it), so "wide" introduces no third
number, and the track list still sums to exactly the container.

The Term page's two halves are separated by giving the width to the **column** and taking it
back from everything in the column that is not the index. The alternative -- letting only the
index break out of a measured column -- would have required restating the grid's arithmetic a
second time to know how much margin there was to break into, and it would have been wrong the
first time the grid changed.

**The table of contents stands down on an index page.** This is the one collision the change
creates: a Term page with headings has both, and the list is a margin element while the index
has taken the margin. Squeezing both was rejected -- a 16rem sticky list in what a full-width
index leaves is a column of wrapped single words beside a truncated index -- so the collision
is settled by deciding which of the two is that page's navigation. On a page whose body is an
index it is the index; a Term's headings are a sentence or two of definition. The home page
never had one (no headings, so upstream's component renders nothing), so only the Term case
was ever real.

## The density belongs to a view, and the views are three

"One index, two views" was always about the *data*, never about the markup. Ticket 08 made the
distinction real: the rail's view is a bare foldable name list, and the entry page and a Term's
index are a **card per topic** with the note-type groups as columns across it.

The seam is the wrapper and only the wrapper. All three views reach the same inversion of
`topic` over the link graph, and below each heading they render the same group markup from the
same function; what differs is what is wrapped round it -- a `<details>` in the rail, a card on
the entry page, a card that *is* the section on a Term. A card layout written into the shared
tree instead would have landed on the rail as well, which is the one place in the app where
showing everything under every topic is wrong.

The card is the **topic**, which is what makes a Term page's single-topic index a card rather
than a container for one, and what makes the entry page's count follow the vault. Cards do not
fold, unlike the rail's items: a jump list beside an article has to stay short, and a landing
exists to be looked at. That also ended a coupling nobody wanted -- while the entry page
rendered the rail's view, its copy and the rail's shared a fold id, so collapsing a topic in one
collapsed it in the other.

**Column count is asked of the container, at both levels**:
`repeat(auto-fit, minmax(min(<floor>, 100%), 1fr))`. No breakpoint, no offset, and nothing
conditioned on whether the rail is collapsed -- the grid is told the narrowest a column may be
and works out how many fit in whatever it has been given, so the count follows the window, the
page's own cap and the rail's track without knowing about any of them. The floor is bounded by
`100%` so a container narrower than one column shrinks the column instead of pushing the page
sideways.

The card rules are reached through the cards' own classes and **never** through
`prepper-generated-index`. That class is this ADR's contract for how wide the *column* is; hanging
a card layout off it would have made one class mean two unrelated things.

## Two layout defects the ticket-08 work turned up

**The centre column was never placed.** Upstream declares no grid placement on `.center`, so it
auto-places into the first free cell of the grid -- which is the second column only for as long
as the left rail is a grid item in the first one. Collapsing the rail is `display: none`, which
stops it being one, and the article slid into the rail's track and was laid out at that track's
width, at every viewport width. This is the jump ticket 03 exists to abolish, and no proof about
the track list could see it, because the track list is not what changed. The fix is one
declaration -- `grid-column: grid-center`, naming the grid's own line so it is right in all three
bands without being restated in any -- and `prepper/sidebar/sidebar.test.ts` now asserts the
placement exists as well as asserting what the collapse may not reach.

**The footer was placed by accident.** It sat a third of the way up the empty space under a
short page. The left rail is `height: 100vh` and spans every row, so its height was distributed
across the rows it spanned -- the footer's own included -- and the footer sat at the top of a
row that had been stretched underneath it. Two declarations replace that: `#quartz-body` is at
least a windowful tall in its own right, so the page no longer depends on the rail being drawn
to be one, and the footer is `align-self: end` in its row. Free space stretches the auto rows
the way the grid always did and the footer rides the bottom of the last one; a page longer than
the window has no free space and its footer follows the content immediately. Nothing is
manufactured -- no spacer, no margin, no minimum height on the footer, no `100vh` on anything
carrying content.

A third, smaller one went with them: a capped box on an index page was **centred** over the wide
column rather than pinned to its left edge, because the only box with side margins of its own is
the rule the frame draws under the article, and a 38rem rule floating in the middle of a
full-width column reads as a second page beginning. The shared left edge is what makes a Term's
definition and its index one page, so the cap now pins as well as caps.

## Consequences

- **Motion tokens now exist, and ADR 0003 is amended.** The rail's collapse is eased, which
  makes that ADR's "nothing of ours animates" false. `prepper/tokens` gains Material's full
  motion role set, computed wholesale like every other role set it holds. One prohibition rides
  with it and is asserted by a test: **`<details>` never animates** -- not the Problem seal,
  not a heading fold, not a topic-tree fold. Those elements are shut by the HTML specification
  before a stylesheet loads, before a script runs, and inside the search preview pane, and all
  three properties are load-bearing. An eased `<details>` is a script-dependent seal wearing a
  costume. What the rail actually got is a **fade**: `opacity` over Material's `short4` on the
  `standard` curve, with the display flip carried along as a discrete step so the rail is still
  drawn while it goes. Nothing geometric is interpolated, so the non-movement proof above is
  untouched -- and a drawer that *slid* was refused for the same reason a fold that eased is,
  a rail whose position a reader can catch mid-flight is a rail that is somewhere other than
  where it says. Under `prefers-reduced-motion: reduce` there is no fade at all: disabled
  outright, build-wide, not shortened.
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
- **`prepper/topics` renders one index in views that differ in density, not just in
  position.** The rail stays a bare foldable name list; the entry page and a Term's index get
  cards and columns. The index itself stays single -- that is what stops the rail and the home
  page disagreeing about what is filed where -- and the rail's `TopicTree` gained a sibling,
  `TopicCards`, rather than being parameterised into serving both jobs badly.
