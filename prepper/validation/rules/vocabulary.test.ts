/**
 * The vocabulary and graph rules, through seam 1.
 *
 * One fixture, `vocabulary-and-graph-violations`: a vault whose every note is wrong in
 * exactly one of the ways these rules exist to catch, plus the two notes that are right
 * and have to stay quiet. The rule module is never called directly -- a hand-built vault
 * would drift from what Quartz hands an emitter, which is what the whole spine is
 * arranged against.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import {
  buildFixture,
  validateFixture,
  type EmittedSite,
  type ValidationRun,
} from "../../testing/build-fixture.ts"

describe("the vocabulary, graph and boundary rules", () => {
  let run: ValidationRun

  before(
    async () => {
      run = await validateFixture("vocabulary-and-graph-violations")
    },
    { timeout: 300_000 },
  )

  /** Every message this rule raised, under the note it is about. */
  function raised(rule: string): string[] {
    return run.violations
      .filter((v) => v.rule === rule)
      .map((v) => `${v.severity} ${v.note ?? "vault"}: ${v.message}`)
      .sort()
  }

  test("one run collects every violation in the vault", () => {
    // The same collect-all property the spine has: every defect across every note and
    // the vault itself, from one build.
    assert.deepEqual(run.violations.map((v) => `${v.note ?? "vault"}: ${v.rule}`).sort(), [
      "cheat-sheets/heaps-cheat-sheet.md: cheat-sheet-topic",
      "lessons/embeds-workshop.md: workshop-embed",
      "lessons/links-to-workshop.md: workshop-link",
      "lessons/prerequisite-is-workshop.md: prerequisite-target",
      "lessons/prerequisite-missing.md: prerequisite-target",
      "lessons/topic-does-not-exist.md: topic-vocabulary",
      "lessons/topic-is-not-a-term.md: topic-vocabulary",
      "problems/practises-workshop.md: practices-target",
      "terms/complexity.md: topic-without-cheat-sheet",
      "vault: cheat-sheet-topic",
      "vault: prerequisite-cycle",
      "vault: prerequisite-cycle",
    ])
    assert.equal(run.exitCode, 1, run.output)
  })

  test("a `topic` naming a note nobody has written is an error, not an unwritten link", () => {
    // The line this rule exists to draw. A body wikilink to a missing note is intent and
    // warns; a `topic` naming one is a note filed under something that does not exist,
    // which the topic index would lose silently.
    assert.deepEqual(raised("topic-vocabulary"), [
      "error lessons/topic-does-not-exist.md: `topic` names `ordered-maps`, and no note in the vault answers to that name: a topic is a term you have written",
      "error lessons/topic-is-not-a-term.md: `topic` names `topic-does-not-exist`, which is a lesson: a topic is a term",
    ])
  })

  test("a `prerequisites` target must exist and must be Library content", () => {
    // Two halves of one rule, and the second is the interesting one: the research note
    // exists, so nothing about resolution catches it. The reader simply cannot reach it.
    assert.deepEqual(raised("prerequisite-target"), [
      "error lessons/prerequisite-is-workshop.md: `prerequisites` names `why-hash-maps-were-chosen`, which is a research note: a prerequisite is Library content, and the reader never sees this",
      "error lessons/prerequisite-missing.md: `prerequisites` names `never-written`, and no note in the vault answers to that name: a prerequisite is something the reader can go and read",
    ])
  })

  test("an unwritten `practices` target passes, and a Workshop one does not", () => {
    // The deliberate exception, and the exact edge of it. `unwritten-practice` names a
    // Lesson nobody has written and is not reported at all, because intent is allowed;
    // `practises-workshop` names a note that exists and the reader never sees, which is
    // not intent but a mistake.
    assert.deepEqual(raised("practices-target"), [
      "error problems/practises-workshop.md: `practices` names `why-hash-maps-were-chosen`, which is a research note: an unwritten target is allowed here, but a note the reader never sees is not",
    ])
    assert.ok(
      !run.violations.some((v) => v.note === "problems/unwritten-practice.md"),
      "an unwritten `practices` target was reported",
    )
  })

  test("a cycle is named in full, self-reference included", () => {
    // The whole reason the rule is worth having: `a -> b -> a` is findable and "there is
    // a cycle somewhere" is a hunt through every `prerequisites` field in the vault.
    assert.deepEqual(raised("prerequisite-cycle"), [
      "error vault: `lessons/reads-itself.md` lists itself as a prerequisite",
      "error vault: prerequisite cycle: lessons/loop-a.md -> lessons/loop-b.md -> lessons/loop-a.md",
    ])
  })

  test("a loop is reported once, not once per note in it", () => {
    // `loop-a` and `loop-b` are each reachable from the other, so a walk that did not
    // recognise the same loop entered at a different point would report it twice.
    assert.equal(raised("prerequisite-cycle").filter((m) => m.includes("loop-")).length, 1)
  })

  test("a cheat sheet claims one topic, and a topic has one cheat sheet", () => {
    // Two halves of the same idea. The contested-topic violation is the vault's rather
    // than either sheet's: neither is more wrong than the other, and blaming whichever
    // sorted first would send the dev to edit the wrong file.
    assert.deepEqual(raised("cheat-sheet-topic"), [
      "error cheat-sheets/heaps-cheat-sheet.md: `topic` is a list: a cheat sheet claims exactly one topic, so its `topic` is a single value",
      "error vault: 2 cheat sheets claim the topic `hash-maps`: cheat-sheets/hash-maps-cheat-sheet.md, cheat-sheets/hash-maps-quick-reference.md. A topic has one cheat sheet",
    ])
  })

  test("a topic taught more than once and never summarised is a warning", () => {
    // A fact about how far the writing has got, not a defect in it -- so it never fails
    // a build. `hash-maps` is taught three times and *is* summarised, so it is quiet;
    // `heaps` has a cheat sheet and no Lessons, which is not a shape worth mentioning.
    assert.deepEqual(raised("topic-without-cheat-sheet"), [
      "warning terms/complexity.md: 3 lessons are about this topic and nothing summarises it: it has no cheat sheet",
    ])
  })
  test("a Library note linking a Workshop note warns, and does not read as unwritten", () => {
    // The distinction the boundary exists to draw. `research/why-hash-maps-were-chosen` is
    // written; being told to go and write it would be the one useless thing to say, so
    // the message names reachability and the unwritten-link rule stays silent about it.
    assert.deepEqual(raised("workshop-link"), [
      "warning lessons/links-to-workshop.md: link to `research/why-hash-maps-were-chosen`, which is in the vault and not in the app: the reader cannot follow it",
    ])
    assert.deepEqual(
      raised("unwritten-link").filter((m) => m.includes("why-hash-maps-were-chosen")),
      [],
    )
  })

  test("a Library note embedding a Workshop note is an error, not a warning", () => {
    // Same crossing, other severity: a link over there can be deliberate, and an embed
    // promises the reader prose that the build will never put on the page.
    assert.deepEqual(raised("workshop-embed"), [
      "error lessons/embeds-workshop.md: embed of `research/why-hash-maps-were-chosen`, which is in the vault and not in the app: nothing would be shown here",
    ])
  })
})

