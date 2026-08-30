import { h } from "preact"
import type { ComponentChild } from "preact"

import { resolveRelative } from "../../../quartz/util/path.ts"
import type { FullSlug } from "../../../quartz/util/path.ts"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../../quartz/components/types.ts"
import { graphOf, nodeAt, outgoing, type LinkGraph } from "../../graph/graph.ts"

/**
 * A note's topics, as chips under its title.
 *
 * The chips are the `about` edges -- the note's own `topic` field, in the order it was
 * written -- and **all of them**. A note about two subjects is filed under two, and chrome
 * that showed one of them would be inventing a primary subject the author never named.
 *
 * A chip is labelled by the Term's own `title`, never by the filename `topic` was written
 * with: `topic: hash-maps` is a name in the vault's filing system, and "Hash maps" is what
 * the topic is called. Same rule the rails and the topic index are labelled by.
 *
 * A Term whose page nobody has written gets the marked, unclickable affordance an unwritten
 * link gets everywhere else. The vault is not allowed to stay in that state -- a `topic`
 * naming a note that does not exist is a validation **error** -- so the dev meets it as a
 * failed build, and the page stays honest in the meantime rather than dropping the topic.
 */
function chips(graph: LinkGraph, from: FullSlug): ComponentChild {
  const topics = outgoing(graph, from, "about")
  if (topics.length === 0) return null

  // Named for what it is rather than "Topics": the sidebar's topic tree is a landmark
  // called Topics already, and two identically named navigations is a landmark list a
  // screen reader user cannot tell apart.
  return h(
    "nav",
    { class: "prepper-topic-chips", "aria-label": "Topics this note is about" },
    topics.map((edge) => chip(graph, from, edge.target)),
  )
}

function chip(graph: LinkGraph, from: FullSlug, target: string): ComponentChild {
  const node = nodeAt(graph, target)
  if (!node) {
    return h(
      "span",
      {
        class: "prepper-topic-chip unwritten-link",
        "data-unwritten-link": target,
        title: `unwritten link: no note named ${target}`,
      },
      target.split("/").at(-1),
    )
  }
  return h(
    "a",
    { href: resolveRelative(from, node.slug), class: "prepper-topic-chip internal" },
    node.title,
  )
}

const PrepperReading: QuartzComponentConstructor = () => {
  const Reading: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = fileData.slug
    if (!slug) return null

    const graph = graphOf(allFiles)

    // Library content only, which is the same answer the graph gives about a Workshop
    // note everywhere else. A note with no node has no topics to state.
    if (!nodeAt(graph, slug)) return null

    return chips(graph, slug)
  }

  Reading.css = styles
  return Reading
}

