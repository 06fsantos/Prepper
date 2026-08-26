/**
 * How the emitter hands its violation list to the CLI.
 *
 * The CLI does not parse the build's console output, and it does not run the rules
 * itself: it *is* a `quartz build`, and this file is the one channel out of it. The
 * emitter writes the list here when the CLI asks for it by setting the environment
 * variable; the CLI reads it back and decides the exit code. Nothing else uses it, and no
 * build the dev runs writes it.
 *
 * Not to be confused with the **Vault report** -- that is the build's other channel, the
 * one that is not a validation failure, and the two never share a line.
 */
import * as fs from "node:fs"
import * as path from "node:path"

import type { ValidationReport } from "./violation.ts"

/**
 * What the emitter prints when it cannot run at all.
 *
 * The CLI looks for it in the build log so that "the rules never ran" is told apart from
 * "the plugin is not registered" -- both produce no list, and they are fixed in different
 * places.
 */
export const EMITTER_FAILURE = "[prepper] validation could not run:"

/** Set by the CLI to the path the emitter should write its violation list to. */
export const REPORT_PATH_ENV = "PREPPER_VALIDATION_REPORT"

/** Where the emitter was asked to write, if it was asked at all. */
export function requestedReportPath(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const requested = env[REPORT_PATH_ENV]
  return requested && requested.trim() !== "" ? requested : undefined
}

export function writeReportFile(filePath: string, report: ValidationReport): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + "\n", "utf8")
}

/** Reads the list back. Undefined when the emitter never wrote one. */
export function readReportFile(filePath: string): ValidationReport | undefined {
  if (!fs.existsSync(filePath)) return undefined
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as ValidationReport
}
