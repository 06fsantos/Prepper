/**
 * The search index, through seam 1: a vault goes in, `contentIndex.json` comes out.
 *
 * Every assertion here is about the emitted index rather than about the walk that built
 * it. That is deliberate and it is the point of the ticket: the index is a *different
 * artifact* from the page, and the only way to state that is to read both.
 */
import assert from "node:assert"
import { before, describe, test } from "node:test"

import { buildFixture, type EmittedSite } from "../testing/build-fixture.ts"

/** The `content` field for a slug: what search actually matches a query against. */
function indexed(site: EmittedSite, slug: string): string {
  const entry = site.notes[slug]
  assert.ok(entry, `no index entry for ${slug}. Indexed: ${site.noteSlugs().join(", ")}`)
  return entry.content
}

describe("the search index covers the Library and nothing else", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("topic-index")
    },
    { timeout: 300_000 },
  )

  test("all five Library types are indexed, with no type-level exclusion list", () => {
    assert.equal(site.exitCode, 0, site.log)

    // One note of every Library type, named by slug so that a type quietly dropping out
    // of search names itself. There is no list anywhere in the build that this mirrors:
    // a type is in because it renders.
    for (const slug of [
      "lessons/hash-map-lookup-cost",
      "references/hash-map-internals",
      "problems/two-sum",
      "terms/hash-maps",
      "cheat-sheets/hash-map-quick-reference",
    ]) {
      assert.ok(indexed(site, slug).length > 0, `${slug} is in the index with no content`)
    }
  })

  test("a Term matching on title alone is still a result", () => {
    // Thin by design: a Term's body is a sentence or two above its generated index, and
    // "where is the Big-O page" is a real query. Being findable is not conditional on
    // having enough prose to rank on.
    assert.match(indexed(site, "terms/hash-maps"), /hashes each key to a bucket/)
  })
})

describe("Workshop is out of the index structurally", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("typed-edges")
    },
    { timeout: 300_000 },
  )

  test("a Research note is not a search result", () => {
    assert.equal(site.exitCode, 0, site.log)

    // `prepper/workshop` is a *filter*, so this note left the corpus before any emitter
    // saw it. Nothing in search knows the word "Workshop" -- the assertion is that the
    // boundary already holds, not that search re-enforces it.
    assert.ok(
      !("research/why-hash-maps-were-chosen" in site.contentIndex),
      `a Workshop note is in the index: ${site.noteSlugs().join(", ")}`,
    )
    for (const entry of Object.values(site.contentIndex)) {
      assert.ok(
        !entry.content.includes("Sorted arrays lose on insert"),
        "Workshop prose reached the index through some other note",
      )
    }
  })
})

describe("searching a topic hands over no answers", () => {
  let site: EmittedSite
  let content: string

  before(
    async () => {
      site = await buildFixture("quiz-fence-types")
      content = indexed(site, "lessons/hash-map-lookup-cost")
    },
    { timeout: 300_000 },
  )

  test("the Lesson's own prose is all there", () => {
    assert.equal(site.exitCode, 0, site.log)

    // The control for everything below: stripping the answers must not strip the note.
    assert.match(content, /A lookup hashes the key straight to its bucket/)
    assert.match(content, /Resizing is what keeps the buckets evenly occupied/)
    assert.match(content, /Nothing outside the first fence mentions collisions/)
  })

  test("an mcq's options and explanations are absent, and its prompt is present", () => {
    assert.match(content, /A hash map lookup, average case, costs what\?/)

    for (const option of ["Constant time, no scan", "Linear time, full scan"]) {
      assert.ok(!content.includes(option), `an mcq option is in the index: ${option}`)
    }
    for (const explanation of [
      "The key hashes straight to its bucket.",
      "Nothing is scanned unless buckets collide",
      "That is an unsorted array, not a hash map",
    ]) {
      assert.ok(
        !content.includes(explanation),
        `an mcq explanation is in the index: ${explanation}`,
      )
    }
  })

  test("a cloze sentence is findable by its surface text, and the holes are not filled in", () => {
    // The sentence is genuine authored prose and is worth finding; what is inside the
    // holes is the question.
    assert.match(content, /A hash map trades\s+for lookup speed/)
    assert.match(content, /when every key\nlands in one bucket/)

    assert.ok(!content.includes("trades memory"), "a cloze answer is in the index")
    assert.ok(!content.includes("degrades to O(n)"), "a cloze answer is in the index")
  })

  test("a `{{literal}}` in a code span was never a hole, so it is still indexed", () => {
    // The other half of the same rule, and the reason it is stated here: holes are found
    // in text and never in code, so this one is prose the reader can search for.
    assert.match(content, /A \{\{literal\}\} inside a code span is not a hole/)
  })

  test("a recall block's reveal is absent, and its prompt is present", () => {
    assert.match(content, /Explain why an insert is O\(1\) amortised rather than O\(1\)/)
    assert.ok(
      !content.includes("Crossing the load factor triggers a resize"),
      "a recall reveal is in the index",
    )
  })

  test("the page still says everything the index does not", () => {
    // The whole trap this plugin walks around: the way to keep an answer out of search is
    // to recompute the index text, never to take the node out of the tree. So the reader
    // still gets every option, every explanation and every reveal.
    //
    // The assertion is on the **markup**, not on visible text, and the difference is the
    // point. An explanation, a reveal and a cloze answer are concealed by the `hidden`
    // attribute the quiz markup carries, so `text()` -- which models `innerText` and skips
    // what is not rendered -- will not see them until the element reveals them on a grade.
    // That is concealment, which is what a quiz is for; the thing this plugin must never do
    // is *removal*, and removal is what asking the tree catches.
    const lesson = site.page("lessons/hash-map-lookup-cost")
    const prose = lesson.text(undefined, lesson.body)
    const markup = lesson.html

    // Unconcealed on the page: an option label and a cloze's surface text are the question,
    // not the answer. The cloze sentence reads around its holes rather than through them,
    // which is why this asks for the two halves and not the whole sentence.
    assert.match(prose, /Constant time, no scan/)
    assert.match(prose, /A hash map trades/)
    assert.match(prose, /for lookup speed/)

    // Concealed, but present: each of these is one `hidden` node the reader opens. Asking
    // for the enclosing element rather than the bare word is what makes this an assertion
    // about the answer still being *there* -- a bare /memory/ would pass on the word
    // appearing anywhere in the chrome.
    assert.match(markup, /<span class="cloze-answer" hidden>memory<\/span>/)
    assert.match(markup, /<span class="cloze-answer" hidden>O\(n\)<\/span>/)
    assert.match(markup, /Nothing is scanned unless buckets collide/)
    assert.match(markup, /Crossing the load factor triggers a resize/)
  })
})

