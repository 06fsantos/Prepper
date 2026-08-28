/**
 * The fold an anchor lands in, through seam 2.
 *
 * Everything else about folding is markup and belongs to seam 1. This is the one behaviour:
 * a browser will not open a closed `<details>` to reach an anchor inside it, so a table of
 * contents click, a heading permalink or a `#heading` wikilink would otherwise scroll to a
 * section that is not on the page.
 *
 * It is an enhancement over a page that is already correct -- with none of this the fold is
 * still there and still opens on click -- so the scriptless case is asserted too, and what it
 * asserts is that nothing has moved.
 */
import test, { describe } from "node:test"
import assert from "node:assert"

import { openPage, type Screen } from "../testing/browser.ts"

const fixture = "folded-headings"
const lesson = "lessons/writing-a-binary-search"

/** Follow a heading permalink the way the page does: the hash changes, the browser says so. */
function goTo(screen: Screen, id: string) {
  screen.window.location.hash = `#${id}`
  screen.window.dispatchEvent(new screen.window.Event("hashchange"))
}

function fold(screen: Screen, id: string): HTMLDetailsElement {
  const heading = screen.one(`#${id}`)
  return heading.closest("details.prepper-fold") as HTMLDetailsElement
}

describe("reaching a folded section", () => {
  test("an anchor opens the fold it lands in", async () => {
    const screen = await openPage(fixture, lesson)
    assert.equal(fold(screen, "the-invariant").open, false)

    goTo(screen, "the-invariant")

    assert.equal(fold(screen, "the-invariant").open, true)
  })

  test("it opens every fold between the page and the section", async () => {
    // The `####` is three deep. Opening it alone would leave it inside two closed
    // disclosures, which is a section the reader still cannot see.
    const screen = await openPage(fixture, lesson)

    goTo(screen, "the-one-that-still-bites")

    const summary = (found: Element) =>
      (found.querySelector("summary")?.textContent ?? "").replace(/\s+/g, " ").trim()

    assert.deepEqual(
      screen
        .all("details.prepper-fold")
        .map((found) => [summary(found), (found as HTMLDetailsElement).open]),
      [
        ["The invariant", true],
        ["Why half-open beats closed", true],
        ["The one that still bites", true],
        ["Where the loop ends", false],
        ["Common mistakes", false],
      ],
    )
  })

  test("opening a fold is told to nobody", async () => {
    // What a reader unfolded is their own business, and the next visit to this note starts
    // from the same outline. The rail's collapse is the one preference this app keeps.
    const screen = await openPage(fixture, lesson)

    goTo(screen, "the-invariant")
    screen.click(screen.one("details.prepper-fold > summary"))

    assert.deepEqual(screen.recorded, [])
    assert.deepEqual([...screen.remembered], [])
  })

  test("with no script, every fold is shut and the page is whole", async () => {
    const screen = await openPage(fixture, lesson, { scripts: false })

    assert.equal(screen.scriptsRun, 0)
    assert.ok(
      screen.all("details.prepper-fold").every((found) => !(found as HTMLDetailsElement).open),
    )
    assert.match(screen.text("article"), /overflows in a fixed-width integer/)
  })
})
