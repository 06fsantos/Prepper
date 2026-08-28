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
