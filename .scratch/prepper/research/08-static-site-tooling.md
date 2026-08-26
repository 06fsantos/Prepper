# Static-site tooling for Obsidian vaults

Research for [08-static-site-tooling-for-obsidian-vaults](../issues/08-static-site-tooling-for-obsidian-vaults.md).
Investigated 2026-08-25 against primary sources only (official docs, source repos, npm registry API). Every claim below carries the URL that owns it.

Prepper's constraints, restated so the comparison is anchored: Obsidian-compatible Markdown vault in `content/`, `[[wikilinks]]` resolved to hrefs at build time, a backlink graph computed at build time, fenced ```quiz blocks rendered as interactive components, and a spaced-repetition practice UI layered over otherwise-static pages. Single-user, static deploy, no backend.

---

## TL;DR comparison

| | Quartz v5 | Astro | Next.js `output: 'export'` | Eleventy 3 |
|---|---|---|---|---|
| Wikilinks | **Built in**, Obsidian-grade (aliases, headings, block refs, embeds, transclusion) | None native; remark plugin (`remark-wiki-link` family) + permalink pre-pass | None native; same remark plugins via `@next/mdx` | None native; `@photogabble/eleventy-plugin-interlinker` (markdown-it, not remark) |
| Backlinks | **Built in** as a component; reverse index derived, not indexed | Custom (loader or a second pass) | Custom | **Built in** to the interlinker plugin (`backlinks` page data) |
| Graph view | **Built in** (`@quartz-community/graph`, fed by `contentIndex.json`) | Custom | Custom | Not in the plugin (author lists it as roadmap) |
| Frontmatter | Built in, untyped | **Zod-validated content collections** | `gray-matter`/`remark-frontmatter` by hand | Built in, untyped (data cascade) |
| Custom fenced block → interactive widget | Vanilla-JS pattern only (mermaid is the reference implementation); no component hydration | **Islands** (`client:*`), cleanest via MDX `components` mapping or a custom element | React Client Components (`'use client'`) via `mdx-components.tsx` | `<is-land>` web component, wired by hand |
| JS shipped on a page with no widget | Quartz's own SPA router + popovers, always | **Zero** | React runtime + per-route RSC payload | Zero |
| Bespoke practice UI | Fights the grain — no client framework | Natural fit | Natural fit | Workable, most manual |

**Headline finding for point 6:** no framework computes a reverse backlink index natively. Quartz and the Eleventy interlinker plugin both *provide* backlinks, but neither is the framework — both are plugins, and Quartz's is a linear scan at render time rather than a real index. Astro and Next.js give you nothing; it is custom work there. Detail in [§6](#6-does-anything-compute-a-reverse-backlink-index-natively).

---

## 1. Quartz (jackyzha0/quartz)

### Status and shape

