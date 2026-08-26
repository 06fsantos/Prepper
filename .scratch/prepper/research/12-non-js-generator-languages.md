# Markdown generator tooling in Rust, Go, Python, and Java

Research for [12-non-js-generator-languages](../issues/12-non-js-generator-languages.md).
Investigated 2026-08-25 against primary sources only (official docs, source repositories, crates.io / pkg.go.dev / PyPI / Maven Central / GitHub REST APIs). Every claim carries the URL that owns it.

Companion: [Static-site tooling for Obsidian vaults](08-static-site-tooling.md) covers the JavaScript half. This file deliberately does not repeat it; the cross-ecosystem comparison is in [§6](#6-comparative-assessment).

Prepper's constraints, restated: an Obsidian-compatible Markdown vault in `content/` with **YAML frontmatter**, `[[wikilinks]]` resolved to hrefs at build time, a **reverse backlink index** (a whole-corpus fold), fenced ```` ```quiz ```` blocks intercepted so they render as interactive client-side components, static HTML out, no backend. The client-side widgets are browser JS/TS regardless of generator language — that is out of scope here.

---

## TL;DR comparison

| | Rust | Go | Python | Java |
|---|---|---|---|---|
| Best parser | comrak | goldmark | markdown-it-py | commonmark-java |
| Walkable **and re-renderable** AST | **Yes** (arena tree, `format_html`) | **Yes** (`ast.Node` + `ASTTransformer` + custom `NodeRenderer`) | Yes (token stream + `SyntaxTreeNode`; render rules) | **Yes** (`Node` + `Visitor` + `NodeRenderer`) |
| CommonMark conformance | 100% CommonMark + GFM (comrak); pulldown-cmark ~spec-tracking | CommonMark 0.31.2 | 100% CommonMark (markdown-it-py) | CommonMark (0.30.0, spec.txt in repo) |
| Native wikilinks in the parser | **Yes — both** comrak (`wikilinks_title_after_pipe`) and pulldown-cmark (`ENABLE_WIKILINKS`, "Obsidian-style") | Via `goldmark-wikilink` with a `Resolver` interface | Python-Markdown bundles a `wikilinks` extension (no pipe aliases); markdown-it-py/mistune: none | `flexmark-ext-wikilink` (but flexmark is stale); commonmark-java: none |
| YAML frontmatter | comrak `front_matter_delimiter`; pulldown-cmark `ENABLE_YAML_STYLE_METADATA_BLOCKS` (skips, does not parse) | `goldmark-meta` / `goldmark-frontmatter` | `python-frontmatter`, or Python-Markdown `meta` | `commonmark-ext-yaml-front-matter` + SnakeYAML |
| Fenced-block interception | comrak `codefence_renderers` map, or AST walk | AST walk / custom `NodeRenderer`; **Hugo: `render-codeblock-quiz.html`** | Override `md.renderer.rules["fence"]` | Custom `NodeRenderer` for `FencedCodeBlock` |
| Existing SSG usable as-is | Zola — **no**, TOML-only frontmatter | Hugo — plausible, but parser not extensible | MkDocs — plausible, but near-dormant | JBake — **no**, `key=value` header |
| Any SSG with real wikilinks + backlinks | No | No | No (but `obsidiantools` the *library* has both) | No |
| Asset/JS bundling | None built in (shell out) | **Hugo embeds esbuild** (`js.Build`) | None built in | None built in |

**Headline findings.**

1. **Rust is the only ecosystem where the Markdown parser itself understands Obsidian wikilinks** — two independent implementations do (comrak, pulldown-cmark). Everywhere else it is a third-party extension or hand-rolled.
2. **Every serious adoptable SSG in these four languages fails on something structural**: Zola requires TOML frontmatter, JBake requires its own `key=value` header, Hugo's Markdown parser is a closed extension set, MkDocs has had one release in two years. Nothing here is a Quartz-equivalent.
3. The companion research's headline stands and generalises: **no SSG in any of these languages computes a reverse backlink index natively.** The nearest thing found in *any* language is a Python *library* (`obsidiantools`, `vault.backlinks_index`) that is not a site generator at all — [§4](#4-python).

---

## 1. Rust

### 1.1 Markdown parsers

| Crate | Latest | Published | Recent downloads | Repo pushed | Stars |
|---|---|---|---|---|---|
| `pulldown-cmark` | 0.13.4 | 2026-05-20 | 41,433,794 | 2026-08-17 | 2,692 |
| `comrak` | 0.54.0 | 2026-07-12 | 1,912,081 | 2026-08-10 | 1,684 |
| `markdown` (markdown-rs) | 1.0.0 | 2025-04-23 | 2,566,963 | **2025-04-23** | 1,564 |

Sources: `https://crates.io/api/v1/crates/pulldown-cmark`, `https://crates.io/api/v1/crates/comrak`, `https://crates.io/api/v1/crates/markdown`; `https://api.github.com/repos/pulldown-cmark/pulldown-cmark`, `https://api.github.com/repos/kivikakk/comrak`, `https://api.github.com/repos/wooorm/markdown-rs`. Release tags from the `/releases/latest` endpoints of the same repos.

**pulldown-cmark — event stream, not a tree.** The crate docs state: "This crate provides a `Parser` struct which is an iterator over `Event`s" — https://docs.rs/pulldown-cmark/latest/pulldown_cmark/ . There is no AST. You transform by wrapping the iterator with your own adapter and feeding the result to `pulldown_cmark::html::push_html()`. For Prepper's two interceptions this is actually *sufficient and cheap*: both a wikilink and a fenced block are local, in-order events, not tree-shaped rewrites. But anything needing lookahead across the document is awkward.

**comrak — a real arena AST you can walk and re-render.** `parse_document(&arena, input, &options)` returns a node tree; `format_html`, `format_commonmark`, and `format_xml` render it back. The docs demonstrate mutating text nodes via `root.descendants()` and re-rendering — https://docs.rs/comrak/latest/comrak/ . This is the closest Rust analogue to the remark/mdast workflow.

**markdown-rs — AST, but read-only.** The README advertises "ast (mdast)" and `to_mdast()` — https://raw.githubusercontent.com/wooorm/markdown-rs/main/readme.md . The public API is exactly `to_html`, `to_html_with_options`, `to_mdast`, `Options` (https://raw.githubusercontent.com/wooorm/markdown-rs/main/src/lib.rs, lines 89/128/160). **There is no mdast → HTML compiler.** The README's own pipeline diagram is `markdown → parse → events → compile → {html | mdast}` — HTML is compiled from *events*, not from the tree. So you can read the AST to extract links, but you cannot rewrite it and render. Combined with a repo untouched since 2025-04-23, **markdown-rs is not a candidate for Prepper.**

### 1.2 Wikilinks — first-party in both live parsers

**comrak.** Two options, both documented with executable doctests in `src/parser/options.rs`:

```rust
options.extension.wikilinks_title_after_pipe = true;
assert_eq!(markdown_to_html("[[url|link label]]", &options),
           "<p><a href=\"url\" data-wikilink=\"true\">link label</a></p>\n");
```
— https://raw.githubusercontent.com/kivikakk/comrak/main/src/parser/options.rs (lines ~376–415). There is also `wikilinks_title_before_pipe` for the `[[label|url]]` order, and "When both this option and `wikilinks_title_before_pipe` are enabled, this option takes precedence."

**`wikilinks_title_after_pipe` is the Obsidian order** (target first, label after the pipe), and it emits `data-wikilink="true"` on the anchor — a ready-made hook for post-processing. This is materially better than `remark-wiki-link`'s colon-separated alias syntax flagged as a risk in the companion research.

**pulldown-cmark.** `Options::ENABLE_WIKILINKS`, documented verbatim as "Obsidian-style Wikilinks." — https://raw.githubusercontent.com/pulldown-cmark/pulldown-cmark/master/pulldown-cmark/src/lib.rs (line 777–778). The event carries a `LinkType::WikiLink { has_pothole: bool }` where "`true` - `[[foo|bar]]`, `false` - `[[foo]]`" (same file, lines 538–545). Resolution to an href is yours: you see the destination and decide.

Neither implements the full Obsidian surface — heading anchors `[[Note#Heading]]`, block refs `[[Note#^id]]`, or transclusion `![[Note]]`. See "what I could not verify".

### 1.3 Frontmatter

- **comrak**: `front_matter_delimiter: Option<String>`. Set to `Some("---")` and comrak both skips it during rendering and round-trips it through `format_commonmark` — the doctest asserts exactly that — https://raw.githubusercontent.com/kivikakk/comrak/main/src/parser/options.rs (lines ~230–254).
- **pulldown-cmark**: `ENABLE_YAML_STYLE_METADATA_BLOCKS`, "Metadata blocks in YAML style, i.e. starting with a `---` line, ending with a `---` or `...` line" — same lib.rs, lines 729–732. It delimits the block; parsing the YAML is on you.
- **YAML deserialisation is the weak spot.** `serde_yaml` is **archived and deprecated**: latest version is literally `0.9.34+deprecated` (2024-03-25) and the repo is archived — https://crates.io/api/v1/crates/serde_yaml , https://api.github.com/repos/dtolnay/serde-yaml . Live alternatives: `serde_yaml_ng` 0.10.0 (https://crates.io/api/v1/crates/serde_yaml_ng), `yaml-rust2` 0.12.0 updated 2026-08-18 (https://crates.io/api/v1/crates/yaml-rust2), or `gray_matter` 0.3.2 (2025-07-10), "Smart front matter parser… Parses YAML, JSON, TOML and support for custom parsers" — https://crates.io/api/v1/crates/gray_matter .

### 1.4 Quiz-fence interception

comrak has an explicit, first-party seam: `RenderPlugins.codefence_renderers: HashMap<String, &dyn CodefenceRendererAdapter>` — https://raw.githubusercontent.com/kivikakk/comrak/main/src/parser/options.rs (line 1431). Register `"quiz"` and you own the output for that fence with no AST walking at all. Failing that, an AST walk over `NodeValue::CodeBlock` works the same way Quartz's mermaid transformer does in JS.

With pulldown-cmark, the fence arrives as `Event::Start(Tag::CodeBlock(...))` in the stream and is trivially interceptable by an iterator adapter.

### 1.5 Templating and assets

- **Tera** 2.2.0, updated 2026-08-20, 5,802,752 recent downloads — "A template engine for Rust based on Jinja2/Django" — https://crates.io/api/v1/crates/tera . This is Zola's engine.
- **File watching**: `notify` (9.0.0-rc.4, 35,430,341 recent downloads) — https://crates.io/api/v1/crates/notify . Zola depends on `notify-debouncer-full 0.7` plus `axum 0.8` for its dev server — https://raw.githubusercontent.com/getzola/zola/master/Cargo.toml .
- **JS/CSS bundling: nothing.** No Rust equivalent of esbuild-in-process. A bespoke Rust generator would shell out to `esbuild`/`vite` for the quiz widget bundle, or accept hand-written ES modules.

### 1.6 Zola

Zola is alive: v0.23.4 released 2026-08-20, 17,375 stars, pushed 2026-08-24 — https://api.github.com/repos/getzola/zola , https://api.github.com/repos/getzola/zola/releases/latest . It uses pulldown-cmark for Markdown and Tera for templates — https://raw.githubusercontent.com/getzola/zola/master/docs/content/documentation/getting-started/overview.md , https://raw.githubusercontent.com/getzola/zola/master/components/markdown/Cargo.toml .

**Three disqualifying findings:**

1. **Frontmatter is TOML only.** "The TOML front matter is a set of metadata embedded in a file at the beginning of the file enclosed by triple pluses (`+++`)… Although none of the front matter variables are mandatory, the opening and closing `+++` are required." — https://raw.githubusercontent.com/getzola/zola/master/docs/content/documentation/content/page.md (lines 80–85). An Obsidian vault writes `---`/YAML. This is not configurable.
2. **No wikilinks.** Zola's internal-link syntax is `[my link](@/pages/about.md)` — "start the link with `@/` and point to the `.md` file you want to link to." The linking documentation never mentions `[[`. — https://raw.githubusercontent.com/getzola/zola/master/docs/content/documentation/content/linking.md . No backlinks either; nothing in the docs tree mentions them.
3. **No plugin system, and the extension surface just got smaller.** Zola 0.23.0 (2026-08-05) is described in its own changelog as "probably the most breaking version of Zola that will happen", and it **removed shortcodes entirely**: "shortcodes have been completely removed… you can now completely template the content of a page/section from the .md file, as well as use the new Tera components." Tera was simultaneously bumped to v2. — https://raw.githubusercontent.com/getzola/zola/master/CHANGELOG.md . Confirmed structurally: the string `shortcode` no longer appears anywhere in the repo tree (https://api.github.com/repos/getzola/zola/git/trees/master?recursive=1, `truncated: false`).

Since Zola has no way to add a goldmark-style parser extension and no per-language code-fence hook, there is no seam for a ```` ```quiz ```` block either. **Zola is out for Prepper.** It remains worth reading as a reference implementation of a fast Rust SSG (its `components/` workspace layout, its `notify-debouncer-full` + `axum` serve loop).

**Dev server.** `zola serve` "will watch all your content and provide live reload without a hard refresh if possible… Some changes cannot be handled automatically and thus live reload may not always work. If you fail to see your change or get an error, try restarting `zola serve`." Debounce defaults to one second, tunable with `--debounce <duration_ms>`; "for technical reasons (and keeping things simple), a 'debounce' of 0 is not supported." Note also: "Before starting, Zola will delete the output directory… to start from a clean slate." — https://raw.githubusercontent.com/getzola/zola/master/docs/content/documentation/getting-started/cli-usage.md .

### 1.7 The Rust reference implementation worth reading: `obsidian-export`

`zoni/obsidian-export` — 1,337 stars, pushed 2026-08-22, crate `obsidian-export` 25.3.0 (2025-03-25) — https://api.github.com/repos/zoni/obsidian-export , https://crates.io/api/v1/crates/obsidian-export .

From its README: "Recursively export Obsidian Markdown files to CommonMark. Supports `[[note]]`-style references as well as `![[note]]` file includes… It supports most but not all of Obsidian's Markdown flavor." — https://raw.githubusercontent.com/zoni/obsidian-export/main/README.md

Its dependency list is close to a spec for the Prepper generator's core: `pulldown-cmark`, `pulldown-cmark-to-cmark`, `ignore` (gitignore-aware directory walk), `rayon` (parallel file processing), `serde_yaml`, `slug`, `pathdiff`, `percent-encoding`, `unicode-normalization` — https://raw.githubusercontent.com/zoni/obsidian-export/main/Cargo.toml . It emits Markdown rather than HTML and computes no backlinks, so it is a study reference, not a base. (`pulldown-cmark-to-cmark` itself is healthy: 22.0.1, 2026-08-10 — https://crates.io/api/v1/crates/pulldown-cmark-to-cmark .)

---

## 2. Go

### 2.1 Markdown parsers

**goldmark is the only live choice.** v1.8.5 released 2026-07-28, 4,957 stars, pushed 2026-08-24, 22 open issues — https://api.github.com/repos/yuin/goldmark , `/releases/latest`. Its README states "goldmark is compliant with CommonMark 0.31.2" and lists as design goals "AST-based; preserves source position of nodes" and "You can add your AST nodes, transformers for paragraphs, transformers for the whole AST structure, and renderers." — https://raw.githubusercontent.com/yuin/goldmark/master/README.md (lines 11, 29, 45–50).

**blackfriday is dead for this purpose.** v2.1.0 was released **2020-11-07** and the repo was last pushed 2024-01-29 with 224 open issues — https://api.github.com/repos/russross/blackfriday , `/releases/latest`. goldmark's own README states the case against it: "blackfriday.v2 is a fast and widely-used implementation, but is not CommonMark-compliant and **cannot be extended from outside of the package, since its AST uses structs instead of interfaces**" (same README, line 34). That second clause is decisive on its own for Prepper.

### 2.2 The extension seams

goldmark's option surface, from its README's options table:

- `parser.WithASTTransformers` — "A `util.PrioritizedSlice` whose elements are `parser.ASTTransformer`… Transformers for transforming an AST."
- `parser.WithParagraphTransformers`, `goldmark.WithExtensions(...Extender)`, `goldmark.WithRenderer`, `goldmark.WithRendererOptions`
— https://raw.githubusercontent.com/yuin/goldmark/master/README.md (lines 138–153)

You can also parse and render as separate steps (`markdown.Parser().Parse(...)` → walk → `markdown.Renderer().Render(&b, source, doc)`), which is what a corpus-wide two-pass build needs — same README, line 361.

### 2.3 Wikilinks — a third-party extension with the right seam

`abhinav/goldmark-wikilink` (module `go.abhg.dev/goldmark/wikilink`), v0.6.0 published 2025-02-02, repo pushed 2026-08-24, 34 stars — https://api.github.com/repos/abhinav/goldmark-wikilink , `/releases/latest`. Listed in goldmark's own README extension index — https://raw.githubusercontent.com/yuin/goldmark/master/README.md .

It "supports parsing `[[...]]`-style wiki links and `![[...]]`-style embedded wiki links", and exposes precisely the resolution seam Prepper needs:

```go
type Resolver interface {
    ResolveWikilink(*Node) (destination []byte, err error)
}
```

with `Node` carrying `Target []byte`, `Fragment []byte` ("Fragment portion of the link, if any"), and `Embed bool` ("Whether this link starts with a bang (!)"). The `DefaultResolver` "adds '.html' to the end of the target if the target does not have an extension." — https://pkg.go.dev/go.abhg.dev/goldmark/wikilink , https://raw.githubusercontent.com/abhinav/goldmark-wikilink/main/README.md

`Fragment` means `[[Note#Heading]]` is at least *parsed*; whether Obsidian block refs (`#^id`) survive is unverified. Caveat: 34 stars, single maintainer — the same bus-factor profile as the Eleventy interlinker plugin in the companion research.

### 2.4 Frontmatter

Two options, both listed in goldmark's README:

- `yuin/goldmark-meta` — first-party to the goldmark author. v2.0.1, released **2026-08-22**, 101 stars — https://api.github.com/repos/yuin/goldmark-meta , `/releases/latest`. "A YAML metadata extension for the goldmark Markdown parser."
- `abhinav/goldmark-frontmatter` — v0.3.0, 2025-11-17, 33 stars. "Adds support for YAML, TOML, and custom front matter to documents." — https://api.github.com/repos/abhinav/goldmark-frontmatter

**Watch the YAML library churn.** The long-standing `go-yaml/yaml` repo is now **archived** (last push 2025-04-01, 7,019 stars) — https://api.github.com/repos/go-yaml/yaml . The successor is `yaml/go-yaml`, "The YAML org maintained fork of https://github.com/go-yaml/yaml", pushed 2026-08-15 — https://api.github.com/repos/yaml/go-yaml . `goccy/go-yaml` (2,221 stars, pushed 2026-04-11) is the other live option — https://api.github.com/repos/goccy/go-yaml . For frontmatter specifically, `adrg/frontmatter` (189 stars, pushed 2026-07-30) is a live format-detecting splitter — https://api.github.com/repos/adrg/frontmatter .

### 2.5 Templating and assets

`html/template` in the standard library is the default; it is context-aware-escaping, which is a real safety win for a generator emitting user-authored content. No asset pipeline in stdlib — see Hugo below for the exception.

### 2.6 Hugo

Alive and enormous: v0.165.0 released 2026-08-12, 89,542 stars, pushed 2026-08-24 — https://api.github.com/repos/gohugoio/hugo , `/releases/latest`.

**What Hugo gets right for Prepper:**

- **YAML frontmatter.** "Hugo determines the front matter format by examining the delimiters that separate the front matter from the page content" — YAML (`---`), TOML (`+++`), JSON — https://gohugo.io/content-management/front-matter/ . `aliases` is even a predefined field: "An array of one or more page-relative or site-relative paths that should redirect to the current page."
- **Code-block render hooks are exactly the quiz-fence seam.** `layouts/_markup/render-codeblock-LANGUAGE.html`; a ```` ```quiz ```` fence is intercepted by `render-codeblock-quiz.html`. Context: `.Type` ("The first word of the info string, typically the code language"), `.Inner` ("The content between the leading and trailing code fences, excluding the info string"), `.Attributes`, `.Options`, `.Ordinal`, `.Page`, `.Position`. Hugo's own documented example of this is Mermaid — https://gohugo.io/render-hooks/code-blocks/ . This is the single cleanest fenced-block story of anything surveyed in any language, JS included.
- **Link render hooks.** `layouts/_markup/render-link.html` with `.Destination`, `.Text`, `.Title`, `.PlainText`, `.Page`, `.PageInner` — https://gohugo.io/render-hooks/links/ .
- **Bundled esbuild.** "The `js.Build` function is backed by the `evanw/esbuild` package, providing a mature, high-performance foundation for bundling, transformation, and minification." Node is needed only "If you have any imported npm dependencies in your project". — https://gohugo.io/functions/js/build/ . For a small hand-written quiz widget with no npm deps, Hugo bundles it with no Node toolchain at all.
- **Fast incremental dev server.** `hugo server` watches and live-reloads by default; `--disableFastRender` "enables full re-renders on changes", i.e. fast incremental rendering is the default. `--renderToMemory`, `--renderStaticToDisk`, `--poll`, `--watch` are the other relevant flags. — https://gohugo.io/commands/hugo_server/

**What disqualifies or complicates Hugo:**

- **No wikilinks, and no way to add them.** The link render-hook documentation never mentions `[[...]]`. More importantly, `markup.goldmark.extensions` exposes a **fixed, closed list** — `cjk`, `definitionList`, `extras`, `footnote`, `linkify`, `passthrough`, `strikethrough`, `table`, `taskList`, `typographer` — with no documented mechanism to load a third-party goldmark extension without recompiling Hugo — https://gohugo.io/configuration/markup/ . So `goldmark-wikilink` is unavailable inside Hugo. Wikilinks would have to be a **text pre-pass** (rewriting `[[X]]` → `[X](/x/)` before goldmark sees it), which is the fragile approach the companion research criticised.
- **Custom top-level frontmatter keys are reserved.** "The field names below are reserved. For example, you cannot create a custom field named `type`. Create custom fields under the `params` key." — https://raw.githubusercontent.com/gohugoio/hugoDocs/master/content/en/content-management/front-matter.md (line 39). An Obsidian vault whose notes carry arbitrary top-level keys would need those keys nested under `params:`, which Obsidian itself will happily store but which is a divergence from vault-native authoring.
- **No backlinks.** Nothing in the docs. It would be template-level work over `.Site.RegularPages`, which is an O(pages²) scan in Go templates rather than a built index.

### 2.7 Effort to build bespoke in Go

goldmark + `goldmark-wikilink` (custom `Resolver` reading a corpus index built in pass 1) + `goldmark-meta` + `html/template` + `fsnotify`/`notify` + `net/http`. The reverse backlink fold is a map you build between the two passes. Single static binary, no runtime. This is the most *proportionate* bespoke option of the four.

---

## 3. Python

### 3.1 Markdown parsers

| Package | Latest | Released | Repo pushed | Stars |
|---|---|---|---|---|
| `markdown-it-py` | 4.2.0 | 2026-05-07 | 2026-08-24 | 1,353 |
| `mistune` | 3.3.4 | 2026-07-22 | 2026-08-21 | 3,065 |
| `Markdown` (Python-Markdown) | 3.10.3 | 2026-07-30 | 2026-08-24 | 4,239 |

Sources: `https://pypi.org/pypi/markdown-it-py/json`, `https://pypi.org/pypi/mistune/json`, `https://pypi.org/pypi/Markdown/json`; `https://api.github.com/repos/executablebooks/markdown-it-py`, `.../lepture/mistune`, `.../Python-Markdown/markdown`. All three are actively maintained.

**markdown-it-py — token stream plus a tree, and the cleanest fence override.** `md.parse()` returns "a flat token stream of block level syntax elements, with nesting defined by opening (1) and closing (-1) attributes"; `SyntaxTreeNode(tokens)` gives a navigable tree (it "replaced the deprecated `nest_tokens` in version 0.7.0"). Rendering rules live in `md.renderer.rules` and are overridable:

```python
md.add_render_rule("fence", custom_fence_renderer)
```
— https://markdown-it-py.readthedocs.io/en/latest/using.html

That one line is the entire ```` ```quiz ```` interception. It is the same architecture as Eleventy's markdown-it (companion research §4) — with the same consequence: **the remark plugin ecosystem is unavailable**, but `mdit-py-plugins` (0.6.1, 2026-05-13 — https://pypi.org/pypi/mdit-py-plugins/json) is the sanctioned extension bag.

**mistune — AST, but one-directional.** `mistune.create_markdown(renderer='ast')` yields a list of dicts with `type` / `raw` / `children` / `attrs`; custom block rules register via `md.block.register('block_math', BLOCK_MATH_PATTERN, parse_block_math, before='list')` — https://mistune.lepture.com/en/latest/advanced.html . The docs do not show rendering a previously-generated AST back to HTML (see "what I could not verify"). Custom renderers are the intended route instead.

**Python-Markdown — an `ElementTree` document tree with five processing phases.** Preprocessors → block processors → tree processors → inline processors → postprocessors. "the Markdown parser converts a source document to an ElementTree object before serializing that back to Unicode text", and tree processors "manipulate the tree created by block processors. They can even create an entirely new ElementTree object", receiving "a single argument `root`… an `xml.etree.ElementTree.Element` instance" — https://python-markdown.github.io/extensions/api/ . This is a genuine mutable, re-renderable AST. It is also the least CommonMark-conformant of the three (it implements Gruber's Markdown with extensions, per its own PyPI summary — https://pypi.org/pypi/Markdown/json).

### 3.2 Wikilinks

**Python-Markdown ships one, and it is the only bundled wikilink support in any of the four languages.** "This extension is included in the standard Markdown library"; "any `[[bracketed]]` word is converted to a link"; a valid wikilink is "upper or lower case letters, number, dashes, underscores and spaces surrounded by double brackets"; `[[Wiki Link]]` → `<a href="/Wiki_Link/" class="wikilink">Wiki Link</a>`. Options: `base_url`, `end_url`, `html_class`, and `build_url` (a callable that formats the complete URL). — https://python-markdown.github.io/extensions/wikilinks/

**Two caveats that matter.** The documentation contains **no mention of pipe-alias syntax** `[[Page|Alias]]`, which Obsidian uses constantly. And the extension is explicitly frozen: "We will continue to fix bugs and keep it up-to-date with the core parser, but no new features or changes in behavior will be made." So `[[Page|Alias]]` support will not be added; you would subclass the inline pattern or hand-roll.

markdown-it-py and mistune: nothing native.

### 3.3 Frontmatter

- `python-frontmatter` 1.3.0, released 2026-05-20, "Parse and manage posts with YAML (or other) frontmatter" — https://pypi.org/pypi/python-frontmatter/json . This is the conventional choice.
- `PyYAML` 6.0.3, 2025-09-25 — https://pypi.org/pypi/PyYAML/json .
- Python-Markdown's `meta` extension handles YAML-delimited blocks in the MkDocs flavour (see §3.5).

### 3.4 The Python outlier: `obsidiantools` already computes the backlink index

`obsidiantools` 0.11.0, released 2025-07-08 — https://pypi.org/pypi/obsidiantools/json ; repo `mfarragher/obsidiantools`.

```python
import obsidiantools.api as otools
vault = otools.Vault(<VAULT_DIRECTORY>).connect().gather()
```

From the README — https://raw.githubusercontent.com/mfarragher/obsidiantools/main/README.md :

- `connect()`: "connect your notes together in a graph structure and get metadata on links (e.g. wikilinks, backlinks, etc.)"
- **`vault.backlinks_index` for all backlinks in the vault**; `vault.get_backlinks(<NOTE>)` per note.
- Wikilinks "incl. header links, links with alt text", embedded files, markdown links.
- Frontmatter via `vault.front_matter_index`; tags via `vault.tags_index` ("Nested tags are supported"); `vault.nonexistent_notes` and `isolated_notes` (orphans).
- A `networkx` graph at `vault.graph`.
- Stated scope limit: "The package is built to support the 'shortest path when possible' option for links."

**This is the only library found in any of the four languages that ships the whole-corpus reverse fold the ticket describes.** It is not a site generator — it produces indices and plaintext, not HTML — so the pairing would be `obsidiantools` for the corpus model + markdown-it-py for rendering. Caveats: single maintainer, last release 2025-07-08 (13 months old at time of writing), 0.x version. Its dependency on `markdown` + `pymdown-extensions` also means its wikilink parsing and your renderer would be two separate implementations that must agree.

### 3.5 MkDocs

**Maintenance is the story.** MkDocs 1.6.1 was released **2024-08-30** — https://pypi.org/pypi/mkdocs/json — and that is still the latest. The repo's five most recent commits are dated 2025-10-20, 2025-10-20, 2025-08-03, 2025-02-21, 2024-11-06 — https://api.github.com/repos/mkdocs/mkdocs/commits?per_page=5 . 22,373 stars, 186 open issues, last push 2025-10-20 — https://api.github.com/repos/mkdocs/mkdocs . **Two years without a release and roughly four commits in the last year.** It is not abandoned, but it is not being developed either. (`mkdocs-material` by contrast is at 9.7.7, released 2026-07-17 — https://pypi.org/pypi/mkdocs-material/json — so the ecosystem around it is livelier than the core.)

**What it does have:**

- **YAML frontmatter.** "YAML style meta-data consists of YAML key/value pairs wrapped in YAML style delimiters to mark the start and/or end of the meta-data. The first line of a document must be `---`." Recognised keys: `template`, `title`; arbitrary custom keys pass through to templates. — https://www.mkdocs.org/user-guide/writing-your-docs/
- **A plugin event model with a real whole-corpus seam.** Global events in order: `on_startup`, `on_config`, **`on_files`** ("called after the files collection is populated from the `docs_dir`. Use this event to add, remove, or alter files in the collection"), `on_nav`, `on_env`, `on_post_build`, `on_serve`, `on_shutdown`. Page events: `on_pre_page`, `on_page_read_source` (deprecated), **`on_page_markdown`** ("called after the page's markdown is loaded from file and can be used to alter the Markdown source text"), **`on_page_content`** ("called after the Markdown text is rendered to HTML (but before being passed to a template) and can be used to alter the HTML body"), `on_page_context`, `on_post_page`. — https://www.mkdocs.org/dev-guide/plugins/ . `on_files` is where the corpus index and backlink fold belong.
- **Incremental dev server.** `mkdocs serve` with `--dirty` — "Only re-build files that have changed" — plus `--no-livereload`, `--clean`, `--watch-theme`, and `-w/--watch` ("A directory or file to watch for live reloading. Can be supplied multiple times") — https://www.mkdocs.org/user-guide/cli/ .
- **No wikilinks.** The writing-your-docs page makes no mention of `[[ ]]`; internal links are `[link text](path/to/file.md)` — https://www.mkdocs.org/user-guide/writing-your-docs/ .

**The wikilink plugin long tail is worse than the JS one.** From PyPI (`https://pypi.org/pypi/<name>/json`):

| Plugin | Latest | Released |
|---|---|---|
| `mkdocs-obsidian-bridge` | 1.3.1 | 2025-08-13 |
| `mkdocs-wikilinks-plugin` | 0.1.2 | 2025-11-08 |
| `mkdocs-callouts` | 1.16.1 | 2026-05-13 |
| `mkdocs-obsidian-support-plugin` | 1.4.1 | 2024-09-20 |
| `mkdocs-roamlinks-plugin` | 0.3.2 | **2023-04-19** |
| `mkdocs-backlinks` | 0.9.1 | **2023-01-28** |
| `mkdocs-ezlinks-plugin` | 0.1.14 | **2022-01-24** |

The only backlink plugin found (`mkdocs-backlinks`) has not been released since January 2023. `mkdocs-callouts` is the healthiest of the Obsidian-adjacent set and it only converts callout syntax.

### 3.6 Pelican

4.12.0 released 2026-04-20; 13,337 stars; last push 2026-04-20 with commits clustered around that release — https://pypi.org/pypi/pelican/json , https://api.github.com/repos/getpelican/pelican , https://api.github.com/repos/getpelican/pelican/commits?per_page=5 . Alive, but release-cadence-driven rather than continuously active.

**It fails on frontmatter for a vault.** "Metadata syntax for Markdown posts should follow this pattern: `Title: My super title` / `Date: 2010-12-03 10:20`…" — Python-Markdown Meta-Data style key/value lines, **not** `---`-delimited YAML — https://docs.getpelican.com/en/latest/content.html . Internal links are `{filename}path/to/file`, `{static}…`, `{attach}…`. No wikilinks documented.

Its plugin system registers a `register()` callable against signals — "The only rule to follow for plugins is to define a `register` callable, in which you map the signals to your plugin logic" — with `initialized`, `finalized`, `all_generators_finalized`, `article_generator_finalized`, `content_object_init`, `get_generators`, `get_writer` among others — https://docs.getpelican.com/en/latest/plugins.html . `all_generators_finalized` is the nearest whole-corpus hook, though per the docs it "receives generators but doesn't aggregate all content".

**Verdict: Pelican is the wrong shape** — it is a blog engine with article/category/tag semantics, and its metadata format is not vault-native.

### 3.7 Templating and assets

Jinja2 3.1.6 (2025-03-05) — https://pypi.org/pypi/Jinja2/json — is the universal choice and is what both MkDocs (`on_env`) and Pelican use. `watchdog` 6.0.0 (2024-11-01) for file watching — https://pypi.org/pypi/watchdog/json . No JS bundling; shell out to esbuild.

---

## 4. Java

### 4.1 Markdown parsers

**commonmark-java is the live one.** Latest release on Maven Central is **0.30.0**, `lastUpdated 20260806023351` — https://repo1.maven.org/maven2/org/commonmark/commonmark/maven-metadata.xml . Repo: 2,682 stars, 11 open issues, pushed 2026-08-07, release tag `commonmark-parent-0.30.0` published 2026-08-06 — https://api.github.com/repos/commonmark/commonmark-java , `/releases/latest`.

From the project README — https://github.com/commonmark/commonmark-java :

- **AST + Visitor.** Parsed documents are a tree of `Node` objects (`Document`, `Heading`, `Paragraph`, `Text`, …); traversal via `AbstractVisitor` with `visit(Text text)`-style overrides and `visitChildren()`; `node.accept(visitor)`.
- **Parser extension points**: `Parser.builder().extensions(...)`, `customBlockParserFactory` (`BlockParserFactory`), `customInlineContentParserFactory` (`InlineContentParserFactory`), `customDelimiterProcessor`, `enabledBlockTypes`, `includeSourceSpans(IncludeSourceSpans.BLOCKS_AND_INLINES)`.
- **Renderer extension points**: `HtmlRenderer.builder()` with `nodeRendererFactory()` (implement `NodeRenderer` with `getNodeTypes()` and `render(Node)`) and `attributeProviderFactory()` (implement `AttributeProvider`). Also `MarkdownRenderer` (AST → Markdown) and `TextContentRenderer`.
- **Bundled extensions**: `commonmark-ext-autolink`, `-gfm-strikethrough`, `-gfm-tables`, `-gfm-alerts`, `-footnotes`, `-heading-anchor`, `-image-attributes`, `-ins`, `-task-list-items`, and **`commonmark-ext-yaml-front-matter`** with a `YamlFrontMatterVisitor`.
- API stability caveat, verbatim: "Note that for 0.x releases of this library, the API is not considered stable yet and may break between minor releases."

**There is no wikilink extension.** Adding `[[...]]` means writing an `InlineContentParserFactory` — a genuine but well-supported piece of work, and the only place in this survey where you would write the wikilink *parser* rather than just its resolver.

**flexmark-java is effectively dormant.** Latest Maven Central release is **0.64.8**, `lastUpdated 20230523183154` — https://repo1.maven.org/maven2/com/vladsch/flexmark/flexmark/maven-metadata.xml . The repo's commit history is one commit on 2025-04-16 ("Fix for issue #577, avoid using reflection") preceded by a gap back to 2023-05-23 — https://api.github.com/repos/vsch/flexmark-java/commits?per_page=5 . 178 open issues; there is no GitHub release object at all (`/releases/latest` returns none) — https://api.github.com/repos/vsch/flexmark-java . Its README opens: "**flexmark-java** is a Java implementation of **CommonMark (spec 0.28)** parser" — https://raw.githubusercontent.com/vsch/flexmark-java/master/README.md . **CommonMark 0.28 is far behind the current spec** (goldmark tracks 0.31.2).

That is a shame, because flexmark has the best wikilink support in Java. `flexmark-ext-wikilink` 0.64.8 (2023-05-23 — https://repo1.maven.org/maven2/com/vladsch/flexmark/flexmark-ext-wikilink/maven-metadata.xml) exposes, from its source — https://raw.githubusercontent.com/vsch/flexmark-java/master/flexmark-ext-wikilink/src/main/java/com/vladsch/flexmark/ext/wikilink/WikiLinkExtension.java :

`ALLOW_INLINES`, `ALLOW_ANCHORS`, `ALLOW_ANCHOR_ESCAPE`, `ALLOW_PIPE_ESCAPE`, `DISABLE_RENDERING`, **`LINK_FIRST_SYNTAX`** (the `[[link|text]]` order, i.e. Obsidian's), `LINK_PREFIX` / `LINK_PREFIX_ABSOLUTE`, `IMAGE_PREFIX` / `IMAGE_PREFIX_ABSOLUTE`, `IMAGE_LINKS`, `LINK_FILE_EXTENSION`, `IMAGE_FILE_EXTENSION`, `LINK_REPLACE_CHARS`. It implements `Parser.ParserExtension`, `HtmlRenderer.HtmlRendererExtension`, and `Formatter.FormatterExtension`, and "The parsed … text regions are turned into `WikiLink` nodes."

`ALLOW_ANCHORS` means `[[Note#Heading]]` is covered. **On features flexmark wins; on maintenance it loses badly.** Adopting a parser that targets a 2017-era spec revision and has had one commit in three years is a real risk.

### 4.2 Frontmatter

`commonmark-ext-yaml-front-matter` with `YamlFrontMatterVisitor` handles extraction — https://github.com/commonmark/commonmark-java . For full YAML deserialisation: **SnakeYAML 2.6**, `lastUpdated 20260226205049` — https://repo1.maven.org/maven2/org/yaml/snakeyaml/maven-metadata.xml — or `jackson-dataformat-yaml` (2.19.0, 2025-04-25 per the Solr index — https://search.maven.org/solrsearch/select?q=g:%22com.fasterxml.jackson.dataformat%22+AND+a:%22jackson-dataformat-yaml%22&core=gav).

### 4.3 Templating and assets

- **FreeMarker** 2.3.34, `lastUpdated 20241222180924` — https://repo1.maven.org/maven2/org/freemarker/freemarker/maven-metadata.xml
- **Thymeleaf** 3.1.5.RELEASE, `lastUpdated 20260421221100` — https://repo1.maven.org/maven2/org/thymeleaf/thymeleaf/maven-metadata.xml

No asset pipeline; no in-process bundler. A Java generator would shell out to esbuild, or use a Maven/Gradle frontend plugin (which pulls in Node anyway).

### 4.4 JBake

2.7.0 released 2025-12-26 (Maven `org/jbake/jbake-core` release `2.7.0`, `lastUpdated 20251230100523` — https://repo1.maven.org/maven2/org/jbake/jbake-core/maven-metadata.xml ; GitHub release `v2.7.0` 2025-12-26 — https://api.github.com/repos/jbake-org/jbake/releases/latest). 1,156 stars, **169 open issues**, last push 2025-12-30 — https://api.github.com/repos/jbake-org/jbake . Note the release history: 2.7.0-rc.5 was 2021-11-20, rc.6 2022-09-21, rc.7 2023-02-26, final 2025-12 — a four-year release candidate. **The published documentation site still identifies itself as "JBake v2.7.0-SNAPSHOT (2018-10-16 17:56)"** — https://jbake.org/docs/latest/ (and `https://jbake.org/docs/2.7.0/` returns HTTP 404).

**It fails on frontmatter, hard.** "Each raw HTML or Markdown content file **must** have a metadata header in it which looks like this:"

```
title=Weekly Links #2
date=2013-02-01
type=post
tags=weekly links, java
status=published
~~~~~~
```
— https://jbake.org/docs/latest/

Confirmed in source: `MarkupEngine.hasHeader()` requires a `headerSeparator` line (configurable, default `~~~~~~`) and both a `type=` and a `status=` property, else "Parsing skipped (missing type or status value in header meta data)" — https://raw.githubusercontent.com/jbake-org/jbake/master/jbake-core/src/main/java/org/jbake/parser/MarkupEngine.java (lines 87–100, 176–262). This is not YAML frontmatter and it is not optional.

Other facts: "JBake uses flexmark-java to support Markdown format" (so it inherits flexmark's staleness), extensions are configured as a comma-delimited `markdown.extensions` string ("HARDWRAPS,AUTOLINKS,FENCED_CODE_BLOCKS,DEFINITIONS"), template engines are FreeMarker / Groovy / Thymeleaf / Jade / Pebble, and "The `-s` option will start JBake in server mode… While the server is running JBake will watch the content, assets and templates folders for any changes." No wikilink or backlink support is mentioned anywhere in the docs. — https://jbake.org/docs/latest/

**JBake is out.**

---

## 5. The backlink question, restated across languages

The companion research established that a reverse backlink index is a whole-corpus fold no JS framework performs natively. That holds here, with one nuance:

| | Native backlink index? | Where the fold would live |
|---|---|---|
| Zola | No | Nowhere — no plugin system, shortcodes removed in 0.23.0 |
| Hugo | No | Template-level scan over `.Site.RegularPages` (O(pages²)) |
| MkDocs | No (`mkdocs-backlinks` plugin, last released 2023-01-28) | `on_files` — a proper whole-corpus hook |
| Pelican | No | `all_generators_finalized` |
| JBake | No | Nowhere documented |
| **`obsidiantools` (library, not SSG)** | **Yes — `vault.backlinks_index`** | Built by `Vault(...).connect()` |

For a bespoke generator in any of the four languages the fold is trivially ~30 lines: pass 1 walks the vault and records outgoing wikilink targets per note; invert the map; pass 2 renders with both the corpus index (for href resolution and broken-link detection) and the backlink list in scope. The architectural point from the companion research applies identically — a per-file Markdown pipeline structurally cannot do this, and the seam has to sit above it.

---

## 6. Comparative assessment

### 6.1 Rough effort to build Prepper's generator from scratch

The build is: walk `content/`, parse YAML frontmatter, build a corpus index of slugs/aliases, resolve `[[wikilinks]]` to hrefs, fold a reverse backlink index, intercept ```` ```quiz ```` fences into a mountable element, render templates, emit HTML, rebuild fast on change.

| | Rust (comrak) | Go (goldmark) | Python (markdown-it-py) | Java (commonmark-java) |
|---|---|---|---|---|
| Wikilink parsing | **free** (`wikilinks_title_after_pipe`) | free via `goldmark-wikilink` | hand-rolled (or Python-Markdown's, minus pipe aliases) | **write an `InlineContentParserFactory`** |
| Wikilink → href resolution | your walk over the AST / `data-wikilink` anchors | `Resolver` interface — a named seam | your rule | your `NodeRenderer` |
| Frontmatter | `front_matter_delimiter` + a live YAML crate | `goldmark-meta` | `python-frontmatter` | `commonmark-ext-yaml-front-matter` + SnakeYAML |
| Backlink fold | your code, ~30 lines | your code, ~30 lines | your code, or `obsidiantools` | your code |
| Quiz fence | **`codefence_renderers["quiz"]`** — a named seam | `NodeRenderer` for `FencedCodeBlock` | **`md.add_render_rule("fence", …)`** — one line | `NodeRenderer` for `FencedCodeBlock` |
| Templating | Tera | `html/template` | Jinja2 | FreeMarker / Thymeleaf |
| Dev loop | `notify` + a small server, hand-built | `fsnotify` + `net/http`, hand-built | `watchdog` + `http.server`, hand-built | watcher + embedded server, hand-built |
| Rough relative effort | **Medium** | **Lowest** | **Low, most familiar** | **Highest** |

Ordering the four for *this* build:

1. **Go** — goldmark's extension model is designed for exactly this, `goldmark-wikilink` hands you the `Resolver` seam, the output is a single static binary with no runtime, and if you later want Hugo's render hooks or bundled esbuild you can migrate. Lowest total friction.
2. **Rust** — the only ecosystem where wikilinks are *in the parser*, and comrak's `codefence_renderers` is the tidiest quiz hook anywhere. `obsidian-export` is a working reference for the vault-walking half. Costs: compile times in the authoring loop, a YAML story in transition (`serde_yaml` deprecated), and no bundler.
3. **Python** — the fastest to prototype, and `obsidiantools` is the only off-the-shelf backlink index found anywhere. Costs: slowest builds at scale, wikilink support that stops short of Obsidian's pipe aliases, and a deployment story that involves a Python environment.
4. **Java** — commonmark-java is genuinely excellent and well-extended, but it is the only option where you write the wikilink *parser* yourself, the good wikilink extension lives in a parser stuck on CommonMark 0.28, and the whole toolchain (JVM startup, Maven/Gradle) is the heaviest for a save-and-see loop.

### 6.2 Authoring-loop speed

This is where the languages genuinely separate, and it cuts against the naive "compiled = fast" intuition:

- **Go**: compile is ~seconds, run is milliseconds. Best combined edit-code-and-edit-content loop. Hugo's own dev server is fast-incremental by default (`--disableFastRender` exists to turn that *off*) — https://gohugo.io/commands/hugo_server/ .
- **Rust**: runtime is the fastest of the four (Zola and `obsidian-export` both parallelise with `rayon`/threads), but **incremental compile times of the generator itself are the slowest of the four**. If the generator's code is stable and only content changes, this never bites; while you're building it, it does. Zola's own serve loop debounces at 1 second by default and cannot be set to 0 — https://raw.githubusercontent.com/getzola/zola/master/docs/content/documentation/getting-started/cli-usage.md .
- **Python**: no compile step at all, so the code-edit loop is instant; the content-rebuild loop is the slowest per-file. MkDocs' `--dirty` ("Only re-build files that have changed") is the mitigation — https://www.mkdocs.org/user-guide/cli/ .
- **Java**: JVM startup plus build-tool overhead on every run is the worst fit for "run the skill, commit, see it rendered" unless you keep a long-lived watch process.

I gathered **no build-time benchmarks** on a corpus of Prepper's size in any language — see "what I could not verify".

### 6.3 Versus adopting a JS framework (per the companion research)

The honest framing:

**What you gain by leaving JS.** A single static binary (Go/Rust) with no `node_modules`, no transitive-dependency churn, and no dependence on the wikilink plugin long tail the companion research identified as "the weakest link in the whole ecosystem". In Rust specifically, wikilinks stop being a plugin risk entirely because two independent parsers implement them in-tree, with Obsidian's exact pipe order and no alias-separator mismatch — which was flagged there as a thing to "verify first" for `remark-wiki-link`.

**What you give up.** Three things, and they compound:

1. **A ready-made vault-semantics layer.** Quartz gives Prepper wikilinks, transclusion, backlinks, graph view, popovers and search on day one. Nothing in Rust, Go, Python, or Java comes close — the only comparable artifact is `obsidiantools`, which is a Python analysis library, not a generator. Every non-JS path is "build the generator", not "configure one".
2. **The islands/hydration story for the quiz widgets and the practice UI.** The companion research's central trade was Astro's `client:*` islands making the interactive surface natural. In a Rust/Go/Python/Java generator you emit `<quiz-block data-quiz="…">` and hydrate it with a hand-written web component plus your own bundling step — closer to Eleventy's fully-manual position than Astro's. The interactive code is browser JS either way; the difference is that the generator has no idea it exists.
3. **The bundler.** Astro and Next ship Vite/Turbopack. Of everything surveyed here, **only Hugo has an in-process bundler** — "The `js.Build` function is backed by the `evanw/esbuild` package" — https://gohugo.io/functions/js/build/ . Every bespoke path in all four languages means shelling out to esbuild, i.e. a Node toolchain reappears in the build anyway, which erodes much of the "escape the JS ecosystem" benefit.

**The sharpest way to state it.** In JS you choose between *adopting* something (Quartz: vault semantics free, app hard) and *composing* something (Astro: a day of wikilink/backlink work in documented seams, app easy). In Rust/Go/Python/Java there is no adoption option that clears the bar — Zola and JBake fail on frontmatter format alone, Hugo's parser cannot be extended with wikilinks, MkDocs has had one release in two years. **Every non-JS path is the bespoke path.** So the real comparison is not "Rust vs Astro" but "write a generator in Go/Rust (a week-ish of real work, then it is yours and it is a static binary) vs write ~a day of loader/plugin code inside Astro and get islands, a bundler, and a dev server for free."

Note also that the client-side quiz and spaced-repetition code is TypeScript in every scenario. Choosing Rust or Go does not make the project single-language; it makes it two-language with a hard build-time/runtime seam. Choosing Astro makes it one language across that seam. That is a maintenance-surface argument the language choice cannot escape.

---

## What I could not verify

Stated plainly, not papered over.

1. **Obsidian wikilink edge-case coverage in comrak and pulldown-cmark.** Both document `[[target]]` and `[[target|label]]`. I found **no** evidence either handles heading anchors (`[[Note#Heading]]`), block references (`[[Note#^block-id]]`), or embeds/transclusion (`![[Note]]`). I did not read either parser's wikilink implementation source. **Test this against a real Prepper note before choosing Rust.**
2. **`goldmark-wikilink`'s `Fragment` semantics.** The pkg.go.dev summary says `Fragment` is "Fragment portion of the link, if any", which implies `[[Note#Heading]]` parses. Whether Obsidian block refs (`#^id`) round-trip, and how `![[...]]` embeds render by default, are unverified — I read the README and the package summary, not the source.
3. **Python-Markdown wikilinks and pipe aliases.** The extension documentation contains no mention of `[[Page|Alias]]`. That is absence of documentation, not proof of absence in the code; I did not read `markdown/extensions/wikilinks.py`. Given the extension is explicitly in feature-freeze, the practical conclusion holds either way.
4. **mistune AST → HTML round trip.** The advanced-usage docs show generating an AST with `renderer='ast'` but never show rendering a modified AST back to HTML. I could not confirm whether that is possible. This is the same limitation markdown-rs has confirmed in code; for mistune it is unconfirmed.
5. **Build-time benchmarks.** None gathered, in any language, on a corpus of Prepper's size. All the speed claims above are architectural (compiled vs interpreted, incremental vs full) or quoted from project documentation, not measured. goldmark's README does publish a micro-benchmark against cmark ("goldmark's performance is on par with cmark's" — https://raw.githubusercontent.com/yuin/goldmark/master/README.md) but that is one file, not a vault.
6. **Zola's incremental rebuild internals.** The CLI docs say `zola serve` watches and live-reloads with a 1-second default debounce, and that it deletes the output directory on start. Whether a content change triggers a partial or full site rebuild I did not determine — I did not read `src/cmd/serve.rs`. Moot given the TOML-frontmatter blocker, but flagged because I asserted nothing about it above.
7. **Whether Hugo can load third-party goldmark extensions.** I verified that `markup.goldmark.extensions` documents a fixed list of ten keys and that the configuration reference describes no mechanism for adding others — https://gohugo.io/configuration/markup/ . I did **not** find an explicit statement in Hugo's docs saying "third-party goldmark extensions are unsupported". The conclusion is inference from a closed configuration surface plus Hugo having no plugin system, not a quoted denial. If Prepper leans toward Hugo, **confirm this first** — it is the load-bearing claim against it.
8. **Hugo's reserved-frontmatter-field impact on a real Obsidian vault.** The docs say custom fields must live under `params`. I did not test what Hugo does with an unrecognised top-level key — whether it errors, warns, or silently ignores.
9. **MkDocs' maintenance intent.** Two years without a release and ~4 commits in the last year are facts (https://pypi.org/pypi/mkdocs/json , https://api.github.com/repos/mkdocs/mkdocs/commits?per_page=5). I found no statement from the maintainers about the project's status, and did not check the issue tracker or discussions for one. Do not read "near-dormant" as "abandoned" without that check.
10. **flexmark-java's maintenance intent.** Same shape: last Maven release 2023-05-23, one commit since, 178 open issues, no GitHub releases. I searched the README for a hand-over or unmaintained notice and found none. The absence of an announcement is not the absence of a problem, but I cannot cite an official status.
11. **`obsidiantools` fidelity.** Its README states it supports the "'shortest path when possible'" link resolution mode and links to a wiki page on "what sort of wikilink syntax is not well-supported". I did not read that wiki page, so I cannot enumerate the gaps. Given it would be the single most load-bearing dependency in a Python build, **read it before relying on it.**
12. **commonmark-java's CommonMark spec version.** The README references a `spec.txt` in the repo but I did not open it, so I cannot state which spec revision 0.30.0 targets. It is actively released (2026-08-06), so it is almost certainly current, but that is an assumption.
13. **Java and Go asset-pipeline options I did not survey.** I confirmed no in-process bundler in either stdlib and that Hugo is the exception via embedded esbuild. I did not search for third-party Go or Java esbuild bindings, which may exist and would change the "shell out to Node" conclusion.
14. **Whether any of these languages has a Quartz-equivalent I did not find.** I checked the four SSGs the ticket named plus `obsidian-export` and `obsidiantools`. This was targeted, not exhaustive — an actively-maintained Go or Rust Obsidian-vault SSG could exist outside the set I looked at.
