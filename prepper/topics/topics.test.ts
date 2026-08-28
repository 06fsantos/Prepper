/**
 * The topic index — through seam 1.
 *
 * The question this navigation answers is *what shall I study today*, and the dev asks it
 * in topics rather than in directories. So every assertion here is about topics: which
 * ones there are, what is filed under one, and where the reader meets the answer. Nothing
 * asserts on a directory listing, because a directory listing is what this replaces.
 *
 * **One index, two views** is the fact most of these tests are really about: the tree on
 * the entry page, the tree in the sidebar and the index on a Term page are the same
 * computation rendered in three places, so a test that pins one and then compares the
 * others to it is asserting the thing that matters. `the sidebar tree is the same index`
 * is that comparison written down.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import type { Element, Root } from "hast"

import { buildFixture, type EmittedSite, type Page } from "../testing/build-fixture.ts"

/** Every topic named in one rendering of the tree, in the order it offers them. */
function topics(page: Page, scope: Element | Root = page.main): string[] {
  return page.selectAll(".prepper-topic-name", scope).map((node) => page.text(undefined, node))
}

/** One topic's subtree in a rendering of the tree, by the topic's title. */
function topicNode(page: Page, title: string, scope: Element | Root = page.main): Element {
  const found = page
    .selectAll(".prepper-topic", scope)
    .find((node) => page.text(".prepper-topic-name", node) === title)
  assert.ok(found, `no topic "${title}" in this tree. Topics: ${topics(page, scope).join(", ")}`)
  return found
}

/**
 * What is filed under a topic, as `[group heading, [note titles]]` pairs in rendered order.
 *
 * Both views of the index render the same group markup, which is what lets one function
 * read the tree, the sidebar and a Term page's index and lets a test compare them.
 */
function groups(page: Page, scope: Element): [heading: string, notes: string[]][] {
  return page
    .selectAll(".prepper-topic-group", scope)
    .map((group) => [
      page.text(".prepper-group-heading", group),
      page.selectAll(".prepper-group-list > li", group).map((li) => page.text(undefined, li)),
    ])
}

/** Where one group's entries point, so a test can say a leaf is a link and not a label. */
function hrefs(page: Page, scope: Element): (string | undefined)[] {
  return page.links({ scope }).map((link) => link.href)
}

