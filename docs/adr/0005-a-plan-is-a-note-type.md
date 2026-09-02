# A reading order is a note type, not a flagged Reference

The vault holds notes that say **where to start**: an ordered path through the Lessons,
References and Problems already written on a cluster of topics, with the language-specific
stretches marked as such. The first two were written into `content/references/`, because a
reading order is looked up repeatedly and a Reference is the type for that.

That was wrong in one specific way, and it is the way that decides this: a Reference has no
place of its own on screen. It renders in the `References` column of each topic's card, between
the material it orders and the material it excludes, which is exactly where a reader who does
not yet know where to start will not look. Giving it a place required the build to be able to
**recognise** one, and the whole of this decision is how.

`content/plans/` is a ninth note type, `plan`, and the sixth Library one.

## Considered options

- **A ninth note type, `content/plans/`.** Chosen. **Type is the directory** (`CONTEXT.md`,
  `prepper/note-type.ts`), so recognising a Plan costs the build nothing and names nothing: no
  slug, no filename pattern, no frontmatter word. The next Plan is treated as one by being
  filed there, which is the same promise every other type makes.
- **A Reference carrying a frontmatter flag** — `plan: true`, or a `kind:` beside it. Rejected.
  It is a type field in all but name, and the vault's one hard rule about type is that there is
  no field for a note to disagree with its own path about. A `plan: true` in `content/lessons/`
  would have had to mean something, and nothing good.
- **A naming convention** — `reading-order-*`. Rejected outright: filenames are link identity
  ([ADR 0001](0001-split-note-identity.md)) and a rename is Obsidian's business. A build that
  reads behaviour out of a filename breaks silently the first time one is renamed for prose
  reasons, which is the reason renaming is meant to be free.
- **Leave them as References and pin the two by slug** on the entry page. Rejected for the
  same reason as the last, plus the obvious one: the third reading order would not appear.

## A Plan asserts no sequence

This is the objection worth answering, because the vault is deliberately built without one.
`prerequisites` carries **every ordering claim the corpus makes** and it is a graph; there are
no lesson numbers, no next/previous, no progress bar, and no stored position in anything.

A Plan does not reopen that. It is **one path through the graph, written in prose**, and each
one says so in its own opening and says the note wins where the two disagree. Nothing about it
is enforced, gated or remembered: a Plan is a page, its steps are ordinary links, and closing
it costs the reader nothing because there was nothing to lose. What it adds over the
`prerequisites` field is what a field cannot hold — *why* a step is where it is, and where a
`.NET`-scoped stretch begins and ends.

## It spans topics, so it renders twice

A Plan claims several topics on purpose: a reading order for API requests is about the client,
the resilience patterns and the tracing at once. That single fact settles both placements.

- **A band above the cards on the entry page**, from `plans()` — a flat list keyed by type
  rather than by topic, the exact sibling of the Cheat sheets list in the rail. "Where do I
  start" is asked *before* a topic has been chosen, and one Plan rendered per topic it covers
  would have appeared three times in a grid the reader has not begun to read.
- **The first group inside each of its topics' cards**, pinned above the Cheat sheet in
  `groupOrder`. A reader who arrived at "HTTP resilience" from a search result still has to be
  told a reading order exists.

The repetition is deliberate and it is not new: a Cheat sheet is already in both a topic's card
and the rail's flat list. The alternative — leaving `plan` out of `groupOrder` so it renders
only in the band — is the one arrangement to avoid, because those entries are what
`groupsUnder` keeps and everything else is dropped: every Plan would be reachable from exactly
one page in the app, which is the silent disappearance `prepper/note-type.ts` spends a
compile-time check preventing.

## Consequences

- `NoteType` has nine members and `libraryTypes` six. The compile-time split in
  `prepper/note-type.ts` forced every consumer to be finished: required fields
  (`topic`, like a Reference), the article for a violation message, the search chip.
- A Plan is a page, a graph node, and a row in search like any other Library note. Its body
  links are ordinary links, so a step naming a note nobody has written yet is the same
  `unwritten-link` **warning** it would be anywhere else — the authoring queue, filling up.
- `/author` gains a fifth thing it can write, against `PLAN-FORMAT.md`. It is the one mode
  that authors **no new material**: a Plan orders notes that already exist, so a run that
  wanted to write one for a topic with two Lessons is a run that should have written the third.
- Nothing tracks a reader's position in a Plan, and nothing may. The app stores two
  `localStorage` keys, both about furniture ([ADR 0004](0004-a-persistent-top-bar-and-the-retired-right-column.md));
  a third holding "step 4 of 9" would be the reading progress this app has never kept.
