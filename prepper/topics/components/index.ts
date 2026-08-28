import { readFileSync } from "node:fs"

import { h } from "preact"
import type { ComponentChild } from "preact"

import { resolveRelative } from "../../../quartz/util/path.ts"
import type { FullSlug } from "../../../quartz/util/path.ts"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../../quartz/components/types.ts"
import type { GraphNode } from "../../graph/graph.ts"
import { graphOf } from "../../graph/graph.ts"

import { cheatSheets, topicIndex, topicOf, type Topic } from "../topic-index.ts"

/** Which view of the one index a placement renders. See `../index.ts` for why it is an option. */
export type View = "sidebar" | "term-index"

export const views = ["sidebar", "term-index"] as const

export interface Options {
  view: View
}

/**
 * The `view` one config entry asked for, or a refusal to build.
 *
 * The same no-default rule `prepper/edges` follows, for the same reason: `Options` is a
 * TypeScript type over a YAML file, which is to say it is a comment, and an entry that
 * omitted `view` would quietly render the sidebar tree in whichever position that entry
 * claimed. Two entries, two views, and each one says which it is.
 */
function viewOf(opts: Options | undefined): View {
  const written = opts?.view
  const named = views.map((v) => `\`${v}\``).join(" or ")
  if (written === undefined) {
    throw new Error(
      `prepper-topics: this entry declares no \`options.view\`. Every ./prepper/topics entry in quartz.config.yaml names the view of the topic index it renders: ${named}.`,
    )
  }
  if (!(views as readonly string[]).includes(written)) {
    throw new Error(
      `prepper-topics: \`options.view: ${JSON.stringify(written)}\` is not a view. Expected ${named}.`,
    )
  }
  return written
}

/**
 * The whole topic index as a tree, from the page it is being rendered on.
 *
 * Exported because three placements render it: the sidebar and a Term page here, and the
 * app's entry point in `prepper/home`. They share this function rather than each building
 * their own markup, which is the rendering half of "one index, two views" -- a tree that
 * disagreed with itself between the sidebar and the home page would be exactly the second
 * index this design exists to not have.
 */
export function TopicTree(topics: Topic[], from: FullSlug): ComponentChild {
  return h(
    "nav",
    { class: "prepper-topics", "aria-label": "Topics" },
    h(
      "ul",
      { class: "prepper-topic-list" },
      topics.map((topic) =>
        h(
          "li",
          { class: "prepper-topic", "data-topic": topic.term.slug },
          fold(
            topic.term.slug,
            link(from, topic.term, "prepper-topic-name"),
            topic.groups.length > 0
              ? h("ul", { class: "prepper-topic-groups" }, groups(topic, from))
              : null,
          ),
        ),
      ),
    ),
  )
}

/**
 * One collapsible item of the navigation: a row that is always there, and a body that folds
 * away behind it.
 *
 * A `<details>`, for the reason every other fold in this build is one -- it is shut by the
 * HTML specification rather than by a stylesheet or a script, so it works before either has
 * arrived and it can be worked by the keyboard without anybody writing the keyboard half. The
 * difference from `prepper/folding` is the default: a note's headings **arrive closed**,
 * because a closed outline is how a reader chooses a section, whereas navigation that arrived
 * closed would make the reader open a topic to find out whether it holds anything. So this
 * ships `open`, and what is remembered is the exceptions -- see `folds.js`.
 *
 * `data-fold` is the item's identity in that memory, and it is the only thing the scripts
 * know about the tree. An item with nothing to fold -- a topic nothing has been written under
 * yet -- renders as the same row without the disclosure, keeping the chevron's width so the
 * names still line up.
 */
function fold(id: string, heading: ComponentChild, body: ComponentChild): ComponentChild {
  if (body === null) {
    return h("div", { class: "prepper-topic-fold-row prepper-topic-fold-leaf" }, [
      chevron(false),
      heading,
    ])
  }
  return h("details", { class: "prepper-topic-fold", "data-fold": id, open: true }, [
    h("summary", { class: "prepper-topic-fold-row" }, [chevron(true), heading]),
    body,
  ])
}

