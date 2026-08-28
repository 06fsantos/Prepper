/**
 * The token layer, through seam 1 -- and **only its delivery**.
 *
 * There is one assertion here on purpose. The tokens are a vocabulary, not a rule set: there
 * is nothing about them for a test to state that the stylesheet does not already state
 * better, and a test that re-listed the roles or pinned a derived hex would be a second,
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

    // The four subsystems that were adopted, one probe each -- and the alias layer, which is
    // what makes Quartz's own nine names resolve to a role rather than to a hex.
    const css = site.file(carrying[0])
    for (const declaration of [
      "--md-sys-color-primary:",
      "--md-sys-typescale-label-medium-size:",
      "--md-sys-shape-corner-small:",
      "--md-sys-elevation-level2:",
      "--lightgray:var(--md-sys-color-outline-variant)",
    ]) {
      assert.ok(css.includes(declaration), `the token layer declares \`${declaration}\``)
    }

    // The subsystem that was refused. Motion is absent by decision, not by omission, and an
    // absence nothing asserts is one somebody adds back as an obvious gap.
    assert.ok(!/--md-sys-motion-/.test(css), "no motion, easing or duration token is defined")
  })
})
