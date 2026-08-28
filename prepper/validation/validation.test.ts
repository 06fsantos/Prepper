/**
 * The validation spine, through seam 1 and nothing else.
 *
 * Both consumers are asserted here over the same fixture vault: the CLI through
 * `validateFixture`, the emitter through the build log of `buildFixture`. The rule module
 * itself is never called directly -- a hand-built input would drift from what Quartz
 * actually hands an emitter, which is the exact class of bug the "the CLI invokes
 * Quartz's own pipeline" decision exists to prevent.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import {
  buildFixture,
  validateFixture,
  type EmittedSite,
  type ValidationRun,
} from "../testing/build-fixture.ts"
import { exitCodeFor, type Violation } from "./violation.ts"

/** `note: rule` for every violation, sorted, which is the whole report at a glance. */
function report(violations: readonly Violation[]): string[] {
  return violations.map((v) => `${v.note ?? "vault"}: ${v.rule}`).sort()
}

function messagesFor(run: ValidationRun, note: string | undefined, rule: string): string[] {
  return run.violations.filter((v) => v.note === note && v.rule === rule).map((v) => v.message)
}

describe("the validation spine", () => {
  let broken: ValidationRun
  let clean: ValidationRun
  let warned: ValidationRun

  before(
    async () => {
      broken = await validateFixture("schema-and-identity-violations")
      clean = await validateFixture("minimal-vault")
      // A vault that is wrong in no way at all, and merely has writing left to do: its
      // cluster is `prepper/links`, and it is here for the warning half of the severity
      // contract.
      warned = await validateFixture("unwritten-link")
    },
    { timeout: 300_000 },
  )

  describe("`npm run validate` -- the CLI consumer", () => {
    test("one run collects every violation in the vault", () => {
      // Fourteen defects across seven notes and the vault itself, from one build. This
      // is the property the whole design is for: renaming one Term must not mean one
      // build run per note that referenced it.
      assert.deepEqual(report(broken.violations), [
        "lessons/draft-in-progress.md: frontmatter-required-fields",
        "lessons/draft-in-progress.md: record-identity",
        "lessons/hand-typed-id.md: record-identity",
        "lessons/no-id.md: record-identity",
        "lessons/no-topic.md: authored-tags",
        "lessons/no-topic.md: frontmatter-required-fields",
        "problems/half-declared.md: frontmatter-required-fields",
        "problems/half-declared.md: frontmatter-required-fields",
        "problems/half-declared.md: frontmatter-required-fields",
        "records/0001-loose-record.md: frontmatter-required-fields",
        "terms/untitled.md: frontmatter-required-fields",
        "vault: filename-collision",
        "vault: ulid-namespace",
        "vault: ulid-namespace",
      ])
    })

    test("it exits non-zero when any violation is an error", () => {
      assert.equal(broken.exitCode, 1, broken.output)
    })

    test("it prints every violation, under the note it is about", () => {
      for (const note of new Set(broken.violations.map((v) => v.note ?? "vault"))) {
        assert.ok(broken.output.includes(note), `"${note}" is missing from:\n${broken.output}`)
      }
      assert.match(broken.output, /14 errors, 0 warnings in 12 notes/)
    })

    test("a clean vault exits zero and says so", () => {
      assert.equal(clean.exitCode, 0, clean.output)
      assert.deepEqual(clean.violations, [])
      assert.match(clean.output, /No violations\. 2 notes checked\./)
    })

    test("it checks the notes Quartz parsed, not the pages Quartz invented", () => {
      // Quartz synthesises a folder index page per directory; those are not notes and
      // would each report a missing `id` if the snapshot could not tell them apart.
      assert.equal(clean.notes, 2)
      assert.equal(broken.notes, 12)
    })
  })

  describe("the emitter consumer -- the same rules, live under `quartz build --serve`", () => {
    let site: EmittedSite

    before(
      async () => {
        site = await buildFixture("schema-and-identity-violations")
      },
      { timeout: 300_000 },
    )

    test("violations surface in the build's own output", () => {
      assert.match(site.log, /\[prepper\] validation: 14 errors, 0 warnings in 12 notes/)
      for (const violation of broken.violations) {
        assert.ok(
          site.log.includes(violation.message),
          `the build never said: ${violation.message}`,
        )
      }
    })

    test("a broken vault does not stop the build, so the dev server survives it", () => {
      assert.equal(site.exitCode, 0, site.log)
      assert.ok(site.hasPage("lessons/no-topic"), "the site was still emitted")
    })

    test("validation emits no files of its own", () => {
      assert.deepEqual(
        site.files.filter((f) => f.includes("violation")),
        [],
      )
    })
  })

  describe("severities", () => {
    test("every violation carries one of exactly two severities", () => {
      for (const violation of [...broken.violations, ...warned.violations]) {
        assert.ok(
          violation.severity === "error" || violation.severity === "warning",
          `unknown severity "${violation.severity}"`,
        )
      }
    })

    test("a vault whose violations are all warnings exits zero and says so", () => {
      // The other half of the contract from `broken`, which exits 1: a warning marks
      // intent, and intent never fails a build. There is no third bucket and no
      // promotion path, so these two runs are the whole of what a severity can do.
      assert.equal(warned.exitCode, 0, warned.output)
      assert.ok(warned.violations.length > 0, "nothing warned, so nothing was proven")
      assert.deepEqual(new Set(warned.violations.map((v) => v.severity)), new Set(["warning"]))
      assert.match(warned.output, /0 errors, 2 warnings in 2 notes/)
    })

    test("a warning never masks an error in the same run", () => {
      // The case neither single-severity run can state: `broken` is all errors and
      // `warned` is all warnings, so without this a regression that let any warning
      // decide the exit code would go green on the only hard gate the project has.
      // Real violations from both runs, so nothing here is hand-built.
      assert.equal(exitCodeFor([...warned.violations, ...broken.violations]), 1)
      assert.equal(exitCodeFor(warned.violations), 0)
      assert.equal(exitCodeFor(broken.violations), 1)
    })
  })

  describe("schema rules", () => {
    test("a note missing a frontmatter field its type requires is an error", () => {
      assert.deepEqual(messagesFor(broken, "lessons/no-topic.md", "frontmatter-required-fields"), [
        "no frontmatter `topic`: a lesson requires it",
      ])
      // A record is Workshop, so `prepper/workshop` filtered it out of the corpus before
      // this emitter ran -- and it is still reported. That is the half of the boundary
      // that is easy to lose: a filter drops a note before any emitter sees it, so a
      // Workshop note could quietly stop being validated by having become invisible.
      // Ticket 06 reconciled the two rather than trading them off; this is the assertion
      // that would fail if the reconciliation were undone. See `prepper/workshop`.
      assert.deepEqual(
        messagesFor(broken, "records/0001-loose-record.md", "frontmatter-required-fields"),
        ["no frontmatter `date`: a record requires it"],
      )
    })

    test("every field a type requires is reported, not the first one missing", () => {
      assert.deepEqual(
        messagesFor(broken, "problems/half-declared.md", "frontmatter-required-fields").sort(),
        [
          "no frontmatter `difficulty`: a problem requires it",
          "no frontmatter `kind`: a problem requires it",
          "no frontmatter `practices`: a problem requires it",
        ],
      )
    })

    test("a note that declares no title is an error, though Quartz supplies one", () => {
      assert.deepEqual(messagesFor(broken, "terms/untitled.md", "frontmatter-required-fields"), [
        "no frontmatter `title`: every note declares one",
      ])
    })
  })

  describe("identity rules", () => {
    test("a missing ULID `id` is an error", () => {
      assert.deepEqual(messagesFor(broken, "lessons/no-id.md", "record-identity"), [
        "no frontmatter `id`: record identity is minted with `npm run ulid`",
      ])
    })

    test("a malformed ULID `id` is an error naming what it found", () => {
      assert.deepEqual(messagesFor(broken, "lessons/hand-typed-id.md", "record-identity"), [
        'frontmatter `id` is not a ULID: "lesson-3". Mint one with `npm run ulid`',
      ])
    })

    test("the same ULID on two notes is an error naming both", () => {
      const [message] = messagesFor(broken, undefined, "ulid-namespace").filter((m) =>
        m.includes("01M0Z900000000000000000014"),
      )
      assert.match(message, /lessons\/no-topic\.md \(frontmatter `id`\)/)
      assert.match(message, /references\/copied-frontmatter\.md \(frontmatter `id`\)/)
    })

    test("a note `id` and a quiz block's are one namespace", () => {
      const [message] = messagesFor(broken, undefined, "ulid-namespace").filter((m) =>
        m.includes("01M0Z900000000000000000010"),
      )
      assert.match(message, /lessons\/copied-quiz-block\.md \(a quiz block\)/)
      assert.match(message, /terms\/graphs\.md \(frontmatter `id`\)/)
    })

    test("filename stems colliding case-insensitively are an error, attachments included", () => {
      assert.deepEqual(messagesFor(broken, undefined, "filename-collision"), [
        "2 files share the filename stem `graphs`, and a wikilink resolves case-insensitively: " +
          "attachments/Graphs.png, terms/graphs.md",
      ])
    })
  })

  test("`draft: true` softens nothing", () => {
    assert.deepEqual(
      broken.violations
        .filter((v) => v.note === "lessons/draft-in-progress.md")
        .map((v) => v.severity),
      ["error", "error"],
    )
    assert.deepEqual(report(broken.violations.filter((v) => v.note?.includes("draft"))), [
      "lessons/draft-in-progress.md: frontmatter-required-fields",
      "lessons/draft-in-progress.md: record-identity",
    ])
  })
})
