/**
 * The graph control, through seam 2 -- and a plain statement of what this seam cannot say
 * about it.
 *
 * The control is `@quartz-community/graph`'s own button and the modal it opens is that
 * plugin's own modal. Neither is Prepper's code, and this harness runs **Prepper's scripts
 * only**, picked out of the emitted bundle by the `prepper-` marker. So the opening itself --
 * the click handler, the Ctrl/Cmd-G shortcut, the `active` class that shows the modal -- is
 * not reachable here, and nothing below pretends to have taken it. It is asserted at seam 1
 * instead, as the markup the reuse depends on: the plugin's `.global-graph-icon` and
 * `.global-graph-outer` in the bar, with a name on the button
 * (`prepper/testing/layout.test.ts`). The wiring between them is upstream's, tested upstream,
 * and would be a fork if it were ours.
 *
 * What *is* ours is the removal, and it is behaviour rather than markup: the local
 * `.graph-container` is in the page the build emits and is gone from the page a reader has.
 * That is exactly what this seam is for -- the build's markup and the build's script, in a
 * DOM -- and it is worth asserting because the failure is silent. The plugin renders into
 * every `.graph-container` it can find whether or not anything is drawing it, so a removal
 * that quietly stopped matching would leave a canvas, a force simulation and a frame loop
 * running on every page with nothing on screen to show for it.
 */
import test, { describe } from "node:test"
import assert from "node:assert"

import { openPage, type Screen } from "../testing/browser.ts"

const fixture = "reading-surface"
const lesson = "lessons/hash-map-lookup-cost"

describe("the bar's graph control", () => {
  let screen: Screen

  test("the page opens", async () => {
    screen = await openPage(fixture, lesson)
    assert.ok(screen.scriptsRun > 0)
  })

  test("the graph the build emitted carries the plugin's local panel", async () => {
    // The premise the next assertion rests on. If the plugin ever stopped emitting the
    // panel, the removal below would be a no-op that passes for the wrong reason.
    const asBuilt = await openPage(fixture, lesson, { scripts: false })
    assert.equal(asBuilt.all(".graph .graph-container").length, 1)
  })

  test("the local panel is not in the page the reader gets", () => {
    assert.deepEqual(screen.all(".graph-container"), [])
  })

  test("the button and the modal survive the removal", () => {
    // The two things the whole design is: upstream's own control, and upstream's own modal
    // for it to open. A removal that took either with it would leave a bar that looks right
    // and does nothing.
    assert.equal(screen.all(".page-header > header .global-graph-icon").length, 1)
    assert.equal(screen.all(".page-header > header .global-graph-outer").length, 1)
    // A different class from the one that was removed, and deliberately left alone: it is
    // the modal's canvas host, not the panel's.
    assert.equal(screen.all(".global-graph-outer > .global-graph-container").length, 1)
  })

  test("the removal leaves its own record on the graph it shaped", () => {
    assert.equal(screen.one(".graph").getAttribute("data-prepper-graph-control"), "true")
  })

  test("the graph is nowhere near a rail", () => {
    assert.deepEqual(screen.all(".sidebar .graph"), [])
  })

  test("shaping the bar remembers nothing and tells nobody", () => {
    assert.deepEqual(screen.recorded, [])
    assert.deepEqual([...screen.remembered.keys()], [])
  })
})
