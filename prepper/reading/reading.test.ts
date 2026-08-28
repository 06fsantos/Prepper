/**
 * The reading surface, through seam 1: a note goes in, a page that reads like a document
 * comes out.
 *
 * Two kinds of assertion in here, and the split is deliberate.
 *
 * **Markup** — the chips, and the chrome that is absent — is asserted on the emitted HTML,
 * the way everything else is. The absences are the interesting half: "no breadcrumb, no
 * next/previous, no progress bar" is a decision about what a page states, and a decision
 * that is only ever recorded in a disabled config entry is one an upstream merge can undo
 * without anybody noticing.
 *
 * **The measure, the serif and the aside** are asserted on the emitted **stylesheet**,
 * because a stylesheet is what they are: no amount of reading the HTML says how wide the
 * prose column is. These assertions are on the site's own output -- the CSS a reader's
 * browser is served -- and not on our source, so they still go through the build. They are
 * as loose as they can be while still failing if the rule disappeared: they name the
 * declaration, never the whole rule, because lightningcss rewrites the text of one on
 * every build and a test that pinned that would be testing the minifier.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import { buildFixture, classesOf, type EmittedSite, type Page } from "../testing/build-fixture.ts"

/** Every chip on a page, as `[label, href]`, in rendered order. */
function chips(page: Page): [label: string, href: string | undefined][] {
  return page
    .selectAll(".prepper-topic-chip")
    .map((chip) => [page.text(undefined, chip), hrefOf(chip)])
}

function hrefOf(chip: { properties: Record<string, unknown> }): string | undefined {
  const href = chip.properties.href
  return typeof href === "string" ? href : undefined
}

describe("the reading surface", () => {
  let site: EmittedSite
  let lesson: Page
  let term: Page
  let css: string

  before(
    async () => {
      site = await buildFixture("reading-surface")
      lesson = site.page("lessons/hash-map-lookup-cost")
      term = site.page("terms/hash-maps")
      css = site.files
        .filter((file) => file.endsWith(".css"))
        .map((file) => site.file(file))
        .join("\n")
    },
    { timeout: 120_000 },
  )

  test("a note's topics are chips under its title, all of them", () => {
    // Both topics, in the order the `topic` field wrote them, labelled by each Term's own
    // `title` rather than by the filename the field named. A note about two subjects says
    // two: nothing here picks one and calls it the note's home.
    assert.deepEqual(chips(lesson), [
      ["Hash maps", "../terms/hash-maps"],
      ["Complexity", "../terms/complexity"],
    ])
  })

  test("the chips sit between the title and everything else the layout adds", () => {
    const header = lesson.require(".page-header")
    const order = lesson
      .selectAll("h1.article-title, .prepper-topic-chips, .content-meta", header)
      .map((node) => (node.tagName === "h1" ? "title" : classesOf(node)[0]))

    assert.deepEqual(order, ["title", "prepper-topic-chips", "content-meta"])
  })

  test("a note with no topics renders no chips at all", () => {
    // A Term has no `topic` of its own, and an empty chip rail is chrome stating nothing.
    assert.deepEqual(chips(term), [])
  })

  test("nothing on the page implies a reading order or a reading history", () => {
    // No breadcrumb, no next/previous, no progress bar, no review-queue badge, no
    // read/unread mark -- on the whole page, sidebar and footer included. There is no
    // order for chrome to imply and no per-user state for it to display.
    const forbidden = /breadcrumb|progress|next-page|prev-page|previous|unread|read-status|due/i
    const offenders = lesson
      .selectAll("*", lesson.tree)
      .flatMap((node) => classesOf(node))
      .filter((className) => forbidden.test(className))

    assert.deepEqual(offenders, [])
  })

  test("the prose column holds a 38rem measure, and the sidebar takes the rest", () => {
    // One declaration per viewport band: the sidebar column is `1fr` and the prose column
    // is the measure, so a wider window widens the margin rather than the line.
    const measures = [...css.matchAll(/--prepper-measure:\s*38rem/g)]
    assert.equal(measures.length, 1, "the measure is declared once")

    // `.page>#quartz-body` and not `.page[data-frame=…]>#quartz-body`: a page that opts
    // into the full-width or minimal frame asked for the whole window, and gets it.
    const columns = [...css.matchAll(/\.page>#quartz-body\{grid-template-columns:([^};]+)/g)].map(
      (match) => match[1],
    )
    assert.equal(
      columns.length,
      3,
      `expected one declaration per viewport band, found ${columns.length}: ${columns.join(" | ")}`,
    )
    assert.ok(
      columns.every((track) => track.includes("--prepper-measure")),
      `every band sizes the prose column from the measure: ${columns.join(" | ")}`,
    )
  })

  test("this is the only module that declares the page's grid", () => {
    // Three bands and no fourth. `prepper/sidebar` used to declare a *second*, collapsed grid
    // with the left track reduced to a gutter, and that -- not any easing -- is what made the
    // prose jump sideways when the rail went away. The rail is hidden with one `display`
    // now, and the reclaimed width becomes margin, because the track list never changes.
    // `prepper/sidebar/sidebar.test.ts` asserts the same fact from the other side, per
    // viewport width. The count above is what keeps a second grid from creeping back in.
    const declarations = [...css.matchAll(/grid-template-columns/g)]
    const ours = [...css.matchAll(/grid-template-columns:[^};]*--prepper-measure/g)]
    assert.equal(ours.length, 3, `${ours.length} of ${declarations.length} grids are ours`)
    assert.ok(
      !/data-prepper-sidebar[^{]*\{[^}]*grid-template-columns/.test(css),
      "no grid is conditioned on whether the rail is hidden",
    )
  })

  test("body prose is serif, all the way down its fallbacks", () => {
    // A serif whose fallback stack is sans is a serif only while the webfont is arriving.
    const stack = css.match(/--prepper-prose:([^;}]+)/)?.[1]
    assert.ok(stack, "the prose font stack is declared")
    assert.match(stack, /^"Source Serif 4"/)
    assert.match(stack, /serif\s*$/)
    assert.ok(!/sans-serif/.test(stack), `the fallbacks are serifs too: ${stack}`)
  })

  test("a blockquote is an aside, and stays inside the measure", () => {
    // Obsidian Markdown has no notation for a margin note, so an aside is an ordinary
    // blockquote -- which means it is the author's own markup, set apart by style alone.
    const quote = lesson.require("blockquote", lesson.body)
    assert.equal(classesOf(quote).length, 0, "an aside is the blockquote nothing has classed")
    assert.match(lesson.text(undefined, quote), /^Constant time is a statement about growth/)

    const aside = css.match(/article blockquote:not\(\[class\]\)\{([^}]+)\}/)?.[1]
    assert.ok(aside, "the aside is styled")
    assert.match(aside, /max-width:100%/)
  })
})