- Self-described as "a fast, batteries-included static-site generator that transforms Markdown content into fully functional websites"; the feature list on the homepage includes wikilinks, transclusions, backlinks, graph view, full-text search, Obsidian compatibility, LaTeX, syntax highlighting, popover previews, and a plugin system — https://quartz.jzhao.xyz/
- 13,093 stars, default branch `v5`, last push 2026-08-18 — https://api.github.com/repos/jackyzha0/quartz
- **Version caveat.** `package.json` on the default branch is `"version": "5.0.0"` (https://raw.githubusercontent.com/jackyzha0/quartz/v5/package.json) and the docs site says v5.0.0, but the GitHub *Releases* list stops at `v4.0.8` published 2023-08-21 (https://api.github.com/repos/jackyzha0/quartz/releases). v5 is shipping from the branch and from npm packages, not from tagged releases.
- **v5 is a re-architecture.** The core repo no longer contains the plugins. `quartz/plugins/` on `v5` holds only `emitters/{assets,componentResources,helpers,static}.ts` and `transformers/index.ts` (https://api.github.com/repos/jackyzha0/quartz/git/trees/v5?recursive=1). Everything else — backlinks, graph, Obsidian flavored markdown, crawl-links, search, explorer — is an `@quartz-community/*` npm dependency, ~45 of them listed in `package.json`. Configuration moved to `quartz.config.yaml`, and there is an `npx quartz plugin add github:quartz-community/<name>` install flow plus a `prebuild` step running `quartz/plugins/loader/install-plugins.ts`.

### What you get for free

**Wikilinks.** Full Obsidian syntax, documented in `docs/features/wikilinks.md` (https://raw.githubusercontent.com/jackyzha0/quartz/v5/docs/features/wikilinks.md): `[[Path to file]]`, `[[Path to file | alias]]`, `[[Path to file#Anchor]]`, `[[Path to file#^block-ref]]`, image embeds `![[img|100x145]]`, and full-page/heading/block transclusion `![[Path to file#Anchor]]`. Matching is case-insensitive "to mirror Obsidian"; generated URLs are lowercased. Parsing lives in `@quartz-community/obsidian-flavored-markdown`, which now delegates to `@quartz-community/remark-obsidian` and `@quartz-community/rehype-obsidian` (https://raw.githubusercontent.com/quartz-community/obsidian-flavored-markdown/HEAD/src/transformer.ts, lines 18–19; the file's own `wikilinkRegex` is marked "Deprecated: retained for backwards compatibility only; parsing now uses remark-obsidian").

**Link resolution.** `@quartz-community/crawl-links` is a rehype transformer that rewrites every internal `<a href>` through `transformLink(fileSlug, dest, {strategy, allSlugs})`, tags links `internal`/`external`/`alias`, optionally flags unresolvable slugs with a `broken` class, and stamps `data-slug` on each anchor — https://raw.githubusercontent.com/quartz-community/crawl-links/HEAD/src/transformer.ts

**Frontmatter.** `@quartz-community/note-properties` / the Frontmatter transformer parses it into `fileData.frontmatter`; it is plain data with no schema validation (contrast Astro's Zod).

**Graph view.** `@quartz-community/graph`, fed from the `contentIndex.json` emitted by `@quartz-community/content-index`, whose `ContentDetails` type is `{slug, filePath, title, links: SimpleSlug[], tags, content, richContent?, ...}` — https://raw.githubusercontent.com/quartz-community/content-index/HEAD/src/emitter.ts (lines 20–27, 149–152).

### Extensibility: what the plugin architecture actually allows

Three plugin kinds, per https://quartz.jzhao.xyz/advanced/making-plugins :

- **Transformers** — "map over content, taking a Markdown file and outputting modified content or adding metadata to the file itself." Hooks: `textTransform` (raw text before parsing), `markdownPlugins(ctx)` returning remark plugins over the mdast, `htmlPlugins(ctx)` returning rehype plugins over the hast, and `externalResources()` declaring client-side JS/CSS/head elements.
- **Filters** — `shouldPublish()` → boolean.
- **Emitters** — `emit()` writes output files and returns their paths; `partialEmit()` for incremental builds; `getQuartzComponents()` declares layout components. Emitters can produce arbitrary pages, which is the hook for a bespoke `/practice` route.

**Custom fenced blocks are a solved, copyable pattern.** Quartz's own mermaid support is exactly the shape a ```quiz block needs — a remark plugin visiting `code` nodes and attaching `hProperties`, plus an inline script registered through `externalResources`:

```ts
visit(tree, "code", (node: Code) => {
  if (node.lang === "mermaid") {
    file.data.hasMermaidDiagram = true
    node.data = { hProperties: { className: ["mermaid"], "data-clipboard": JSON.stringify(node.value) } }
  }
})
```
— https://raw.githubusercontent.com/quartz-community/obsidian-flavored-markdown/HEAD/src/transformer.ts (lines 559–575), with the matching `externalResources()` pushing `{script: mermaidScript, loadTime: "afterDOMReady", contentType: "inline", moduleType: "module"}` (lines 596–630).

**Where it gets thin: interactive UI.** Quartz components are Preact, but they are *server-rendered only*. `renderPage.tsx` imports `render` from `preact-render-to-string` and returns `"<!DOCTYPE html>\n" + render(doc)` — https://raw.githubusercontent.com/jackyzha0/quartz/v5/quartz/components/renderPage.tsx (lines 1, 375). There is no hydration step. Interactivity comes from `beforeDOMLoaded` / `afterDOMLoaded` script strings that re-run on a `nav` event dispatched by Quartz's SPA router, with `window.addCleanup()` for teardown — https://quartz.jzhao.xyz/advanced/creating-components . Those strings are concatenated, wrapped in IIFEs and minified with esbuild's `transform` (not `build`), then in production emitted as content-hashed per-script files loaded by a generated orchestrator — https://raw.githubusercontent.com/jackyzha0/quartz/v5/quartz/plugins/emitters/componentResources.ts (lines 72–82, 330–400).

Practical read: a quiz widget and a spaced-repetition queue in Quartz means writing vanilla DOM/`localStorage` code (or bundling your own framework into a script string inside a plugin package, as the community plugins do with tsup). Quartz gives you the vault semantics free and charges you for the app.

---

## 2. Astro

**Content collections.** `defineCollection()` in `src/content.config.ts`, with a `loader` (`glob()` over a directory of Markdown, `file()`, or custom) and an optional **Zod** schema — "Schemas enforce consistent frontmatter or entry data within a collection through Zod validation." Query with `getCollection()` / `getEntry()`; each entry exposes `id`, `data` (validated frontmatter), and `body` (raw content); `render(entry)` yields a `<Content />` component. Full TypeScript inference on queries. — https://docs.astro.build/en/guides/content-collections/

**Custom loaders can do build-time graph work.** The Content Loader API's object loader receives a `LoaderContext` with `store` (a key/value DB: `set/get/entries/keys/values/delete/has/clear`), `meta`, `parseData()`, `generateDigest()`, `renderMarkdown()` ("converts Markdown strings to HTML with metadata extraction"), `logger`, `config`, and `watcher` — https://docs.astro.build/en/reference/content-loader-reference/ . This is the sanctioned place to do a whole-vault pass: read every note, extract wikilinks, build the reverse index, and `store.set()` each entry with its `backlinks` already attached.

**Wikilinks: none native.** Astro's Markdown documentation never mentions wikilinks — https://docs.astro.build/en/guides/markdown-content/ . You bring a remark plugin via `markdown.remarkPlugins`, which "Pass[es] remark plugins to customize how your Markdown is built" (also `markdown.rehypePlugins`, `markdown.remarkRehype`, `markdown.shikiConfig`, `markdown.syntaxHighlight`) — https://docs.astro.build/en/reference/configuration-reference/ . See §5 for which plugin.

**Custom fenced blocks.** Two viable routes, both first-party-supported:

1. **MDX component mapping.** `@astrojs/mdx` lets you map Markdown-generated HTML elements to your own components: "Custom components defined and exported in an MDX file must always be imported and then passed back to the `<Content />` component via the `components` property", e.g. `<Content components={{...components, h1: Heading }} />`. Mapping `pre` (or `code`) to a `QuizBlock.astro` that inspects the `language-quiz` class and delegates to an island is the clean path. MDX works in content collections: `loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/blog" })`. — https://docs.astro.build/en/guides/integrations-guide/mdx/
2. **Plain `.md` + rehype + custom element.** Components cannot be used in plain `.md`; the docs are explicit that for "including components and JSX expressions in Markdown, add the `@astrojs/mdx` integration" — https://docs.astro.build/en/guides/markdown-content/ . So with a vanilla vault you write a rehype plugin that turns the `quiz` fence into a custom element (`<quiz-block data-quiz="…">`) and register a web component for it. `markdown.syntaxHighlight` accepts an object with `excludeLangs`, which is how you stop Shiki from mangling the `quiz` fence before your plugin sees it — https://docs.astro.build/en/reference/configuration-reference/

Route 2 matters for Prepper: keeping the vault Obsidian-authorable argues for plain `.md`, and MDX in an Obsidian vault is not something Obsidian renders.

**Islands.** "Zero JavaScript" by default — "Astro automatically strips out all client-side code from components unless you explicitly mark them interactive." Interactivity is opt-in per component via `client:load`, `client:idle`, `client:visible`, `client:only`, each island loading independently; `server:defer` adds deferred server islands (irrelevant for a static deploy). — https://docs.astro.build/en/concepts/islands/

This is the closest match to Prepper's shape: static lesson pages that ship no JS, quiz widgets that hydrate on visibility, and a `/practice` route that is a full client island.

**Scale signal:** `astro@7.2.6`, published 2026-08-24, 18,224,521 downloads in the last 30 days — https://registry.npmjs.org/astro , https://api.npmjs.org/downloads/point/last-month/astro

---

## 3. Next.js static export

**What `output: 'export'` gives you.** `next build` writes an `out/` folder of HTML/CSS/JS deployable to any static host. Server Components run at build time; Client Components are prerendered to HTML and hydrate; route transitions are client-side, "behaves like a traditional SPA". Route Handlers can emit static files but only with `export const dynamic = 'force-static'` and only `GET`. — https://nextjs.org/docs/app/guides/static-exports (docs version 16.3.2, lastUpdated 2026-08-09)

**Unsupported list (verbatim from that page):** dynamic routes with `dynamicParams: true`; dynamic routes without `generateStaticParams()`; Route Handlers that rely on `Request`; Cookies; Rewrites; Redirects; Headers; Proxy; ISR; Image Optimization with the default loader; Draft Mode; Server Actions; Intercepting Routes. None of these bite a single-user static prep app, but `next/image`'s default loader being out means a custom `loaderFile`.

**Markdown/MDX.** `@next/mdx` + `@mdx-js/loader` + `@mdx-js/react`; add `md`/`mdx` to `pageExtensions`; `.md` needs `extension: /\.(md|mdx)$/` because "By default, `@next/mdx` only compiles files with the `.mdx` extension." An `mdx-components.tsx` at project root is **required** for App Router and is the global element→component map (`{ h1: …, img: … }`) — this is where a `pre`/`code` override renders the quiz component. Per-page overrides via `<Welcome components={overrideComponents} />`. remark/rehype plugins go in `createMDX({options: {remarkPlugins, rehypePlugins}})`, and because the ecosystem is ESM you must use `next.config.mjs`/`.ts`. With Turbopack, plugins must be named as **strings** and "remark and rehype plugins without serializable options cannot be used yet with Turbopack, because JavaScript functions can't be passed to Rust" — https://nextjs.org/docs/app/guides/mdx

That Turbopack restriction is a real constraint for Prepper: a wikilink resolver needs a `permalinks` list (see §5), i.e. non-serializable options, so it would force the webpack path or a pre-pass.

**Frontmatter.** "`@next/mdx` does **not** support frontmatter by default"; the docs point at `remark-frontmatter`, `remark-mdx-frontmatter`, or `gray-matter`. Collections/indexes are hand-rolled: "You can use packages like Node's `fs` module or `globby` to read a directory of posts and extract the metadata." — same page. There is no content-collection equivalent, no schema validation, no `getCollection()`.

**Wikilinks, backlinks:** nothing. Same remark plugins as Astro, same custom reverse-index work.

**Interactivity.** React Client Components (`'use client'`), prerendered at build and hydrated in the browser. The islands comparison is unfavorable for a mostly-static content site: a static-exported Next page ships the React runtime and its RSC payload whether or not the page has a widget, where Astro ships nothing.

**Scale signal:** `next` — 216,749,898 downloads last 30 days — https://api.npmjs.org/downloads/point/last-month/next

---

## 4. Eleventy

**Markdown engine is markdown-it, not remark.** Eleventy v3 uses `markdown-it@14.x`; you customize via `setLibrary()` (your own configured instance) or `amendLibrary()` (mutate the default, v2.0+), and extend with markdown-it plugins from npm. The page does not mention remark, rehype, or wikilinks at all. — https://www.11ty.dev/docs/languages/markdown/

This is the single most consequential fact about Eleventy for Prepper: **the entire remark/rehype wikilink ecosystem in §5 is unavailable**. Anything you reuse has to be markdown-it-shaped.

**Wikilinks + backlinks: `@photogabble/eleventy-plugin-interlinker`.** This is the mature Obsidian-oriented option and it is unusually complete — https://raw.githubusercontent.com/photogabble/eleventy-plugin-interlinker/HEAD/README.md

- "This plugin will parse both Wikilinks and internal anchor links to build each pages inbound and outbound internal links."
- Syntax: `[[Page Title]]`, `[[Page|display text]]`, `[[Page#Heading]]` fragment links, path links `[[/blog/post-1234.md]]` and relative `[[../../something.md]]`, and `aliases:` frontmatter (duplicate aliases halt the build).
- **Backlinks are first-class:** "A backlink for a page is a link from another page to that page; this plugin tracks all backlinks through either embedding or internal wikilinks. This data is made available to your page via its `backlinks` data value."
- Embeds/transclusion: `![[Page]]` renders the target through an 11ty layout (`defaultLayout`, per-page `embedLayout`).
- **Dead-link report:** `deadLinkReport: 'console' | 'json' | 'none'`, writing `.dead-links.json` in json mode.
- **Custom resolving functions:** `resolvingFns: new Map([['issue', (link, currentPage) => …]])` invoked by `[[issue:19]]` — a genuinely nice extension seam.
- Documented lookup order: path match → url → title → slug → alias.
- **Stated caveats (verbatim):** "This plugin doesn't implement all Obsidian's wikilink support for example linking to a block in a note and linking to a heading in a note is not currently supported"; "Only supports embedding one note inside another". Graph view is roadmap, not shipped. Pages with `eleventyExcludeFromCollections: true` are not parsed.

Maturity: v1.1.2 published 2025-10-23, ~680 downloads/month — https://registry.npmjs.org/@photogabble%2Feleventy-plugin-interlinker . Small, single-maintainer, but actively maintained within the last year.

**Custom fenced blocks.** Two routes. (a) Override the markdown-it fence renderer — "Renderer rules are located in `md.renderer.rules[name]` and are simple functions with the same signature: function (tokens, idx, options, env, renderer)", with the documented pattern of stashing the default renderer and proxying to it for cases you don't handle — https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md . (b) Paired shortcodes instead of fences: "Markdown files are pre-processed as Liquid templates by default—any shortcodes available in Liquid templates are also available in Markdown files", and "Paired Shortcodes have a start and end tag—and allow you to nest other template content inside" — https://www.11ty.dev/docs/shortcodes/ . Route (b) breaks Obsidian-compat (`{% quiz %}` is not vault-native), so (a) is the one.

**Islands.** Eleventy's answer is `@11ty/is-land`, "a framework independent partial hydration islands architecture implementation", 1.83 kB compressed, zero dependencies, works with Vue/Svelte/Preact/Alpine/Lit. Loading conditions on the `<is-land>` element: `on:visible`, `on:load`, `on:idle`, `on:interaction`, `on:media`, `on:save-data`; all conditions must be satisfied; islands nest and inherit parent conditions. — https://www.11ty.dev/docs/plugins/partial-hydration/ . `@11ty/is-land@5.0.1`, published 2025-12-02, ~5k downloads/month — https://registry.npmjs.org/@11ty/is-land

So Eleventy *can* do islands, but nothing wires the fence renderer to an island for you; that's your glue plus your own bundling step for the widget's JS (Eleventy has no bundler).

**Scale signal:** `@11ty/eleventy@3.1.6`, 2026-06-02, 740,309 downloads/month — https://registry.npmjs.org/@11ty/eleventy

---

## 5. The remark/rehype plugin ecosystem

All figures from the npm registry API (`registry.npmjs.org`) and downloads API (`api.npmjs.org/downloads/point/last-month/...`), fetched 2026-08-25; the download window is 2026-07-25 → 2026-08-23.

### Wikilink resolution

| Package | Latest | Published | Downloads/mo | Repo signal |
|---|---|---|---|---|
| `remark-wiki-link` (landakram) | 2.0.1 | 2023-10-10 | 83,862 | 109 stars, last push **2023-10-10**, 11 open issues, not archived — https://api.github.com/repos/landakram/remark-wiki-link |
| `@quartz-community/remark-obsidian` | 0.2.2 | 2026-07-26 | 203,987 | active, part of Quartz v5 |
| `@quartz-community/rehype-obsidian` | 0.1.2 | 2026-07-22 | 195,932 | active, part of Quartz v5 |
| `@flowershow/remark-wiki-link` | 4.0.0 | 2026-06-23 | 3,193 | 47 stars, last push 2025-12-19 — https://api.github.com/repos/flowershow/remark-wiki-link |
| `@portaljs/remark-wiki-link` | 1.2.0 | 2024-04-17 | 2,138 | monorepo `datopian/portaljs`, 2,344 stars, last push 2026-08-25 (monorepo activity, not necessarily this package) |
| `remark-obsidian` (johackim) | 1.12.1 | 2026-05-10 | 677 | — |
| `remark-obsidian-link` | 0.2.4 | 2024-09-16 | 1,071 | — |
| `markdown-it-wikilinks` | 1.4.0 | 2023-08-12 | 824 | markdown-it, i.e. the Eleventy path |

**Reading the numbers honestly.** `remark-wiki-link`'s 83k/month against a repo untouched since October 2023 is the classic transitive-dependency signature — it is depended upon, not developed. It works, and its API is small enough that staleness is survivable, but nobody is fixing it. The `@quartz-community/*` numbers (~200k/mo on packages first published weeks ago) almost certainly reflect Quartz's own CI/install traffic across ~45 sibling packages rather than independent adoption; do not read them as ecosystem endorsement. There is no large, actively-maintained, framework-neutral wikilink plugin. This is the weakest link in the whole ecosystem.

**What `remark-wiki-link` actually does** (https://raw.githubusercontent.com/landakram/remark-wiki-link/master/README.md): parses `[[Wiki Links]]` into a `wikiLink` mdast node carrying `data.alias`, `data.permalink`, `data.exists`, and `data.hProperties.{className,href}`; renders to `<a class="internal new" href="…">`. Options: `permalinks` (array of existing permalinks — existence is `data.exists`), `pageResolver(name) -> [permalinks]` (default `(name) => [name.replace(/ /g, '_').toLowerCase()]`), `hrefTemplate(permalink) -> path`, `wikiLinkClassName`, `newClassName`. Aliases use `[[Real Page:Page Alias]]` — **note the colon, not Obsidian's pipe**; Obsidian writes `[[Real Page|Alias]]`. The README also warns about the micromark parser split: "For remark 12, use v0.0.x of this package. For remark 13+, use v1.0.0 or above."

Two implications for Prepper, both structural:

1. **`permalinks` must be supplied**, which forces a **two-pass build**: enumerate the vault's slugs first, then run the Markdown pipeline with that list. In Astro this pass belongs in a custom loader (§2); in Next.js it's a `globby`+`gray-matter` prelude in `next.config.mjs`; and non-serializable options collide with Turbopack (§3).
2. **Alias syntax differs from Obsidian's**, so either configure/patch it or accept a divergence from what Obsidian renders. Verify before committing.

### Backlink / reverse-index computation

**No remark or rehype plugin does this, and structurally none can.** A unified processor operates on one file at a time; a reverse index is a whole-corpus fold. The plugin's job ends at recording each file's outgoing links onto `file.data` — which is precisely what Quartz's crawl-links does, ending with `file.data.links = [...outgoing]` (https://raw.githubusercontent.com/quartz-community/crawl-links/HEAD/src/transformer.ts). The inversion has to happen in whatever layer sees all files at once. I searched npm for a backlink-computing remark/rehype plugin and found none; see "what I could not verify".

### Custom directives and fenced blocks

| Package | Latest | Published | Downloads/mo |
|---|---|---|---|
| `remark-directive` | 4.0.0 | 2025-02-27 | 13,856,248 |
| `remark-gfm` | 4.0.1 | 2025-02-10 | 143,488,948 |
| `remark-frontmatter` | 5.0.0 | 2023-09-18 | 19,454,451 |
| `unist-util-visit` | 5.1.0 | 2026-01-22 | 228,235,547 |
| `mdast-util-find-and-replace` | 3.0.2 | 2025-01-03 | 140,367,290 |
| `rehype-raw` | 7.0.0 | 2023-08-26 | 65,325,803 |
| `rehype-mermaid` | 3.0.0 | 2024-10-08 | 396,326 |
| `remark-custom-blocks` | 2.6.1 | 2024-04-27 | 10,587 |

The contrast is stark: the *generic* AST tooling is enormous and healthy (remarkjs/syntax-tree org), while the *wikilink-specific* layer is a long tail of small projects. That asymmetry is the ecosystem's real shape.

For Prepper's ```quiz block specifically, **you do not need a plugin at all.** A fenced block is already a first-class mdast `code` node with `lang: "quiz"` and `value: "<the body>"`. A ~15-line `unist-util-visit` pass over `code` nodes is the whole implementation — this is literally how Quartz ships mermaid (§1). `remark-directive` (`:::quiz`) is the alternative if you'd rather have structured attributes, and is by far the healthiest option in this table, but `:::quiz` renders as literal text in Obsidian whereas a ```quiz fence renders as a tidy code block. **Fences win on vault-compatibility grounds.**

---

## 6. Does anything compute a reverse backlink index natively?

**No framework does. Two plugins do, in different ways, and one of them is not really an index.**

**Quartz — provided, but derived per page, not indexed.** The `Backlinks` component recomputes the reverse relation for every page by linear-scanning every file:

```ts
export function selectBacklinkSources<T extends BacklinkCandidate>(allFiles: T[], currentSlug: string): T[] {
  return allFiles.filter((file) => file.unlisted !== true && file.links?.includes(currentSlug))
}
```
— https://raw.githubusercontent.com/quartz-community/backlinks/HEAD/src/components/Backlinks.tsx

That is O(pages × links) overall, not a built index. The forward data it consumes is `file.data.links`, set by crawl-links (§1). Practically irrelevant at Prepper's scale; worth knowing it's a scan and not a map.

**Eleventy interlinker — genuinely provided.** "this plugin tracks all backlinks through either embedding or internal wikilinks. This data is made available to your page via its `backlinks` data value" — https://raw.githubusercontent.com/photogabble/eleventy-plugin-interlinker/HEAD/README.md . Of everything surveyed, this is the closest thing to a native backlink index, and it's an 11ty plugin, not 11ty itself.

**Astro — custom, but there's a right place to put it.** Content collections do not compute backlinks; https://docs.astro.build/en/guides/content-collections/ never mentions them. The Content Loader API's `store` + `renderMarkdown()` is the sanctioned whole-corpus hook — https://docs.astro.build/en/reference/content-loader-reference/ . So: custom work, ~50 lines, in a supported seam, and it's the same pass that produces the `permalinks` list `remark-wiki-link` needs. One pass buys both.

**Next.js — fully custom.** No collection layer at all; the docs tell you to use `fs`/`globby` and extract metadata yourself — https://nextjs.org/docs/app/guides/mdx . Backlinks are yours end to end, and there is no framework-blessed place to put the pass.

---

## Decision framing

Nothing here is a recommendation — the ticket asked what each supports — but the axes that actually separate them:

- **Quartz** is the only tool that treats the vault as the domain model. Wikilinks, transclusion, backlinks, graph, popovers all arrive free and correct. The cost is the practice UI: no hydration, so a spaced-repetition queue is vanilla JS inside a plugin package, and you inherit a v5 re-architecture with no tagged release and ~45 `0.1.x` dependencies. **Fastest to a good-looking vault; slowest to a good app.**
- **Astro** inverts that. You build wikilink resolution and the backlink index yourself (~a day, in a documented loader seam), and in exchange the quiz components and practice UI are exactly what the islands model is for, with zero JS on pages that don't need it. **The one caveat to verify first is fenced-block → island in plain `.md`** (custom element route, since MDX is not Obsidian-native).
- **Eleventy** gets you closest to Quartz's vault semantics without Quartz, via one small plugin that already ships backlinks — but it is markdown-it, so it is cut off from every remark plugin, and its islands story is fully manual with no bundler.
- **Next.js static export** offers the least: no content layer, no frontmatter support out of the box, no wikilinks, no backlinks, a Turbopack restriction that collides with the wikilink plugin's non-serializable options, and a heavier JS baseline on pages that are mostly prose. Its advantage is only relevant if the "no backend initially" caveat is expected to expire.

---

## What I could not verify

Stated plainly, not papered over:

1. **Quartz v5's release status.** The default branch and docs say 5.0.0, but there is no `v5` GitHub release tag and the newest tagged release is `v4.0.8` (2023). I could not determine whether v5 is considered stable, whether v4 is still the recommended install for new users, or what the migration path is. The `@quartz-community/*` packages are all `0.1.x`–`0.2.x`, which reads pre-1.0. **Check `docs/getting-started` and the repo's CHANGELOG before committing.**
2. **The `@quartz-community/*` download figures.** ~200k/month on packages published weeks ago is almost certainly CI/install traffic, not adoption. I did not verify this against an independent source; treat those numbers as uninformative rather than as evidence of maturity.
3. **`@quartz-community/remark-obsidian` internals.** I confirmed OFM delegates to it but did not read its source, so I could not verify exactly which Obsidian wikilink edge cases it handles versus the deprecated inline regex. The claims about block refs and transclusion come from Quartz's `docs/features/wikilinks.md`, i.e. the project's own docs rather than its code.
4. **Astro: fenced block → hydrated island in plain `.md`.** I verified components cannot be used in `.md` and that MDX supports element→component mapping. I did **not** find a first-party doc page demonstrating a rehype plugin emitting a custom element that an Astro island then hydrates. The custom-element route is standard practice and follows from the documented primitives, but it is inference, not a cited recipe. **Prototype this before choosing Astro.**
5. **Astro `markdown.syntaxHighlight.excludeLangs`.** Confirmed as a documented option on the configuration reference; I did not confirm the exact behavior for an unknown language like `quiz` (whether it passes the node through untouched or still wraps it in `<pre><code>`).
6. **No backlink-computing remark/rehype plugin exists.** This is an absence-of-evidence claim from targeted npm registry lookups, not an exhaustive search. The architectural argument (unified is per-file; reverse indexing is whole-corpus) is sound, but I cannot prove nothing exists.
7. **Astro/Next/Eleventy performance on a vault of Prepper's size.** No build-time benchmarks gathered for any option.
8. **Quartz's `nav`-event lifecycle under a stateful widget.** The docs describe `document.addEventListener("nav", …)` and `window.addCleanup()`, but I did not verify how a stateful practice UI (a review queue with in-memory scheduling state) survives SPA navigation, or whether SPA mode can be disabled cleanly.
9. **Whether `remark-wiki-link`'s alias syntax is configurable.** The README documents `[[Real Page:Page Alias]]` (colon) while Obsidian uses a pipe. I could not find an option to change the separator, and did not read the source to check. If Obsidian-authored `[[Page|alias]]` links are in the vault, **verify this first** — it may rule the plugin out or force a fork.
10. **Eleventy interlinker's bus factor.** Single maintainer, ~680 downloads/month, last publish 2025-10-23. Actively maintained today; I have no basis to predict tomorrow.
