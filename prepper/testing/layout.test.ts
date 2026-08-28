/**
 * The chrome our configuration resolves to, through seam 1.
 *
 * Every other test in the repo asks what a note became. This one asks what the *page
 * around it* became, because the layout a build renders is not written down anywhere in
 * this repo: `quartz.config.yaml` lists plugins and each one's `layout:` block, and
 * Quartz's loader turns that list into six arrays of components. Nothing in the config
 * states the result, so nothing but an emitted page can be asked whether the result is
 * what the config said.
 *
 * The first thing asked here is that the graph panel is placed **once**. It was placed
 * twice for as long as `prepper/graph` was configured as the bare path `./prepper/graph`,
 * and the mechanism is worth stating because it is general rather than about the graph:
 *
 * - Quartz derives a config entry's plugin name from its **source path's basename** --
 *   `./prepper/graph` is the plugin named `graph` -- and never from the `manifest.name`
 *   the module itself exports.
 * - An entry with **no `layout:` block** is then looked up in the component registry by
 *   that name and by its PascalCase form, and if something answers, the component is
 *   placed at *its* manifest's `defaultPosition` and `defaultPriority`. That fallback is
 *   how a component-only package gets a position without the config naming one.
 * - The registry is **flat and global**: `@quartz-community/graph` registers its panel
 *   under `Graph`, unqualified, beside its fully-qualified key.
 *
 * So an emitter of ours whose *directory name* happens to PascalCase onto some other
 * package's component adopts that component and asks for it to be rendered -- in addition
 * to wherever the config already placed it. Nothing warns; the config still names the
 * plugin exactly once. The repair is to give the entry its own `name`, which is what the
 * object source form is for, and this file is the tripwire that catches the next
 * collision: a new local plugin called `./prepper/search` or `./prepper/footer` would
 * duplicate a panel the same way.
 *
 * Asserted per page type, on one build, because the fallback runs once per layout Quartz
 * resolves and `layout.byPageType` resolves several of them -- 404 and the generated
 * folder index among them.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import type { Element } from "hast"

import { buildFixture, type EmittedSite } from "./build-fixture.ts"

/**
 * A page of each kind the site emits, named by what it is rather than by its slug, and
 * how many graph panels it is supposed to carry.
 *
 * Zero is the right answer twice, and neither is an accident: `layout.byPageType` clears
 * `right` outright for `404` and for a generated folder index, so those two pages are the
 * ones on which "the config places the graph once" cannot be read off a rendered panel.
 * They are here because they are resolved through a *different* pass of the loader than
 * the pages above them, and it is that pass the fallback runs in.
 */
const pageTypes: Record<string, { slug: string; panels: number }> = {
  home: { slug: "index", panels: 1 },
  lesson: { slug: "lessons/hash-map-lookup-cost", panels: 1 },
  term: { slug: "terms/hash-maps", panels: 1 },
  problem: { slug: "problems/two-sum", panels: 1 },
  "folder index": { slug: "lessons/index", panels: 0 },
  "404": { slug: "404", panels: 0 },
}

describe("the chrome the configuration resolves to", () => {
  let site: EmittedSite

  before(
    async () => {
      // `topic-index` is the fixture that has one of every page type at once, which is
      // what this file needs and the only reason it is the one read here.
      site = await buildFixture("topic-index")
    },
    { timeout: 300_000 },
  )

  test("the vault builds", () => {
    assert.equal(site.exitCode, 0, site.log)
  })

  for (const [kind, { slug, panels: expected }] of Object.entries(pageTypes)) {
    test(`a ${kind} page renders the graph panel ${expected} time(s)`, () => {
      const page = site.page(slug)
      // Scoped to the whole document rather than to `.center`: the panel is chrome, and
      // the question is how many of it the layout placed anywhere on the page.
      const panels = page.selectAll(".graph", page.tree)
      assert.equal(panels.length, expected, `${slug} rendered ${panels.length}`)
    })
  }

  test("the panel the config placed is the one in the right rail", () => {
    // The duplicate was a second copy in the same rail, so counting alone would pass if
    // the surviving copy were the one the fallback conjured rather than the one
    // `quartz.config.yaml` asks for. It is in `right` because that is what the config
    // says; the fallback's default position happens to be `right` too, which is exactly
    // why the duplicate was invisible until it was counted.
    const page = site.page("lessons/hash-map-lookup-cost")
    assert.equal(page.selectAll(".right.sidebar > .graph", page.tree).length, 1)
  })

  test("the link graph is still emitted by the plugin that was renamed", () => {
    // `./prepper/graph` carries its own `name` now, which is the key Quartz installs and
    // loads it by. If that rename had cost the plugin its entry point, the build would
    // stay green and simply write no graph -- and the topic index and the Vault report
    // would quietly read a file from a previous build.
    assert.ok(site.files.includes("static/linkGraph.json"))
    assert.ok(site.linkGraph.nodes.length > 0)
  })
})

/**
 * The top bar, through seam 1: where it renders, what it holds, and what it takes off the
 * rail.
 *
 * The bar is Quartz's own `<header>` -- `prepper/topbar` renders nothing and carries the
 * stylesheet that makes that element a bar -- so the questions worth asking here are about
 * placement rather than markup: that the element exists on every page type the site emits,
 * that the four controls are in it and no longer in the rail, and that the order they resolve
 * to is the order the slots are made of.
 *
 * The rest is CSS, and CSS is where the bar's two structural promises live: that page content
 * is offset by a token rather than by a number written twice, and that nothing in it moves.
 * Both are read off the emitted stylesheet, because the stylesheet is what a browser gets.
 */
