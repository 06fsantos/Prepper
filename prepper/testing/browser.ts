/**
 * Seam 2 -- Prepper's custom elements, over emitted markup, in a DOM.
 *
 *     const screen = await openPage("problem-sections", "problems/two-sum")
 *     screen.one("[data-section='solution'] summary").click()
 *     assert.equal(screen.seal("solution").open, true)
 *
 * Three behaviours in the browser are genuine behaviours rather than markup: unsealing a
 * Problem's solution, climbing its hint ladder, and answering a quiz block. Everything
 * else is seam 1's.
 *
 * ## The input is the site, never a hand-written page
 *
 * A DOM test whose fixture is markup somebody typed into the test file can pass while the
 * build emits something else entirely -- the two seams agree with each other about a page
 * that does not exist. So this builds the fixture vault through seam 1 and loads the page
 * the build actually wrote, script tags and all.
 *
 * ## Which scripts run
 *
 * A page carries Quartz's client runtime as well as ours, and Quartz's is ES modules
 * against APIs jsdom has no implementation of. Running it would be testing Quartz. So this
 * runs **Prepper's scripts only**, picked out by the `prepper-` prefix every custom element
 * of ours is named with -- a tag name is a string literal, so it is the one part of the
 * file that survives Quartz minifying it into `static/`.
 *
 * `openPage(..., { scripts: false })` runs none of them, which is not a lesser fixture but
 * a different one: it is a reader with JavaScript disabled, and it is the state the seal
 * has to be correct in.
 *
 * ## The tripwires
 *
 * Every way a page has of remembering something or telling somebody -- storage, cookies,
 * `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, IndexedDB, the history entries --
 * is replaced with a recorder that also throws, and `screen.recorded` is what it caught.
 * Prepper stores nothing about the reader's work and has no server, so "this records nothing"
 * is a fact about the app that every screen can be asked to confirm.
 *
 * Two keys are exempt by name -- `prepper-sidebar`, whether the left rail is collapsed, and
 * `prepper-topic-folds`, which items of the topic tree the reader has shut -- and they are
 * backed by a real map rather than waved through, so `screen.remembered` says what a page kept
 * and everything else still trips. See `wireTripwires` and `rememberedKeys`.
 */
import assert from "node:assert"
import * as fs from "node:fs"
import * as path from "node:path"

import { JSDOM } from "jsdom"

import { buildFixture, type EmittedSite } from "./build-fixture.ts"

/**
 * What marks a script as Prepper's.
 *
 * Custom element names must contain a hyphen, so every element of ours is `prepper-`
 * something, and that string reaches the emitted file untouched however hard it is
 * minified. Nothing of Quartz's contains it.
 */
const prepperScriptMarker = "prepper-"

/** Somewhere fetches are pointed at. Nothing is served from it; jsdom just wants an origin. */
const origin = "https://prepper.test"

/**
 * The keys the app is allowed to remember, named here rather than pattern-matched.
 *
 * A prefix -- anything starting `prepper-` -- would be a licence: the next feature that
 * wanted to keep something would find the tripwire already open and nobody would have to
 * decide anything. Literal strings make the carve-out a list you can read, and adding to it is
 * an edit to this file that a reviewer sees.
 *
 * Both entries are the same kind of fact -- which furniture is in the way -- and neither is
 * about the reader's work: whether the left rail is collapsed
 * (`prepper/sidebar/index.ts`), and which items of the topic tree are shut
 * (`prepper/topics/folds.js`). What was answered, opened, unsealed or unfolded in a note is
 * still written nowhere at all, and every key that is not on this list still trips.
 */
const rememberedKeys = new Set(["prepper-sidebar", "prepper-topic-folds"])

/**
 * A live document, and the part of it a test is asking about.
 *
 * Queries are scoped to `root`, which is the whole page for `openPage` and the injected
 * result for `openSearchPreview` -- so a preview test cannot accidentally assert on the
 * host page's own copy of the same Problem.
 */
