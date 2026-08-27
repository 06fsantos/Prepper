/**
 * The **topic index**: `topic` inverted on the Term note, computed once.
 *
 * The question this answers is *what shall I study today*, and the dev asks it in topics
 * rather than in directories -- so this is the navigation, and the directory tree is not.
 * It is **generated**, which is the whole of why it can be trusted: there is no
 * hand-maintained list of "what is here on Big-O" to fall behind the vault, because the
 * only thing that files a note under a topic is that note's own `topic` field.
 *
 * ## One index, three renderings
 *
 * The tree on the entry page, the tree in the sidebar and the index on a Term page are
 * this one computation shown three ways. There is never a second index to maintain, and
 * two of the three can never disagree with the third, because there is only one of them.
 * `prepper/topics/components` renders the first two and the third; `prepper/home` renders
 * the entry page from the same function.
 *
 * ## Why a Term is a topic, and every Term is one
 *
 * `topic` names a Term ([`CONTEXT.md`](../../CONTEXT.md)), so the Terms *are* the topic
 * vocabulary and there is nothing else a topic could be. A Term nothing is filed under is
 * therefore still a topic -- an empty one -- and that is not a defect to hide: "System
 * design" with no Lessons under it is a topic the dev has named and not yet written, and
 * its own body is where the area overview for it lives. Dropping it from the tree would
 * make the one place that says so unreachable.
 *
 * ## Why a note appears under every topic it names
 *
 * A note about two topics is listed under **both**. The vault was designed around notes
 * belonging to more than one topic, and deduplicating one into a single "primary" topic
 * would be the design deciding, silently and wrongly, which of the two the reader meant.
 * Whichever topic they came in through, the note is there.
 */
import { incoming, nodeAt, type GraphNode, type LinkGraph } from "../graph/graph.ts"
import type { LibraryType } from "../note-type.ts"

/** One note type's worth of a topic's leaves, under the heading that names it. */
export interface TopicGroup {
  type: LibraryType
  /** How the group reads to a reader: `Cheat sheet`, `Lessons`, `Problems`. */
  heading: string
  /** The notes of that type filed under the topic, in title order. */
  notes: GraphNode[]
}

/** One topic: the Term that names it, and everything written about it. */
export interface Topic {
  /** The Term note. Its page is where the index is rendered in full. */
  term: GraphNode
  /** Non-empty groups only, in reading order. Empty for a topic nothing is filed under. */
  groups: TopicGroup[]
}

/**
 * The note types a topic's leaves are grouped into, in the order a reader meets them.
 *
 * **Cheat sheet is pinned first** and is not there by alphabet: it is the quick-catchup
 * document, so it is the first thing seen under a topic. The rest run in reading order
 * rather than alphabetically -- the Lessons that teach the topic, the References that go
 * deeper, the Problems that drill it, and last the other Terms it touches -- which is the
 * order somebody arriving at a topic cold would want them in.
 */
const groupOrder: readonly [type: LibraryType, heading: string][] = [
  ["cheat-sheet", "Cheat sheet"],
  ["lesson", "Lessons"],
  ["reference", "References"],
  ["problem", "Problems"],
  ["term", "Terms"],
]

/**
 * Every topic in the vault, in the order a reader scans them.
 *
 * Alphabetical by the Term's own `title`, which is what a reader scanning a list expects
 * and what slug order is not. Memoised on the graph it was computed from: the sidebar
 * renders on every page and the graph is already computed once per build, so inverting it
 * once per build is the matching promise. A `WeakMap` keyed on the graph makes that safe
 * rather than merely fast -- a rebuild under `--serve` produces a new graph object, so
 * there is no version of this that can go stale.
 */
export function topicIndex(graph: LinkGraph): Topic[] {
  const cached = indexes.get(graph)
  if (cached) return cached

  const topics = graph.nodes
    .filter((node) => node.type === "term")
    .sort((a, b) => byTitle(a.title, b.title))
    .map((term) => ({ term, groups: groupsUnder(graph, term) }))

  indexes.set(graph, topics)
  return topics
}

const indexes = new WeakMap<LinkGraph, Topic[]>()

/**
 * The topic one slug names, or undefined where the slug is not a Term.
 *
 * Undefined is the answer a Lesson gets, and the reason the Term-page index renders
 * nowhere else: an index of "everything about this topic" on a note that is not a topic
 * would be an index of nothing, dressed up as an empty one.
 */
export function topicOf(graph: LinkGraph, slug: string): Topic | undefined {
  const node = nodeAt(graph, slug)
  if (!node || node.type !== "term") return undefined
  return topicIndex(graph).find((topic) => topic.term.slug === slug)
}

/**
 * Every Cheat sheet in the vault, in title order and under no topic at all.
 *
 * The flat list that sits alongside the tree. Its whole point is that it is *not* the
 * tree: a dev who wants the condensed page on a topic they can already name should not
 * have to navigate into that topic to reach it, and a Cheat sheet filed under two topics
 * appears once here rather than twice.
 */
export function cheatSheets(graph: LinkGraph): GraphNode[] {
  return graph.nodes
    .filter((node) => node.type === "cheat-sheet")
    .sort((a, b) => byTitle(a.title, b.title))
}

/**
 * What is filed under one Term, grouped and ordered.
 *
 * The `about` edges pointing **at** the Term are exactly the notes that named it in
 * `topic`, already sorted by the source note's title -- so this reads the graph's inverse
 * rather than re-deriving it, which is what keeps the index and the rails one index.
 * A group with nothing in it is dropped rather than rendered empty: a heading over no
 * links tells the reader nothing they could not see.
 */
function groupsUnder(graph: LinkGraph, term: GraphNode): TopicGroup[] {
  const filed = incoming(graph, term.slug, "about")
    .map((edge) => nodeAt(graph, edge.source))
    .filter((node): node is GraphNode => node !== undefined)

  return groupOrder
    .map(([type, heading]) => ({ type, heading, notes: filed.filter((n) => n.type === type) }))
    .filter((group) => group.notes.length > 0)
}

/**
 * Title order: alphabetical, the same comparison the rails sort by.
 *
 * Pinned to `en` rather than taken from the machine, so that one vault produces one
 * ordering everywhere -- which is what a build output that tests can assert on needs.
 */
function byTitle(a: string, b: string): number {
  return a.localeCompare(b, "en") || (a < b ? -1 : a > b ? 1 : 0)
}
