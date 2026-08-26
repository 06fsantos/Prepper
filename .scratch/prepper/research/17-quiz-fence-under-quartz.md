# Quiz fence re-parsing under Quartz

Research for [17-quiz-fence-under-quartz](../issues/17-quiz-fence-under-quartz.md).
Investigated 2026-08-26 against primary sources only — Quartz's `v5` default branch, the `quartz-community/*` plugin repos, and the unified/remark/mdast source repos. Every claim carries the file and line that owns it. No blog posts, no secondary write-ups.

Sources read in full or in part:

- `jackyzha0/quartz` branch `v5` — `quartz/processors/parse.ts`, `quartz/plugins/types.ts`, `quartz/plugins/loader/config-loader.ts`, `quartz/plugins/loader/types.ts`, `quartz/plugins/loader/gitLoader.ts`, `quartz/plugins/quartz-plugins.schema.json`, `quartz/cli/templates/default.yaml`, `docs/advanced/making plugins.md`
- `quartz-community/obsidian-flavored-markdown` — `src/transformer.ts`
- `quartz-community/remark-obsidian` — `src/index.ts`, `src/lib/types.ts`, `src/lib/mdast/wikilink.ts`, `src/lib/task-char.ts`
- `quartz-community/syntax-highlighting` — `src/transformer.ts`
- `quartz-community/crawl-links`, `quartz-community/description`, `quartz-community/github-flavored-markdown` — `src/transformer.ts`
- `unifiedjs/unified` `lib/index.js`, `remarkjs/remark` `packages/remark-parse/lib/index.js`, `syntax-tree/mdast-util-to-hast` `lib/state.js`, `syntax-tree/hast-util-raw` `readme.md`, `rehype-pretty/rehype-pretty-code` `packages/core/src/index.ts`

---

## TL;DR

**Yes. The seam exists, it is clean, and every sub-question resolves in favour of the ticket-03 format. No fallback is needed.**

1. A remark plugin **can** replace a `code` node whose `lang` is `quiz` with a parsed mdast subtree, and Quartz's wikilink handling **does** run over it — provided our plugin is ordered before `@quartz-community/obsidian-flavored-markdown`.
2. Ordering is a **first-class config field**: `order` on a plugin entry in `quartz.config.yaml`, numeric, ascending, default 50. Obsidian-flavoured-markdown ships at `order: 30`; slot ours at `order: 25`. Nothing needs to be invoked by hand.
3. Syntax highlighting **cannot** mangle the fence, because it is a **rehype** plugin — it runs in a separate, strictly later processor over hast. There is no `excludeLangs` and none is needed.
4. The type survives. Emit a custom mdast node carrying `data.hProperties["data-quiz-type"]`; `mdast-util-to-hast`'s default unknown-node handler turns it into a `<div>` and copies the properties on. Ticket 15's html-plugin reads it off the hast element.
5. **The ticket's premise about text-level wikilinks is wrong for v5.** Wikilinks are not a regex text replace. They are a **micromark syntax extension** producing real `wikilink` mdast nodes at parse time, converted to `link` nodes by a separate tree transform. That distinction is what makes the whole approach work, and it changes the *shape* of the fix — see §2.

---

## 1. The pipeline, from source

Quartz builds **two separate unified processors**, and runs them in two separate passes.

`quartz/processors/parse.ts` lines 21–45:

```ts
export function createMdProcessor(ctx: BuildCtx): QuartzMdProcessor {
  const transformers = ctx.cfg.plugins.transformers
  return (
    unified()
      .use(remarkParse)
      .use(transformers.flatMap((plugin) => plugin.markdownPlugins?.(ctx) ?? []))
  )
}

export function createHtmlProcessor(ctx: BuildCtx): QuartzHtmlProcessor {
  const transformers = ctx.cfg.plugins.transformers
  return (
    unified()
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(transformers.flatMap((plugin) => plugin.htmlPlugins?.(ctx) ?? []))
  )
}
```

and lines 161–162:

```ts
const mdRes = await createFileParser(ctx, fps)(createMdProcessor(ctx))
res = await createMarkdownParser(ctx, mdRes)(createHtmlProcessor(ctx))
```

Three facts fall straight out:

