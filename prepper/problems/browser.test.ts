/**
 * A Problem in the browser, through seam 2: the click, over markup the build emitted.
 *
 * Two behaviours, and they are written in two languages for one reason. **Unsealing** is
 * the browser's own: a `<details>` is shut by the HTML specification and opened by a click
 * on its `<summary>`, so the failure mode is a script that has *not* run, and Prepper ships
 * none. **The hint ladder** is ours: the failure mode there is a script that has not run
 * leaving every hint on screen, which is what the vault says and what Obsidian shows, so
 * hiding them in JavaScript costs the reader nothing when it does not arrive.
 *
 * The hardest-worked assertion in here is the search preview one. Quartz's search pane
 * fetches a result's real page and splices its elements into the page the dev is reading,
 * and a seal that needed a script would arrive open -- handing the dev the solution to the
 * problem they were about to attempt, in response to typing a word into a search box. That
 * test is not a re-statement of the markup: it runs the pane's own mechanism.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import { openPage, openSearchPreview, type Screen } from "../testing/browser.ts"

describe("unsealing a Problem's solution", () => {
  let screen: Screen

  before(
    async () => {
      screen = await openPage("problem-sections", "problems/two-sum")
    },
    { timeout: 120_000 },
  )

  test("a click on the section's heading opens it", () => {
    const seal = screen.seal("solution")
    assert.equal(seal.open, false)

    summaryOf(seal).click()

    assert.equal(seal.open, true)
    assert.ok(screen.text('[data-section="solution"]').includes("Store after the lookup"))
  })

  test("and opens it in place, so there is nothing for the scroll position to lose", () => {
    // Nothing is moved, nothing is fetched, nothing is navigated to: the prose that
    // appears was already in the document, in the section it was written under, in the
    // position it will still be in. That is the whole of "the scroll position holds", and
    // it is a fact about the shape of the click rather than about pixels.
    const seal = screen.seal("solution")
    seal.open = false
    const where = screen.all(".problem-section").indexOf(screen.section("solution"))
    const before = screen.window.location.href

    summaryOf(seal).click()

    assert.equal(screen.all(".problem-section").indexOf(screen.section("solution")), where)
    assert.equal(screen.window.location.href, before)
    assert.equal(
      screen.one('[data-section="solution"] details p').closest("section"),
      screen.section("solution"),
    )
  })

  test("`## Complexity` opens without opening `## Solution`", () => {
    const solution = screen.seal("solution")
    const complexity = screen.seal("complexity")
    solution.open = false
    complexity.open = false

    summaryOf(complexity).click()

    assert.equal(complexity.open, true)
    assert.equal(solution.open, false)
  })

  test("and `## Solution` opens without opening `## Complexity`", () => {
    const solution = screen.seal("solution")
    const complexity = screen.seal("complexity")
    solution.open = false
    complexity.open = false

    summaryOf(solution).click()

    assert.equal(solution.open, true)
    assert.equal(complexity.open, false)
  })
})

describe("the seal without JavaScript", () => {
  let screen: Screen

  before(
    async () => {
      screen = await openPage("problem-sections", "problems/two-sum", { scripts: false })
    },
    { timeout: 120_000 },
  )

  test("both sections are shut with not one line of Prepper's script having run", () => {
    assert.equal(screen.scriptsRun, 0)
    assert.equal(screen.seal("solution").open, false)
    assert.equal(screen.seal("complexity").open, false)
  })

  test("and they still open on a click, because the control was never ours", () => {
    // The point of this pair is that the two are the same page. Nothing had to be loaded
    // for the seal to hold, and nothing has to be loaded for the dev to open it -- which
    // is why there is no window in which the page is shut and unopenable.
    summaryOf(screen.seal("solution")).click()
    assert.equal(screen.seal("solution").open, true)
  })
})

describe("a Problem in the search preview pane", () => {
  let screen: Screen

  before(
    async () => {
      // Read a Term, search, and land on the Problem: the pane splices the Problem's real
      // elements into the page already open, which is where a leak would happen.
      screen = await openSearchPreview("problem-sections", {
        from: "terms/interviewing",
        result: "problems/two-sum",
      })
    },
    { timeout: 120_000 },
  )

  test("arrives with both sections still sealed", () => {
    assert.equal(screen.seal("solution").open, false)
    assert.equal(screen.seal("complexity").open, false)
  })

  test("even though the host page is a live one with Prepper's scripts running", () => {
    assert.ok(screen.scriptsRun > 0)
  })

  test("and the solution is present but shut, because sealing hides it from the page and not from the Library", () => {
    // A solution is often the richest prose on a topic and has to stay findable. What the
    // seal protects is the moment of attempting, not the secrecy of the answer.
    assert.ok(screen.text('[data-section="solution"]').includes("Store after the lookup"))
    assert.equal(screen.seal("solution").open, false)
  })
})

describe("the hint ladder", () => {
  let screen: Screen
  let rungs: HTMLElement[]
  let control: HTMLButtonElement

  before(
    async () => {
      screen = await openPage("problem-sections", "problems/two-sum")
      rungs = screen.all(".problem-hint") as HTMLElement[]
      control = screen.one(".problem-hint-control") as HTMLButtonElement
    },
    { timeout: 120_000 },
  )

  test("starts with every rung hidden and one control offering the first", () => {
    assert.equal(rungs.length, 3)
    assert.deepEqual(
      rungs.map((rung) => rung.hidden),
      [true, true, true],
    )
    assert.equal(control.textContent, "Show a hint")
    assert.equal(control.disabled, false)
  })

  test("reveals exactly one further rung per click, in the order they were authored", () => {
    control.click()
    assert.deepEqual(
      rungs.map((rung) => rung.hidden),
      [false, true, true],
    )
    assert.equal(
      screen.text(".problem-hint[data-hint='1']"),
      "The brute force is a nested loop. What is the inner loop actually asking?",
    )

    control.click()
    assert.deepEqual(
      rungs.map((rung) => rung.hidden),
      [false, false, true],
    )
    // A nested bullet is part of the rung above it rather than a rung of its own, so it
    // arrives with hint two rather than costing a click of its own.
    assert.equal(
      screen.text(".problem-hint[data-hint='2']"),
      "It is asking whether the complement has been seen already. Membership, not ordering.",
    )
  })

  test("and the control says so once the last one is out", () => {
    assert.equal(control.textContent, "Next hint")

    control.click()

    assert.deepEqual(
      rungs.map((rung) => rung.hidden),
      [false, false, false],
    )
    assert.equal(control.disabled, true)
    assert.equal(control.textContent, "That was the last hint")
  })

  test("a further click reveals nothing, because there is nothing left to reveal", () => {
    control.click()
    assert.deepEqual(
      rungs.map((rung) => rung.hidden),
      [false, false, false],
    )
  })
})

describe("the hint ladder without JavaScript", () => {
  let screen: Screen

  before(
    async () => {
      screen = await openPage("problem-sections", "problems/two-sum", { scripts: false })
    },
    { timeout: 120_000 },
  )

  test("every hint is on the page, which is what the vault says and what Obsidian shows", () => {
    const rungs = screen.all(".problem-hint") as HTMLElement[]
    assert.equal(rungs.length, 3)
    assert.deepEqual(
      rungs.map((rung) => rung.hidden),
      [false, false, false],
    )
  })

  test("and no control is offered, because a control that did nothing would be worse", () => {
    assert.deepEqual(screen.all(".problem-hint-control"), [])
  })
})

describe("a Problem with no `## Hints`", () => {
  test("gets no ladder and no control", async () => {
    const screen = await openPage("problem-sections", "problems/design-a-url-shortener")
    assert.deepEqual(screen.all("prepper-hint-ladder"), [])
    assert.deepEqual(screen.all(".problem-hint-control"), [])
  })
})

/** The `<summary>` a sealed section is opened by -- the heading, which is the control. */
function summaryOf(seal: HTMLDetailsElement): HTMLElement {
  return seal.querySelector("summary") as HTMLElement
}
