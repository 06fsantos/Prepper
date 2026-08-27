/**
 * Wikilink resolution, and the affordance an unwritten link becomes.
 *
 * `[[wikilinks]]` resolve against the **filename stem, case-insensitively**, extension
 * optional -- never against `title`, and with no shortest-unique-path matching, because
 * filenames are unique vault-wide ([ADR 0001](../../docs/adr/0001-split-note-identity.md)).
 * That resolution is Quartz's, not ours: `@quartz-community/crawl-links` at
 * `markdownLinkResolution: shortest` matches a single-segment target against the last
 * segment of every slug, and slugs are lowercased, so case-insensitive stem matching and
 * the optional extension both fall out of it. Re-implementing any of that here would give
 * the build two ways to read a link, which is the one thing wikilink handling must not
 * have.
 *
 * What is left is the half Quartz has no opinion about: **an unwritten link** -- one whose
 * target does not exist. Quartz emits it as an ordinary `<a>` pointing at a page that was
 * never built. An unwritten link is legitimate authoring practice: it marks intent, and
 * the reading surface doubles as a todo list, so it must never break the build. This
 * plugin turns it into what it means -- a marked, unclickable affordance:
 *
 *     <span class="unwritten-link" data-unwritten-link="open-addressing"
 *           title="unwritten link: no note named open-addressing">open-addressing</span>
 *
 * ## The placeholder node
 *
 * `data-unwritten-link` carries the **placeholder node**: the slug the target *would* have
 * had. Nothing is invented for it -- `crawl-links` has already put that same slug in
 * `file.data.links`, so it is a link-graph node with no note behind it, and it reaches
 * `contentIndex.json` as a target of the linking note without ever becoming an entry of
 * its own. That is exactly the two halves the spec asks for: the unwritten note is
 * rankable by how much writing leans on it (the Vault report's authoring queue), and it
 * is in neither the Library index nor search, because both read entries and it has none.
 *
 * A placeholder node is therefore *identified*, not *stored*: the identifier is the slug,
 * and every consumer derives the node from the links it already reads.
 *
 * ## Why this runs after `crawl-links`
 *
 * `crawl-links` (order 60) is what resolves an href and records the outgoing edge. This
 * plugin is order 65, so it reads a decision that has already been made and never makes
 * it twice -- and because the edge was recorded before the anchor was rewritten, marking
 * a link unwritten does not erase it from the graph.
 *
 * It also leaves on the vfile the list of targets it marked, which is how the
 * `unwritten-link` validation rule sees the build's own resolution rather than parsing
 * the vault a second time. See `prepper/validation/rules/links.ts`.
 *
 * ## Why the build parses on one thread
 *
 * "Does this target exist?" is only as good as `ctx.allSlugs`, and under Quartz's worker
 * pool that list is **not** complete. `@quartz-community/note-properties` pushes each
 * note's `aliases` and `permalink` into it during the markdown phase, but the workers get
 * a structured clone of the context that was taken before that phase and is handed to the
 * html phase unchanged (`quartz/processors/parse.ts`), so alias slugs never arrive. A
 * link to an alias would then be marked unwritten and warned about on a page that really
 * is emitted -- and only above the ~192 notes where Quartz's default concurrency stops
 * being 1, so the same vault would validate differently depending on thread count. A CI
 * gate that changes its mind with the thread count is not a gate.
 *
 * So every invocation this repo owns -- `npm run build`, `npm run serve`,
 * `npm run validate`, and the fixture harness -- passes `--concurrency 1`, which is the
 * path where the html processor is built after the markdown phase and `allSlugs` is
 * whole. It is what Quartz would have chosen on its own for a vault this size, and
 * correctness of the gate is worth more than parse threads if it ever grows past that.
 *
 * ## What is stale under `--serve`
 *
 * A watch rebuild re-parses only the files that changed and reuses every other page's
 * cached tree (`quartz/build.ts`). So writing the note an unwritten link pointed at does
 * not re-parse the page that pointed at it: that page keeps its affordance, and keeps
 * warning, until it is itself touched. Nothing is wrong with the site the next full build
 * emits; the dev server is simply a rebuild behind on the one page it did not re-read.
 */
