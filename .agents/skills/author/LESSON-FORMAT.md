# Lesson format

`content/lessons/<dash-case-name>.md`. A Lesson teaches **one tightly-scoped thing** tied to
the mission, and is read roughly once. It is the primary unit of authoring, and the only
note type that carries quiz blocks.

## Frontmatter

```yaml
---
id: <mint with `npm run ulid` — never typed, never copied from here>
title: What a hash map lookup actually costs
topic:
  - hash-maps
prerequisites:
  - big-o-notation-basics
---
```

| field           | required | shape                                                             |
| --------------- | -------- | ----------------------------------------------------------------- |
| `id`            | yes      | ULID, immutable, minted by running `npm run ulid`                 |
| `title`         | yes      | A sentence-shaped title. Never used for link resolution.          |
| `topic`         | yes      | **List.** Every value is the filename stem of an existing `term`. |
| `prerequisites` | no       | List of filename stems of notes **that already exist**.           |
| `draft`         | never    | The dev's flag. This skill does not set it.                       |

- `topic` and `prerequisites` are **checked, not merely resolved** — a value naming nothing,
  or naming the wrong class of note, is a build error. `topic` must name a `term`;
  `prerequisites` must name Library content.
- `title` is prose for the reader. Links resolve against the **filename**, so
  `[[hash-map-lookup-cost]]` and never `[[What a hash map lookup actually costs]]`.

## Body

Prose, with quiz blocks interleaved. Some rules that are not obvious:

- **Never presume the reader arrived from another Lesson.** No "last time", no "in the
  previous lesson", no "lesson 3". They may have arrived from a backlink, from search, or
  from the topic index. Whatever ordering the Lesson depends on is a `prerequisites` entry,
  and the reading surface renders it as a *Read first* block above the prose.
- **Link liberally with wikilinks**, including to notes that do not exist yet — that is how
  the authoring queue fills. `[[note]]`, `[[note|display text]]`, `[[note#Heading]]`.
- **Cite inline, externally.** `[the .NET docs](https://learn.microsoft.com/…)`. Never make a
  note out of a source; add it to `RESOURCES.md` at the repo root instead. Recommend one
  primary source worth reading in full.
- **Never link or embed a Workshop note** (`content/research/`, `content/records/`,
  `MISSION.md`). An embed is an error; a link is a warning the reader cannot follow. Promote
  or paraphrase instead — see the Workshop boundary in [SKILL.md](./SKILL.md).
- **Diagrams are images** in `content/attachments/`, embedded `![[name.png]]`. There is no
  other interactive or visual primitive.
- Keep it short enough to finish in one sitting. One tangible win.

## Quiz blocks

The vault's only interactive primitive. **Two to four per Lesson, interleaved with the
prose** rather than gathered at the end — this is retrieval practice, not a final exam.

The infostring is `quiz`, a ULID, and optionally a type word:

````
```quiz <ULID> [cloze|recall]
````

The type is **explicit and never inferred from the body**; omitting it means `mcq`. The ULID
is minted by the same `npm run ulid` run as the note's — note `id`s and quiz ULIDs share one
namespace, so a duplicate anywhere is an error. If a quiz body needs a fence of its own, make
the outer fence `~~~~quiz`.

A quiz fence is legal **only in a Lesson**. One in `content/problems/` is a build error —
practice units never nest. Cheat sheets and References take none by convention: a question is
friction on a note you opened to get an answer fast.

### MCQ (the default)

Prose prompt, a GFM task list of options, and a blockquote nested under the option it
explains.

````
```quiz <ULID>
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Constant time, one scan
  > Nothing is scanned unless buckets collide. See [[hash-maps]].
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```
````

- **Exactly one `[x]`**, and it is a build error otherwise. Single-select, because feedback
  is immediate on click.
- Clicking reveals the explanation on the clicked option *and* on the correct one; the rest
  stay closed. So **every option earns an explanation**, not just the right one — a wrong
  answer is where the teaching actually happens.
- Keep the options the **same length**, in words and ideally in characters. Formatting is a
  clue, and a clue costs you the retrieval. This is advisory: nothing in the build checks it,
  which is precisely why it has to be checked here.
- A wikilink inside an explanation is a real graph edge. Use them.

### Cloze

`{{spans}}`, any number, all revealed together, graded once.

````
```quiz <ULID> cloze
A hash map trades {{memory}} for lookup speed, and degrades to {{O(n)}} when every key
lands in one bucket.
```
````

### Free recall

Prompt, reveal, self-graded — the only type the app cannot grade, and the most demanding
retrieval there is.

````
```quiz <ULID> recall
Explain why an insert is O(1) amortised rather than O(1).

> Crossing the load factor triggers a resize that rehashes every entry, which is O(n). It
> happens rarely enough that the cost spread over all inserts stays constant.
```
````

Answering records nothing, anywhere. There is no scheduler, no progress, no history — the
ULIDs exist so that a scheduler *could* be built later, not because one is watching.

## When you are done

`npm run validate` must pass with no hand-editing. Unwritten-link warnings are expected and
healthy; errors are yours to fix.
