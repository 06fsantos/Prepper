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
import {
  active,
  customProperties,
  declaration,
  pixels,
  rules,
  stylesheets,
  tracks,
  type Rule,
} from "../testing/stylesheets.ts"

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
      css = stylesheets(site, lesson)
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

  for (const width of [1280, 1600, 1920]) {
    test(`the prose column comes out at 38rem at ${width}px`, () => {
      // The ticket's own criterion, and the constraint the right column was retired under.
      //
      // **This is an evaluation, not a measurement.** Nothing in this repo lays a page out:
      // seam 1 emits files and seam 2 is jsdom, which has no viewport and no box tree. What is
      // computed here is what a browser would compute -- the track list that applies at this
      // width, with its custom properties resolved and its `min()` and `calc()` worked out
      // against the width the page's own `max-width` leaves the grid. It fails if the track
      // list changes shape, if `--prepper-measure` or `--prepper-sidebar` is redefined, or if
      // a second rule starts declaring the grid at one of these widths. It would not catch a
      // browser disagreeing with the specification, and nothing in this repo could.
      const all = rules(css)
      const properties = customProperties(all)
      const applies = active(all, width)
      const columns = tracks(grid(applies))

      assert.equal(
        columns.length,
        3,
        `the wide band declares ${columns.length} tracks: ${columns.join(" | ")}`,
      )
      assert.equal(
        pixels(columns[1], { container: container(applies, width, properties), properties }),
        38 * 16,
        `the prose column is not 38rem at ${width}px: ${columns[1]}`,
      )
    })
  }

  test("the reclaimed width is margin, not a narrower column", () => {
    // The right column is gone rather than resized. Said as arithmetic on the wide band's
    // track list: the prose track is the measure, and the two tracks either side of it are
    // **flexible with nothing guaranteed to them but the rail's own floor**. Where a fixed
    // 320px column used to stand there is now a track that takes zero when there is nothing
    // spare and everything left over when there is -- which on a prose page is margin, on both
    // sides. Ticket 07 is where a page whose body is an index spends it on something else.
    const all = rules(css)
    const properties = customProperties(all)
    const columns = tracks(grid(active(all, 1920)))

    assert.equal(columns.length, 3, `the wide band declares ${columns.length} tracks`)
    assert.ok(
      columns[0].includes("1fr") && columns[2].includes("1fr"),
      `the margins are not flexible: ${columns.join(" | ")}`,
    )
    assert.deepEqual(
      [columns[0], columns[2]].map((track) => pixels(floor(track), { container: 0, properties })),
      [320, 0],
      `the margins are not free: ${columns.join(" | ")}`,
    )
  })

  test("nothing is laid out in the right rail, because there is no right rail", () => {
    // Quartz's frame renders the box whatever we put in the position, so the retirement is a
    // `display` as well as an empty `right` array in the config. It is unconditional and it is
    // this module's: `prepper/sidebar/sidebar.test.ts` asserts from the other side that the
    // rail's collapse cannot bring it back.
    const hides = rules(css).filter(
      (rule) => rule.selector.includes(".right.sidebar") && /display:\s*none/.test(rule.body),
    )
    assert.equal(hides.length, 1, `${hides.length} rules retire the right rail`)
    assert.deepEqual(hides[0].media, [], "the right rail is retired at one width only")
  })

  test("the table of contents is a sticky margin element, offset by the bar's own token", () => {
    // It is a direct child of the grid rather than the top of a column -- see
    // `quartz.config.yaml` for why that means the `footer` position -- and it sticks under the
    // fixed top bar. `top: 0` would stick it *behind* the bar, and a literal would be a second
    // copy of a height `prepper/topbar` publishes once.
    const all = rules(css)
    const toc = all.filter((rule) => rule.selector === ".page>#quartz-body>.toc")
    assert.equal(toc.length, 2, `${toc.length} rules place the table of contents`)

    const placed = toc.find((rule) => declaration(rule, "position") === "sticky")
    assert.ok(placed, "the table of contents is not sticky at any width")
    assert.match(declaration(placed, "top") ?? "", /var\(--prepper-topbar-height\)/)
    assert.equal(declaration(placed, "grid-area"), "grid-sidebar-right")
    assert.ok(
      active([placed], 1280).length === 1 && active([placed], 1199).length === 0,
      "the table of contents is placed at a width where there is no margin to place it in",
    )

    // And below the desktop breakpoint it is not rendered, which is what upstream already did
    // with it inside the rail. Where there is no margin there is no margin note.
    const hidden = toc.find((rule) => /display:\s*none/.test(rule.body))
    assert.ok(hidden, "the table of contents is never hidden")
    assert.equal(active([hidden], 1280).length, 0)
    assert.equal(active([hidden], 800).length, 1)
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

/**
 * The `grid-template-columns` the page's own grid resolves to out of the rules that apply.
 *
 * The last one wins, which is the cascade's rule for declarations of equal specificity, and
 * `.page>#quartz-body` exactly -- never `.page[data-frame=...]>#quartz-body`, because a page
 * that opted into the full-width or minimal frame asked for the whole window and gets it.
 */
function grid(applies: Rule[]): string {
  const declared = applies
    .filter((rule) => rule.selector === ".page>#quartz-body")
    .map((rule) => declaration(rule, "grid-template-columns"))
    .filter((value): value is string => value !== undefined)

  assert.ok(declared.length >= 1, "no grid applies")
  return declared.at(-1) as string
}

/**
 * The width the grid is laid out in, read off the emitted stylesheet rather than assumed.
 *
 * `.page` is centred and capped, so the grid gets the narrower of the window and that cap --
 * and the check that nothing pads `#quartz-body` at this width is part of the sum rather than
 * a nicety: upstream pads it by `1rem` on everything below the desktop breakpoint, and a
 * container computed without that padding would be wrong by 32px wherever it applied.
 */
function container(applies: Rule[], width: number, properties: Record<string, string>): number {
  const body = applies.filter((rule) => rule.selector === ".page>#quartz-body")
  for (const rule of body) {
    assert.equal(
      declaration(rule, "padding"),
      undefined,
      `#quartz-body is padded at ${width}px, so the container is not the page's width`,
    )
  }

  const capped = applies
    .filter((rule) => rule.selector === ".page")
    .map((rule) => declaration(rule, "max-width"))
    .filter((value): value is string => value !== undefined)

  assert.ok(capped.length >= 1, "the page declares no maximum width")
  return Math.min(width, pixels(capped.at(-1) as string, { container: width, properties }))
}

/** What a track is guaranteed to take: the first argument of a `minmax()`, or the track. */
function floor(track: string): string {
  return track.match(/^minmax\(([^,]+),/)?.[1] ?? track
}
