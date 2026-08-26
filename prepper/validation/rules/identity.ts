/**
 * Identity rules: the two identities a note carries, and the one namespace they share.
 *
 * A note has a **link identity** -- its filename, which is what wikilinks resolve against
 * and what Obsidian rewrites on rename -- and a **record identity**, the immutable
 * frontmatter ULID ([ADR 0001](../../../docs/adr/0001-split-note-identity.md)). Nothing
 * dereferences the ULID today; it is the anchor that keeps the vault addressable by
 * something a rename cannot break, and an anchor that is absent, malformed, or shared is
 * not an anchor.
 *
 * Immutability is deliberately *not* checked here: the build sees one revision of the
 * vault, and the optional pre-commit hook is where a changed `id` is noticed.
 */
import type { Finding, Rule } from "../rules.ts"
import type { Note, Vault } from "../vault.ts"

/**
 * A ULID: 26 characters of Crockford base32 (no I, L, O or U), the first of which is
 * bounded by the 48-bit timestamp. Uppercase, as `npm run ulid` mints them -- a lowercase
 * one is a hand-typed one, which is the habit ADR 0001 exists to prevent.
 */
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/

/** Where a ULID was written, so a collision report can send the dev to both ends of it. */
interface Occurrence {
  note: string
  /** `frontmatter \`id\`` or `a quiz block`. */
  where: string
}

const recordIdentity: Rule = {
  name: "record-identity",
  check(vault: Vault): Finding[] {
    const findings: Finding[] = []

    for (const note of vault.notes) {
      const id = note.frontmatter.id
      if (id === undefined || id === null || id === "") {
        findings.push({
          severity: "error",
          note: note.path,
          message: "no frontmatter `id`: record identity is minted with `npm run ulid`",
        })
      } else if (typeof id !== "string" || !ULID.test(id)) {
        findings.push({
          severity: "error",
          note: note.path,
          message: `frontmatter \`id\` is not a ULID: ${JSON.stringify(id)}. Mint one with \`npm run ulid\``,
        })
      }
    }

    return findings
  },
}

const ulidNamespace: Rule = {
  name: "ulid-namespace",
  check(vault: Vault): Finding[] {
    const occurrences = new Map<string, Occurrence[]>()
    const record = (ulid: string, occurrence: Occurrence) => {
      const found = occurrences.get(ulid)
      if (found) found.push(occurrence)
      else occurrences.set(ulid, [occurrence])
    }

    for (const note of vault.notes) {
      const id = note.frontmatter.id
      // A malformed `id` is `record-identity`'s violation to report, not this rule's; it
      // takes no part in the namespace, or one typo would be reported twice.
      if (typeof id === "string" && ULID.test(id)) {
        record(id, { note: note.path, where: "frontmatter `id`" })
      }
      for (const ulid of quizBlockUlids(note)) {
        record(ulid, { note: note.path, where: "a quiz block" })
      }
    }

    return [...occurrences]
      .filter(([, where]) => where.length > 1)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([ulid, where]) => ({
        severity: "error" as const,
        message:
          `ULID ${ulid} is used ${where.length} times, and note ids and quiz blocks share ` +
          `one namespace: ${where.map((o) => `${o.note} (${o.where})`).join(", ")}`,
      }))
  },
}

const filenameCollision: Rule = {
  name: "filename-collision",
  check(vault: Vault): Finding[] {
    const byStem = new Map<string, string[]>()
    for (const file of vault.files) {
      const key = file.stem.toLowerCase()
      const found = byStem.get(key)
      if (found) found.push(file.path)
      else byStem.set(key, [file.path])
    }

    return [...byStem]
      .filter(([, paths]) => paths.length > 1)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([stem, paths]) => ({
        severity: "error" as const,
        message:
          `${paths.length} files share the filename stem \`${stem}\`, and a wikilink ` +
          `resolves case-insensitively: ${paths.join(", ")}`,
      }))
  },
}

/**
 * The ULIDs in a note's quiz-block infostrings.
 *
 * A quiz block is ```` ```quiz <ULID> [type] ````, and its ULID is record identity at
 * block granularity, in the same namespace as a note's. Only well-formed ULIDs at top
 * level are collected: whether a fence's infostring is *valid* -- a missing ULID, an
 * unknown type word -- is a quiz rule, and a fence nested inside another fenced block is
 * a code sample about quiz blocks rather than a quiz block.
 */
function quizBlockUlids(note: Note): string[] {
  const ulids: string[] = []
  let openFence: string | undefined

  for (const line of note.source.split("\n")) {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (!fence) continue
    const [, marker, info] = fence

    if (openFence) {
      // A closing fence is the same character, at least as long, and carries no info.
      if (marker[0] === openFence[0] && marker.length >= openFence.length && info.trim() === "") {
        openFence = undefined
      }
      continue
    }

    openFence = marker
    const [language, ...rest] = info.trim().split(/\s+/)
    if (language !== "quiz") continue
    const candidate = rest.find((word) => ULID.test(word))
    if (candidate) ulids.push(candidate)
  }

  return ulids
}

export const identityRules: Rule[] = [recordIdentity, ulidNamespace, filenameCollision]
