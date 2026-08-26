# Cheat sheet note type

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: —

## Question

How is a `cheat-sheet` note structured, and what happens to the term note now that it is no longer the substantial page for a topic?

[Wikilink resolution and backlink graph rules](02-wikilink-resolution-and-backlink-graph.md) established the type and its purpose: one topic condensed to the 20% of the information that gives 80% of the understanding, for quick reading. At most one per topic, never required. The **term note stays the canonical topic node** — `topic` values resolve to term filenames, and the generated topic index renders on the term page — with the cheat sheet linked from it first.

This is an **amendment to [Vault structure and note schema](01-vault-structure-and-note-schema.md)**, which is closed and specified six types. That ticket's directory layout, frontmatter table, and Library/learner-state split all need updating with the outcome here.

To resolve:

- **Directory and naming.** A seventh directory (`cheat-sheets/`) follows ticket 01's type-is-the-path rule. But filenames are unique vault-wide, so a cheat sheet for `arrays` cannot be `arrays.md` — the term note owns that name. What is the convention, and does it read well as a wikilink target, which is the reason ticket 01 dropped numeric prefixes?
- **Frontmatter.** Presumably `topic` (required, and the field that enforces at-most-one-per-topic). Anything else? Does it carry `sources`, `prerequisites`, `draft`?
- **Two pages per topic.** Now that the cheat sheet holds the condensed content, what is left in the term note body? A thin definition plus the generated index, or does it stay substantial and risk duplicating the cheat sheet? This is the real cost of keeping `topic` resolution unchanged, and it needs an answer rather than drift.
- **Reviewability.** Ticket 01 made `reference` and `term` non-reviewable. A cheat sheet is quick-read reference material, which suggests the same — but it is also the densest statement of a topic, which is exactly what retrieval practice wants. Can it carry quiz blocks?
- **Relation to `reference`.** Both are looked up rather than read through. The type earns its place only if the boundary is crisp: a cheat sheet is scoped to exactly one topic and there is at most one; a reference is arbitrarily scoped and unlimited. Confirm that holds, or collapse the type back into `reference`.

## Input from ticket 05

[Spaced-repetition model](05-spaced-repetition-model.md) removed the scheduler, and the dev
named **cheat sheets as the quick-catchup tool** they actually reach for when revisiting a
topic. That raises this type's importance and adds two things to resolve:

- **Cheat sheets get a top-level sidebar entry** listing all of them, taking the chrome slot
  the review-queue badge vacated — in addition to being pinned first inside each topic.
- **Reviewability is no longer a question.** Nothing is reviewable; the bullet above asking
  whether a cheat sheet can carry quiz blocks is now only "can it carry quiz blocks", which
  is a rendering and authoring question, not a scheduling one.

## Answer

### The type survives; the boundary with `reference` is now three axes, not one

`cheat-sheet` stays a distinct type. When ticket 02 raised the question the only distinction was cardinality, which is thin. [Ticket 10](10-research-output-into-the-vault.md) changed what `reference` *is* and widened the gap:

| | cheat sheet | reference |
|---|---|---|
| **provenance** | distils the dev's own Lessons | distils a Research note |
| **cardinality** | exactly one per topic-with-lessons | unlimited, arbitrarily scoped |
| **authored by** | `author` lesson-mode, as a side effect of every run | `author reference <research note>`, a deliberate promotion |

Collapsing them would produce a `reference` carrying two disjoint rulebooks — one subtype uniquely constrained to one-per-topic and uniquely auto-updated by a different skill mode. That is a type in all but name.

### Directory and naming

`content/cheat-sheets/<term>-cheat-sheet.md` — a seventh directory, following ticket 01's type-is-the-path rule.

The name is **decorated because it has to be**: filenames are unique vault-wide, and `terms/arrays.md` owns the undecorated name — it must, since `topic` values resolve to term filenames. Suffix over prefix, because ticket 01 dropped numeric prefixes precisely so filenames read as prose: `[[arrays-cheat-sheet]]` reads as a phrase and puts the topic where the eye and Obsidian's autocomplete both land first, while `[[cheat-sheet-arrays]]` reads as a filing code. No abbreviation (`-cs`) — unreadable in a body link. `title: "Arrays — Cheat Sheet"`.

### Frontmatter

| type | required | optional |
|---|---|---|
| cheat-sheet | `topic` (**scalar**) | `draft` |

