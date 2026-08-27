# Reference format

`content/references/<dash-case-name>.md`. Lookup material with no compression story: a syntax
table, an API surface, an algorithm listing, a complexity table. **Looked up repeatedly**,
where a Lesson is read roughly once.

A Reference is written **only by `/author reference <path to a research note>`**, and that is
the deliberate promotion step that turns an investigation into reader-facing material.

## Why the input is a research note and not a topic

Because asking this skill to guess *which* investigation is relevant to a topic is exactly
the inference that produces a confidently wrong distillation. The dev names the note. And
because this skill is the only thing in the pipeline that mints ULIDs and knows the
Term/cheat-sheet/Reference picking rule, a hand-written Reference would mean a hand-minted
identity — which is the one habit the whole identity design exists to prevent.

## Frontmatter

```yaml
---
id: <mint with `npm run ulid`>
title: C# collections for interviews
topic:
  - hash-maps
---
```

| field   | required | shape                                              |
| ------- | -------- | -------------------------------------------------- |
| `id`    | yes      | A **new** ULID. Never reuse the Research note's.   |
| `title` | yes      | What the reader is looking up.                     |
| `topic` | yes      | List. Every value names an existing Term.          |

**There is no `sources` field on a Reference.** It lives on the Research note, where "when
did I look into this, and against what" is the thing that matters. On a Reference it
duplicated the inline citations with nothing rendering it, and a field nothing reads rots.

## The promotion rule

When a Lesson needs material that currently sits in a Research note, there are two moves and
no third:

- **Promote** — when the material is **looked up repeatedly and stands on its own**: a
  table, an API surface, a comparison, a listing. The Lesson then links to the Reference.
- **Write it into the Lesson**, in the Lesson's own words, when it **only supports the
  argument that Lesson is making**.

That is the vault's existing Lesson/Reference boundary read once more, so it adds no concept:
*read roughly once* versus *looked up repeatedly*.

## What promotion does, and does not, do

- **Whole-note.** Fragment promotion is not built. `/author reference` takes one Research
  note and produces one Reference. If only a fragment is worth promoting, that fragment is
  material to write into the Lesson instead.
- **The Research note stays exactly where it is.** Never delete it, never trim it, never mark
  it superseded. A Reference supersedes it *for the reader* — not for the sources, the dead
  ends, and the options that were ruled out, which are the parts of an investigation that
  are worth the most six months later and that no Reference will ever carry. The reader never
  sees `content/research/`, so the only cost of keeping it is Obsidian clutter, and the
  directory already contains that.
- **The Reference is a rewrite, not a copy.** Drop the narrative — the question, what was
  tried, what was ruled out — and keep the lookup. Carry the inline citations across; do not
  carry the `sources` field.
- **The Lesson links to the Reference, never to the Research note.** A Library→Workshop link
  is a warning the reader cannot follow, and an embed is an error. Promotion exists so that
  neither is ever necessary.

## Body

Whatever makes it fast to look something up — tables are usual — followed by the two or three
things that actually cost people points. Inline external citations, `RESOURCES.md` for the
ledger, **no source ever becomes a note**. No quiz blocks: this is the note you opened to get
an answer.
