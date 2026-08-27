/**
 * Vocabulary rules: what a note's link fields are allowed to name.
 *
 * `topic`, `prerequisites` and `practices` are links written in frontmatter, and unlike a
 * body wikilink they are checked rather than merely resolved. A body link to a note nobody
 * has written is authoring practice -- it marks intent, and the reading surface doubles as
 * a todo list. A `topic` naming a note nobody has written is a note filed under something
 * that does not exist, which is a different thing entirely: the topic index would lose it
 * silently, and nothing would ever say so.
 *
 * So `topic` is a **controlled vocabulary**. Every value names an existing note, and that
 * note is a `term`. Tag drift is impossible by construction rather than by discipline:
 * there is no way to invent a topic except by writing the Term.
 *
 * `practices` is the deliberate exception, and it is worth being precise about what it is
 * an exception to. An unwritten target passes, because "this Problem drills a Lesson I
 * have not written yet" is exactly the intent the vault is meant to be able to hold. A
 * target that *exists but is not Library content* still errs, because that is not intent,
 * it is a mistake -- a Problem cannot drill a research note.
 *
 * Every rule here resolves a target through `prepper/link-targets.ts`, the same module the
 * link graph resolves through. A rule that resolved a target its own way could eventually
 * pass a vault whose rails point at nothing.
 */
import type { Finding, Rule } from "../rules.ts"
import type { Note, Vault } from "../vault.ts"
import { isLibrary, type NoteType } from "../../note-type.ts"
import { stemOf, targets, type Target } from "../../link-targets.ts"

/** How a type reads mid-sentence: `a lesson`, `a research note`. */
const article: Record<NoteType, string> = {
  lesson: "a lesson",
  reference: "a reference",
  problem: "a problem",
  term: "a term",
  "cheat-sheet": "a cheat sheet",
  research: "a research note",
  record: "a record",
  mission: "the mission",
}

/** Every note by the stem a frontmatter target would name it with. */
function byStem(vault: Vault): Map<string, Note> {
  const index = new Map<string, Note>()
  for (const note of vault.notes) index.set(stemOf(note.path), note)
  return index
}

/** How a note is described when it is the wrong kind of thing to have been named. */
function describe(note: Note): string {
  return note.type ? article[note.type] : "not a note the layout names a type for"
}

/**
 * Every target one field of one note names, paired with the note it resolves to.
 *
 * `undefined` where nothing answers to the name -- which the three rules below each have
 * their own answer to, and that difference is the whole of what separates them.
 */
function resolved(index: Map<string, Note>, note: Note, field: string): [Target, Note | undefined][] {
  return targets(note.frontmatter[field]).map((target) => [target, index.get(target.stem)])
}

const topicVocabulary: Rule = {
  name: "topic-vocabulary",
  check(vault: Vault): Finding[] {
    const index = byStem(vault)
    const findings: Finding[] = []

    for (const note of vault.notes) {
      for (const [target, found] of resolved(index, note, "topic")) {
        if (!found) {
          findings.push({
            severity: "error",
            note: note.path,
            message: `\`topic\` names \`${target.written}\`, and no note in the vault answers to that name: a topic is a term you have written`,
          })
        } else if (found.type !== "term") {
          findings.push({
            severity: "error",
            note: note.path,
            message: `\`topic\` names \`${target.written}\`, which is ${describe(found)}: a topic is a term`,
          })
        }
      }
    }

    return findings
  },
}

const prerequisiteTargets: Rule = {
  name: "prerequisite-target",
  check(vault: Vault): Finding[] {
    const index = byStem(vault)
    const findings: Finding[] = []

    for (const note of vault.notes) {
      for (const [target, found] of resolved(index, note, "prerequisites")) {
        if (!found) {
          findings.push({
            severity: "error",
            note: note.path,
            message: `\`prerequisites\` names \`${target.written}\`, and no note in the vault answers to that name: a prerequisite is something the reader can go and read`,
          })
        } else if (!isLibrary(found.type)) {
          findings.push({
            severity: "error",
            note: note.path,
            message: `\`prerequisites\` names \`${target.written}\`, which is ${describe(found)}: a prerequisite is Library content, and the reader never sees this`,
          })
        }
      }
    }

    return findings
  },
}

