/**
 * The three Quartz mechanisms Prepper's design rests on, run.
 *
 * Each of these was cited from documentation and source before it was ever executed
 * ([ticket 02](../../.scratch/prepper-build/issues/02-spike-the-unrun-mechanisms.md)),
 * and each carries a decision that would have to change if it stopped being true. Two of
 * the three fail *quietly*: nothing crashes, the build stays green, and the site is
 * silently wrong. So they are asserted here rather than eyeballed, and
 * [`docs/upstream-merges.md`](../../docs/upstream-merges.md) points at this file as the
 * tripwire to read first when an upstream merge breaks something.
 *
 * The findings, written up:
 * [`.scratch/prepper-build/research/`](../../.scratch/prepper-build/research/).
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import { buildFixture, type EmittedSite } from "./build-fixture"
import { buildWithSpikePlugins } from "./spike-build"

describe("mechanism 1: a quiz fence body is re-parsed into real Markdown", () => {
  // The decision: one local remark plugin at `order: 25` re-parses fence bodies with
  // `self.parse()` and lets Quartz's own downstream transforms resolve what comes out --
  // Quartz's parser, Quartz's transforms, no second wikilink implementation of ours. If
  // the re-parse did not yield real wikilink nodes, that design falls back into ADR 0002.
  //
  // This was a spike plugin until ticket 09 shipped `prepper/quiz`, which is exactly the
  // handover `spike-build.ts` describes: the mechanism is now exercised through the
  // config the dev actually has. What is asserted here is still Quartz's behaviour rather
  // than ours -- that a re-parsed subtree is walked by OFM, by `crawl-links`, and by GFM
  // -- and `prepper/quiz/quiz.test.ts` is where the quiz block's own behaviour lives.
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("quiz-fence-wikilink")
    },
    { timeout: 120_000 },
  )

  test("the vault builds, with the quiz plugin actually loaded", () => {
    assert.equal(site.exitCode, 0, site.log)
    // A plugin Quartz cannot load is a warning and a skip, not a failure -- the fences
    // would then render as ordinary code blocks and every assertion below would be
    // confusing rather than clear about why. Matched on the loader's own wording, since
    // the build says "Skipping" about other things too.
    assert.ok(!/Could not (load|determine category for) plugin/.test(site.log), site.log)
  })

  test("a wikilink written inside a fence body renders as a resolved link", () => {
    const page = site.page("lessons/hash-map-lookup-cost")
    const quiz = page.require("prepper-quiz.quiz")
    assert.deepEqual(
      page.links({ scope: quiz }).map(({ href, text }) => ({ href, text })),
      [{ href: "../terms/collision-handling", text: "collision-handling" }],
    )
  })

  test("that link is an edge in the link graph, like any other body link", () => {
    // The lesson's prose never mentions collisions; the only path to this edge is
    // through the fence body.
    assert.deepEqual(site.notes["lessons/hash-map-lookup-cost"].links, [
      "terms/collision-handling",
      "terms/hash-map",
    ])
  })

  test("the fence body is Markdown, not an opaque string", () => {
    // The options were written as a GFM task list and each explanation as a blockquote,
    // and both were parsed by Quartz's own configuration -- which is the whole claim.
    // `prepper/quiz` unmakes the task list on the way out, so what proves the `[x]` was
    // read as a task marker is that exactly one option came out marked correct.
    const page = site.page("lessons/hash-map-lookup-cost")
    const quiz = page.require("prepper-quiz.quiz")
    assert.equal(page.selectAll("li.quiz-option", quiz).length, 3)
    assert.equal(page.selectAll('li.quiz-option[data-quiz-correct="true"]', quiz).length, 1)
    // The blockquote ships concealed -- an explanation is not shown until the reader has
    // answered -- so what it holds is asserted on the markup rather than on visible text.
    const explanation = page.require("blockquote.quiz-explanation", quiz)
    assert.equal(explanation.properties.hidden, true)
    assert.match(page.html, /The key hashes straight to its bucket\./)
  })

  test("the infostring survives to the emitted element", () => {
    // `data.hProperties` -> hast element attributes, through rehype-raw's reparse.
    // The browser half reads the type back off this attribute.
    const quiz = site.page("lessons/hash-map-lookup-cost").require("prepper-quiz.quiz")
    // hast normalises `data-*` attribute names to camelCase in `properties`; the
    // emitted HTML carries them hyphenated.
    assert.equal(quiz.properties.dataQuizId, "01M0Z900000000000000000022")
    assert.equal(quiz.properties.dataQuizType, "mcq")
    assert.match(
      site.page("lessons/hash-map-lookup-cost").html,
      /data-quiz-id="01M0Z900000000000000000022" data-quiz-type="mcq"/,
    )
  })
})

describe("mechanism 2: an embed of a note with no page leaks nothing", () => {
  // The decision: the Workshop boundary is airtight rather than merely policed, because
  // a Workshop note has no page for an embed to pull. The ADR 0002 amendment used this
  // to withdraw an accepted risk.
  //
  // The outcome holds; the mechanism the amendment named does not. Quartz v5 resolves
  // non-media embeds *at build time*, splicing the target's rendered content out of the
  // parsed corpus, not in the browser -- so what makes the boundary airtight is the
  // target being **filtered out of the corpus**, not merely being denied a page. See the
  // amendment to ADR 0002.
  //
  // The Workshop stand-in is therefore a note dropped by an actual *filter*, which is the
  // shape Prepper's own Library/Workshop split has to take. It filters on `workshop: true`
  // rather than on `draft`: ticket 03 disabled `@quartz-community/remove-draft` on
  // purpose, because a filter drops drafts before any emitter sees them and `draft: true`
  // must soften no validation rule. Asserting this guarantee through a filter the project
  // has committed to not running would prove nothing about the vault it ships.
  //
  // The pageless note sits in `notes/`, a directory the layout names no type for, and not
  // in `research/`. Ticket 06 shipped the real boundary, and it replaces an embed of a
  // *Workshop* note with the marked affordance before Quartz ever transcludes -- which is
  // the right rendering and would hide the mechanism this spike is the tripwire for. What
  // is asserted below is Quartz's behaviour when a note is out of the corpus for any
  // reason, so the note is kept out of reach of our own transform.
  let site: EmittedSite

  before(
    async () => {
      site = await buildWithSpikePlugins("embed-of-a-pageless-note", [
        { source: "prepper/testing/spikes/workshop-filter" },
      ])
    },
    { timeout: 120_000 },
  )

  test("the vault builds, and the pageless note gets no page", () => {
    assert.equal(site.exitCode, 0, site.log)
    assert.ok(!site.hasPage("notes/why-buckets-were-benchmarked-this-way"))
    assert.ok(site.hasPage("terms/hash-map"))
  })

  test("the control: embedding a note that has a page splices its content in, at build time", () => {
    // Without this, an empty box proves nothing -- it could just mean embeds never
    // render. It also dates the resolution: the target's prose is in the emitted HTML,
    // so nothing in the browser was needed to put it there.
    const page = site.page("lessons/hash-map-lookup-cost")
    assert.match(page.text(), /sonarcanary/)
    assert.match(page.html, /sonarcanary/)
  })

  test("the pageless note is out of the corpus, which is what the guarantee rests on", () => {
    // Not merely pageless: absent from what the build renders from. A note still in the
    // corpus would be spliced into the embed by the test above, page or no page.
    assert.ok(!("notes/why-buckets-were-benchmarked-this-way" in site.contentIndex))
  })

  test("embedding a note with no page renders an empty placeholder", () => {
    const page = site.page("lessons/hash-map-lookup-cost")
    const placeholder = page
      .selectAll("blockquote.transclude")
      .find((el) => el.properties.dataUrl === "why-buckets-were-benchmarked-this-way")
    assert.ok(placeholder, "no transclude placeholder for the pageless note")
    // It carries the target and a link to it, and no content of the target's.
    assert.equal(page.text(undefined, placeholder).includes("Load factor"), false)
  })

  test("nothing of the pageless note's body reaches the site at all", () => {
    for (const file of site.files.filter((f) => f.endsWith(".html") || f.endsWith(".json"))) {
      assert.ok(
        !site.file(file).includes("pineapplecanary"),
        `${file} carries content from a note with no page`,
      )
    }
  })
})

describe("mechanism 3: emitter output is outside the link graph", () => {
  // The decision: the Vault report is emitter output and never a virtual `content/`
  // file. Were its links crawled, the report would link to every orphan it lists, each
  // would gain an inbound link, and the hygiene section would erase itself on the second
  // build -- silently. The spike emitter links to every note, which is the shape that
  // would do it.
  let site: EmittedSite

  before(
    async () => {
      site = await buildWithSpikePlugins("emitter-output-and-the-graph", [
        { source: "prepper/testing/spikes/emitter-page-links" },
      ])
    },
    { timeout: 120_000 },
  )

  test("the emitter emitted a page, and it does link to the orphan", () => {
    assert.equal(site.exitCode, 0, site.log)
    const report = site.file("spike-report.html")
    assert.match(report, /href="\.\/terms\/orphaned-term"/)
    assert.match(report, /href="\.\/terms\/amortisation"/)
  })

  test("the emitted page is absent from contentIndex.json", () => {
    // Every other entry here is a page Quartz or Prepper *generated* through a seam that
    // does put it in the corpus -- a folder index, and `index`, the topic index the app
    // opens on (`prepper/home`). That is the contrast the assertion is drawing: generated
    // is not the same as emitted, and only emitter output is outside. There is no
    // `tags/index` because `tag-page` is disabled (13).
    assert.deepEqual(Object.keys(site.contentIndex).sort(), [
      "index",
      "lessons/index",
      "lessons/queue-amortisation",
      "terms/amortisation",
      "terms/index",
      "terms/orphaned-term",
    ])
  })

  test("its links are edges in no note's link graph", () => {
    for (const [slug, entry] of Object.entries(site.contentIndex)) {
      assert.deepEqual(
        entry.links.filter((link) => link.includes("spike-report")),
        [],
        `${slug} carries an edge from emitter output`,
      )
    }
  })

  test("the orphan is still an orphan afterwards", () => {
    // Which is the fact the hygiene section reports, and the one that would erase
    // itself on the second build if emitter output were crawled.
    const inbound = Object.entries(site.contentIndex)
      .filter(([, entry]) => entry.links.includes("terms/orphaned-term"))
      .map(([slug]) => slug)
    assert.deepEqual(inbound, [])
  })

  test("its text is in no note's search content", () => {
    for (const [slug, entry] of Object.entries(site.contentIndex)) {
      assert.ok(!entry.content.includes("Spike report"), `${slug} carries emitter output text`)
    }
  })
})
