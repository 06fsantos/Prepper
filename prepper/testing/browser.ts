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
 * Prepper stores no per-user state and has no server, so "this records nothing" is a fact
 * about the app that every screen can be asked to confirm. See `wireTripwires`.
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
 * Build a fixture, load one of its pages into a DOM, and run Prepper's scripts in it.
 *
 * `scripts: false` is the reader with JavaScript off -- and, near enough, the reader whose
 * page has not finished loading, which is the same reader for the half-second that matters.
 */
export async function openPage(
  fixture: string,
  slug: string,
  { scripts = true }: { scripts?: boolean } = {},
): Promise<Screen> {
  const site = await buildFixture(fixture)
  const dom = new JSDOM(site.page(slug).html, {
    runScripts: "outside-only",
    url: `${origin}/${slug}`,
  })
  const recorded = wireTripwires(dom)
  const ran = scripts ? runPrepperScripts(dom, site, slug) : 0
  return new Screen(dom.window, dom.window.document.documentElement, ran, recorded)
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
  const recorded = wireTripwires(host)
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
 */
function runPrepperScripts(dom: JSDOM, site: EmittedSite, slug: string): number {
  const pageDir = path.dirname(path.join(site.outputDir, `${slug}.html`))
  let ran = 0

  for (const tag of Array.from(dom.window.document.querySelectorAll("script"))) {
    const src = tag.getAttribute("src")
    if (src?.startsWith("http")) continue

    const source = src ? readEmitted(pageDir, src) : (tag.textContent ?? "")
    if (!source.includes(prepperScriptMarker)) continue

    dom.window.eval(source)
    ran += 1
  }

  return ran
}

function readEmitted(pageDir: string, src: string): string {
  const file = path.resolve(pageDir, src)
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
}

/**
 * Replace every way this page has of remembering or reporting with a recorder that throws.
 *
 * Prepper stores no per-user state and has no server: answering a quiz block, opening a
 * seal, taking a hint -- none of it is written anywhere or told to anybody. That is a
 * property of the app rather than of any one feature, so it is checkable in one line, on
 * every screen: `assert.deepEqual(screen.recorded, [])`.
 *
 * Recording alone would let a stored value sit there unnoticed by a test that forgot to
 * look; throwing as well makes the first attempt the failure. Both, because the two
 * questions worth asking are "did it try" and "did it get away with it".
 */
function wireTripwires(dom: JSDOM): string[] {
  const recorded: string[] = []
  const { window } = dom

  const trip = (what: string): never => {
    recorded.push(what)
    throw new Error(`the page reached for ${what}, and Prepper records nothing`)
  }

  const storage = (name: string) => ({
    getItem: () => trip(`${name}.getItem`),
    setItem: () => trip(`${name}.setItem`),
    removeItem: () => trip(`${name}.removeItem`),
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
