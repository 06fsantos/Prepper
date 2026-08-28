/**
 * The Vault report, through seam 1.
 *
 * One fixture, `vault-report`: a vault with three notes nobody has written yet, leaned on
 * by different fields and different numbers of notes; a Term minted with an empty body; a
 * `draft: true` sketch whose body links are speculation; an attachment that is shown and
 * one that is not; a Reference nothing links to; and a Term nothing is filed under. Every
 * assertion here is a fact about the page the build wrote.
 *
 * The self-reference half -- that the report contributes no edges and does not appear in
 * `contentIndex.json` -- is pinned in `../testing/mechanisms.test.ts` as well, against the
 * spike that proved the mechanism. It is asserted here too, on the real report rather than
 * on a stand-in, because it is the failure that prints nothing when it happens.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import {
  buildFixture,
  rebuildFixture,
  type EmittedSite,
  type Page,
} from "../testing/build-fixture.ts"

/** One queue row, flattened to the facts a test states about it. */
interface Row {
  target: string
  reason: string
  typed: number
  total: number
  sources: string[]
}

function rows(page: Page): Row[] {
  return page.selectAll("li.queue-row", page.tree).map((row) => ({
    target: String(row.properties["dataTarget"]),
    reason: String(row.properties["dataReason"]),
    typed: Number(row.properties["dataTyped"]),
    total: Number(row.properties["dataTotal"]),
    sources: page
      .selectAll("ul.queue-sources a", row)
      .map((a) => `${String(a.properties["dataEdge"])} <- ${String(a.properties.href)}`),
  }))
}

function hygiene(page: Page, section: string): string[] {
  const list = page.select(`section#${section}`, page.tree)
  assert.ok(list, `the report has no #${section} section`)
  return page
    .selectAll("li", list)
    .map((item) => String(item.properties["dataSlug"] ?? item.properties["dataFile"]))
}