- **`markdownPlugins` order is exactly `ctx.cfg.plugins.transformers` order**, flat-mapped. There is no re-sorting, no priority, no dependency graph at this layer.
- **Every `markdownPlugins` transform finishes before any `htmlPlugins` transform starts.** They are different processors over different trees, run in sequence.
- `textTransform` runs earlier still, over the raw file string, before `processor.parse()` (parse.ts lines 98–100).

`quartz/plugins/types.ts` lines 27–33 is the transformer contract:

```ts
export type QuartzTransformerPluginInstance = {
  name: string
  textTransform?: (ctx: BuildCtx, src: string) => string
  markdownPlugins?: (ctx: BuildCtx) => PluggableList
  htmlPlugins?: (ctx: BuildCtx) => PluggableList
  externalResources?: ExternalResourcesFn
}
```

---

## 2. How wikilinks actually work in v5 — the ticket's premise corrected

The ticket asks me to verify a suspicion that Quartz does wikilinks "at the TEXT level (a regex replace before/inside markdown parsing)". **On `v5` that is not what happens**, and the correction is load-bearing.

`obsidian-flavored-markdown/src/transformer.ts` line 163–173 — `textTransform` does exactly one thing, and it is not wikilinks:

```ts
textTransform(_ctx, src) {
  // pre-transform blockquotes
  if (opts.callouts) {
    src = src.replace(calloutLineRegex, (value) => value + "\n> ")
  }
  return src
},
```

Wikilinks come from `markdownPlugins` (line 174), whose **first** entry is `remarkObsidian` (lines 177–186). And `remark-obsidian/src/index.ts` lines 46–61 shows what that is:

```ts
export default function remarkObsidian(userOpts?: RemarkObsidianOptions) {
  const data = (this as Processor<Root>).data()
  data.micromarkExtensions ??= []
  data.fromMarkdownExtensions ??= []
  ...
  if (opts.wikilinks) {
    data.micromarkExtensions.push(wikilinkSyntax())
    data.fromMarkdownExtensions.push(wikilinkFromMarkdown())
    data.toMarkdownExtensions.push(wikilinkToMarkdown())
  }
  ...
```

It is a **micromark syntax extension**. Wikilinks are tokenised by the parser itself and materialise as a real mdast node type (`remark-obsidian/src/lib/types.ts` lines 3–10):

```ts
export interface Wikilink extends Literal {
  type: "wikilink"
  value: string
  embedded: boolean
  path: string
  heading: string
  alias: string
}
```

The `wikilink` → `link` conversion is then a **separate, ordinary mdast transform**, the second entry in OFM's own `markdownPlugins` array (`obsidian-flavored-markdown/src/transformer.ts` lines 188–318):

```ts
visit(tree, (node) => node.type === "wikilink", (node, index, parent) => {
  ...
  const linkNode: Link = { type: "link", url: fp + anchorPart, children: [{ type: "text", value: ... }] }
  parent.children[index] = replacement
  return SKIP
})
```

There **is** a deprecated `wikilinkRegex` in that file, but on `v5` it is used only in the `enableInHtmlEmbed` branch, which rewrites wikilinks found inside raw `html` nodes (lines 376–401) — and it is **off by default** in Quartz's shipped config (`quartz/cli/templates/default.yaml` line 66: `enableInHtmlEmbed: false`).

### What this means for the fence

Two consequences, and they point in opposite directions:

- **Bad news for the naive plan.** Because wikilink *tokenisation* happens at parse time, "inject a raw string subtree and let Quartz's wikilink parser run over it" is not literally possible. Parsing is over by the time any transform runs, and micromark never descends into a fenced code block's content anyway. So there is nothing "still upstream of wikilink resolution" for a transform to be ordered before.
- **Good news, and it is decisive.** The *resolution* half — `wikilink` node → `link` node → resolved href — is two ordinary tree transforms, one remark (OFM, order 30) and one rehype (`crawl-links`, order 60). If our plugin produces `wikilink` nodes in the injected subtree and runs **before order 30**, both halves run over our subtree for free with zero duplicated logic.

So the right shape is: **parse the fence body ourselves with Quartz's own parser configuration, then let Quartz's existing downstream transforms do the resolving.** Not "hand the raw string to Quartz", and not "resolve wikilinks ourselves".

### Getting Quartz's exact parser configuration for free

