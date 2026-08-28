/**
 * The hideable rail, through seam 1: what the build serves, before anybody has clicked.
 *
 * The behaviour is seam 2's, in `toggling.test.ts`. What is asserted here is everything the
 * click depends on and cannot itself establish: that the control is in the rail and is a
 * child of it, that it is nowhere the search preview would clone it, that the page is served
 * to every reader in the same state, and that the collapsed layout is in the stylesheet
 * rather than in a script.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import { buildFixture, type EmittedSite, type Page } from "../testing/build-fixture.ts"

describe("the hideable left rail", () => {
  let site: EmittedSite
  let lesson: Page
  let css: string

  before(
    async () => {
      site = await buildFixture("reading-surface")
      lesson = site.page("lessons/hash-map-lookup-cost")
      css = site.files
        .filter((file) => file.endsWith(".css"))
        .map((file) => site.file(file))
        .join("\n")
    },
    { timeout: 120_000 },
  )

  test("the control is a child of the rail it collapses", () => {
    // Collapsing hides the rail's other children by selector, so a control nested inside one
    // of them -- inside a flex group, say, or inside the topic tree -- would go down with it
    // and leave the reader no way back.
    const inRail = lesson.selectAll(".sidebar.left > .prepper-sidebar-toggle", lesson.tree)
    assert.equal(inRail.length, 1)

    const anywhere = lesson.selectAll(".prepper-sidebar-toggle", lesson.tree)
    assert.equal(anywhere.length, 1, "one control on the page")
  })

  test("the control is nowhere the search preview would clone it", () => {
    // Quartz's preview pane clones every `.popover-hint` out of a fetched page and appends
    // the clones to the live document. A control rendered inside one would arrive as a second
    // copy of itself, over the top of the page the reader is on.
    for (const hint of lesson.selectAll(".popover-hint", lesson.tree)) {
      assert.deepEqual(lesson.selectAll(".prepper-sidebar-toggle", hint), [])
    }
  })

  test("the page is served to everybody in the same state: shown", () => {
    // The state is one reader's, and this file is on a CDN. Nothing about the preference is
    // baked into the markup -- it is applied by script, over a page that says nothing.
    assert.match(lesson.html, /<html\b[^>]*>/)
    assert.ok(!/<html[^>]*data-prepper-sidebar/.test(lesson.html))

    const control = lesson.require(".prepper-sidebar-toggle", lesson.tree)
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

  test("collapsing is a stylesheet, and it keeps the control", () => {
    const collapsed = [...css.matchAll(/\[data-prepper-sidebar="?hidden"?\][^{]*\{([^}]*)\}/g)].map(
      (match) => match[0],
    )
    assert.ok(collapsed.length >= 3, `expected the collapsed rules, found ${collapsed.length}`)

    assert.ok(
      collapsed.some((rule) => /prepper-sidebar-toggle/.test(rule) && /display:none/.test(rule)),
      "the rail's other children are hidden, by a rule that excepts the control",
    )
    assert.ok(
      collapsed.some(
        (rule) => /grid-template-columns/.test(rule) && /--prepper-measure/.test(rule),
      ),
      "the collapsed layout is the same three columns, still sized from the measure",
    )
  })

  test("nothing about the right rail changes", () => {
    // The table of contents, the graph and the backlinks are consulted while reading. This
    // control is about the rail you use before you start.
    assert.ok(!/data-prepper-sidebar[^{]*\.sidebar\.right/.test(css))
  })
})