/**
 * The disclosure arrow: pointing right, turned a quarter when the item is open.
 *
 * Turned by the stylesheet off `[open]`, which is the attribute the browser maintains -- so
 * the arrow cannot disagree with the fold, and it is right on a page whose scripts never ran.
 * It does not animate: `prepper/tokens` defines no motion at all, deliberately, and one
 * module reaching for a transition is how a vocabulary nothing owns gets started.
 *
 * `aria-hidden`, because a `<summary>` already announces itself as expanded or collapsed.
 */
function chevron(present: boolean): ComponentChild {
  const classes = present
    ? "prepper-topic-fold-chevron"
    : "prepper-topic-fold-chevron prepper-topic-fold-chevron-empty"
  return h(
    "svg",
    {
      class: classes,
      viewBox: "0 0 24 24",
      width: "16",
      height: "16",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    [h("polyline", { points: "9 6 15 12 9 18" })],
  )
}

/**
 * One topic's leaves, grouped by note type.
 *
 * The same markup wherever the index is rendered, so that a Term page's index and the
 * sidebar's subtree for that same Term are the same thing rendered twice rather than two
 * things that happen to agree today.
 */
function groups(topic: Topic, from: FullSlug): ComponentChild[] {
  return topic.groups.map((group) =>
    h("li", { class: "prepper-topic-group", "data-note-type": group.type }, [
      h("span", { class: "prepper-group-heading" }, group.heading),
      h(
        "ul",
        { class: "prepper-group-list" },
        group.notes.map((note) => h("li", null, link(from, note))),
      ),
    ]),
  )
}

/**
 * One note, named by its own `title`.
 *
 * Never by a filename and never by an alias somebody fitted to a sentence -- the same rule
 * a rail is labelled by, and for the same reason: the index is read away from every
 * sentence the note was mentioned in.
 */
function link(from: FullSlug, node: GraphNode, extraClass?: string): ComponentChild {
  const classes = extraClass ? `internal ${extraClass}` : "internal"
  return h(
    "a",
    {
      href: resolveRelative(from, node.slug),
      class: classes,
      // Where the reader already is. `aria-current` rather than a class, because "this one
      // is the page you are on" is a fact a screen reader has to be told as well as shown --
      // and the stylesheet can paint from the attribute, so there is one statement of it.
      "aria-current": node.slug === from ? "page" : undefined,
    },
    node.title,
  )
}

/**
 * The flat alphabetical Cheat sheets list, alongside the tree and not inside it.
 *
 * A dev who can already name the topic they want condensed should not have to navigate
 * into that topic to reach its Cheat sheet, so this is the one list in the sidebar that
 * is not keyed by topic at all.
 */
function CheatSheets(sheets: GraphNode[], from: FullSlug): ComponentChild {
  if (sheets.length === 0) return null
  return h(
    "section",
    { class: "prepper-cheat-sheets" },
    fold(
      "cheat-sheets",
      h("h2", { class: "prepper-cheat-sheets-heading" }, "Cheat sheets"),
      h(
        "ul",
        { class: "prepper-cheat-sheet-list" },
        sheets.map((sheet) => h("li", null, link(from, sheet))),
      ),
    ),
  )
}

/**
 * The sidebar: the topic tree, the Cheat sheets list, and the drawer that holds both.
 *
 * ## Why the drawer is a checkbox
 *
 * Below roughly 900px there is no room for a tree beside the reading column, so the whole
 * panel goes off-canvas behind a toggle. The toggle is a `<label>` over a hidden checkbox
 * rather than a button with a click handler, which means the sidebar opens on a phone
 * **whether or not the page's JavaScript ran** -- on a slow connection, with scripts
 * blocked, or on the first paint before Quartz's SPA router has attached. Navigation that
 * needs a script to open is navigation that is sometimes not there, and this is the only
 * way into the library.
 *
 * The markup order is load-bearing: the checkbox comes first so that `:checked ~ …` can
 * reach the panel and the scrim, which are its later siblings. Nothing else depends on it.
 */
function Sidebar(topics: Topic[], sheets: GraphNode[], from: FullSlug): ComponentChild {
  const control = "prepper-sidebar-toggle"
  return h("div", { class: "prepper-sidebar" }, [
    h("input", { type: "checkbox", id: control, class: "prepper-sidebar-switch", hidden: true }),
    h("label", { class: "prepper-sidebar-open", for: control }, "Topics"),
    h("div", { class: "prepper-sidebar-panel" }, [
      h("label", { class: "prepper-sidebar-close", for: control }, "Close"),
      TopicTree(topics, from),
      CheatSheets(sheets, from),
    ]),
    h("label", { class: "prepper-sidebar-scrim", for: control, "aria-hidden": "true" }, null),
  ])
}

/**
 * A Term page's index: everything Library the vault holds about this topic.
 *
 * It renders **below the note's body**, which is what makes a Term with no Lessons work.
 * Such a Term has no Cheat sheet -- nothing has been written to condense -- so its own body
 * is where the area overview for the topic lives, and a topic like "System design" needs
 * somewhere to explain itself before it needs a list. The overview is what the reader came
 * for; the index is what they leave through.
 *
 * An empty topic still gets the heading and a line saying so, rather than nothing at all.
 * The reader has arrived at a topic that exists and is unwritten, and being told that is
 * more use than being shown a page that looks like it forgot to render.
 */
function TermIndex(topic: Topic, from: FullSlug): ComponentChild {
  return h("section", { class: "prepper-topic-index", "data-topic": topic.term.slug }, [
    h("h2", { class: "prepper-topic-index-heading" }, "In this topic"),
    topic.groups.length > 0
      ? h("ul", { class: "prepper-topic-groups" }, groups(topic, from))
      : h(
          "p",
          { class: "prepper-topic-index-empty" },
          "Nothing has been written under this topic yet.",
        ),
  ])
}

const PrepperTopics: QuartzComponentConstructor<Options> = (opts) => {
  // At construction, which is config-instantiation time -- so a mistyped view is a build
  // that refuses to start, not a page that renders the wrong half of the navigation.
  const view = viewOf(opts)

  const Topics: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = fileData.slug
    if (!slug) return null

    const graph = graphOf(allFiles)

    if (view === "sidebar") {
      return Sidebar(topicIndex(graph), cheatSheets(graph), slug)
    }

    // Terms only. A topic is a Term and nothing else, so an "everything about this topic"
    // index on a Lesson would be an index of nothing wearing an empty state.
    const topic = topicOf(graph, slug)
    return topic ? TermIndex(topic, slug) : null
  }

  Topics.css = styles
  // Only the sidebar view folds, so only that entry carries the scripts -- both entries
  // taking them would put the same two files in the bundle twice. The entry point renders
  // `TopicTree` too, and it is laid out as ordinary content, so the sidebar is on that page
  // and its scripts reach the tree in the body.
  if (view === "sidebar") {
    Topics.beforeDOMLoaded = script("remember-folds.js")
    Topics.afterDOMLoaded = script("folds.js")
  }
  return Topics
}

