/**
 * What a violation is, and how a violation list is spoken about.
 *
 * There are exactly **two severities**. There is no `info` level and no promotion path
 * between the two: a fact worth failing a build over is a rule, a fact that is not is a
 * Vault report line, and there is nothing in between. Widening this union is a change to
 * that decision, not a refactor.
 */

/** The only two severities there are. */
export type Severity = "error" | "warning"

/** One thing the build has to say about the vault that makes the vault wrong. */
export interface Violation {
  /** The rule that raised it, e.g. `record-identity`. Names the rule, never the note. */
  rule: string
  severity: Severity
  /**
   * The note the violation is about, as a vault-relative path (`lessons/big-o.md`).
   * Omitted when the fact is about the vault as a whole rather than about one note --
   * two files colliding, one ULID used twice -- because attributing it to one of the
   * notes involved would send the dev to fix the wrong half.
   */
  note?: string
  /** One line, in the dev's vocabulary, saying what is wrong. No severity prefix. */
  message: string
}

/** A violation list plus the size of the corpus it was collected from. */
export interface ValidationReport {
  /** How many notes were checked. Printed so that "no violations" is not "nothing ran". */
  notes: number
  violations: Violation[]
}

/** Whether a violation list contains anything that must fail CI. */
export function hasError(violations: readonly Violation[]): boolean {
  return violations.some((v) => v.severity === "error")
}

/**
 * The exit code a violation list is worth. Zero for a clean vault *and* for one with
 * warnings only -- a warning marks intent, and intent never fails a build.
 */
export function exitCodeFor(violations: readonly Violation[]): number {
  return hasError(violations) ? 1 : 0
}

/** `3 errors, 1 warning` -- the count line, in the only two words there are. */
export function summarise(violations: readonly Violation[]): string {
  const errors = violations.filter((v) => v.severity === "error").length
  const warnings = violations.length - errors
  return `${plural(errors, "error")}, ${plural(warnings, "warning")}`
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

/**
 * Sort a violation list into the order it is reported in: note by note in path order,
 * vault-wide facts last, and within a note by rule then message.
 *
 * Sorting is what makes the report a function of the vault alone -- rules run in
 * registration order and a rule may collect in any order, and neither should show.
 */
export function sortViolations(violations: readonly Violation[]): Violation[] {
  return [...violations].sort(
    (a, b) =>
      compare(a.note ?? "￿", b.note ?? "￿") ||
      compare(a.rule, b.rule) ||
      compare(a.message, b.message),
  )
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * The violation list as the dev reads it: grouped under the note it is about, with
 * vault-wide facts under `vault`. Returns "" for a clean vault, so the caller decides
 * what a clean vault says.
 */
export function formatViolations(violations: readonly Violation[]): string {
  const lines: string[] = []
  let group: string | undefined
  const width = Math.max(0, ...violations.map((v) => v.rule.length))

  for (const violation of sortViolations(violations)) {
    const heading = violation.note ?? "vault"
    if (heading !== group) {
      if (group !== undefined) lines.push("")
      lines.push(heading)
      group = heading
    }
    lines.push(
      `  ${violation.severity.padEnd(7)} ${violation.rule.padEnd(width)}  ${violation.message}`,
    )
  }

  return lines.join("\n")
}
