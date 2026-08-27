/**
 * The link graph, through seam 1.
 *
 * One fixture, `typed-edges`: a chain of Lessons, the Problems that drill one of them, the
 * Terms they are about, a Reference that links one of them in prose, and a Workshop note
 * that links it too. Every assertion here is about the graph the build wrote down --
 * what is a node, what is an edge, and which of the four kinds each edge is.
 *
 * The rendering of these edges is `../edges/edges.test.ts`. The split is the same one the
 * code makes: this file is about the index, that one about where a reader meets it.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import { buildFixture, type EmittedSite } from "../testing/build-fixture.ts"
import type { LinkGraph } from "./graph.ts"

/** Every edge as one readable line, so a failing assertion is legible as a whole. */
function edgeLines(graph: LinkGraph): string[] {
  return graph.edges.map((edge) => `${edge.type}: ${edge.source} -> ${edge.target}`)
}

describe("the link graph", () => {
  let site: EmittedSite
  let graph: LinkGraph

  before(
    async () => {
      site = await buildFixture("typed-edges")
      graph = site.linkGraph
    },
    { timeout: 300_000 },
  )

  test("all four edge kinds are computed, and each takes its type from its field", () => {
    // The whole graph in one assertion, because the fact being stated is about the set:
    // no edge kind is missing, none is invented, and nothing arrived by a second route.
    assert.deepEqual(edgeLines(graph), [
      "about: lessons/array-indexing -> terms/hash-maps",
      "prerequisite-of: lessons/hash-map-lookup-cost -> lessons/array-indexing",
      "about: lessons/hash-map-lookup-cost -> terms/hash-maps",
      "about: lessons/hash-map-lookup-cost -> terms/complexity",
      "prerequisite-of: lessons/load-factor-tuning -> lessons/hash-map-lookup-cost",
      "about: lessons/load-factor-tuning -> terms/hash-maps",
      "prerequisite-of: lessons/open-addressing -> lessons/hash-map-lookup-cost",
      "about: lessons/open-addressing -> terms/hash-maps",
      "relates-to: lessons/open-addressing -> lessons/hash-map-lookup-cost",
      "relates-to: lessons/open-addressing -> missing-folder/index",
      "about: problems/lru-cache -> terms/hash-maps",
      "practices: problems/lru-cache -> lessons/hash-map-lookup-cost",
      "practices: problems/lru-cache -> eviction-policies",
      "about: problems/two-sum -> terms/hash-maps",
      "practices: problems/two-sum -> lessons/hash-map-lookup-cost",
      "about: references/hash-map-internals -> terms/hash-maps",
      "relates-to: references/hash-map-internals -> lessons/hash-map-lookup-cost",
      "relates-to: references/hash-map-internals -> terms/hash-maps",
      "relates-to: terms/complexity -> lessons/hash-map-lookup-cost",
      "relates-to: terms/eviction -> lessons/hash-map-lookup-cost",
    ])
  })

  test("one target named in two fields is two edges of two types", () => {
    // `references/hash-map-internals` says it is about `hash-maps` twice: in `topic`, and
    // again in its prose. Nothing in the syntax distinguishes them -- both are the same
    // filename -- so the two edges can only have come from the two *fields*, which is the
    // whole of "typed by the field it was written in, never by inline syntax".
    assert.deepEqual(
      graph.edges
        .filter(
          (e) => e.source === "references/hash-map-internals" && e.target === "terms/hash-maps",
        )
        .map((e) => e.type),
      ["about", "relates-to"],
    )
  })

  test("a frontmatter target keeps its meaning when Obsidian wrote the brackets", () => {
    // `open-addressing` declares `topic: "[[hash-maps]]"` and `prerequisites: ["[[…]]"]`,
    // which is Obsidian's own storage format for a Link property -- what any note whose
    // fields were edited through its property UI looks like on disk. The brackets say
    // nothing about the edge; the field still does. Left unhandled they would slugify
    // into the target, and the note would point at a name no note can ever answer to.
    assert.deepEqual(
      graph.edges
        .filter((e) => e.source === "lessons/open-addressing")
        .map((e) => `${e.type}: ${e.target}`),
      [
        "prerequisite-of: lessons/hash-map-lookup-cost",
        "about: terms/hash-maps",
        "relates-to: lessons/hash-map-lookup-cost",
        "relates-to: missing-folder/index",
      ],
    )
  })

  test("a link written only in a field is never also an untyped body edge", () => {
    // The mirror of the test above it: `hash-map-internals` names `hash-maps` in both
    // `topic` and its prose and gets two edges, while `open-addressing` names it in
    // `topic` alone and gets one. Nothing but *where the link was written* separates
    // those two cases, which is the invariant in a single assertion -- and the one that
    // decides whether a note turns up in a Term's backlinks panel for having filed
    // itself under it.
    const about = (slug: string) =>
      graph.edges
        .filter((e) => e.source === slug && e.target === "terms/hash-maps")
        .map((e) => e.type)

    assert.deepEqual(about("references/hash-map-internals"), ["about", "relates-to"])
    assert.deepEqual(about("lessons/open-addressing"), ["about"])
  })

  test("an edge's direction is the note that wrote the link, pointing at the one it names", () => {
    // `load-factor-tuning` is the note carrying `prerequisites`, so it is the source; the
    // Lesson it names is the target. "This unlocks" is that same edge, read backwards.
    const prerequisites = graph.edges.filter((e) => e.type === "prerequisite-of")
    assert.deepEqual(
      prerequisites.map((e) => `${e.source} -> ${e.target}`),
      [
        "lessons/hash-map-lookup-cost -> lessons/array-indexing",
        "lessons/load-factor-tuning -> lessons/hash-map-lookup-cost",
        "lessons/open-addressing -> lessons/hash-map-lookup-cost",
      ],
    )
  })

  test("nodes are Library content, and carry the note's own title", () => {
    assert.deepEqual(
      graph.nodes.map((node) => `${node.type} ${node.slug} "${node.title}"`),
      [
        'lesson lessons/array-indexing "How array indexing works"',
        'lesson lessons/hash-map-lookup-cost "What a hash map lookup actually costs"',
        'lesson lessons/load-factor-tuning "Tuning the load factor"',
        'lesson lessons/open-addressing "open addressing"',
        'problem problems/lru-cache "LRU cache"',
        'problem problems/two-sum "Two sum"',
        'reference references/hash-map-internals "Hash map internals"',
        'term terms/complexity "Complexity"',
        'term terms/eviction "Éviction policies"',
        'term terms/hash-maps "Hash maps"',
      ],
    )
  })

  test("a Workshop note is neither a node, nor the source of an edge, nor a page", () => {
    // The research note carries a `topic` and links a Lesson in its prose, so it would
    // have contributed two edges had the graph been willing to hear from it.
    //
    // Both halves of the Workshop boundary in one assertion, because they are one claim:
    // the reader never meets this note. The graph half is ticket 05's, the page half is
    // the filter in `prepper/workshop`.
    const workshop = "research/why-hash-maps-were-chosen"
    assert.ok(!graph.nodes.some((node) => node.slug === workshop), `${workshop} is a node`)
    assert.ok(
      !graph.edges.some((edge) => edge.source === workshop || edge.target === workshop),
      `${workshop} has edges`,
    )
    assert.ok(!site.hasPage(workshop), `${workshop} was given a page`)
  })

  test("a Workshop note is still in the vault the rules see", () => {
    // The other side of the filter, and the reason it could be written at all. The
    // research note is not in `content[]` by the time any emitter runs, so validation
    // counts it only because the filter handed it back -- and a `research` note with no
    // `sources` has to go on failing rather than passing by being invisible.
    assert.match(site.log, /in 11 notes/)
  })

  test("a page Quartz generated is not a node", () => {
    // `folder-page` emits an index per directory at emit time, from no file on disk. Those
    // pages carry a path that reads as a note type -- `lessons/index.md` looks like a
    // Lesson -- and letting one in would put a folder listing in the graph as a Lesson
    // nobody wrote.
    for (const generated of ["lessons/index", "terms/index", "problems/index"]) {
      assert.ok(site.hasPage(generated), `${generated} was never emitted`)
      assert.ok(!graph.nodes.some((node) => node.slug === generated), `${generated} is a node`)
    }
  })

  test("a target nobody has written is a placeholder: an edge with no node", () => {
    // `practices` is the deliberate exception -- an unwritten target satisfies it, because
    // intent is allowed -- and this is what carrying that intent looks like in the graph.
    // It is the same shape ticket 14 ranks an unwritten note by.
    const placeholder = "eviction-policies"
    assert.ok(
      graph.edges.some((edge) => edge.target === placeholder && edge.type === "practices"),
      `nothing points at ${placeholder}`,
    )
    assert.ok(!graph.nodes.some((node) => node.slug === placeholder), `${placeholder} is a node`)
    assert.ok(!site.hasPage(placeholder), `${placeholder} was given a page`)
  })

  test("the graph is emitted beside Quartz's index rather than in place of it", () => {
    // Nothing here replaces `contentIndex.json`: search, the graph view and popovers read
    // that, and they read exactly what Quartz put there.
    assert.ok(site.files.includes("static/linkGraph.json"))
    assert.deepEqual(site.noteSlugs(), [
      "lessons/array-indexing",
      "lessons/hash-map-lookup-cost",
      "lessons/load-factor-tuning",
      "lessons/open-addressing",
      "problems/lru-cache",
      "problems/two-sum",
      "references/hash-map-internals",
      "terms/complexity",
      "terms/eviction",
      "terms/hash-maps",
    ])
  })

  test("the page, the report and the graph name a placeholder identically", () => {
    // `open-addressing` links `[[missing-folder/]]`, which resolves to an *index* slug --
    // the one shape where the two lists Quartz keeps disagree, because `file.data.links`
    // holds a simplified slug and the anchor holds the full one. Three channels describe
    // this gap and all three have to call it the same thing, or the Vault report's
    // authoring queue (ticket 14) ranks a note the page never said was missing.
    const placeholder = "missing-folder/index"
    const page = site.page("lessons/open-addressing")
    assert.equal(
      String(page.require(".unwritten-link", page.body).properties.dataUnwrittenLink),
      placeholder,
    )
    assert.match(site.log, new RegExp(`unwritten link to \`${placeholder}\``))
    assert.ok(
      graph.edges.some((edge) => edge.target === placeholder && edge.type === "relates-to"),
      `the graph has no edge to ${placeholder}`,
    )
  })

  test("a vault whose only violations are warnings still passes", () => {
    // A warning marks intent and never fails a build. Two of them here: the unwritten
    // link above, and `hash-maps` being taught four times with nothing summarising it.
    assert.equal(site.exitCode, 0, site.log)
    assert.match(site.log, /0 errors, 2 warnings in 11 notes/)
  })
})
