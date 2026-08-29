/**
 * The hideable rail, through seam 1: what the build serves, and what it can no longer do.
 *
 * The click is seam 2's, in `toggling.test.ts`. What is asserted here is everything the click
 * depends on and cannot itself establish -- that the control is in the top bar rather than
 * inside the rail it hides, that it is nowhere the search preview would clone it, that the
 * page is served to every reader in the same state, and that the collapse is a stylesheet
 * rather than a script.
 *
 * And then the thing this file mostly exists for: **that the article column cannot move** --
 * whether the rail is a column beside it or a drawer over it.
 *
 * ## Why the proof is a stylesheet proof, and why it is the real one
 *
 * The ticket asks for the article's box to be identical before and after a collapse at 1280px,
 * 1600px and 1920px. Seam 2 is jsdom, which parses a DOM and performs **no layout at all**: it
 * has no viewport, no box tree and no `getBoundingClientRect` worth the name, so a pixel
 * measurement taken there would be a number this harness invented. Reporting one would be
 * worse than reporting none.
 *
 * So what is asserted is the thing that makes movement impossible, at exactly those three
 * widths. The centre column's geometry is a function of the grid track list on
 * `.page > #quartz-body` and of the box properties of the column itself; the collapsed state
 * is one attribute on `<html>`. If, at a given viewport width, **no rule conditioned on that
 * attribute has any of those elements as its subject, and none of them redefines a custom
 * property the grid is written in**, then the cascade resolves to the same declarations in
 * both states and the article's box is identical -- not approximately, and not by arithmetic
 * that happens to come out level, but because the browser is reading the same rules.
 *
 * That is what `active` computes, in `prepper/testing/stylesheets.ts`: the emitted CSS, parsed
 * into rules with their enclosing media conditions, evaluated at a width. A condition that
 * cannot be decided counts as applying, so an exotic query hides nothing from the assertion.
 * The scanner lives there rather than here because `prepper/reading/reading.test.ts` proves the
 * measure the same way -- one reading of the emitted stylesheet, two facts asserted off it.
 *
 * The old collapse fails this test loudly, which is the point: it restated
 * `grid-template-columns` with the left track reduced to a gutter, and that rule's subject was
 * `#quartz-body`.
 *
 * ## And the second presentation
 *
 * Below 800px the rail was Quartz's strip across the top of the page: the whole topic tree
 * above every article, with the control not even rendered. What is asserted for the drawer
 * that replaced it is what a stylesheet can be asked -- that the rail's default down there is
 * to be off the page *unconditionally*, so a scriptless reader gets no drawer rather than one
 * waiting to be shut; that the state that opens it is fixed, viewport-bounded and under the
 * bar; and, through the same width loop as the collapse, that opening it moves the article no
 * more than collapsing does.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import { buildFixture, type EmittedSite, type Page } from "../testing/build-fixture.ts"
import {
  active,
  declaration,
  rules,
  stylesheets,
  subjects,
  type Rule,
} from "../testing/stylesheets.ts"

/**
 * The widths the article is proved not to move at.
 *
 * The three ticket 03 names, all above upstream's 1200px breakpoint, and a phone width below
 * its 800px one: the drawer that opens down there is fixed over the article, so "the article
 * does not move" is the same claim about a different presentation, and it is proved the same
 * way.
 */
const widths = [360, 1280, 1600, 1920]

/**
 * Everything the centre column's position and width are computed from.
 *
 * The grid that places it, the column itself, and the article inside it. A rule that moved the
 * article without being about one of these would have to do it through an ancestor -- and the
 * ancestors are `.page`, `body` and `html`, which are in the list of forbidden subjects below
 * for that reason.
 */
const centre = ["#quartz-body", ".center", "article", ".page", "body", "html", ":root"]