export class Screen {
  constructor(
    /** The window the page is living in. */
    readonly window: JSDOM["window"],
    /** The scope every query runs against. */
    readonly root: Element,
    /** How many of Prepper's scripts ran. Zero with `scripts: false`. */
    readonly scriptsRun: number,
    /**
     * Every attempt this page made to persist something or to tell somebody, in order.
     *
     * Empty is the assertion, and it is a fact about the whole app rather than about a
     * feature: Prepper stores no per-user state and has no server, so a page that reached
     * for storage or the network is a page doing something the app does not do. See
     * `wireTripwires`.
     */
    readonly recorded: string[] = [],
    /**
     * What this page has written to the one storage key the app is allowed to use, and
     * whatever was seeded there before it loaded.
     *
     * `recorded` is the assertion that nothing about the reader's *work* is kept. This is the
     * exceptions, held apart rather than folded in: `prepper-sidebar` remembers whether the
     * left rail is collapsed and `prepper-topic-folds` which items of the topic tree are
     * shut, both facts about a window and not about a reader. See `wireTripwires`, and
     * `prepper/sidebar/index.ts` for why the exceptions are ones.
     */
    readonly remembered: Map<string, string> = new Map(),
  ) {}

  get document(): Document {
    return this.window.document
  }

  /** Every element matching `selector`, in document order. */
  all(selector: string): Element[] {
    return Array.from(this.root.querySelectorAll(selector))
  }

  /** The first element matching `selector`. Fails the test if there is none. */
  one(selector: string): Element {
    const found = this.root.querySelector(selector)
    assert.ok(found, `nothing matching "${selector}" in this document`)
    return found
  }

  /** Visible text, whitespace collapsed. With no selector, the whole scope. */
  text(selector?: string): string {
    const node = selector ? this.one(selector) : this.root
    return (node.textContent ?? "").replace(/\s+/g, " ").trim()
  }

  /**
   * Click an element the way a reader does: a real event, bubbling and cancellable.
   *
   * Calling a handler directly would test the handler. This tests the page -- the
   * listeners, where they were attached, and anything that stops the event on the way.
   */
  click(element: Element) {
    element.dispatchEvent(new this.window.MouseEvent("click", { bubbles: true, cancelable: true }))
  }

  /** Press a key on an element, for the keyboard half of a control. */
  press(element: Element, key: string) {
    element.dispatchEvent(
      new this.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    )
  }

  /**
   * Whether an element is being shown.
   *
   * Concealment in Prepper is markup -- the `hidden` attribute on a quiz explanation, the
   * closed `<details>` of a Problem's seal -- never a class this test would have to know
   * the stylesheet to interpret.
   */
  isOpen(element: Element): boolean {
    return !(element as HTMLElement).hidden
  }

  /** The scope's markup as it currently stands, for "nothing happened" assertions. */
  html(): string {
    return this.root.innerHTML
  }

  /** One folded section of a Problem's body. */
  section(name: string): Element {
    return this.one(`.problem-section[data-section="${name}"]`)
  }

  /** The disclosure a sealed section is sealed by. */
  seal(name: string): HTMLDetailsElement {
    return this.section(name).querySelector("details.problem-seal") as HTMLDetailsElement
  }
}

/**
 * The window width a page is opened at, when a test does not say.
 *
 * A desktop one, because that is the presentation the emitted markup itself ships in: the
 * rail is a column, the drawer is not a thing yet, and a test that says nothing about width
 * is a test about neither.
 */
const defaultWidth = 1280

/**
 * Build a fixture, load one of its pages into a DOM, and run Prepper's scripts in it.
 *
 * `scripts: false` is the reader with JavaScript off -- and, near enough, the reader whose
 * page has not finished loading, which is the same reader for the half-second that matters.
 *
 * `width` is the viewport a script may **ask about**, and nothing more: jsdom lays nothing
 * out, so this cannot say what a page looked like at 360px. It answers `matchMedia`, which is
 * the one question `prepper/sidebar/toggle.js` puts to the window -- which of the rail's two
 * presentations is on screen, so that a press knows whether it is putting a column away or
 * calling a drawer up.
 */
export async function openPage(
  fixture: string,
  slug: string,
  {
    scripts = true,
    remembered = {},
    width = defaultWidth,
  }: { scripts?: boolean; remembered?: Record<string, string>; width?: number } = {},
): Promise<Screen> {
  const site = await buildFixture(fixture)
  const dom = new JSDOM(site.page(slug).html, {
    runScripts: "outside-only",
    url: `${origin}/${slug}`,
  })
  const memory = new Map(Object.entries(remembered))
  fillJsdomGaps(dom, width)
  const recorded = wireTripwires(dom, memory)
  const ran = scripts ? runPrepperScripts(dom, site, slug) : 0
  return new Screen(dom.window, dom.window.document.documentElement, ran, recorded, memory)
}

