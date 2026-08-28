/**
 * Schema rules: whether a note declares what its type requires it to declare.
 *
 * Only *presence* is checked here. Whether a `topic` names an existing Term, whether a
 * `kind` is one of the three, and whether a Problem has the H2 sections its kind needs
 * are vocabulary, graph, and body rules -- they read more than one note, or more than
 * the frontmatter, and they live in their own rule files.
 */
import type { Finding, Rule } from "../rules.ts"
import { articleFor, type NoteType } from "../../note-type.ts"
import type { Note, Vault } from "../vault.ts"

/**
 * What each type must declare, beyond the `title` every note carries and the `id` the
 * identity rules own. Straight from the spec's frontmatter table; the optional fields are
 * deliberately not listed, because an unknown extra field is not a defect.
 */
const requiredByType: Record<NoteType, readonly string[]> = {
  lesson: ["topic"],
  reference: ["topic"],
  problem: ["topic", "kind", "difficulty", "practices"],
  term: [],
  "cheat-sheet": ["topic"],
  research: ["date", "sources"],
  record: ["date"],
  mission: [],
}

const requiredFrontmatter: Rule = {
  name: "frontmatter-required-fields",
  check(vault: Vault): Finding[] {
    const findings: Finding[] = []

    for (const note of vault.notes) {
      // Every note carries a title, whatever its type -- including one in a directory the
      // layout names no type for, which is why this is not inside the per-type loop.
      if (isMissing(note, "title")) {
        findings.push({
          severity: "error",
          note: note.path,
          message: "no frontmatter `title`: every note declares one",
        })
      }

      if (!note.type) continue
      for (const field of requiredByType[note.type]) {
        if (isMissing(note, field)) {
          findings.push({
            severity: "error",
            note: note.path,
            message: `no frontmatter \`${field}\`: ${articleFor(note.type)} requires it`,
          })
        }
      }
    }

    return findings
  },
}

/**
 * A field is missing if the note does not declare it, or declares it blank or empty. An
 * empty `practices` is a Problem that practises nothing, which is the same defect as
 * having left the field out.
 *
 * Presence comes from what the note declares rather than from the parsed value, because
 * Quartz supplies a `title` of its own when a note has none.
 */
function isMissing(note: Note, field: string): boolean {
  return !note.declaredFields.has(field) || isEmpty(note.frontmatter[field])
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmpty)
  return false
}

/**
 * `tags` is the build's field, not the author's.
 *
 * `prepper/search-index` derives it from `topic` so that Quartz's search has the field it
 * reads. A hand-written `tags:` is therefore either silently overwritten or silently
 * merged, and either way the vault grows a second, uncontrolled topic vocabulary beside
 * the controlled one -- which is the exact failure `topic` resolving to a Term that must
 * exist is there to prevent. Trivial to detect, trivial to fix.
 *
 * Every type, including Workshop: a Research note is invisible to the reader but not to
 * Obsidian, and two vocabularies in one vault is one vault's problem.
 */
const authoredTags: Rule = {
  name: "authored-tags",
  check(vault: Vault): Finding[] {
    return vault.notes
      .filter((note) => note.declaredFields.has("tags"))
      .map((note) => ({
        severity: "error" as const,
        note: note.path,
        message:
          "declares frontmatter `tags`: the build owns that field -- it derives it from " +
          "`topic` to feed search -- so a hand-written one is overwritten. File the note " +
          "under a `topic` instead.",
      }))
  },
}

export const schemaRules: Rule[] = [requiredFrontmatter, authoredTags]
