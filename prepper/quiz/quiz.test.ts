/**
 * Quiz fences, through seam 1: Markdown in, markup out.
 *
 * Two fixtures, and the split between them is the same one the validation channel makes.
 * `quiz-fence-types` is a vault whose fences are all well-formed, and every assertion on
 * it is about what the reader gets. `quiz-fence-violations` is a vault whose fences are
 * wrong in every way there is, and its assertions are about what the dev is told -- plus
 * the one fact that ties the two halves together: a fence the build refuses to render is
 * still *there*, as the code block it was written as.
 *
 * Nothing here asserts on an mdast node or on plugin order. What a quiz block is, is a
 * claim about the emitted page: an element carrying its type and its ULID, options that
 * can be told apart from their explanations, and holes that can be told apart from the
 * prose around them.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import {
  buildFixture,
  validateFixture,
  type EmittedSite,
  type Page,
  type ValidationRun,
} from "../testing/build-fixture.ts"

describe("a well-formed quiz fence becomes an answerable block", () => {
  let site: EmittedSite
  let page: Page

  before(
    async () => {
      site = await buildFixture("quiz-fence-types")
      page = site.page("lessons/hash-map-lookup-cost")
    },
    { timeout: 120_000 },
  )

  test("the vault builds and reports nothing", () => {
    assert.equal(site.exitCode, 0, site.log)
  })

  test("every fence in the note became a quiz block, and no fence was left behind", () => {
    assert.deepEqual(
      page.selectAll(".quiz", page.body).map((q) => q.properties.dataQuizType),
      ["mcq", "cloze", "recall", "mcq"],
    )
    assert.equal(page.selectAll("pre code.language-quiz", page.body).length, 0)
  })

  test("a fence with no type word is an mcq, and carries the ULID it was written with", () => {
    const quiz = quizById(page, "01M0Z900000000000000000604")
    assert.equal(quiz.properties.dataQuizType, "mcq")
  })

  test("an mcq emits its prompt, its options, and an explanation under each", () => {
    const quiz = quizById(page, "01M0Z900000000000000000604")
    assert.equal(page.text(".quiz-prompt", quiz), "A hash map lookup, average case, costs what?")

    const options = page.selectAll(".quiz-option", quiz)
    assert.deepEqual(
      options.map((o) => page.text(".quiz-option-text", o)),
      ["Constant time, no scan", "Constant time, one scan", "Linear time, full scan"],
    )
    assert.deepEqual(
      options.map((o) => o.properties.dataQuizCorrect),
      ["true", "false", "false"],
    )
    assert.deepEqual(
      options.map((o) => page.text(".quiz-explanation", o)),
      [
        "The key hashes straight to its bucket.",
        "Nothing is scanned unless buckets collide. See collision-handling.",
        "That is an unsorted array, not a hash map.",
      ],
    )
  })

  test("the correct option is not given away by a ticked checkbox", () => {
    // The body is a GFM task list, and left alone it would render as one: three
    // checkboxes with the right answer already ticked, in a block whose whole point is
    // that the reader answers it first.
    const quiz = quizById(page, "01M0Z900000000000000000604")
    assert.equal(page.selectAll("input", quiz).length, 0)
    assert.equal(page.text(undefined, quiz).includes("[x]"), false)
  })

  test("a cloze emits a span per hole, and the prose around them reads unbroken", () => {
    const quiz = quizById(page, "01M0Z900000000000000000605")
    assert.deepEqual(
      page.selectAll(".cloze", quiz).map((span) => page.text(undefined, span)),
      ["memory", "O(n)"],
    )
    assert.equal(
      page.text(undefined, quiz),
      "A hash map trades memory for lookup speed, and degrades to O(n) when every key " +
        "lands in one bucket. A {{literal}} inside a code span is not a hole.",
    )
  })

  test("a recall emits its prompt and its reveal, told apart", () => {
    const quiz = quizById(page, "01M0Z900000000000000000606")
    assert.equal(
      page.text(".quiz-prompt", quiz),
      "Explain why an insert is O(1) amortised rather than O(1).",
    )
    assert.equal(
      page.text(".quiz-reveal", quiz),
      "Crossing the load factor triggers a resize that rehashes every entry, which is " +
        "O(n). It happens rarely enough that the cost spread over all inserts stays constant.",
    )
  })

  test("a `~~~~quiz` fence carries a body that has a fence of its own", () => {
    const quiz = quizById(page, "01M0Z900000000000000000607")
    assert.equal(quiz.properties.dataQuizType, "mcq")
    assert.equal(page.text("pre", quiz), 'System.out.println(map.get("k"));')
    assert.equal(page.selectAll(".quiz-option", quiz).length, 2)
  })

  test("a wikilink written inside a fence body is a real link", () => {
    const quiz = quizById(page, "01M0Z900000000000000000604")
    const [link] = page.links({ scope: quiz })
    assert.equal(link.href, "../terms/collision-handling")
    assert.equal(link.text, "collision-handling")
    assert.ok(link.classes.includes("internal"))
  })

  test("and it is an edge in the link graph, like any other body link", () => {
    // `collision-handling` is named nowhere else in the note, so this edge cannot have
    // arrived by another route.
    assert.ok(
      site.linkGraph.edges.some(
        (edge) =>
          edge.source === "lessons/hash-map-lookup-cost" &&
          edge.target === "terms/collision-handling" &&
          edge.type === "relates-to",
      ),
      JSON.stringify(site.linkGraph.edges, null, 2),
    )
  })
})

describe("a fence the build cannot make a quiz of", () => {
  let site: EmittedSite
  let run: ValidationRun

  before(
    async () => {
      ;[site, run] = await Promise.all([
        buildFixture("quiz-fence-violations"),
        validateFixture("quiz-fence-violations"),
      ])
    },
    { timeout: 240_000 },
  )

  test("does not take the build down, and stays the code block it was written as", () => {
    assert.equal(site.exitCode, 0, site.log)
    const page = site.page("lessons/nameless-fences")
    assert.equal(page.selectAll(".quiz", page.body).length, 0)
    assert.equal(page.selectAll("pre", page.body).length, 2)
    assert.ok(page.text("pre", page.body).includes("A hash map lookup, average case"))
  })

  test("is an error, so the gate is the only thing that stops on it", () => {
    assert.equal(run.exitCode, 1, run.output)
    assert.ok(quizViolations(run).every((v) => v.severity === "error"))
  })

  test("a missing or malformed infostring ULID is reported, one per fence", () => {
    assert.deepEqual(messages(run, "quiz-infostring", "lessons/nameless-fences.md"), [
      "quiz fence on line 10 has no ULID in its infostring: mint one with `npm run ulid`",
      "quiz fence on line 21 has `01m0z900000000000000000703` where a ULID goes: " +
        "mint one with `npm run ulid`",
    ])
  })

  test("an unknown type word is reported, and never guessed at from the body", () => {
    assert.deepEqual(messages(run, "quiz-infostring", "lessons/unknown-type-word.md"), [
      "quiz fence 01M0Z900000000000000000705 has an unknown type word `matching`: " +
        "the type is `cloze`, `recall`, or omitted for `mcq`",
    ])
  })

  test("an mcq without exactly one `[x]` is reported, both ways round", () => {
    assert.deepEqual(messages(run, "quiz-body", "lessons/mcq-answer-count.md"), [
      "quiz fence 01M0Z900000000000000000707 marks 2 options `[x]`: an mcq has exactly one",
      "quiz fence 01M0Z900000000000000000708 marks no option `[x]`: an mcq has exactly one",
    ])
  })

  test("a body that is not the shape its type needs is reported per type", () => {
    assert.deepEqual(messages(run, "quiz-body", "lessons/bodies-that-are-not-there.md"), [
      "quiz fence 01M0Z90000000000000000070A has no options: an mcq body is a prompt " +
        "and a task list",
      "quiz fence 01M0Z90000000000000000070B has no `{{holes}}`: a cloze body needs at least one",
      "quiz fence 01M0Z90000000000000000070C has no reveal: a recall body is a prompt " +
        "and a blockquote",
    ])
  })

  test("a quiz fence outside a Lesson is reported wherever it is written", () => {
    assert.deepEqual(messages(run, "quiz-placement", "problems/two-sum.md"), [
      "quiz fence 01M0Z90000000000000000070E is in a problem: quiz blocks are for " +
        "lessons only, because practice units never nest",
    ])
  })

  test("and a fence in a Problem is not rendered as a quiz either", () => {
    const page = site.page("problems/two-sum")
    assert.equal(page.selectAll(".quiz", page.body).length, 0)
    assert.equal(page.selectAll("pre", page.body).length, 1)
  })
})

/** The one quiz block in the page carrying this ULID. */
function quizById(page: Page, ulid: string) {
  return page.require(`.quiz[data-quiz-id="${ulid}"]`, page.body)
}

function quizViolations(run: ValidationRun) {
  return run.violations.filter((v) => v.rule.startsWith("quiz-"))
}

/** Every message one rule raised about one note, in the order the report sorts them. */
function messages(run: ValidationRun, rule: string, note: string): string[] {
  return run.violations
    .filter((v) => v.rule === rule && v.note === note)
    .map((v) => v.message)
    .sort()
}
