/**
 * Typed edges rendered in context, and untyped ones in one panel — through seam 1.
 *
 * The same `typed-edges` fixture the graph is asserted on (`../graph/graph.test.ts`), read
 * the other way round: not *what edges exist* but *where a reader meets them*, which is
 * the half of the design that says a link's meaning is inseparable from where it is shown.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import type { Element, Root } from "hast"

import { buildFixture, classesOf, type EmittedSite, type Page } from "../testing/build-fixture.ts"

/**
 * The rail with this heading, as `[label, href]` pairs. A placeholder has no href.
 *
 * The default scope is the page's own column, which is where a **typed** edge renders --
 * in context, beside what the reader came for. The backlinks panel is chrome and lives in
 * the sidebar, so a test about it passes `page.tree`. That the two need different scopes
 * is the arrangement, not an accident of it.
 */
function rail(
  page: Page,
  heading: string,
  scope: Element | Root = page.main,
): [label: string, href: string | undefined][] {
  const section = page
    .selectAll(".prepper-rail", scope)
    .find((node) => page.text(".prepper-rail-heading", node) === heading)
  assert.ok(section, `page "${page.slug}" has no "${heading}" rail. ${railHeadings(page)}`)

  return page
    .selectAll("li > *", section)
    .map((node) => [
      page.text(undefined, node),
      typeof node.properties.href === "string" ? node.properties.href : undefined,
    ])
}

/** Every in-context rail heading, in document order: what the reader is offered, and where. */
function railHeadings(page: Page): string[] {
  return page.selectAll(".prepper-rail-heading").map((node) => page.text(undefined, node))
}

describe("typed edges, rendered in context", () => {
  let site: EmittedSite
  let lesson: Page

  before(
    async () => {
      site = await buildFixture("typed-edges")
      lesson = site.page("lessons/hash-map-lookup-cost")
    },
    { timeout: 300_000 },
  )

  test("a Lesson shows a `Read first` block naming its prerequisites", () => {
    assert.deepEqual(rail(lesson, "Read first"), [
      ["How array indexing works", "../lessons/array-indexing"],
    ])
  })

  test("a Lesson shows a `This unlocks` rail naming the Lessons that list it", () => {
    // The same edge as "Read first", read backwards: `load-factor-tuning` is one of the
    // notes that wrote the link, and it is named here without ever having said "this
    // unlocks".
    assert.deepEqual(rail(lesson, "This unlocks"), [
      ["open addressing", "../lessons/open-addressing"],
      ["Tuning the load factor", "../lessons/load-factor-tuning"],
    ])
  })

  test("a Lesson lists the Problems that practise it", () => {
    assert.deepEqual(rail(lesson, "Practised by"), [
      ["LRU cache", "../problems/lru-cache"],
      ["Two sum", "../problems/two-sum"],
    ])
  })

  test("a Problem names the Lesson it drills", () => {
    assert.deepEqual(rail(site.page("problems/two-sum"), "Practises"), [
      ["What a hash map lookup actually costs", "../lessons/hash-map-lookup-cost"],
    ])
  })

  test("`Read first` is above the note and the rails that follow it are below", () => {
    // Where a link sits is part of what it means: a prerequisite is wanted before the
    // reader starts, and what a Lesson unlocks is only interesting once they have
    // finished. Both are in the page's own column; neither is inside the note.
    assert.deepEqual(railHeadings(lesson), ["Read first", "Practised by", "This unlocks"])
    assert.equal(
      lesson.selectAll(".prepper-rail", lesson.body).length,
      0,
      "a rail was rendered inside the note's own Markdown",
    )

    const article = lesson.html.indexOf("<article")
    assert.ok(lesson.html.indexOf("Read first") < article, "`Read first` is not above the note")
    assert.ok(lesson.html.indexOf("This unlocks") > article, "`This unlocks` is not below it")
  })

  test("a `practices` target nobody has written renders as the unwritten affordance", () => {
    // The deliberate exception: `practices` is satisfied by an unwritten target, because
    // intent is allowed. It reads as the same gap a body wikilink to nothing reads as.
    const problem = site.page("problems/lru-cache")
    assert.deepEqual(rail(problem, "Practises"), [
      ["What a hash map lookup actually costs", "../lessons/hash-map-lookup-cost"],
      ["eviction-policies", undefined],
    ])

    const gap = problem.require(".prepper-rail .unwritten-link")
    assert.equal(gap.tagName, "span", "the gap is still clickable")
    assert.equal(gap.properties.dataUnwrittenLink, "eviction-policies")
  })

  test("nothing is gated: every rail entry to a note that exists is a live link", () => {
    // The prerequisite DAG is a build-time integrity property, not a runtime permission
    // system. No page locks a Lesson, a Problem or anything else behind another note.
    for (const slug of site.noteSlugs()) {
      const page = site.page(slug)
      for (const node of page.selectAll(".prepper-rail li > *", page.tree)) {
        const classes = classesOf(node)
        assert.ok(
          node.tagName === "a" || classes.includes("unwritten-link"),
          `${slug} renders a rail entry that is neither a link nor a gap: ${node.tagName}`,
        )
        assert.ok(
          !("ariaDisabled" in node.properties) && !("disabled" in node.properties),
          `${slug} renders a disabled rail entry`,
        )
      }
      assert.ok(
        !/\b(locked|gated)\b/.test(page.text()),
        `${slug} says something about being locked`,
      )
    }
  })
})

