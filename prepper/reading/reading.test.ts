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
  container,
  customProperties,
  declaration,
  floor,
  grid,
  pixels,
  rules,
  stylesheets,
  tracks,
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

/**
 * The page's own grid, as the two selectors that can declare it.
 *
 * `body` is on every page. `indexBody` is on a page **whose body is a generated index** --
 * the app's entry point, a Term page's index, and whatever the build generates next -- and it
 * is the whole of how the layout tells the two apart: no slug, no filename, no page title, one
 * class the index views render themselves with.
 */
const body = ".page>#quartz-body"
const indexBody = ".page>#quartz-body:has(.prepper-generated-index)"

/**
 * Which of those two a given emitted page actually matches, decided by **running the selector
 * against the page** rather than by knowing which page it is.
 *
 * This is the composition every width assertion below rests on. A stylesheet cannot say which
 * rules reach a particular page and the markup cannot say how wide a column is, so the tests
 * ask the markup which selectors match and the stylesheet what those selectors declare. If the
 * marker class ever stopped being rendered, or started being rendered on a Lesson, every one
 * of those assertions changes answer -- which is the point.
 */
function bodySelectors(page: Page): string[] {
  return [body, indexBody].filter((selector) => page.selectAll(selector, page.tree).length > 0)
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

    // Three more, in the same three bands, for a page whose body is a generated index --
    // and they are this module's too. They have to be declared in every band rather than
    // only the wide one: `:has()` makes the index selector more specific than the plain
    // one, so a band that did not restate it would be overruled by the wide band's rule at
    // a width the wide band is not meant to reach.
    const indexes = rules(css).filter(
      (rule) => rule.selector === indexBody && declaration(rule, "grid-template-columns"),
    )
    assert.equal(indexes.length, 3, `${indexes.length} index grids, one per band`)
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
      const columns = tracks(grid(applies, [body]))

      assert.equal(
        columns.length,
        3,
        `the wide band declares ${columns.length} tracks: ${columns.join(" | ")}`,
      )
      assert.equal(
        pixels(columns[1], {
          container: container(applies, width, properties, [body]),
          properties,
        }),
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
    const columns = tracks(grid(active(all, 1920), [body]))

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

  test("the table of contents gives way to an index, because both want the margin", () => {
    // The collision this ticket had to settle, and the one page in the app that has it: a
    // Term with headings carries upstream's table of contents *and* the generated index, and
    // the list is a margin element while the index has taken the margin. Both facts are here
    // rather than only the rule, because a rule that resolved a collision the build cannot
    // actually produce would be a rule nobody could check.
    assert.ok(term.select(".toc", term.tree), "the fixture Term emits no table of contents")
    assert.ok(term.select(".prepper-generated-index", term.tree), "and no index either")

    const gives = rules(css).filter(
      (rule) => rule.selector === `${indexBody}>.toc` && /display:\s*none/.test(rule.body),
    )
    assert.equal(gives.length, 1, `${gives.length} rules stand the list down`)
    assert.deepEqual(gives[0].media, [], "the list stands down at one width only")

    // And a prose page keeps it: the rule is about the body, not about the component.
    assert.equal(lesson.selectAll(`${indexBody}>.toc`, lesson.tree).length, 0)
    assert.equal(term.selectAll(`${indexBody}>.toc`, term.tree).length, 1)
  })

  test("the footer sits at the foot of the window, and nothing manufactures the space", () => {
    // The defect: on a page shorter than the window the footer was stranded partway up the
    // empty space rather than at the bottom of it. Upstream's grid was doing what it was told
    // -- the left rail is 100vh and spans every row, so its height was distributed across the
    // rows it spanned, the footer's own included, and the footer sat at the top of a row that
    // had been stretched under it.
    //
    // Two declarations replace it, and what is asserted is that they are those two and
    // nothing else. **This is not a measurement**: nothing in this repo lays a page out. What
    // is checked is that the page is a windowful tall in its own right, that the footer is
    // placed at the end of its row, and that no third rule invents the space -- which is the
    // failure mode the ticket names, and the one a spacer or a `min-height` on the footer
    // would have been.
    const all = rules(css)

    const tall = all.filter(
      (rule) => rule.selector === body && declaration(rule, "min-height") !== undefined,
    )
    assert.equal(tall.length, 1, `${tall.length} rules give the page a minimum height`)
    assert.equal(declaration(tall[0], "min-height"), "calc(100vh - var(--prepper-topbar-height))")
    assert.deepEqual(tall[0].media, [], "the page is only a windowful tall at some widths")
    assert.ok(
      !tall[0].selector.includes("data-prepper-sidebar"),
      "the page's height depends on whether the rail is drawn",
    )

    // It cannot be left to the rail to make the page tall, which is what was happening before:
    // the rail is `display: none` when collapsed and below 800px, and a footer that moved when
    // the furniture did would be furniture deciding the shape of the page.
    assert.match(css, /\.sidebar\.left\{display:none/)

    const placed = all.filter((rule) => rule.selector === `${body}>footer`)
    assert.equal(placed.length, 1, `${placed.length} rules place the footer`)
    assert.equal(declaration(placed[0], "align-self"), "end")
    assert.deepEqual(placed[0].media, [])

    // And no gap: what the footer gets is the window's own leftover, not a box, a margin or a
    // height somebody added to push it down.
    assert.ok(
      !/(?:^|[;{\s])(margin|padding|height|min-height|top)[-:]/.test(placed[0].body),
      `the footer's placement manufactures space: ${placed[0].body}`,
    )
    assert.ok(
      !/\bfooter\b[^{]*\{[^}]*(?:min-height|margin-top:\s*auto)/.test(css),
      "something else is pushing the footer down",
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

/**
 * Prose keeps the measure, and a generated index does not — seam 1, over the one fixture that
 * emits every page type at once.
 *
 * The claim these tests make is a **composition of two halves**, and neither half is worth
 * anything alone. The markup half asks the emitted page which of the layout's two body
 * selectors it matches, by running them against it; the stylesheet half evaluates what those
 * selectors declare at a given viewport width. Neither is a measurement: nothing in this repo
 * lays a page out, and a `getBoundingClientRect` at seam 2 would be a number jsdom invented.
 * What is computed is what a browser would compute out of the same two inputs.
 *
 * The distinction under test is written against **what the page's body is** rather than
 * against which page it is, so there is no assertion in here on a slug, a filename or a title.
 * A Lesson holds the measure because it renders no index, not because it lives in `lessons/`;
 * the day a third kind of generated index page arrives it will be wide without this file
 * changing.
 */
describe("prose keeps the measure, and a generated index does not", () => {
  let site: EmittedSite
  let css: string

  /** The four page types whose body is prose, and which therefore hold the measure. */
  const prose = [
    ["a Lesson", "lessons/array-indexing"],
    ["a Reference", "references/hash-map-internals"],
    ["a Cheat sheet", "cheat-sheets/hash-map-quick-reference"],
    ["a Problem", "problems/two-sum"],
  ] as const

  before(
    async () => {
      site = await buildFixture("topic-index")
      css = stylesheets(site, site.page("lessons/array-indexing"))
    },
    { timeout: 120_000 },
  )

  test("a Lesson, a Reference, a Cheat sheet and a Problem render no index at all", () => {
    // The premise of every width assertion below: these four pages match the plain body
    // selector and nothing else, so the wide grid cannot reach them.
    assert.deepEqual(
      prose.map(([, slug]) => bodySelectors(site.page(slug))),
      prose.map(() => [body]),
    )
  })

  test("the home page and a Term page are both generated indexes", () => {
    // The other side of the same premise, and the two shapes of it: the entry point *is* an
    // index, and a Term page *carries* one under its own prose.
    assert.deepEqual(bodySelectors(site.page("index")), [body, indexBody])
    assert.deepEqual(bodySelectors(site.page("terms/hash-maps")), [body, indexBody])
  })

  for (const width of [1280, 1600, 1920]) {
    test(`the four prose page types each hold 38rem at ${width}px`, () => {
      const all = rules(css)
      const properties = customProperties(all)
      const applies = active(all, width)

      assert.deepEqual(
        prose.map(([, slug]) => {
          const columns = tracks(grid(applies, bodySelectors(site.page(slug))))
          return pixels(columns[1], {
            container: container(applies, width, properties, [body, indexBody]),
            properties,
          })
        }),
        prose.map(() => 38 * 16),
      )
    })

    test(`the home page's index fills the available width at ${width}px`, () => {
      // "Wide" is not a second magic number: it is the prose track's own clamp with the
      // measure taken out of it, so an index page takes everything the rail and the gaps
      // leave. At 1920 that is the page's own cap rather than the window, which is why the
      // container is read off the sheet rather than assumed to be the width.
      const all = rules(css)
      const properties = customProperties(all)
      const applies = active(all, width)
      const room = container(applies, width, properties, [body, indexBody])

      const columns = tracks(grid(applies, bodySelectors(site.page("index"))))
      const centre = pixels(columns[1], { container: room, properties })

      assert.equal(centre, room - 320 - 10, `the index does not fill ${room}px: ${columns[1]}`)
      assert.ok(centre > 38 * 16, `the index is no wider than the measure: ${centre}px`)
    })
  }

  for (const width of [360, 900, 1280, 1600, 1920]) {
    test(`nothing scrolls sideways on an index page at ${width}px`, () => {
      // The acceptance criterion, at one width from each of the layout's three bands and at
      // both ends of the desktop one. An index track is the only track in the app written to
      // *take* the leftover rather than to be given it, so it is the only one that can
      // overshoot -- and an entry page with a horizontal scrollbar is the first thing a
      // reader of this app would see. The tracks are guaranteed exactly the container, gaps
      // included, and the gap is read off the sheet rather than restated here.
      const all = rules(css)
      const properties = customProperties(all)
      const applies = active(all, width)
      const selectors = bodySelectors(site.page("index"))
      const room = container(applies, width, properties, selectors)

      const columns = tracks(grid(applies, selectors))
      const guaranteed = columns
        .map((track) => pixels(floor(track), { container: room, properties }))
        .reduce((a, b) => a + b)

      // `gap`, not `column-gap`: upstream writes the two separately and lightningcss folds
      // them into the shorthand, whose first value is the *row* gap and whose second, when
      // there is one, is the column gap.
      const gaps = applies
        .filter((rule) => selectors.includes(rule.selector))
        .map((rule) => declaration(rule, "gap"))
        .filter((value): value is string => value !== undefined)
      assert.ok(gaps.length >= 1, `the grid declares no column gap at ${width}px`)
      const declared = (gaps.at(-1) as string).split(/\s+/)
      const gap = pixels(declared.at(-1) as string, { container: room, properties })

      assert.equal(
        guaranteed + gap * (columns.length - 1),
        room,
        `${columns.length} tracks over ${room}px at ${width}px: ${columns.join(" | ")}`,
      )
    })
  }

  test("a Term page is both: the prose is capped at the measure and the index is not", () => {
    // The ticket's main hazard, and the only assertion in the file that reads a rule's
    // selector back onto the page it applies to. A Term page's body is a sentence or two of
    // definition followed by the generated index, and the two want different widths out of
    // one column. So the width is given to the *column* and taken back from everything in it
    // that is not the index -- which is checked here by selecting, from the emitted page, the
    // elements each capping rule reaches.
    const term = site.page("terms/hash-maps")
    const capped = rules(css).filter(
      (rule) => declaration(rule, "max-width") === "var(--prepper-measure)",
    )
    assert.equal(capped.length, 2, `${capped.length} rules cap the prose`)

    const reached = capped.flatMap((rule) => term.selectAll(rule.selector, term.tree))
    const index = term.require(".prepper-generated-index", term.tree)
    const article = term.require(".center > article", term.tree)

    assert.ok(reached.includes(article), "the Term's own prose is not held to the measure")
    assert.ok(!reached.includes(index), "the Term's index is held to the measure")
    assert.ok(
      !reached.some((element) => element.children.includes(index)),
      "a box holding the index is held to the measure, which holds the index to it too",
    )

    // And the prose is really there: a Term whose body were empty would satisfy the above
    // vacuously, and a Term's own definition is half of what this page is.
    assert.match(term.text(undefined, article), /A map from keys to values/)
  })

  test("no prose page is capped, because its column is the measure already", () => {
    // The cap exists to undo the widening, so it must not reach a page that was never
    // widened -- a second, weaker measure on a Lesson would be a rule nobody could reason
    // about the day the first one changed.
    const capped = rules(css).filter(
      (rule) => declaration(rule, "max-width") === "var(--prepper-measure)",
    )
    for (const [name, slug] of prose) {
      const page = site.page(slug)
      assert.deepEqual(
        capped.flatMap((rule) => page.selectAll(rule.selector, page.tree)),
        [],
        `${name} is capped by a rule meant for an index page`,
      )
    }
  })
})
