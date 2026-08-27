/**
 * The link graph, emitted: `static/linkGraph.json`.
 *
 * `emit(ctx, content[], resources)` is Quartz's whole-corpus seam -- the one place a plugin
 * is handed every note at once -- so it is where "computed once at build" can be true
 * rather than aspirational. What comes out is the same `LinkGraph` the in-context rails
 * render from (`prepper/edges/`), written down.
 *
 * Two things it is **for**, both later tickets:
 *
 * - the **topic index** (ticket 07), which is the *about* edge inverted on the Term note;
 * - the **Vault report** (ticket 14), whose authoring queue ranks unwritten notes by their
 *   inbound links, typed above untyped -- a ranking that needs the edge's type, which
 *   `contentIndex.json` does not carry and was never meant to.
 *
 * And one thing it is **not**: a second link graph. `contentIndex.json` stays exactly as
 * Quartz emits it, so search, the graph view and popovers are untouched. This file adds the
 * typing and the Library-only node set on top, and nothing reads it that could have read
 * Quartz's.
 *
 * It is emitter output, which is also why it is safe: emitters run after the last
 * transform, so nothing written here can become a graph edge of its own
 * ([ticket 02, mechanism 3](../../.scratch/prepper-build/issues/02-spike-the-unrun-mechanisms.md)).
 */
import * as fs from "node:fs"
import * as path from "node:path"

import type { QuartzEmitterPluginInstance } from "../../quartz/plugins/types"
import type { FilePath } from "../../quartz/util/path"

import { linkGraph } from "./graph.ts"

export const manifest = {
  name: "prepper-graph",
  displayName: "Prepper link graph",
  description: "Emits the whole-vault index of typed links as static/linkGraph.json.",
  version: "1.0.0",
  category: "emitter",
}

/** Where the graph lands, beside `contentIndex.json`, which it deliberately does not replace. */
const graphPath = "static/linkGraph.json"

const PrepperGraph = (): QuartzEmitterPluginInstance => ({
  name: "PrepperGraph",
  async emit(ctx, content): Promise<FilePath[]> {
    const graph = linkGraph(content.map(([, file]) => file.data))

    // Quartz's own `write` helper is unreachable from here: it is a `quartz/` module with
    // extensionless imports, which the bundler resolves for upstream's plugins and Node's
    // ESM resolver, which is what loads ours, does not. Two lines of `fs` is the whole of
    // what it does.
    const target = path.join(ctx.argv.output, graphPath)
    await fs.promises.mkdir(path.dirname(target), { recursive: true })
    await fs.promises.writeFile(target, JSON.stringify(graph, null, 2))

    return [target as FilePath]
  },
})

export default PrepperGraph
