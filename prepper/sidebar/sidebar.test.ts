/**
 * The hideable rail, through seam 1: what the build serves, and what it can no longer do.
 *
 * The click is seam 2's, in `toggling.test.ts`. What is asserted here is everything the click
 * depends on and cannot itself establish -- that the control is in the top bar rather than
 * inside the rail it hides, that it is nowhere the search preview would clone it, that the
 * page is served to every reader in the same state, and that the collapse is a stylesheet
 * rather than a script.
 *
 * And then the thing this file mostly exists for: **that the article column cannot move.**
 *
 * ## Why the proof is a stylesheet proof, and why it is the real one
 *
 * The ticket asks for the article's box to be identical before and after a collapse at 1280px,
 * 1600px and 1920px. Seam 2 is jsdom, which parses a DOM and performs **no layout at all**: it
 * has no viewport, no box tree and no `getBoundingClientRect` worth the name, so a pixel
 * measurement taken there would be a number this harness invented. Reporting one would be
 * worse than reporting none.
 *
 * So what is asserted is the thing that makes movement impossible, at exactly those three
 * widths. The centre column's geometry is a function of the grid track list on
 * `.page > #quartz-body` and of the box properties of the column itself; the collapsed state
 * is one attribute on `<html>`. If, at a given viewport width, **no rule conditioned on that
 * attribute has any of those elements as its subject, and none of them redefines a custom
 * property the grid is written in**, then the cascade resolves to the same declarations in
 * both states and the article's box is identical -- not approximately, and not by arithmetic
 * that happens to come out level, but because the browser is reading the same rules.
 *
 * That is what `active` computes: the emitted CSS, parsed into rules with their enclosing
 * media conditions, evaluated at a width. A condition this file cannot decide counts as
 * applying, so an exotic query hides nothing from the assertion.
 *
 * The old collapse fails this test loudly, which is the point: it restated
 * `grid-template-columns` with the left track reduced to a gutter, and that rule's subject was
 * `#quartz-body`.
 */
import test, { describe, before } from "node:test"
import assert from "node:assert"

import { buildFixture, type EmittedSite, type Page } from "../testing/build-fixture.ts"

/** The three widths the ticket names. All of them sit above upstream's 1200px breakpoint. */
const widths = [1280, 1600, 1920]

/**
 * Everything the centre column's position and width are computed from.
 *
 * The grid that places it, the column itself, and the article inside it. A rule that moved the
 * article without being about one of these would have to do it through an ancestor -- and the
 * ancestors are `.page`, `body` and `html`, which are in the list of forbidden subjects below
 * for that reason.
 */
const centre = ["#quartz-body", ".center", "article", ".page", "body", "html", ":root"]

/** One rule of the emitted stylesheet, with the media conditions it is nested inside. */
interface Rule {
  media: string[]
  selector: string
  body: string
}

