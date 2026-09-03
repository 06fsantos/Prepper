/**
 * Answering a quiz block, through seam 2: the build's markup, the build's script, in a DOM.
 *
 * Nothing here writes a `<prepper-quiz>` by hand. The page is the one `quiz-fence-types`
 * produced and the script is the minified file that page links, so a test can only pass if
 * the reader would get the same behaviour -- and a change to the transform's markup breaks
 * these tests rather than silently leaving the browser half grading nothing.
 *
 * Every test opens its own page. A quiz is answered once and answering is irreversible, so
 * two tests sharing a screen would be two tests depending on the order they ran in; the
 * fixture build behind them is memoised, so the cost is a DOM and not a build.
 *
 * Two facts are asserted over and over rather than once, because they are the properties the
 * feature is *for*: an untouched block stays untouched, and answering records nothing.
 */
import test, { describe } from "node:test"
import assert from "node:assert"

import { buildFixture } from "../testing/build-fixture.ts"
import { openPage, type Screen } from "../testing/browser.ts"

const MCQ = '[data-quiz-id="01M0Z900000000000000000604"]'
const CLOZE = '[data-quiz-id="01M0Z900000000000000000605"]'
const RECALL = '[data-quiz-id="01M0Z900000000000000000606"]'

/** The lesson carrying one fence of every type, with Prepper's scripts running. */
function lesson(): Promise<Screen> {
  return openPage("quiz-fence-types", "lessons/hash-map-lookup-cost")
}