const practicesTargets: Rule = {
  name: "practices-target",
  check(vault: Vault): Finding[] {
    const index = byStem(vault)
    const findings: Finding[] = []

    for (const note of vault.notes) {
      for (const [target, found] of resolved(index, note, "practices")) {
        // The exception, stated as code: nothing at all is said about a target nobody has
        // written. It is a Lesson this Problem is waiting on, and the rail already renders
        // it as the gap it is.
        if (!found || isLibrary(found.type)) continue
        findings.push({
          severity: "error",
          note: note.path,
          message: `\`practices\` names \`${target.written}\`, which is ${describe(found)}: an unwritten target is allowed here, but a note the reader never sees is not`,
        })
      }
    }

    return findings
  },
}

/**
 * A cheat sheet claims **one** topic, and no two claim the same one.
 *
 * "One cheat sheet per topic" is the whole of what a cheat sheet is for -- the single page
 * that summarises a Term -- so both halves are the same rule read twice. A list-valued
 * `topic` is the interesting half: it is not caught by anything else, it is what an author
 * copying a Lesson's frontmatter would write, and it makes the other half uncheckable.
 */
const cheatSheetTopic: Rule = {
  name: "cheat-sheet-topic",
  check(vault: Vault): Finding[] {
    const findings: Finding[] = []
    const claims = new Map<string, string[]>()

    for (const note of vault.notes) {
      if (note.type !== "cheat-sheet") continue

      if (Array.isArray(note.frontmatter.topic)) {
        findings.push({
          severity: "error",
          note: note.path,
          message:
            "`topic` is a list: a cheat sheet claims exactly one topic, so its `topic` is a single value",
        })
      }

      for (const { stem } of targets(note.frontmatter.topic)) {
        claims.set(stem, [...(claims.get(stem) ?? []), note.path])
      }
    }

    for (const [stem, sheets] of [...claims].sort()) {
      if (sheets.length < 2) continue
      // Vault-wide, like a ULID used twice: naming one of the sheets as the culprit would
      // send the dev to fix whichever happened to sort first, and either could be right.
      findings.push({
        severity: "error",
        message: `${sheets.length} cheat sheets claim the topic \`${stem}\`: ${sheets.join(", ")}. A topic has one cheat sheet`,
      })
    }

    return findings
  },
}

/**
 * A topic with **Lessons** and no cheat sheet — a warning, and deliberately not an error.
 *
 * It says the library has grown a subject far enough to be worth summarising, which is a
 * fact about how far the writing has got rather than a defect in it. Nothing is wrong with
 * a vault in this state, and a build that failed over it would be failing over the dev's
 * own reading order.
 *
 * **Lessons, plural**, and the plural is doing work. A topic's *first* Lesson has not
 * grown anything far enough to summarise, and warning there would put a line on every
 * topic in a young vault permanently -- which is the shape of warning a dev learns to
 * scroll past, and it would take the unwritten-link warnings with it. Two is where a
 * subject starts being a subject rather than a note.
 */
const TAUGHT_ENOUGH_TO_SUMMARISE = 2

const topicWithoutCheatSheet: Rule = {
  name: "topic-without-cheat-sheet",
  check(vault: Vault): Finding[] {
    const lessons = new Map<string, number>()
    const summarised = new Set<string>()

    for (const note of vault.notes) {
      const claimed = targets(note.frontmatter.topic).map((t) => t.stem)
      if (note.type === "lesson") {
        for (const stem of claimed) lessons.set(stem, (lessons.get(stem) ?? 0) + 1)
      }
      if (note.type === "cheat-sheet") for (const stem of claimed) summarised.add(stem)
    }

    return vault.notes
      .filter((note) => note.type === "term")
      .map((note) => [note, stemOf(note.path)] as const)
      .filter(
        ([, stem]) =>
          (lessons.get(stem) ?? 0) >= TAUGHT_ENOUGH_TO_SUMMARISE && !summarised.has(stem),
      )
      .map(([note, stem]) => ({
        severity: "warning" as const,
        note: note.path,
        message: `${lessons.get(stem)} lessons are about this topic and nothing summarises it: it has no cheat sheet`,
      }))
  },
}

export const vocabularyRules: Rule[] = [
  topicVocabulary,
  prerequisiteTargets,
  practicesTargets,
  cheatSheetTopic,
  topicWithoutCheatSheet,
]
