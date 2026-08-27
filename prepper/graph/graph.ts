/**
 * The link graph: the whole vault's links, indexed once, with every edge **typed by the
 * field it was written in**.
 *
 * | where the link was written | edge type         |
 * | -------------------------- | ----------------- |
 * | `prerequisites`            | *prerequisite-of* |
 * | `topic`                    | *about*           |
 * | `practices`                | *practices*       |
 * | a body wikilink            | *relates-to*      |
 *
 * Typing by **field and never by inline syntax** is what keeps the vocabulary honest:
 * there is no notation for the author to get wrong, no second way to say "this is a
 * prerequisite", and a link's meaning is a property of where it sits rather than of how it
 * was spelled. It also means the four kinds cannot collide -- a body wikilink to a Term is
 * *relates-to* even when that Term is also the note's `topic`, because the `topic` field
 * is where the *about* edge was written.
 *
 * ## Nodes are Library content and nothing else
 *
 * A node is a note the reader can reach: `lesson`, `reference`, `problem`, `term`,
 * `cheat-sheet`. A Workshop note is neither a node nor the source of an edge -- it is in
 * the vault, and the graph has never heard of it. So a Workshop note's body link does not
 * put its title in anybody's backlinks panel, which is the whole of what "the reader never
 * sees it" has to mean for the graph.
 *
 * An edge's target, by contrast, is only a slug. Where a node answers to it, it is that
 * note; where nothing does, it is a **placeholder node** -- the unwritten note that some
 * existing writing already leans on, which is what lets the authoring queue rank one
 * (ticket 14). Telling a placeholder apart from a target that exists but is invisible is
 * not a question the graph can answer, and deliberately so: it is the corpus that knows,
 * and the Workshop-boundary rules are where it gets asked (ticket 06).
 *
 * ## Where resolution comes from
 *
 * Body links are already resolved: `@quartz-community/crawl-links` resolved each one and
 * `prepper/links` wrote the result down as `bodyLinks`, and reading that is what stops the
 * graph from being a second wikilink implementation (see `prepper/links/index.ts`, which
 * reads the same decision). It is deliberately *not* `file.data.links`, which is the body's
 * links **and the frontmatter's**, merged: typing an edge by the field it was written in
 * needs the two kept apart, and that list has already mixed them.
 *
 * A frontmatter target is not a link Quartz ever saw -- `topic`, `prerequisites` and
 * `practices` never reach a note's hast tree, so nothing resolved them. Resolving them is
 * therefore not a second reading of the same thing, and it is not done here either: it is
 * `prepper/link-targets.ts`, shared with the vocabulary rules that have to say whether a
 * target exists. One implementation, so that a vault cannot validate clean and still
 * render a rail pointing at nothing.
 */
import type { FullSlug } from "../../quartz/util/path.ts"
import type { QuartzPluginData } from "../../quartz/plugins/vfile.ts"

import { isLibrary, typeOf, type NoteType } from "../note-type.ts"
import { stemOf, targets } from "../link-targets.ts"

/** The four edge kinds, in the order the spec lists them. Also the order they serialise in. */
export const edgeTypes = ["prerequisite-of", "about", "practices", "relates-to"] as const

export type EdgeType = (typeof edgeTypes)[number]

/**
 * One typed link.
 *
 * An edge always points **from the note that wrote the link to the note it names**, so
 * `{ source: "lessons/load-factor-tuning", target: "lessons/hash-map-lookup-cost",
 * type: "prerequisite-of" }` is the `prerequisites` list on *load-factor-tuning* naming
 * *hash-map-lookup-cost*. Read the inverse -- "what does this note unlock" -- by asking
 * for the edges that point *at* it.
 */
export interface Edge {
  /** Slug of the Library note the link was written in. Always a node. */
  source: FullSlug
  /**
   * Slug the link names. A node where one answers to it, a **placeholder** where none
   * does -- which is why this is a bare slug rather than a `FullSlug`: a placeholder is a
   * name no page was ever emitted for, and nothing may resolve a URL against it.
   */
  target: string
  type: EdgeType
}

/** One Library note, as the graph knows it. */
export interface GraphNode {
  slug: FullSlug
  /** The note's `title`. What a link to it is labelled with, never the alias it was written with. */
  title: string
  type: NoteType
}

/**
 * The whole vault's links, computed once.
 *
 * Plain data, because this is also what `static/linkGraph.json` is: `nodes` in slug order,
 * `edges` in the order they were written -- note by note in slug order, and within a note,
 * `prerequisites` then `topic` then `practices` then the body, each in the order the author
 * wrote them. Authored order is worth keeping: a "Read first" block that reordered a
 * dev's prerequisite list would be inventing a sequence they did not write.
 */
export interface LinkGraph {
  nodes: GraphNode[]
  edges: Edge[]
}

/** Which frontmatter field carries which edge kind, in the order they are read. */
const fieldEdges: [field: string, type: EdgeType][] = [
  ["prerequisites", "prerequisite-of"],
  ["topic", "about"],
  ["practices", "practices"],
]

/**
 * Build the graph from the corpus.
 *
 * `files` is `allFiles` in a component and `content[]`'s vfile data in an emitter -- the
 * same list, reached two ways, which is what lets the rails a reader sees and the index a
 * later ticket reads be the same graph rather than two that agree by luck.
 */
