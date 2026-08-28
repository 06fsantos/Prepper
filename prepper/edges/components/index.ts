import { h } from "preact"
import type { ComponentChild } from "preact"

import { resolveRelative } from "../../../quartz/util/path.ts"
import type { FullSlug } from "../../../quartz/util/path.ts"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../../quartz/components/types.ts"
import {
  graphOf,
  incoming,
  nodeAt,
  outgoing,
  type Edge,
  type LinkGraph,
} from "../../graph/graph.ts"

/** Which slice of the graph one placement renders. See `../index.ts` for why it is an option. */
export type Section = "read-first" | "unlocks" | "practices" | "backlinks"

export const sections = ["read-first", "unlocks", "practices", "backlinks"] as const

export interface Options {
  section: Section
}

/**
 * The `section` one config entry asked for, or a refusal to build.
 *
 * `Options` is a TypeScript type over a YAML file, which is to say it is a comment. What
 * actually arrives is whatever the dev typed, and both ways of getting it wrong are worth
 * catching here rather than downstream: a typo (`read-frist`) would otherwise fall through
 * `railsFor`'s switch and throw a `TypeError` deep inside page render, which Quartz
 * reports as a stack trace naming neither the plugin nor the option; and an entry that
 * *omits* `section` would fail silently instead, quietly rendering a Backlinks panel in
 * whichever position that entry claimed.
 *
 * So there is no default. Four entries, four slices, and each one says which it is: a
 * component that renders the wrong half of the link graph is not something the dev should
 * have to notice by reading the page.
 */
function sectionOf(opts: Options | undefined): Section {
  const written = opts?.section
  const named = sections.map((s) => `\`${s}\``).join(", ")
  if (written === undefined) {
    throw new Error(
      `prepper-edges: this entry declares no \`options.section\`. Every ./prepper/edges entry in quartz.config.yaml names the slice of the link graph it renders: one of ${named}.`,
    )
  }
  if (!(sections as readonly string[]).includes(written)) {
    throw new Error(
      `prepper-edges: \`options.section: ${JSON.stringify(written)}\` is not a section. Expected one of ${named}.`,
    )
  }
  return written
}

/**
 * One rail: a heading and the notes under it.
 *
 * `rails` rather than a single list because `practices` is the one section that renders
 * **both directions** -- a Lesson lists the Problems that drill it, a Problem names the
 * Lesson it drills -- and on a note that is both it is two lists, not one merged one.
 */
interface Rail {
  heading: string
  edges: Edge[]
  /** The end of each edge this rail is naming: its `source` for an inverted rail. */
  end: "source" | "target"
}

function railsFor(section: Section, graph: LinkGraph, slug: string): Rail[] {
  switch (section) {
    case "read-first":
      return [
        { heading: "Read first", edges: outgoing(graph, slug, "prerequisite-of"), end: "target" },
      ]
    case "unlocks":
      return [
        { heading: "This unlocks", edges: incoming(graph, slug, "prerequisite-of"), end: "source" },
      ]
    case "practices":
      return [
        { heading: "Practises", edges: outgoing(graph, slug, "practices"), end: "target" },
        { heading: "Practised by", edges: incoming(graph, slug, "practices"), end: "source" },
      ]
    case "backlinks":
      // Untyped body links, and only those. A note that names this one in `prerequisites`,
      // `topic` or `practices` is already saying so in its own rail, in context; repeating
      // it here would make the panel a second, worse copy of what the page already shows.
      return [{ heading: "Backlinks", edges: incoming(graph, slug, "relates-to"), end: "source" }]
  }
}

