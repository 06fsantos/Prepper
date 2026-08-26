# Vault structure and note schema

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: —

## Question

What is the directory layout of `content/`, what note types exist, and what frontmatter does each carry?

This is the keystone of the map: nearly every other ticket hangs off the answer.

To resolve:

- **Note types.** The pipeline currently implies at least: lesson, reference doc, research note, learning record, mission, problem, glossary term. Are all of these distinct types? Do lessons and references stay separate now that both are Markdown, or did that distinction only exist because one was a study document and the other a printable cheat sheet?
- **Directory layout.** Flat with type-carrying frontmatter, or directories per type (`lessons/`, `problems/`, `research/`), or directories per interview area (`arrays/`, `system-design/`)? Obsidian is indifferent; the build step and the wikilink resolution rules are not.
- **Frontmatter fields.** Scanning conventions can recover a title and a filename but cannot infer **topic**, **difficulty**, or **prerequisites** — the three fields a prep app needs to sequence anything. Settle the full field list, which fields are required, and which are free-form vs a controlled vocabulary.
- **Identity and stability.** What identifies a note across renames — the filename, a slug in frontmatter, or a generated id? This decides whether renaming a lesson breaks every link and every review record pointing at it.
- **Naming.** `teach` numbers lessons `0001-<dash-case-name>`. Does that survive, given ordering is now expressed by prerequisites and the link graph rather than by sequence?

## Answer

### Note types

Six, in two classes.

**Library content** (browsable, indexed): `lesson`, `reference`, `problem`, `term`.
**Learner state** (in the vault, outside the Library, never reviewable): `record`, `mission`.

Resolved distinctions:

- **`lesson` and `reference` stay separate.** The `teach` split (study document vs printable cheat sheet) was a rendering distinction and does dissolve now both are Markdown — but a second one survives it: a lesson is read roughly once in an order, carries prerequisites and quiz blocks, and has reading progress; a reference is looked up repeatedly and has none of those.
- **"Research note" is not a type.** `/research` output is a `reference` with a `sources` field. Provenance is a field, not a type.
- **`term` is a type.** One note per glossary entry, so `[[Big-O]]` resolves rather than dangling. This settles the map's "Glossary handling" fog.
- **`record` and `mission` are learner-state**, about the learner rather than the subject matter.

### Directory layout

Type is encoded in the path; topic never is.

```
content/
  lessons/      references/   problems/
  terms/        records/      attachments/
  MISSION.md
RESOURCES.md    NOTES.md      (repo root, outside the vault)
```

- **Topic stays out of the path** because it is genuinely many-to-many — a note on hash-map complexity is about arrays *and* Big-O, and the link graph exists precisely because topics cross. A directory would force each note to pick one home and lie about the rest.
- **Type goes in the path** because it is exactly one per note, permanent, and drives both rendering and reviewability. Consequently there is **no `type` frontmatter field** — it is derived, not declared.
- **Filenames are unique across the entire vault**, including `attachments/`. Per-type directories otherwise permit `lessons/arrays.md` and `terms/arrays.md`, which makes `[[arrays]]` ambiguous and hands ticket 02 a resolution rule it should not have to invent.
- **Attachments live in the vault** (`content/attachments/`, embedded as `![[b-tree.png]]`). Outside the vault, embeds render nothing in Obsidian, which undercuts the standing decision for the content type most likely to need images.
- **`RESOURCES.md` and `NOTES.md` are not note types.** They are authoring scaffolding, not library content; in the vault each would need an `id`, a `title`, and a place in the Library index none of them wants.

### Frontmatter

Every note: `id` (ULID, required, immutable) and `title` (required — the filename cannot recover casing, e.g. `big-o-notation` → "Big-O Notation"). No `created` field; the ULID encodes it.

| type | required | optional |
|---|---|---|
| lesson | `topic` | `prerequisites`, `draft` |
| reference | `topic` | `sources` |
| problem | `topic`, `difficulty` | `source` |
| term | — | `topic` |
| record | `date` | `topic` |
| mission | — | — |

