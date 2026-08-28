/**
 * The Vault report, computed: **what should I write next**, and **what has rotted**.
 *
 * This is the build's other channel. Validation shouts and the report whispers, and the
 * two never share a line: a fact worth failing a build over is a rule, a fact that is not
 * is a report line, and there is nothing in between and no promotion path between them
 * ([`prepper/validation/README.md`](../validation/README.md)). **Nothing is wrong when the
 * report prints** -- so nothing here has a severity, and nothing here is ever validated.
 *
 * ## The authoring queue
 *
 * Unwritten notes, ranked by how much of the existing writing leans on them. An unwritten
 * note is a **placeholder node** in the link graph: a slug some note already points at
 * that no note answers to (`prepper/graph/graph.ts`). Terms minted with an empty body join
 * them, because a note waiting to be written is backlog rather than a defect -- and an
 * empty `term` body is on validation's *deliberately not validated* list for exactly that
 * reason.
 *
 * The ranking is **typed-then-total, with the breakdown printed, and there is no weighting
 * constant**. A `practices` obligation is a commitment somebody made in a field; a passing
 * mention in a sentence is not; and the first should outrank the second without a magic
 * number deciding by how much. Sorting on the typed count first and the total second says
 * exactly that and says nothing more -- one `practices` beats any number of mentions, and
 * among equally committed rows the busier one wins. A constant would have had to answer
 * "how many mentions is a `practices` worth", which is a question the vault cannot answer
 * and the report has no business inventing.
 *
 * The breakdown is **navigation, not decoration**. An unwritten note has no page of its
 * own, so a row that only counted its inbound links would be a number the dev cannot click
 * through to; every row therefore carries its sources, each one a link to the note that
 * wrote the link.
 *
 * A **`draft: true`** note's *body* links are left out, so the queue fills with committed
 * intent rather than speculation. Its frontmatter edges are not: `topic`, `prerequisites`
 * and `practices` are commitments whatever the note's publication state, and `draft`
 * softens nothing anywhere else in the build either.
 *
 * ## Vault hygiene
 *
 * Three facts about rot, each of which is a thing to go and look at rather than a thing to
 * fix by rule: an **attachment nothing shows**, a **Library note nothing links to**, and a
 * **Term with no inbound `topic` edge**. The last is narrowed from "nothing points at it"
 * on purpose -- the wide reading fires constantly on correct authoring, because a Term is
 * usually reached through the field that files notes under it and not through a sentence.
 *
 * ## What this reads, and what it does not
 *
 * The link graph, already computed, and the hast trees the build is about to write out.
 * Nothing here parses a wikilink or resolves a target a second time: the edges are
 * `prepper/graph`'s, the body links underneath them are `prepper/links`' record of what
 * `crawl-links` decided, and the attachment references are read off the very `src`
 * attributes the reader's browser will fetch. A report that resolved links its own way
 * could name a gap the page does not have.
 */
import * as path from "node:path"

import { visit } from "unist-util-visit"
import type { Element, Root } from "hast"

import type { QuartzPluginData } from "../../quartz/plugins/vfile.ts"
import type { FullSlug } from "../../quartz/util/path.ts"
import { slugifyFilePath } from "../../quartz/util/path.ts"
import type { FilePath } from "../../quartz/util/path.ts"

import { edgeTypes, linkGraph, type Edge, type EdgeType } from "../graph/graph.ts"

/** One note, as the report reads it. Assembled by the emitter from what Quartz hands it. */
export interface ReportNote {
  /** What the link graph reads. The same `content[]` vfile data every other consumer sees. */
  data: QuartzPluginData
  /** The note's Markdown, frontmatter included -- the only way to ask whether a body is empty. */
  source: string
  /**
   * Every attachment this note's body **shows**: the media `src` attributes in its tree,
   * resolved back to vault slugs. Read off the tree rather than off `file.data.links`,
   * which is anchors only -- `crawl-links` rewrites an `<img>` src and does not record it,
   * so an embedded image is invisible in every list of links the build keeps.
   */
  assets: string[]
}

