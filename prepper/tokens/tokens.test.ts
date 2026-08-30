/**
 * The token layer, through seam 1 -- and **only its delivery**.
 *
 * There is almost nothing asserted here on purpose. The tokens are a vocabulary, not a rule
 * set: there is nothing about them for a test to state that the stylesheet does not already
 * state better, and a test that re-listed the roles or pinned a derived hex would be a second,
 * weaker copy of `tokens.ts` that fails every time the seed is turned.
 *
 * What is worth guarding is the **mechanism**, because it fails silently. Every colour in the
 * chrome reaches a page through a component stylesheet that Quartz collects from the
 * configured component list rather than from what a page rendered. If an upstream merge
 * changes that collection, every page loses the whole palette at once and falls back to
 * undefined custom properties -- and nothing else in the suite would notice, because no other
 * test reads the emitted CSS for anything but `prepper/reading`'s measure.
 *
 * So: a page goes in, and a link to a stylesheet that defines the role tokens comes out.
 * Appearance is not asserted anywhere, here or elsewhere.
 *
 * The second test is the exception the motion subsystem earned. Motion is the one subsystem
 * ADR 0003 originally refused, and the terms of the reversal are that the role set is derived
 * wholesale rather than picked -- so what it states is the *shape* of the set, not its values.
 * Where motion may and may not be spent is `motion.test.ts`, which is a different claim
 * entirely and reads two other fixtures to make it.
 *
 * It reads `minimal-vault` rather than a fixture of its own because it asks nothing of the
 * vault -- the claim is about every laid-out page, and the smallest vault there is emits one.
 * `validation.test.ts` reuses it the same way, for the same reason.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import { buildFixture, type EmittedSite, type Page } from "../testing/build-fixture.ts"

/** Every stylesheet the page links, in head order, as emitted paths. */
function stylesheets(page: Page): string[] {
  return (
    page
      .selectAll('link[rel="stylesheet"]', page.tree)
      .map((link) => link.properties.href)
      .filter((href): href is string => typeof href === "string")
      .filter((href) => !href.startsWith("http"))
      // Relative to the page, which is a directory deep; the site is keyed from its root.
      .map((href) => href.replace(/^(\.\.?\/)+/, ""))
  )
}

describe("the chrome's design tokens", () => {
  let site: EmittedSite

  before(
    async () => {
      site = await buildFixture("minimal-vault")
    },
    { timeout: 120_000 },
  )

  test("an emitted page links a stylesheet that defines the Material role tokens", () => {
    const page = site.page("lessons/binary-search-basics")
    const linked = stylesheets(page)

    // One of the linked stylesheets holds the layer. Which file it is depends on a content
    // hash, so it is found by what it says rather than by name.
    const carrying = linked.filter((href) => site.file(href).includes("--md-sys-color-surface:"))
    assert.equal(
      carrying.length,
      1,
      `exactly one linked stylesheet defines the role tokens; linked:\n  ${linked.join("\n  ")}`,
    )

    // The five subsystems that are adopted, one probe each -- and the alias layer, which is
    // what makes Quartz's own nine names resolve to a role rather than to a hex.
    const css = site.file(carrying[0])
    for (const declaration of [
      "--md-sys-color-primary:",
      "--md-sys-typescale-label-medium-size:",
      "--md-sys-shape-corner-small:",
      "--md-sys-elevation-level2:",
      "--md-sys-motion-easing-standard:",
      "--lightgray:var(--md-sys-color-outline-variant)",
    ]) {
      assert.ok(css.includes(declaration), `the token layer declares \`${declaration}\``)
    }
  })

  test("the motion roles are the whole set, not a subset somebody liked", () => {
    // Motion is the one subsystem this file was originally written to say had been *refused*,
    // and the shape of the reversal matters: the tokens are derived from Google's tables
    // wholesale, the way the colours are derived from the seed, rather than picked. A
    // hand-picked subset would make this module inconsistent with its own stated method, and
    // the first consumer wanting a duration the module declined to publish would invent one.
    //
    // What is asserted is the *shape* of the set rather than its values -- sixteen durations
    // in four named families of four, ten easings, each a curve -- because pinning the numbers
    // here would be a second, weaker copy of `tokens.ts`. That the durations ascend is the one
    // property worth checking: it is what makes them a scale rather than a list, and a
    // mistyped step is exactly what it catches.
    const page = site.page("lessons/binary-search-basics")
    const css = stylesheets(page)
      .map((href) => site.file(href))
      .find((sheet) => sheet.includes("--md-sys-color-surface:"))
    assert.ok(css, "no stylesheet carries the token layer")

    const durations = [...css.matchAll(/--md-sys-motion-duration-([\w-]+?)(\d):([^;}]+)/g)]
    assert.equal(durations.length, 16, "four families of four")
    assert.deepEqual(
      [...new Set(durations.map((match) => match[1]))],
      ["short", "medium", "long", "extra-long"],
      "the duration families are not Material's",
    )
    assert.deepEqual(
      [...new Set(durations.map((match) => match[2]))],
      ["1", "2", "3", "4"],
      "a family is not four steps",
    )

    // Ascending across the whole set, in the order the module emits them: short1 is the
    // shortest thing in the vocabulary and extra-long4 the longest. `lightningcss` rewrites
    // `200ms` as `.2s`, so the unit is read rather than assumed.
    const milliseconds = durations.map(([, , , value]) => {
      const found = value.trim().match(/^([\d.]+)(ms|s)$/)
      assert.ok(found, `a duration that is not a time: ${value}`)
      return Number(found[1]) * (found[2] === "s" ? 1000 : 1)
    })
    assert.deepEqual(
      milliseconds,
      [...milliseconds].sort((a, b) => a - b),
      `the duration scale does not ascend: ${milliseconds.join(", ")}`,
    )

    const easings = [...css.matchAll(/--md-sys-motion-easing-([\w-]+):([^;}]+)/g)]
    assert.equal(easings.length, 10, "the easing roles are not Material's ten")
    for (const [, name, curve] of easings) {
      assert.match(curve, /cubic-bezier\(|linear/, `${name} is not a curve: ${curve}`)
    }
  })
})