- **`difficulty` is on problems only.** A lesson's position is already fully described by its prerequisites; a difficulty alongside them is either redundant with prerequisite depth or in conflict with it, with no stated precedence. A problem has no prerequisite chain, so difficulty is the only handle for picking practice. *(Reopen if lessons need an "easy today" filter — but then prerequisites vs difficulty needs a precedence rule.)*
- **`topic` is a controlled vocabulary**: every value must name an existing `term` note, by filename; the build fails on an unknown one. This kills tag drift (`big-o` / `bigO` / `complexity` / `time-complexity`) and makes the topic index fall out of ticket 02's backlink graph rather than being built separately. Topics that are areas rather than vocabulary (e.g. "System Design") still get a `term` note, whose body is an area overview.
- **`prerequisites` point at filenames, not `id`s** — a prerequisite is a link (clickable, visible in Obsidian's graph, auto-rewritten on rename), not a progress record. A broken prerequisite surfaces at build time, so it does not need the stable id's protection.
- **Solutions and hints are body sections**, not frontmatter.
- **`draft: true`** is an opt-in flag rather than a `status` enum: a note in the vault is live unless it says otherwise.

### Identity and stability

Two identities — see [ADR 0001: Notes carry two identities](../../../docs/adr/0001-split-note-identity.md).

- **Filename = link identity.** Used by wikilinks, `topic`, and `prerequisites`; maintained by Obsidian on rename.
- **ULID in frontmatter = record identity.** Used by progress state only (review schedule, attempt history, quiz results, reading progress); written once at creation, never hand-edited, never referenced from inside another note.

ULID over the alternatives: an incrementing `0001` requires scanning the vault for the max and serialises batch authoring; a UUIDv4 is 36 characters of noise in a file the dev reads constantly; a `20260825-1432` timestamp collides when a skill run authors several notes in the same minute. ULID is the timestamp option without the collision, and still sorts by creation.

### Naming

**The `0001-` numeric prefix is dropped everywhere except `records/`.**

In `teach` it encoded sequence. Here order comes from prerequisites and identity comes from the frontmatter `id`, so the prefix carries neither meaning — while costing the thing the vault is for: `[[0007-big-o-notation]]` is what every wikilink to that lesson looks like, in every note, forever. Filenames are now user-facing prose.

Records are the exception: strictly chronological by nature, and never wikilink targets in running text. They stay `0001-<dash-case-name>.md`.

### Vocabulary

Terms captured in [CONTEXT.md](../../../CONTEXT.md).

### Surfaced by this ticket

Three build-failure rules were decided here in passing — unknown `topic`, duplicate filename across the vault, missing or hand-edited `id` — and nothing owns the full validation set. Raised as ticket 13.

## Amended by ticket 10

[How `/research` output lands in the vault](10-research-output-into-the-vault.md) overturns **"'research note' is not a type"**: `research` is a seventh type at `content/research/`, in the vault and never rendered, because this ticket's own type-is-the-directory rule and ticket 02's "Library content is exactly what the build renders" could not both hold while research output was a `reference`. Consequently `sources` moves off `reference` onto `research`, and the two-class split (Library / Learner state) becomes **Library / Workshop**, with Learner state the subset of Workshop about the dev.

## Amended by ticket 14

[Cheat sheet note type](14-cheat-sheet-note-type.md) adds the eighth type. With ticket 10's `research`, the two classes are now:

- **Library** (rendered, indexed): `lesson`, `reference`, `problem`, `term`, `cheat-sheet`
- **Workshop** (in the vault, never rendered): `research`, `record`, `mission` — of which `record` and `mission` are the learner-state subset

Directory layout gains `content/cheat-sheets/`, holding `<term>-cheat-sheet.md` — decorated because this ticket's own vault-wide filename uniqueness rule reserves the undecorated name for the `term` note that `topic` values resolve against. Frontmatter table gains one row: `cheat-sheet` requires `topic` and it is **scalar**, unlike every other type where `topic` is a list; `draft` optional.

This ticket's area-term sanction ("topics that are areas rather than vocabulary still get a `term` note, whose body is an area overview") survives as the deliberate carve-out to ticket 14's thin-Term rule: a topic with no Lessons has no cheat sheet, so its Term body is the only place an overview can live.
