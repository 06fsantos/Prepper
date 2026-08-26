---
status: accepted
---

# Notes carry two identities: filename for links, frontmatter `id` for progress

`content/` is a real Obsidian vault, so `[[wikilinks]]` must resolve by filename — that is Obsidian's rule and Obsidian rewrites links across the vault on rename. But the spaced-repetition schedule and attempt history also need to point at notes, and if they point at filenames a rename silently destroys the review history for that material.

We therefore give every note **two** identities, each doing the job it is good at: the **filename** is the link identity (used by wikilinks, `topic`, and `prerequisites`, maintained by Obsidian on rename), and an immutable **ULID in frontmatter** is the record identity (used by progress state only, written once at creation, never hand-edited, and never referenced from inside another note).

## Considered options

- **Filename only** — the Obsidian-native choice, rejected because renaming a lesson orphans its review schedule with no error.
- **Frontmatter `id` only** — rename-proof, rejected because it breaks wikilink resolution and the vault stops working in Obsidian, which is most of the point.
- **Content-derived hash** — stable against renames but not against edits, which is exactly backwards for this use.

## Consequences

- The `id` is redundant from Obsidian's point of view and means nothing there. It must be generated at authoring time by whatever writes the note (the forked `teach` and `research` skills), never typed by hand.
- Filenames must be unique across the entire vault, including `attachments/`, or `[[name]]` is ambiguous across type directories.
- A broken `prerequisites` or `topic` pointer surfaces at build time; a broken progress pointer would not, which is why progress is the side that gets the stable id.

## Amendment — the schedule this protected no longer exists

[Ticket 05](../../.scratch/prepper/issues/05-spaced-repetition-model.md) removed spaced
repetition from scope: the app stores no per-user state, so there is no progress state and
no review schedule for a rename to orphan.

**The decision stands, on a narrower rationale.** The `id` is now a *future-proofing*
anchor, not a live record key: it keeps the vault scheduler-ready, so spaced repetition can
return as its own effort without having to retro-identify every note and quiz block. Adding
stable ids later to content authored without them is the expensive direction; carrying an
unused frontmatter field is nearly free.

The consequences above are unchanged, except that "progress state" currently has no reader.