describe("the top bar", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("topic-index")
    },
    { timeout: 300_000 },
  )

  for (const [kind, { slug }] of Object.entries(pageTypes)) {
    test(`a ${kind} page renders the bar exactly once`, () => {
      const page = site.page(slug)
      const bars = page.selectAll(".page-header > header", page.tree)
      assert.equal(bars.length, 1, `${slug} rendered ${bars.length} bars`)
    })
  }

  test("404 is a laid-out page, and it is laid out for a reader who is lost", () => {
    // Upstream's 404 page type declares `frame: "minimal"`, which renders the message and
    // nothing else -- no way to search, no way home. `layout.byPageType` overrides the frame
    // so the bar is there; the rails stay cleared, because a missing page has nothing to put
    // in them.
    const page = site.page("404")
    assert.ok(page.select(".page-header > header .search", page.tree), "no search on 404")
    // The rail toggle comes with the bar, and it is harmless on a page whose rails are
    // cleared: there is nothing in the rail to hide, and pressing it hides nothing.
    assert.ok(page.select(".page-header > header button.prepper-sidebar-toggle", page.tree))
    assert.deepEqual(page.selectAll(".left.sidebar > *", page.tree), [])
    assert.deepEqual(page.selectAll(".right.sidebar > *", page.tree), [])
  })

  test("the bar holds the app's controls, and the rail no longer does", () => {
    const page = site.page("lessons/hash-map-lookup-cost")
    const bar = page.require(".page-header > header", page.tree)

    for (const control of [
      "button.prepper-sidebar-toggle",
      ".page-title",
      ".search",
      ".darkmode",
      ".readermode",
    ]) {
      assert.equal(page.selectAll(control, bar).length, 1, `${control} is not in the bar`)
      assert.equal(
        page.selectAll(control, page.require(".left.sidebar", page.tree)).length,
        0,
        `${control} is still in the rail`,
      )
    }
  })

  test("the slots are the order the header position resolves to", () => {
    // This is the whole slot mechanism: one CSS rule gives `.search` an automatic inline
    // margin, so everything ordered before it is pushed to the left edge of the bar and
    // everything after it to the right. A control lands in a slot by taking a priority either
    // side of search's 20 -- the rail toggle arrived at 5 that way, and the graph will at 40,
    // with no re-layout. If this order ever stops being toggle, title, search, theme, reader,
    // the slots have silently changed sides.
    const page = site.page("lessons/hash-map-lookup-cost")
    const bar = page.require(".page-header > header", page.tree)
    const order = bar.children
      .filter((child): child is Element => child.type === "element")
      .map((child) => (child.properties.className as string[])[0])

    assert.deepEqual(order, [
      "prepper-sidebar-toggle",
      "page-title",
      "search",
      "darkmode",
      "readermode",
    ])
  })

  test("the bar is nowhere the search preview would clone it", () => {
    // The hazard that forced `prepper/sidebar` into `left` rather than `beforeBody`: the
    // preview pane clones every `.popover-hint` out of a fetched page and appends the clones
    // to the live document. `header` is a *sibling* of the hint rather than a descendant, so
    // the bar is not cloned -- which is the fact the whole placement rests on.
    const page = site.page("lessons/hash-map-lookup-cost")
    for (const hint of page.selectAll(".popover-hint", page.tree)) {
      assert.deepEqual(page.selectAll("header", hint), [])
    }
  })

  test("the bar's height is written once, and every offset refers to it", () => {
    const css = topbarStylesheet()
    const declared = css.match(/--prepper-topbar-height:\s*([^;}]+)/)
    assert.ok(declared, "the bar publishes no height token")

    const value = declared[1].trim()
    // The literal appears exactly once, in the declaration. Anything that has to begin below
    // the bar -- the page's top padding, the sticky rails, an anchor's scroll padding -- says
    // `var(--prepper-topbar-height)`, so there is no second copy of the height free to
    // disagree with the first.
    const literals = css.match(new RegExp(`(^|[^0-9.])${value.replace(".", "\\.")}`, "g")) ?? []
    assert.equal(literals.length, 1, `the height ${value} is written ${literals.length} times`)

    assert.match(css, /body\{[^}]*padding-top:var\(--prepper-topbar-height\)/)
    assert.match(css, /header\{[^}]*position:fixed/)
  })

  test("nothing in the bar moves", () => {
    // Motion is `prepper/tokens`' vocabulary and its own ticket. A module with no motion
    // tokens that eases something anyway is how a design system stops being one -- and the
    // bar is the most tempting place in the app to do it.
    const css = topbarStylesheet()
    assert.doesNotMatch(css, /transition|animation/)
  })

  /**
   * Our stylesheet, picked out of the emitted ones by the token only it declares.
   *
   * Quartz writes each component's CSS to its own hashed file, so there is no name to ask
   * for; the height token is the thing that identifies the sheet, and asserting there is
   * exactly one of it also asserts nobody else has started declaring the bar's height.
   */
  function topbarStylesheet(): string {
    const sheets = site.files
      .filter((file) => file.endsWith(".css"))
      .map((file) => site.file(file))
      .filter((css) => css.includes("--prepper-topbar-height:"))

    assert.equal(sheets.length, 1, `${sheets.length} stylesheets declare the bar's height`)
    return sheets[0]
  }
})
