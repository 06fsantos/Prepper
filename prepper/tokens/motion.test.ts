/**
 * Motion, through seam 1 -- and mostly the one thing motion is not allowed to touch.
 *
 * `prepper/tokens` now publishes Material's motion roles, which makes this the first token
 * subsystem in the build whose misuse is a **correctness** problem rather than a matter of
 * taste. Three of this app's mechanisms are `<details>` elements -- the Problem seal, a note's
 * heading folds, the rail's topic tree -- and every one of them rests on the same three
 * properties: shut by the HTML specification before a stylesheet loads, before a script runs,
 * and inside Quartz's search preview pane, which injects a result's real HTML and runs none of
 * its scripts. An eased `<details>` is a script-dependent seal wearing a costume, and the way
 * it would arrive is somebody adding a perfectly reasonable `transition` to a fold.
 *
 * So the prohibition is asserted rather than written down. What is checked is the **emitted
 * stylesheet**, every sheet the build wrote, upstream's and ours: no rule that applies a
 * `transition` or an `animation` may have a `<details>` or a `<summary>` as its subject.
 *
 * ## The two fixtures, and why the markup is read at all
 *
 * The rule set is the same whatever vault is built, but "is this selector's subject a
 * `<details>`" is a question about markup: `details.prepper-topic-fold` and
 * `summary.prepper-topic-fold-row` are class selectors, and only the emitted pages know which
 * classes are on a disclosure element. So the elements are read off real pages, and three
 * fixtures are built because between them they emit all three kinds -- `problem-sections` the
 * seal, `folded-headings` a note's own headings, and `topic-index` the rail's tree, whose
 * `prepper-topic-fold` is now the umbrella fold and the Cheat sheets list (a rail with neither
 * an umbrella nor a Cheat sheet folds nothing).
 *
 * ## "Or to anything inside one", and the honest scope of it
 *
 * The second half of the prohibition is checked for **our** stylesheets, which are the ones
 * this repo can be held to. Quartz's base stylesheet transitions `a`, `blockquote` and a
 * heading's permalink anchor, and those elements are inside a fold whenever a folded section
 * holds a link -- which is nearly always. Fading a link's colour is not an eased disclosure,
 * and this repo does not fork upstream to stop it. What our own sheets may not do is animate
 * anything a fold contains, because that is where a "just the chevron" or "just the summary
 * row" transition would actually be written.
 *
 * ## And reduced motion
 *
 * Disabled, not shortened, and for the whole build rather than for our own rules: a reader who
 * has asked for no motion is not asking about module boundaries.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import type { Element } from "hast"

import { buildFixture, classesOf, type EmittedSite, type Page } from "../testing/build-fixture.ts"
import { rules, subjects, type Rule } from "../testing/stylesheets.ts"

/** Every stylesheet the build emitted, as text, keyed by name. */
function sheets(site: EmittedSite): { name: string; css: string }[] {
  return site.files
    .filter((file) => file.endsWith(".css"))
    .map((file) => ({ name: file, css: site.file(file) }))
}

/** A stylesheet is ours if it says so: every class and key we emit carries the prefix. */
function ours(sheet: { css: string }): boolean {
  return sheet.css.includes("prepper-")
}

/**
 * Every rule in the build that actually applies motion.
 *
 * `transition: none` and `animation: none` are how motion is *taken away* -- the
 * reduced-motion block is nothing but those -- so a rule is only animating if what it declares
 * is something other than `none`.
 */
function animating(all: Rule[]): Rule[] {
  return all.filter((rule) =>
    [...rule.body.matchAll(/(?:^|[;{\s])(transition|animation)(-[\w-]+)?:([^;}]+)/g)].some(
      (match) => !/^\s*none\s*(!important)?\s*$/.test(match[3]),
    ),
  )
}

/** An element reduced to what a compound selector can be matched against. */
interface Shape {
  tag: string
  classes: string[]
}

function shape(element: Element): Shape {
  return { tag: element.tagName, classes: classesOf(element) }
}

/**
 * Whether a selector's subject could land on an element of this shape.
 *
 * Only the tag and the classes are read: an id, an attribute or a pseudo-class narrows a
 * selector further, and ignoring them makes this answer "could" rather than "does". That is
 * the conservative direction for a prohibition -- a rule that might reach a fold is reported.
 *
 * The one thing that is *not* read the loose way is a **universal** subject. A rule has to
 * name what it is about before it can be said to animate it, and upstream's collapsed callout
 * -- `.callout.is-collapsed .callout-content>*` -- is a rule about the children of a callout's
 * body, which no disclosure of ours is or holds. Reading `*` as "every element on the page"
 * would make it an offender at every width, which is a false answer rather than a strict one.
 */
