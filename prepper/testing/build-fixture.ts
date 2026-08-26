/**
 * Seam 1 — `build(fixtureVault) -> emitted site`.
 *
 * Nearly every behaviour in Prepper is a fact about Markdown that goes into the vault
 * and a fact about the site that comes out, so nearly every test goes through here.
 *
 *     const site = await buildFixture("wikilinks")
 *     const page = site.page("lessons/hash-map-lookup-cost")
 *     assert.deepEqual(page.links().map((l) => l.href), ["../problems/two-sum"])
 *
 * Three things this deliberately does *not* do:
 *
 * - **It does not import Quartz's internals.** It shells out to `quartz build`, the same
 *   entry point the dev runs, so a test can never resolve a link differently from a real
 *   build -- and so upstream merges cannot silently change what the tests exercise.
 * - **It does not supply its own configuration.** The build reads the repo's real
 *   `quartz.config.yaml`. A test asserts on the site the dev actually gets.
 * - **It does not hand back an intermediate tree.** Assertions are on emitted HTML,
 *   `contentIndex.json`, and what the build printed. A test that reaches for an mdast
 *   node is testing our arrangement of Quartz rather than Prepper's behaviour, and it
 *   will break on the next merge for no reason.
 */
import assert from "node:assert"
import { execFile } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

import { fromHtml } from "hast-util-from-html"
import { select as hastSelect, selectAll as hastSelectAll } from "hast-util-select"
import { toText } from "hast-util-to-text"
import type { Element, Root } from "hast"

const execFileAsync = promisify(execFile)

const here = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(here, "..", "..")
export const fixturesDir = path.join(here, "fixtures")

/** Where fixture builds land. Inside the gitignored Quartz cache, so nothing is littered. */
const buildOutputRoot = path.join(repoRoot, ".quartz-cache", "fixture-builds")

/** One entry of `contentIndex.json`, as Quartz emits it. */
export interface ContentIndexEntry {
  slug: string
  filePath: string
  title: string
  links: string[]
  tags: string[]
  content: string
  description?: string
  date?: string
  [key: string]: unknown
}

export type ContentIndex = Record<string, ContentIndexEntry>

/** A link as it was emitted: where it points, what it reads as, how it is marked up. */
export interface EmittedLink {
  href: string | undefined
  text: string
  classes: string[]
}

/**
 * One emitted HTML page, queried by CSS selector.
 *
 * Queries are scoped to `main` -- the page's own column -- by default, because the
 * sidebar lists every note in the vault and a page-wide search for a link to `two-sum`
 * would therefore succeed on every page in the site. Pass a scope to narrow or widen:
 *
 *     page.text("h1")                      // the article title
 *     page.selectAll("a", page.body)       // links in the note's own prose
 *     page.selectAll("a", page.tree)       // every link on the page, sidebar included
 */
export class Page {
  constructor(
    /** The slug this page was emitted for, e.g. `lessons/big-o-notation-basics`. */
    readonly slug: string,
    /** The raw HTML, exactly as written to disk. */
    readonly html: string,
    /** The whole parsed document, chrome included. */
    readonly tree: Root,
  ) {}

  /**
   * The page's own column: the article title, whatever the layout renders around the
   * note (topic chips, a "Read first" block, a backlinks panel), and the note itself.
   * Excludes the sidebar, the header, and the footer.
   */
  get main(): Element {
    const center = hastSelect(".center", this.tree)
    assert.ok(center, `page "${this.slug}" emitted no .center column`)
    return center
  }

  /**
   * The note's own rendered Markdown, and nothing the layout added around it. This is
   * the scope in which "a body wikilink" means what the domain says it means.
   */
  get body(): Element {
    const article = hastSelect("article", this.tree)
    assert.ok(article, `page "${this.slug}" emitted no article element`)
    return article
  }

  /** Every element matching `selector`, in document order. */
  selectAll(selector: string, scope: Element | Root = this.main): Element[] {
    return hastSelectAll(selector, scope)
  }

  /** The first element matching `selector`, or undefined. */
  select(selector: string, scope: Element | Root = this.main): Element | undefined {
    return hastSelect(selector, scope) ?? undefined
  }

  /** As `select`, but fails the test rather than returning undefined. */
  require(selector: string, scope: Element | Root = this.main): Element {
    const found = this.select(selector, scope)
    assert.ok(found, `page "${this.slug}" has no element matching "${selector}"`)
    return found
  }

  /**
   * Visible text, whitespace collapsed. With no selector, the whole scope; with one,
   * the first match within it.
   */
  text(selector?: string, scope: Element | Root = this.main): string {
    const node = selector ? this.require(selector, scope) : scope
    return collapse(toText(node, { whitespace: "normal" }))
  }

  /**
   * Every link in the note's own prose, in document order.
   *
   * Quartz turns each heading into its own permalink anchor, and those anchors are
   * indistinguishable from a wikilink by class -- they differ only in sitting inside a
   * heading. They are chrome, not links the author wrote, so they are left out; pass
   * `{ headingAnchors: true }` to ask about them.
   *
   * Pass a `scope` to ask about links the layout rendered around the note instead -- a
   * "This unlocks" rail, say.
   */
  links({
    scope = this.body,
    headingAnchors = false,
  }: { scope?: Element | Root; headingAnchors?: boolean } = {}): EmittedLink[] {
    const anchors = headingAnchors
      ? new Set<Element>()
      : new Set(hastSelectAll("h1 a, h2 a, h3 a, h4 a, h5 a, h6 a", scope))

    return hastSelectAll("a", scope)
      .filter((a) => !anchors.has(a))
      .map((a) => ({
        href: typeof a.properties.href === "string" ? a.properties.href : undefined,
        text: collapse(toText(a, { whitespace: "normal" })),
        classes: classesOf(a),
      }))
  }
}