describe("a Problem's sealed sections are findable", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("problem-sections")
    },
    { timeout: 300_000 },
  )

  test("`## Solution` and `## Complexity` are in the index", () => {
    assert.equal(site.exitCode, 0, site.log)

    // Stripping them was rejected: a solution is often the richest prose written on a
    // topic, and "where did I write about walking the array once" has to find it. The
    // spoiler is handled at the result -- `prepper/search` suppresses the excerpt for
    // `problems/` -- so this is findable without being shown.
    const content = indexed(site, "problems/two-sum")
    assert.match(content, /Walk the array once, asking a hash map whether the complement/)
    assert.match(content, /time, O\(n\) space/)
  })
})

describe("`topic` is copied to `tags`", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("topic-index")
    },
    { timeout: 300_000 },
  )

  test("every topic a note declares becomes one of its tags", () => {
    assert.equal(site.exitCode, 0, site.log)

    // In the order `topic` wrote them, and all of them: a note filed under two subjects
    // has two, exactly as its chips do.
    assert.deepEqual(site.notes["lessons/hash-map-lookup-cost"].tags, ["hash-maps", "complexity"])
  })

  test("a Cheat sheet's scalar `topic` becomes a one-element list", () => {
    assert.deepEqual(site.notes["cheat-sheets/hash-map-quick-reference"].tags, ["hash-maps"])
  })

  test("a Term about no topic has no tags; one filed under an umbrella is tagged by it", () => {
    // `topic` is copied to `tags` for every note that declares one, Terms included -- so a Term
    // that names no topic (an umbrella, or a topic filed under nothing) has none, and a topic
    // filed under an umbrella carries that umbrella as its one tag, the same as any other note.
    assert.deepEqual(site.notes["terms/system-design"].tags, [])
    assert.deepEqual(site.notes["terms/data-structures"].tags, [])
    assert.deepEqual(site.notes["terms/hash-maps"].tags, ["data-structures"])
  })

  test("the field is copied, never renamed: the page still reads `topic`", () => {
    // `topic` is a controlled vocabulary resolving to Term notes that must exist, and
    // `tags` misdescribes it. The derived field feeds search and nothing else -- so it is
    // nowhere on the page, and `tag-page` generates no second index for it.
    const lesson = site.page("lessons/hash-map-lookup-cost")
    assert.deepEqual(
      lesson.selectAll(".prepper-topic-chip").map((chip) => chip.tagName),
      ["a", "a"],
    )
    assert.ok(!site.hasPage("tags/hash-maps"), "tag-page generated a second topic index")
    assert.ok(!site.hasPage("tags/index"), "tag-page generated a tag listing")
  })

  test("a `topic` written Obsidian's way resolves to the same tag", async () => {
    // `topic: \"[[hash-maps]]\"` is what a note edited through Obsidian's property UI
    // looks like on disk. Resolution is `prepper/link-targets`, the same reading the link
    // graph gives the field -- so search can never file a note under a topic the rest of
    // the build resolved elsewhere.
    const edges = await buildFixture("typed-edges")
    assert.deepEqual(edges.notes["lessons/open-addressing"].tags, ["hash-maps"])
  })
})
