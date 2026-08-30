/**
 * The bar's controls, audited as a set, through seam 1.
 *
 * Every control this app has now lives in one band across the top of every page, so the whole
 * of its keyboard and contrast story is decidable in one place -- which is the reason ticket
 * 10 waited for ticket 05 rather than being done control by control as each arrived. Six
 * controls, five of them icon-only, three of them upstream's or a community plugin's and
 * therefore not ours to re-render: what can be asserted about them is what they emit, what the
 * emitted stylesheet does to them, and what the token roles those rules name evaluate to.
 *
 * ## What is checked, and why each of these is a seam-1 question
 *
 * - **The set itself.** The controls are enumerated off the page rather than listed here, and
 *   the list below is the assertion. A seventh control taking a slot in `quartz.config.yaml`
 *   is a seventh control in this test's face, which is the only way an audit of "every control
 *   in the bar" survives the bar gaining one.
 * - **A name each.** An icon-only button with no accessible name is a button a screen reader
 *   reads out as "button".
 * - **The tab order.** Not simulated -- jsdom has no sequential focus navigation and a test
 *   that claimed to have pressed Tab six times would be inventing one. What is asserted is the
 *   three facts a browser computes that order from: every control is a natively focusable
 *   element, none is removed from the order (`tabindex="-1"`, `disabled`, `aria-hidden`), and
 *   none reorders it (a positive `tabindex`). Given those, the order **is** DOM order, and DOM
 *   order is asserted against the slots the bar is laid out in.
 * - **A focus ring, once, for all of them.** One rule whose subject is the bar rather than any
 *   control in it.
 * - **Contrast, in both themes, computed.** The rules name Material roles and the roles are
 *   derived from one seed, so the ratios are arithmetic over the emitted `--md-sys-color-*`
 *   values rather than numbers anybody eyeballed. Both schemes, because the source document
 *   that started this effort only ever looked at the dark one.
 * - **No state in colour alone.** Two controls in the bar have a state to report, and both
 *   report it by swapping a glyph with `display`.
 *
 * ## Where the audit stops
 *
 * At the bar. The search **overlay** is a DOM descendant of the bar -- `.search-container` is
 * nested inside `.search` -- but it is `display: none` until the bar's search button opens it,
 * so nothing in it is in the page's tab order at rest and none of it is in the bar in any
 * sense a reader would recognise. It is also `prepper/search`'s vendored sheet, which this
 * effort's spec puts out of scope. Excluded explicitly rather than by an enumeration that
 * happened not to reach it, so that the exclusion is a decision somebody can reverse.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"

import type { Element } from "hast"

import { buildFixture, classesOf, type EmittedSite, type Page } from "../testing/build-fixture.ts"
import {
  customProperties,
  declaration,
  rules,
  stylesheets,
  subjects,
  type Rule,
} from "../testing/stylesheets.ts"

/**
 * The bar's controls, in the order the slots put them.
 *
 * `slot` is the priority the entry declares in `quartz.config.yaml`, and it is here because
 * the reading order this list asserts is the *visual* order only for as long as the bar is
 * laid out by DOM order -- one `margin-inline: auto` on search, and no `order` anywhere.
 */
const expected = [
  { name: "the rail toggle", slot: 5, selector: "button.prepper-sidebar-toggle" },
  { name: "the app's name", slot: 10, selector: ".page-title > a" },
  { name: "search", slot: 20, selector: "button.search-button" },
  { name: "the theme switch", slot: 30, selector: "button.darkmode" },
  { name: "reader mode", slot: 35, selector: "button.readermode" },
  { name: "the graph", slot: 40, selector: "button.global-graph-icon" },
]

/** Anything a browser puts in the sequential focus order without being asked. */
const focusable = "a[href], button, input, select, textarea, [tabindex]"

/** The bar itself. */
function bar(page: Page): Element {
  return page.require(".page-header > header", page.tree)
}