describe("the topic index", () => {
  let site: EmittedSite
  let home: Page
  let hashMaps: Page

  before(
    async () => {
      site = await buildFixture("topic-index")
      home = site.page("index")
      hashMaps = site.page("terms/hash-maps")
    },
    { timeout: 300_000 },
  )

  test("the app's entry point is the topic index", () => {
    // The vault has no `index.md`. Opening the app still lands on something, and what it
    // lands on is every topic there is -- not a directory listing and not a guess at what
    // is due.
    assert.ok(site.hasPage("index"))
    assert.deepEqual(topics(home), [
      "Complexity",
      "Éviction policies",
      "Hash maps",
      "System design",
    ])
  })

  test("a Term page carries the generated index of every Library note about that topic", () => {
    const index = hashMaps.require(".prepper-topic-index")
    assert.deepEqual(groups(hashMaps, index), [
      ["Cheat sheet", ["Hash maps at a glance"]],
      ["Lessons", ["How array indexing works", "What a hash map lookup costs"]],
      ["References", ["Hash map internals"]],
      ["Problems", ["Two sum"]],
    ])
    assert.deepEqual(hrefs(hashMaps, index), [
      "../cheat-sheets/hash-map-quick-reference",
      "../lessons/array-indexing",
      "../lessons/hash-map-lookup-cost",
      "../references/hash-map-internals",
      "../problems/two-sum",
    ])
  })

  test("the sidebar tree is the same index as the Term page's", () => {
    // Read on a page that is neither the entry point nor the Term itself, so what is being
    // compared is genuinely the sidebar: a Problem, three directories away from both.
    const problem = site.page("problems/two-sum")
    const sidebar = topicNode(problem, "Hash maps", problem.tree)

    assert.deepEqual(
      groups(problem, sidebar),
      groups(hashMaps, hashMaps.require(".prepper-topic-index")),
    )
  })

  test("a note with two topics appears under both, not deduped to one", () => {
    const under = (title: string) =>
      groups(home, topicNode(home, title)).flatMap(([, notes]) => notes)

    assert.ok(under("Hash maps").includes("What a hash map lookup costs"))
    assert.ok(under("Complexity").includes("What a hash map lookup costs"))
  })

  test("a topic's leaves are grouped by note type, with the Cheat sheet first", () => {
    // Cheat sheet first because it is the quick-catchup document: the first thing seen
    // under a topic is the one that catches you up on it.
    assert.deepEqual(
      groups(home, topicNode(home, "Hash maps")).map(([heading]) => heading),
      ["Cheat sheet", "Lessons", "References", "Problems"],
    )
  })

  test("a flat alphabetical Cheat sheets list is reachable from the sidebar", () => {
    const problem = site.page("problems/two-sum")
    const list = problem.require(".prepper-cheat-sheets", problem.tree)

    // Every Cheat sheet in the vault, whatever topic it is under, in title order -- for
    // going straight to a condensed topic without navigating into it.
    assert.deepEqual(
      problem
        .selectAll(".prepper-cheat-sheet-list > li", list)
        .map((li) => problem.text(undefined, li)),
      ["Complexity at a glance", "Hash maps at a glance"],
    )
  })

  test("the tree renders no drawer and no control of its own", () => {
    // It used to render both: a checkbox-and-label drawer at a breakpoint of its own, with an
    // `id` of `prepper-sidebar-toggle` that shared its word with the bar control's class. Two
    // drawers over one rail is one too many, and the rail's presentation -- a column above
    // 800px, a drawer over the article below it -- belongs to `prepper/sidebar`, which drives
    // it from the one attribute and the one remembered word. What is here is what goes inside
    // it.
    const problem = site.page("problems/two-sum")
    const rail = problem.require(".left.sidebar", problem.tree)

    assert.deepEqual(problem.selectAll("input", rail), [], "the tree renders a control")
    assert.deepEqual(problem.selectAll("label", rail), [], "the tree renders a control")
    assert.ok(problem.select(".prepper-topics", rail), "the tree is not in the rail")

    // And the one control there is, is the bar's -- at every width, because below 800px it is
    // the only way to the rail at all.
    const bar = problem.require(".page-header > header", problem.tree)
    assert.equal(problem.selectAll("button.prepper-sidebar-toggle", bar).length, 1)
    assert.equal(problem.selectAll("button.prepper-sidebar-toggle", problem.tree).length, 1)
  })

  test("the tree's own stylesheet has no breakpoint left in it", () => {
    // The retired drawer took a whole second layout with it: a 900px breakpoint nothing else
    // in the build changes at, an off-canvas panel, a scrim, an elevation and a
    // `transition: transform`. A tree of author-written names has no narrow-window form that
    // differs from its wide one -- it is the same list in a container that has moved -- so
    // what is left is width-independent, and the last unowned motion in the build went with
    // the panel it belonged to.
    const styles = site.files
      .filter((f) => f.endsWith(".css"))
      .map((f) => site.file(f))
      .filter((css) => css.includes("prepper-topic-fold-row"))

    assert.equal(styles.length, 1, `${styles.length} stylesheets carry the topic tree`)
    assert.doesNotMatch(styles[0], /900px/)
    assert.doesNotMatch(styles[0], /prepper-sidebar/)
    assert.doesNotMatch(styles[0], /transition|animation/)
  })

  test("every item of the sidebar tree is a fold, and it arrives open", () => {
    const problem = site.page("problems/two-sum")
    const tree = problem.require(".prepper-topics", problem.tree)

    // Open, unlike every other fold in the build: a note's headings arrive closed because a
    // closed outline is how a reader chooses a section, and navigation that arrived closed
    // would make them open a topic to find out whether it holds anything.
    const folds = problem.selectAll("details.prepper-topic-fold", tree)
    assert.equal(folds.length, 2, "a fold for each topic that has anything under it")
    for (const fold of folds) {
      assert.equal(fold.properties.open, true, `${String(fold.properties.dataFold)} arrived shut`)
      assert.ok(problem.select("summary", fold), "a fold with no row to work it")
    }

    // The id the memory holds an item under, and the only thing the scripts know about the
    // tree. It is the Term's own slug, so it cannot drift from what the item points at.
    assert.deepEqual(folds.map((fold) => String(fold.properties.dataFold)).sort(), [
      "terms/complexity",
      "terms/hash-maps",
    ])
  })

  test("a topic nothing is filed under has no disclosure to work", () => {
    // "System design" is a Term with no Lessons. There is nothing behind a fold, so there is
    // no fold -- and the row is still a row, so the names line up down the tree.
    const problem = site.page("problems/two-sum")
    const empty = topicNode(problem, "System design", problem.tree)

    assert.deepEqual(problem.selectAll("details.prepper-topic-fold", empty), [])
    assert.ok(
      problem.select(".prepper-topic-fold-leaf", empty),
      "the row is gone as well as the fold",
    )
  })

  test("the Cheat sheets list folds on its own name", () => {
    const problem = site.page("problems/two-sum")
    const sheets = problem.require(".prepper-cheat-sheets", problem.tree)
    const fold = problem.require("details.prepper-topic-fold", sheets)

    assert.equal(fold.properties.dataFold, "cheat-sheets")
    assert.equal(fold.properties.open, true)
  })

  test("the tree marks the page the reader is already on", () => {
    const term = site.page("terms/hash-maps")
    const tree = term.require(".prepper-topics", term.tree)

    // `aria-current` rather than a class: "this is the page you are on" is a fact a screen
    // reader has to be told as well as shown, and the stylesheet paints from the attribute so
    // there is one statement of it rather than two that can come apart.
    const current = term
      .selectAll("[aria-current]", tree)
      .map((node) => [String(node.properties.ariaCurrent), term.text(undefined, node)])
    assert.deepEqual(current, [["page", "Hash maps"]])
  })

  test("a Term with no Lessons renders its body as an area overview above its index", () => {
    const term = site.page("terms/system-design")

    assert.match(term.text("article"), /Sizing a system before building it/)
    assert.deepEqual(groups(term, term.require(".prepper-topic-index")), [])

    // Above, not below: the overview is what the reader came for on a topic nothing has
    // been written under yet.
    assert.deepEqual(
      term
        .selectAll("article, .prepper-topic-index")
        .map((node) => (node.tagName === "article" ? "body" : "index")),
      ["body", "index"],
    )
  })
})
