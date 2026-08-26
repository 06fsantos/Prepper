/**
 * Consumer one: validation as a Quartz emitter.
 *
 * `emit(ctx, content[], resources)` is Quartz's **whole-corpus seam** -- the one place a
 * plugin is handed every note at once -- which is what lets one run collect every
 * violation in the vault instead of one per build.
 *
 * Two things this emitter deliberately does not do:
 *
 * - **It emits no files.** It returns an empty list, so the site is byte-for-byte what it
 *   would have been without it. Validation is a channel, not output.
 * - **It never throws and never exits.** Quartz treats a throwing emitter as fatal, and
 *   under `quartz build --serve` that would take the dev server down every time the vault
 *   was mid-edit -- exactly when the dev most wants to be told what is wrong. The hard
 *   gate is CI, running the `npm run validate` CLI; see `validate.ts`.
 */
import type { QuartzEmitterPluginInstance } from "../../quartz/plugins/types"
import type { FilePath } from "../../quartz/util/path"

import { validateVault } from "./rules.ts"
import { vaultFromEmitterContent } from "./vault.ts"
import { EMITTER_FAILURE, requestedReportPath, writeReportFile } from "./violation-file.ts"
import { formatViolations, summarise } from "./violation.ts"

export const manifest = {
  name: "prepper-validation",
  displayName: "Prepper validation",
  description: "Reports every schema, identity, vocabulary, and boundary violation in the vault.",
  version: "1.0.0",
  category: "emitter",
}

const PrepperValidation = (): QuartzEmitterPluginInstance => ({
  name: "PrepperValidation",
  async emit(ctx, content): Promise<FilePath[]> {
    try {
      const vault = vaultFromEmitterContent(ctx, content)
      const violations = validateVault(vault)

      if (violations.length === 0) {
        console.log(`\n[prepper] validation: no violations in ${vault.notes.length} notes\n`)
      } else {
        console.log(
          `\n[prepper] validation: ${summarise(violations)} in ${vault.notes.length} notes\n`,
        )
        console.log(formatViolations(violations) + "\n")
      }

      const reportPath = requestedReportPath()
      if (reportPath) writeReportFile(reportPath, { notes: vault.notes.length, violations })
    } catch (err) {
      // Whatever went wrong here, the build and the dev server carry on. Saying so is the
      // whole job: silence would read as a clean vault.
      console.error(
        `\n${EMITTER_FAILURE} ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
      )
    }

    return []
  },
})

export default PrepperValidation