`remark-parse` reads its extensions **at parse-call time, not at attacher time** (`remarkjs/remark`, `packages/remark-parse/lib/index.js` lines 30–40):

```ts
self.parser = function (document) {
  return fromMarkdown(document, {
    ...self.data('settings'),
    ...options,
    extensions: self.data('micromarkExtensions') || [],
    mdastExtensions: self.data('fromMarkdownExtensions') || []
  })
}
```

And unified freezes all attachers before the first `parse()`/`run()` (`unifiedjs/unified` `lib/index.js` lines 609–641, and `parse()` at 657–663 which calls `this.freeze()` first). So by the time *any* transform executes, `micromarkExtensions` already contains every extension every plugin registered — wikilink, tag, highlight, comment, math (remark-obsidian, order 30) **and** GFM (`github-flavored-markdown/src/transformer.ts` lines 21–22, order 40), regardless of our plugin's own position in the array.

Therefore, inside our transform:

```ts
markdownPlugins() {
  return [function (this: Processor) {
    const self = this
    return (tree: Root, file: VFile) => {
      visit(tree, "code", (node: Code, index, parent) => {
        if (node.lang !== "quiz" || !parent || index === undefined) return
        const sub = self.parse(node.value)   // Quartz's exact md syntax, wikilinks + GFM included
        ...
      })
    }
  }]
}
```

`self.parse()` on the already-frozen processor is safe and re-entrant — it is public unified API and `freeze()` is idempotent (`lib/index.js` lines 610–612).

**Deterministic alternative** if reusing the live processor feels too clever: `remark-obsidian` explicitly re-exports its pieces (`src/index.ts` lines 106–119) — `wikilinkSyntax`, `wikilinkFromMarkdown`, `customTaskCharTransform` — so the same subtree can be built with an explicit `fromMarkdown(body, { extensions: [wikilinkSyntax(), gfm()], mdastExtensions: [wikilinkFromMarkdown(), gfmFromMarkdown()] })`. Costs a pinned dependency on the plugin's internals; buys independence from attacher ordering. Prefer `self.parse()`; keep this in the back pocket.

---

## 3. Plugin ordering — the concrete mechanism

**Config field:** `order`, a number, on each entry of the top-level `plugins:` array in `quartz.config.yaml`.

`quartz/plugins/quartz-plugins.schema.json`, `properties.plugins.items.properties`:

```json
"order": { "type": "number", "minimum": 0, "description": "Plugin execution order" }
```

**Resolution rule** — `quartz/plugins/loader/config-loader.ts` lines 416–429:

```ts
const sortByOrder = (a, b) => {
  const orderA = a.entry.order ?? a.manifest?.defaultOrder ?? 50
  const orderB = b.entry.order ?? b.manifest?.defaultOrder ?? 50
  return orderA - orderB
}
transformers.sort(sortByOrder)
```

Explicit `order` wins over the plugin's `defaultOrder` manifest field, which defaults to 50 (`quartz/plugins/loader/types.ts` lines 56–57). The sorted array becomes `plugins.transformers` (config-loader.ts line 504), which is the exact array `createMdProcessor` flat-maps. **Ordering is fully controllable, ascending, lower first.**

Worth noting: `builtinTransformers` is an **empty array** (config-loader.ts lines 495, 504). Every transformer in a Quartz v5 build — including Obsidian-flavoured markdown — is a config-listed plugin with a movable `order`. Nothing is pinned ahead of us.

**The shipped numbers** (`quartz/cli/templates/default.yaml`):

| order | plugin | phase that matters here |
| --- | --- | --- |
| 5 | `note-properties` | md |
| 10 | `created-modified-date` | — |
| 20 | `syntax-highlighting` | **html only** |
| **25** | **← our slot** | **md** |
| 30 | `obsidian-flavored-markdown` | md (wikilink→link) + html (`rehype-raw`, `rehype-obsidian`) |
| 40 | `github-flavored-markdown` | md (`remark-gfm`) + html (slug, autolink) |
| 50 | `table-of-contents` | |
| 60 | `crawl-links` | html (href resolution, `file.data.links`) |
| 70 | `description` | html (`file.data.text = toString(tree)`) |

So the entry is:

```yaml
  - source: "./quartz-plugins/quiz-fence"
    enabled: true
    order: 25
```

