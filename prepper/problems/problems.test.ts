/**
 * Problems, through seam 1: Markdown in, a page the dev can attempt out.
 *
 * Two fixtures, split the way the validation channel splits. `problem-sections` is a vault
 * of well-formed Problems, and every assertion on it is about what the reader gets --
 * where the body folded, what is sealed, what is open, and where the chips point.
 * `problem-body-violations` is a vault of Problems the contract cannot be satisfied by,
 * and its assertions are about what the dev is told, plus the fact that ties the halves
 * together: a Problem missing a section still renders the sections it has.
 *
 * The load-bearing assertion in here is the one about the seal. It is written against the
 * emitted HTML rather than against a browser, because the whole claim is that the emitted
 * HTML is already sealed: Quartz's search preview fetches a result's real markup and
 * injects its elements, and a seal that needed a script to have run would render open
 * there and leak the solution to anyone typing in the search box.
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

describe("a Problem's body folds on its H2 boundaries", () => {
  let site: EmittedSite
  let page: Page

  before(
    async () => {
      site = await buildFixture("problem-sections")
      page = site.page("problems/two-sum")
    },
    { timeout: 120_000 },
  )

  test("the vault builds and reports nothing", () => {
    assert.equal(site.exitCode, 0, site.log)
  })

  test("every H2 becomes a section of its own, named by the heading it was written under", () => {
    assert.deepEqual(
      sections(page).map((section) => section.properties.dataSection),
      ["prompt", "constraints", "hints", "solution", "complexity", "follow-ups"],
    )
    assert.deepEqual(
      sections(page).map((section) => page.text("h2", section)),
      ["Prompt", "Constraints", "Hints", "Solution", "Complexity", "Follow-ups"],
    )
  })

  test("a section holds the prose written under its heading, and none of the next one's", () => {
    assert.equal(
      page.text(undefined, section(page, "prompt")),
      "Prompt Given an array and a target, return the indices of the two entries that sum to it.",
    )
    assert.equal(
      page.text(undefined, section(page, "complexity")),
      "Complexity O(n) time, O(n) space.",
    )
  })

  test("an H2 the contract has no name for is a section too, and is left open", () => {
    const other = site.page("problems/median-of-two-sorted-arrays")
    assert.deepEqual(
      sections(other).map((s) => s.properties.dataSection),
      ["prompt", "solution", "complexity", "variants"],
    )
    assert.equal(other.selectAll("details", section(other, "variants")).length, 0)
  })
})

describe("`## Solution` and `## Complexity` are sealed", () => {
  let site: EmittedSite
  let page: Page

  before(
    async () => {
      site = await buildFixture("problem-sections")
      page = site.page("problems/two-sum")
    },
    { timeout: 120_000 },
  )

  test("each is a closed disclosure in the emitted markup, with no script in the way", () => {
    // The seal is the HTML element's own default state. Nothing has to run for it to
    // hold: not a script, and not a stylesheet either -- which is why this asserts on
    // the file as written to disk rather than on anything a browser did to it.
    for (const name of ["solution", "complexity"]) {
      const seal = page.require("details.problem-seal", section(page, name))
      assert.equal(seal.properties.open, undefined, `${name} was emitted already open`)
    }
    assert.equal(/<details[^>]*\sopen[\s>]/.test(page.html), false, page.html)
  })

  test("the two are independent, so opening one does not close the other", () => {
    // `name` on a `<details>` is what makes a group of them exclusive. Neither carries
    // one, and there are two elements rather than one wrapping both.
    const seals = page.selectAll("details.problem-seal", page.body)
    assert.equal(seals.length, 2)
    assert.deepEqual(
      seals.map((seal) => seal.properties.name),
      [undefined, undefined],
    )
  })

  test("what is sealed is the section's prose, and its heading is what opens it", () => {
    const seal = page.require("details.problem-seal", section(page, "solution"))
    assert.equal(page.text("summary h2", seal), "Solution")
    assert.ok(page.text(undefined, seal).includes("Store after the lookup"))
  })

  test("nothing else on the page is sealed", () => {
    for (const name of ["prompt", "constraints", "hints", "follow-ups"]) {
      assert.equal(page.selectAll("details", section(page, name)).length, 0, name)
    }
    assert.equal(
      page.text(undefined, section(page, "follow-ups")),
      "Follow-ups What changes if the array is sorted?",
    )
  })

  test("a wikilink written inside a sealed section is a real link and a real edge", () => {
    // `hash-maps` is named nowhere else in the note, so this edge cannot have arrived by
    // another route -- and folding the body must not have taken it out of the tree that
    // resolves links.
    const [link] = page.links({ scope: section(page, "solution") })
    assert.equal(link.href, "../terms/hash-maps")
    assert.equal(link.text, "hash map")
    assert.ok(
      site.linkGraph.edges.some(
        (edge) =>
          edge.source === "problems/two-sum" &&
          edge.target === "terms/hash-maps" &&
          edge.type === "relates-to",
      ),
      JSON.stringify(site.linkGraph.edges, null, 2),
    )
  })

  test("sealing is a rendering rule alone: the solution is still in the search index", () => {
    assert.ok(site.notes["problems/two-sum"].content.includes("Store after the lookup"))
  })
})

describe("`## Hints` is an ordered ladder", () => {
  let page: Page

  before(
    async () => {
      page = (await buildFixture("problem-sections")).page("problems/two-sum")
    },
    { timeout: 120_000 },
  )

  test("one rung per top-level list item, numbered in the order they were written", () => {
    const hints = page.selectAll(".problem-hint", section(page, "hints"))
    assert.deepEqual(
      hints.map((hint) => hint.properties.dataHint),
      ["1", "2", "3"],
    )
    assert.deepEqual(
      hints.map((hint) => page.text(undefined, hint)),
      [
        "The brute force is a nested loop. What is the inner loop actually asking?",
        "It is asking whether the complement has been seen already. Membership, not ordering.",
        "Store each value against the index you saw it at.",
      ],
    )
  })

  test("and the build ships it open, inside the element that takes it away again", () => {
    // The hiding is `hints.js`'s, and it can be, because a script that never arrives
    // leaves every hint on screen -- which is what the vault says and what Obsidian
    // shows. The seal is the other way round and is why it is not a script. The click
    // itself is seam 2's: `prepper/problems/browser.test.ts`.
    assert.equal(page.selectAll("details", section(page, "hints")).length, 0)
    assert.equal(page.selectAll(".problem-hint[hidden]", section(page, "hints")).length, 0)
    const ladder = page.require("prepper-hint-ladder", section(page, "hints"))
    assert.equal(page.selectAll(".problem-hint", ladder).length, 3)
  })
})

describe("a pointer Problem's `source` list", () => {
  let site: EmittedSite
  let page: Page

  before(
    async () => {
      site = await buildFixture("problem-sections")
      page = site.page("problems/two-sum")
    },
    { timeout: 120_000 },
  )

  test("renders one chip per URL, labelled by host and nothing else", () => {
    assert.deepEqual(
      page.selectAll(".problem-source", page.body).map((chip) => page.text(".problem-host", chip)),
      ["leetcode.com", "neetcode.io"],
    )
    assert.deepEqual(
      page.links({ scope: page.require(".problem-sources", page.body) }).map((link) => link.href),
      [
        "https://leetcode.com/problems/two-sum/",
        "https://www.neetcode.io/problems/two-integer-sum",
      ],
    )
  })

  test("and presents the first as the attempt link", () => {
    const chips = page.selectAll(".problem-source", page.body)
    assert.deepEqual(
      chips.map((chip) => chip.properties.dataAttempt),
      ["true", undefined],
    )
    assert.equal(page.text(".problem-role", chips[0]), "Attempt")
  })

  test("a Problem with no `source` gets no chips at all", () => {
    const other = site.page("problems/design-a-url-shortener")
    assert.equal(other.selectAll(".problem-sources", other.body).length, 0)
  })
})

describe("`kind` and `difficulty`", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("problem-sections")
    },
    { timeout: 120_000 },
  )

  test("are shown as the dev declared them, with the difficulty tied to its kind", () => {
    const page = site.page("problems/tell-me-about-a-conflict")
    assert.equal(page.text(".problem-kind", page.body), "behavioural")
    const difficulty = page.require(".problem-difficulty", page.body)
    assert.equal(page.text(undefined, difficulty), "medium")
    assert.equal(difficulty.properties.dataKind, "behavioural")
  })

  test("a mixed-kind list is never ordered by difficulty across kinds", () => {
    // Four Problems, three kinds, difficulties easy through hard. The topic index lists
    // them by title, which is neither of the two orders a difficulty scale would give --
    // so nothing here has compared a hard behavioural question to a hard graph problem.
    const term = site.page("terms/interviewing")
    const listed = term
      .selectAll(".prepper-topic-group[data-note-type='problem'] .prepper-group-list > li")
      .map((li) => term.text(undefined, li))

    assert.deepEqual(listed, [
      "Design a URL shortener",
      "Median of two sorted arrays",
      "Tell me about a conflict",
      "Two sum",
    ])
    assert.notDeepEqual(listed, [
      "Two sum",
      "Tell me about a conflict",
      "Design a URL shortener",
      "Median of two sorted arrays",
    ])
  })
})

describe("a Problem the contract is not satisfied by", () => {
  let site: EmittedSite
  let run: ValidationRun

  before(
    async () => {
      ;[site, run] = await Promise.all([
        buildFixture("problem-body-violations"),
        validateFixture("problem-body-violations"),
      ])
    },
    { timeout: 240_000 },
  )

  test("does not take the build down, and renders the sections it does have", () => {
    assert.equal(site.exitCode, 0, site.log)
    const page = site.page("problems/half-a-coding-problem")
    assert.deepEqual(
      sections(page).map((s) => s.properties.dataSection),
      ["prompt"],
    )
    assert.equal(page.selectAll("details", page.body).length, 0)
  })

  test("is an error, so the gate is the only thing that stops on it", () => {
    assert.equal(run.exitCode, 1, run.output)
    assert.ok(problemViolations(run).every((v) => v.severity === "error"))
  })

  test("a required H2 missing for the declared kind is reported, one per section", () => {
    assert.deepEqual(messages(run, "problem-section", "problems/half-a-coding-problem.md"), [
      "no `## Complexity`: a coding problem is written under `## Prompt`, `## Solution` " +
        "and `## Complexity`",
      "no `## Solution`: a coding problem is written under `## Prompt`, `## Solution` " +
        "and `## Complexity`",
    ])
  })

  test("a kind nothing answers to is reported, and its sections are not guessed at", () => {
    assert.deepEqual(messages(run, "problem-kind", "problems/an-unknown-kind.md"), [
      "`kind: puzzle` is not a kind: the three are `coding`, `system-design` and " +
        "`behavioural`, and a kind is declared rather than inferred",
    ])
    assert.deepEqual(messages(run, "problem-section", "problems/an-unknown-kind.md"), [])
  })

  test("a difficulty nothing answers to is reported", () => {
    assert.deepEqual(messages(run, "problem-difficulty", "problems/an-unknown-difficulty.md"), [
      "`difficulty: spicy` is not a difficulty: the three are `easy`, `medium` and `hard`",
    ])
  })

  test("a `source` list with no well-formed URL is reported, and renders no chip", () => {
    assert.deepEqual(messages(run, "problem-source", "problems/a-source-nobody-can-follow.md"), [
      "`source` holds no well-formed URL: the first one is the attempt link, and a " +
        "problem the reader cannot reach is not one",
    ])
    const page = site.page("problems/a-source-nobody-can-follow")
    assert.equal(page.selectAll(".problem-sources", page.body).length, 0)
  })

  test("and a Problem whose kind and sections agree is not reported at all", () => {
    assert.deepEqual(messages(run, "problem-section", "problems/an-unknown-difficulty.md"), [])
    assert.deepEqual(messages(run, "problem-section", "problems/a-source-nobody-can-follow.md"), [])
  })
})

/** Every folded section of a Problem's body, in the order the reader meets them. */
function sections(page: Page) {
  return page.selectAll(".problem-section", page.body)
}

/** The one section written under a given heading. */
function section(page: Page, name: string) {
  return page.require(`.problem-section[data-section="${name}"]`, page.body)
}

function problemViolations(run: ValidationRun) {
  return run.violations.filter((v) => v.rule.startsWith("problem-"))
}

/** Every message one rule raised about one note, in the order the report sorts them. */
function messages(run: ValidationRun, rule: string, note: string): string[] {
  return run.violations
    .filter((v) => v.rule === rule && v.note === note)
    .map((v) => v.message)
    .sort()
}