describe("the hideable left rail", () => {
  let site: EmittedSite
  let lesson: Page
  let css: string

  before(
    async () => {
      site = await buildFixture("reading-surface")
      lesson = site.page("lessons/hash-map-lookup-cost")
      css = site.files
        .filter((file) => file.endsWith(".css"))
        .map((file) => site.file(file))
        .join("\n")
    },
    { timeout: 120_000 },
  )

  test("the control is in the top bar, and not inside the rail it hides", () => {
    // It used to be a direct child of the rail, and that was load-bearing while the collapse
    // hid the rail's children one at a time and spared this one. The rail goes whole now, so
    // a control anywhere inside it would go with it and leave the reader no way back.
    const bar = lesson.require(".page-header > header", lesson.tree)
    assert.equal(lesson.selectAll("button.prepper-sidebar-toggle", bar).length, 1)

    const rail = lesson.require(".left.sidebar", lesson.tree)
    assert.deepEqual(lesson.selectAll("button.prepper-sidebar-toggle", rail), [])

    const anywhere = lesson.selectAll("button.prepper-sidebar-toggle", lesson.tree)
    assert.equal(anywhere.length, 1, "one control on the page")
  })

  test("the control is nowhere the search preview would clone it", () => {
    // Quartz's preview pane clones every `.popover-hint` out of a fetched page and appends
    // the clones to the live document. A control rendered inside one would arrive as a second
    // copy of itself, over the top of the page the reader is on. `header` is a sibling of the
    // hint rather than a descendant, which is what makes the bar a legal home for it.
    for (const hint of lesson.selectAll(".popover-hint", lesson.tree)) {
      assert.deepEqual(lesson.selectAll("button.prepper-sidebar-toggle", hint), [])
    }
  })

  test("the page is served to everybody in the same state: shown", () => {
    // The state is one reader's, and this file is on a CDN. Nothing about the preference is
    // baked into the markup -- it is applied by script, over a page that says nothing.
    assert.match(lesson.html, /<html\b[^>]*>/)
    assert.ok(!/<html[^>]*data-prepper-sidebar/.test(lesson.html))

    const control = lesson.require("button.prepper-sidebar-toggle", lesson.tree)
    assert.equal(control.properties["ariaPressed"], "false")
    assert.equal(control.properties["ariaLabel"], "Hide the sidebar")
    assert.equal(control.tagName, "button")
  })

  test("the remembered state is applied before the body is drawn", () => {
    // Quartz concatenates every `beforeDOMLoaded` script into one head bundle, ours with its
    // own. That the snippet is in *that* file is the whole of the no-flash behaviour: a
    // reader who collapsed the rail never sees it appear and then vanish. Seam 2 cannot run
    // that bundle -- it is Quartz's client as well as ours -- so this is where it is checked.
    const prescript = site.files.find((file) => file.startsWith("prescript-"))
    assert.ok(prescript, "the build emitted a head bundle")

    const head = site.file(prescript)
    assert.match(head, /prepper-sidebar/)
    assert.match(head, /data-prepper-sidebar/)
  })

  test("collapsing is a stylesheet, and it takes the rail whole", () => {
    const hides = rules(css).filter(
      (rule) => conditional(rule) && /display:\s*none/.test(rule.body),
    )
    assert.equal(hides.length, 1, "one rule hides the rail, and it is the only one")
    assert.deepEqual(subjects(hides[0]), [".sidebar.left"])

    // Not child-by-child, and with no exception carved out for a control that is no longer in
    // there. Both shapes are named, because both are what this used to be.
    assert.doesNotMatch(css, /data-prepper-sidebar[^{]*\*:not\(/)
    assert.doesNotMatch(css, /data-prepper-sidebar[^{]*prepper-sidebar-toggle/)
  })

  for (const width of widths) {
    test(`at ${width}px, nothing the collapse switches on can reach the article`, () => {
      // The proof of non-movement. Every rule that applies at this width and is conditioned on
      // the collapsed attribute must have the rail itself as its subject -- never the grid,
      // the centre column, the article or any of their ancestors -- and must redefine no
      // custom property, because the grid is written in `--prepper-measure` and
      // `--prepper-sidebar` and a redefinition would move the column without naming it.
      const conditioned = active(rules(css), width).filter(conditional)
      assert.ok(conditioned.length >= 1, `no collapse rule applies at ${width}px`)

      for (const rule of conditioned) {
        assert.deepEqual(
          subjects(rule),
          [".sidebar.left"],
          `at ${width}px this rule can reach past the rail: ${rule.selector}`,
        )
        assert.ok(
          !/(^|[;{\s])--[\w-]+\s*:/.test(rule.body),
          `at ${width}px the collapse redefines a custom property: ${rule.selector}`,
        )
      }
    })

    test(`at ${width}px, the article's grid track is the same in both states`, () => {
      // Said the other way round, on the declaration rather than on the selector: the
      // `grid-template-columns` the centre column resolves against is declared by
      // `prepper/reading` alone, unconditionally, and is byte-identical whether or not the
      // rail is hidden. This is the assertion the old collapse broke.
      const shown = tracks(active(rules(css), width), false)
      const hidden = tracks(active(rules(css), width), true)

      assert.ok(shown.length >= 1, `no grid declared at ${width}px`)
      assert.deepEqual(hidden, shown, `the grid at ${width}px changes when the rail is hidden`)
    })
  }

  test("the grid is declared once per viewport band and never by this module", () => {
    // `prepper/reading` owns the page's layout; the collapse owns one `display`. Two modules
    // declaring the same grid is how the jump got in.
    const grids = rules(css).filter(
      (rule) => /grid-template-columns/.test(rule.body) && /--prepper-measure/.test(rule.body),
    )
    assert.equal(grids.length, 3, "one band each: wide, medium, narrow")
    assert.ok(grids.every((rule) => !conditional(rule)))
  })

  test("nothing about the right rail changes", () => {
    // The table of contents, the graph and the backlinks are consulted while reading. This
    // control is about the rail you use before you start.
    assert.ok(!/data-prepper-sidebar[^{]*\.sidebar\.right/.test(css))
  })

  test("nothing in the collapse moves", () => {
    // Motion is `prepper/tokens`' vocabulary and its own ticket. A rail that eased its way out
    // would be a rail whose state a reader can catch mid-flight.
    const sheets = site.files
      .filter((file) => file.endsWith(".css"))
      .map((file) => site.file(file))
      .filter((sheet) => sheet.includes("data-prepper-sidebar"))

    assert.equal(sheets.length, 1, `${sheets.length} stylesheets carry the collapse`)
    assert.doesNotMatch(sheets[0], /transition|animation/)
  })
})

/**
 * The emitted stylesheet, flattened into rules that each carry the media queries they sit
 * inside.
 *
 * A hand-rolled scanner rather than a CSS parser, for the same reason the rest of this repo's
 * stylesheet assertions are regexes over the emitted file: the input is lightningcss's output,
 * which is one line of minified text, and the questions asked of it are about *which* rules
 * exist rather than about their semantics. Quotes are tracked because a minified declaration
 * may legitimately contain a brace inside a `content:` string; `@layer` and `@supports` are
 * transparent because they wrap rules without conditioning them on a width; `@keyframes` and
 * `@font-face` are skipped whole because what is inside them is not a style rule.
 */
function rules(css: string): Rule[] {
  const out: Rule[] = []
  const media: string[] = []
  const stack: ("media" | "transparent")[] = []
  let prelude = ""
  let index = 0

  while (index < css.length) {
    const character = css[index]

    if (character === '"' || character === "'") {
      const end = closingQuote(css, index)
      prelude += css.slice(index, end + 1)
      index = end + 1
      continue
    }

    if (character === "}") {
      if (stack.pop() === "media") media.pop()
      prelude = ""
      index++
      continue
    }

    if (character !== "{") {
      prelude += character
      index++
      continue
    }

    const head = prelude.trim()
    prelude = ""

    if (head.startsWith("@media")) {
      media.push(head.slice("@media".length).trim())
      stack.push("media")
      index++
      continue
    }

    if (head.startsWith("@")) {
      if (/^@(layer|supports|container|scope)\b/.test(head)) {
        stack.push("transparent")
        index++
        continue
      }
      index = closingBrace(css, index) + 1
      continue
    }

    const end = closingBrace(css, index)
    out.push({ media: [...media], selector: head, body: css.slice(index + 1, end) })
    index = end + 1
  }

  return out
}

/** The index of the `}` that closes the `{` at `open`, braces and quotes counted. */
function closingBrace(css: string, open: number): number {
  let depth = 0
  for (let index = open; index < css.length; index++) {
    const character = css[index]
    if (character === '"' || character === "'") {
      index = closingQuote(css, index)
      continue
    }
    if (character === "{") depth++
    else if (character === "}" && --depth === 0) return index
  }
  return css.length - 1
}

/** The index of the quote that closes the one at `open`, escapes honoured. */
function closingQuote(css: string, open: number): number {
  const quote = css[open]
  for (let index = open + 1; index < css.length; index++) {
    if (css[index] === "\\") index++
    else if (css[index] === quote) return index
  }
  return css.length - 1
}

/**
 * The rules that apply at a viewport width.
 *
 * Only `min-width` and `max-width` are decided, because they are the only conditions the
 * layout is written in. Anything else -- a colour scheme, a pointer type, an exotic range
 * query -- is treated as **applying**, which is the conservative direction: this file is
 * looking for rules that could move the article, so one it cannot rule out is one it keeps.
 */
function active(all: Rule[], width: number): Rule[] {
  return all.filter((rule) => rule.media.every((query) => holds(query, width)))
}

function holds(query: string, width: number): boolean {
  for (const [, bound, value, unit] of query.matchAll(/\((min|max)-width:\s*([\d.]+)(px|rem)\)/g)) {
    const pixels = unit === "rem" ? Number(value) * 16 : Number(value)
    if (bound === "min" && width < pixels) return false
    if (bound === "max" && width > pixels) return false
  }
  return true
}

/** Whether a rule only applies while the rail is collapsed. */
function conditional(rule: Rule): boolean {
  return rule.selector.includes("data-prepper-sidebar")
}

/**
 * What a rule is *about*: the last compound selector of each of its selectors, which is the
 * element the declarations land on.
 *
 * `:root[data-prepper-sidebar=hidden] .page>#quartz-body .sidebar.left` is a rule about the
 * rail, however many of the article's ancestors it names on the way there. Asking for the
 * subject rather than for the presence of a string is what lets this file say "and nothing
 * else": a rule whose subject is anything in `centre` is a rule that can move the article.
 */
function subjects(rule: Rule): string[] {
  return [
    ...new Set(
      rule.selector
        .split(",")
        .map(
          (selector) =>
            selector
              .trim()
              .split(/[\s>+~]+/)
              .at(-1) ?? "",
        )
        .map((compound) => compound.replace(/::?[\w-]+(\([^)]*\))?/g, "")),
    ),
  ].sort()
}

/**
 * Every `grid-template-columns` that applies to the page's own grid, in the state named.
 *
 * `hidden: true` is the collapsed reader -- the rules whose selectors are unconditional plus
 * the ones the attribute switches on. `hidden: false` is everybody else. The two lists being
 * equal is the article not moving.
 */
function tracks(all: Rule[], hidden: boolean): string[] {
  return all
    .filter((rule) => hidden || !conditional(rule))
    .filter((rule) => subjects(rule).some((subject) => centre.includes(subject)))
    .flatMap((rule) => [...rule.body.matchAll(/grid-template-columns:([^;}]+)/g)])
    .map((match) => match[1].trim())
}
