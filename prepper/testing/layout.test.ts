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
 * The first thing asked here is that the graph is placed **once**. It was placed
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
 *
 * The second thing is what the graph now *is*. It is no longer a panel in the right rail: it
 * is a control in the top bar, and pressing it opens the modal `@quartz-community/graph`
 * already ships. Reusing that modal rather than building a second one is the whole design, so
 * what is asserted here is the markup the reuse depends on -- the plugin's own
 * `.global-graph-icon` and `.global-graph-outer`, in the bar, with a name on the button --
 * and the absence the ticket is actually about, which is any `.graph` inside a rail.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import type { Element } from "hast"

import { buildFixture, type EmittedSite } from "./build-fixture.ts"

/**
 * A page of each kind the site emits, named by what it is rather than by its slug.
 *
 * The last two are here because they are resolved through a *different* pass of the loader
 * than the ones above them -- `layout.byPageType` gives 404 and the generated folder index
 * their own overrides -- and it is that pass the duplicating fallback runs in. Every one of
 * them carries exactly one `.graph`, and now that the graph is a control in the bar rather
 * than a panel in a rail, that is true of the two overridden layouts as well.
 */
const pageTypes: Record<string, { slug: string }> = {
  home: { slug: "index" },
  lesson: { slug: "lessons/hash-map-lookup-cost" },
  term: { slug: "terms/hash-maps" },
  problem: { slug: "problems/two-sum" },
  "folder index": { slug: "lessons/index" },
  "404": { slug: "404" },
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

  for (const [kind, { slug }] of Object.entries(pageTypes)) {
    test(`a ${kind} page places the graph exactly once`, () => {
      const page = site.page(slug)
      // Scoped to the whole document rather than to `.center`: the graph is chrome, and
      // the question is how many of it the layout placed anywhere on the page.
      const placed = page.selectAll(".graph", page.tree)
      assert.equal(placed.length, 1, `${slug} rendered ${placed.length}`)
    })
  }

  test("the graph the config placed is the one in the bar", () => {
    // The duplicate was a second copy in the same position, so counting alone would pass if
    // the surviving copy were the one the fallback conjured rather than the one
    // `quartz.config.yaml` asks for. The fallback's default position is `right`, which is
    // exactly why the duplicate was invisible until it was counted -- and is now what tells
    // the two copies apart, because the configured one is in `header`.
    const page = site.page("lessons/hash-map-lookup-cost")
    assert.equal(page.selectAll(".page-header > header > .graph", page.tree).length, 1)
  })

  test("no graph renders in either rail, on any page", () => {
    // The panel is what this ticket removed: a 250px box at the edge of the page drawing
    // four nodes. Asserted as an absence from the rails rather than as a presence in the
    // bar, because the absence is the thing a later edit restores without noticing -- and
    // asserted on every page type, since a rail is resolved per layout.
    for (const { slug } of Object.values(pageTypes)) {
      const page = site.page(slug)
      assert.deepEqual(page.selectAll(".sidebar .graph", page.tree), [], slug)
    }
  })

  test("the modal the bar's control opens is the plugin's own", () => {
    // The whole of this ticket's mechanism, stated as markup. The plugin's client wires
    // every `.global-graph-icon` in the document by a document-wide query and collects every
    // `.global-graph-outer` the same way, so a `.graph` rendered in the header is a working
    // graph control with no code of ours in the path. If either of these two ever stopped
    // being emitted, the control would still be in the bar and would do nothing at all.
    const page = site.page("lessons/hash-map-lookup-cost")
    const bar = page.require(".page-header > header", page.tree)
    assert.equal(page.selectAll(".global-graph-icon", bar).length, 1)
    assert.equal(page.selectAll(".global-graph-outer", bar).length, 1)
  })

  test("the bar's graph control has an accessible name", () => {
    const page = site.page("lessons/hash-map-lookup-cost")
    const control = page.require(".page-header > header .global-graph-icon", page.tree)
    const name = control.properties["ariaLabel"]
    assert.ok(typeof name === "string" && name.trim().length > 0, "the control is nameless")
  })

  test("nothing is placed in the right column, on any page", () => {
    // The column is retired (ticket 06). Nothing is configured into the position at all, so
    // the frame still renders its empty box and `prepper/reading` hides it -- and this is the
    // assertion that keeps the *config* honest, per page type, rather than trusting a
    // `display`. It is stated as an emptiness because the way it comes back is a new plugin
    // entry defaulting into `right` without anybody meaning it to.
    for (const { slug } of Object.values(pageTypes)) {
      const page = site.page(slug)
      assert.deepEqual(page.selectAll(".right.sidebar > *", page.tree), [], slug)
    }
  })

  test("the table of contents is a child of the grid, and is in no rail", () => {
    // Where the column's one survivor went. `footer` is the only layout position whose
    // components are rendered as direct children of `#quartz-body`, which is what lets
    // `prepper/reading` place the list in the grid's leftover third track as a sticky margin
    // element. A Problem is the page type in this fixture with headings, so it is the page
    // with a table of contents.
    const page = site.page("problems/two-sum")
    assert.equal(page.selectAll("#quartz-body > .toc", page.tree).length, 1)
    assert.deepEqual(page.selectAll(".sidebar .toc", page.tree), [], "it is back in a rail")
    assert.deepEqual(
      page.selectAll(".center .toc", page.tree),
      [],
      "it is inside the prose column, which is the one thing it must not take width from",
    )
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
    // so the bar is there; the left rail stays cleared, because a missing page has nothing to
    // put in it. The right rail is not cleared any more -- there is no longer a `right` to
    // clear, and the config that said so was describing a layout the build no longer has.
    const page = site.page("404")
    assert.ok(page.select(".page-header > header .search", page.tree), "no search on 404")
    // The rail toggle comes with the bar, and it is harmless on a page whose rails are
    // cleared: there is nothing in the rail to hide, and pressing it hides nothing.
    assert.ok(page.select(".page-header > header button.prepper-sidebar-toggle", page.tree))
    assert.deepEqual(page.selectAll(".left.sidebar > *", page.tree), [])
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
      ".graph",
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
    // side of search's 20 -- the rail toggle arrived at 5 that way, and and the graph did at 40,
    // with no re-layout. If this order ever stops being toggle, title, search, theme, reader,
    // graph, the slots have silently changed sides.
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
      "graph",
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