describe("the hideable left rail", () => {
  let site: EmittedSite
  let lesson: Page
  let css: string

  before(
    async () => {
      site = await buildFixture("reading-surface")
      lesson = site.page("lessons/hash-map-lookup-cost")
      css = stylesheets(site, lesson)
    },
    { timeout: 120_000 },
  )

  test("the control is in the top bar, and not inside the rail it hides", () => {
    // It used to be a direct child of the rail, and that was load-bearing while the collapse
    // hid the rail's children one at a time and spared this one. The rail goes whole now, so
    // a control anywhere inside it would go with it and leave the reader no way back.
    const bar = lesson.require(".page-header > header", lesson.tree)
    assert.equal(lesson.selectAll("button.prepper-sidebar-toggle", bar).length, 1)

    const rail = lesson.require(".left.sidebar", lesson.tree)
    assert.deepEqual(lesson.selectAll("button.prepper-sidebar-toggle", rail), [])

    const anywhere = lesson.selectAll("button.prepper-sidebar-toggle", lesson.tree)
    assert.equal(anywhere.length, 1, "one control on the page")
  })

  test("the control is nowhere the search preview would clone it", () => {
    // Quartz's preview pane clones every `.popover-hint` out of a fetched page and appends
    // the clones to the live document. A control rendered inside one would arrive as a second
    // copy of itself, over the top of the page the reader is on. `header` is a sibling of the
    // hint rather than a descendant, which is what makes the bar a legal home for it.
    for (const hint of lesson.selectAll(".popover-hint", lesson.tree)) {
      assert.deepEqual(lesson.selectAll("button.prepper-sidebar-toggle", hint), [])
    }
  })

  test("the page is served to everybody in the same state: shown", () => {
    // The state is one reader's, and this file is on a CDN. Nothing about the preference is
    // baked into the markup -- it is applied by script, over a page that says nothing.
    assert.match(lesson.html, /<html\b[^>]*>/)
    assert.ok(!/<html[^>]*data-prepper-sidebar/.test(lesson.html))

    const control = lesson.require("button.prepper-sidebar-toggle", lesson.tree)
    assert.equal(control.properties["ariaPressed"], "false")
    assert.equal(control.properties["ariaLabel"], "Hide the sidebar")
    assert.equal(control.tagName, "button")
  })

  test("the remembered state is applied before the body is drawn", () => {
    // Quartz concatenates every `beforeDOMLoaded` script into one head bundle, ours with its
    // own. That the snippet is in *that* file is the whole of the no-flash behaviour: a
    // reader who collapsed the rail never sees it appear and then vanish. Seam 2 cannot run
    // that bundle -- it is Quartz's client as well as ours -- so this is where it is checked.
    const prescript = site.files.find((file) => file.startsWith("prescript-"))
    assert.ok(prescript, "the build emitted a head bundle")

    const head = site.file(prescript)
    assert.match(head, /prepper-sidebar/)
    assert.match(head, /data-prepper-sidebar/)
  })

  test("collapsing is a stylesheet, and it takes the rail whole", () => {
    const hides = rules(css).filter(
      (rule) => conditional(rule) && /display:\s*none/.test(rule.body),
    )
    assert.equal(hides.length, 1, "one rule hides the rail, and it is the only one")
    assert.deepEqual(subjects(hides[0]), [".sidebar.left"])

    // Not child-by-child, and with no exception carved out for a control that is no longer in
    // there. Both shapes are named, because both are what this used to be.
    assert.doesNotMatch(css, /data-prepper-sidebar[^{]*\*:not\(/)
    assert.doesNotMatch(css, /data-prepper-sidebar[^{]*prepper-sidebar-toggle/)
  })

  test("the control is rendered at every width", () => {
    // It used to be `display: none` below 800px, because down there the rail was a strip
    // across the top of the page and there was nothing to reclaim. The strip is gone and the
    // control is the only way to the drawer that replaced it, so a rule that hid it at any
    // width would leave a phone reader with no route into the library.
    for (const width of [360, 600, 799, 800, 1280, 1920]) {
      const hidden = active(rules(css), width).filter(
        (rule) =>
          subjects(rule).includes(".prepper-sidebar-toggle") && /display:\s*none/.test(rule.body),
      )
      assert.deepEqual(hidden, [], `the control is hidden at ${width}px`)
    }
  })

  test("below 800px the rail is not on the page until it is asked for", () => {
    // The defect this ticket exists for: Quartz lays the left rail out below 800px as a strip
    // across the top of the page, so a phone reader met the entire topic tree above every
    // article, with no way to dismiss it. The default down there is now no rail at all -- and
    // it is the *markup's* default, an unconditional rule, so a page whose scripts never ran
    // has no drawer over its article either.
    const shut = displays(rules(css), 360, null)
    assert.equal(shut.at(-1), "none", `the rail resolves to ${shut.at(-1)} at 360px`)

    // And the drawer, which only the attribute switches on.
    const open = drawer(rules(css))
    assert.equal(declaration(open, "display"), "flex")
    assert.equal(
      declaration(open, "position"),
      "fixed",
      "a drawer in the flow would push the article down instead of covering it",
    )
  })

  test("the drawer cannot push the page sideways", () => {
    // "No horizontal page scroll at any supported width" is a layout fact, and jsdom lays
    // nothing out. What can be established is the thing that makes it true: the drawer is
    // fixed, anchored to the left edge, and its width is bounded by a fraction of the
    // viewport rather than by a number that a narrow phone could be narrower than -- with
    // `border-box`, so its padding and border are inside that bound rather than added to it.
    const open = drawer(rules(css))
    assert.equal(declaration(open, "left"), "0")
    assert.equal(declaration(open, "box-sizing"), "border-box")
    assert.match(
      declaration(open, "width") ?? "",
      /min\([^)]*\d+vw\)/,
      "the drawer's width is not bounded by the viewport",
    )
  })

  test("the drawer opens under the bar, and the way out of it stays on top", () => {
    // The control that opens the drawer is the control that closes it, and it lives in the
    // bar. So the drawer starts at the bar's own height and sits below the bar's z-index:
    // a drawer that covered its own toggle would be the strip again, with a shadow.
    const open = drawer(rules(css))
    assert.equal(declaration(open, "top"), "var(--prepper-topbar-height)")
    assert.ok(Number(declaration(open, "z-index")) < 1000, "the drawer paints over the bar")
  })

  for (const width of widths) {
    test(`at ${width}px, nothing the collapse switches on can reach the article`, () => {
      // The proof of non-movement. Every rule that applies at this width and is conditioned on
      // the collapsed attribute must have the rail itself as its subject -- never the grid,
      // the centre column, the article or any of their ancestors -- and must redefine no
      // custom property, because the grid is written in `--prepper-measure` and
      // `--prepper-sidebar` and a redefinition would move the column without naming it.
      const conditioned = active(rules(css), width).filter(conditional)
      assert.ok(conditioned.length >= 1, `no collapse rule applies at ${width}px`)

      for (const rule of conditioned) {
        assert.deepEqual(
          subjects(rule),
          [".sidebar.left"],
          `at ${width}px this rule can reach past the rail: ${rule.selector}`,
        )
        assert.ok(
          !/(^|[;{\s])--[\w-]+\s*:/.test(rule.body),
          `at ${width}px the collapse redefines a custom property: ${rule.selector}`,
        )
      }
    })

    test(`at ${width}px, the article's grid track is the same in both states`, () => {
      // Said the other way round, on the declaration rather than on the selector: the
      // `grid-template-columns` the centre column resolves against is declared by
      // `prepper/reading` alone, unconditionally, and is byte-identical whether or not the
      // rail is hidden. This is the assertion the old collapse broke.
      const shown = gridDeclarations(active(rules(css), width), false)
      const hidden = gridDeclarations(active(rules(css), width), true)

      assert.ok(shown.length >= 1, `no grid declared at ${width}px`)
      assert.deepEqual(hidden, shown, `the grid at ${width}px changes when the rail is hidden`)
    })
  }

  test("the grid is declared once per viewport band and never by this module", () => {
    // `prepper/reading` owns the page's layout; the collapse owns one `display`. Two modules
    // declaring the same grid is how the jump got in.
    const grids = rules(css).filter(
      (rule) => /grid-template-columns/.test(rule.body) && /--prepper-measure/.test(rule.body),
    )
    assert.equal(grids.length, 3, "one band each: wide, medium, narrow")
    assert.ok(grids.every((rule) => !conditional(rule)))

    // Three more for a page whose body is a generated index, in the same three bands and
    // from the same module -- the width a prose page spends on margin, spent on the index
    // instead. They are counted here for the same reason as the three above: what this test
    // is guarding is that no second module, and above all not this one, starts declaring the
    // page's grid. None of them is conditioned on the rail either, which is what keeps the
    // article still on an index page as well as on a prose one.
    const indexes = rules(css).filter(
      (rule) =>
        /grid-template-columns/.test(rule.body) && /prepper-generated-index/.test(rule.selector),
    )
    assert.equal(indexes.length, 3, "one band each, for the index too")
    assert.ok(indexes.every((rule) => !conditional(rule)))
  })

  test("the collapse is not what retired the right rail", () => {
    // The right rail is gone -- `prepper/reading` hides it and the column it stood in is
    // margin now (ticket 06). It went unconditionally, in the module that owns the page's
    // layout, and it must never come to depend on this control: a rail that appeared when the
    // left one was put away would be a second grid wearing a `display`.
    assert.ok(!/data-prepper-sidebar[^{]*\.sidebar\.right/.test(css))
  })

  test("nothing in the collapse moves", () => {
    // Motion is `prepper/tokens`' vocabulary and its own ticket. A rail that eased its way out
    // would be a rail whose state a reader can catch mid-flight.
    const sheets = site.files
      .filter((file) => file.endsWith(".css"))
      .map((file) => site.file(file))
      .filter((sheet) => sheet.includes("data-prepper-sidebar"))

    assert.equal(sheets.length, 1, `${sheets.length} stylesheets carry the collapse`)
    assert.doesNotMatch(sheets[0], /transition|animation/)
  })
})

/** Whether a rule only applies while the attribute holds some particular value. */
function conditional(rule: Rule): boolean {
  return rule.selector.includes("data-prepper-sidebar")
}

/**
 * Every `display` the rail resolves through at `width`, in the state named.
 *
 * `state` is the attribute's three values: `null` for absent, which is each width's own
 * default, and `"hidden"` or `"shown"` for a reader who has said something. The last entry is
 * what wins, every rule here having the same subject and the emitted order being the
 * cascade's.
 */
function displays(all: Rule[], width: number, state: string | null): string[] {
  return active(all, width)
    .filter((rule) => (conditional(rule) ? valued(rule, state) : true))
    .filter((rule) => subjects(rule).includes(".sidebar.left"))
    .flatMap((rule) => [...rule.body.matchAll(/(?:^|[;{\s])display:([^;}]+)/g)])
    .map((match) => match[1].trim())
}

/** The one rule that puts the drawer on screen: the rail, below 800px, called up. */
function drawer(all: Rule[]): Rule {
  const found = all.filter(
    (rule) =>
      valued(rule, "shown") &&
      subjects(rule).includes(".sidebar.left") &&
      rule.media.some((query) => /max-width/.test(query)),
  )
  assert.equal(found.length, 1, `${found.length} rules open the drawer`)
  return found[0]
}

/**
 * Whether a rule is conditioned on the attribute holding `state`.
 *
 * Quotes are optional in the emitted file -- lightningcss drops them from an identifier-shaped
 * value -- so the value is matched rather than the source text.
 */
function valued(rule: Rule, state: string | null): boolean {
  return state === null
    ? false
    : new RegExp(`data-prepper-sidebar=["']?${state}["']?\\]`).test(rule.selector)
}

/**
 * Every `grid-template-columns` that applies to the page's own grid, in the state named.
 *
 * `hidden: true` is the collapsed reader -- the rules whose selectors are unconditional plus
 * the ones the attribute switches on. `hidden: false` is everybody else. The two lists being
 * equal is the article not moving.
 */
function gridDeclarations(all: Rule[], hidden: boolean): string[] {
  return all
    .filter((rule) => hidden || !conditional(rule))
    .filter((rule) => subjects(rule).some((subject) => centre.includes(subject)))
    .flatMap((rule) => [...rule.body.matchAll(/grid-template-columns:([^;}]+)/g)])
    .map((match) => match[1].trim())
}
