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
  --prepper-sidebar: 320px;
  --prepper-prose: "Source Serif 4", Charter, "Iowan Old Style", Georgia, serif;
}
.page > #quartz-body {
  grid-template-columns:
    minmax(var(--prepper-sidebar), 1fr)
    min(var(--prepper-measure), calc(100% - 2 * var(--prepper-sidebar) - 10px))
    var(--prepper-sidebar);
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
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gray);
}
a.prepper-topic-chip {
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--lightgray);
  border-radius: 1rem;
  background-color: transparent;
}
a.prepper-topic-chip:hover {
  color: var(--secondary);
  border-color: var(--secondary);
}
`

export { PrepperReading }
