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

import { buildFixture, classesOf, type EmittedSite, type Page } from "../testing/build-fixture.ts"
import { active, declaration, rules, stylesheets } from "../testing/stylesheets.ts"

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
      ["Start here", ["Where to start on hash maps"]],
      ["Cheat sheet", ["Hash maps at a glance"]],
      ["Lessons", ["How array indexing works", "What a hash map lookup costs"]],
      ["References", ["Hash map internals"]],
      ["Problems", ["Two sum"]],
    ])
    assert.deepEqual(hrefs(hashMaps, index), [
      "../plans/where-to-start-on-hash-maps",
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

  test("a topic's leaves are grouped by note type, the Plan first and the Cheat sheet next", () => {
    // The two pinned groups are the two questions somebody arriving at a topic cold has, in
    // the order they have them: where do I start, and catch me up. The rest is reading order.
    assert.deepEqual(
      groups(home, topicNode(home, "Hash maps")).map(([heading]) => heading),
      ["Start here", "Cheat sheet", "Lessons", "References", "Problems"],
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

    // And the fold does not animate. This used to be `doesNotMatch(/transition|animation/)`
    // over the whole sheet, which was a true statement of a build that had no motion
    // vocabulary at all; since `prepper/tokens` published one it is narrowed to what it was
    // always about -- the disclosure. A topic's fold is a `<details>` for the same reason the
    // Problem seal is, and an eased one would be a seal that needs a script. The build-wide
    // form of this claim is `prepper/tokens/motion.test.ts`; this is the tree's own copy,
    // here so that the failure names the tree.
    const eased = rules(styles[0])
      .filter((rule) => /(?:^|[;{\s])(transition|animation)/.test(rule.body))
      .filter((rule) => /details|summary|-fold/.test(rule.selector))
    assert.deepEqual(
      eased.map((rule) => rule.selector),
      [],
      "a topic fold animates",
    )
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

/**
 * One index, three views -- seam 1, on the density each of them is drawn at.
 *
 * The claim this suite exists to hold down is that the **data path is one** and only the
 * wrapper differs. So almost every test in it is a comparison rather than a snapshot: what a
 * card holds is asserted by reading the same topic out of the rail on another page and
 * demanding the two be equal. A test that pinned the card's contents on their own would still
 * pass the day the two views started disagreeing, which is the only failure that matters here.
 *
 * The three views and what each is for:
 *
 * | View          | Rendered by                | Shape                                    |
 * | ------------- | -------------------------- | ---------------------------------------- |
 * | `sidebar`     | `TopicTree`, in the rail   | a bare foldable name list                |
 * | entry page    | `TopicCards`, in the body  | a card per topic, note types as columns  |
 * | `term-index`  | `TermIndex`, in the footer | the one card for the page's own topic    |
 *
 * The stylesheet half is here rather than in `prepper/reading` because the density is this
 * module's: `prepper/reading` owns how wide the *column* is and this owns what is laid out in
 * it. It is an evaluation of declared rules, never a measurement -- nothing in this repo lays
 * a page out. See `prepper/testing/stylesheets.ts`.
 */
describe("where to start", () => {
  let site: EmittedSite
  let home: Page

  before(
    async () => {
      site = await buildFixture("topic-index")
      home = site.page("index")
    },
    { timeout: 300_000 },
  )

  /** The Plan names the band offers, in the order it offers them. */
  function banded(page: Page): string[] {
    const band = page.require(".prepper-start-here", page.tree)
    return page.selectAll(".prepper-plan-name", band).map((name) => page.text(undefined, name))
  }

  test("the entry page opens with the Plans, above every card", () => {
    // The landing's first question is *where do I start*, and the cards answer the later
    // one. Document order is the whole of how that is said, so it is what is asserted:
    // the band is the first thing in the body, not merely somewhere on the page.
    const body = home.require(".prepper-home", home.tree)
    const sections = home
      .selectAll(".prepper-start-here, .prepper-topic-cards", body)
      .map((node) => classesOf(node)[0])
    assert.deepEqual(sections, ["prepper-start-here", "prepper-topic-cards"])
    assert.deepEqual(banded(home), ["Where to start on hash maps"])
  })

  test("a Plan in the band is a link to the Plan, and the Plan is a page", () => {
    const band = home.require(".prepper-start-here", home.tree)
    assert.deepEqual(
      home.links({ scope: band }).map((link) => link.href),
      ["./plans/where-to-start-on-hash-maps"],
    )
    assert.ok(site.hasPage("plans/where-to-start-on-hash-maps"))
  })

  test("the band names the topics a Plan spans, in the order the Plan wrote them", () => {
    // A Plan covers several topics -- that is why it is a band and not a card -- so the
    // band says which, in the note's own `topic` order rather than re-sorted: the reader
    // picks between Plans by what they cover.
    const band = home.require(".prepper-start-here", home.tree)
    assert.equal(home.text(".prepper-plan-topics", band), "Hash maps · Complexity")
  })

  test("a Plan is also filed under each of its topics, pinned to the top of the card", () => {
    // The band is not a substitute for the index. A reader who arrived at a topic from
    // anywhere else still has to be told a reading order exists, so the Plan is in both --
    // the arrangement a Cheat sheet is already in, and the reason `plan` is in `groupOrder`.
    const under = (title: string) => groups(home, topicNode(home, title))[0]
    assert.deepEqual(under("Hash maps"), ["Start here", ["Where to start on hash maps"]])
    assert.deepEqual(under("Complexity"), ["Start here", ["Where to start on hash maps"]])
  })

  test("the band is the entry page's, and the rail carries no copy of it", () => {
    // The rail is a jump list beside something the reader is already reading; a second
    // "where do I start" in it would be the third view of a list with two.
    const lesson = site.page("lessons/array-indexing")
    assert.equal(lesson.select(".prepper-start-here", lesson.tree), undefined)
    assert.ok(lesson.select(".prepper-topics", lesson.tree), "no rail on the page at all")
  })
})

describe("the topic index gets its density", () => {
  let site: EmittedSite
  let home: Page
  let term: Page
  let lesson: Page
  let css: string

  before(
    async () => {
      site = await buildFixture("topic-index")
      home = site.page("index")
      term = site.page("terms/hash-maps")
      lesson = site.page("lessons/array-indexing")
      css = stylesheets(site, lesson)
    },
    { timeout: 300_000 },
  )

  /** Every card on a page, wherever on it they are. */
  function cards(page: Page): Element[] {
    return page.selectAll(".prepper-topic-card", page.tree)
  }

  test("the entry page is a card per topic, and every topic has one", () => {
    // Not a summary and not a sample: the landing shows every topic there is, in the order
    // the index computes, which is the same order the rail offers them in.
    assert.deepEqual(
      cards(home).map((card) => home.text(".prepper-topic-card-heading", card)),
      ["Complexity", "Éviction policies", "Hash maps", "System design"],
    )
    assert.deepEqual(topics(home), [
      "Complexity",
      "Éviction policies",
      "Hash maps",
      "System design",
    ])
  })

  test("a card holds exactly what the rail holds under the same topic", () => {
    // The one assertion that makes "one index, three views" a fact rather than a caption.
    // Read off a Problem, three directories from either, so what is being compared is
    // genuinely the rail's copy and not the page's own.
    const problem = site.page("problems/two-sum")
    const card = topicNode(home, "Hash maps")

    assert.deepEqual(
      groups(home, card),
      groups(problem, topicNode(problem, "Hash maps", problem.tree)),
    )
    assert.deepEqual(hrefs(home, card), [
      "./terms/hash-maps",
      "./plans/where-to-start-on-hash-maps",
      "./cheat-sheets/hash-map-quick-reference",
      "./lessons/array-indexing",
      "./lessons/hash-map-lookup-cost",
      "./references/hash-map-internals",
      "./problems/two-sum",
    ])
  })

  test("the note-type groups are the columns, and all five of them are there", () => {
    // "Note-type groups as columns within the card" is a fact about markup before it is one
    // about CSS: the group list is what the column rule is written against, and each group
    // still says which note type it is, so the layout never has to know the order.
    const card = topicNode(home, "Hash maps")
    assert.deepEqual(
      home
        .selectAll(".prepper-topic-groups > .prepper-topic-group", card)
        .map((group) => String(group.properties.dataNoteType)),
      ["plan", "cheat-sheet", "lesson", "reference", "problem"],
    )
  })

  test("a topic nothing is filed under still gets a card, saying so", () => {
    // The rail drops the disclosure and leaves a row. A landing cannot do that -- a card with
    // nothing in it would read as a card that failed to render -- so it says the thing the
    // Term page has always said in the same words, from the same function.
    const empty = topicNode(home, "System design")
    assert.deepEqual(groups(home, empty), [])
    assert.equal(
      home.text(".prepper-topic-index-empty", empty),
      "Nothing has been written under this topic yet.",
    )
  })

  test("a Term page's index is the one card for its own topic", () => {
    // One card per topic, and a Term page has exactly one. The section *is* the card rather
    // than containing one, so the app has one card design and not two.
    const index = term.require(".prepper-generated-index", term.tree)
    assert.ok(classesOf(index).includes("prepper-topic-card"))
    assert.deepEqual(cards(term), [index])
    assert.equal(term.text(".prepper-topic-index-heading", index), "In this topic")
  })

  test("the marker class the wide layout keys off is still on both index views", () => {
    // `prepper-generated-index` is `prepper/reading`'s contract for how wide the column is,
    // and the card markup is inside it rather than instead of it. Losing it would silently
    // put the landing back into a 38rem column.
    for (const page of [home, term]) {
      const index = page.require(".prepper-generated-index", page.tree)
      assert.ok(cards(page).length > 0, `${page.slug} renders no card`)
      assert.ok(
        cards(page).every((card) => card === index || contains(index, card)),
        `${page.slug} renders a card outside the marked index`,
      )
    }
  })

  test("the rail is untouched: still a bare foldable name list, on every page", () => {
    // The density belongs to a view. Written into `TopicTree` it would have landed here too,
    // and the rail is a jump list beside an article -- the one place in the app where showing
    // everything under every topic is wrong.
    for (const page of [home, term, lesson, site.page("problems/two-sum")]) {
      const rail = page.require(".left.sidebar", page.tree)
      assert.deepEqual(
        page.selectAll(".prepper-topic-card", rail),
        [],
        `${page.slug}: cards in the rail`,
      )
      assert.deepEqual(
        page.selectAll(".prepper-topic-cards", rail),
        [],
        `${page.slug}: cards in the rail`,
      )
      assert.equal(
        page.selectAll("details.prepper-topic-fold", rail).length,
        3,
        `${page.slug}: the rail's folds`,
      )
    }
  })

  test("a page whose body is prose renders no card at all", () => {
    // Including in its rail, which is the whole page. The four prose page types are the app's
    // reading surface and a card there would be the topic index dominating a Lesson.
    for (const slug of [
      "lessons/array-indexing",
      "references/hash-map-internals",
      "cheat-sheets/hash-map-quick-reference",
      "problems/two-sum",
    ]) {
      assert.deepEqual(cards(site.page(slug)), [], `${slug} renders a card`)
    }
  })

  test("the entry page's cards do not fold, and carry no fold id", () => {
    // A jump list folds because it has to stay short beside an article; a landing exists to
    // be looked at. And the ids matter beyond the markup: while the entry page rendered the
    // rail's view, its copy and the rail's shared a `data-fold`, so collapsing a topic in one
    // collapsed it in the other. `folds.js` now finds one tree per page.
    assert.deepEqual(home.selectAll("details.prepper-topic-fold", home.main), [])
    assert.deepEqual(term.selectAll("details.prepper-topic-fold", term.main), [])
    assert.equal(home.selectAll("details.prepper-topic-fold", home.tree).length, 3)
  })

  test("column count is asked of the container, not of the viewport", () => {
    // The ticket's criterion, and the reason it is written as `auto-fit` over a floor: the
    // grid is told the narrowest a column may be and works out how many fit in whatever it
    // has been given. So the count follows *available width* -- the window, the page's own
    // cap, the rail's track, and the collapse if it ever gave width back -- rather than
    // following a list of breakpoints that would have to be kept in step with all of them.
    //
    // Both levels, because both are columns the ticket asks for: the cards across the index,
    // and the note-type groups across a card.
    const grids = rules(css).filter(
      (rule) =>
        /prepper-topic-card/.test(rule.selector) && declaration(rule, "grid-template-columns"),
    )
    assert.equal(grids.length, 2, `${grids.length} rules lay the cards out`)
    for (const rule of grids) {
      assert.match(
        declaration(rule, "grid-template-columns") ?? "",
        /^repeat\(auto-fit,\s*minmax\(/,
        `a fixed column count: ${rule.selector}`,
      )
      // And the floor is bounded by the container, so a window narrower than one column
      // shrinks the column rather than pushing the page sideways.
      assert.match(
        declaration(rule, "grid-template-columns") ?? "",
        /minmax\(min\([\d.]+rem,\s*100%\)/,
        `the column floor can overflow a narrow container: ${rule.selector}`,
      )
      assert.deepEqual(rule.media, [], `the count is switched at a breakpoint: ${rule.selector}`)
      assert.ok(
        !rule.selector.includes("data-prepper-sidebar"),
        `the count is conditioned on the rail: ${rule.selector}`,
      )
    }

    // And they apply at every width, which is the same statement said from the cascade's
    // side: there is no band in which the density is something else.
    for (const width of [360, 800, 1280, 1920]) {
      assert.equal(active(grids, width).length, 2, `the cards are not laid out at ${width}px`)
    }
  })

  test("nothing about the density restates the page's own grid", () => {
    // `prepper/reading` owns how wide the column is and this module owns what is laid out in
    // it. The card rules are reached through the card's own classes and never through
    // `prepper-generated-index`, so they cannot be mistaken for a fourth index grid -- which
    // is a fact two other suites count on, literally.
    const ours = rules(css).filter((rule) => /prepper-topic-card/.test(rule.selector))
    assert.ok(ours.length > 0)
    for (const rule of ours) {
      assert.ok(
        !/prepper-generated-index|#quartz-body/.test(rule.selector),
        `a card rule reaches the page's layout: ${rule.selector}`,
      )
    }
  })

  test("the cards are painted from Material roles and float above nothing", () => {
    // They are chrome, so every colour, radius and type step is a role
    // (ADR 0003) -- no hex anywhere in the module's own rules. And no shadow: hierarchy on
    // this page comes from `surface-container-*`, and elevation is spent where something
    // occludes, which a region of the page does not.
    const ours = rules(css).filter((rule) => /prepper-topic-card/.test(rule.selector))
    const bodies = ours.map((rule) => rule.body).join(";")

    assert.match(bodies, /background-color:\s*var\(--md-sys-color-surface-container-low\)/)
    assert.match(bodies, /border[^;]*var\(--md-sys-color-outline-variant\)/)
    assert.match(bodies, /border-radius:\s*var\(--md-sys-shape-corner-large\)/)
    assert.match(bodies, /var\(--md-sys-typescale-title-large-size\)/)
    // `#0000` is what lightningcss makes of `transparent`, which is the absence of a colour
    // rather than one somebody typed.
    assert.ok(!/#(?!0000\b)[0-9a-f]{3,8}\b/i.test(bodies), `a raw colour in the cards: ${bodies}`)
    assert.ok(!/box-shadow|elevation/.test(bodies), `the cards float: ${bodies}`)
  })
})

/** Whether `descendant` is anywhere inside `ancestor`. */
function contains(ancestor: Element, descendant: Element): boolean {
  for (const child of ancestor.children) {
    if (child === descendant) return true
    if (child.type === "element" && contains(child, descendant)) return true
  }
  return false
}