/**
 * Every control in the bar, in document order, with the search overlay left out.
 *
 * See this file's header for why the overlay is not in the audit: it is `display: none` until
 * it is opened, so it is not in the page's tab order, and it is a vendored sheet the spec puts
 * out of scope.
 */
function controls(page: Page): Element[] {
  const overlay = page.selectAll(".search-container *", bar(page))
  return page.selectAll(focusable, bar(page)).filter((element) => !overlay.includes(element))
}

/** How an element identifies itself in a failure message. */
function describeElement(element: Element): string {
  const classes = classesOf(element)
  return classes.length > 0 ? `${element.tagName}.${classes.join(".")}` : element.tagName
}

/**
 * What a screen reader would announce this control as.
 *
 * `aria-label` if it carries one, its own text if it does not. `aria-labelledby` is not read,
 * because nothing in the bar uses it and answering "named" for an idref this function never
 * resolved would be a pass for the wrong reason.
 */
function accessibleName(page: Page, element: Element): string {
  const labelled = element.properties["ariaLabel"]
  if (typeof labelled === "string") return labelled.trim()
  return page.text(undefined, element).trim()
}

// -- contrast ----------------------------------------------------------------------------

/** `#rgb` or `#rrggbb` to its three channels. */
function channels(hex: string): [number, number, number] {
  const value = hex.trim().replace("#", "")
  const full =
    value.length === 3
      ? [...value].map((digit) => digit + digit).join("")
      : value.slice(0, 6).padEnd(6, "0")
  return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16)) as [number, number, number]
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [red, green, blue] = channels(hex)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** WCAG contrast ratio, 1 to 21. */
function contrast(one: string, other: string): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

/**
 * A declared value chased through the custom properties it is written in, down to a colour.
 *
 * The rules in the bar are written in Material roles and Quartz's nine names are aliases onto
 * those roles, so `var(--darkgray)` is two hops from a hex. Anything that does not end at a
 * hex -- a keyword, a `color-mix()`, a name that is never declared -- throws, so a role this
 * audit cannot evaluate fails the test rather than being quietly scored as black.
 */
