/**
 * Hiding the rail, through seam 2: the build's own button, in a DOM.
 *
 * The one place in Prepper where a page is allowed to remember anything, so the assertions
 * come in pairs: what the click did, and what it kept. `screen.recorded` stays empty through
 * all of it -- the tripwires are open for one key by name and closed for everything else --
 * and `screen.remembered` is where the one word lands.
 *
 * ## What this seam can and cannot say about the article not moving
 *
 * jsdom performs no layout: there is no viewport, no box tree, and `getBoundingClientRect`
 * returns zeroes for everything. So the article's bounding box cannot be measured here, and a
 * test that claimed to have measured it would be reporting a number the harness made up. The
 * pixel-free half of that promise is asserted where it lives -- in the emitted stylesheet, at
 * 360px, 1280px, 1600px and 1920px, in `sidebar.test.ts`.
 *
 * `openPage`'s `width` is not a viewport this file is pretending to have. It is the answer to
 * the one question the script asks the window -- `matchMedia`, which of the rail's two
 * presentations is on screen -- and a test that opens a page at 360px is a test that has said
 * so. Everything it then asserts is markup: an attribute, a label, a pressed state.
 *
 * What this file contributes is the other premise that proof rests on: **that a click changes
 * nothing but one attribute on `<html>`**. A stylesheet argument about two states is only
 * worth anything if the two states differ by exactly the thing the argument is about, and a
 * script that quietly added a class or an inline width to the centre column would move the
 * article without any rule in the stylesheet saying so. So the click is taken, and the
 * article's own markup -- the grid, the column, the article element -- is compared with itself
 * before and after.
 */
import test, { describe } from "node:test"
import assert from "node:assert"

import { openPage, type Screen } from "../testing/browser.ts"

const fixture = "reading-surface"
const lesson = "lessons/hash-map-lookup-cost"

/**
 * The state as the page holds it: an attribute on `<html>`, which the stylesheet reads.
 *
 * Three values, and `"default"` here is the absence of the attribute -- which is not a fourth
 * state but each width's own: the rail beside the article on a desktop, no drawer over it on a
 * phone. `"hidden"` differs from it only above 800px and `"shown"` only below, which is what
 * lets one remembered word mean the right thing at both.
 */
function rail(screen: Screen): string {
  return screen.document.documentElement.getAttribute("data-prepper-sidebar") ?? "default"
}

/** The control. */
function control(screen: Screen): Element {
  return screen.one("button.prepper-sidebar-toggle")
}

/** A phone. jsdom lays nothing out; this is the width `matchMedia` answers with. See `openPage`. */
const phone = 360

/**
 * Everything about the article column that a browser computes its box from, as markup.
 *
 * The grid it is placed by, the column itself, the article inside it: each one's tag, its
 * classes and any inline style. Nothing else can change the centre column's geometry without
 * going through the stylesheet, and the stylesheet is asserted at seam 1.
 */
function column(screen: Screen): string[] {
  return ["#quartz-body", "#quartz-body > .center", "article"].map((selector) => {
    const element = screen.one(selector)
    const style = element.getAttribute("style") ?? ""
    return `${selector} | ${element.tagName} | ${element.getAttribute("class") ?? ""} | ${style}`
  })
}

