# `prepper/search` — Quartz's search, vendored

Core Quartz is a git remote, merged periodically, never edited in place
([ADR 0002](../../docs/adr/0002-quartz-as-the-build-pipeline.md)). Community plugins are
npm packages configured from `quartz.config.yaml`. Neither modality covers a community
plugin whose **client script** has to change, and this is the one that does — so this is
where the line gets drawn:

> **Core Quartz stays a remote; a community plugin we alter is vendored in-tree.**

`@quartz-community/search` is dropped as a dependency and its two built assets live under
[`vendor/`](vendor), carrying our alterations in place and marked where they sit. A GitHub
fork was rejected as a second repo to maintain for no gain; a patch file re-applied at
install was rejected because it breaks silently on any upstream refactor of the render
function it edits. Vendoring breaks loudly, once, at merge time.

## What is vendored, and from where

| File                      | Upstream                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `vendor/search.inline.js` | `@quartz-community/search` **0.1.0**, built `src/components/scripts/search.inline.ts`   |
| `vendor/search.css`       | `@quartz-community/search` **0.1.0**, compiled `src/components/styles/search.scss`      |
| `components/index.ts`     | `@quartz-community/search` **0.1.0**, `src/components/Search.tsx`, transcribed into `h` |

The npm package publishes `dist/` only; both assets were lifted from the `sourcesContent`
of `dist/index.js.map`, which is where the built inline script and the compiled stylesheet
are recorded verbatim.

**The ref is pinned by content, not by a range.** `@quartz-community/*` publishes an
un-versioned `0.1.x` under caret ranges, so "0.1.0" is not on its own a thing you can get
back — which is why the vendored copy carries the sha256 of each pristine original below
rather than a dependency line. (The rest of the `@quartz-community/*` packages stay pinned
the ordinary way, by `package-lock.json`; CI installs with `npm ci`.) So that a future
re-vendor is a mechanical diff:

```
ec880d1576c45263a404dcf4730af91227383e0d107e374f1cc382362cce24e6  search.inline.js
b353cc691951eead936562f7c5ed2d0f823a37c8f81721f9a822fb339c1f64d4  search.css
```

Re-derive them with:

```sh
node -e 'const m=JSON.parse(require("fs").readFileSync("node_modules/@quartz-community/search/dist/index.js.map","utf8"));
const g=n=>m.sourcesContent[m.sources.indexOf(n)];
process.stdout.write(g("../src/components/scripts/search.inline.ts"))' | shasum -a 256
```

`search.inline.js` is a **build artifact**: minified, with Flexsearch inlined. It is not
ours to read or to reformat, which is why `.prettierignore` names it. Our alterations to it
are a readable prelude and two marked call sites, so the diff against upstream stays small
enough to re-apply by hand.

## The two alterations

Both are in the one function that renders a result card — a few lines apart, which is what
made vendoring cheap enough to prefer to the alternatives.

- **A type chip.** `slug` is in hand at the render site and type is the directory
  ([`CONTEXT.md`](../../CONTEXT.md)), so the chip costs the emitter nothing. "Binary search"
  matches a Lesson, a Cheat sheet, a Term and three Problems; without a chip the reader is
  parsing URLs to tell them apart, and with the topic index as the front door, search is
  plausibly the primary way the dev jumps to a note rather than a fallback.
- **No excerpt on a `problems/` result.** A Problem's sealed sections stay in the index —
  a solution is often the richest prose written on a topic and has to be findable — so the
  spoiler is handled at the result instead. **Findable but not shown**: the result appears,
  the thirty-word excerpt does not, and opening the note puts the reader at their own choice
  to unseal.

The **preview pane stays on**, for every type. It fetches a result's real HTML and injects
its elements, and `prepper/problems` seals `## Solution` and `## Complexity` with a
`<details>` precisely so the seal survives that — markup, never a script. Disabling the pane
for `problems/` was the fallback if that had not worked out; it is not needed, and disabling
it globally was never on, since it is a real affordance for the other four types.

## What is not here

**No type-level exclusion list, and none is needed.** All five Library types are searchable.
Workshop is excluded **structurally**: `prepper/workshop` is a Quartz _filter_, so a
Research note leaves the corpus before any emitter sees it — no page, no `contentIndex.json`
entry, no result. Nothing in this directory knows the word "Workshop", and a rule here would
be a second, weaker copy of a boundary that already holds. Unwritten-link placeholders stay
out for the same kind of reason: they have no page, so they have no entry.

**What lands in the index is not decided here.** That is
[`prepper/search-index`](../search-index/index.ts), which recomputes `file.data.text` after
`description` has set it.
