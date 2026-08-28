/**
 * Wikilinks and unwritten links, through seam 1.
 *
 * Two fixtures, two clusters. `wikilink-shapes` is every way Obsidian lets one existing
 * target be written; `unwritten-link` is a target that does not exist. The first is about
 * resolution being the same in Obsidian and in the app, the second about a gap being an
 * affordance rather than a failure.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import {
  buildFixture,
  validateFixture,
  type EmittedSite,
  type Page,
  type ValidationRun,
} from "../testing/build-fixture.ts"

/**
 * Every unwritten link on a page: what it points at, and what it reads as.
 *
 * `dataUnwrittenLink` is how hast names the `data-unwritten-link` attribute -- the
 * placeholder node's slug, which is the only handle the affordance carries.
 */
function unwrittenLinks(page: Page): { target: string; text: string; tag: string }[] {
  return page.selectAll(".unwritten-link", page.body).map((node) => ({
    target: String(node.properties.dataUnwrittenLink),
    text: page.text(undefined, node),
    tag: node.tagName,
  }))
}

describe("wikilink resolution", () => {
  let site: EmittedSite
  let lesson: Page

  before(
    async () => {
      site = await buildFixture("wikilink-shapes")
      lesson = site.page("lessons/hash-map-lookup-cost")
    },
    { timeout: 300_000 },
  )

  test("a wikilink resolves against the filename stem, whatever case it is written in", () => {
    // `[[hash-maps]]`, `[[Hash-Maps]]` and `[[hash-maps.md]]`: one target, three
    // spellings, and the extension optional. None of them is the target's `title`,
    // which is "Hash maps" and resolves nothing.
    const bare = lesson.links().slice(0, 3)
    assert.deepEqual(
      bare.map((link) => link.href),
      ["../terms/hash-maps", "../terms/hash-maps", "../terms/hash-maps"],
    )
    assert.deepEqual(
      bare.map((link) => link.text),
      ["hash-maps", "Hash-Maps", "hash-maps.md"],
    )
  })

  test("the pipe alias becomes the link text, and the link still points at the note", () => {
    const alias = lesson.links().find((link) => link.text === "hash table")
    assert.ok(alias, "no aliased link in " + lesson.text())
    assert.equal(alias.href, "../terms/hash-maps")
  })

  test("`[[note#Heading]]` points at that heading on the target page", () => {
    const anchored = lesson.links().find((link) => link.href?.includes("#"))
    assert.ok(anchored, "no anchored link in " + lesson.text())
    assert.equal(anchored.href, "../terms/hash-maps#load-factor")

    // The anchor is only a link if the target page carries the id it names.
    const term = site.page("terms/hash-maps")
    assert.equal(term.require("h2#load-factor").tagName, "h2")
  })

  test("`![[image.png]]` renders the attachment, as it does in Obsidian", () => {
    const img = lesson.require("img", lesson.body)
    assert.equal(img.properties.src, "../attachments/bucket-diagram.png")
    assert.ok(
      site.files.includes("attachments/bucket-diagram.png"),
      "the attachment itself was never emitted",
    )
  })

  test("a vault whose links all resolve has nothing to say about them", () => {
    assert.equal(site.exitCode, 0, site.log)
    assert.match(site.log, /no violations in 2 notes/)
  })
})

