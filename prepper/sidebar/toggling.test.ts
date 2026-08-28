/**
 * Collapsing the rail, through seam 2: the build's own button, in a DOM.
 *
 * The one place in Prepper where a page is allowed to remember anything, so the assertions
 * come in pairs: what the click did, and what it kept. `screen.recorded` stays empty through
 * all of it -- the tripwires are open for one key by name and closed for everything else --
 * and `screen.remembered` is where the one word lands.
 */
import test, { describe } from "node:test"
import assert from "node:assert"

import { openPage } from "../testing/browser.ts"

const fixture = "reading-surface"
const lesson = "lessons/hash-map-lookup-cost"

/** The state as the page holds it: an attribute on `<html>`, which the stylesheet reads. */
function rail(screen: { document: Document }): string {
  return screen.document.documentElement.getAttribute("data-prepper-sidebar") ?? "shown"
}

describe("collapsing the left rail", () => {
  test("a click collapses it, and says so", async () => {
    const screen = await openPage(fixture, lesson)
    const control = screen.one(".prepper-sidebar-toggle")

    assert.equal(rail(screen), "shown")
    assert.equal(control.getAttribute("aria-pressed"), "false")

    screen.click(control)

    assert.equal(rail(screen), "hidden")
    assert.equal(control.getAttribute("aria-pressed"), "true")
    assert.equal(
      control.getAttribute("aria-label"),
      "Show the sidebar",
      "the control names what it will do next, because it is also the way back",
    )
  })

  test("a second click brings it back", async () => {
    const screen = await openPage(fixture, lesson)
    const control = screen.one(".prepper-sidebar-toggle")

    screen.click(control)
    screen.click(control)

    assert.equal(rail(screen), "shown")
    assert.equal(control.getAttribute("aria-pressed"), "false")
    assert.equal(control.getAttribute("aria-label"), "Hide the sidebar")
  })

  test("the choice is remembered, and it is the only thing that is", async () => {
    const screen = await openPage(fixture, lesson)

    screen.click(screen.one(".prepper-sidebar-toggle"))

    assert.deepEqual([...screen.remembered], [["prepper-sidebar", "hidden"]])
    assert.deepEqual(
      screen.recorded,
      [],
      "one key by name is the carve-out; storage, cookies and the network are still shut",
    )
  })

  test("a page opened by a reader who collapsed it opens collapsed", async () => {
    const screen = await openPage(fixture, lesson, {
      remembered: { "prepper-sidebar": "hidden" },
    })

    assert.equal(rail(screen), "hidden")
    assert.equal(screen.one(".prepper-sidebar-toggle").getAttribute("aria-pressed"), "true")
  })

  test("with no script at all, the rail is shown and the control still says what it does", async () => {
    // The rail is furniture, not a seal: the state a scriptless reader gets is the whole page
    // with everything on it, which is the harmless one.
    const screen = await openPage(fixture, lesson, { scripts: false })

    assert.equal(screen.scriptsRun, 0)
    assert.equal(rail(screen), "shown")
    assert.equal(
      screen.one(".prepper-sidebar-toggle").getAttribute("aria-label"),
      "Hide the sidebar",
    )
    assert.deepEqual([...screen.remembered], [])
  })
})