describe("answering a quiz block", { timeout: 120_000 }, () => {
  test("the page ships the script that defines the block", async () => {
    const screen = await lesson()
    assert.ok(screen.scriptsRun > 0)
    assert.ok(
      screen.window.customElements.get("prepper-quiz"),
      "no script the page ships defined <prepper-quiz>",
    )
  })

  describe("an mcq", () => {
    test("has no submit control: the click is the answer", async () => {
      const screen = await lesson()
      assert.deepEqual(screen.all(`${MCQ} button`), [])
      assert.deepEqual(screen.all(`${MCQ} input`), [])
    })

    test("makes each option a control, and says so to a screen reader", async () => {
      const screen = await lesson()
      const options = screen.all(`${MCQ} .quiz-option`)
      assert.deepEqual(
        options.map((o) => o.getAttribute("role")),
        ["button", "button", "button"],
      )
      assert.deepEqual(
        options.map((o) => o.getAttribute("tabindex")),
        ["0", "0", "0"],
      )
    })

    test("grades the instant an option is clicked", async () => {
      const screen = await lesson()
      const quiz = screen.one(MCQ)
      assert.equal(quiz.getAttribute("data-quiz-answered"), null)

      screen.click(screen.one(`${MCQ} .quiz-option[data-quiz-correct="false"]`))

      assert.equal(quiz.getAttribute("data-quiz-answered"), "wrong")
    })

    test("a wrong click opens that option's explanation and the right one's, and no other", async () => {
      // Selected by their correct flag rather than by position, because the options are
      // shuffled on load: which one is where is exactly what this feature made unpredictable.
      const screen = await lesson()
      const right = screen.one(`${MCQ} .quiz-option[data-quiz-correct="true"]`)
      const [chosen, otherWrong] = screen.all(`${MCQ} .quiz-option[data-quiz-correct="false"]`)

      screen.click(chosen)

      assert.ok(opened(screen, chosen), "the clicked wrong option opens")
      assert.ok(opened(screen, right), "the correct option opens too")
      assert.equal(opened(screen, otherWrong), false, "the untouched wrong option stays shut")
      assert.equal(
        collapse(right.querySelector(".quiz-explanation")?.textContent),
        "The key hashes straight to its bucket.",
        "the correct option shows its own explanation, wherever the shuffle put it",
      )
    })

    test("a right click opens that option's explanation, and the key stays shut", async () => {
      const screen = await lesson()
      const right = screen.one(`${MCQ} .quiz-option[data-quiz-correct="true"]`)

      screen.click(right)

      assert.equal(screen.one(MCQ).getAttribute("data-quiz-answered"), "correct")
      assert.ok(opened(screen, right))
      assert.deepEqual(
        screen.all(`${MCQ} .quiz-option[data-quiz-correct="false"]`).map((o) => opened(screen, o)),
        [false, false],
        "the wrong options' explanations stay shut",
      )
    })

    test("is answered once: a second click opens nothing further", async () => {
      const screen = await lesson()
      const quiz = screen.one(MCQ)
      const right = screen.one(`${MCQ} .quiz-option[data-quiz-correct="true"]`)
      const [wrong, other] = screen.all(`${MCQ} .quiz-option[data-quiz-correct="false"]`)

      screen.click(wrong)
      const answered = quiz.outerHTML
      screen.click(other)
      screen.click(right)

      assert.equal(quiz.outerHTML, answered, "the block did not change on the later clicks")
    })

    test("answers from the keyboard too", async () => {
      const screen = await lesson()
      const right = screen.one(`${MCQ} .quiz-option[data-quiz-correct="true"]`)

      screen.press(right, "Enter")

      assert.equal(screen.one(MCQ).getAttribute("data-quiz-answered"), "correct")
    })

    test("shuffles the options client-side, keeping each paired with its own explanation", async () => {
      // `Math.random() === 0` makes Fisher-Yates draw a known permutation: the options,
      // emitted correct-first, come out correct-last. A forced draw, so the reorder is a fact
      // rather than a coin toss the test hopes lands its way.
      const screen = await openPage("quiz-fence-types", "lessons/hash-map-lookup-cost", {
        random: () => 0,
      })
      const written = ["Constant time, no scan", "Constant time, one scan", "Linear time, full scan"]

      const order = optionTexts(screen)
      assert.deepEqual(order, [
        "Constant time, one scan",
        "Linear time, full scan",
        "Constant time, no scan",
      ])
      assert.notDeepEqual(order, written, "the options were reordered from how they were written")
      assert.deepEqual([...order].sort(), [...written].sort(), "no option was added or lost")

      const correct = screen.one(`${MCQ} .quiz-option[data-quiz-correct="true"]`)
      assert.equal(
        collapse(correct.querySelector(".quiz-option-text")?.textContent),
        "Constant time, no scan",
      )
      assert.equal(
        collapse(correct.querySelector(".quiz-explanation")?.textContent),
        "The key hashes straight to its bucket.",
        "the correct flag, its text and its explanation all moved together",
      )
      assert.deepEqual(screen.recorded, [], "shuffling records nothing")
    })

    test("without scripts, the options keep their written order -- the correct one first", async () => {
      // The degradation floor: no JavaScript, and Quartz's search preview pane, get the emitted
      // markup, which is written order. The shuffle is an enhancement over a correct page.
      const screen = await openPage("quiz-fence-types", "lessons/hash-map-lookup-cost", {
        scripts: false,
      })
      assert.deepEqual(optionTexts(screen), [
        "Constant time, no scan",
        "Constant time, one scan",
        "Linear time, full scan",
      ])
    })
  })

  describe("a cloze", () => {
    test("ships with every hole blanked, and the answers concealed", async () => {
      const screen = await lesson()
      assert.deepEqual(
        screen.all(`${CLOZE} .cloze-answer`).map((a) => screen.isOpen(a)),
        [false, false],
      )
      assert.deepEqual(
        screen.all(`${CLOZE} .cloze-blank`).map((b) => screen.isOpen(b)),
        [true, true],
      )
    })

    test("reveals every span on one grade", async () => {
      const screen = await lesson()

      screen.click(screen.one(`${CLOZE} .quiz-control`))

      assert.deepEqual(
        screen.all(`${CLOZE} .cloze-answer`).map((a) => screen.isOpen(a)),
        [true, true],
        "a sentence with two holes is one question, so both open together",
      )
      assert.deepEqual(
        screen.all(`${CLOZE} .cloze-blank`).map((b) => screen.isOpen(b)),
        [false, false],
      )
      assert.equal(screen.one(CLOZE).getAttribute("data-quiz-answered"), "revealed")
    })

    test("spends its control on that one reveal", async () => {
      const screen = await lesson()
      screen.click(screen.one(`${CLOZE} .quiz-control`))
      assert.deepEqual(screen.all(`${CLOZE} .quiz-control`), [])
    })
  })

  describe("a recall", () => {
    test("reveals on click, and only then offers the self-grade", async () => {
      const screen = await lesson()
      const reveal = screen.one(`${RECALL} .quiz-reveal`)

      assert.equal(screen.isOpen(reveal), false)
      assert.deepEqual(
        screen.all(`${RECALL} .quiz-control`).map((c) => c.textContent),
        ["Show answer"],
      )

      screen.click(screen.one(`${RECALL} .quiz-control`))

      assert.equal(screen.isOpen(reveal), true)
      assert.deepEqual(
        screen.all(`${RECALL} .quiz-control`).map((c) => c.getAttribute("data-quiz-grade")),
        ["got-it", "missed"],
      )
    })

    test("takes a self-grade that goes nowhere", async () => {
      const screen = await lesson()
      screen.click(screen.one(`${RECALL} .quiz-control`))

      const [gotIt, missed] = screen.all(`${RECALL} [data-quiz-grade]`)
      screen.click(missed)

      assert.equal(screen.one(RECALL).getAttribute("data-quiz-self-grade"), "missed")
      assert.equal(missed.getAttribute("aria-pressed"), "true")
      assert.equal(gotIt.getAttribute("aria-pressed"), "false")
      assert.deepEqual(screen.recorded, [], "a self-grade is the reader's, and is told to nobody")
    })
  })

  describe("what answering costs the reader", () => {
    test("scrolling straight past a block leaves the page exactly as it was", async () => {
      const screen = await lesson()
      const before = screen.html()

      screen.window.dispatchEvent(new screen.window.Event("scroll"))
      screen.window.dispatchEvent(new screen.window.Event("resize"))
      screen.click(screen.one("article p"))

      assert.equal(screen.html(), before, "an unanswered block is an unchanged block")
      assert.equal(screen.all("[data-quiz-answered]").length, 0, "no block answered itself")
      assert.deepEqual(
        screen
          .all(".quiz-explanation, .quiz-reveal, .cloze-answer")
          .filter((el) => screen.isOpen(el)),
        [],
        "nothing concealed opened on its own",
      )
    })

    test("answering every block writes nothing and asks nobody", async () => {
      const screen = await lesson()
      screen.click(screen.all(`${MCQ} .quiz-option`)[1])
      screen.click(screen.one(`${CLOZE} .quiz-control`))
      screen.click(screen.one(`${RECALL} .quiz-control`))
      screen.click(screen.one(`${RECALL} [data-quiz-grade]`))

      assert.deepEqual(screen.recorded, [])
    })

    test("and the shipped script names no way of doing so", async () => {
      // The tripwires catch a path a test walked; this catches one it did not. There is no
      // per-user state anywhere in Prepper, so the words simply do not appear.
      const site = await buildFixture("quiz-fence-types")
      const shipped = site.files.filter(
        (file) => file.endsWith(".js") && site.file(file).includes("prepper-quiz"),
      )
      assert.equal(shipped.length, 1, shipped.join(", "))
      const script = site.file(shipped[0])
      for (const forbidden of [
        "localStorage",
        "sessionStorage",
        "indexedDB",
        "document.cookie",
        "fetch(",
        "XMLHttpRequest",
        "sendBeacon",
        "WebSocket",
      ]) {
        assert.ok(!script.includes(forbidden), `the quiz script mentions ${forbidden}`)
      }
    })
  })
})

/** The text of each mcq option, in the order they stand on the page. */
function optionTexts(screen: Screen): string[] {
  return screen
    .all(`${MCQ} .quiz-option`)
    .map((o) => collapse(o.querySelector(".quiz-option-text")?.textContent))
}

/** Whether an option's explanation has been opened. */
function opened(screen: Screen, option: Element): boolean {
  const explanation = option.querySelector(".quiz-explanation")
  assert.ok(explanation, "an option with no explanation")
  return screen.isOpen(explanation)
}

function collapse(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}
