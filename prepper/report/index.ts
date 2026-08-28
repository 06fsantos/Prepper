/**
 * The Vault report, emitted: a page at `/report`, and one terminal line pointing at it.
 *
 * `emit(ctx, content[], resources)` is Quartz's whole-corpus seam -- the one place a plugin
 * is handed every note at once -- and it runs **after the last transform**, which is the
 * whole reason the report lives here rather than in `content/`. See
 * [`render.ts`](render.ts) for what that buys and what it would cost to give up.
 *
 * ## Why it never throws
 *
 * The same reason validation does not: Quartz treats a throwing emitter as fatal, and
 * under `quartz build --serve` that would take the dev server down over a *whisper*. The
 * report is the channel that carries nothing worth failing a build over, so it must be
 * incapable of failing one.
 *
 * ## Why the notes it reads include the Workshop half
 *
 * `prepper/workshop` is a filter, so a research note is gone from `content[]` by the time
 * any emitter runs, and it hands what it withheld to the emitters that still need it. The
 * link graph drops Workshop notes on its own -- a research note is neither a node nor the
 * source of an edge -- so nothing in the queue or the orphan list changes by reading them.
 * What does change is **attachments**: an image a research note shows is an image in use,
 * and reporting it as rotted would be telling the dev to delete something they are looking
 * at.
 */
import * as fs from "node:fs"
import * as path from "node:path"

import type { Root } from "hast"

import type { QuartzEmitterPluginInstance } from "../../quartz/plugins/types"
import type { FilePath } from "../../quartz/util/path"
import type { BuildCtx } from "../../quartz/util/ctx"

import { withheldNotes } from "../workshop/index.ts"
import { assetsOf, vaultReport, type ReportNote } from "./report.ts"
import { renderReport, reportSlug } from "./render.ts"

export const manifest = {
  name: "prepper-report",
  displayName: "Prepper vault report",
  description: "Emits the Vault report -- the authoring queue and vault hygiene -- at /report.",
  version: "1.0.0",
  category: "emitter",
}

const PrepperReport = (): QuartzEmitterPluginInstance => ({
  name: "PrepperReport",
  async emit(ctx, content): Promise<FilePath[]> {
    try {
      const notes: ReportNote[] = []
      for (const [tree, file] of [...content, ...withheldNotes(ctx)]) {
        // A page Quartz *generated* -- a folder index, a tag index, the home page -- was
        // read from no file, so it is not a note and has nothing to say about the vault.
        if (!file.data.filePath || !file.data.relativePath) continue
        notes.push({
          data: file.data,
          source: String(file.value ?? ""),
          assets: assetsOf(tree as Root, file.data.slug ?? ""),
        })
      }

      const report = vaultReport(notes, vaultFiles(ctx))
      const target = path.join(ctx.argv.output, `${reportSlug}.html`)
      await fs.promises.mkdir(path.dirname(target), { recursive: true })
      await fs.promises.writeFile(target, renderReport(report))

      // The whisper: one line, every build, pointing at the page rather than repeating it.
      // Deliberately says nothing about severity, because there is none -- it must never
      // read like the validation summary printed a few lines above it.
      const hygiene = report.hygiene
      const rot =
        hygiene.unreferencedAttachments.length +
        hygiene.notesWithNoInboundLinks.length +
        hygiene.termsWithNoTopicEdge.length
      console.log(
        `[prepper] report: /${reportSlug} — ${report.queue.length} in the authoring queue, ${rot} in vault hygiene`,
      )

      return [target as FilePath]
    } catch (err) {
      console.error(
        `[prepper] report: could not be written: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`,
      )
      return []
    }
  },
})

/**
 * Every file in the vault, Markdown included, as vault-relative paths.
 *
 * `ctx.allFiles` is the build's own glob of the vault, already narrowed by the configured
 * `ignorePatterns` -- so a directory Quartz was told to skip is not reported on, and the
 * report cannot disagree with the build about what the vault contains. Dotfiles are
 * dropped because nothing can link to a name starting with a dot.
 */
function vaultFiles(ctx: BuildCtx): string[] {
  return ctx.allFiles.filter((file) => !file.split("/").some((segment) => segment.startsWith(".")))
}

export default PrepperReport