/** One note that wrote a link at a queued row, and the field it wrote it in. */
export interface QueueSource {
  /** The linking note's slug. Always a page: only Library content is a graph edge's source. */
  slug: FullSlug
  /** Its `title`, which is what the link to it reads as. */
  title: string
  type: EdgeType
}

/** One row of the authoring queue. */
export interface QueueRow {
  /** The slug the row is about: a placeholder for an unwritten note, a real slug for an empty Term. */
  target: string
  /** How the row reads. A placeholder has no `title` to borrow, so it reads as its own name. */
  title: string
  /** Set only where a note exists -- an empty Term has a page, an unwritten note has none. */
  slug?: FullSlug
  /** Why it is in the queue. */
  reason: "unwritten" | "empty-term"
  /** Inbound edges written in a **field**: `prerequisites`, `topic`, `practices`. */
  typed: number
  /** Every inbound edge, typed and untyped alike. */
  total: number
  /** The breakdown, in edge-type order, each group carrying the notes it came from. */
  breakdown: { type: EdgeType; sources: QueueSource[] }[]
}

/** One note named in the hygiene section. */
export interface HygieneNote {
  slug: FullSlug
  title: string
}

/** What has rotted. */
export interface Hygiene {
  /** Vault-relative paths of files nothing in the vault links to or shows. */
  unreferencedAttachments: string[]
  /** Library notes with no inbound edge of any kind. */
  notesWithNoInboundLinks: HygieneNote[]
  /** Terms nothing is filed under -- no inbound *about* edge. */
  termsWithNoTopicEdge: HygieneNote[]
}

/** The whole report, as data. */
export interface VaultReport {
  queue: QueueRow[]
  hygiene: Hygiene
}

/** The three edge kinds a **field** produces. The fourth, *relates-to*, is a sentence. */
const typedEdges = new Set<EdgeType>(["prerequisite-of", "about", "practices"])

/**
 * Compute the report.
 *
 * `notes` is every note the build parsed, Workshop included -- the graph drops the
 * Workshop half itself, and an attachment a research note shows is an attachment in use,
 * so telling the dev it had rotted would be wrong. `files` is every file in the vault,
 * which is the only way to see the half of it that is not Markdown.
 */
export function vaultReport(notes: readonly ReportNote[], files: readonly string[]): VaultReport {
  const graph = linkGraph(notes.map((note) => note.data))
  const nodes = new Map(graph.nodes.map((node) => [node.slug as string, node]))
  const drafts = new Set(
    notes.filter((note) => note.data.frontmatter?.draft === true).map((note) => note.data.slug),
  )

  // The one place `draft` is read in this module. A body link is a sentence somebody may
  // yet delete; a field is a commitment they already made.
  const edges = graph.edges.filter(
    (edge) => !(edge.type === "relates-to" && drafts.has(edge.source as FullSlug)),
  )

  const inbound = new Map<string, Edge[]>()
  for (const edge of edges) {
    const at = inbound.get(edge.target) ?? []
    at.push(edge)
    inbound.set(edge.target, at)
  }

  const titles = new Map(graph.nodes.map((node) => [node.slug as string, node.title]))
  const row = (target: string, reason: QueueRow["reason"]): QueueRow => {
    const at = inbound.get(target) ?? []
    const node = nodes.get(target)
    return {
      target,
      title: node?.title ?? target.split("/").at(-1)!,
      ...(node ? { slug: node.slug } : {}),
      reason,
      typed: at.filter((edge) => typedEdges.has(edge.type)).length,
      total: at.length,
      breakdown: edgeTypes
        .map((type) => ({
          type,
          sources: at
            .filter((edge) => edge.type === type)
            .map((edge) => ({
              slug: edge.source,
              title: titles.get(edge.source) ?? edge.source,
              type,
            }))
            .sort((a, b) => byTitle(a.title, b.title)),
        }))
        .filter((group) => group.sources.length > 0),
    }
  }

  const unwritten = [...new Set(edges.map((edge) => edge.target))]
    .filter((target) => !nodes.has(target))
    .map((target) => row(target, "unwritten"))

  const emptyTerms = notes
    .filter((note) => nodes.get(note.data.slug ?? "")?.type === "term" && isEmptyBody(note.source))
    .map((note) => row(note.data.slug as string, "empty-term"))

  return {
    queue: [...unwritten, ...emptyTerms].sort(byRank),
    hygiene: {
      unreferencedAttachments: unreferencedAttachments(notes, files),
      notesWithNoInboundLinks: graph.nodes
        .filter((node) => !inbound.has(node.slug))
        .map(({ slug, title }) => ({ slug, title })),
      termsWithNoTopicEdge: graph.nodes
        .filter((node) => node.type === "term")
        .filter((node) => !(inbound.get(node.slug) ?? []).some((edge) => edge.type === "about"))
        .map(({ slug, title }) => ({ slug, title })),
    },
  }
}

