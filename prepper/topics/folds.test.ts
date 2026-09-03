/**
 * Collapsing an item of the topic tree, through seam 2: the build's own markup, in a DOM.
 *
 * The fold itself is HTML and needs nothing asserting here -- a `<details>` opens and shuts
 * whether or not a script ran, which is why it is one. What is asserted is the part that is
 * ours: that a collapsed item is still collapsed on the next page, that it is the only thing
 * kept, and that reaching a topic by clicking its name does not shut it on the way out.
 */
import test, { describe } from "node:test"
import assert from "node:assert"

import { openPage, type Screen } from "../testing/browser.ts"

const fixture = "topic-index"
const page = "problems/two-sum"

/** One item of the tree, by the id the memory holds it under. */
function fold(screen: Screen, id: string): HTMLDetailsElement {
  return screen.one(`details.prepper-topic-fold[data-fold="${id}"]`) as HTMLDetailsElement
}

/** The row that works it: the disclosure and the name, which is a link to the topic itself. */
function row(fold: Element): Element {
  return fold.querySelector(":scope > summary") as Element
}

/**
 * Let the fold's own event reach the page.
 *
 * `toggle` is queued rather than dispatched where the state changes -- that is the element's
 * behaviour, not ours -- so the click and what the page made of it are two turns. Every
 * assertion about what was remembered waits one.
 */
function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe("collapsing an item of the topic tree", () => {
  test("the tree arrives with every item open", async () => {
    const screen = await openPage(fixture, page)

    // Navigation that arrived shut would make the reader open a topic to find out whether it
    // holds anything -- the opposite of the fold in a note's body, which arrives closed
    // because a closed outline is how a section gets chosen.
    for (const item of screen.all("details.prepper-topic-fold")) {
      assert.ok((item as HTMLDetailsElement).open, `${item.getAttribute("data-fold")} arrived shut`)
    }
    assert.deepEqual(
      [...screen.remembered],
      [],
      "a reader who has collapsed nothing stores nothing",
    )
  })

  test("working the row collapses the item, and that is what is remembered", async () => {
    const screen = await openPage(fixture, page)
    const structures = fold(screen, "terms/data-structures")

    screen.click(row(structures))
    await settled()

    assert.equal(structures.open, false)
    assert.deepEqual([...screen.remembered], [["prepper-topic-folds", "terms/data-structures"]])
    assert.deepEqual(
      screen.recorded,
      [],
      "two keys by name are the carve-out; storage, cookies and the network are still shut",
    )
  })

  test("a second item shuts alongside the first, and opening one takes it back out", async () => {
    const screen = await openPage(fixture, page)

    // The two folds the rail now has: the one umbrella and the flat Cheat sheets list. The
    // topics under the umbrella are plain links, not folds of their own.
    screen.click(row(fold(screen, "terms/data-structures")))
    screen.click(row(fold(screen, "cheat-sheets")))
    await settled()

    assert.deepEqual((screen.remembered.get("prepper-topic-folds") ?? "").split(" ").sort(), [
      "cheat-sheets",
      "terms/data-structures",
    ])

    screen.click(row(fold(screen, "terms/data-structures")))
    await settled()

    // What is stored is the exceptions, so opening an item again leaves nothing behind.
    assert.equal(screen.remembered.get("prepper-topic-folds"), "cheat-sheets")
  })

  test("a reader who collapsed a topic opens the next page with it collapsed", async () => {
    const screen = await openPage(fixture, page, {
      remembered: { "prepper-topic-folds": "terms/data-structures" },
    })

    assert.equal(fold(screen, "terms/data-structures").open, false)
    assert.equal(fold(screen, "cheat-sheets").open, true, "only the item that was shut")
  })

  test("following a topic's name is not collapsing it", async () => {
    // The name is a link inside the row that works the fold, so the browser does both. The
    // page is about to be replaced, so the fold is neither here nor there -- but remembering
    // it would shut the topic the reader has just navigated into, for a reason they could not
    // name.
    const screen = await openPage(fixture, page)
    const structures = fold(screen, "terms/data-structures")

    // The umbrella's summary is a link to its own overview page, the same as a topic name was.
    screen.click(structures.querySelector(":scope > summary .prepper-topic-name") as Element)
    await settled()

    assert.equal(structures.open, true)
    assert.deepEqual([...screen.remembered], [])
  })

  test("the Cheat sheets list folds too, and is remembered by its own name", async () => {
    const screen = await openPage(fixture, page)

    screen.click(row(fold(screen, "cheat-sheets")))
    await settled()

    assert.equal(fold(screen, "cheat-sheets").open, false)
    assert.equal(screen.remembered.get("prepper-topic-folds"), "cheat-sheets")
  })

  test("with no script at all, every item is open and every one of them still works", async () => {
    // The fold is a `<details>`: it is the element's own behaviour, and the state a scriptless
    // reader gets is the whole tree. What they lose is the memory, which is the harmless half.
    const screen = await openPage(fixture, page, { scripts: false })

    assert.equal(screen.scriptsRun, 0)
    for (const item of screen.all("details.prepper-topic-fold")) {
      assert.ok((item as HTMLDetailsElement).open)
      assert.ok(item.querySelector(":scope > summary"), "an item with no row to work it")
    }
    assert.deepEqual([...screen.remembered], [])
  })
})
