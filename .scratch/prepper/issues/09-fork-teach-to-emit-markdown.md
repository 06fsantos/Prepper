# Fork `teach` to emit Markdown

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 01

## Question

What exactly changes in the local copy of the `teach` skill so it authors into the vault?

`teach` currently emits self-contained HTML lessons built from a shared component library in `./assets/`. The vault needs Markdown notes with frontmatter and wikilinks instead.

To resolve:

- **Lesson output.** Emit `.md` with the frontmatter from ticket 01 and quiz blocks from ticket 03, written into `content/`. The renderer takes over what `./assets/` was doing, so the skill's asset-library instruction largely disappears — confirm nothing valuable is lost with it.
- **Reference docs.** `teach` distinguishes lessons from reference docs. Whether that distinction survives is ticket 01's call; this ticket applies the answer to the skill.
- **Linking discipline.** `teach` already asks lessons to link to other lessons and references via HTML anchors. Restate as wikilinks, and add an instruction to link liberally, including to notes that do not exist yet.
- **Citations.** `teach` wants lessons littered with citations to primary sources, and `RESOURCES.md` tracking them. Decide how that meets the vault — resource notes, or inline links.
- **Workspace files.** What happens to `MISSION.md`, `RESOURCES.md`, `NOTES.md`, and `learning-records/` — do they become vault notes the app can surface, or stay author-side working files outside `content/`?
- **Mechanics.** Whether this is an edit to `.claude/skills/teach/`, a new sibling skill, or a wrapper. `teach` is `disable-model-invocation: true` and slash-command driven; keep that property.

## Answer

**A new sibling skill, `author`, not an edit to `teach`.** `.agents/skills/teach` is a vendored upstream copy pinned by content hash in `skills-lock.json` (`mattpocock/skills`), so an in-place edit is a silent divergence that a re-sync either clobbers or flags. `author` lives beside the vendored skills as first-party repo content, keeps `disable-model-invocation: true`, and stays slash-command driven (`/author <topic>`). The name change is deliberate: this is no longer "teach a person a topic", it is "author into this vault", and keeping the name `teach` invites the vendored copy to be updated over it. `vault` names the noun rather than the act; `study` and `prep` describe what the reader does later, which is the app's job.

Roughly 60% of upstream's body survives verbatim — philosophy, fluency vs storage strength, the mission, ZPD, knowledge-vs-skills, wisdom and communities. What is rewritten is exactly the sections this ticket enumerated.

### Scope: `author` owns lesson, term, cheat sheet

Three of the seven note types — the ones that are *taught* content, authored as a by-product of teaching one thing.

- `reference` belongs to `/research` ([ticket 10](10-research-output-into-the-vault.md)).
- **`problem` gets its own skill.** Curating an interview problem is a different act — paraphrase or import a prompt, write and verify a solution, calibrate difficulty within a kind, wire `practices` — and it is explicitly dev-curated, not generated. Folding it into a ZPD-driven teaching loop would smuggle agent-generated problems past the map's standing decision against them. Raised as [Problem authoring skill](16-problem-authoring-skill.md).

### Reference documents split three ways

Upstream's single `./reference/*.html` bucket ("cheat sheets, reference algorithms, syntax, glossaries") maps onto three vault types, and the skill carries the picking rule:

- **`term`** — what the topic *is*. One, canonical, mandatory.
- **`cheat sheet`** — the condensed understanding of the topic. Exactly one per topic with lessons (see below).
- **`reference`** — lookup material with no compression story: syntax tables, an algorithm listing, a complexity table. Unbounded.

A single bucket would force the build to guess, and the app renders and indexes the three differently.

### Term notes are created by the skill, mandatorily

`topic` is a controlled vocabulary and the build fails on an unknown value ([ticket 01](01-vault-structure-and-note-schema.md)), so a lesson introducing a new topic authors that term note in the same run. A stub is enough — title plus a one-paragraph definition — because the term page's real content is the generated index from [ticket 02](02-wikilink-resolution-and-backlink-graph.md).

The skill states the asymmetry explicitly, because it contradicts the "link liberally, including to notes that don't exist" instruction it also receives: **unwritten links are legitimate in a body, never in `topic` or `prerequisites`.** Those two fields are the build's hard-failure surface. (Contrast [ticket 06](06-problem-bank-note-format.md), which deliberately carved the opposite exception for `practices`.)

### Cheat sheets are living notes, written as the lessons are

The topic's cheat sheet is **created alongside the first lesson on that topic and updated in the same run as every subsequent one**. It grows as the topic does rather than being compiled at a "done" moment that never arrives, and the durable-20% test keeps it short while the topic grows — it is not an accumulating pile of lesson summaries.

So an authoring run touches up to four notes: the lesson, the term note (created if absent), the cheat sheet (created or updated), and possibly a record.