Local paths are a supported source: "Local file paths (e.g., `./my-plugin`, `../sibling-plugin`, `/absolute/path`) are also supported for local development or airgapped environments" (schema `plugins.items.properties.source`), implemented at `gitLoader.ts` lines 47–52 (`isLocalSource`) and 436 (local plugins are symlinked, not cloned). This keeps ADR 0002's "our code confined to our own plugin files" intact.

**Invoking the wikilink transform directly is not necessary and is not recommended.** OFM's wikilink transform is an anonymous closure inside `markdownPlugins()` (transformer.ts line 188) — it is not exported and has no name. It could only be reached by re-implementing it. Ordering makes that moot.

---

## 4. Syntax highlighting — no interference, no `excludeLangs` needed

`quartz-community/syntax-highlighting/src/transformer.ts` lines 43–47, in full:

```ts
return {
  name: "SyntaxHighlighting",
  htmlPlugins() {
    return [[rehypePrettyCode, rehypeOpts]]
  },
```

It declares **no `textTransform` and no `markdownPlugins`**. It is `rehype-pretty-code` and nothing else. Combined with §1's two-processor structure, a `quiz` code node reaches our remark plugin with `lang`, `meta`, and `value` exactly as authored. Its nominal `order: 20` (before ours) is irrelevant, because ordering only sequences plugins *within* a phase.

There is no `excludeLangs` option on this plugin, and none is required. For completeness, the degradation path if a `quiz` fence ever *does* survive to hast — a `problems/` note where ticket 06 bans them, or a parse-failure fallback — is graceful, not fatal: `rehype-pretty-code` wraps the highlight call in try/catch and retries with `plaintext` (`packages/core/src/index.ts` lines 415–421):

```ts
  highlighter.codeToHtml(strippedValue, getOptions(lang, meta)),
} catch {
    highlighter.codeToHtml(strippedValue, getOptions('plaintext', meta)),
```

**Astro's `excludeLangs` has no Quartz analogue because Quartz does not have the problem.** Astro highlights during Markdown compilation; Quartz highlights a phase later.

---

## 5. The infostring, and ticket 15's constraint

### Reading it

mdast's `Code` node carries the infostring split into two fields — `lang` (first word) and `meta` (the rest). For ```` ```quiz 01JQ9F3K2M7VXN4V cloze ````, `node.lang === "quiz"` and `node.meta === "01JQ9F3K2M7VXN4V cloze"`. That is the parser-side read, and it is the same field OFM uses to detect mermaid (`transformer.ts` lines 562–571).

### Making it survive to hast — verified, with precedent

Emit a custom node type with `data.hProperties`. `mdast-util-to-hast`'s default unknown-node handler (`lib/state.js` lines 409–425) does this:

```js
function defaultUnknownHandler(state, node) {
  const data = node.data || {}
  const result =
    'value' in node && !(own.call(data, 'hProperties') || own.call(data, 'hChildren'))
      ? {type: 'text', value: node.value}
      : {type: 'element', tagName: 'div', properties: {}, children: state.all(node)}
  state.patch(node, result)
  return state.applyData(node, result)
}
```

and `applyData` (lines 352–396) copies `hName` onto `tagName` and `structuredClone(hProperties)` onto `properties`. So:

```ts
const quizNode = {
  type: "quiz",
  data: {
    hName: "div",
    hProperties: {
      className: ["quiz"],
      "data-quiz-id": ulid,
      "data-quiz-type": type,      // "mcq" | "cloze" | "recall"
    },
  },
  children: sub.children,          // the parsed fence body
}
parent.children[index] = quizNode
```

becomes `<div class="quiz" data-quiz-id="…" data-quiz-type="mcq">…</div>` in hast, and the type is a plain attribute on a plain element from that point on.

**This is not inference — it is the pattern Quartz itself already uses for exactly this purpose.** OFM stamps `"data-callout": calloutType` and `"data-callout-fold"` onto a blockquote's `hProperties` (transformer.ts lines 544–552), and `"data-clipboard"` onto mermaid code nodes (line 568); `remark-obsidian` stamps `dataTaskChar` (`src/lib/task-char.ts` lines 23–24). Every one of those `data-*` attributes is read later by client scripts, so the whole route is exercised in production.

