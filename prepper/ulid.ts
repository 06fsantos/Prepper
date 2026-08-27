/**
 * What counts as a ULID.
 *
 * **Record identity** ([ADR 0001](../docs/adr/0001-split-note-identity.md)) is a ULID, and
 * a note's frontmatter `id` is not the only place one is written: a quiz fence carries one
 * too, in its infostring, and the two share a single namespace. Two parts of the build
 * therefore have to agree on the shape of one, and neither should own it — the validation
 * rule that reports a malformed `id` and the transform that reads a fence's infostring are
 * about different things and would otherwise each carry a copy of this pattern. Two copies
 * of a regular expression is two chances to disagree about which characters Crockford's
 * alphabet leaves out, and the disagreement would show up as a ULID that one half of the
 * build accepts and the other does not.
 */

/**
 * 26 characters of Crockford base32 — no I, L, O or U — the first bounded by the 48-bit
 * timestamp. Uppercase, as `npm run ulid` mints them: a lowercase one is a hand-typed one,
 * which is the habit ADR 0001 exists to prevent.
 */
export const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/

/** Whether a value is a ULID as this project mints them. */
export function isUlid(value: unknown): value is string {
  return typeof value === "string" && ULID.test(value)
}