function couldMatch(subject: string, target: Shape): boolean {
  const tag = subject.match(/^[a-z][\w-]*/i)?.[0]
  const classes = [...subject.matchAll(/\.([\w-]+)/g)].map((match) => match[1])
  if (!tag && classes.length === 0) return false
  if (tag && tag !== target.tag) return false
  return classes.every((name) => target.classes.includes(name))
}

/** Every disclosure element on a page, and every element inside one. */
function folds(page: Page): { disclosures: Shape[]; inside: Shape[] } {
  const disclosures: Shape[] = []
  const inside: Shape[] = []
  for (const details of page.selectAll("details", page.tree)) {
    disclosures.push(shape(details))
    for (const child of page.selectAll("*", details)) {
      if (child.tagName === "summary") disclosures.push(shape(child))
      else inside.push(shape(child))
    }
  }
  return { disclosures, inside }
}

describe("motion, and the seal that never animates", () => {
  let site: EmittedSite
  let folded: EmittedSite
  let topicIndex: EmittedSite
  let disclosures: Shape[]
  let inside: Shape[]

  before(
    async () => {
      site = await buildFixture("problem-sections")
      folded = await buildFixture("folded-headings")
      topicIndex = await buildFixture("topic-index")

      const pages = [
        ...site.pageSlugs().map((slug) => site.page(slug)),
        ...folded.pageSlugs().map((slug) => folded.page(slug)),
        ...topicIndex.pageSlugs().map((slug) => topicIndex.page(slug)),
      ].map(folds)

      disclosures = pages.flatMap((page) => page.disclosures)
      inside = pages.flatMap((page) => page.inside)
    },
    { timeout: 240_000 },
  )

  test("the three kinds of disclosure are all on the pages this reads", () => {
    // The prohibition is only as good as the markup it is checked against, and every one of
    // these is a `<details>` for the same reason: the shut state has to survive a stylesheet
    // that has not loaded, a script that has not run, and the search preview pane.
    const classes = new Set(disclosures.flatMap((element) => element.classes))
    for (const kind of ["problem-seal", "prepper-fold", "prepper-topic-fold"]) {
      assert.ok(classes.has(kind), `no ${kind} on any page read; classes: ${[...classes].sort()}`)
    }
  })

  test("no stylesheet in the build animates a details or a summary", () => {
    // Not "no stylesheet of ours": upstream is a remote this repo merges rather than edits, so
    // a transition arriving on a `<details>` from a merge is exactly the failure this catches.
    const offenders = sheets(site).flatMap((sheet) =>
      animating(rules(sheet.css))
        .filter((rule) =>
          subjects(rule).some((subject) =>
            disclosures.some((element) => couldMatch(subject, element)),
          ),
        )
        .map((rule) => `${sheet.name}: ${rule.selector}`),
    )
    assert.deepEqual(offenders, [], "a disclosure element is animated")
  })

  test("no stylesheet of ours animates anything inside a fold", () => {
    // Scoped to our own sheets on purpose -- see this file's header. Quartz's base stylesheet
    // fades a link's colour, and a folded section nearly always holds a link.
    const offenders = sheets(site)
      .filter(ours)
      .flatMap((sheet) =>
        animating(rules(sheet.css))
          .filter((rule) =>
            subjects(rule).some((subject) => inside.some((el) => couldMatch(subject, el))),
          )
          .map((rule) => `${sheet.name}: ${rule.selector}`),
      )
    assert.deepEqual(offenders, [], "one of our rules animates something inside a fold")
  })

  test("a reader who asked for no motion gets none, from any module", () => {
    // Disabled, not shortened. `!important` rather than source order, because the rules being
    // overruled are in every stylesheet the build links, ours last.
    const page = site.page("problems/two-sum")
    const linked = [...page.html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*rel="stylesheet"/g)]
      .map(([, href]) => href)
      .filter((href) => !href.startsWith("http"))
      .map((href) => site.file(href.replace(/^(\.\.\/)+/, "")))
      .join("\n")

    const stillness = rules(linked).filter((rule) =>
      rule.media.some((query) => /prefers-reduced-motion:\s*reduce/.test(query)),
    )
    assert.ok(stillness.length >= 1, "no reduced-motion block is emitted")

    const universal = stillness.filter((rule) => /(^|,)\s*\*/.test(rule.selector))
    assert.equal(universal.length, 1, "the block that stops everything is not one rule")
    for (const property of ["animation", "transition"]) {
      assert.match(
        universal[0].body,
        new RegExp(`${property}:\\s*none\\s*!important`),
        `${property} is not disabled outright`,
      )
    }
  })
})
