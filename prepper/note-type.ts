/**
 * A note's **type**, and the Library/Workshop split built on it.
 *
 * Type is the directory a note lives in, never a frontmatter field
 * ([`CONTEXT.md`](../CONTEXT.md)): `lessons/hash-map-lookup-cost.md` is a `lesson` because
 * of where it sits, and moving it is how its type changes. There is no `type:` key for a
 * note to disagree with its own path about.
 *
 * This module holds nothing but that vocabulary, because two different parts of the build
 * need it and neither should own it. Validation reads it to know which fields a note
 * requires; the link graph reads it to know which notes are nodes. Were it to live in
 * either, the other would have to import a module named for a job it is not doing.
 */

/** The eight note types. */
export type NoteType =
  "lesson" | "reference" | "problem" | "term" | "cheat-sheet" | "research" | "record" | "mission"

/** Which directory means which type. `MISSION.md` at the vault root is the singleton. */
const typeByDirectory: Record<string, NoteType> = {
  lessons: "lesson",
  references: "reference",
  problems: "problem",
  terms: "term",
  "cheat-sheets": "cheat-sheet",
  research: "research",
  records: "record",
}

/**
 * **Library** — the note types the reader sees. The build gives a page and a graph node
 * to these and to nothing else.
 */
export const libraryTypes = [
  "lesson",
  "reference",
  "problem",
  "term",
  "cheat-sheet",
] as const satisfies readonly NoteType[]

/**
 * **Workshop** — in the vault, never rendered. `research` notes are the dev's own reading
 * notes; `record` and `mission` are the learner-state subset.
 */
export const workshopTypes = [
  "research",
  "record",
  "mission",
] as const satisfies readonly NoteType[]

export type LibraryType = (typeof libraryTypes)[number]
export type WorkshopType = (typeof workshopTypes)[number]

/**
 * Every type is on exactly one side of the split, checked by the compiler.
 *
 * Without this, the two arrays are just strings and adding a ninth `NoteType` is a change
 * nothing forces you to finish. Validation would make you finish it -- `requiredByType` is
 * a `Record<NoteType, …>` -- but the split would not, and the new type would fall silently
 * to Workshop: every note of it would vanish from the graph, get no node, no edges, and no
 * place in any rail or panel, with `tsc`, `npm test` and `npm run validate` all green. A
 * whole category of note disappearing from the reader's library is not a thing to find out
 * about by noticing.
 *
 * The failure is a type error on one of the two lines below, naming the type that has no
 * side yet, or the one that was put on both.
 */
type Unplaced = Exclude<NoteType, LibraryType | WorkshopType>
type PlacedTwice = Extract<LibraryType, WorkshopType>

const everyTypeIsPlacedOnce: [Unplaced] extends [never] ? true : Unplaced = true
const noTypeIsPlacedTwice: [PlacedTwice] extends [never] ? true : PlacedTwice = true
void everyTypeIsPlacedOnce
void noTypeIsPlacedTwice

const library = new Set<string>(libraryTypes)

/** The type a vault-relative path declares by where it sits. */
export function typeOf(relativePath: string): NoteType | undefined {
  const segments = relativePath.split("/")
  if (segments.length === 1) return segments[0] === "MISSION.md" ? "mission" : undefined
  return typeByDirectory[segments[0]]
}

/**
 * Whether a type is Library content.
 *
 * Undefined is not Library. A Markdown file somewhere the layout names no type for is not
 * a note the reader was ever meant to reach, and whether it should exist at all is a
 * validation question rather than a rendering one.
 */
export function isLibrary(type: NoteType | undefined): boolean {
  return type !== undefined && library.has(type)
}
