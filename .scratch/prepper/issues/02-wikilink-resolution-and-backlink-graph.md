# Wikilink resolution and backlink graph rules

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 01

## Question

How do `[[wikilinks]]` resolve at build time, and how is the backlink graph computed and exposed?

To resolve:

- **Resolution target.** Do links resolve by filename, by title, or by a frontmatter slug? Are aliases supported (`[[lru-cache|LRU eviction]]`)? Obsidian's own resolution is filename-first with shortest-unique-path matching — deviating from it means the vault behaves differently in Obsidian than in the app, which defeats the point of using a vault.
- **Broken links.** A link to a note that does not exist yet is normal and useful in Obsidian — it marks intent. What does the build do with one: fail, warn, or render it as a visible "not written yet" affordance? The last option is arguably a feature for the author.
- **Graph shape.** Is the graph just link-follows-link, or do typed relationships exist (prerequisite-of, elaborates-on, practices)? Typed edges make "what should I study next" answerable; untyped edges only make "what is nearby" answerable.
- **Exposure.** What the reader actually sees: a backlinks panel, inline related-note lists, both. (The visual graph view itself is fog, not this ticket.)
- **Cross-area links.** The stated motivation was navigating links *between* areas. Does anything special happen when a link crosses an interview area boundary?

## Context

From [Static-site tooling for Obsidian vaults](08-static-site-tooling-for-obsidian-vaults.md): `remark-wiki-link`'s alias syntax is `[[Page:Alias]]` with a **colon**, not Obsidian's pipe (`[[Page|Alias]]`). If aliases are wanted, that mismatch is load-bearing — it means the vault renders differently in Obsidian than in the app, which is the exact failure this ticket exists to avoid. Verify before committing to that plugin.

Also from that ticket: **no tooling computes a reverse backlink index natively.** The backlink graph is custom work regardless of framework, so this ticket's answer is not constrained by tooling — decide the semantics you want, not the ones a plugin makes easy.

## Answer

### Resolution

Wikilinks resolve against the **filename stem**, case-insensitively, extension optional. Ticket 01 guarantees filenames are unique vault-wide, so Obsidian's shortest-unique-path matching has nothing to disambiguate and is not implemented. Two files whose stems differ only by case are a **build error** — the vault must never rely on case, since macOS hides the mismatch until a case-sensitive build box finds it.

Never resolve against `title`: two notes may share a title, and `title` is prose the dev edits freely, while the filename is what Obsidian rewrites on rename.

**Aliases are supported, with Obsidian's pipe syntax**: `[[lru-cache|LRU eviction]]`. `remark-wiki-link` ships colon syntax (`[[Page:Alias]]`), which renders as literal text in Obsidian and breaks the premise of the whole map, so it is rejected as-shipped. This is a **constraint on ticket 11**, not a cost added by this ticket: ticket 12 already established that every non-JS path is bespoke and that the backlink index is custom work under every option, so a custom wikilink parser is table stakes.

**Syntax coverage**: plain links and heading links (`[[note#Heading]]`) are in; attachment embeds (`![[b-tree.png]]`) are in, as ticket 01 requires. **Note embeds (`![[note]]`) and block references (`[[note#^abc]]`) are out** — they must fail the build loudly rather than render wrong. Note embeds mean transclusion, which reopens what backlinks and reading progress mean for content appearing twice; block references mean Obsidian-generated `^ids` in Markdown the dev reads daily.

### Unwritten links

A wikilink whose target does not exist renders as a marked, unclickable **unwritten-link** affordance and emits a build **warning**. In an authoring tool this is a feature: the reading surface doubles as a todo list, and gaps surface exactly where the dev noticed them.

This is deliberately asymmetric with ticket 01, which made a missing `prerequisites` or `topic` target a hard **build failure**. A dangling body link is intent; a dangling prerequisite is a broken sequencing graph.

Unwritten targets are carried in the graph as **placeholder nodes**, which is nearly free once the reverse index exists and buys the highest-value authoring report available: *unwritten notes ranked by inbound link count* — a todo list ordered by how much the dev's own writing already leans on the gap. Placeholder nodes never enter the Library index or search.

### Graph shape

Edges are **typed by the field the link sits in — never by inline syntax**:

| source | edge |
|---|---|
| `prerequisites` | *prerequisite-of* |
| `topic` | *about* |
| `practices` | *practices* |
| body wikilink | *relates-to* (untyped) |

Three fell out of ticket 01 for free. The fourth, **`practices`, is new: an optional field on `problem` naming the lessons it drills** — an amendment to ticket 01's frontmatter table. Without it, a problem and a lesson connect only by sharing a `topic`, which is too coarse to say "you have read this, now do these three".

