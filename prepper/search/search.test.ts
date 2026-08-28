/**
 * The vendored search component, through seam 1.
 *
 * Two of the three facts here are about a **client script**, and a client script has no
 * seam 1 of its own: nothing in this repo runs a browser. So they are asserted on the
 * emitted script and the emitted stylesheet -- which are output of the build like any
 * page, and are exactly what does or does not reach the reader. It is the weakest kind of
 * test in the suite and it is stated as such on purpose: what it can prove is that the
 * altered renderer shipped, not that it renders.
 */
import assert from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { before, describe, test } from "node:test"

import { buildFixture, repoRoot, type EmittedSite } from "../testing/build-fixture.ts"

/** Every client script the build emitted, concatenated. Their names are content-hashed. */
function emittedScripts(site: EmittedSite): string {
  return site.files
    .filter((f) => f.endsWith(".js"))
    .map((f) => site.file(f))
    .join("\n")
}

/** Every stylesheet the build emitted, concatenated. Same reason. */
function emittedStyles(site: EmittedSite): string {
  return site.files
    .filter((f) => f.endsWith(".css"))
    .map((f) => site.file(f))
    .join("\n")
}

describe("search, vendored", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("topic-index")
    },
    { timeout: 300_000 },
  )

  test("the affordance is on the page, wired to the index the build emits", () => {
    assert.equal(site.exitCode, 0, site.log)

    const page = site.page("lessons/hash-map-lookup-cost")
    const search = page.require(".search", page.tree)
    assert.ok(page.select(".search-bar", search), "no search bar")

    // The layout div is the handshake between the component and its script: the script
    // reads both attributes off it, so a rename here silently disables search.
    const layout = page.require(".search-layout", search)
    assert.equal(layout.properties["dataPreview"], "true")
    assert.equal(layout.properties["dataFieldPriority"], '["title","content","tags"]')

    // And the index it reads is Quartz's own, emitted unchanged in shape.
    assert.ok(site.files.includes("static/contentIndex.json"), "no contentIndex.json")
  })

  test("a result carries a type chip, derived from the slug", () => {
    const scripts = emittedScripts(site)

    // Type is the directory, so the chip costs the emitter nothing: `slug` is already in
    // hand where a result is rendered. All five labels ship, because a query for "binary
    // search" matches four types at once and a partial chip set is worse than none.
    for (const label of ["Lesson", "Reference", "Problem", "Term", "Cheat sheet"]) {
      assert.ok(scripts.includes(`"${label}"`), `no type chip label for ${label}`)
    }
    assert.match(scripts, /prepperTypeChip/)

    // The class is only half of it: the site has to ship a rule for it, or the chip reads
    // as loose text beside the title.
    assert.match(emittedStyles(site), /\.result-type\b/)
  })

  test("a `problems/` result renders with no excerpt", () => {
    // The other half of "a sealed section stays in the index". The excerpt is the leak, so
    // the excerpt is what goes -- the result itself appears, and the reader opens the note
    // and unseals at their own choice.
    assert.match(emittedScripts(site), /prepperSuppressesExcerpt/)
  })

  test("the preview pane stays on, because the seal is markup", () => {
    // The pane injects a result's real HTML. `prepper/problems` seals with a `<details>`
    // rather than a script for exactly this reason, so the fallback -- turning the pane
    // off for `problems/` -- is not needed, and turning it off globally never was: it is a
    // real affordance for the other four types.
    const problem = site.page("problems/two-sum")
    const seals = problem.selectAll("details", problem.body)
    assert.ok(seals.length > 0, "a Problem emitted no sealed section")
    for (const seal of seals) {
      assert.ok(!("open" in seal.properties), "a seal is open in the markup")
    }
  })

  test("the component is vendored, not also installed", () => {
    // The vendoring line, stated where it can fail. `prepper/search/vendor/` holds the
    // altered assets, and the npm package is dropped -- two copies of a search component,
    // one of them silently unused, is the state this is here to notice.
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      dependencies: Record<string, string>
    }
    assert.ok(
      !("@quartz-community/search" in pkg.dependencies),
      "the vendored component is still an npm dependency as well",
    )
  })
})