**It also survives `rehype-raw`.** OFM's `htmlPlugins` puts `rehypeRaw` first (transformer.ts line 580), and `hast-util-raw` re-parses the entire tree through parse5 — but its readme states it does so "while keeping the original data and positional info intact", and `data-callout` demonstrably survives the same round trip today. Attributes are the durable carrier; anything stashed only in `node.data` after that point is at the mercy of the same round trip, so **use the attribute, not `node.data`**.

### Ticket 15 is satisfied

Ticket 15's index-shaping plugin is an `htmlPlugin` ordered after `description` (order 70, `quartz-community/description/src/transformer.ts` lines 28, 35, 47 — `htmlPlugins()` … `let text = escapeHTML(toString(tree))` … `file.data.text = text`). At that point it walks a hast tree in which every quiz block is `element` / `tagName: "div"` / `properties["data-quiz-type"]`. Per-type stripping is a `visit(tree, "element", …)` away, and it can recompute `file.data.text` without touching the rendered tree — which is precisely the trap ticket 15 identified.

**A solution that consumed the infostring and discarded it would indeed fail; this one does not.** Ticket 15's plugin entry needs `order: 71` (or anything > 70).

---

## 6. What else runs over the injected subtree — the free wins

Because the subtree is real mdast sitting in the document tree from order 25 onward, everything downstream treats it as ordinary content:

- **`wikilink` → `link`**, OFM order 30 (transformer.ts 188–318). Aliases, `#heading` anchors (github-slugged, line 301), block refs, image embeds — all of it, unmodified.
- **`<a href>` resolution and edge collection**, `crawl-links` order 60 (`src/transformer.ts` lines 62–136, 186): `visit(tree, "element", …)` rewrites `node.properties.href` through `transformLink`, tags `internal`/`external`/`alias`/`broken`, stamps `data-slug`, and finally `file.data.links = [...outgoing]`.

  That last line is the one ticket 03 and ticket 02 care about: **a wikilink in a quiz option's explanation lands in `file.data.links`, so it becomes a real untyped edge in the backlink graph and the graph view, exactly like any other body link.** No special-casing anywhere.
- **GFM task lists** for the option list, via `remark-gfm`'s micromark extension, active at parse time (§2).
- **`rehype-slug` / autolink headings**, `github-flavored-markdown` order 40 htmlPlugins.

---

## 7. Two real hazards, both cheap to defuse

### 7.1 Positions are relative to the fence body, and one downstream transform trusts them

`remark-obsidian`'s `customTaskCharTransform` recovers the original checkbox character by slicing the **whole-file source** at each list item's offset (`src/lib/task-char.ts` lines 4–19):

```ts
visit(tree, "listItem", (node: any) => {
  if (typeof node.checked === "boolean") {
    let char = node.checked ? "x" : " "
    if (source && node.position?.start?.offset != null) {
      const slice = source.slice(node.position.start.offset, node.position.start.offset + 20)
      const m = slice.match(/\[([^\]])\]/)
      if (m) char = m[1]
    }
    ...
    node.data.hProperties.dataTaskChar = char
```

That transform is returned by `remarkObsidian` itself (`src/index.ts` lines 86–103) and therefore runs at **order 30 — after ours**. Our injected `listItem` nodes carry offsets into the *fence body*, not the file, so the slice lands at an arbitrary place in the note and `dataTaskChar` can be recovered wrong. `node.checked` (from GFM) stays correct, but `dataTaskChar` drives checkbox rendering in `rehype-obsidian`.

**Fix:** strip `position` recursively from the injected subtree before splicing it in. The guard `node.position?.start?.offset != null` then fails and the correct `checked ? "x" : " "` fallback stands. One `visit(sub, (n) => { delete n.position })`.

Cost of stripping: vfile messages originating inside a quiz body lose their line numbers — relevant to ticket 13's validation reporting, not to rendering. The alternative (shifting every offset by the fence body's start offset) is exact for an unindented top-level fence and is worth doing if ticket 13 wants precise error locations.

### 7.2 `remark-obsidian`'s comment stripper also runs after us

Same transform (`src/index.ts` lines 87–99) splices out `comment` nodes. Harmless — desirable, even: `%%comments%%` inside a quiz body behave as they do everywhere else.

---

## 8. The recommended shape, in one place

```yaml
# quartz.config.yaml
  - source: "./quartz-plugins/quiz-fence"
    enabled: true
    order: 25                      # after syntax-highlighting (html-only), before OFM (30)
```