describe("the Vault report", () => {
  let site: EmittedSite
  let page: Page

  before(
    async () => {
      site = await buildFixture("vault-report")
      page = site.page("report")
    },
    { timeout: 300_000 },
  )

  test("every build emits it, and prints exactly one line pointing at it", () => {
    assert.ok(site.files.includes("report.html"), "no report.html was emitted")

    const lines = site.log.split("\n").filter((line) => line.startsWith("[prepper] report:"))
    assert.equal(lines.length, 1, `expected one report line, got:\n${lines.join("\n")}`)
    assert.match(lines[0], /\/report/)
  })

  test("the report line is not a validation line", () => {
    // The two channels never share a line: one shouts, the other points. Nothing is wrong
    // when the report prints, so nothing it prints may read as a severity.
    const line = site.log.split("\n").find((l) => l.startsWith("[prepper] report:"))!
    assert.doesNotMatch(line, /error|warning|violation/i)
  })

  test("the queue ranks typed above total, with no constant deciding by how much", () => {
    // `robin-hood-hashing` has two `practices` obligations; `open-addressing` has three
    // mentions and no obligation at all. One committed field beats any number of
    // sentences, and `linear-probing` (one obligation, two links) beats the empty Term
    // (one obligation, one link) on the total that breaks the tie.
    assert.deepEqual(
      rows(page).map((row) => [row.target, row.typed, row.total]),
      [
        ["robin-hood-hashing", 2, 4],
        ["linear-probing", 1, 2],
        ["terms/eviction", 1, 1],
        ["open-addressing", 0, 3],
      ],
    )
  })

  test("each row prints its breakdown", () => {
    const text = page.text(
      "li.queue-row[data-target='robin-hood-hashing'] .queue-breakdown",
      page.tree,
    )
    assert.equal(text, "2 typed of 4 total: 2 practices, 2 relates-to")
  })

  test("each row links to the notes that link to it", () => {
    // An unwritten note has no page of its own, so a row that only counted would be a
    // number nobody can click through to.
    const row = rows(page).find((r) => r.target === "robin-hood-hashing")!
    assert.deepEqual(row.sources, [
      "practices <- ./problems/lru-cache",
      "practices <- ./problems/two-sum",
      "relates-to <- ./lessons/cache-eviction",
      "relates-to <- ./lessons/hash-map-lookup-cost",
    ])
  })

  test("a Term minted with an empty body is backlog, and links to its own page", () => {
    const row = rows(page).find((r) => r.target === "terms/eviction")!
    assert.equal(row.reason, "empty-term")

    const name = page.require("li.queue-row[data-reason='empty-term'] .queue-name a", page.tree)
    assert.equal(name.properties.href, "./terms/eviction")
  })

  test("a draft's body links do not contribute to the ranking", () => {
    // `speculative-idea` is named only by the draft, so it is not backlog at all; and
    // `open-addressing`, which the draft also names, is counted three times rather than
    // four.
    const queued = rows(page).map((row) => row.target)
    assert.ok(!queued.includes("speculative-idea"), `speculative-idea should not be queued`)
    assert.equal(rows(page).find((r) => r.target === "open-addressing")!.total, 3)
  })

  test("a queue short enough to stand open is not folded at all", () => {
    assert.equal(page.select("details.queue-tail", page.tree), undefined)
  })

  test("hygiene lists the attachment nothing shows", () => {
    assert.deepEqual(hygiene(page, "unreferenced-attachments"), ["attachments/unused-diagram.png"])
  })

  test("hygiene lists the Library note nothing links to", () => {
    assert.deepEqual(hygiene(page, "notes-with-no-inbound-links"), [
      "references/interview-notes-index",
    ])
  })

  test("hygiene lists the Term with no inbound topic edge", () => {
    // Narrowed from "nothing points at it": `terms/probing` is named in a sentence and
    // still has nothing filed under it, which is the fact worth reporting.
    assert.deepEqual(hygiene(page, "terms-with-no-topic-edge"), ["terms/probing"])
  })

  test("building twice leaves the hygiene section unchanged", async () => {
    // The silent failure this is here for: were the report's own links graph edges, every
    // orphan it lists would gain an inbound link and this section would empty itself.
    const again = await rebuildFixture("vault-report")
    const second = again.page("report")
    for (const section of [
      "unreferenced-attachments",
      "notes-with-no-inbound-links",
      "terms-with-no-topic-edge",
    ]) {
      assert.deepEqual(hygiene(second, section), hygiene(page, section))
    }
  })

  test("the report is unlisted: no edges, no index entry, no search", () => {
    assert.ok(!reportSlugIn(site.contentIndex), "the report reached contentIndex.json")
    assert.ok(
      !site.linkGraph.nodes.some((node) => node.slug === "report"),
      "the report became a link-graph node",
    )
    assert.ok(
      !site.linkGraph.edges.some((edge) => edge.source === "report" || edge.target === "report"),
      "the report contributed an edge",
    )
    for (const entry of Object.values(site.contentIndex)) {
      assert.ok(!entry.links.includes("report"), `${entry.slug} links to the report`)
    }
  })
})

function reportSlugIn(index: Record<string, unknown>): boolean {
  return Object.keys(index).some((slug) => slug === "report")
}

/**
 * The long tail, on a vault that has one.
 *
 * `long-authoring-queue` is twelve unwritten notes leaned on identically by one Lesson, so
 * the ranking has nothing to separate them and the whole queue is tail. The fact under
 * test is that the tail is **folded and not capped**: a queue that dropped its remainder
 * would quietly stop mentioning the notes with one inbound link each, which is most of
 * what a backlog is.
 */
describe("the authoring queue's long tail", () => {
  let page: Page

  before(
    async () => {
      page = (await buildFixture("long-authoring-queue")).page("report")
    },
    { timeout: 300_000 },
  )

  test("the tail is folded behind a disclosure, and nothing is dropped", () => {
    const open = page.selectAll("section#authoring-queue > ol.queue > li.queue-row", page.tree)
    const tail = page.require("details.queue-tail", page.tree)
    const folded = page.selectAll("li.queue-row", tail)

    assert.equal(open.length, 10)
    assert.deepEqual(
      folded.map((row) => String(row.properties["dataTarget"])),
      ["swiss-tables", "two-choice-hashing"],
    )
    assert.equal(open.length + folded.length, 12)
    assert.match(page.text("details.queue-tail summary", page.tree), /^2 more$/)
  })
})