import { visit } from "unist-util-visit"
import type { Element, Root } from "hast"
import type { VFile } from "vfile"

import type { BuildCtx } from "../../quartz/util/ctx"
import type { QuartzTransformerPluginInstance } from "../../quartz/plugins/types"

declare module "vfile" {
  interface DataMap {
    /**
     * Every unwritten target this note links to, deduplicated and sorted: the
     * **placeholder nodes** the note's body points at.
     *
     * Written by this plugin during the html phase, read by the `unwritten-link`
     * validation rule in the emitter phase. Body links only -- a `prerequisites` or
     * `topic` target is frontmatter, never reaches the note's hast tree, and a missing
     * one is an error rather than an unwritten link.
     */
    unwrittenLinks: string[]
    /**
     * Every internal link this note's **body** resolved to, as full slugs, deduplicated
     * and in the order the anchors appear in the note.
     *
     * `file.data.links` cannot answer this question. `crawl-links` appends
     * `frontmatterLinks` -- anything `note-properties` found `[[…]]` syntax in, anywhere
     * in the frontmatter -- into that same set before writing it, so a target written
     * only in `topic` is indistinguishable there from one written in a sentence. The link
     * graph types an edge by the field it was written in and by nothing else, so it needs
     * the body half on its own, and this is the only place in the build that still knows
     * which is which: an anchor in the tree is a link the author wrote in prose.
     *
     * Full slugs, not the simplified ones `file.data.links` holds, so that this and
     * `unwrittenLinks` -- which is the same `data-slug`, read on the same visit -- are
     * keyed alike. The two diverge exactly where a target resolves to an `index` page,
     * and a placeholder that one list held and the other did not would leave the page,
     * the validation report and the graph disagreeing about which gaps exist.
     */
    bodyLinks: string[]
  }
}

export const manifest = {
  name: "prepper-links",
  displayName: "Prepper links",
  description: "Marks a wikilink whose target does not exist as an unwritten link.",
  version: "1.0.0",
  category: "transformer",
}

/**
 * What makes the affordance *visible*, rather than merely classed.
 *
 * "Marked and unclickable" is a claim about what the reader sees, so the mark ships with
 * the plugin that makes it rather than waiting on a stylesheet elsewhere: a note full of
 * unwritten links has to read as a note full of gaps. It is deliberately small and
 * entirely in Quartz's own theme variables, so the reading-surface work can restyle it
 * without having to first find and undo a colour invented here.
 */
const unwrittenLinkStyles = `
.unwritten-link {
  color: var(--gray);
  border-bottom: 1px dashed var(--gray);
  cursor: not-allowed;
}
`

const PrepperLinks = (): QuartzTransformerPluginInstance => ({
  name: "PrepperLinks",
  externalResources: () => ({ css: [{ content: unwrittenLinkStyles, inline: true }] }),
  htmlPlugins(ctx: BuildCtx) {
    // Every slug the vault could answer to, attachments included -- `ctx.allSlugs` is
    // built from every *file*, before any filter runs. So a note that exists but is
    // filtered out of the corpus is not unwritten: its target is there, merely
    // invisible, and saying otherwise would send the dev to write a note they already
    // wrote.
    //
    // Files are not the whole of what gets a page, though. Quartz *generates* a page per
    // folder and per tag at emit time, and neither is a file, so neither is in
    // `allSlugs`. A link to one resolves to a page that really is emitted, and marking it
    // unwritten would both break it and warn about writing a note that cannot be written.
    // Folders are recoverable from the slugs themselves; tags are recognised at the link
    // instead, below.
    const existing = new Set<string>([...ctx.allSlugs, ...folderIndexSlugs(ctx.allSlugs)])

    return [
      () => (tree: Root, file: VFile) => {
        const unwritten = new Set<string>()
        const body = new Set<string>()

        visit(tree, "element", (node: Element) => {
          if (node.tagName !== "a" || isTagLink(node)) return
          const target = node.properties["data-slug"]
          // `data-slug` is `crawl-links`' record of where an *internal* link resolved
          // to. An external link, a bare `#anchor`, and Quartz's own heading permalinks
          // all lack it, so none of them can be mistaken for an unwritten note.
          if (typeof target !== "string") return

          // Every internal anchor in the tree is a link the author wrote in the body,
          // an embed's inner anchor included: `![[…]]` is a reference to a note the same
          // way a sentence's link is, and the graph counts it as one. Recorded before
          // the unwritten test, because a link to a note nobody has written yet is still
          // a link the vault contains -- that is the whole of what a placeholder node is.
          body.add(target)

          if (isTranscludeInner(node) || existing.has(target)) return

          unwritten.add(target)
          markUnwritten(node, target)
        })

        file.data.bodyLinks = [...body]
        file.data.unwrittenLinks = [...unwritten].sort()
      },
    ]
  },
})