/**
 * The browser halves, read off disk rather than written here as strings.
 *
 * The same arrangement `prepper/quiz`, `prepper/problems` and `prepper/sidebar` use: what is
 * in the `.js` file is what reaches the page, with no build step of ours in between. Quartz
 * minifies them into `static/`, where the `prepper-` in the class names and the storage key
 * survives -- which is what `prepper/testing/browser.ts` picks our scripts out by.
 */
function script(name: string): string {
  return readFileSync(new URL(name, new URL("../", import.meta.url)), "utf8")
}

/**
 * Enough style for the index to read as navigation, and the drawer that makes it usable on
 * a phone.
 *
 * Painted from the chrome's Material token layer
 * ([ADR 0003](../../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md)). Every
 * micro-heading in here -- the note-type groups, the Cheat sheets heading, the Term page's
 * "In this topic" -- is one role, `label-medium`, and so are the rails in `prepper/edges` and
 * the chips in `prepper/reading`. They were 0.75rem, 0.75rem and 0.8rem before, which is what
 * "six modules painting against nine colour names" looked like from the type side.
 *
 * The breakpoint is 900px rather than Quartz's own 800px on purpose: the tree carries note
 * titles two levels deep, so it runs out of horizontal room before the rest of the layout
 * does. Below it the panel is fixed, off-canvas and slid in by the checkbox; above it the
 * panel is an ordinary block and the toggle, the close button and the scrim are not
 * rendered at all.
 *
 * ## The one elevated surface of ours
 *
 * Above the breakpoint the panel is a column of the page: it carries no surface of its own and
 * casts nothing, because there is nothing for it to sit on top of. Below it, the drawer is
 * **fixed over the article with a scrim between**, which is the one thing in this build that
 * genuinely floats and occludes -- so it is the one thing of ours that takes a shadow, at
 * Material's level 1, the step for a modal navigation drawer. Quartz's link popover is the
 * other floating surface, and `prepper/tokens` styles that one because it is global chrome
 * rather than a module.
 *
 * The slide is not motion the token layer knows about: there is deliberately no motion
 * subsystem, and this transition predates the tokens and belongs to the drawer rather than to
 * a vocabulary anything else could reach for.
 */