describe("an unwritten link", () => {
  let site: EmittedSite
  let run: ValidationRun
  let lesson: Page

  before(
    async () => {
      site = await buildFixture("unwritten-link")
      run = await validateFixture("unwritten-link")
      lesson = site.page("lessons/hash-map-lookup-cost")
    },
    { timeout: 300_000 },
  )

  test("it renders marked and unclickable, and the build still succeeds", () => {
    assert.equal(site.exitCode, 0, site.log)

    assert.deepEqual(
      unwrittenLinks(lesson).map((link) => link.target),
      ["open-addressing", "robin-hood-hashing", "open-addressing"],
    )
    // Not an anchor at all, so there is nothing to click and nothing to click *to*.
    assert.deepEqual(new Set(unwrittenLinks(lesson).map((link) => link.tag)), new Set(["span"]))
    // And everything still an anchor points at something the build emitted. Stated as a
    // set rather than a list because the fact is "every surviving link works", not the
    // order the author happened to write them in.
    assert.deepEqual(
      new Set(lesson.links().map((link) => link.href)),
      new Set(["../terms/hash-maps", "../cuckoo-hashing", ".././tags/hashing", "../terms/"]),
    )
  })

  test("a page Quartz generates is not an unwritten note", () => {
    // A tag and a folder are both *addressed* at emit time from no file on disk -- so
    // neither is in `ctx.allSlugs`, and a naive existence check marks every tagged note
    // and every folder link broken. Nobody can write `tags/hashing.md` or `terms/index.md`
    // to fix it, which is what makes this a bug and not a gap: the affordance would be
    // pointing at work that cannot be done.
    for (const generated of ["tags/hashing", "terms/index"]) {
      assert.ok(
        !unwrittenLinks(lesson).some((link) => link.target === generated),
        `${generated} was marked unwritten`,
      )
    }
    // Only the folder actually gets a page. `tag-page` is disabled (13): the build owns
    // `tags` -- it derives the field from `topic` to feed search -- and the Term page is
    // the canonical topic index, so `/tags/hashing` would be a second one at a second URL.
    // An inline `#hashing` is outside the vault's vocabulary altogether, and that it now
    // addresses a page the site does not emit is a fact about the tag, not about this rule.
    assert.ok(site.hasPage("terms/index"), "terms/index was never emitted")
    assert.ok(!site.hasPage("tags/hashing"), "tags/hashing was emitted after all")
    // Still anchors, so still clickable -- the half that `unwrittenLinks` cannot see.
    const hrefs = lesson.links().map((link) => link.href)
    assert.ok(hrefs.includes(".././tags/hashing"), `no live tag link in ${hrefs.join(", ")}`)
    assert.ok(hrefs.includes("../terms/"), `no live folder link in ${hrefs.join(", ")}`)
  })

  test("the mark is styled, so a gap reads as a gap and not as prose", () => {
    // The class is only half of "marked": the site has to ship a rule for it, or the
    // reader sees ordinary text. Quartz extracts a plugin's inline CSS into its own
    // hashed stylesheet, so the question is whether any emitted stylesheet carries it.
    const styled = site.files.filter(
      (f) => f.endsWith(".css") && site.file(f).includes(".unwritten-link"),
    )
    assert.equal(styled.length, 1, `emitted stylesheets carrying the mark: ${styled.length}`)
    assert.match(lesson.html, new RegExp(styled[0]))
  })

  test("the text the author wrote survives, alias included", () => {
    assert.deepEqual(
      unwrittenLinks(lesson).map((link) => link.text),
      ["open-addressing", "Robin Hood hashing", "open-addressing"],
    )
  })

  test("it produces a warning, not an error", () => {
    assert.deepEqual(
      run.violations.map((v) => `${v.severity} ${v.rule} ${v.note}`),
      [
        "warning unwritten-link lessons/hash-map-lookup-cost.md",
        "warning unwritten-link lessons/hash-map-lookup-cost.md",
      ],
    )
    assert.deepEqual(run.violations.map((v) => v.message).sort(), [
      "unwritten link to `open-addressing`: nothing in the vault answers to that name yet",
      "unwritten link to `robin-hood-hashing`: nothing in the vault answers to that name yet",
    ])
  })

  test("a vault whose only violations are warnings exits zero", () => {
    // The severity contract, end to end: a warning marks intent, and intent never fails
    // a build. This is the first rule in the spine that warns.
    assert.equal(run.exitCode, 0, run.output)
    assert.match(run.output, /0 errors, 2 warnings in 2 notes/)
  })

  test("one gap pointed at twice is one violation, not two", () => {
    assert.equal(run.violations.filter((v) => v.message.includes("open-addressing")).length, 1)
  })

  test("an embed of an unwritten note is left to the transform that owns embeds", () => {
    // `![[cuckoo-hashing]]` is not an unwritten *link*, so it neither becomes this
    // affordance nor warns: an embed whose target is missing degrades on its own terms
    // and errs. Rewriting the anchor inside a transclude would also break the embed
    // outright -- `renderPage` reads that anchor's `data-slug` to find what to splice in,
    // and losing it makes a page report a circular transclusion of itself.
    const embed = lesson.require("blockquote.transclude", lesson.body)
    assert.equal(embed.properties["dataUrl"], "cuckoo-hashing")
    assert.equal(lesson.select("a", embed)?.properties.dataSlug, "cuckoo-hashing")
    assert.ok(
      !run.violations.some((v) => v.message.includes("cuckoo-hashing")),
      "the embed warned as though it were a link",
    )
  })

  test("the unwritten target is a placeholder node in the link graph", () => {
    // Nothing is invented for it: the slug the target would have had is already an
    // outgoing edge of the note that leaned on it, which is what lets the authoring
    // queue rank an unwritten note by how much writing points at it.
    const links = site.notes["lessons/hash-map-lookup-cost"].links
    for (const placeholder of ["open-addressing", "robin-hood-hashing", "cuckoo-hashing"]) {
      assert.ok(links.includes(placeholder), `${placeholder} is not an edge of the linking note`)
    }
  })

  test("a placeholder node enters neither the Library index nor search", () => {
    // Both read `contentIndex.json` -- the index is its entries and search is built from
    // them -- so having no entry of its own is the whole of the guarantee.
    for (const placeholder of ["open-addressing", "robin-hood-hashing", "cuckoo-hashing"]) {
      assert.ok(!(placeholder in site.contentIndex), `${placeholder} is in the content index`)
      assert.ok(!site.hasPage(placeholder), `${placeholder} was given a page`)
    }
    assert.deepEqual(site.noteSlugs(), ["lessons/hash-map-lookup-cost", "terms/hash-maps"])
  })
})
