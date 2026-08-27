# Cheat sheet format

`content/cheat-sheets/<term>-cheat-sheet.md`. **Exactly one per topic that has Lessons.**
The night-before document: the 20% of a topic that buys 80% of the understanding.

The filename is decorated because the undecorated name belongs to the Term that `topic`
resolves against, and filenames are unique vault-wide. The topic leads the name so the
sheets sort next to their subject.

## Frontmatter

```yaml
---
id: <mint with `npm run ulid`>
title: Hash maps — cheat sheet
topic: hash-maps
---
```

| field   | required | shape                                                       |
| ------- | -------- | ----------------------------------------------------------- |
| `id`    | yes      | ULID, immutable, minted by running the command              |
| `title` | yes      | `<Term> — cheat sheet`.                                     |
| `topic` | yes      | **Scalar, not a list.** One value, naming an existing Term. |
| `draft` | never    | Not this skill's to set.                                    |

**The scalar `topic` is load-bearing.** It is what makes "one cheat sheet per topic" a
checkable property; a list-valued `topic` here is a build error, and it is the exact mistake
someone makes by copying a Lesson's frontmatter. Two sheets claiming one topic is also an
error, reported vault-wide because neither of them is the culprit.

## Body

Free-form — nothing in the build keys off its headings, unlike a Problem's sealed sections.
In practice: a tight list of the facts that get recalled under pressure, then a line or two
of the reach-for-it signal, then a link to the fullest Lesson.

```md
- Lookup, insert, delete: `O(1)` average, `O(n)` worst case when every key collides.
- Insert is `O(1)` **amortised** — resizes rehash everything and cost `O(n)`, rarely.
- Load factor = entries ÷ buckets. Crossing the threshold triggers the resize.

The reach-for-it signal: a nested loop whose inner half is a search.

Full treatment: [[hash-map-lookup-cost]].
```

**No quiz blocks.** Nothing in the build forbids one, and hand-adding one later breaks
nothing — but a question is friction on the note you opened to get an answer fast, and this
skill does not author them here.

## The durable-20% test, and why it lives here

This sheet is **created with the first Lesson on its topic and rewritten in the same run as
every Lesson after**. That is the moment it would otherwise accrete, so it is the moment the
discipline has to bite — which is why the discipline is in this file rather than in the
validator. A word count is an arbitrary number pretending to be a structural fact, and the
build's two severities are for facts.

**Rewrite it. Never append to it.** Each update re-derives the sheet from what is now known,
which is a different act from adding a bullet per Lesson. Then check:

- **Would the dev read this, whole, in ten minutes the night before an interview?** If not,
  it has stopped being the 20%.
- **Did it get longer because the topic got deeper, or because a Lesson got written?** Only
  the first is a reason to grow. A new Lesson on a topic frequently means the sheet gets
  *sharper* and no longer.
- **Is anything here a detail rather than a lever?** Load factor is a lever; .NET's exact
  growth policy is a detail, and it belongs in the Lesson or a Reference.
- **Is anything here duplicated from a Reference?** Then link the Reference.

A topic with no Lessons has no cheat sheet, and that is correct — a Term can legitimately
carry only Problems, or exist only to be linked. The build warns once a topic has **two**
Lessons and nothing summarising it, which is the drift floor, not the target: writing the
sheet with the first Lesson means the warning never fires.
