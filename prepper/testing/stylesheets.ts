/**
 * The emitted stylesheet, as something a test can ask questions of.
 *
 * Three of this repo's layout rules are not facts about markup and cannot be asserted on it:
 * the prose column's ~38rem measure, that collapsing the rail moves nothing, and that the
 * retired right column takes no width from the page. All three are facts about **which CSS
 * rules a browser resolves at a given viewport width**, and the only honest place to read them
 * is the stylesheet the build actually served.
 *
 * ## Why this is not a measurement, and what it is instead
 *
 * Seam 2 is jsdom, which parses a DOM and performs **no layout at all**: no viewport, no box
 * tree, and a `getBoundingClientRect` that answers zero for everything. A pixel measurement
 * taken there would be a number this harness invented, and reporting one would be worse than
 * reporting none.
 *
 * So nothing here measures. What it does is **evaluate the declaration** -- collect the rules
 * that apply at a width, resolve the custom properties they are written in, and compute the
 * arithmetic the browser would compute. That is a weaker claim than "the article was 608
 * pixels wide in a browser" and a stronger one than "the file contains the string 38rem": it
 * fails if the track list changes shape, if a custom property is redefined, or if a second
 * rule starts applying at one of the widths under test. Every caller states the distinction
 * where it makes its claim.
 *
 * ## Why a hand-rolled scanner rather than a CSS parser
 *
 * The input is lightningcss's output -- one line of minified text -- and the questions asked of
 * it are about *which* rules exist and what one declaration in them evaluates to, rather than
 * about CSS semantics at large. Quotes are tracked because a minified declaration may
 * legitimately contain a brace inside a `content:` string; `@layer` and `@supports` are
 * transparent because they wrap rules without conditioning them on a width; `@keyframes` and
 * `@font-face` are skipped whole because what is inside them is not a style rule.
 *
 * This file has no tests of its own on purpose. It is read by `prepper/sidebar/sidebar.test.ts`
 * and `prepper/reading/reading.test.ts`, both of which assert facts that are false if the
 * scanner is wrong -- and both of which have been checked against a deliberately broken build
 * (see each file's ticket comments) rather than trusted.
 */
import type { EmittedSite, Page } from "./build-fixture.ts"

/** One rule of the emitted stylesheet, with the media conditions it is nested inside. */
export interface Rule {
  media: string[]
  selector: string
  body: string
}

/**
 * Every stylesheet the page links, **in the order it links them**.
 *
 * Order is not a detail here: two rules of equal specificity are settled by which came last,
 * and that is exactly how the mobile drawer's default beats upstream's own `display: flex` on
 * `.sidebar.left`. Reading the emitted files in whatever order the site happens to list them
 * would answer "what does the rail resolve to" with a coin toss. The page is the authority on
 * link order, so the page is what is read.
 *
 * Anything served from another origin is skipped: it is not ours, and it is not on disk.
 */
export function stylesheets(site: EmittedSite, page: Page): string {
  const links = [...page.html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*rel="stylesheet"/g)]
  return links
    .map(([, href]) => href)
    .filter((href) => !href.startsWith("http"))
    .map((href) => site.file(href.replace(/^(\.\.\/)+/, "")))
    .join("\n")
}