```ts
// markdownPlugins, order 25
visit(tree, "code", (node, index, parent) => {
  if (node.lang !== "quiz") return
  const { ulid, type } = parseInfostring(node.meta)   // type defaults to "mcq" (ticket 03)
  const sub = self.parse(node.value)                  // full Quartz md syntax
  stripPositions(sub)                                 // §7.1
  parent.children[index] = {
    type: "quiz",
    data: { hName: "div", hProperties: {
      className: ["quiz", `quiz-${type}`],
      "data-quiz-id": ulid,
      "data-quiz-type": type,
    }},
    children: sub.children,
  }
  return SKIP
})
```

Everything after that is Quartz doing its normal job: OFM resolves the wikilinks at 30, `crawl-links` resolves the hrefs and records the edges at 60, `description` flattens at 70, ticket 15's plugin re-flattens per type at 71.

The client-side interactivity is then the mermaid pattern the ticket already identified — an `externalResources()` inline script bound to Quartz's `nav` event — except that it operates on real rendered DOM inside the `<div class="quiz">` rather than on an opaque string. That is strictly easier than mermaid's job, not harder.

---

## 9. Fallbacks — not needed, recorded for the file

The ticket listed three, in order of preference. Since (1) resolves yes, none is required. For the record:

1. **"Resolve wikilinks inside the fence body ourselves."** Would mean re-implementing OFM's 130-line wikilink visitor, including alias handling, heading slugification, block refs, and six image/video/SVG embed branches (transformer.ts 193–318) — and then diverging from it on every upstream change. Avoided entirely by ordering.
2. **"Restrict quiz bodies to plain text plus explicit links."** Would break ticket 03's stated requirement that a wrong answer link "is a link like any other, so it is authored like any other and it appears in the graph like any other" — the graph membership is what §6 delivers for free.
3. **"Reopen ticket 03's format."** No grounds. Its legibility-in-Obsidian argument is untouched by anything here.

---

## What I could not verify

Stated plainly, not papered over:

1. **I did not run a build.** Every claim is from reading source; none is from executing it. The two things I would want a spike to confirm, in order: (a) that `self.parse()` inside a transform on the frozen processor actually yields `wikilink` nodes — the code path is unambiguous (§2) but it is the load-bearing line of the whole design; (b) that `data-quiz-type` survives `rehype-raw`'s parse5 round trip in *this* pipeline. The spike the ticket already describes settles both: minimal clone, one local transformer at `order: 25`, one note with a quiz fence whose option explanation contains `[[Some note]]`, then grep the emitted HTML for `data-quiz-type` and for a resolved `<a href>` inside the quiz div.
2. **The `quartz-community/*` repos have no version pinning in what I read.** I read `HEAD` of each plugin repo, not the version `quartz.config.yaml` would resolve. The plugin loader clones by ref (`gitLoader.ts` `parsePluginSource`, `#ref` supported per the schema) and the `@quartz-community/*` packages are `0.1.x`–`0.2.x`. **`customTaskCharTransform`'s offset behaviour (§7.1) and OFM's wikilink visitor are both un-versioned surfaces we would be ordering against.** Pin refs.
3. **`table-of-contents` (order 50) I did not read.** If it is a markdownPlugin visiting headings, a heading inside a quiz fence would enter the TOC. Ticket 03's format does not use headings inside a fence, so this is latent rather than live — but if the code-completion type ever arrives, check it.
4. **Nested-fence behaviour under `~~~~quiz`** (ticket 03's outer-fence rule) I did not verify against micromark's fence matching. It is standard CommonMark and should hold, but `self.parse()` on a body that itself contains a ```` ``` ```` fence is worth one line in the spike.
5. **Whether `hProperties` keys with hyphens serialise identically to camelCase ones.** OFM uses both forms (`"data-callout"` hyphenated at line 548, `dataTaskChar` camelCase in task-char.ts line 24) and both work today, so I am confident, but I did not read `property-information`'s resolution to prove the hyphenated form is canonical.
6. **Ticket 15's `order: 71` claim is mine, not the ticket's.** Ticket 15 says "ordered after `description`" without a number; `description` is `order: 70` in the shipped default config, but a user config could move it. The rule to encode is "greater than whatever `description`'s order is", not the literal 71.
