# 09: Quiz fences render — the order-25 transform

**What to build:** A fenced ```quiz block inside a Lesson becomes an answerable question in the
reading flow, so retrieval practice sits where the material is. Its body is **ordinary Markdown**
— the dev is never learning a second notation, and the block stays readable as a plain code block
in Obsidian while it is being written.

This ticket is the build half: parsing, validating, and emitting the markup. The clicking is 10.

**One local remark plugin at `order: 25`** — after highlighting (20), before
obsidian-flavoured-markdown (30) — does two things. It **re-parses fence bodies with
`self.parse()`**, so the downstream transforms resolve wikilinks inside them: Quartz's parser,
Quartz's transforms, not an opaque string handler and not a second wikilink implementation of ours.
`crawl-links` then walks the injected subtree for free, and a wikilink written in an explanation
becomes a real graph edge — a link is a link wherever it is written. It also **degrades a
Library→Workshop embed** into the marked, unclickable affordance and raises the error from 06.

Two mechanics it depends on. `data.hProperties` carries `data-quiz-type` / `data-quiz-id` through
to the hast element — Quartz's own `data-callout` / `data-clipboard` pattern — so fence type stays
recoverable at html-plugin time rather than only at parse time. And injected nodes carry
fence-relative offsets while remark-obsidian's task-char transform slices the whole file, so
`position` must be **stripped** on injected nodes. The cost is no line numbers inside quiz bodies,
which constrains violation messages rather than adding a rule. Syntax highlighting cannot
interfere: it is a rehype plugin, a phase later.

Infostring is ```` ```quiz <ULID> [type] ````, where `type` is `cloze` or `recall` and omitting it
means `mcq` — **explicit, never inferred from body shape**. A body containing its own fence uses a
`~~~~quiz` outer fence. From the prototype, this is the settled shape:

```quiz 01JQ9F3K2M7VXN4V
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Constant time, one scan
  > Nothing is scanned unless buckets collide.
  > See [[Collision handling]]
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```

A prose prompt, a GFM task list of options, and a blockquote nested under the option it explains.
Cloze marks its holes `{{like this}}`, any number of them. Free recall is a prompt and a reveal.

Quiz blocks appear in **Lessons only** — practice units never nest, and a mid-attempt MCQ must not
be able to masquerade as the attempt.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] An mcq fence emits markup carrying `data-quiz-type` and `data-quiz-id`, with each option and its explanation
- [ ] A cloze fence emits its spans; a recall fence emits its prompt and its reveal
- [ ] A wikilink written inside a fence body renders as a real link and appears as an edge in the link graph
- [ ] The plugin is one local-path remark plugin at `order: 25` and no Quartz file is edited to make it run
- [ ] A `~~~~quiz` outer fence works for a body that contains its own fence
- [ ] The fence renders as a legible code block when the note is opened in Obsidian
- [ ] Error: an unparsable fence body
- [ ] Error: a missing or malformed infostring ULID
- [ ] Error: an unknown type word in the infostring
- [ ] Error: an mcq without exactly one `[x]`
- [ ] Error: any quiz fence inside `problems/`
