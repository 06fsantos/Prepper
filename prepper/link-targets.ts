/**
 * What a **frontmatter link target** names, and how a note answers to it.
 *
 * `topic`, `prerequisites` and `practices` hold links, and they are the one kind of link
 * Quartz never resolves: a frontmatter value does not reach a note's hast tree, so
 * `crawl-links` never saw it and `prepper/links` has nothing to record. Something has to
 * resolve them, and the spec says how -- a target names a **filename stem**, matched
 * case-insensitively, because filenames are unique vault-wide
 * ([ADR 0001](../docs/adr/0001-split-note-identity.md)).
 *
 * That resolution lives here rather than in either of the two modules that need it. The
 * link graph reads these fields to type an edge; the vocabulary rules read them to say
 * whether the target exists and is the right kind of note. If each resolved a target its
 * own way, a vault could validate clean and still render a rail pointing at nothing -- the
 * exact drift the "read the build's own decision" rule exists to prevent everywhere else.
 * There is no build decision to read here, so the next best thing is one implementation.
 *
 * Normalising is Quartz's `slugifyFilePath`, so "case-insensitively" means exactly what it
 * means in the rest of the build rather than approximately.
 */
import { slugifyFilePath } from "../quartz/util/path.ts"
import type { FilePath } from "../quartz/util/path.ts"

/** One target as the author wrote it, and the stem it resolves to. */
export interface Target {
  /** Verbatim, so a message can quote what is actually in the file. */
  written: string
  /** Normalised filename stem. What a note answers to. */
  stem: string
}

/**
 * The targets one frontmatter field names, in the order they were written.
 *
 * `topic` is a list on every type but `cheat-sheet`, where it is scalar -- one value being
 * what makes "one cheat sheet per topic" checkable. Both spellings mean the same thing to
 * a link, so both are read, and whether a scalar was allowed is a rule's question rather
 * than a parser's.
 *
 * A value that normalises to nothing is dropped rather than reported: an empty `topic:`
 * is a *missing* field, which the schema rule already owns, and two lines about one
 * blank would say the same thing twice.
 */
export function targets(value: unknown): Target[] {
  return listValues(value)
    .map((written) => ({ written, stem: stemOf(nameOf(written)) }))
    .filter((target) => target.stem !== "")
}

/**
 * The stem a note answers to: its filename, normalised the same way a target is.
 *
 * Takes a path or a slug -- both end in the filename, which is the only segment that
 * matters, because a target names a file and never a folder.
 */
export function stemOf(pathOrName: string): string {
  if (pathOrName.trim() === "") return ""
  return slugifyFilePath(pathOrName as FilePath)
    .split("/")
    .at(-1)!
}

/**
 * The name inside a target, with any link notation taken off.
 *
 * `[[hash-maps]]`, `[[hash-maps|hash maps]]` and `[hash maps](hash-maps.md)` all name
 * `hash-maps`. Obsidian writes the first of those on its own whenever a field is edited
 * through its property UI, so this is the ordinary case and not an exotic one: left on,
 * the brackets would slugify into the stem and the note would point at a name nothing
 * could ever answer to.
 *
 * An alias is dropped rather than read. A frontmatter target names a note, and the label
 * somebody fitted to a sentence is not part of the name -- the same reason a rail is
 * labelled by the target's own `title`.
 *
 * This is not inline syntax *typing* an edge, which stays impossible: the field decides
 * what the link means, and the brackets only decide where the name ends.
 */
export function nameOf(written: string): string {
  const value = written.trim()
  const wikilink = /^!?\[\[([^\]|#]*)/.exec(value)
  if (wikilink) return wikilink[1].trim()
  const markdown = /^\[[^\]]*\]\(([^)#]*)/.exec(value)
  if (markdown) return decodeURIComponent(markdown[1].trim())
  return value
}

/** A field's raw values, list-valued or scalar. Non-strings are not links. */
function listValues(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string")
  return []
}