const styles = `
.prepper-sidebar-switch,
.prepper-sidebar-open,
.prepper-sidebar-close,
.prepper-sidebar-scrim {
  display: none;
}
/* Every list the index renders, wherever it is rendered: the sidebar's tree, the Cheat sheets
   list beside it, and the Term page's "In this topic". They are siblings rather than nested,
   so a rule on the tree alone would set two adjacent lists in two typefaces at two sizes. */
.prepper-topics,
.prepper-cheat-sheets,
.prepper-topic-index {
  font-family: var(--md-sys-typescale-body-medium-font);
  font-size: var(--md-sys-typescale-body-medium-size);
  letter-spacing: var(--md-sys-typescale-body-medium-tracking);
}
.prepper-topic-list,
.prepper-topic-groups,
.prepper-group-list,
.prepper-cheat-sheet-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.prepper-topic {
  margin: 0 0 0.1rem;
}
.prepper-topic-name {
  font-size: var(--md-sys-typescale-title-small-size);
  line-height: var(--md-sys-typescale-title-small-line-height);
  font-weight: var(--md-sys-typescale-title-small-weight);
  letter-spacing: var(--md-sys-typescale-title-small-tracking);
}
/* The row a whole item is worked by: the disclosure, the name, and the width between them.
   list-style: none twice because the marker a browser puts on a <summary> is a list
   marker in the standard and a pseudo-element in WebKit, and the chevron is the arrow. */
.prepper-topic-fold > summary {
  list-style: none;
}
.prepper-topic-fold > summary::-webkit-details-marker {
  display: none;
}
.prepper-topic-fold-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-medium);
  cursor: pointer;
}
.prepper-topic-fold-leaf {
  cursor: default;
}
.prepper-topic-fold-row:hover {
  background-color: var(--md-sys-color-surface-container-high);
}
.prepper-topic-fold-row > a {
  flex: 1;
  color: var(--md-sys-color-on-surface);
  background-color: transparent;
}
.prepper-topic-fold-chevron {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
}
.prepper-topic-fold[open] > summary .prepper-topic-fold-chevron {
  transform: rotate(90deg);
}
/* A topic nothing has been written under has no disclosure, and still takes its width: the
   names line up down the tree whether or not each one holds anything. */
.prepper-topic-fold-chevron-empty {
  visibility: hidden;
}
/* Indented to where the names start, so a group sits under the topic it belongs to rather
   than under the arrow that opens it. */
.prepper-topic-groups {
  margin: 0.1rem 0 0.5rem 1.4rem;
}
/* Every leaf of the navigation, in both lists: a row of the same shape as the one above it,
   the whole width of the rail, so the pointer never has to find the words. This is scoped to
   the two navigation lists on purpose -- a Term page's own index renders the same markup as
   part of a document, and rows with hover states are furniture. */
.prepper-topics .prepper-group-list > li > a,
.prepper-cheat-sheets .prepper-cheat-sheet-list > li > a {
  display: block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-medium);
  color: var(--md-sys-color-on-surface-variant);
  background-color: transparent;
}
.prepper-topics .prepper-group-list > li > a:hover,
.prepper-cheat-sheets .prepper-cheat-sheet-list > li > a:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}
/* Where the reader is. Painted from aria-current, which the markup sets for the screen
   reader's sake, so the highlight and the announcement cannot come apart. */
.prepper-topics a[aria-current="page"],
.prepper-cheat-sheets a[aria-current="page"] {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
.prepper-group-heading,
.prepper-cheat-sheets-heading,
.prepper-topic-index-heading {
  font-family: var(--md-sys-typescale-label-medium-font);
  font-size: var(--md-sys-typescale-label-medium-size);
  line-height: var(--md-sys-typescale-label-medium-line-height);
  font-weight: var(--md-sys-typescale-label-medium-weight);
  letter-spacing: var(--md-sys-typescale-label-medium-tracking);
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
}
.prepper-group-heading {
  display: block;
  margin: 0.4rem 0 0.1rem;
}
.prepper-topics .prepper-group-heading {
  padding-left: 0.5rem;
}
.prepper-group-list > li {
  margin: 0;
}
/* A rule rather than a gap: the flat Cheat sheets list is not a topic, and the tree above it
   now runs to the edge of the rail, so the two need a line between them to read as two. */
.prepper-cheat-sheets {
  margin: 1rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}
.prepper-cheat-sheets-heading {
  margin: 0;
}
.prepper-cheat-sheets .prepper-cheat-sheet-list {
  margin-left: 1.4rem;
}
.prepper-cheat-sheets .prepper-topic-fold-row > .prepper-cheat-sheets-heading {
  flex: 1;
}
.prepper-topic-index {
  margin: 1.5rem 0 0;
}
.prepper-topic-index-heading {
  margin: 0 0 0.4rem;
}
.prepper-topic-index-empty {
  color: var(--md-sys-color-on-surface-variant);
}
@media all and (max-width: 900px) {
  .prepper-sidebar-open,
  .prepper-sidebar-close {
    display: inline-block;
    cursor: pointer;
    border: 1px solid var(--md-sys-color-outline);
    border-radius: var(--md-sys-shape-corner-small);
    padding: 0.3rem 0.7rem;
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    line-height: var(--md-sys-typescale-label-large-line-height);
    font-weight: var(--md-sys-typescale-label-large-weight);
    letter-spacing: var(--md-sys-typescale-label-large-tracking);
    color: var(--md-sys-color-on-surface-variant);
  }
  .prepper-sidebar-panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 3;
    width: min(20rem, 85vw);
    padding: 1.5rem 1rem;
    overflow-y: auto;
    background-color: var(--md-sys-color-surface-container-low);
    border-right: 1px solid var(--md-sys-color-outline-variant);
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }
  /* The shadow belongs to the open state, not to the panel: a closed drawer is still in the
     layout, merely translated off-canvas, and a box-shadow paints outside the border box --
     so stated on the panel itself it would smudge the left edge of every phone page. */
  .prepper-sidebar-switch:checked ~ .prepper-sidebar-panel {
    transform: translateX(0);
    box-shadow: var(--md-sys-elevation-level1);
  }
  .prepper-sidebar-switch:checked ~ .prepper-sidebar-scrim {
    display: block;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    background-color: var(--md-sys-color-scrim);
    opacity: 0.32;
  }
}
`

export { PrepperTopics }