/**
 * The slug of the index page Quartz generates for every folder that holds a file.
 *
 * `folder-page` emits `<folder>/index.html` for each of them, and `crawl-links` resolves
 * a folder link -- `[[topics/]]`, or a bare `topics` that names a directory -- to that
 * same `<folder>/index`. Those pages are generated at emit time and no file on disk
 * produces them, so `ctx.allSlugs` has never heard of one. Deriving them from the slugs
 * of the files inside is exact: a folder has an index page iff a file lives under it,
 * which is the same condition, read from the same list.
 */
function folderIndexSlugs(slugs: readonly string[]): string[] {
  const folders = new Set<string>()
  for (const slug of slugs) {
    const segments = slug.split("/")
    for (let i = 1; i < segments.length; i++) {
      folders.add(segments.slice(0, i).join("/") + "/index")
    }
  }
  return [...folders]
}

/**
 * Whether this anchor is a tag rather than a link to a note.
 *
 * An inline `#tag` becomes an ordinary internal `<a>` pointing at `tags/<tag>`, a page
 * `tag-page` generates at emit time from no file at all -- so it is never in
 * `ctx.allSlugs` and would otherwise be marked unwritten on every note that carries a
 * tag. The class is `obsidian-flavored-markdown`'s own mark, and `note-properties` uses
 * the same one for the tags it renders, so recognising it catches both.
 *
 * It is also the right answer on the domain's terms and not only the mechanism's: a tag
 * is not a wikilink, and there is no note anybody could write to satisfy it.
 */
function isTagLink(node: Element): boolean {
  const classes = node.properties.className
  return Array.isArray(classes) && classes.includes("tag-link")
}

/**
 * Whether this anchor is the inside of an embed rather than a link the reader clicks.
 *
 * An `![[…]]` embed is emitted as `blockquote.transclude` wrapping an anchor, and the
 * *anchor's* `data-slug` is what `renderPage` reads at build time to find the target to
 * splice in. Rewriting it would leave `renderPage` reading the embedding page's own slug
 * and reporting a circular transclusion, so an embed is left exactly as Quartz made it.
 *
 * That is a scope boundary, not only a mechanical one: an embed whose target is missing
 * or is Workshop degrades into this same affordance and raises a validation **error**,
 * and that belongs to the transform that owns embeds. An unwritten *link* is the thing
 * here, and it is a warning.
 */
function isTranscludeInner(node: Element): boolean {
  const classes = node.properties.className
  return Array.isArray(classes) && classes.includes("transclude-inner")
}

/**
 * Turn one resolved anchor into the affordance, in place.
 *
 * In place, because the node keeps its children: the link text is whatever the author
 * wrote, alias included, so `[[robin-hood-hashing|Robin Hood hashing]]` still reads as
 * the sentence it was fitted to. A `<span>` rather than an `<a>` with no `href` is what
 * makes it unclickable rather than merely inert-looking, and it takes the target out of
 * reach of Quartz's popover and SPA scripts, which key on anchors.
 */
function markUnwritten(node: Element, target: string): void {
  node.tagName = "span"
  node.properties = {
    className: ["unwritten-link"],
    "data-unwritten-link": target,
    title: `unwritten link: no note named ${target}`,
  }
}

export default PrepperLinks
