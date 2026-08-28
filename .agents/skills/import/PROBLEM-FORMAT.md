# Problem format

`content/problems/<dash-case-name>.md`. A Problem is a note the dev can **attempt**, with
the answer out of their peripheral vision. One note is one problem.

Two things about it are unlike every other note type. Its **body is a contract** — named H2
headings the build folds the tree on — and it carries a **`kind`**, the only classification
in the vault that lives in frontmatter rather than in the path, because a Problem's *type*
is already the directory holding it.

## Filename

Dash-case, reader-facing prose, no numeric prefix: `content/problems/course-schedule-ii.md`.
The filename is what `[[course-schedule-ii]]` resolves against, and **filenames are unique
vault-wide, case-insensitively** — `attachments/` and `research/` included. A colliding stem
is a build error.

Derive it from the canonical title, not from a URL slug: the sites disagree with each other
about slugs, and the title is what identification keyed on anyway.

## Frontmatter

```yaml
---
id: <mint with `npm run ulid` — never typed, never copied from here>
title: Course Schedule II
kind: coding
difficulty: medium
topic:
  - graphs
practices:
  - topological-sort
source:
  - https://leetcode.com/problems/course-schedule-ii/
  - https://neetcode.io/problems/course-schedule-ii
---
```

| field        | required | shape                                                                      |
| ------------ | -------- | -------------------------------------------------------------------------- |
| `id`         | yes      | ULID, immutable, minted by running the command                             |
| `title`      | yes      | The canonical title, as the source writes it. Never used to resolve links. |
| `kind`       | yes      | `coding` \| `system-design` \| `behavioural`. **Declared, never inferred.** |
| `difficulty` | yes      | `easy` \| `medium` \| `hard`. The source's own label, lowercased.           |
| `topic`      | yes      | **List.** Every value is the filename stem of an existing `term`.          |
| `practices`  | yes      | **List.** Notes this Problem drills. **Unwritten targets are allowed.**    |
| `source`     | no       | **Ordered list of URLs.** First one is the attempt link.                   |
| `draft`      | never    | The dev's flag. This skill does not set it.                                |

- `kind` decides which sections the note must have, and bounds what its difficulty means —
  difficulties are compared **only within a kind**, so a hard behavioural question is not a
  hard graph problem. An unknown word in either field is an **error**.
- `topic` is **checked**: a value naming nothing, or naming something that is not a `term`,
  is an error. Mint the Term instead — [TERM-FORMAT.md](../author/TERM-FORMAT.md).
- `practices` is **required but satisfiable by an unwritten link**. That asymmetry is
  deliberate: it is what lets the problem bank run ahead of the Lessons, and unwritten
  targets there are the authoring queue ranking itself by inbound links.
- `source` is a **reader affordance, and nothing reads it** — not the build, not this skill.
  Its only job is to be clickable. The page renders each entry as a chip labelled by its
  host, derived from the URL, so **nothing is authored per link**; the first is marked
  *Attempt*. A `source` list present with **no** well-formed `http(s)` URL is an error: a
  problem the reader cannot reach is not a valid pointer.

Order the list attempt-first: the LeetCode page where the problem is solved interactively,
then the NeetCode page. Write a URL only where you actually recall the slug — a constructed
guess is a chip that goes nowhere, and the two sites rename each other's problems (LeetCode's
`two-sum` is NeetCode's `two-integer-sum`). One good URL beats two, one of which is wrong.

There is no `created` field anywhere in this vault. The ULID encodes the time.

## Body: the six named sections

`## Prompt`, `## Constraints`, `## Hints`, `## Solution`, `## Complexity`, `## Follow-ups`
— matched **by the words under the heading**, at depth two, in that order. An H2 the
contract has no name for renders as itself and is folded like any other section; an `###`
inside a solution is your own structure and is never folded.

| kind            | required sections                     |
| --------------- | ------------------------------------- |
| `coding`        | `Prompt`, `Solution`, `Complexity`    |
| `system-design` | `Prompt`, `Solution`                  |
| `behavioural`   | `Prompt`, `Solution`                  |

A missing required section is an **error**, and the page renders the sections that are
there. Everything not required is optional, so a bulk import that writes no hints is still
valid.

### `## Prompt` — what is asked, never how

One short paragraph, **in your own words**, stating what the caller is given and what they
must return. This is the section that makes the note self-describing in search and in the
topic index, and it is the section the original prompt never lands in.

**It renders unsealed.** An approach that leaks into it defeats the seal on `## Solution`
three headings later — the dev reads the prompt to attempt the problem, and *use a hash map
of complements* read there is the problem already solved. The test is mechanical: strike out
every sentence that names a data structure or a technique, and the prompt must still say
what is being asked.