/** The stylesheet, flattened into rules that each carry the media queries they sit inside. */
export function rules(css: string): Rule[] {
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
 * Only `min-width` and `max-width` are decided, because they are the only conditions this
 * layout is written in. Anything else -- a colour scheme, a pointer type, an exotic range
 * query -- is treated as **applying**, which is the conservative direction: the callers are
 * looking for rules that could move something, so one that cannot be ruled out is one they
 * keep.
 */
export function active(all: Rule[], width: number): Rule[] {
  return all.filter((rule) => rule.media.every((query) => holds(query, width)))
}

/**
 * Whether one media query holds at a width.
 *
 * The leading `not` is decided rather than waved through, and it has to be: sass's
 * `not (min-width: 1200px)` is how upstream pads `#quartz-body` on everything narrower than a
 * desktop, lightningcss emits it verbatim, and reading it as its own opposite would have this
 * file computing the page's width with a padding a wide window never has. A `not` over a
 * condition that *cannot* be decided still counts as applying, which is the same conservative
 * direction as everywhere else here.
 */
export function holds(query: string, width: number): boolean {
  const negated = query.trim().match(/^not\s+(.*)$/is)
  if (negated) {
    const inner = negated[1]
    return decidable(inner) ? !holds(inner, width) : true
  }
  for (const [, bound, value, unit] of query.matchAll(/\((min|max)-width:\s*([\d.]+)(px|rem)\)/g)) {
    const pixels = unit === "rem" ? Number(value) * 16 : Number(value)
    if (bound === "min" && width < pixels) return false
    if (bound === "max" && width > pixels) return false
  }
  return true
}

function decidable(query: string): boolean {
  return /\((min|max)-width:/.test(query)
}

/**
 * What a rule is *about*: the last compound selector of each of its selectors, which is the
 * element the declarations land on.
 *
 * `:root[data-prepper-sidebar=hidden] .page>#quartz-body .sidebar.left` is a rule about the
 * rail, however many of the article's ancestors it names on the way there. Asking for the
 * subject rather than for the presence of a string is what lets a caller say "and nothing
 * else".
 */
export function subjects(rule: Rule): string[] {
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

/** One declaration of a rule, or `undefined` if it does not make it. */
export function declaration(rule: Rule, property: string): string | undefined {
  const match = rule.body.match(new RegExp(`(?:^|[;{\\s])${property}:([^;}]+)`))
  return match?.[1].trim()
}

/**
 * Every custom property the stylesheet declares, last declaration winning.
 *
 * Flat rather than per-element, because every custom property this repo's layout is written in
 * is declared on `:root` and never shadowed -- a fact `prepper/sidebar/sidebar.test.ts` asserts
 * from the other side, by refusing any rule that redefines one inside a collapsed state.
 */
export function customProperties(all: Rule[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const rule of all) {
    for (const [, name, value] of rule.body.matchAll(/(?:^|[;{\s])(--[\w-]+):([^;}]+)/g)) {
      out[name] = value.trim()
    }
  }
  return out
}

/**
 * A CSS length expression, evaluated to pixels.
 *
 * `var()` is resolved from `properties`, `100%` from `container`, `rem` at the browser default
 * of 16px, and `min()`, `max()`, `calc()` and ordinary arithmetic are computed. Anything else
 * -- a unit that depends on a viewport this harness does not have, a function not in that list
 * -- throws rather than guesses, so a track list that grew a `clamp()` or a `vw` fails the test
 * that reads it instead of quietly returning a plausible number.
 */
export function pixels(
  expression: string,
  { container, properties = {} }: { container: number; properties?: Record<string, string> },
): number {
  return evaluate(resolve(expression, properties, new Set()), container)
}

/** `var(--a, fallback)` replaced by what `--a` is declared as, recursively. */
function resolve(
  expression: string,
  properties: Record<string, string>,
  seen: Set<string>,
): string {
  return expression.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (_, name, fallback) => {
    if (seen.has(name)) throw new Error(`${name} is defined in terms of itself`)
    const declared = properties[name] ?? fallback?.trim()
    if (declared === undefined) throw new Error(`${name} is used but never declared`)
    return resolve(declared, properties, new Set([...seen, name]))
  })
}

/** The arithmetic, once every name in it is a number. */
function evaluate(expression: string, container: number): number {
  const reader = new Reader(expression, container)
  const value = reader.sum()
  reader.done()
  return value
}

/**
 * A recursive-descent reader over the four operators, the three functions and the three units
 * this repo's layout is written in.
 *
 * Hand-written rather than handed to `Function`: the input is a build artefact, and a test that
 * evaluates a build artefact as code is a test that runs the build's output. It is also the
 * only way to make an unsupported unit an *error* -- `Function` would have happily read `80vw`
 * as `80` and answered with a number nobody could have caught.
 */
class Reader {
  private at = 0

  constructor(
    private readonly source: string,
    private readonly container: number,
  ) {}

  /** `a + b - c`, the loosest binding. */
  sum(): number {
    let value = this.product()
    for (;;) {
      if (this.take("+")) value += this.product()
      else if (this.take("-")) value -= this.product()
      else return value
    }
  }

  private product(): number {
    let value = this.term()
    for (;;) {
      if (this.take("*")) value *= this.term()
      else if (this.take("/")) value /= this.term()
      else return value
    }
  }

  private term(): number {
    this.space()

    if (this.take("(")) {
      const value = this.sum()
      this.expect(")")
      return value
    }

    const call = this.match(/^(min|max|calc)\(/i)
    if (call) {
      const name = call[1].toLowerCase()
      const values = [this.sum()]
      while (this.take(",")) values.push(this.sum())
      this.expect(")")
      if (name === "calc") return values[0]
      return name === "min" ? Math.min(...values) : Math.max(...values)
    }

    const number = this.match(/^([+-]?[\d.]+)(px|rem|%)?/)
    if (!number) throw new Error(`cannot evaluate "${this.source.slice(this.at)}"`)
    const magnitude = Number(number[1])
    switch (number[2]) {
      case "rem":
        return magnitude * 16
      case "%":
        return (magnitude / 100) * this.container
      case "px":
      case undefined:
        return magnitude
      default:
        throw new Error(`unsupported unit in "${this.source}"`)
    }
  }

  private match(pattern: RegExp): RegExpMatchArray | null {
    this.space()
    const found = this.source.slice(this.at).match(pattern)
    if (found) this.at += found[0].length
    return found
  }

  private take(character: string): boolean {
    this.space()
    if (this.source[this.at] !== character) return false
    this.at++
    return true
  }

  private expect(character: string): void {
    if (!this.take(character)) throw new Error(`expected "${character}" in "${this.source}"`)
  }

  private space(): void {
    while (/\s/.test(this.source[this.at] ?? "")) this.at++
  }

  done(): void {
    this.space()
    if (this.at < this.source.length) {
      throw new Error(`cannot evaluate "${this.source}" past "${this.source.slice(this.at)}"`)
    }
  }
}

/**
 * A `grid-template-columns` value, split into one string per track.
 *
 * Whitespace separates tracks, but only at the top level: `minmax(320px, 1fr)` and
 * `calc(100% - 320px - 10px)` both hold spaces of their own, and a naive split would report a
 * three-column grid as seven columns.
 */
export function tracks(value: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ""

  for (const character of value.trim()) {
    if (character === "(") depth++
    if (character === ")") depth--
    if (depth === 0 && /\s/.test(character)) {
      if (current) out.push(current)
      current = ""
      continue
    }
    current += character
  }
  if (current) out.push(current)
  return out
}