/**
 * The reading surface itself.
 *
 * ## The measure
 *
 * The prose column holds **~38rem whatever the window is doing**, and the left sidebar
 * absorbs the difference. Quartz's own grid is the other way round -- a fixed 320px
 * sidebar and a centre column of `auto` -- which sets the line length from the viewport,
 * so a wide window buys longer lines rather than a wider margin. 38rem is about 75
 * characters at the body size, and 75 characters is the measure this is all for.
 *
 * The selectors match upstream's exactly, and the breakpoints are upstream's own 800px and
 * 1200px, because that is what makes these overrides rather than a second layout: a
 * component stylesheet is emitted into the same `@layer quartz-base` as the base styles
 * and linked after them, so an identical selector wins on order.
 *
 * ## The third track is margin, not a column
 *
 * There is no right column. Upstream's grid ends in a fixed `320px` track and ours ends in
 * `minmax(0, 1fr)`: a track that takes **nothing** when there is nothing to give and grows only
 * out of what the window has left over. That is the difference between removing a column and
 * making one narrower, and it is the whole of what ticket 06 did to the layout.
 *
 * The measure comes through it **unchanged**, and that is the constraint the change was made
 * under rather than a happy result. The centre track's clamp lost one sidebar --
 * `calc(100% - var(--prepper-sidebar) - 10px)`, one rail and two 5px gaps, which is now the
 * same shape the tablet band already had -- and at every width the page is laid out at, that
 * clamp is far larger than 38rem, so `min()` still answers with the measure. It is evaluated
 * rather than assumed: `reading.test.ts` computes the declared track list at 1280px, 1600px and
 * 1920px and asserts 608px.
 *
 * What the reclaimed width becomes on a prose page is **margin on both sides** -- the two
 * flexible tracks split it, so the prose is centred in the window instead of pushed off it.
 *
 * ## Prose keeps the measure, and a generated index does not
 *
 * A page whose body is a **generated index** -- the app's entry point, and the index under a
 * Term's own definition -- wants that reclaimed width as *content*. A topic index is a list
 * scanned in two dimensions, and 38rem of it in a 1500px window is the complaint this whole
 * effort started from. So such a page takes the whole of the second track:
 * `calc(100% - var(--prepper-sidebar) - 10px)`, which is the prose track's own clamp with the
 * measure taken out of it. A prose page takes the smaller of the measure and what is
 * available; an index page takes what is available. There is no third number.
 *
 * **The rule is keyed off what the page's body is, never off which page it is.** The two index
 * views render themselves with `prepper-generated-index`, and the layout asks `:has()` whether
 * the page contains one. No slug, no filename, no page title and no page type is named
 * anywhere in this stylesheet, which is what makes the next generated index page inherit the
 * layout by rendering that class rather than by being added to a list here.
 *
 * Three things follow, and each is a rule of its own.
 *
 * *It is declared in **every** band.* `:has()` makes the index selector more specific than the
 * plain one, so the wide band's rule would otherwise beat the tablet and phone bands at widths
 * they own. The tablet band is the two-track grid without its `min()`; the phone band is one
 * track of `100%`.
 *
 * *The prose on that page keeps the measure anyway*, which is the ticket's real hazard. **A
 * Term page is both**: a sentence or two of definition, or an area overview where the topic has
 * no Lessons, and then the generated index under it. The width is given to the column and taken
 * back from everything in the column that is not the index -- the two `max-width` rules, which
 * name the two depths the index views sit at (a direct child of `.center` on the home page,
 * inside `.page-footer` on a Term). What is left uncapped is the index and its ancestors, so
 * the definition above and the index below share a left edge and differ in width, which is the
 * relationship they are actually in.
 *
 * *The track list still sums to exactly the container*, gaps included, so a wide index cannot
 * put a horizontal scrollbar under the app's own entry page -- and the rail's track is the one
 * it always was, so `prepper/sidebar`'s collapse still moves nothing on an index page either.
 *
 * ## The table of contents floats in the margin
 *
 * It used to be the top of a 320px column and it is now one narrow sticky list in the leftover
 * space, bounded by `--prepper-toc` rather than by a track. Two things make that work and both
 * are worth stating.
 *
 * It is a **direct child of the grid**, which is why `quartz.config.yaml` places it in the
 * `footer` position: of the six layout positions, `footer` is the only one whose components are
 * rendered as children of `#quartz-body` rather than inside `.center` or a rail. That is a fact
 * about `DefaultFrame`, not about the foot of the page -- the ToC is not in the footer, it is in
 * the grid. `beforeBody` would have put it inside the `.popover-hint` the search preview clones,
 * which is the hazard `prepper/sidebar` is placed around.
 *
 * And it is `position: sticky` against **`var(--prepper-topbar-height)`**, never against a
 * number: the bar is fixed over the top of the page and a list that stuck to `top: 0` would
 * stick underneath it. `prepper/topbar` declares that token once and
 * `prepper/testing/layout.test.ts` asserts the literal appears exactly once, so this is the
 * offset rather than a second copy of it.
 *
 * Below 1200px it is not rendered, which is exactly what it did before: upstream hid it in the
 * rail at that width. Where there is no margin there is no room for a margin note, and a table
 * of contents stacked under the article is a list of places the reader has already been.
 *
 * And it is not rendered on an **index page** at any width, which is the one collision the two
 * halves of this stylesheet have with each other. A Term page with headings carries a table of
 * contents *and* a generated index; the list is a margin element and the index has taken the
 * margin. Both cannot have the leftover space, and the alternative -- letting the index run
 * under a 16rem sticky list and squeezing both -- would leave a column of wrapped single words
 * beside a truncated index. So the collision is settled by deciding which of the two is that
 * page's navigation. On a page whose body is an index, it is the index: a Term's headings are
 * a sentence or two of definition, and the list the reader came for is the one below them.
 *
 * ## The footer, and the space under a short page
 *
 * A page shorter than the window used to leave its footer stranded partway up the empty space
 * rather than at the foot of it. That was upstream's grid doing exactly what it was told: the
 * left rail is `height: 100vh` and spans every row, so its height is distributed across the
 * rows it spans -- including the footer's own -- and the footer sat at the top of a row that
 * had been stretched underneath it.
 *
 * The fix is two declarations and no new box: the grid is at least a windowful tall in its own
 * right, so it no longer depends on the rail being drawn to be one, and the footer is
 * `align-self: end` in its row. Free space stretches the auto rows the way it always did and
 * the footer rides the bottom of the last one. A page longer than the window has no free space
 * and its footer follows the content immediately. There is no spacer, no minimum height on the
 * footer and no `100vh` on anything that carries content -- the gap under a short page is the
 * window's own leftover, which is not the same thing as a gap that was invented to fill it.
 *
 * ## The serif
 *
 * `--bodyFont` is the family named in `quartz.config.yaml`, and it is a serif -- but
 * Quartz appends a hard-coded *sans* fallback stack to it, so a page whose webfont has not
 * arrived would set its prose in sans at exactly the moment the fallback exists to matter.
 * Hence a stack of our own, generic-serif tailed. The family at its head is the one named
 * in `quartz.config.yaml`; change one and change the other.
 *
 * ## The aside
 *
 * There are no margin notes: Obsidian Markdown has no notation for one, and inventing a
 * notation the vault cannot round-trip through Obsidian is the thing this project does not
 * do. An aside is therefore an ordinary blockquote, set apart typographically and sitting
 * **inside the measure** rather than breaking out of it.
 *
 * `blockquote:not([class])` and not `blockquote:not(.callout)`, because a callout is not
 * the only blockquote the build makes out of something that is not a quote: a transcluded
 * note is one, and so are a quiz's explanation and its reveal. An aside is the blockquote
 * the *author* wrote, and the author's blockquote is the one nothing has classed.
 *
 * ## The prose rules take no design tokens, and the chips do
 *
 * The rules above the chips -- the measure, the serif, the leading, the aside -- are the
 * **reading surface**, and it is exempt from the chrome's Material token layer on the merits:
 * Material has no measure and no mechanism for one, no paragraph role above 16px, and no
 * serif ([ADR 0003](../../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md)).
 * They stay on Quartz's own theme names, which `prepper/tokens` resolves onto roles anyway.
 * The chips below them are **chrome** -- a note's subjects, stated by the app rather than by
 * the author -- so they are painted from the tokens like every other chip and rail.
 *
 * ## The unwritten chip is not a pill
 *
 * `prepper/links` ships the unwritten-link mark as a plugin resource rather than as
 * component CSS, which puts it **outside `@layer quartz-base`** -- and an unlayered author
 * rule beats a layered one whatever the specificity. So its dashed `border-bottom` cannot
 * be overridden from here, and a pill drawn round an unwritten chip would come out with
 * three solid edges and one dashed one. The pill is therefore the *written* chip's, and an
 * unwritten topic reads as the gap it is, in the same mark it wears everywhere else.
 */
