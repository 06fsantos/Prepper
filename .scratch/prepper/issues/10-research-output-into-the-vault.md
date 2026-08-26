# How `/research` output lands in the vault

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 01

## Question

How does `/research` output become first-class vault content?

`research` spins up a background agent that writes findings to a single Markdown file, citing each claim, saved "where the repo already keeps such notes; match the existing convention". That convention has to be defined.

To resolve:

- **Destination.** Whether research notes land in `content/` as readable library content, or in an author-side staging area that gets promoted deliberately. Research output is raw investigation; not all of it belongs in front of a reader.
- **Frontmatter.** Research notes need the same schema hooks as everything else to join the graph. The skill has to be told to emit them.
- **Relationship to lessons.** A research note is grounding material; a lesson is taught content. Is the relationship a typed link (`grounds`, `sourced-from`), and does the reader see it?
- **Citations as notes.** `research` cites primary sources per claim. Whether cited sources become resource notes in the vault — which would make "what have I read about consistent hashing" answerable — or stay as inline URLs.
- **Skill change.** Like ticket 09, decide whether this is an edit to the local `research` skill, a wrapper, or purely a convention documented for the author.

## Context added by ticket 02

[Wikilink resolution and backlink graph rules](02-wikilink-resolution-and-backlink-graph.md) surfaced a direct contradiction this ticket now owns.

The dev's requirement: **raw research and background data must not be visible to the reader in the web app — only learning material.** But ticket 01 decided `/research` output is a `reference` with a `sources` field, and `reference` is Library content, which ticket 02 defined as exactly what the build renders.

So one of three has to give:

1. The dev **distils** research into a `reference` by hand; the raw research file never enters `content/`.
2. Research output enters the vault but is **marked unpublished** (`draft: true` already exists, or `sources` implies hidden) — which makes `draft` mean two different things.
3. Raw research lives **outside the vault** entirely, reintroducing the "research note" distinction ticket 01 deliberately collapsed.

Ticket 02's rule is independent of the outcome: **anything not Library content is neither a page nor a node.** This ticket only decides which side of that line research sits on.

## Answer

### Where research lives

**Research is a seventh note type, `content/research/`, inside the vault and never rendered.**

The dev's requirement — raw investigation must not reach the reader — is enforced by the **directory**, not by a field the build has to honour. This amends [ticket 01](01-vault-structure-and-note-schema.md)'s "'research note' is not a type; provenance is a field, not a type": that ruling assumed research output *was* a `reference`, and [ticket 02](02-wikilink-resolution-and-backlink-graph.md) then defined Library content as exactly what the build renders, so the two could not both stand. Applying ticket 01's own **type-is-the-directory** rule honestly resolves it.

Rejected: `draft: true`, which would mean two opposite things ("unfinished, will publish" and "raw, never publishes") needing opposite handling; and a `publish: false` flag on a `reference`, which puts renderability in a field rather than in the path — the split ticket 01 rejected. Research staying *outside* the vault was also rejected: in the vault, Obsidian sees it, so it is browsable, searchable, and in Obsidian's own graph while authoring.

### The Workshop class

The vault's two classes were **Library** (rendered) and **Learner state** (*notes about the dev*). A Research note is about the subject and still not for the reader, so it fits neither. The non-Library class is renamed to the axis that actually divides the vault:

- **Library**: `lesson`, `reference`, `problem`, `term`, cheat sheet — what the build renders.
- **Workshop**: `research`, `record`, `mission` — what it never does. **Learner state** survives as the subset of Workshop that is about the dev.

The rule stays one sentence: *the build renders Library content and nothing else.* [CONTEXT.md](../../CONTEXT.md) amended accordingly.

### Naming, fields, lifecycle

