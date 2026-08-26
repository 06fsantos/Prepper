import test, { describe, before } from "node:test"
import assert from "node:assert"

import * as fs from "node:fs"

import { buildFixture, rebuildFixture, type EmittedSite } from "./build-fixture"

describe("seam 1: build(fixtureVault) -> emitted site", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("minimal-vault")
    },
    { timeout: 120_000 },
  )

  test("a directory of Markdown builds", () => {
    assert.equal(site.exitCode, 0, site.log)
  })

  test("every note in the vault gets a page, at type/filename", () => {
    assert.deepEqual(site.noteSlugs(), ["lessons/binary-search-basics", "terms/binary-search"])
    for (const slug of site.noteSlugs()) assert.ok(site.hasPage(slug))
  })

  describe("emitted HTML", () => {
    test("the note's title is rendered", () => {
      const page = site.page("lessons/binary-search-basics")
      assert.equal(page.text("h1"), "Binary search, from first principles")
    })

    test("the note's prose is rendered", () => {
      const page = site.page("lessons/binary-search-basics")
      assert.match(page.text(), /needs the range sorted/)
    })

    test("a wikilink resolves to the note it names, under the alias it was given", () => {
      const page = site.page("lessons/binary-search-basics")
      assert.deepEqual(
        page.links().map(({ href, text }) => ({ href, text })),
        [
          { href: "../terms/binary-search", text: "Binary search" },
          { href: "../terms/binary-search", text: "binary-search" },
        ],
      )
    })

    test("Quartz's heading permalink anchors are not counted as the author's links", () => {
      const page = site.page("lessons/binary-search-basics")
      // The fixture's H2 gets a permalink anchor; only the two wikilinks are the
      // author's, and one of them is inside that H2's section.
      assert.equal(page.links().length, 2)
      assert.ok(page.links({ headingAnchors: true }).length > 2)
    })

    test("markup is queryable by CSS selector", () => {
      const page = site.page("lessons/binary-search-basics")
      assert.equal(page.select("code")?.tagName, "code")
      assert.equal(page.text("code"), "O(log n)")
    })

    test("asking for a page that was not emitted fails loudly", () => {
      assert.throws(() => site.page("lessons/no-such-lesson"), /no emitted file/)
    })
  })

  describe("contentIndex.json", () => {
    test("carries one entry per note in the vault, keyed by slug", () => {
      assert.deepEqual(Object.keys(site.notes).sort(), [
        "lessons/binary-search-basics",
        "terms/binary-search",
      ])
    })

    test("carries the note's title and the notes it links to", () => {
      const entry = site.notes["lessons/binary-search-basics"]
      assert.equal(entry.title, "Binary search, from first principles")
      // Two wikilinks in the prose, one entry here: the index records which notes a
      // note points at, not how many times.
      assert.deepEqual(entry.links, ["terms/binary-search"])
    })

    test("carries the note's prose, which is what search reads", () => {
      const entry = site.notes["lessons/binary-search-basics"]
      assert.match(entry.content, /needs the range sorted/)
    })
  })

  describe("the build is a pure function of the vault", () => {
    // These two need a *second* build, so they use `rebuildFixture` rather than
    // `buildFixture`, which is memoised and would hand back the first one.
    test("a rerun emits byte-for-byte the same site", async () => {
      const again = await rebuildFixture("minimal-vault")
      assert.equal(again.exitCode, 0, again.log)
      assert.deepEqual(again.files, site.files)
      for (const file of site.files.filter((f) => f.endsWith(".html") || f.endsWith(".json"))) {
        assert.equal(again.file(file), site.file(file), `${file} differs between builds`)
      }
    })

    test("nothing the build writes goes back into the vault", async () => {
      const listing = () => fs.readdirSync(site.vaultDir, { recursive: true }).sort()
      const before = listing()
      await rebuildFixture("minimal-vault")
      assert.deepEqual(listing(), before)
    })
  })
})
