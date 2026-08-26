/**
 * The vault, as a rule sees it.
 *
 * Every rule reads this and nothing else. It is built from **what Quartz hands the
 * emitter** -- the same `content[]` the rest of the build renders from, carrying the
 * frontmatter Quartz parsed and the Markdown Quartz read -- plus a listing of the files
 * on disk, which is the only way to see the half of the vault that is not Markdown
 * (`attachments/`, where a filename collision hides just as well).
 *
 * That provenance is the point. A rule can never read a note differently from the build,
 * because it is reading the build's own view of it, which is why the rule module has no
 * seam of its own: a hand-built `content[]` would drift from this.
 */
import * as fs from "node:fs"
import * as path from "node:path"

import { minimatch } from "minimatch"

import type { BuildCtx } from "../../quartz/util/ctx"
import type { ProcessedContent } from "../../quartz/plugins/vfile"

/** The eight note types. Type is the directory a note lives in, never a frontmatter field. */
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

/** One note in the vault, as the build read it. */
export interface Note {
  /** Vault-relative path, e.g. `lessons/big-o-notation-basics.md`. How a violation names it. */
  path: string
  /** The filename without its extension: the note's **link identity**. */
  stem: string
  /**
   * The note's type, from the directory holding it. Undefined for Markdown somewhere the
   * layout does not name a type for -- such a note has no required fields to check, and
   * whether it should exist at all is the Workshop-boundary question, not a schema one.
   */
  type: NoteType | undefined
  /** Frontmatter exactly as Quartz parsed it. */
  frontmatter: Record<string, unknown>
  /**
   * The frontmatter keys the note itself **declares**.
   *
   * Not the same question as `frontmatter`, which is what the build ended up with: Quartz
   * fills a missing `title` in from the filename before any emitter runs, so a note with
   * no `title` at all is indistinguishable from one that has it -- unless the note's own
   * frontmatter block is what is asked. Presence is read from here; the value, from
   * `frontmatter`.
   */
  declaredFields: Set<string>
  /** The note's Markdown, as Quartz read it -- frontmatter included, body included. */
  source: string
}

/** One file in the vault, Markdown or not. */
export interface VaultFile {
  /** Vault-relative path, e.g. `attachments/hash-map.png`. */
  path: string
  /** The filename without its extension. */
  stem: string
}

/** Everything a rule may ask about the vault. */
export interface Vault {
  /** Every note the build parsed, in path order. */
  notes: Note[]
  /** Every file in the vault, attachments included, in path order. */
  files: VaultFile[]
}

/**
 * Build the snapshot from what an emitter is given.
 *
 * `content[]` at this point also holds Quartz's synthesised folder and tag index pages,
 * which are not notes and answer to no file in the vault. They are filtered out on the
 * one thing that tells them apart: a page Quartz invented has no file path, because no
 * file was read to make it.
 */
export function vaultFromEmitterContent(ctx: BuildCtx, content: ProcessedContent[]): Vault {
  const notes: Note[] = []
  for (const [, file] of content) {
    const relativePath = file.data.relativePath
    if (!relativePath || !file.data.filePath) continue

    notes.push({
      path: relativePath,
      stem: stemOf(relativePath),
      type: typeOf(relativePath),
      frontmatter: (file.data.frontmatter ?? {}) as Record<string, unknown>,
      declaredFields: declaredFields(String(file.value ?? "")),
      source: String(file.value ?? ""),
    })
  }

  return {
    notes: notes.sort(byPath),
    files: listVaultFiles(ctx),
  }
}

/** The type a vault-relative path declares by where it sits. */
export function typeOf(relativePath: string): NoteType | undefined {
  const segments = relativePath.split("/")
  if (segments.length === 1) return segments[0] === "MISSION.md" ? "mission" : undefined
  return typeByDirectory[segments[0]]
}

/** A filename's stem: everything before its extension. This is a note's link identity. */
export function stemOf(filePath: string): string {
  return path.posix.basename(filePath, path.posix.extname(filePath))
}

/**
 * Every file in the vault, including the ones the build never parses.
 *
 * Uses the build's own `ignorePatterns`, so a directory Quartz was told to skip is not
 * reported on; hidden files and directories (`.obsidian`, `.gitkeep`) are skipped too,
 * since nothing links to a file whose name starts with a dot.
 */
function listVaultFiles(ctx: BuildCtx): VaultFile[] {
  const root = ctx.argv.directory
  const ignorePatterns = (ctx.cfg.configuration.ignorePatterns ?? []) as string[]
  const files: VaultFile[] = []

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort(byName)) {
      if (entry.name.startsWith(".")) continue
      const full = path.join(dir, entry.name)
      const relative = path.relative(root, full).split(path.sep).join("/")
      if (ignorePatterns.some((pattern) => minimatch(relative, pattern))) continue
      if (entry.isDirectory()) walk(full)
      else files.push({ path: relative, stem: stemOf(relative) })
    }
  }
  walk(root)

  return files.sort(byPath)
}

/**
 * The top-level keys in a note's own frontmatter block.
 *
 * Deliberately a scan for keys rather than a second YAML parse: the values are Quartz's
 * to read, and a validator that parsed them itself would be the drift the whole design
 * exists to prevent. All this answers is which lines the author wrote.
 */
function declaredFields(source: string): Set<string> {
  const fields = new Set<string>()
  const lines = source.split("\n")
  if (lines[0]?.trim() !== "---") return fields

  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break
    const key = /^([A-Za-z0-9_-]+)\s*:/.exec(line)
    if (key) fields.add(key[1])
  }

  return fields
}

function byPath(a: { path: string }, b: { path: string }): number {
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
}