/**
 * The two things a page can call that jsdom does not implement.
 *
 * jsdom has no layout, so `Element.scrollIntoView` is simply absent -- calling it throws. Our
 * scripts scroll for one reason: a fold that has just been opened is a section that was not on
 * screen when the browser followed the anchor. Guarding that call in the script would be a
 * line of production code written for a test harness, and the harness is where the gap is. So
 * it is filled here, as a no-op, and nothing asserts on it: where the page scrolled to is a
 * question about a viewport, and this DOM has none.
 *
 * `matchMedia` is absent for the same reason and filled for a different one. It is not a
 * viewport this harness is pretending to have -- it is a **question with an answer the test
 * states**: `prepper/sidebar/toggle.js` asks which of the rail's two presentations is on
 * screen, and a test that opens a page at 360px is a test that has said which. Only width
 * conditions are decided, because that is all the question is written in; anything else comes
 * back true, which is the same conservative direction `sidebar.test.ts` reads media queries
 * in. Nothing here makes a stylesheet apply: jsdom does not cascade one either.
 */
function fillJsdomGaps(dom: JSDOM, width: number = defaultWidth) {
  const element = dom.window.Element.prototype as unknown as Record<string, unknown>
  if (typeof element.scrollIntoView !== "function") element.scrollIntoView = () => {}

  const window = dom.window as unknown as Record<string, unknown>
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string) => ({
      media: query,
      matches: widthHolds(query, width),
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })
  }
}

/** Whether a media query's width conditions hold at `width`. Everything else is left true. */
function widthHolds(query: string, width: number): boolean {
  for (const [, bound, value, unit] of query.matchAll(/\((min|max)-width:\s*([\d.]+)(px|rem)\)/g)) {
    const pixels = unit === "rem" ? Number(value) * 16 : Number(value)
    if (bound === "min" && width < pixels) return false
    if (bound === "max" && width > pixels) return false
  }
  return true
}

/**
 * A Problem as Quartz's search preview pane renders it.
 *
 * This is not an approximation of the pane; it is what `@quartz-community/search` does,
 * step for step. The pane fetches the result's page, parses it with `DOMParser` --
 * which never runs a script, whatever the document contains -- clones every
 * `.popover-hint` out of it, and appends the clones to the live document.
 *
 * The host page is a real Prepper page with Prepper's scripts already running, because
 * that is where a reader is when they open search. So nothing here is stacked in the
 * seal's favour: the scripts are loaded, and the injected copy is still shut, because no
 * script was ever what shut it.
 */
export async function openSearchPreview(
  fixture: string,
  { from, result }: { from: string; result: string },
): Promise<Screen> {
  const site = await buildFixture(fixture)
  const host = new JSDOM(site.page(from).html, {
    runScripts: "outside-only",
    url: `${origin}/${from}`,
  })
  fillJsdomGaps(host)
  const recorded = wireTripwires(host, new Map())
  const ran = runPrepperScripts(host, site, from)

  const { document: doc, DOMParser } = host.window
  const fetched = new DOMParser().parseFromString(site.page(result).html, "text/html")

  const inner = doc.createElement("div")
  inner.className = "preview-inner"
  for (const hint of Array.from(fetched.getElementsByClassName("popover-hint"))) {
    inner.append(hint.cloneNode(true))
  }

  const container = doc.createElement("div")
  container.className = "preview-container"
  container.append(inner)
  doc.body.append(container)

  return new Screen(host.window, inner, ran, recorded)
}

/**
 * Evaluate the scripts the page carries that are Prepper's, in the order the page lists
 * them.
 *
 * Quartz extracts a plugin's inline JavaScript into a file under `static/` and links it,
 * so the usual case is a `src` read off the emitted site; the inline branch is there
 * because that is a build-configuration detail and not a fact this seam should depend on.
 *
 * ## The two bundles, which are Quartz's and not ours
 *
 * `prescript-*.js` and `postscript-*.js` are the build's shared bundles, and the `prepper-`
 * marker turns up in both -- so the marker alone would have this evaluating Quartz's own
 * client, which is the one thing this seam exists not to do.
 *
 * They are treated differently because they are built differently. **`prescript`** is a
 * concatenation: every `beforeDOMLoaded` script in the site, ours and upstream's, in one
 * file with no seam to cut on. It is skipped, and the consequence is stated rather than
 * hidden -- the head snippet that applies a remembered sidebar state is asserted at seam 1,
 * on the bundle the build wrote, and the behaviour it produces is reachable here because
 * `prepper/sidebar/toggle.js` reads the same key when it wires the control.
 *
 * **`postscript`** is a module that imports one chunk per component script, and a chunk is
 * one file: ours are whole and separate in there. So its static imports are followed, and a
 * chunk carrying the marker is run exactly as a `src` would be.
 */