describe("the Workshop boundary, in the page", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("vocabulary-and-graph-violations")
    },
    { timeout: 300_000 },
  )

  test("a Workshop note gets no page, and is out of the corpus", () => {
    // Out of the corpus and not merely pageless: a note still in it would be spliced
    // into the embed below, page or no page.
    assert.ok(site.hasPage("lessons/links-to-workshop"))
    assert.ok(!site.hasPage("research/why-hash-maps-were-chosen"))
    assert.ok(!("research/why-hash-maps-were-chosen" in site.contentIndex))
  })

  test("a link to a Workshop note is the marked, unclickable affordance", () => {
    const page = site.page("lessons/links-to-workshop")
    const marked = page
      .selectAll("span")
      .find((el) => el.properties.dataWorkshopLink === "research/why-hash-maps-were-chosen")
    assert.ok(marked, "the crossing link is still a live anchor")
  })

  test("an embed of a Workshop note is degraded to that same affordance", () => {
    // Not an empty quoted box. The blockquote Quartz emits for an embed is replaced
    // whole, because leaving it would promise the reader content and then show none.
    const page = site.page("lessons/embeds-workshop")
    const marked = page
      .selectAll("span")
      .find((el) => el.properties.dataWorkshopEmbed === "research/why-hash-maps-were-chosen")
    assert.ok(marked, "the crossing embed is still a transclusion")
    assert.equal(page.selectAll("blockquote.transclude").length, 0)
  })

  test("no Workshop prose reaches the site at all", () => {
    for (const file of site.files.filter((f) => f.endsWith(".html") || f.endsWith(".json"))) {
      assert.ok(
        !site.file(file).includes("pineapplecanary"),
        `${file} carries the body of a note the reader never sees`,
      )
    }
  })
})
