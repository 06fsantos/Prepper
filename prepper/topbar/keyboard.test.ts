/**
 * The bar's controls under a keyboard, through seam 2 -- and a plain statement of the two
 * things this seam cannot do.
 *
 * It cannot press Tab: jsdom implements no sequential focus navigation, so a test that walked
 * the bar with six Tab presses would be walking a traversal the harness wrote. And it cannot
 * press Enter: jsdom does not synthesise the click a native button fires when a key is
 * released on it. Both of those are the browser's behaviour rather than Prepper's, and the
 * markup they are computed from is asserted at seam 1 (`controls.test.ts`).
 *
 * What is left is exactly what this seam is for -- the build's markup and the build's scripts
 * in a DOM -- and it is the half that a change of ours could break:
 *
 * - **Focus lands.** Every control accepts it and becomes `document.activeElement`, which is
 *   the runtime version of the markup claim seam 1 makes: nothing is disabled, nothing is
 *   `tabindex="-1"`, nothing sits inside something inert.
 * - **The rail toggle answers a `click`, and only a `click`.** That distinction is the whole
 *   of "operable by keyboard" for a button: `click` is what Enter and Space fire, and a
 *   handler bound to `mousedown` or `pointerdown` instead would be a control that works for
 *   a pointer and does nothing at all for a keyboard, while looking identical in every
 *   screenshot.
 * - **Its state follows.** `aria-pressed` is what a screen reader is told and what the
 *   stylesheet swaps the glyph on, so the announcement and the icon cannot drift.
 *
 * And nothing is written down but the one word the rail is allowed to remember.
 */
import test, { describe } from "node:test"
import assert from "node:assert"

import { openPage, type Screen } from "../testing/browser.ts"

const fixture = "reading-surface"
const lesson = "lessons/hash-map-lookup-cost"

/** The bar's controls, in the order the slots put them. */
const controls = [
  "button.prepper-sidebar-toggle",
  ".page-title > a",
  "button.search-button",
  "button.darkmode",
  "button.readermode",
  "button.global-graph-icon",
]

function inBar(screen: Screen, selector: string): HTMLElement {
  return screen.one(`.page-header > header ${selector}`) as unknown as HTMLElement
}

describe("the bar's controls, under a keyboard", () => {
  test("focus lands on every control in the bar", async () => {
    const screen = await openPage(fixture, lesson)

    for (const selector of controls) {
      const control = inBar(screen, selector)
      control.focus()
      assert.equal(screen.document.activeElement, control, `focus will not rest on ${selector}`)
    }
  })

  test("the rail toggle answers the event a key press makes, and not a pointer's", async () => {
    // `click` is what a native button fires for Enter and for Space as well as for the mouse,
    // so a handler on it is a control both devices reach. `mousedown` is only ever a pointer's,
    // and a control wired to that one is a control a keyboard cannot work -- which is invisible
    // in every other kind of test.
    const screen = await openPage(fixture, lesson)
    const toggle = inBar(screen, "button.prepper-sidebar-toggle")
    const state = () => screen.document.documentElement.getAttribute("data-prepper-sidebar")

    toggle.dispatchEvent(
      new screen.window.MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    )
    assert.equal(state(), null, "the rail moved on a pointer event a keyboard cannot send")

    screen.click(toggle)
    assert.equal(state(), "hidden")
  })

  test("the state a screen reader is told is the state the glyph is drawn from", async () => {
    // Both glyphs are in the markup and the stylesheet picks between them on `aria-pressed`
    // (`prepper/sidebar`), which is the same attribute an assistive technology reads. jsdom
    // applies no stylesheet, so what is checked here is that the attribute the swap keys on is
    // the attribute the click writes -- and that neither glyph is taken out of the document,
    // which would leave the swap with nothing to swap to.
    const screen = await openPage(fixture, lesson)
    const toggle = inBar(screen, "button.prepper-sidebar-toggle")
    const glyphs = () => screen.all("button.prepper-sidebar-toggle > svg").length

    assert.equal(glyphs(), 2)
    assert.equal(toggle.getAttribute("aria-pressed"), "false")

    screen.click(toggle)

    assert.equal(toggle.getAttribute("aria-pressed"), "true")
    assert.equal(glyphs(), 2, "the swap is a stylesheet, not a script rewriting the button")
  })

  test("reaching every control and working one records nothing", async () => {
    const screen = await openPage(fixture, lesson)

    for (const selector of controls) inBar(screen, selector).focus()
    screen.click(inBar(screen, "button.prepper-sidebar-toggle"))

    assert.deepEqual([...screen.remembered], [["prepper-sidebar", "hidden"]])
    assert.deepEqual(screen.recorded, [], "the bar reached for storage or the network")
  })
})
