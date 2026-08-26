/**
 * Spike plugin — mechanism 3: emitter output is structurally outside the link graph.
 *
 * This is **not** the Vault report. It is the smallest thing that can answer one
 * question: if a plugin emits a *page* full of links to notes, do those links become
 * edges in the link graph, and does the page land in `contentIndex.json`?
 *
 * The failure this is testing for is silent. If emitter output were crawled, the real
 * report would link to every orphan it lists, each orphan would gain an inbound link,
 * and the hygiene section would erase itself on the second build -- with nothing
 * printed and no test failing. Ticket 14 owns the real report; this file exists so the
 * "must be an emitter, never a virtual content file" constraint rests on a run.
 *
 * It links to every note in the corpus, on purpose: that is the shape that would erase
 * the hygiene section if the mechanism did not hold.
 *
 * Registered only by `prepper/testing/spike-build.ts`, never by `quartz.config.yaml`.
 */
import fs from "node:fs/promises"
import path from "node:path"

export default function EmitterPageLinksSpike() {
  return {
    name: "EmitterPageLinksSpike",
    async *emit(ctx, content) {
      const links = content
        .map(([, file]) => file.data.slug)
        .filter((slug) => slug && !slug.endsWith("index"))
        .sort()
        .map((slug) => `<li><a href="./${slug}">${slug}</a></li>`)
        .join("\n")

      const dest = path.join(ctx.argv.output, "spike-report.html")
      await fs.mkdir(path.dirname(dest), { recursive: true })
      await fs.writeFile(
        dest,
        `<!doctype html><html><body><main><h1>Spike report</h1><ul>\n${links}\n</ul></main></body></html>\n`,
      )
      yield dest
    },
    async *partialEmit() {},
  }
}