/**
 * Every attachment nothing in the vault reaches.
 *
 * An attachment is any file that is not Markdown. It is *referenced* when some note links
 * it -- `prepper/links` recorded the anchor -- or shows it, which is what `assets` carries.
 * Both halves are needed: `![[diagram.png]]` becomes an `<img>` and never an anchor, and
 * `[[diagram.png]]` becomes an anchor and never an image.
 */
function unreferencedAttachments(notes: readonly ReportNote[], files: readonly string[]): string[] {
  const referenced = new Set<string>()
  for (const note of notes) {
    for (const link of note.data.bodyLinks ?? []) referenced.add(link)
    for (const asset of note.assets) referenced.add(asset)
  }

  return files
    .filter((file) => !file.endsWith(".md"))
    .filter((file) => !referenced.has(slugifyFilePath(file as FilePath)))
}

/**
 * Every attachment one note's rendered tree shows, as vault slugs.
 *
 * `src` has already been rewritten by `crawl-links` into a path relative to the page it
 * sits on, which is why the note's own slug is needed to read it back. That is the whole
 * of the resolution done here, and it is done against the build's own output rather than
 * against the Markdown: what the reader's browser fetches is what counts as showing a file.
 */
export function assetsOf(tree: Root, slug: string): string[] {
  const assets = new Set<string>()
  const from = path.posix.dirname(slug)

  visit(tree, "element", (node: Element) => {
    if (!["img", "video", "audio", "iframe", "source"].includes(node.tagName)) return
    const src = node.properties?.src
    if (typeof src !== "string" || src === "") return
    // An absolute URL names something outside the vault, and a data URI names nothing.
    if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//")) return
    const bare = decodeURIComponent(src.split("#")[0].split("?")[0])
    assets.add(path.posix.normalize(path.posix.join(from, bare)))
  })

  return [...assets]
}

/** Whether everything after the frontmatter block is whitespace. */
function isEmptyBody(source: string): boolean {
  const text = source.startsWith("---") ? source.replace(/^---\r?\n[\s\S]*?\r?\n---/, "") : source
  return text.trim() === ""
}

/**
 * Typed first, then total, then the alphabet.
 *
 * The alphabet is a tiebreak and nothing more -- it exists so that two equally-leaned-on
 * rows come out in the same order on every machine, which is what makes "building twice
 * leaves the report unchanged" a fact rather than a hope.
 */
function byRank(a: QueueRow, b: QueueRow): number {
  return b.typed - a.typed || b.total - a.total || byTitle(a.title, b.title)
}

function byTitle(a: string, b: string): number {
  return a.localeCompare(b, "en") || (a < b ? -1 : a > b ? 1 : 0)
}
