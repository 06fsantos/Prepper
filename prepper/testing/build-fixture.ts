/**
 * Seam 1 — `build(fixtureVault) -> emitted site`.
 *
 * Nearly every behaviour in Prepper is a fact about Markdown that goes into the vault
 * and a fact about the site that comes out, so nearly every test goes through here.
 *
 *     const site = await buildFixture("wikilink-shapes")
 *     const page = site.page("lessons/hash-map-lookup-cost")
 *     assert.deepEqual(
 *       page.links().map((l) => l.href),
 *       ["../problems/two-sum"],
 *     )
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
import { createHash } from "node:crypto"
import { execFile } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

import { fromHtml } from "hast-util-from-html"
import { select as hastSelect, selectAll as hastSelectAll } from "hast-util-select"
import { toText } from "hast-util-to-text"
import type { Element, Root } from "hast"

import type { ValidationReport, Violation } from "../validation/violation.ts"

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
   * Quartz turns each heading into its own permalink anchor, marked `role="anchor"` and
   * carrying the same classes as a wikilink. Those are chrome, not links the author
   * wrote, so they are left out; pass `{ headingAnchors: true }` to ask about them. The
   * filter is on the attribute rather than on "sits inside a heading", so a wikilink the
   * author put *in* a heading still counts as theirs.
   *
   * Pass a `scope` to ask about links the layout rendered around the note instead -- a
   * "This unlocks" rail, say.
   */
  links({
    scope = this.body,
    headingAnchors = false,
  }: { scope?: Element | Root; headingAnchors?: boolean } = {}): EmittedLink[] {
    return hastSelectAll("a", scope)
      .filter((a) => headingAnchors || a.properties.role !== "anchor")
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
    /** Everything the build printed: its stdout, then its stderr. */
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
  const raw: unknown = element.properties.className
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === "string") return raw.split(/\s+/).filter(Boolean)
  return []
}

const built = new Map<string, Promise<EmittedSite>>()
const runsPerVault = new Map<string, number>()

/**
 * Build a fixture vault and return what came out.
 *
 * `fixture` is a directory name under `prepper/testing/fixtures/`, or an absolute path
 * to a vault anywhere. Fixtures are small and purpose-built -- one per behaviour
 * cluster, never one large vault every test reads -- so that a failing test names its
 * own subject: the fixture whose only job is "two filenames colliding case-insensitively"
 * is a two-file directory.
 *
 * Repeated calls for the same fixture within a test file share one build. Use
 * `rebuildFixture` for the rare test that needs a second, genuinely separate one.
 */
export function buildFixture(fixture: string): Promise<EmittedSite> {
  const vaultDir = resolveVault(fixture)
  const cached = built.get(vaultDir)
  if (cached) return cached

  const pending = runBuild(vaultDir)
  built.set(vaultDir, pending)
  return pending
}

/**
 * Build a fixture again, ignoring the cache, and return the new site alongside the old.
 *
 * Only useful for asserting on the act of building rather than on its output -- that a
 * rerun emits the same site, or that it left the vault alone. Everything else should use
 * `buildFixture`, which is memoised.
 */
export function rebuildFixture(fixture: string): Promise<EmittedSite> {
  return runBuild(resolveVault(fixture))
}

function resolveVault(fixture: string): string {
  return path.isAbsolute(fixture) ? fixture : path.join(fixturesDir, fixture)
}

async function runBuild(vaultDir: string): Promise<EmittedSite> {
  assert.ok(
    fs.existsSync(vaultDir),
    `no fixture vault at "${vaultDir}". Fixtures live in ${fixturesDir}.`,
  )

  // Named for the vault, disambiguated by its full path so that two fixtures sharing a
  // basename cannot overwrite each other, and by a run number so that a rebuild cannot
  // delete the output an earlier site is still reading lazily.
  const digest = createHash("sha256").update(vaultDir).digest("hex").slice(0, 8)
  const run = (runsPerVault.get(vaultDir) ?? 0) + 1
  runsPerVault.set(vaultDir, run)
  const suffix = run === 1 ? "" : `-run${run}`
  const outputDir = path.join(buildOutputRoot, `${path.basename(vaultDir)}-${digest}${suffix}`)
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
    // A non-zero exit carries `code` as a number; a failure to spawn at all carries it as
    // an errno string, which is not an exit code and must not be reported as one.
    const e = err as { stdout?: string; stderr?: string; code?: unknown; message: string }
    stdout = e.stdout ?? ""
    stderr = e.stderr || e.message
    exitCode = typeof e.code === "number" ? e.code : 1
  }

  return new EmittedSite(vaultDir, outputDir, listFiles(outputDir), stdout + stderr, exitCode)
}

