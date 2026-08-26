# Markdown generator tooling in Rust, Go, Python, and Java

Parent: [Prepper — wayfinder map](../map.md)
Type: research
Status: resolved
Blocked by: —

## Question

What does building the static generator look like in Rust, Go, Python, or Java, and how does each compare to the JavaScript options already surveyed?

The companion research [Static-site tooling for Obsidian vaults](08-static-site-tooling-for-obsidian-vaults.md) covered only the JavaScript ecosystem. This ticket covers the rest of the field so ticket 11 can decide across languages rather than within one.

For each of the four languages, establish against primary sources:

- **Markdown parsers** — maturity, CommonMark/GFM conformance, maintenance status, and crucially whether the parser exposes an **AST** that can be walked and rewritten (needed to resolve wikilinks and to intercept ```quiz fences), or only a string-to-HTML pipeline.
- **Frontmatter** — first-party support or the conventional library.
- **Wikilink handling** — any existing `[[link]]` support, or confirmation that it is hand-rolled.
- **Templating and asset pipeline** — what a generator would use to emit pages.
- **Existing SSGs worth studying or adopting** rather than starting from zero (Zola in Rust; Hugo in Go; Pelican/MkDocs in Python; JBake in Java — verify which are actually live).
- **Effort estimate** for the specific build this project needs: walk a directory, parse frontmatter, build a corpus index, resolve wikilinks, fold a reverse backlink index, emit HTML, rebuild fast on change.

Also assess the **authoring loop**: incremental rebuild speed and dev-server story, since "run the skill, commit, see it rendered" has to stay fast or the habit dies.

## Answer

Full findings with a source URL per claim: [`research/12-non-js-generator-languages.md`](../research/12-non-js-generator-languages.md). Summary:

- **Rust is the only ecosystem where the Markdown parser itself understands Obsidian wikilinks**, via two independent implementations. `comrak`'s `wikilinks_title_after_pipe` is Obsidian's exact pipe order and emits `data-wikilink="true"`; `pulldown-cmark`'s `ENABLE_WIKILINKS` is documented verbatim as "Obsidian-style Wikilinks". Materially better than `remark-wiki-link`'s colon-alias mismatch that ticket 08 flagged as a compatibility risk.
- **Every adoptable SSG in these four languages fails on something structural.** Zola requires TOML `+++` frontmatter (not configurable) and removed shortcodes entirely in 0.23.0, which its own changelog calls the most breaking version that will happen. JBake requires a `key=value` header with mandatory `type=`/`status=`, and its published docs still read "v2.7.0-SNAPSHOT (2018-10-16)". Hugo's `markup.goldmark.extensions` is a closed list of ten keys with no way to load `goldmark-wikilink`. MkDocs has had one release in two years and roughly four commits in the last year.
- **The backlink finding generalises.** No SSG in any of these languages computes a reverse backlink index either. The nearest thing found anywhere is a Python *library*, `obsidiantools` (`vault.backlinks_index`), which is not a generator.
- **Two parsers are traps.** `markdown-rs` has an AST but no mdast→HTML compiler — its public API is only `to_html`, `to_html_with_options`, `to_mdast`, making it read-only for our purposes — and is untouched since Apr 2025. `flexmark-java` has the best Java wikilink extension but targets CommonMark 0.28 and has had one commit in three years.
- **Effort ordering for this specific build: Go < Rust < Python < Java.** Java is the only path where the wikilink *parser* is hand-written (`InlineContentParserFactory`).
- **The sharpest comparative point:** in JS the choice is between adopting (Quartz) and composing (Astro). In these four languages **no adoption option clears the bar — every non-JS path is the bespoke path.** And only Hugo has an in-process bundler (embedded esbuild); every other bespoke path shells out to Node for the client bundle anyway, eroding much of the benefit of leaving JS.

Fourteen items unverified. Two are load-bearing: whether `comrak`/`pulldown-cmark` handle `[[Note#Heading]]`, block references, or `![[embeds]]` — test before choosing Rust; and the claim that Hugo cannot load third-party goldmark extensions is **inference from a closed config surface, not a quoted denial** — confirm before ruling Hugo out on that basis.