const PrepperEdges: QuartzComponentConstructor<Options> = (opts) => {
  // At construction, which is config-instantiation time -- so a mistyped section is a
  // build that refuses to start, not a page that renders the wrong rail.
  const section = sectionOf(opts)

  const Edges: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = fileData.slug
    if (!slug) return null

    const graph = graphOf(allFiles)

    // Library content only. A Workshop note has no node, so it has no rails -- the same
    // answer the graph gives about it everywhere else.
    if (!nodeAt(graph, slug)) return null

    const rails = railsFor(section, graph, slug).filter((rail) => rail.edges.length > 0)
    if (rails.length === 0) return null

    return h(
      "aside",
      { class: `prepper-edges prepper-edges-${section}` },
      rails.map((rail) =>
        h("section", { class: "prepper-rail" }, [
          h("h2", { class: "prepper-rail-heading" }, rail.heading),
          h(
            "ul",
            { class: "prepper-rail-list" },
            rail.edges.map((edge) => h("li", null, entry(graph, slug, edge[rail.end] as string))),
          ),
        ]),
      ),
    )
  }

  Edges.css = styles
  return Edges
}

/**
 * One named note in a rail.
 *
 * Labelled by the target's own `title`, never by the alias a body link was written with:
 * an alias was fitted to the sentence it sat in, and it says nothing outside it.
 *
 * A target with no node renders as the same marked, unclickable affordance an unwritten
 * body link gets (`prepper/links`). That is the honest rendering of a `practices` entry
 * naming a Problem nobody has written yet -- which the spec allows on purpose, because
 * intent is allowed -- and the affordance is what makes the gap read as a gap.
 *
 * One state it reads wrong, deliberately: a frontmatter target that *exists* but is not
 * Library content has no node either, and gets the same "unwritten" mark. The graph cannot
 * tell those apart and should not try (see `../../graph/graph.ts`). It is a state the vault
 * is not allowed to be in -- a `prerequisites` or `practices` target that is not Library
 * content is an **error** (ticket 06) -- so the dev meets it as a failed build long before
 * they meet it as a tooltip.
 */
function entry(graph: LinkGraph, from: FullSlug, target: string): ComponentChild {
  const node = nodeAt(graph, target)
  if (!node) {
    return h(
      "span",
      {
        class: "unwritten-link",
        "data-unwritten-link": target,
        title: `unwritten link: no note named ${target}`,
      },
      target.split("/").at(-1),
    )
  }
  return h("a", { href: resolveRelative(from, node.slug), class: "internal" }, node.title)
}

/**
 * Enough style for a rail to read as chrome rather than as prose, and no more.
 *
 * Painted from the chrome's Material token layer
 * ([ADR 0003](../../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md)): a rail
 * is chrome, so it takes its hairline from `outline-variant` -- the role for a divider,
 * rather than the colour name that used to serve as both a divider and a disabled label --
 * and its heading from `label-medium`, which is the same role the topic index's group
 * headings and the chips take. Those three used to be 0.8rem, 0.75rem and 0.75rem, which is
 * the drift the token layer exists to end.
 *
 * A rail is flat: it sits on the page rather than over it, so it has no elevation. Shadow is
 * spent only on surfaces that genuinely float and occlude.
 */
const styles = `
.prepper-edges {
  display: block;
}
.prepper-edges-read-first,
.prepper-edges-unlocks,
.prepper-edges-practices {
  border-left: 2px solid var(--md-sys-color-outline-variant);
  padding-left: 1rem;
  margin: 1.5rem 0;
}
.prepper-rail-heading {
  font-family: var(--md-sys-typescale-label-medium-font);
  font-size: var(--md-sys-typescale-label-medium-size);
  line-height: var(--md-sys-typescale-label-medium-line-height);
  font-weight: var(--md-sys-typescale-label-medium-weight);
  letter-spacing: var(--md-sys-typescale-label-medium-tracking);
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0 0 0.4rem;
}
.prepper-rail-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
}
.prepper-rail-list > li {
  margin: 0.2rem 0;
}
.prepper-edges-backlinks .prepper-rail-list > li > a {
  background-color: transparent;
}
`

export { PrepperEdges }