/** The whole of what one build produced. */
export class EmittedSite {
  #pages = new Map<string, Page>()
  #contentIndex: ContentIndex | undefined
  #notes: ContentIndex | undefined

  constructor(
    /** The fixture vault that was built. */
    readonly vaultDir: string,
    /** Where the site was emitted. */
    readonly outputDir: string,
    /** Site-relative paths of every emitted file, sorted. */
    readonly files: readonly string[],
    /** Everything the build printed, stdout and stderr as the dev would see them. */
    readonly log: string,
    /** The build's exit code. Zero unless Quartz itself failed. */
    readonly exitCode: number,
  ) {}

  /** Raw text of an emitted file, by site-relative path. */
  file(relativePath: string): string {
    const full = path.join(this.outputDir, relativePath)
    assert.ok(
      fs.existsSync(full),
      `no emitted file "${relativePath}". Emitted:\n  ${this.files.join("\n  ")}`,
    )
    return fs.readFileSync(full, "utf8")
  }

  /** Whether a page was emitted for this slug. Workshop notes have none, by design. */
  hasPage(slug: string): boolean {
    return this.files.includes(`${slug}.html`)
  }

  /** The emitted page for a slug, e.g. `problems/two-sum`. Fails if there is none. */
  page(slug: string): Page {
    const cached = this.#pages.get(slug)
    if (cached) return cached

    const html = this.file(`${slug}.html`)
    const page = new Page(slug, html, fromHtml(html))
    this.#pages.set(slug, page)
    return page
  }

  /**
   * Every slug the build emitted an HTML page for, sorted -- including the 404 page and
   * Quartz's generated folder and tag indexes. For "which notes got a page", which is
   * the question the Library/Workshop boundary is about, use `noteSlugs`.
   */
  pageSlugs(): string[] {
    return this.files.filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -".html".length))
  }

  /**
   * `contentIndex.json` as Quartz emitted it, keyed by slug. This is what search and the
   * graph read, and it holds Quartz's generated folder and tag index pages alongside the
   * real notes.
   */
  get contentIndex(): ContentIndex {
    this.#contentIndex ??= JSON.parse(this.file("static/contentIndex.json")) as ContentIndex
    return this.#contentIndex
  }

  /**
   * The content index, narrowed to entries that came from a note in the vault.
   *
   * Quartz synthesises an index page per directory and per tag, and those land in
   * `contentIndex.json` beside the real notes with a `filePath` no file on disk answers
   * to. Filtering on that keeps a test about *notes* from having to know which index
   * pages the layout happens to generate.
   */
  get notes(): ContentIndex {
    this.#notes ??= Object.fromEntries(
      Object.entries(this.contentIndex).filter(([, entry]) =>
        fs.existsSync(path.join(this.vaultDir, entry.filePath)),
      ),
    )
    return this.#notes
  }

  /** Every slug that a note in the vault produced, sorted. */
  noteSlugs(): string[] {
    return Object.keys(this.notes).sort()
  }
}

/** Whitespace-collapse a run of extracted text, so assertions can be written as prose. */
function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/** CSS classes on a hast element, as a plain array. */
export function classesOf(element: Element): string[] {
  const raw = element.properties.className
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === "string") return raw.split(/\s+/).filter(Boolean)
  return []
}

const built = new Map<string, Promise<EmittedSite>>()

/**
 * Build a fixture vault and return what came out.
 *
 * `fixture` is a directory name under `prepper/testing/fixtures/`, or an absolute path
 * to a vault anywhere. Fixtures are small and purpose-built -- one per behaviour
 * cluster, never one large vault every test reads -- so that a failing test names its
 * own subject: the fixture whose only job is "two filenames colliding case-insensitively"
 * is a two-file directory.
 *
 * Repeated calls for the same fixture within a test file share one build.
 */
export function buildFixture(fixture: string): Promise<EmittedSite> {
  const vaultDir = path.isAbsolute(fixture) ? fixture : path.join(fixturesDir, fixture)
  const cached = built.get(vaultDir)
  if (cached) return cached

  const pending = runBuild(vaultDir)
  built.set(vaultDir, pending)
  return pending
}

async function runBuild(vaultDir: string): Promise<EmittedSite> {
  assert.ok(
    fs.existsSync(vaultDir),
    `no fixture vault at "${vaultDir}". Fixtures live in ${fixturesDir}.`,
  )

  const outputDir = path.join(buildOutputRoot, path.basename(vaultDir))
  fs.rmSync(outputDir, { recursive: true, force: true })
  fs.mkdirSync(outputDir, { recursive: true })

  // Shelling out to the CLI is the point: it is the dev-facing entry point, and going
  // through it is what stops a test and a real build from ever disagreeing.
  let stdout = ""
  let stderr = ""
  let exitCode = 0
  try {
    const result = await execFileAsync(
      process.execPath,
      ["./quartz/bootstrap-cli.mjs", "build", "-d", vaultDir, "-o", outputDir],
      { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 },
    )
    stdout = result.stdout
    stderr = result.stderr
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message: string }
    stdout = e.stdout ?? ""
    stderr = e.stderr ?? e.message
    exitCode = e.code ?? 1
  }

  return new EmittedSite(vaultDir, outputDir, listFiles(outputDir), stdout + stderr, exitCode)
}

function listFiles(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else out.push(path.relative(root, full).split(path.sep).join("/"))
    }
  }
  walk(root)
  return out.sort()
}