function runPrepperScripts(dom: JSDOM, site: EmittedSite, slug: string): number {
  const pageDir = path.dirname(path.join(site.outputDir, `${slug}.html`))
  let ran = 0

  const run = (source: string): number => {
    if (!source.includes(prepperScriptMarker)) return 0
    dom.window.eval(source)
    return 1
  }

  for (const tag of Array.from(dom.window.document.querySelectorAll("script"))) {
    const src = tag.getAttribute("src")
    if (src?.startsWith("http")) continue

    const bundle = src ? path.basename(src) : ""
    if (bundle.startsWith("prescript-")) continue

    if (bundle.startsWith("postscript-")) {
      // A chunk specifier is relative to the bundle that imports it, which sits at the site
      // root rather than beside the page.
      const bundleDir = path.dirname(path.resolve(pageDir, src!))
      for (const chunk of imported(readEmitted(pageDir, src!))) {
        ran += run(readEmitted(bundleDir, chunk))
      }
      continue
    }

    ran += run(src ? readEmitted(pageDir, src) : (tag.textContent ?? ""))
  }

  return ran
}

/** The chunks a module bundle pulls in, as written: `import("./static/scripts/…")`. */
function imported(bundle: string): string[] {
  return Array.from(bundle.matchAll(/import\(\s*["'`]([^"'`]+)["'`]\s*\)/g), (match) => match[1])
}

function readEmitted(pageDir: string, src: string): string {
  const file = path.resolve(pageDir, src)
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
}

/**
 * Replace every way this page has of remembering or reporting with a recorder that throws.
 *
 * Prepper keeps nothing about the reader's work and has no server: answering a quiz block,
 * opening a seal, taking a hint, unfolding a heading -- none of it is written anywhere or told
 * to anybody. That is a property of the app rather than of any one feature, so it is checkable
 * in one line, on every screen: `assert.deepEqual(screen.recorded, [])`.
 *
 * `rememberedKeys` are the exceptions, and they are wired as exceptions rather than as a
 * hole: reads and writes of those keys on `localStorage` land in `memory`, which is what
 * `screen.remembered` hands back, and every other key on either storage still trips.
 *
 * Recording alone would let a stored value sit there unnoticed by a test that forgot to
 * look; throwing as well makes the first attempt the failure. Both, because the two
 * questions worth asking are "did it try" and "did it get away with it".
 */
function wireTripwires(dom: JSDOM, memory: Map<string, string>): string[] {
  const recorded: string[] = []
  const { window } = dom

  const trip = (what: string): never => {
    recorded.push(what)
    throw new Error(`the page reached for ${what}, and Prepper records nothing`)
  }

  const permitted = (name: string, key: unknown) =>
    name === "localStorage" && typeof key === "string" && rememberedKeys.has(key)

  const storage = (name: string) => ({
    getItem: (key: string) =>
      permitted(name, key) ? (memory.get(key) ?? null) : trip(`${name}.getItem`),
    setItem: (key: string, value: string) =>
      permitted(name, key) ? void memory.set(key, String(value)) : trip(`${name}.setItem`),
    removeItem: (key: string) =>
      permitted(name, key) ? void memory.delete(key) : trip(`${name}.removeItem`),
    clear: () => trip(`${name}.clear`),
    key: () => trip(`${name}.key`),
    get length(): number {
      return trip(`${name}.length`)
    },
  })

  const replace = (target: object, property: string, value: unknown) => {
    try {
      Object.defineProperty(target, property, { value, configurable: true, writable: true })
    } catch {
      // A host object this DOM will not let us redefine is one the page could not have
      // used either. Nothing to guard.
    }
  }

  replace(window, "fetch", () => trip("fetch"))
  replace(
    window,
    "XMLHttpRequest",
    class {
      open() {
        trip("XMLHttpRequest.open")
      }
    },
  )
  replace(
    window,
    "WebSocket",
    class {
      constructor() {
        trip("WebSocket")
      }
    },
  )
  replace(window, "localStorage", storage("localStorage"))
  replace(window, "sessionStorage", storage("sessionStorage"))
  replace(window, "indexedDB", { open: () => trip("indexedDB.open") })
  replace(window.navigator, "sendBeacon", () => trip("navigator.sendBeacon"))
  replace(window.history, "pushState", () => trip("history.pushState"))
  replace(window.history, "replaceState", () => trip("history.replaceState"))

  try {
    Object.defineProperty(window.document, "cookie", {
      configurable: true,
      get: () => "",
      set: () => trip("document.cookie"),
    })
  } catch {
    // As above.
  }

  return recorded
}
