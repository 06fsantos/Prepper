# 13: Search, with the index deliberately unlike the page

**What to build:** Full-text search over all five Library types, so jumping around by memory of a
phrase works as well as jumping around by the tree — **without handing the dev the answers to the
questions they are searching**.

Quartz's search is **adopted whole in mechanism**; what changes is what lands in the index. The
component is **vendored in-tree** — this is where the fork/vendor line gets drawn: core Quartz
stays a remote, an altered community plugin is vendored, and fork-or-patch of core is not done.
`quartz-community/*` refs are pinned, since they are read at HEAD on un-versioned `0.1.x`.

The decisive fact: `contentIndex.json`'s `content` field is the **rendered tree flattened**
(`description` sets `file.data.text = toString(tree)`), so anything rendered is searchable —
including what the page visually conceals. Making the index differ from the page therefore means
**recomputing `file.data.text` in our own htmlPlugin ordered after `description`**, and **never
mutating the tree**, which would strip the content off the page too. Encode that ordering as
*greater than `description`'s order*, never as the literal number.

That plugin strips quiz material **per type**: mcq loses its options and explanations; a cloze span
is reduced to its **surface text**, so the sentence is findable without the hole being filled in;
recall loses its reveal.

Problems go the other way. A **sealed section stays in the index** — a solution is often the richest
prose on a topic and must be findable — and the spoiler is handled instead by **suppressing the
result excerpt for `problems/` results**. Sealing already survives injection into the preview pane
(12), so the result itself is safe.

Workshop is excluded **structurally**, by never rendering, not by a type-level exclusion rule.

**Blocked by:** 09, 11

**Status:** resolved

- [x] Search covers all five Library types with no type-level exclusion list
- [x] No Workshop note is ever a search result
- [x] Results carry a type chip derived from the slug
- [x] An mcq's options and explanations are absent from the index while the Lesson's prose is present
- [x] A cloze sentence is findable by its surface text, and the hidden span's answer is not in the index
- [x] A recall block's reveal is absent from the index
- [x] A Problem's sealed `## Solution` text is findable by search
- [x] A `problems/` result renders with no excerpt
- [x] `topic` is copied to `tags` at build to feed search, and `tag-page` stays disabled
- [x] The search component is vendored in-tree with its ref pinned; core Quartz is not patched

## What was built

`prepper/search-index/` — one htmlPlugin, and the whole of "the index is not the page".

- It **recomputes `file.data.text`** from a filtered walk and **never mutates the tree**, so
  every option, explanation and reveal is still on the page. `search-index.test.ts` asserts
  both halves against the same fixture, which is what makes the distinction statable.
- Its order is **`descriptionOrder + 1`**, read from `@quartz-community/description`'s own
  `quartz.defaultOrder` at load time, declared as the plugin's `defaultOrder`. The config
  entry deliberately carries **no `order:`** — an entry-level order silently outranks the
  manifest, so writing `71` there would put the literal back. Checked by hand: adding
  `order: 60` to the entry turns three subtests red.
- Stripping is per type, read off `data-quiz-type`: an mcq loses `.quiz-options`, a cloze
  loses what is inside each `.cloze` span (the sentence around the holes stays, and a
  `{{literal}}` in a code span was never a hole so it stays too), a recall loses
  `.quiz-reveal`. It replicates `description`'s `escapeHTML` and URL rewrite so that the
  index differs from the page in exactly one respect and no others.
- It copies `topic` into `tags` through `prepper/link-targets`, so `topic: "[[hash-maps]]"`
  resolves the same way it does for the link graph, and a Cheat sheet's scalar becomes a
  one-element list.

`prepper/search/` — Quartz's search, **vendored**. `@quartz-community/search` is dropped
from `package.json`; `vendor/` holds its built client script and compiled stylesheet, with
the sha256 of each pristine original recorded in `README.md` so a re-vendor is a diff. The
two alterations are a readable prelude and two marked call sites in the one result-renderer
function: a **type chip** from the slug's directory, and **no excerpt** on a `problems/`
result. `components/index.ts` is upstream's `Search.tsx` transcribed into `h`. Core Quartz
is untouched. The preview pane stays on for every type, because `prepper/problems` already
seals with `<details>`.

**Sealed sections stay in the index**, as this ticket and the spec both require — the
implementation brief handed to the agent said the opposite ("never let a Problem's
`## Solution`/`## Complexity` reach the index"); the ticket won.

### Beyond the checklist

- **`tag-page` disabled** has a consequence nothing had priced: an inline `#tag` in a body
  now addresses a page the site does not emit. `prepper/links` still does not mark it
  unwritten, which is right — nobody can write `tags/hashing.md` — and `links.test.ts` and
  `mechanisms.test.ts` were updated to state the new fact rather than the old one. Inline
  tags are outside the vault's vocabulary; if they should be a violation, that is a rule,
  and it is not this ticket.
- **`tags` removed from `note-properties`' `includedProperties`.** The build now derives the
  field, so leaving it on would have rendered a topic row on every page, pointing at
  `/tags/` pages `tag-page` deliberately no longer generates.
- **An authored `tags:` is a validation error** (`authored-tags`, in `rules/schema.ts`). Not
  on this ticket's checklist, but the spec requires it and this ticket is what creates the
  collision: the build now overwrites the field. `schema-and-identity-violations/` grew a
  fourteenth defect for it.