- **A research note is named after the question it answers**, not the topic it touches (`Does Redis Cluster rebalance on node loss.md`). Ticket 01 made filenames unique vault-wide, and topic-named research collides head-on with the `term` note of the same name — the most likely name to already exist. A question-shaped name makes the collision vanish on its own and is honest about the note's content. Fallback for a residual collision is a `(research)` suffix; dropping vault-wide uniqueness is not an option, since ticket 01 chose it precisely to spare ticket 02 a resolution rule.
- **Fields: `id`, `title`, `date`, `sources`, optional `topic`.** `date` because "when did I look into this" is the first thing that matters re-reading old research against a moving API. **`topic` is optional here and required nowhere else in the Library** — it is a controlled vocabulary that fails the build on an unknown value, which a background agent cannot satisfy blind, and a Workshop note is in no topic index to be missing from. No `question` field: the filename is the question.
- **`sources` moves to `research` and is dropped from `reference`.** On a Reference it duplicated the inline citations with no reader-facing render, and a field nothing reads rots.
- **Research notes are never pruned.** The Reference supersedes the note for the *reader*; it does not supersede the sources, the dead ends, and what was ruled out. The app never shows them, so the only cost is Obsidian clutter, which the directory already contains.

### Citations as notes — discharging ticket 09's constraint

**Cited sources stay inline external links; `RESOURCES.md` remains the author-side ledger.** No source becomes a note. A note whose body is a URL and a sentence is not teaching material, and it would sit in the topic index beside real Lessons. Selective promotion ("a source you would genuinely re-read earns a note") was rejected for needing a judgement call re-litigated on every run. Per the constraint in [ticket 09](09-fork-teach-to-emit-markdown.md), this binds `author`'s citations identically: **one provenance model, inline links**.

### Linking, and the promotion step

- **No typed edge for grounding.** A Lesson leaning on a Reference is an ordinary body wikilink in the backlinks panel. A typed edge earns its place only if it renders differently, and `topic` already puts the two on the same term page.
- **A wikilink from Library content to a Workshop note warns and renders as an unclickable affordance** — the same treatment as an unwritten link, a *different* cause and a different message: *"link to a Workshop note — invisible in the app."* It will happen constantly during authoring (following a Lesson back to the research behind it), so failing the build punishes normal work; the warning doubles as a nudge to distil. New rules for [ticket 13](13-vault-validation-rules.md).
- **`reference` survives as the deliberate promotion step**, and **`author` gains a reference mode** taking a research note as its input: `/author reference <path to research note>`. Ticket 09 made `author` the only thing that mints ULIDs and knows the term/cheat-sheet/reference picking rule, so a hand-written Reference means a hand-minted identity, which 09 ruled out. The input is the research note rather than a topic: asking the skill to guess which research is relevant is the inference that produces a confidently wrong distillation. This extends ticket 09's scope (lesson/term/cheat sheet) by one mode.

### Skill mechanics

**No fork, no wrapper — a convention documented in `CLAUDE.md`.** The vendored `research` skill is hash-pinned in `skills-lock.json` and its own instruction is *"save it where the repo already keeps such notes; match the existing convention"* — it has no opinion to override, so a paragraph naming `content/research/`, the question-shaped filename, and the frontmatter steers it with nothing to maintain. This is the ticket-09 precedent (never edit a vendored skill) reaching a cheaper conclusion, because unlike `teach`, `research` needs no behavioural change.

**Existing research stays in `.scratch/`.** `.scratch/prepper/research/` (tickets 08 and 12) is research about *building* Prepper, not about interview subject matter; it belongs to the wayfinder effort that spawned it and dies with it. `content/research/` is subject-matter research only.

## Appended by ticket 18

[Library-to-Workshop embed rendering](18-library-to-workshop-embed-rendering.md) closes the one gap this ticket's promotion step left open: what `author` does when a Lesson needs content that currently lives in a Research note.

`/author reference` stays **whole-note** — fragment promotion is not built. The picking rule, which belongs in the FORMAT docs where `author` reads it rather than in the validator:

- **Promote** when the material is looked up repeatedly and stands on its own — a table, an API surface, a comparison. The Lesson then links to the resulting Reference.
- **Write it into the Lesson**, in the Lesson's own words, when the material only supports the argument that Lesson is making.

That is this vault's existing Lesson/Reference boundary — "read roughly once" versus "looked up repeatedly" — so it adds no concept. The consequence for the boundary this ticket drew: **`author` never emits a Library→Workshop embed**, and neither does `import`. Ticket 18's validation error is the backstop for a stale link or an agent bug, not a step in the authoring workflow.