describe("hiding the left rail", () => {
  test("a click hides it, and says so", async () => {
    const screen = await openPage(fixture, lesson)
    const button = control(screen)

    assert.equal(rail(screen), "default")
    assert.equal(button.getAttribute("aria-pressed"), "false")

    screen.click(button)

    assert.equal(rail(screen), "hidden")
    assert.equal(button.getAttribute("aria-pressed"), "true")
    assert.equal(
      button.getAttribute("aria-label"),
      "Show the sidebar",
      "the control names what it will do next, because it is also the way back",
    )
  })

  test("a second click brings it back", async () => {
    const screen = await openPage(fixture, lesson)
    const button = control(screen)

    screen.click(button)
    screen.click(button)

    assert.equal(
      rail(screen),
      "shown",
      "the way back is stated rather than implied: on a wide window it reads the same as the default, and on a phone it is the drawer",
    )
    assert.equal(button.getAttribute("aria-pressed"), "false")
    assert.equal(button.getAttribute("aria-label"), "Hide the sidebar")
  })

  test("the way back is outside the thing that went away", async () => {
    // The whole reason the control moved into the top bar. The rail is hidden whole now --
    // one `display: none` on the rail itself -- so a control that was still inside it would
    // be hidden with it, and a reader who collapsed the rail would be stuck with it collapsed.
    const screen = await openPage(fixture, lesson)
    const button = control(screen)

    screen.click(button)

    assert.ok(!screen.one(".left.sidebar").contains(button), "the control is not in the rail")
    assert.ok(screen.one(".page-header > header").contains(button), "the control is in the bar")
  })

  test("a click changes one attribute on <html> and nothing about the article", async () => {
    // The premise `sidebar.test.ts`'s non-movement proof rests on: the collapsed page and the
    // uncollapsed page differ by exactly the attribute the stylesheet reads. Nothing gains a
    // class, nothing gains an inline width, and no wrapper is inserted round the column -- so
    // the browser is laying the article out from the same rules in both states, which is the
    // thing jsdom can be asked and a pixel measurement here would only pretend to be.
    const screen = await openPage(fixture, lesson)
    const before = column(screen)

    screen.click(control(screen))

    assert.equal(rail(screen), "hidden")
    assert.deepEqual(column(screen), before)
  })

  test("the choice is remembered, and it is the only thing that is", async () => {
    const screen = await openPage(fixture, lesson)

    screen.click(control(screen))

    assert.deepEqual([...screen.remembered], [["prepper-sidebar", "hidden"]])
    assert.deepEqual(
      screen.recorded,
      [],
      "one key by name is the carve-out; storage, cookies and the network are still shut",
    )
  })

  test("a page opened by a reader who hid it opens hidden", async () => {
    const screen = await openPage(fixture, lesson, {
      remembered: { "prepper-sidebar": "hidden" },
    })

    assert.equal(rail(screen), "hidden")
    assert.equal(control(screen).getAttribute("aria-pressed"), "true")
  })

  test("on a phone the page opens with no drawer over the article", async () => {
    // The defect this replaces: below 800px Quartz laid the rail out as a strip across the
    // top of the page, so the whole topic tree sat above every article with no way to dismiss
    // it. The page now opens with the attribute absent, which down there is the drawer shut --
    // and the control says what pressing it will do, which is the opposite of what it says on
    // a desktop.
    const screen = await openPage(fixture, lesson, { width: phone })
    const button = control(screen)

    assert.equal(rail(screen), "default")
    assert.equal(button.getAttribute("aria-pressed"), "true")
    assert.equal(button.getAttribute("aria-label"), "Show the sidebar")
  })

  test("on a phone the same control opens the drawer and closes it again", async () => {
    // One mechanism, two presentations. The press means "call the rail up if it is not on the
    // page, put it away if it is" -- which on a desktop reads first as hiding and on a phone
    // first as opening, from the same button and the same key.
    const screen = await openPage(fixture, lesson, { width: phone })
    const button = control(screen)

    screen.click(button)
    assert.equal(rail(screen), "shown")
    assert.equal(button.getAttribute("aria-label"), "Hide the sidebar")

    screen.click(button)
    assert.equal(rail(screen), "hidden")
    assert.equal(button.getAttribute("aria-label"), "Show the sidebar")

    assert.deepEqual([...screen.remembered], [["prepper-sidebar", "hidden"]])
    assert.deepEqual(screen.recorded, [], "still one key by name, and nothing else")
  })

  test("opening the drawer changes nothing about the article", async () => {
    // The drawer is fixed over the article rather than a block above it, so the page under it
    // is not re-laid-out. The stylesheet half of that is asserted at 360px in
    // `sidebar.test.ts`; this is the premise it rests on, at the width it rests on it.
    const screen = await openPage(fixture, lesson, { width: phone })
    const before = column(screen)

    screen.click(control(screen))

    assert.equal(rail(screen), "shown")
    assert.deepEqual(column(screen), before)
  })

  test("a reader who put the rail away on a desktop meets no drawer on a phone", async () => {
    // The one remembered word, read at the other width. "Away" is the same instruction in both
    // presentations, so nothing has to be translated and there is no second key to keep in
    // step with this one.
    const screen = await openPage(fixture, lesson, {
      width: phone,
      remembered: { "prepper-sidebar": "hidden" },
    })

    assert.equal(rail(screen), "hidden")
    assert.equal(control(screen).getAttribute("aria-pressed"), "true")
  })

  test("a remembered open drawer does not reopen over the next article", async () => {
    // `shown` is written on a press like any other state, but it is never *applied* from
    // storage: a load and an SPA navigation both put the attribute back to absent. On a
    // desktop that is indistinguishable from `shown` -- the rail is there either way -- and on
    // a phone it is the drawer closing itself behind a reader who followed a link out of it. A
    // drawer that reopened over every article would be the strip again, wearing a shadow.
    const phoneScreen = await openPage(fixture, lesson, {
      width: phone,
      remembered: { "prepper-sidebar": "shown" },
    })
    assert.equal(rail(phoneScreen), "default")

    const deskScreen = await openPage(fixture, lesson, {
      remembered: { "prepper-sidebar": "shown" },
    })
    assert.equal(rail(deskScreen), "default")
    assert.equal(control(deskScreen).getAttribute("aria-pressed"), "false")
  })

  test("with no script at all, the rail is shown and the control still says what it does", async () => {
    // The rail is furniture, not a seal: the state a scriptless reader gets is the whole page
    // with everything on it, which is the harmless one.
    const screen = await openPage(fixture, lesson, { scripts: false })

    assert.equal(screen.scriptsRun, 0)
    assert.equal(rail(screen), "default")
    assert.equal(control(screen).getAttribute("aria-label"), "Hide the sidebar")
    assert.deepEqual([...screen.remembered], [])
  })
})