> **The paraphrasing guard is structural.** There is no rule in the build for this, and
> there never will be: the source text is deliberately absent from the repo, so nothing
> exists to diff a paraphrase against. What keeps it honest is the shape of the work.
>
> - On the **recall path** there is no source text to copy from. The constraint is satisfied
>   by construction.
> - On the **paste path** the pasted prompt is a *working input*: never quoted, never stored,
>   never pasted into the note, and the note is written as though you had not seen it.
> - One line, in your own words, saying what is asked and never how, makes a reproduction
>   structurally impossible at that length.
>
> Never store the original prompt in the repo. The vault may go public, and the prompts are
> not the dev's to redistribute.

### `## Constraints`

Optional, and renders open — **the constraints are the problem**. A short list: input
bounds, value ranges, and the guarantees that make a solution correct (*exactly one answer
exists*, *the graph may be disconnected*).

Write them from recall, and only the ones the gate already made you state. A constraint you
are unsure of is worse than an absent one: it is what the dev will reason from.

### `## Hints`

Optional, renders open, and **marked**: a list, one rung per top-level item, climbing from a
nudge to a near-answer. Nested bullets under a rung are part of that rung.

Three rungs is usually right. The first names the question the brute force is really asking;
the last is one step short of the solution. A hint that gives the whole approach on rung one
is a spoiler in an unsealed section.

### `## Solution` — C#, always

**Sealed**, and the seal is markup rather than script, so it holds in search previews and
with JavaScript off.

- **Prose first, then code.** A paragraph or two saying what the approach *is* and why it
  works, then the implementation in a ```csharp fence. Code with no prose is a solution the
  dev can only read, not learn from.
- **C# is the vault's one solution language.** Not per-problem, not per-topic: cross-problem
  comparison only works in a single idiom. The repo being TypeScript is **irrelevant to this
  choice** — the build stack is a fact about the app, the solution language is a fact about
  the interviews being prepared for, and the two were kept apart deliberately.
- Write it as a **method on a solution class**, the way the source expects it, with the
  signature the problem specifies. Modern C# is fine — collection expressions, pattern
  matching, `TryGetValue` — but idiomatic beats clever.
- **Wikilink into the vault from the prose.** A solution is often the richest writing on a
  topic; `[[hash-map-lookup-cost]]` in it is a real graph edge. Link liberally, unwritten
  targets included.
- No quiz fences. A fence in `content/problems/` is an **error**: practice units never nest,
  and a mid-attempt MCQ would masquerade as the attempt.

### `## Complexity`

**Sealed**, and separately from the solution — reading the complexity of a solution you have
already read should not re-hide the solution.

Time and space, each with the sentence that earns it: *`O(n)` time — one pass, with a
constant-time lookup inside it*. Say what `n` is when there is more than one input. Where
the trade is the point of the problem, say what was bought with what.

### `## Follow-ups`

Optional, renders open — reading them before attempting sharpens the attempt rather than
spoiling it. Two or three questions a real interviewer asks next: what changes if the input
is sorted, streamed, distributed, or too large for memory.

## Behavioural problems are hand-authored, and that is a decision

**`import` does not write them, and this exclusion is stated here on purpose** — the silent
version reads as an oversight to anyone later wondering why the importer skips a kind the
build defines.

*Tell me about a time you disagreed with your manager* has an answer that is **the dev's own
story**. An agent-written one is not a weaker version of the right note; it is a fabricated
memory the dev would then rehearse. So the kind stays entirely with the dev, and what ships
for it is this template rather than a skill.

```markdown
---
id: <mint with `npm run ulid`>
title: A time you disagreed with your manager
kind: behavioural
difficulty: medium
topic:
  - behavioural
practices:
  - <a lesson, or a note not written yet>
---

## Prompt

What the interviewer asks, and — in a line — what they are actually probing for.

## Constraints

- The story has to be yours, and recent enough to answer follow-ups about.
- Two minutes spoken.

## Hints

1. Which story is this? Name it before rehearsing it.
2. Where is the tension, and what did *you* decide?
3. What was the outcome, and what would you do differently?

## Solution

The story, in your own words: situation, what you did, what happened, what you learned. Not
a script to recite — the beats to hit, so the telling stays yours.

## Follow-ups

- What did you learn, and what did you change afterwards?
- What if it had gone the other way?
```

`## Complexity` has no meaning here and the kind does not require it. Leave it out.

## When you are done

`npm run validate` must pass with **no hand-editing**. Unwritten-link warnings are expected
and healthy — a body wikilink to a note nobody has written yet is the authoring queue
filling up. Errors never are, and they are yours to fix.

An unwritten `practices` target raises nothing at all: validation only checks that a target
which *does* exist is Library content. It still earns its edge in the link graph, which is
where the ranking that makes it a queue comes from, so it is neither a defect nor silent —
it is backlog, and the Vault report is where it is read.