- **`topic` is scalar here, and that is the enforcement mechanism.** Everywhere else `topic` is a list, because notes are many-to-many with topics. A cheat sheet is by definition about exactly one, and the scalar shape is what makes ticket 02's "two cheat sheets claiming one topic" checkable. A list of one is not the same thing, and the validator says so.
- **No `sources`** — ticket 10 moved it onto `research`.
- **No `prerequisites`** — a lookup, not a read-in-an-order; `reference` and `term` carry none either.

### Two pages per topic: the term note becomes a thin hub

The Term note keeps a **one-or-two-sentence definition, then the generated topic index**, cheat sheet pinned first. It answers *"what is here?"*; the cheat sheet answers *"remind me how this works"*. Any overview prose long enough to be worth reading is cheat-sheet content that landed in the wrong file.

One carve-out: ticket 01's **area terms** ("System Design") — a topic with no Lessons has no cheat sheet, so its Term body is the only place an overview can live, and there is nothing to duplicate.

Rejected: rendering the cheat sheet inline on the term page when one exists. It makes the term page a lie about which note you are reading and breaks one-note-one-page.

**A Term note's body may be empty, silently.** No rule. `author` mints Terms mandatorily the moment a topic is first used (ticket 09), *ahead* of anyone having something to say about them — so a warning would fire on every correctly-created Term until backfilled, i.e. noise by construction. Ticket 13 settled that things wanting an `info` level are reports, not rules; the empty-Term backlog belongs on the authoring-feedback surface with the unwritten-notes report.

### Body: free-form, no build contract

No named-heading contract. Ticket 06 gave Problems named H2s because the *build* keys off them — `## Solution` and `## Complexity` are sealed. Nothing on a cheat sheet is sealed or structurally rendered, and a heading contract the build never reads is a rule that can only be violated, never enforced.

The **durable-20% discipline is advisory**, carried in ticket 09's `CHEAT-SHEET-FORMAT.md`. It is not a validation rule: a word count is an arbitrary number pretending to be a structural fact, and ticket 13's severities are for facts. It bites where it matters anyway — `author` updates the cheat sheet on *every* subsequent Lesson, which is exactly the moment it would otherwise accrete, and the format doc is what that run reads.

### Quiz blocks: allowed, not authored by default

No build rule banning them. Ticket 06's ban in `problems/` came from a real structural principle (practice units never nest) with no equivalent here, so a rule would be arbitrary. But `CHEAT-SHEET-FORMAT.md` tells `author` not to emit them: quiz blocks belong in the Lesson that taught the thing, and a question is friction on the note you opened to get an answer fast. Hand-adding one later breaks nothing.

### Chrome: the slot the review queue vacated

A flat **"Cheat sheets" list, alphabetical by topic, above the topic tree** in the sidebar — plus the existing pin-first inside each topic (ticket 04). Deliberately two routes to the same note: one for browsing, one for direct access.

Alphabetical, not by recency: the entry exists for muscle memory — you open it already knowing which topic you want — and a list that reorders under you defeats that. Recency also has nothing honest to sort on, since ticket 05 left no per-user state; it would sort on authoring date, which answers "what did I write last", not "what do I need".

### Rules for ticket 13

Appended to [Vault validation rules](13-vault-validation-rules.md):

- `cheat-sheet` frontmatter row: `topic` required and **scalar**; a list-valued `topic` on a cheat sheet is an **error**, even a list of one.
- A topic that has Lessons but no cheat sheet is a **warning**. Not an error — ticket 09 settled that a Term may legitimately carry only Problems or exist only to be linked. Not silent — `author` maintains this invariant on every run, so absence means drift (a hand-authored Lesson, a deleted file, a renamed Term), and drift never seen is drift never fixed.
- (Ticket 02's "two cheat sheets claiming one topic → error" is now mechanically checkable via the scalar `topic`.)

### Amends ticket 01

[Vault structure and note schema](01-vault-structure-and-note-schema.md) specified six types and a six-row frontmatter table. With ticket 10's `research` and this ticket's `cheat-sheet` it is **eight**: Library = `lesson`, `reference`, `problem`, `term`, `cheat-sheet`; Workshop = `research`, `record`, `mission`. Directory layout gains `cheat-sheets/`.

### No required outbound links

`topic` already yields the typed *about* edge, so the Term is reachable from a cheat sheet as rendered chrome rather than body prose. Requiring links to the Lessons it distils would be a rule `author` satisfies trivially and a human would resent; the Lesson's backlinks panel already surfaces the cheat sheet where a link happens to exist. The format doc suggests linking a Lesson where it is natural; the build does not check.