const styles = `
:root {
  --prepper-measure: 38rem;
  /* The rail's track, and it is minmax(..., 1fr) below whether or not a rail is drawn in
     it: prepper/sidebar hides the rail outright and re-declares no track here, so the width
     the rail gives up becomes margin and the prose column does not move. There is no second,
     collapsed grid anywhere. */
  --prepper-sidebar: 320px;
  /* What the table of contents is allowed of the margin it floats in -- a bound on the list,
     not a track in the grid. The margin itself is whatever the window has left over. */
  --prepper-toc: 16rem;
  --prepper-prose: "Source Serif 4", Charter, "Iowan Old Style", Georgia, serif;
}
.page > #quartz-body {
  grid-template-columns:
    minmax(var(--prepper-sidebar), 1fr)
    min(var(--prepper-measure), calc(100% - var(--prepper-sidebar) - 10px))
    minmax(0, 1fr);
}
/* The centre column is placed, rather than left to fall where the other grid items leave room.

   Upstream never places it: .center carries no grid-area, so it auto-places into the first
   free cell -- which is the second column only for as long as the left rail is rendered into
   the first one. The rail is display:none when it is collapsed and below 800px, and the
   moment it stops being a grid item the article slides into the rail's own track and is laid
   out at that track's width. That is a real, visible jump, and it is invisible to a proof
   written about the track list, because the track list is not what changed.

   grid-column and not grid-area, and a named line rather than a number: the areas template
   names its own lines, so grid-center is the second column in the wide and tablet bands and
   the only column in the phone one, without this rule knowing which band it is in. The row
   is still auto, so the column lands exactly where it always did with the rail present --
   this pins it there for the case where the rail is absent. */
.page > #quartz-body > .center {
  grid-column: grid-center;
}
/* The right rail is retired, and Quartz's frame renders its (now empty) box on every page
   regardless. Hidden rather than left to sit there: upstream makes it sticky, 100vh tall and
   padded, so an empty one would still be a full-height box in the margin. */
.page > #quartz-body > .right.sidebar {
  display: none;
}
@media all and (min-width: 800px) and (max-width: 1200px) {
  .page > #quartz-body {
    grid-template-columns:
      minmax(var(--prepper-sidebar), 1fr)
      min(var(--prepper-measure), calc(100% - var(--prepper-sidebar) - 5px));
  }
}
@media all and (max-width: 800px) {
  .page > #quartz-body {
    grid-template-columns: min(var(--prepper-measure), 100%);
    justify-content: center;
  }
}
/* A page whose body is a generated index takes the width the margins were holding, in
   every band, because the selector outranks the band rules above whatever their order.
   The centre track is the prose track's clamp with the measure taken out of it: a prose
   page takes the smaller of the measure and what is available, and an index page takes
   what is available. The track list still sums to exactly 100%, so nothing scrolls
   sideways, and the rail's track is the one it always was -- the collapse still moves
   nothing. */
.page > #quartz-body:has(.prepper-generated-index) {
  grid-template-columns:
    minmax(var(--prepper-sidebar), 1fr)
    calc(100% - var(--prepper-sidebar) - 10px)
    minmax(0, 1fr);
}
@media all and (min-width: 800px) and (max-width: 1200px) {
  .page > #quartz-body:has(.prepper-generated-index) {
    grid-template-columns:
      minmax(var(--prepper-sidebar), 1fr)
      calc(100% - var(--prepper-sidebar) - 5px);
  }
}
@media all and (max-width: 800px) {
  .page > #quartz-body:has(.prepper-generated-index) {
    grid-template-columns: 100%;
  }
}
/* ...and the prose on that page keeps the measure anyway, so that widening the track
   widens the index and nothing else. Two selectors, because the two index views sit at
   two depths: the home page's is a direct child of the column and a Term's is inside the
   page footer, under the note's own body. Everything in the column that is neither an
   index nor a box holding one is capped, and so is everything standing beside an index in
   that box -- which on a Term page is the typed-edge rails. What is left uncapped is the
   index and its ancestors, which is exactly the chain that has to reach the track's full
   width for the widening to mean anything. */
.page > #quartz-body:has(.prepper-generated-index) > .center > *:not(.prepper-generated-index, :has(.prepper-generated-index)),
.page > #quartz-body:has(.prepper-generated-index) > .center > .page-footer > *:not(.prepper-generated-index) {
  max-width: var(--prepper-measure);
}
/* ...and it is pinned to the index's left edge rather than centred over it. Only one box on
   the page has side margins of its own -- the rule the frame draws between the article and
   what follows it, which the browser centres inside whatever width it is given -- and a
   38rem rule floating in the middle of a full-width column reads as a second page beginning.
   The shared left edge is what makes the definition and the index below it one page, and this
   is that decision applied to the last box that was not obeying it. */
.page > #quartz-body:has(.prepper-generated-index) > .center > *,
.page > #quartz-body:has(.prepper-generated-index) > .center > .page-footer > * {
  margin-inline-start: 0;
}
@media all and (min-width: 1200px) {
  .page > #quartz-body > .toc {
    grid-area: grid-sidebar-right;
    align-self: start;
    justify-self: start;
    position: sticky;
    top: calc(var(--prepper-topbar-height) + 2rem);
    box-sizing: border-box;
    width: min(var(--prepper-toc), 100%);
    max-height: calc(100vh - var(--prepper-topbar-height) - 4rem);
    overflow-y: auto;
    padding-left: 1.5rem;
  }
}
@media all and (max-width: 1200px) {
  .page > #quartz-body > .toc {
    display: none;
  }
}
/* And it is not rendered on an index page at any width. A table of contents is a margin
   note, and on a page whose body is an index there is no margin left to put one in: the
   index has taken it. The two could not both be given the leftover space, and the answer
   is not to squeeze a 16rem list into what a full-width index leaves -- a Term's headings
   are a sentence or two of definition, while the list the reader of an index page came for
   is the index itself. So the collision is resolved by deciding which of the two is the
   page's navigation, rather than by making both of them narrow. */
.page > #quartz-body:has(.prepper-generated-index) > .toc {
  display: none;
}
/* The page is at least a windowful tall, and the site footer sits at the bottom of it.

   Two declarations, and between them they are the whole of what a sticky footer is here. The
   grid's rows are upstream's -- header, centre, footer, plus a couple more in the narrower
   bands -- and the left rail spans all of them at 100vh, which is why a short page used to
   come out with the footer stranded a third of the way up from the bottom: the rail's height
   was distributed across every row it spanned, so the *footer's own row* was stretched and the
   footer sat at the top of it.

   The min-height says what the rail used to say by accident, and says it whether or not the
   rail is drawn -- the rail is display: none when collapsed and below 800px, and a page that
   was a windowful tall only while the furniture was showing is a page whose footer moves when
   the furniture does. Free space then stretches the auto rows, as it always did, and
   align-self: end puts the footer at the bottom of the last of them, which is the bottom of
   the window. On a page longer than the window there is no free space, no stretch, and the
   footer follows the content immediately.

   So nothing is manufactured: no spacer, no margin, no minimum height on the footer, no
   100vh on anything that holds content. The space that appears under a short page is the
   window's own leftover, which was always there and was previously being handed to the wrong
   row. */
.page > #quartz-body {
  min-height: calc(100vh - var(--prepper-topbar-height));
}
.page > #quartz-body > footer {
  align-self: end;
}
.page > #quartz-body .center article {
  font-family: var(--prepper-prose);
  font-size: 1.05rem;
  line-height: 1.65;
}
.page > #quartz-body .center article blockquote:not([class]) {
  max-width: 100%;
  margin: 1.5rem 0;
  padding: 0.1rem 0 0.1rem 1.25rem;
  border-left: 3px solid var(--lightgray);
  color: var(--darkgray);
  font-size: 0.95em;
}
.prepper-topic-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.4rem 0 0.2rem;
}
.prepper-topic-chip {
  font-family: var(--md-sys-typescale-label-medium-font);
  font-size: var(--md-sys-typescale-label-medium-size);
  line-height: var(--md-sys-typescale-label-medium-line-height);
  font-weight: var(--md-sys-typescale-label-medium-weight);
  letter-spacing: var(--md-sys-typescale-label-medium-tracking);
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
}
a.prepper-topic-chip {
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  background-color: transparent;
}
a.prepper-topic-chip:hover {
  color: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
}
`

export { PrepperReading }