Typing by field rather than by syntax keeps authoring burden at zero and keeps every note valid Obsidian Markdown. No inline typed-link syntax exists or will.

**The prerequisite graph must be a DAG.** A cycle, or a note listing itself, is a build **error** naming the full cycle path. This is the one graph property that silently makes sequencing unanswerable rather than degrading it, so it cannot be a warning.

### Exposure

Typed edges render **inline, in context**; untyped edges collect in **one backlinks panel**. A typed edge has a natural home on the page; an untyped one does not.

- `prerequisites` — top of a lesson (read first), inverted at the bottom (this unlocks).
- `practices` — on a lesson, its problems; inverted on a problem, the lesson it drills.
- `topic` — subject chips on any note; **inverted on the term note**, which is ticket 01's promise that the topic index falls out of the graph rather than being built separately.
- body wikilinks — one ungrouped backlinks panel, labelled with the **source note's `title`, never the alias** (an alias is prose fitted to one sentence and reads as a mislabel standing alone), sorted alphabetically by title so the list stays stable as the vault grows.

This ticket decides what data exists and what it means; [Lesson reading experience](04-lesson-reading-experience.md) decides how it looks.

### Areas, and what the app renders

**There is no interview-area tier.** Ticket 01 dissolved areas into topics: "System Design" is a `term` note like any other. Nothing special happens when a link crosses topics — that is the entire reason the vault is a graph, not a special case to handle. "Interview area" is struck from the project vocabulary so it cannot drift back as a shadow taxonomy.

**The build renders Library content only.** `record` notes and `MISSION.md` generate no pages and are not nodes in the graph — not because they are background data, but because they are about the learner rather than the subject. What the dev would want from them in the app (what have I studied, what is due) is live progress state keyed off record identity — tickets 05 and 07 — not a rendered diary. A `[[lesson]]` link inside a record works in Obsidian and has no web equivalent, which is where records are read anyway.

The rule is stated as: **anything not Library content is neither a page nor a node.**

### Surfaced by this ticket

- **A seventh note type: `cheat-sheet`.** One topic condensed to the 20% of the information giving 80% of the understanding, for quick reading. At most one per topic; never required, so an early vault is not a wall of build failures. The **term note stays the canonical topic node** — `topic` values resolve to term filenames unchanged, and the generated topic index stays on the term page — with the cheat sheet a note *about* that topic, linked from it first. Pointing `topic` at cheat sheets was rejected: it would block authoring on a document written last. The type's own design (naming, frontmatter, reviewability, how thin the term page becomes) is [Cheat sheet note type](14-cheat-sheet-note-type.md).
- **Research output must not be reader-visible**, which contradicts ticket 01's "`/research` output is a `reference` with a `sources` field", since `reference` is Library content. Routed to [How `/research` output lands in the vault](10-research-output-into-the-vault.md). This ticket's rule is independent of the outcome — ticket 10 only decides which side of the Library line research sits on.
- **Validation rules** for [Vault validation rules](13-vault-validation-rules.md): case-only filename collision (error), prerequisite cycle or self-prerequisite (error), unwritten body link (warning), `![[note]]` embed or block reference (error), two cheat sheets claiming one topic (error).
- **Tooling constraint** for [Choose the build pipeline](11-choose-static-site-tooling.md): pipe-alias wikilinks rule out `remark-wiki-link` as-shipped; any candidate must accept a custom wikilink parser.


## Amended by ticket 11: the embed and block-reference bans are lifted

[Choose the build pipeline](11-choose-static-site-tooling.md) adopted **Quartz**, and with it lifted this ticket's hard build errors on note embeds (`![[note]]`) and block references (`[[note#^abc]]`). **No rule replaces them.**

This ticket gave two reasons for the embed ban. **One was already dead when ticket 11 read it**: "what backlinks and reading progress mean for content appearing twice" — [ticket 05](05-spaced-repetition-model.md) deleted reading progress and all per-user state, leaving nothing for duplicated content to corrupt. And the cost inverted with the tooling: under a bespoke generator, supporting transclusion was work and banning it was free; under Quartz, supporting it is free and banning it means a detector plugin written to switch off a feature we adopted Quartz to get.

**Accepted risk, declined deliberately.** [Ticket 10](10-research-output-into-the-vault.md) made a Library→Workshop wikilink a *warning* because a link only points. An embed does not point, it publishes: `![[some-research-note]]` inside a Lesson renders Workshop content into the built site and nothing catches it. A targeted Library-embeds-Workshop error was offered and declined in favour of no rules at all. If a leak happens, that error is the fix.

**Block references stay out by convention, not by build error** — Obsidian-generated `^ids` in Markdown the dev reads daily, and a link target that breaks silently when the paragraph around it is edited.

The rest of this ticket stands unchanged.