function listFiles(root: string): string[] {
  // Quartz clears the output directory as its first step, so a build that failed before
  // emitting leaves nothing here. Returning empty keeps the failure legible: the test
  // then reads `site.log`, which is what it was captured for.
  if (!fs.existsSync(root)) return []

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

/**
 * Seam 1, through the other consumer: `npm run validate` over a fixture vault.
 *
 *     const run = await validateFixture("schema-and-identity-violations")
 *     assert.equal(run.exitCode, 1)
 *     assert.ok(run.violations.some((v) => v.rule === "record-identity"))
 *
 * The same vault-in / report-out contract as `buildFixture`, and for the same reason:
 * the CLI *is* a `quartz build` -- it runs the pipeline and reads back what the
 * validation emitter collected during it -- so exercising it here exercises the
 * dev-facing entry point CI gates on, not a re-implementation of it.
 *
 * The two consumers of the rule module are asserted through this file and no other. The
 * emitter's channel is `site.log` on a `buildFixture` result; the CLI's is this.
 */
export interface ValidationRun {
  /** The vault that was validated. */
  readonly vaultDir: string
  /** The CLI's exit code: 0 no errors, 1 at least one error, 2 could not validate. */
  readonly exitCode: number
  /** Everything the CLI printed: its stdout, then its stderr. */
  readonly output: string
  /** How many notes it checked. */
  readonly notes: number
  /** Every violation it found, as data rather than as text. */
  readonly violations: Violation[]
}

const validated = new Map<string, Promise<ValidationRun>>()

/** Validate a fixture vault. Repeated calls for the same fixture share one run. */
export function validateFixture(fixture: string): Promise<ValidationRun> {
  const vaultDir = resolveVault(fixture)
  const cached = validated.get(vaultDir)
  if (cached) return cached

  const pending = runValidate(vaultDir)
  validated.set(vaultDir, pending)
  return pending
}

async function runValidate(vaultDir: string): Promise<ValidationRun> {
  assert.ok(
    fs.existsSync(vaultDir),
    `no fixture vault at "${vaultDir}". Fixtures live in ${fixturesDir}.`,
  )

  const digest = createHash("sha256").update(vaultDir).digest("hex").slice(0, 8)
  const reportPath = path.join(
    buildOutputRoot,
    `${path.basename(vaultDir)}-${digest}-violations.json`,
  )
  fs.rmSync(reportPath, { force: true })

  // `node_modules/.bin/tsx <the CLI>` is what `npm run validate` runs, minus npm's own
  // wrapper. Asking the CLI for its violation list as a file rather than scraping its
  // output is the same request the CLI makes of the emitter.
  let stdout = ""
  let stderr = ""
  let exitCode = 0
  try {
    const result = await execFileAsync(
      path.join(repoRoot, "node_modules", ".bin", "tsx"),
      ["prepper/validation/validate.ts", "-d", vaultDir],
      {
        cwd: repoRoot,
        env: { ...process.env, PREPPER_VALIDATION_REPORT: reportPath },
        maxBuffer: 32 * 1024 * 1024,
      },
    )
    stdout = result.stdout
    stderr = result.stderr
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: unknown; message: string }
    stdout = e.stdout ?? ""
    stderr = e.stderr || e.message
    exitCode = typeof e.code === "number" ? e.code : 1
  }

  const report = fs.existsSync(reportPath)
    ? (JSON.parse(fs.readFileSync(reportPath, "utf8")) as ValidationReport)
    : { notes: 0, violations: [] }

  return {
    vaultDir,
    exitCode,
    output: stdout + stderr,
    notes: report.notes,
    violations: report.violations,
  }
}
