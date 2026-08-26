# Quiz fence re-parsing under Quartz

Parent: [Prepper — wayfinder map](../map.md)
Type: research
Status: resolved
Blocked by: 11

## Question

Can a Quartz transformer re-parse a ```` ```quiz ```` fence body as Markdown, with wikilink resolution running inside it?

This is the load-bearing assumption under [Choose the build pipeline](11-choose-static-site-tooling.md)'s decision to adopt Quartz, and it is currently unverified.

[Quiz block schema](03-quiz-block-schema.md) settled that the fence body is **ordinary Markdown** — a prose prompt, a GFM task list of options, a blockquote nested under each option — and stated explicitly that the build must re-parse it with the wikilink transform running inside, so that a wrong answer can link back into the lesson via an ordinary wikilink. Its words: **"a raw-string fence handler is not enough."**

Quartz's reference implementation for a custom fence is **mermaid**, which treats the fence body as an opaque string handed to a client-side renderer. That is exactly the shape ticket 03 ruled insufficient.

## To resolve

- **Does the seam exist?** Quartz transformers expose `markdownPlugins` and `htmlPlugins` returning remark/rehype `PluggableList`s. Determine whether a remark plugin can replace a `code` node whose lang is `quiz` with a parsed subtree (e.g. via `fromMarkdown` on the fence value), and whether Quartz's own wikilink transformer then runs over that subtree.
- **Plugin ordering.** Quartz's Obsidian-flavoured-markdown transformer owns wikilink parsing. Whether our plugin can be ordered *before* it — so the injected subtree is still upstream of wikilink resolution — is the crux. If ordering is not controllable, is calling the wikilink transform directly on the subtree viable?
- **Syntax highlighting.** Astro needed `excludeLangs` to stop its highlighter mangling an unknown fence before the plugin saw it. Determine Quartz's equivalent, or whether it leaves unknown langs alone.
- **The fallback, if the answer is no.** Options in rough order of preference: resolve wikilinks inside the fence body ourselves during the transform; restrict quiz bodies to plain text plus explicit links; or reopen ticket 03's format. Ticket 03's reasoning should not be reopened casually — it beat YAML and sigil formats on legibility-in-Obsidian grounds that still hold.

## Escalation

Resolvable by reading Quartz's source (`quartz/plugins/transformers/`, `@quartz-community/remark-obsidian`) and the plugin API docs. If reading is inconclusive, escalate to a spike: a minimal clone, one transformer, one note containing a quiz fence with a wikilink in an option's explanation.

## Constraint from ticket 15

[Vault search](15-vault-search.md) adds a **second consumer** of the quiz fence, and it is not the parser.

An index-shaping htmlPlugin (ordered after `description`, overwriting `file.data.text`) strips quiz material from the search index on a **per-type rule**: mcq drops options and explanations, cloze keeps the sentence with spans reduced to surface text, recall drops the reveal.

So whatever this ticket lands on must leave the fence's **type recoverable from the tree at html-plugin time** — a class, a data attribute, anything durable — not only available to the remark plugin that parsed it. A solution that consumes the infostring and discards it satisfies ticket 03 and breaks ticket 15.

## Answer

**Yes — the seam exists, it is clean, and no fallback is needed.** Ticket 03's format survives intact, and [ADR 0002](../../../docs/adr/0002-quartz-as-the-build-pipeline.md)'s load-bearing assumption holds. Full findings with file-and-line citations: [research/17-quiz-fence-under-quartz.md](../research/17-quiz-fence-under-quartz.md).

**The ticket's premise was wrong, and that is what makes it work.** This ticket (and the worry behind it) assumed Quartz v5 resolves wikilinks as a text-level regex replace, which would have forced us to wikilink-transform the fence body as a raw string *before* parsing it. It does not. `@quartz-community/remark-obsidian` registers a **micromark syntax extension** producing real `wikilink` mdast nodes at parse time; the `wikilink` → `link` conversion is a separate, ordinary tree transform inside obsidian-flavoured-markdown's own `markdownPlugins`. The deprecated `wikilinkRegex` survives only in the off-by-default `enableInHtmlEmbed` branch. So the correct shape is neither "hand Quartz an opaque string" (the mermaid pattern ticket 03 ruled insufficient) nor "resolve wikilinks ourselves": **parse the fence body with Quartz's own parser, and let the existing downstream transforms resolve what comes out.**

**The mechanism, concretely.**

- **Ordering is a first-class config field**, not something to fight: `order` (number, ascending, default 50) on a `plugins:` entry in `quartz.config.yaml`. `builtinTransformers` is empty, so nothing is pinned ahead of us. `syntax-highlighting` is 20 and obsidian-flavoured-markdown is 30, which puts our transformer at **`order: 25`**, loaded from a local path (`source: "./quartz-plugins/quiz-fence"`, a supported source).
- **Quartz's exact syntax comes for free.** `remark-parse` reads `micromarkExtensions` at parse-call time and unified freezes all attachers before the first run, so `self.parse(node.value)` inside our transform picks up wikilinks, tags, math *and* GFM task lists regardless of our position in the list. The deterministic alternative, if that coupling is ever unwanted: remark-obsidian re-exports `wikilinkSyntax`/`wikilinkFromMarkdown` for an explicit `fromMarkdown` call.
- **Syntax highlighting cannot interfere.** Quartz's highlighter is `rehype-pretty-code`, declared as `htmlPlugins` only — a phase later, over hast. There is no `excludeLangs` and none is needed; the question was borrowed from Astro, whose highlighter runs at the wrong stage for us to have this problem.
- **Ticket 15's constraint holds.** Emit a custom node with `data.hProperties` carrying `data-quiz-type` and `data-quiz-id`; `mdast-util-to-hast`'s default unknown-node handler plus `applyData` render it as a `<div>` with those attributes intact. This is **Quartz's own established pattern** — `data-callout`, `data-clipboard`, `dataTaskChar` are all read by client scripts today and all survive obsidian-flavoured-markdown's `rehype-raw`. So the fence's type is recoverable at html-plugin time, which is exactly what ticket 15 required.

**Unlooked-for win, discharging a ticket 02 wish.** `crawl-links` (order 60, rehype) walks the whole tree and populates `file.data.links`. A wikilink inside a quiz explanation therefore becomes a **real edge in the backlink graph** with no special-casing — the untyped *relates-to* edge ticket 02 defined, arriving free from a quiz block. Ticket 03 asked only that the link resolve; it also counts.

**One real hazard, found in source.** remark-obsidian's `customTaskCharTransform` recovers each checkbox character by slicing the **whole-file source** at the `listItem`'s offset, and it runs at order 30 — after us. Our injected nodes carry offsets relative to the *fence body*, not the file, so `dataTaskChar` can come out wrong on the GFM task list that ticket 03 made the MCQ option format. Two fixes, and they trade against each other: **strip `position` from the injected subtree** (one line, and the transform then skips our nodes) at the cost of losing line numbers in [Vault validation rules](13-vault-validation-rules.md)' messages for anything inside a quiz body; or **shift the offsets** by the fence's start position to keep them. Recorded as a constraint on ticket 13 rather than a ticket of its own — it is one implementation choice with a stated cost, and 13 already resolves as a living set.

**Two carry-forward constraints for implementation.**

1. **Pin the plugin refs.** The findings were read at `HEAD` of each `quartz-community/*` repo, and both surfaces we order against — obsidian-flavoured-markdown's wikilink visitor and the task-char offset behaviour — sit in un-versioned `0.1.x` packages. Ordering against a moving target is the risk this decision actually carries.
2. **Ticket 15's html-plugin rule is relative, not literal.** "Ordered after `description`" is `order: 70` in the shipped default; encode it as *greater than description's order*, never as the number 71.

**Accepted, and stated plainly: no build was run.** The code path is unambiguous and every step is cited, but the single line most worth executing is that `self.parse()` on the frozen processor really yields `wikilink` nodes. That is a first-implementation-step check, not an open decision — nothing else on the map waits on it — but if it fails, it fails back into ADR 0002, so it should be the first thing the build spike proves rather than something discovered late.