This makes cheat sheets the norm rather than the exception, which [ticket 05](05-spaced-repetition-model.md) already implied by promoting them to *the* quick-catchup tool replacing the review queue. `CONTEXT.md` amended accordingly: exactly one per topic that has any Lessons; topics with no Lessons have none. It stays out of the build's hard-failure set — [ticket 13](13-vault-validation-rules.md) must not fail a build for a missing cheat sheet, since a Term can legitimately carry only Problems or exist only to be linked.

### ZPD survives; sequence dies

Upstream conflates two senses of "order". ZPD now answers **"what should I author next?"** — a question about the dev's authoring queue — not "what should I read next?", which the app deliberately refuses to answer ([ticket 04](04-lesson-reading-experience.md): there is no reading order). The ordinal `0007-` prefix died with [ticket 01](01-vault-structure-and-note-schema.md); **`prerequisites` carries every ordering claim the vault makes**, and it is a graph, not a line.

The skill still reads `records/` and `MISSION.md` to pick what to write next, and **never emits prose presuming the reader arrived from a previous lesson** — "as we saw last time", "building on lesson 3". That prose is now false: the reader may have arrived from a backlink.

### Prerequisites

Assigned by the skill, from what the lesson actually assumed rather than what is topically adjacent — the test is "would this be confusing without that one?", not "is that related?". Since unwritten targets are banned in the field, **a lesson's prerequisites can only name lessons already in the vault**, so a new note can only point backwards and cycles are nearly impossible. The residual risk is retro-fitting prerequisites onto older notes, so the skill appends them only to the note being authored. Cycle detection remains a build rule, owned by [ticket 13](13-vault-validation-rules.md).

### Assets: deleted, with one escape hatch

The `## Assets` section goes wholesale — the renderer owns look-and-feel, and the shared stylesheet's job (making lessons look like one course) is now the app's by construction.

What is genuinely lost: **simulators and interactive widgets have no Markdown form.** The ```quiz fence is the only interactive primitive the vault has. This is a real, accepted narrowing of what a lesson can do. Diagrams route to `content/attachments/` as images embedded with `![[…]]`, which Obsidian renders and [ticket 01](01-vault-structure-and-note-schema.md) provided for. A mermaid fence would be strictly better — text, diffable, editable — but whether it renders is a build-pipeline capability, so it is fog against [ticket 11](11-choose-static-site-tooling.md).

### Quiz blocks and ULIDs

Two to four quiz blocks per lesson, **interleaved rather than gathered at the end** — retrieval practice, not a final exam.

Every ULID — note frontmatter `id` and quiz fence infostring alike — is **minted by running a command** (a shell one-liner or `npx ulid`), never typed. An agent cannot invent a ULID from parametric knowledge; it produces something ULID-shaped and wrong. This is a one-line instruction with outsized consequences: [ticket 01](01-vault-structure-and-note-schema.md) and [ticket 03](03-quiz-block-schema.md) both rest on ULIDs being real and unique, and this is the only place in the pipeline that generates them.

### Citations and workspace files

- **Citations are plain inline external links** in the lesson body. An external URL is not a wikilink and does not belong in the graph.
- **`RESOURCES.md` survives at the repo root, unchanged, author-side**, as [ticket 01](01-vault-structure-and-note-schema.md) placed it. Whether a cited source becomes a note in the vault is deliberately **not** decided here — it is [ticket 10](10-research-output-into-the-vault.md)'s "citations as notes" question, and whatever it decides must apply to `author`'s citations identically or the vault gets two provenance models. **Cross-ticket constraint on 10.**
- **`MISSION.md` → `content/MISSION.md`; `learning-records/` → `content/records/`** keeping the `0001-` prefix. Behaviour is unchanged — a record is written when a genuinely non-obvious insight lands or the mission shifts, and the mission still changes only with the dev's confirmation. Only the format changes: both now carry `id` and `title` frontmatter (plus `date` on records), because every note in the vault does, Library or not.
- **`NOTES.md` keeps its free-form shape.** Nothing in the vault reads it.

### Output and drafts

The skill **opens the note in Obsidian** (`obsidian://open?…`), not in the app: the vault is the authoring surface, Obsidian renders wikilinks and degrades the quiz fence legibly, and the app needs a build step that may not have run. Whether authoring should also trigger a preview build is fog against [ticket 11](11-choose-static-site-tooling.md).

**The skill never sets `draft: true`.** It authors finished notes, and a draft term note would be invisible to the topic index while remaining a legal `topic` target — a contradiction [ticket 13](13-vault-validation-rules.md) should not have to adjudicate. `draft` stays a hand-set dev flag.

### FORMAT docs

`author` ships its own: `LESSON-FORMAT.md`, `TERM-FORMAT.md`, `CHEAT-SHEET-FORMAT.md`, plus rewritten mission and record formats. Upstream's `GLOSSARY-FORMAT.md` is superseded by `TERM-FORMAT.md`.
