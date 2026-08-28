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
      const screen = await lesson()
      const [right, firstWrong, secondWrong] = screen.all(`${MCQ} .quiz-option`)

      screen.click(firstWrong)

      assert.deepEqual(
        screen.all(`${MCQ} .quiz-option`).map((o) => opened(screen, o)),
        [true, true, false],
        "the clicked option and the correct one open; the third stays shut",
      )
      assert.equal(
        collapse(firstWrong.querySelector(".quiz-explanation")?.textContent),
        "Nothing is scanned unless buckets collide. See collision-handling.",
      )
      assert.equal(
        collapse(right.querySelector(".quiz-explanation")?.textContent),
        "The key hashes straight to its bucket.",
      )
      assert.equal(secondWrong.getAttribute("data-quiz-revealed"), null)
    })

    test("a right click opens that option's explanation, and the key stays shut", async () => {
      const screen = await lesson()
      const [right] = screen.all(`${MCQ} .quiz-option`)

      screen.click(right)

      assert.equal(screen.one(MCQ).getAttribute("data-quiz-answered"), "correct")
      assert.deepEqual(
        screen.all(`${MCQ} .quiz-option`).map((o) => opened(screen, o)),
        [true, false, false],
      )
    })

    test("is answered once: a second click opens nothing further", async () => {
      const screen = await lesson()
      const quiz = screen.one(MCQ)
      const [right, wrong, other] = screen.all(`${MCQ} .quiz-option`)

      screen.click(wrong)
      const answered = quiz.outerHTML
      screen.click(other)
      screen.click(right)

      assert.equal(quiz.outerHTML, answered, "the block did not change on the later clicks")
    })

    test("answers from the keyboard too", async () => {
      const screen = await lesson()
      const [right] = screen.all(`${MCQ} .quiz-option`)

      screen.press(right, "Enter")

      assert.equal(screen.one(MCQ).getAttribute("data-quiz-answered"), "correct")
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

/** Whether an option's explanation has been opened. */
function opened(screen: Screen, option: Element): boolean {
  const explanation = option.querySelector(".quiz-explanation")
  assert.ok(explanation, "an option with no explanation")
  return screen.isOpen(explanation)
}

function collapse(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}
