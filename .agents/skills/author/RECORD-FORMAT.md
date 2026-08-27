# Record format

`content/records/<NNNN>-<dash-case-name>.md`, numbered from `0001`. Records are the teaching
equivalent of an ADR: they capture non-obvious insights and stated prior knowledge that steer
what gets authored next. They are **the primary input to the ZPD decision**.

A Record is a Workshop note — in the vault, open in Obsidian, never rendered. `records/` is
the **only** directory where the numeric prefix survives; every other filename in the vault
is undecorated prose, because everywhere else the number was a reading order that no longer
exists.

## Frontmatter

```yaml
---
id: <mint with `npm run ulid`>
title: First pass on complexity and hash maps
date: 2026-08-26
topic:
  - big-o-notation
  - hash-maps
---
```

| field   | required | shape                                                  |
| ------- | -------- | ------------------------------------------------------ |
| `id`    | yes      | ULID, minted by running the command                    |
| `title` | yes      | What was learned or established.                       |
| `date`  | yes      | `YYYY-MM-DD`. When it happened, not when it was filed. |
| `topic` | no       | List. Every value names an existing Term.              |

Scan `content/records/` for the highest number and increment. The `date` is required and the
number is not the date: the ordering is the sequence of insights, and two can land in one day.

## Body

One to three paragraphs. What was learned, and why it changes what to author next. That is
the whole format — the value is recording *that* this is now known, not filling in sections.
Wikilink the notes involved.

A useful shape, from the vault's own first record: what actually stuck, what did not, and the
one thing to drill next.

## When to write one

- **The dev demonstrated genuine understanding of something non-trivial** — evidence they can
  use the concept, not merely that they saw it. This raises the floor for the next Lesson.
- **The dev disclosed prior knowledge.** Record the depth claimed, so nothing re-teaches it.
- **A misconception was corrected.** The highest-value kind: it predicts where they will
  stumble on adjacent topics.
- **The mission shifted.** Cross-link `[[MISSION.md]]` and update it, with confirmation.

## When not to

- **Material that was merely covered.** Coverage is not learning; wait for evidence.
- **A definition.** That is a Term.
- **A session log.** Records are decision-grade insight, not a journal. A vault of activity
  logs makes the ZPD decision harder rather than easier, because the signal is buried in the
  record of every session that produced none.

When a later Record contradicts an earlier one, say so in the new one and leave the old one
standing. How the understanding moved is itself the signal.