export function linkGraph(files: readonly QuartzPluginData[]): LinkGraph {
  const notes = files
    .filter((file) => isLibrary(noteTypeOf(file)))
    .sort((a, b) => compare(a.slug ?? "", b.slug ?? ""))

  const nodes: GraphNode[] = notes.map((file) => ({
    slug: file.slug as FullSlug,
    title: String(file.frontmatter?.title ?? file.slug),
    type: noteTypeOf(file)!,
  }))

  // `byStem` answers a frontmatter target, which names a filename. A body link needs no
  // index: `prepper/links` recorded it as the full slug `crawl-links` resolved it to,
  // which is a node's own slug where a node answers to it.
  const byStem = new Map<string, FullSlug>()
  const slugs = new Set<string>()
  for (const node of nodes) {
    byStem.set(stemOf(node.slug), node.slug)
    slugs.add(node.slug)
  }

  const edges: Edge[] = []
  for (const file of notes) {
    const source = file.slug as FullSlug
    const seen = new Set<string>()
    const add = (target: string, type: EdgeType) => {
      if (target === source || seen.has(`${type} ${target}`)) return
      seen.add(`${type} ${target}`)
      edges.push({ source, target, type })
    }

    for (const [field, type] of fieldEdges) {
      for (const { stem } of targets(file.frontmatter?.[field])) {
        add(byStem.get(stem) ?? stem, type)
      }
    }

    // Body links, narrowed to the ones that mean a note. `bodyLinks` also holds every
    // tag and folder index the note pointed at -- pages Quartz generates from no file at
    // all, which nobody could write and which must therefore never look like an unwritten
    // note. `prepper/links` has already told those apart from a genuine gap, so a body
    // link counts here when a node answers to it or when it is one of the gaps that
    // plugin marked.
    //
    // `bodyLinks` and not `file.links`, which is not the body: `crawl-links` merges the
    // frontmatter's links into that set, so a Term named in `topic` would arrive here
    // too and earn a second, untyped edge -- putting the note in that Term's backlinks
    // panel on the strength of a link written in a field. An edge's type comes from
    // where the link was written, and this is the list that still knows.
    const unwritten = new Set(file.unwrittenLinks ?? [])
    for (const link of file.bodyLinks ?? []) {
      if (slugs.has(link)) add(link, "relates-to")
      else if (unwritten.has(link)) add(link, "relates-to")
    }
  }

  return { nodes, edges }
}

/** Every edge of one kind written **in** this note, in the order it was written. */
export function outgoing(graph: LinkGraph, slug: string, type: EdgeType): Edge[] {
  return graph.edges.filter((edge) => edge.type === type && edge.source === slug)
}

/** Every edge of one kind pointing **at** this note, sorted by the source note's title. */
export function incoming(graph: LinkGraph, slug: string, type: EdgeType): Edge[] {
  const titles = new Map(graph.nodes.map((node) => [node.slug, node.title]))
  return graph.edges
    .filter((edge) => edge.type === type && edge.target === slug)
    .sort((a, b) => byTitle(titles.get(a.source) ?? a.source, titles.get(b.source) ?? b.source))
}

/** The node a slug names, or undefined when the slug is a placeholder. */
export function nodeAt(graph: LinkGraph, slug: string): GraphNode | undefined {
  return graph.nodes.find((node) => node.slug === slug)
}

/**
 * A file's note type, from the directory it sits in.
 *
 * Undefined for anything Quartz *generated*, which is the point of asking for `filePath`
 * as well as `relativePath`: the index page synthesised for `lessons/` carries a
 * `relativePath` of `lessons/index.md` and would otherwise read as a Lesson, putting a
 * folder listing in the graph as though somebody had written it. No file was read to make
 * it, so it has no `filePath`, and that is the only thing that tells the two apart.
 */
function noteTypeOf(file: QuartzPluginData): NoteType | undefined {
  if (!file.relativePath || !file.filePath) return undefined
  return typeOf(file.relativePath)
}

/**
 * Slug order: code-point, because a slug is an identifier rather than a word. Identical
 * on every machine, which is what `nodes` and `edges` being a stable build output needs.
 */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Title order: **alphabetical**, which is what a reader scanning a rail is expecting and
 * what code-point order is not -- it files every lowercase word after every uppercase one
 * and every accented letter after `Z`, so `iterators` and `Éviction policies` would both
 * land past `Zippers`. The locale is pinned rather than taken from the machine so that the
 * same vault still sorts the same way everywhere.
 */
function byTitle(a: string, b: string): number {
  return a.localeCompare(b, "en") || compare(a, b)
}

/**
 * The graph for one corpus, computed once however many times it is asked for.
 *
 * "Computed once at build" is a claim the components would otherwise falsify on their own:
 * six of them render on every page -- four rails, the sidebar tree, a Term's index -- each
 * handed the same `allFiles`, so a vault of two hundred notes would index itself twelve
 * hundred times. Keying on the array's identity is what makes the cache safe rather than
 * merely fast: a rebuild under `--serve` hands over a new array, so there is no version of
 * this that can go stale, and a `WeakMap` lets the previous build's graph be collected
 * with the list it was computed from.
 *
 * It lives here, beside the computation, rather than in either of the two component
 * plugins that ask for it -- one cache per plugin would be two graphs per build, which is
 * the exact cost the cache exists to avoid.
 */
const graphs = new WeakMap<readonly QuartzPluginData[], LinkGraph>()

export function graphOf(files: readonly QuartzPluginData[]): LinkGraph {
  const cached = graphs.get(files)
  if (cached) return cached

  const graph = linkGraph(files)
  graphs.set(files, graph)
  return graph
}
