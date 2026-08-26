/**
 * Seam 1, with a plugin that is not in the shipped config yet.
 *
 * Two of the three mechanisms [ticket 02](../../.scratch/prepper-build/issues/02-spike-the-unrun-mechanisms.md)
 * had to run are only observable through a plugin of ours: a quiz fence needs a
 * transformer at `order: 25` to re-parse it, and "emitter output is outside the link
 * graph" needs an emitter that emits a page. Neither plugin exists yet -- tickets 09 and
 * 14 own them -- and inventing a half-version of each in `quartz.config.yaml` would put
 * spike code in every real build, which is exactly what "evidence, not features" rules
 * out.
 *
 * So a spike build reads a *different* config: the repo's real one with extra plugin
 * entries appended. Quartz resolves `quartz.config.yaml` from the working directory
 * (`quartz/plugins/loader/config-loader.ts`), and offers no flag for it, so the harness
 * builds a throwaway working directory that symlinks everything the build needs back to
 * the repo and holds its own config file. Everything else -- the CLI, the pipeline, the
 * assertions -- is seam 1 unchanged, and `EmittedSite` comes back the same shape.
 *
 *     const site = await buildWithSpikePlugins("quiz-fence-wikilink", [
 *       { source: "prepper/testing/spikes/quiz-fence-reparse", order: 25 },
 *     ])
 *
 * **This is for spikes only.** A test of shipped behaviour goes through `buildFixture`,
 * against the config the dev actually has; a test that reaches for this one is asserting
 * on a build nobody runs. When tickets 09 and 14 land their plugins in
 * `quartz.config.yaml`, their tests move to `buildFixture` and the spikes here become
 * the record of why the design was safe to write.
 */
import assert from "node:assert"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"

import YAML from "yaml"

import {
  EmittedSite,
  buildOutputRoot,
  fixturesDir,
  repoRoot,
  runQuartzBuild,
} from "./build-fixture"

/** A plugin to add to the config for one spike build. */
export interface SpikePlugin {
  /** Path to the plugin directory, relative to the repo root. */
  source: string
  /** Its `order` in the pipeline. Quartz defaults to 50 when omitted. */
  order?: number
}

/**
 * Everything the build reads out of its working directory. Symlinked rather than
 * copied, so a spike runs against the same Quartz, the same `node_modules`, and the
 * same plugin versions as a real build -- the config is the only difference.
 *
 * The symlinks are load-bearing, not a convenience. Quartz transpiles itself to
 * `./quartz/.quartz-cache/transpiled-build.mjs` resolved against the working directory,
 * then imports that bundle by a path relative to its own source: with `quartz` symlinked
 * the two are the same file, and a spike build shares the repo's bundle. Copying `quartz`
 * here instead would write a bundle nobody imports and silently run a stale one. Sharing
 * it also means two `quartz build` processes race on that file, which is why the suite
 * runs at `--test-concurrency=1`.
 */
const linkedIntoSpikeRoot = [
  "quartz",
  // Ours, and the reason this is a directory rather than a list of files: the real
  // config registers our plugins by relative path (`./prepper/validation`), resolved
  // against the working directory. Linking the whole directory means a ticket that
  // registers a new plugin never has to come back and edit this list -- and every
  // remaining ticket registers one.
  "prepper",
  "node_modules",
  "package.json",
  "quartz.ts",
  "globals.d.ts",
  "index.d.ts",
  "tsconfig.json",
  "quartz.config.default.yaml",
]

const built = new Map<string, Promise<EmittedSite>>()

/**
 * Build a fixture vault with extra plugins in the config, and return what came out.
 *
 * Repeated calls with the same fixture and the same plugins share one build, as
 * `buildFixture` does.
 */
export function buildWithSpikePlugins(
  fixture: string,
  plugins: SpikePlugin[],
): Promise<EmittedSite> {
  const vaultDir = path.isAbsolute(fixture) ? fixture : path.join(fixturesDir, fixture)
  assert.ok(
    fs.existsSync(vaultDir),
    `no fixture vault at "${vaultDir}". Fixtures live in ${fixturesDir}.`,
  )

  const key = JSON.stringify([vaultDir, plugins])
  const cached = built.get(key)
  if (cached) return cached

  const digest = createHash("sha256").update(key).digest("hex").slice(0, 8)
  const name = `${path.basename(vaultDir)}-spike-${digest}`
  const pending = runQuartzBuild({
    vaultDir,
    outputDir: path.join(buildOutputRoot, name),
    cwd: spikeRoot(name, plugins),
  })
  built.set(key, pending)
  return pending
}

/** A throwaway working directory whose only real file is a config with `plugins` added. */
function spikeRoot(name: string, plugins: SpikePlugin[]): string {
  const root = path.join(repoRoot, ".quartz-cache", "spike-roots", name)
  fs.rmSync(root, { recursive: true, force: true })
  fs.mkdirSync(root, { recursive: true })
  for (const entry of linkedIntoSpikeRoot) {
    const target = path.join(repoRoot, entry)
    // Most of these are upstream's files. A merge that renames one would otherwise leave
    // a dangling symlink here and fail deep inside Quartz with an unrelated message.
    assert.ok(fs.existsSync(target), `a spike build needs "${entry}", and the repo has none`)
    fs.symlinkSync(target, path.join(root, entry))
  }

  const config = YAML.parse(fs.readFileSync(path.join(repoRoot, "quartz.config.yaml"), "utf8"))
  for (const plugin of plugins) {
    const source = path.join(repoRoot, plugin.source)
    assert.ok(fs.existsSync(source), `no spike plugin at "${source}"`)
    config.plugins.push({
      source,
      enabled: true,
      ...(plugin.order === undefined ? {} : { order: plugin.order }),
    })
  }
  fs.writeFileSync(path.join(root, "quartz.config.yaml"), YAML.stringify(config))
  return root
}
