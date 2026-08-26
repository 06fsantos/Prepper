/**
 * Consumer two: `npm run validate`, the hard gate.
 *
 *     npm run validate                                   # the vault, content/
 *     npm run validate -- -d prepper/testing/fixtures/x  # any vault
 *
 * **It does not parse the vault.** It runs `quartz build` -- the same binary, the same
 * `quartz.config.yaml`, the same pipeline the dev's build and dev server run -- and reads
 * back the violation list the validation emitter collected during it. That is the whole
 * point of the design: a validator with its own parse would eventually resolve a link
 * differently from the build, and then the build would be right and the gate would be
 * wrong. Here there is only one reader of the vault.
 *
 * The build output is thrown away; validation wants the pipeline, not the site.
 *
 * ## Exit codes
 *
 * | code | meaning                                                              |
 * | ---- | -------------------------------------------------------------------- |
 * | 0    | no errors. A clean vault, or one with warnings only -- a warning marks intent and never fails a build. |
 * | 1    | at least one error. This is the CI gate.                              |
 * | 2    | the vault could not be validated: the build did not finish, or it finished without a violation list. Never confused with "clean". |
 */
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import {
  EMITTER_FAILURE,
  readReportFile,
  REPORT_PATH_ENV,
  requestedReportPath,
} from "./violation-file.ts"
import { exitCodeFor, formatViolations, summarise } from "./violation.ts"

const execFileAsync = promisify(execFile)

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

const usage = `Usage: npm run validate [-- -d <vault directory>]

Runs the vault through Quartz's own pipeline and reports every violation in it.
Exits 0 when there are no errors, 1 when there are, 2 when the vault could not be
validated at all.`

/**
 * Which vault to validate, or what is wrong with the arguments.
 *
 * An argument this does not understand is refused rather than ignored: falling through to
 * `content/` would answer a question nobody asked, and answer it *green* -- a typo in the
 * flag would report a clean vault and exit 0 while the vault meant was never opened.
 */
function vaultFrom(argv: string[]): string | { problem: string } {
  let vault = "content"
  let named = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const [flag, inline] = arg.startsWith("--") && arg.includes("=") ? split(arg) : [arg, undefined]
    if (flag !== "-d" && flag !== "--directory") {
      return { problem: `unknown argument ${JSON.stringify(arg)}` }
    }
    if (named) return { problem: "more than one vault directory given" }

    const value = inline ?? argv[++i]
    if (!value) return { problem: `${flag} needs a directory` }
    vault = value
    named = true
  }

  return vault
}

function split(arg: string): [string, string] {
  const at = arg.indexOf("=")
  return [arg.slice(0, at), arg.slice(at + 1)]
}

export async function main(argv: string[]): Promise<number> {
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(usage)
    return 0
  }

  const vault = vaultFrom(argv)
  if (typeof vault !== "string") {
    console.error(`validate: ${vault.problem}\n\n${usage}`)
    return 2
  }
  if (!fs.existsSync(path.resolve(repoRoot, vault))) {
    console.error(`validate: no vault at \`${vault}\``)
    return 2
  }

  // Named for the vault it validates, so two of these can run at once -- a test suite
  // validates several fixtures -- without overwriting each other's answer.
  const scratch = path.join(
    repoRoot,
    ".quartz-cache",
    "validate",
    createHash("sha256").update(path.resolve(vault)).digest("hex").slice(0, 8),
  )
  // An inherited request wins, so a caller can ask for the list as data rather than
  // as text; seam 1's `validateFixture` is the one that does.
  const reportPath = requestedReportPath() ?? path.join(scratch, "violations.json")
  fs.rmSync(reportPath, { force: true })

  let buildLog = ""
  try {
    const built = await execFileAsync(
      process.execPath,
      ["./quartz/bootstrap-cli.mjs", "build", "-d", vault, "-o", path.join(scratch, "site")],
      {
        cwd: repoRoot,
        env: { ...process.env, [REPORT_PATH_ENV]: reportPath },
        maxBuffer: 64 * 1024 * 1024,
      },
    )
    buildLog = built.stdout + built.stderr
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string }
    console.error((e.stdout ?? "") + (e.stderr || e.message))
    console.error(
      `\nvalidate: \`quartz build\` failed on \`${vault}\`, so the vault was not validated.`,
    )
    return 2
  }

  // Every way of not getting a list back is exit 2, never 1 and never 0: "could not
  // validate" must never be mistaken for "has errors", and least of all for "clean".
  let report
  try {
    report = readReportFile(reportPath)
  } catch (err) {
    console.error(
      `\nvalidate: the violation list at ${reportPath} could not be read: ` +
        `${err instanceof Error ? err.message : String(err)}`,
    )
    return 2
  }

  if (!report) {
    console.error(buildLog)
    console.error(
      buildLog.includes(EMITTER_FAILURE)
        ? `\nvalidate: the build ran, but validation itself failed inside it -- the reason is ` +
            `printed above. The vault was not validated.`
        : `\nvalidate: the build produced no violation list. Is \`./prepper/validation\` still ` +
            `enabled in quartz.config.yaml?`,
    )
    return 2
  }

  console.log(`prepper validate — ${vault}\n`)
  if (report.violations.length === 0) {
    console.log(`No violations. ${report.notes} notes checked.`)
    return 0
  }

  console.log(formatViolations(report.violations))
  console.log(`\n${summarise(report.violations)} in ${report.notes} notes.`)
  return exitCodeFor(report.violations)
}

process.exitCode = await main(process.argv.slice(2))