function colour(value: string, properties: Record<string, string>): string {
  let current = value.trim()
  for (let hop = 0; hop < 8; hop++) {
    const hex = current.match(/#[0-9a-f]{3,8}\b/i)
    if (hex) return hex[0]
    const name = current.match(/var\(\s*(--[\w-]+)/)
    assert.ok(name, `"${value}" does not resolve to a colour`)
    const declared = properties[name[1]]
    assert.ok(declared, `${name[1]} is used in the bar but never declared`)
    current = declared
  }
  assert.fail(`"${value}" is defined in terms of itself`)
}

/**
 * The custom properties as each theme resolves them.
 *
 * Quartz's dark theme is an attribute on the root element, not a media query, so the two
 * schemes are two sets of `:root` blocks in the same sheet: everything that is not
 * `[saved-theme=dark]` is the light scheme, and the dark blocks are laid over it. Within each,
 * later declarations win, which is `customProperties`' own rule and is the cascade here --
 * every one of these is declared on `:root` at the same specificity, ours linked last.
 */
function themes(all: Rule[]): Record<"light" | "dark", Record<string, string>> {
  const dark = (rule: Rule) => /saved-theme\s*=\s*"?dark"?/.test(rule.selector)
  const light = customProperties(all.filter((rule) => !dark(rule)))
  return { light, dark: { ...light, ...customProperties(all.filter(dark)) } }
}

/**
 * The last rule in the sheet that says what colour some part of a control is **at rest**.
 *
 * Source order rather than the full cascade, and that is sound for exactly the reason the bar
 * is built the way it is: every rule of ours that repaints a control is both later in the link
 * order *and* more specific than the one it overrules, because it reaches the control through
 * a child chain from the bar. A test that resolved specificity properly would answer the same
 * and would be a CSS engine.
 *
 * A hovered or active control is a different question and a weaker one -- it is a state a
 * pointer is in, it lasts as long as the pointer stays there, and every control in the bar
 * answers it by moving further from the surface behind it. The resting state is the one every
 * reader gets, so the resting state is what is measured.
 *
 * `on` is matched against the **end** of a selector rather than against any part of it, so it
 * names the element the declaration lands on rather than an ancestor on the way to it. Reading
 * it loosely is how the bar's own background was once answered with the app title's
 * `transparent`.
 */
function ink(all: Rule[], on: string, property: string): string {
  const declaring = all
    .flatMap((rule) =>
      rule.selector
        .split(",")
        .filter((selector) => selector.trim().endsWith(on))
        .filter((selector) => !/:(hover|active)\b/.test(selector))
        .filter(() => declaration(rule, property))
        .map((selector) => ({ rule, weight: specificity(selector) })),
    )
    .map((candidate, order) => ({ ...candidate, order }))
    .sort((one, other) => one.weight - other.weight || one.order - other.order)

  assert.ok(declaring.length > 0, `nothing in the build sets ${property} on ${on}`)
  return declaration(declaring.at(-1)!.rule, property)!
}

/**
 * How hard a selector argues for its declaration, as one number.
 *
 * Ids, then classes and attributes and pseudo-classes, then elements and pseudo-elements --
 * the cascade's own three counts, packed into a base-256 integer because nothing in this
 * repo's stylesheets comes close to overflowing a byte. Approximate in one direction only: a
 * functional pseudo-class takes its own weight rather than its argument's, and none of the
 * rules read here uses one.
 */
function specificity(selector: string): number {
  const ids = selector.match(/#[\w-]+/g)?.length ?? 0
  const classes = selector.match(/\.[\w-]+|\[[^\]]*\]|:[a-z-]+\(?/gi)?.length ?? 0
  const elements = selector.match(/(?:^|[\s>+~])[a-z][\w-]*/gi)?.length ?? 0
  return ids * 65536 + classes * 256 + elements
}

/**
 * Each control's ink, and how much contrast it owes the bar it sits on.
 *
 * 4.5:1 is WCAG AA for text, 3:1 is AA for a non-text indicator -- an icon's strokes, a
 * control's boundary, a focus ring. Two thresholds because there are two kinds of thing here,
 * not because anything was let off: the icons all clear the text threshold as well, and the
 * search field's border is the only row in the table that actually needs the lower one.
 */
const painted = [
  { name: "the rail toggle's glyph", on: ".prepper-sidebar-toggle", property: "color", min: 3 },
  { name: "the app's name", on: ".page-title>a", property: "color", min: 4.5 },
  { name: "search's label", on: ".search-button>p", property: "color", min: 4.5 },
  { name: "search's boundary", on: ".search-button", property: "border-color", min: 3 },
  { name: "the theme switch's icon", on: ".darkmode svg", property: "fill", min: 3 },
  { name: "reader mode's icon", on: ".readermode svg", property: "fill", min: 3 },
  { name: "the graph's icon", on: ".global-graph-icon", property: "color", min: 3 },
]

describe("the bar's controls, from the keyboard", () => {
  let site: EmittedSite
  let lesson: Page
  let missing: Page
  let all: Rule[]
  let palette: Record<"light" | "dark", Record<string, string>>

  before(
    async () => {
      // The fixture with one of every page type in it, for the same reason `layout.test.ts`
      // reads it: the bar is on 404 too, and 404 is resolved through a different pass of the
      // loader than a Lesson is.
      site = await buildFixture("topic-index")
      lesson = site.page("lessons/hash-map-lookup-cost")
      missing = site.page("404")
      all = rules(stylesheets(site, lesson))
      palette = themes(all)
    },
    { timeout: 300_000 },
  )

  test("the bar holds the six controls the slots order, and nothing else focusable", () => {
    // The enumeration is the audit's scope. Everything below is asserted about this list, so a
    // control that arrived without a slot -- or one that quietly stopped rendering -- shows up
    // here first rather than as a silent gap in the coverage.
    for (const page of [lesson, missing]) {
      const found = controls(page).map(describeElement)
      assert.equal(
        found.length,
        expected.length,
        `${page.slug} holds ${found.length} controls: ${found.join(", ")}`,
      )
      for (const [index, control] of expected.entries()) {
        const element = page.selectAll(control.selector, bar(page))
        assert.equal(element.length, 1, `${page.slug}: ${control.name} is not in the bar once`)
        assert.equal(
          controls(page)[index],
          element[0],
          `${page.slug}: ${control.name} is not the control at slot ${control.slot}`,
        )
      }
    }
  })

  test("every control says what it is", () => {
    // Five of the six are an icon and nothing else, so for five of them this is the only thing
    // a screen reader has to go on.
    for (const control of controls(lesson)) {
      const name = accessibleName(lesson, control)
      assert.ok(name.length > 0, `${describeElement(control)} is nameless`)
    }
  })

  test("every control is in the tab order, and the tab order is the order they are drawn in", () => {
    // jsdom performs no sequential focus navigation, so nothing here presses Tab. These are
    // the facts a browser computes that order from -- see this file's header.
    for (const control of controls(lesson)) {
      const where = describeElement(control)
      assert.ok(
        ["button", "a"].includes(control.tagName),
        `${where} is a ${control.tagName}, which a keyboard does not reach or operate for free`,
      )
      if (control.tagName === "a") assert.ok(control.properties["href"], `${where} has no href`)
      assert.equal(control.properties["tabIndex"], undefined, `${where} rewrites the tab order`)
      assert.equal(control.properties["disabled"], undefined, `${where} is disabled`)
      assert.notEqual(control.properties["ariaHidden"], "true", `${where} is hidden from ATs`)
    }

    // And nothing in the bar is taken out of the order wholesale, which is the other way a
    // control that looks reachable is not.
    assert.equal(bar(lesson).properties["ariaHidden"], undefined)
    assert.equal(bar(lesson).properties["inert"], undefined)
  })

  test("the rail toggle arrives with its pressed state on it, not only its name", () => {
    // `toggle.js` keeps it in step with the rail at seam 2 (`toggling.test.ts`). What matters
    // here is that the markup a reader is served already carries one, so a page whose scripts
    // never arrive still tells an assistive technology that this is a toggle rather than a
    // button that does something once.
    const toggle = lesson.require("button.prepper-sidebar-toggle", bar(lesson))
    assert.equal(toggle.properties["ariaPressed"], "false")
    assert.equal(toggle.properties["type"], "button")
  })

  test("one rule rings every control in the bar, and it is the bar's rule", () => {
    const ringing = all.filter((rule) => rule.selector.includes(":focus-visible"))
    assert.equal(ringing.length, 1, `${ringing.length} focus rules in the build`)

    const ring = ringing[0]
    assert.deepEqual(ring.media, [], "the ring is only drawn at some widths")
    assert.match(
      ring.selector,
      /\.page-header\s*>\s*header\s+.*:focus-visible/,
      `the ring is not the bar's: ${ring.selector}`,
    )

    // Outside the border box, so nothing in the bar changes size or moves when focus lands.
    assert.match(declaration(ring, "outline") ?? "", /2px\s+solid/)
    assert.ok(declaration(ring, "outline-offset"), "the ring is drawn on the control it rings")

    // A ring is not motion. The vocabulary exists and this is not what it is for: an indicator
    // that eases in is an indicator that is absent for the first frames of every keystroke.
    assert.equal(declaration(ring, "transition"), undefined)
  })

  test("nothing in the build takes a control's ring away again", () => {
    // Quartz's own sheets do this twice -- `.expand-button` and `.clipboard-button` both set
    // `outline: 0` -- so it is a real shape for a rule to have and worth checking that none of
    // them lands on anything in the bar.
    const named = new Set(controls(lesson).flatMap(classesOf))
    const stripped = all
      .filter((rule) => /^\s*(none|0)\b/.test(declaration(rule, "outline") ?? "x"))
      .filter((rule) =>
        subjects(rule).some((subject) =>
          [...subject.matchAll(/\.([\w-]+)/g)].some((match) => named.has(match[1])),
        ),
      )
      .map((rule) => rule.selector)
    assert.deepEqual(stripped, [], "a rule removes the outline from a control in the bar")
  })

  test("the ring and every control in it clear their contrast against the bar, in both themes", () => {
    // The whole point of computing rather than eyeballing: the roles are derived from one
    // seed, so a re-seed re-runs this arithmetic and a seed that put a control under the
    // threshold would fail here rather than ship.
    const surface = ink(all, ".page-header>header", "background-color")
    const hover = "var(--md-sys-color-surface-container-high)"
    const ring = ink(all, ":focus-visible", "outline")

    for (const scheme of ["light", "dark"] as const) {
      const properties = palette[scheme]
      const background = colour(surface, properties)

      for (const { name, on, property, min } of painted) {
        const ratio = contrast(colour(ink(all, on, property), properties), background)
        assert.ok(ratio >= min, `${name} is ${ratio.toFixed(2)}:1 on the ${scheme} bar`)
      }

      // The ring is measured against the bar and against the surface a hovered control paints
      // under it, because a reader whose pointer is resting on the control they have just
      // tabbed to sees the ring against the second one.
      for (const against of [surface, hover]) {
        const ratio = contrast(colour(ring, properties), colour(against, properties))
        assert.ok(ratio >= 3, `the focus ring is ${ratio.toFixed(2)}:1 on the ${scheme} bar`)
      }
    }
  })

  test("the two controls with a state say it in a glyph, not in a tint", () => {
    // The rail toggle and the theme switch are the only things in the bar that are ever in one
    // of two states. Both swap which of two icons is drawn, on `display` -- the theme switch
    // by upstream's own rules, the rail toggle by ours, and the rail toggle's swap keys on the
    // same `aria-pressed` a screen reader is given, so the glyph and the announcement are one
    // fact rather than two that can drift.
    const stateful = [
      { control: "the rail toggle", on: "aria-pressed", icons: ["-away", "-back"] },
      { control: "the theme switch", on: "saved-theme", icons: ["dayIcon", "nightIcon"] },
    ]

    for (const { control, on, icons } of stateful) {
      const switching = all.filter(
        (rule) => rule.selector.includes(on) && /display:/.test(rule.body),
      )
      assert.ok(switching.length > 0, `${control} switches nothing on ${on}`)
      for (const icon of icons) {
        assert.ok(
          switching.some((rule) => rule.selector.includes(icon)),
          `${control}'s ${icon} is not switched by ${on}`,
        )
      }
    }

    // And both glyphs are in the markup, so the swap has something to swap.
    const toggle = lesson.require("button.prepper-sidebar-toggle", bar(lesson))
    assert.equal(lesson.selectAll("svg", toggle).length, 2)
    assert.deepEqual(
      lesson.selectAll("svg", toggle).map((icon) => String(icon.properties["ariaHidden"])),
      ["true", "true"],
      "a glyph repeats the button's own name to a screen reader",
    )
  })

  test("reader mode gives the chrome back to a keyboard, not only to a pointer", () => {
    // Reader mode fades the bar and the rail to nothing and restores them on hover. A keyboard
    // has no hover, so without this a reader in reader mode would tab through six controls and
    // a topic tree that are all on the page and none of them on screen.
    for (const subject of [".page-header>header", ".sidebar.left"]) {
      const faded = all.filter(
        (rule) =>
          rule.selector.includes("reader-mode") &&
          rule.selector.includes(subject.split(">").at(-1)!) &&
          declaration(rule, "opacity") === "0",
      )
      assert.ok(faded.length > 0, `nothing fades ${subject} in reader mode`)

      const restored = all.filter(
        (rule) =>
          rule.selector.includes("reader-mode") &&
          rule.selector.includes(":focus-within") &&
          rule.selector.includes(subject.split(">").at(-1)!),
      )
      assert.ok(restored.length > 0, `${subject} never comes back for a keyboard`)
      assert.equal(declaration(restored[0], "opacity"), "1")
    }
  })
})
