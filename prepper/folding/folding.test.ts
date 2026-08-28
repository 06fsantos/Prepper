/**
 * Collapsible headings, through seam 1: a note goes in, its own outline comes out.
 *
 * The assertions are on the emitted HTML rather than on a tree, and the load-bearing ones
 * are about the two things a script could not be trusted with. **Closed** is an attribute
 * that is absent from the markup the build wrote, not a class a stylesheet interprets; and
 * **still there** is the whole of the note being in the document and in the search index,
 * because folding is a way of reading a page rather than a way of withholding one.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import type { Element } from "hast"

import { buildFixture, type EmittedSite, type Page } from "../testing/build-fixture.ts"

/** Every fold on the page, as `[depth, heading]`, in document order. */
function folds(page: Page): [depth: string | undefined, heading: string][] {
  return page.selectAll("details.prepper-fold", page.body).map((fold) => {
    const depth = fold.properties["dataDepth"]
    return [typeof depth === "string" ? depth : undefined, page.text("summary", fold)]
  })
}

describe("collapsible headings", () => {
  let site: EmittedSite
  let lesson: Page

  before(
    async () => {
      site = await buildFixture("folded-headings")
      lesson = site.page("lessons/writing-a-binary-search")
    },
    { timeout: 120_000 },
  )

  test("every heading in the body becomes a fold, at the depth it was written", () => {
    assert.deepEqual(folds(lesson), [
      ["2", "The invariant"],
      ["3", "Why half-open beats closed"],
      ["4", "The one that still bites"],
      ["3", "Where the loop ends"],
      ["2", "Common mistakes"],
    ])
  })

  test("a fold contains the folds written under it", () => {
    // `selectAll` matches the scope element as well as what is inside it.
    const inside = (fold: Element) =>
      lesson.selectAll("details.prepper-fold", fold).filter((found) => found !== fold)

    // The `###` sections belong to the `##` they were written under, and the `####` to its
    // own `###`. Cut on a fixed depth instead and each of these is a sibling of the section
    // it is part of.
    const invariant = lesson.selectAll("details.prepper-fold", lesson.body)[0]
    assert.deepEqual(
      inside(invariant).map((fold) => lesson.text("summary", fold)),
      ["Why half-open beats closed", "The one that still bites", "Where the loop ends"],
    )

    const halfOpen = inside(invariant)[0]
    assert.deepEqual(
      inside(halfOpen).map((fold) => lesson.text("summary", fold)),
      ["The one that still bites"],
    )
  })

  test("every fold the build wrote is closed", () => {
    // `open` is what the HTML specification reads, and its absence is what makes the page
    // folded in the search preview pane, on a slow load, and with scripting off. A test that
    // looked at a class would pass on a page that a stylesheet was hiding.
    for (const fold of lesson.selectAll("details.prepper-fold", lesson.body)) {
      assert.equal(fold.properties.open, undefined)
    }
  })

  test("what was written above the first heading is not folded", () => {
    const opening = "Everything below the first heading"
    assert.ok(lesson.text("p", lesson.body).startsWith(opening))
    assert.equal(
      lesson
        .selectAll("details.prepper-fold p", lesson.body)
        .some((paragraph) => lesson.text(undefined, paragraph).startsWith(opening)),
      false,
      "the opening paragraph is what a reader chooses a section by",
    )
  })

  test("a folded heading is still a heading, with its id and its permalink", () => {
    const heading = lesson.require("details.prepper-fold > summary > h2", lesson.body)
    assert.equal(heading.properties.id, "the-invariant")
    assert.equal(
      lesson.select('a[href="#the-invariant"]', heading)?.properties.role,
      "anchor",
      "the table of contents and every permalink point at this id",
    )
  })

  test("folding conceals nothing: the whole note is on the page and in the index", () => {
    const page = lesson.text(undefined, lesson.body)
    assert.match(page, /overflows in a fixed-width integer/)

    const indexed = site.contentIndex["lessons/writing-a-binary-search"].content
    assert.match(indexed, /overflows in a fixed-width integer/)
    assert.match(indexed, /insertion point/)
  })

  test("a wikilink written under a folded heading is still a link and still an edge", () => {
    // The fold is markup wrapped round the same subtree, so everything downstream -- the
    // link crawler, the graph, the topic chips -- sees exactly what it saw before.
    assert.deepEqual(
      lesson.links().map((link) => link.text),
      ["binary-search"],
    )
    assert.deepEqual(site.contentIndex["lessons/writing-a-binary-search"].links, [
      "terms/binary-search",
    ])
    assert.ok(site.contentIndex["lessons/writing-a-binary-search"].tags.includes("binary-search"))
    assert.equal(lesson.text(".prepper-topic-chip"), "Binary search")
  })
})

describe("what is not folded", () => {
  test("a Problem folds on its own contract and is left alone by this transform", async () => {
    const site = await buildFixture("problem-sections")
    const problem = site.page("problems/two-sum")

    assert.deepEqual(problem.selectAll("details.prepper-fold", problem.body), [])
    // Its own seal is untouched, and still the only disclosure on the page.
    assert.ok(problem.select("details.problem-seal", problem.body))
  })
})