describe("the backlinks panel", () => {
  let site: EmittedSite
  let lesson: Page

  before(
    async () => {
      site = await buildFixture("typed-edges")
      lesson = site.page("lessons/hash-map-lookup-cost")
    },
    { timeout: 300_000 },
  )

  test("untyped body links collect in one panel, labelled by title and sorted", () => {
    // Four notes link this Lesson in prose, and the panel is **alphabetical** rather than
    // in the order the vault happens to be walked in, so the list stays put as the vault
    // grows. Two of the four are here to make that word mean what a reader means by it:
    // sorted by code point, "Éviction policies" and "open addressing" would both land
    // after every title starting with an ASCII capital -- past "Hash map internals", at
    // the bottom of a panel a reader is scanning for the letter É.
    assert.deepEqual(rail(lesson, "Backlinks", lesson.tree), [
      ["Complexity", "../terms/complexity"],
      ["Éviction policies", "../terms/eviction"],
      ["Hash map internals", "../references/hash-map-internals"],
      ["open addressing", "../lessons/open-addressing"],
    ])
  })

  test("a link written with an alias is still labelled by the source note's title", () => {
    // `hash-map-internals` wrote `[[hash-map-lookup-cost|why lookups are cheap]]`. That
    // alias was fitted to the sentence it sat in and says nothing outside it, so the panel
    // never shows it.
    const panel = lesson.require(".prepper-edges-backlinks", lesson.tree)
    assert.ok(
      !lesson.text(undefined, panel).includes("why lookups are cheap"),
      `the alias reached the panel: ${lesson.text(undefined, panel)}`,
    )
  })

  test("a typed edge is not repeated in the panel", () => {
    // `load-factor-tuning` names this Lesson in `prerequisites` and `two-sum` in
    // `practices`. Both are already stated in context, on this very page; listing them
    // again here would make the panel a second, worse copy of the rails above it.
    const labels = rail(lesson, "Backlinks", lesson.tree).map(([label]) => label)
    for (const typed of ["Tuning the load factor", "Two sum", "LRU cache"]) {
      assert.ok(!labels.includes(typed), `${typed} is a typed edge and is in the panel`)
    }
  })

  test("a Workshop note that links a Lesson does not appear in its panel", () => {
    // The research note links this Lesson in its prose. It is in the vault and the reader
    // never sees it, so it is not a node -- and a note that is not a node cannot put its
    // title on somebody else's page.
    const labels = rail(lesson, "Backlinks", lesson.tree).map(([label]) => label)
    assert.ok(
      !labels.some((label) => label.includes("Why hash maps were chosen")),
      `a Workshop note is in the panel: ${labels.join(", ")}`,
    )
  })

  test("a note nothing links to has no panel at all", () => {
    // An empty panel is chrome stating nothing. `array-indexing` is named by one
    // `prerequisites` field and by no prose anywhere.
    const orphan = site.page("lessons/array-indexing")
    assert.equal(orphan.select(".prepper-edges-backlinks", orphan.tree), undefined)
    assert.deepEqual(railHeadings(orphan), ["This unlocks"])
  })

  test("the gap in a rail is styled, so it reads as a gap and not as prose", () => {
    // `prepper/links` ships the `.unwritten-link` rule for body links; a rail's gap wears
    // the same mark, so the site has to be carrying that rule on this page too.
    const problem = site.page("problems/lru-cache")
    const styled = site.files.filter(
      (f) => f.endsWith(".css") && site.file(f).includes(".unwritten-link"),
    )
    assert.equal(styled.length, 1, `emitted stylesheets carrying the mark: ${styled.length}`)
    assert.match(problem.html, new RegExp(styled[0]))
  })
})
