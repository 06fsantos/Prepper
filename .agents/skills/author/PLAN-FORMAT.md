# Plan format

`content/plans/<dash-case-name>.md`. A **reading order** over notes that already exist: which
to read first, what each step is there for, where a language-specific stretch begins and ends,
and where the practice checkpoints are. The app opens on these — every Plan is a band across
the top of the entry page, above the topic cards — so this is the note that answers *where do
I start* ([ADR 0005](../../../docs/adr/0005-a-plan-is-a-note-type.md)).

## What a Plan is not

- **Not a curriculum.** It adds no ordering the vault does not already hold. `prerequisites`
  carries every ordering claim the corpus makes and it is a graph; a Plan is **one path
  through that graph**, and it says so in its own opening.
- **Not new material.** Take the links out and there is nothing left. If a step needs
  explaining at length, the explanation is a Lesson, and this run should have written it.
- **Not a course to complete.** Nothing is gated, numbered or remembered. The app stores no
  reading position and never will, so never write "you are now ready for" or "part 2 of 3".

The test before writing one: **is there enough written on these topics to order?** A topic
with two Lessons does not need a Plan; it needs a third Lesson. Plans are worth writing where
a cluster has grown past what a reader can survey in one look — roughly eight notes across two
or more topics.

## Frontmatter

```yaml
---
id: <mint with `npm run ulid`>
title: A reading order for API requests
topic:
  - httpclient
  - http-resilience
  - distributed-tracing
---
```

| field   | required | shape                                                              |
| ------- | -------- | ------------------------------------------------------------------ |
| `id`    | yes      | A new ULID.                                                        |
| `title` | yes      | Names the subject, not the note type's job. **Not** "Lesson plan". |
| `topic` | yes      | List. Every value names an existing Term — usually several.        |

`topic` is where a Plan differs from every other type in practice: it claims **all** the
topics it orders, because that is what puts it at the top of each of their cards. There are no
`prerequisites` on a Plan — it is not a step in anything.

## Body

No section contract; nothing in the build reads a Plan's headings. What earns its place:

1. **An opening that scopes it and disclaims sequence.** What the Plan covers, and the line
   that this is one path through `prerequisites` rather than a second source of truth — say
   plainly that where a note disagrees with the Plan, the note wins.
2. **The order, as a table.** One row per step: the number, the wikilink, and *why here* —
   the reason this step is at this point, which is the whole value a bare list does not have.
   Add a **Scope** column the moment any step is language-specific.
3. **What to look up rather than read.** The References beside the path that are not steps in
   it, and when to open them.
4. **Practice checkpoints.** Where a Problem belongs in the order, and what it drills.
5. **The language-specific half, stated plainly.** See below.
6. **The night before.** The Cheat sheets for the topics covered.

Every step is a **wikilink to an existing note**. An unwritten link in a Plan is a warning like
anywhere else, but it means something worse here — a reading order with a hole in it — so write
the Lesson or drop the step.

## Say what is language-specific, and what transfers

The vault's material is mostly .NET-scoped, and a Plan is where that is made explicit rather
than left for the reader to infer from a code fence. Two devices, and use both:

- **A Scope column** in the order table, marking each step `.NET` or `Concept`.
- **A closing section** — "The .NET-specific half, stated plainly" — that names which steps
  are about a runtime rather than about the subject, says how many of them there are, and
  gives a table of what the transferable ideas look like elsewhere. Name real equivalents in
  real ecosystems; never narrow the answer to the stack the vault happens to be written in.

Being wrong about another ecosystem is worse than saying less about it. Two accurate rows beat
six confident ones.

## Updating a Plan

A Plan goes stale the way a cheat sheet does — it is a claim about what exists — so **rewrite
it, do not append.** A new Lesson on a topic a Plan covers is a reason to re-read the Plan and
decide where the Lesson goes, or whether it displaces a step. A Plan that only ever grows is a
Plan nobody will read to the end.
