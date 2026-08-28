---
name: import
description: Import externally-sourced interview problems into the Prepper vault as Markdown Problem notes.
disable-model-invocation: true
argument-hint: "<a list of problems — titles, or titles and URLs>"
---

The dev has handed you a list and asked for it in the vault. Your output is **Markdown notes
in `content/problems/`** — frontmatter, named H2 sections, wikilinks — that Obsidian opens
and the build renders. There is no export step and no second copy.

The name is the honest one. This **imports prompts that exist elsewhere; it does not compose
them.** The standing rule is narrow, and worth stating before anything else:

> **You may not invent a problem. You may author a solution to a real, externally-sourced
> one.**

> **This skill is first-party repo content, not a vendored skill.** It sits beside `author`
> and the vendored skills in `.agents/skills/`, which are pinned by content hash in
> `skills-lock.json`. Never edit a vendored skill to change anything here: a re-sync of
> `mattpocock/skills` clobbers the edit, and the divergence is silent until it does.

## Why this is not a mode of `author`

`author` is roughly 60% inherited teaching philosophy — fluency versus storage strength, the
zone of proximal development, knowledge versus skills versus wisdom. **None of it fires
here.** There is no zone of proximal development in *add these fifteen problems*. A mode
would be one skill whose two halves shared a directory and no reasoning.

What the two do share is vault mechanics, and those live in the FORMAT docs: every ULID
minted by running a command, frontmatter shape, mandatory Term minting, and **never setting
`draft`**. `import` ships [PROBLEM-FORMAT.md](./PROBLEM-FORMAT.md) and reuses `author`'s
[TERM-FORMAT.md](../author/TERM-FORMAT.md) unchanged.

`author` never writes a Problem, and this skill never writes a Lesson, a Reference, or a
cheat sheet. The only note it writes outside `content/problems/` is a Term stub.

## Modes

```
/import <a list of problems>        # the batch: titles, or titles and URLs, one per line
/import <one problem>               # the same loop, with a list of one
```

There is one mode because there is one act. Behavioural problems are **not** in it — see
below.

## What a batch is

The realistic invocation is *add these fifteen*, never *add this one*. So the shape is a
list, and the loop writes **one note at a time, saving each before starting the next**.

That is what makes a run **resumable and safe to re-run**: interrupted after item nine, the
nine are on disk and correct, and re-running the same list writes the remaining six and
reports the nine as skipped. A hand-assembled list will be re-pasted; assume it.

**Never batch the writes.** Do not gather fifteen notes and emit them at the end — an
interruption then loses all of it, and a duplicate check made against the vault as it was at
the start of the run is stale by item two.

## The duplicate check, before every single item

Before writing anything for an item, check the Problems already in `content/problems/`:

1. **Any URL in common** with the item's `source` list. `source` is a list, so this is set
   intersection rather than equality — one shared URL is a match even when the others
   differ.
2. Failing that, **the title**, compared case-insensitively and ignoring surrounding
   punctuation.

A match means **skip it and record it**. Never overwrite, never merge, never "update" an
existing Problem: a silent overwrite destroys a solution the dev may have hand-corrected,
and that loss is invisible in a fifteen-note diff. Never halt the batch either — fifteen
problems are not punished for one repeat.

Report the skips together at the end, by title and by what matched:

```
Skipped 2 already in the vault:
  Two Sum          — source URL already on problems/two-sum.md
  Valid Anagram    — title already on problems/valid-anagram.md
```

## Acquisition: recall only, and nothing is fetched

You work from **what you already know about each named problem**. The `source` URLs are for
the dev to click; **you never read them.**

**Nothing is fetched during a run.** Not the LeetCode page, not the NeetCode page, not a
mirror, not a search result. This is settled and recorded, so that nobody re-proposes it on
finding the skill in the directory:

- `leetcode.com` returns **403** to a plain fetch — Cloudflare in front of the site, with
  the content behind a GraphQL endpoint wanting a POST and a session cookie.
- `neetcode.io` returns an **empty client-rendered shell** to a fetch; there is no prompt
  text in the response at all.
- That leaves browsing only in its expensive form, driving the dev's logged-in Chrome, which
  was **considered and declined**: it needs the dev present and per-site permissioned, which
  converts an unattended batch back into an attended session; it fails *mid-run* on a modal
  or a rate limit, with eight notes already written; and it makes the verbatim copyrighted
  prompt your routine working material on every item.

### The corpus is the NeetCode canon, and that is not a detail

Recall's failure mode is **silent** — the right title with drifted constraints, a variant
conflated with the original, rendered as a confident, well-formatted, wrong note. Recall is
only defensible over a corpus where recall is reliable, and the canon is that corpus: the
densely-attested head of the distribution, every item carrying editorials, videos and
hundreds of public solutions. You are reproducing a published solution, not inventing one.

**Corpus scope and acquisition method are one decision.** Widening the list — a contest
problem, a company-specific set, a blog's invention — invalidates the method, and is not a
content call to be made in passing while working down a list.

## The gate: two tests, before you write a line

Both are cheap, and both run per item.

1. **On-list is above the line; off-list is presumed below.** A problem on the NeetCode
   150/250 is trusted. Anything else is presumed unrecallable *however confident it feels*.
2. **Constraints and one worked example, from recall.** State the problem's constraints and
   at least one concrete input → expected output before writing the note. If you cannot, or
   the example you produce contradicts the constraints you just stated, the item **fails**.

Test 2 stands beside test 1 rather than being replaced by it, because the two guard
different things. Widely-published solutions make the **solution** reliable; they do nothing
for **identification**, and the two come apart — you can be entirely right about the
canonical solution to *Course Schedule* while the list item was *Course Schedule II*. A
worked example is where a conflated variant contradicts itself. The gate also stands in
front of the writing for a second reason: an item you cannot produce a worked example for is
one whose `## Solution` and `## Complexity` you cannot write either.

**Identification keys on the canonical title**, never on the URL. **Restate the title you
resolved** for each item as you write it, so a misidentification is visible in the run log
during the run rather than only in the diff afterwards:

```
9/15  "course schedule 2" → Course Schedule II — on canon, example checks — problems/course-schedule-ii.md
```

## Failures defer; you ask once, at the end

An item that fails either test is **collected, not fatal**. Keep going. At the end of the
batch — after every writable item is on disk, and with the skip report — ask once:

```
2 I could not identify with confidence:
  "sliding window max k"  — did not resolve to a canon title
  "Design Rate Limiter"   — off canon
Paste the prompts and I will import them, or say drop and I will leave them.
```

The paste path is the fallback and stays **deliberately expensive**, which is the point: the
dev feels the cost exactly in proportion to how far off canon their list wandered, and that
is the right feedback signal. On that path the pasted prompt is a **working input only** —
never quoted into the note, never stored on disk, and the note is written as though you had
not seen it. See the paraphrasing guard in [PROBLEM-FORMAT.md](./PROBLEM-FORMAT.md).

Ask **once**. Never stop mid-batch to ask about item three.

## Kinds: two of the three

`coding` and `system-design`.

**Behavioural problems are hand-authored by the dev** against the template in
[PROBLEM-FORMAT.md](./PROBLEM-FORMAT.md). You can write a solution to *Course Schedule*; you
cannot write one to *tell me about a time you disagreed with your manager*, because that
answer is the dev's own story and an invented one is worse than none. If a list mixes one
in, **write nothing for it** and say so in the end-of-batch report, pointing at the
template.

`system-design` needs no acquisition path at all: *design a URL shortener* has no
authoritative prompt text to be faithful to. The `## Prompt` is the title restated with its
scope, and the substance is all in `## Solution`.

## What you write, and what you never write

Everything except the dev's judgement about *what* to import:

- **`## Prompt`** — a paraphrase in your own words stating **what is asked, never how**. It
  is an unsealed section, so an approach that leaks into it defeats the seal on
  `## Solution` three headings later.
- **`## Solution`** and **`## Complexity`** — both yours. Complexity is downstream of an
  approach, so anyone who can write the analysis already has the solution in mind; splitting
  them was incoherent. **Solutions are C#.**
- **`## Hints`** — yours, and **optional**. Derivative of the solution you just wrote,
  mechanical to do two hundred times, and small blast radius: a hint is a nudge behind a
  click, not an answer.
- **`## Constraints`** and **`## Follow-ups`** — optional, and both render open.
- **`difficulty`** — the **source's own label**, copied rather than re-derived.
- **`topic`** and **`practices`** — filled in, with any missing Term **minted** (below).

You never write: a `draft` field, the original prompt text, a note for a source, or a
Problem nobody sourced.

## Difficulty is the source's label, not your judgement

Copy it. The dev already reads that scale on every external problem, and re-deriving it only
invents a disagreement with the site the problem lives on.

The vault's vocabulary is lowercase `easy`, `medium`, `hard`, and an unrecognised word is a
build error — so LeetCode's `Medium` is written `medium`. That is casing, not translation:
never move an item a rung because it felt easier or harder than its label says.

`system-design` problems mostly carry no published label. Judge one there, **within the
kind** — difficulties are only ever compared inside a kind, and a hard system-design
question is not a hard graph problem.

## Identity: every ULID is minted by running a command

```sh
npm run ulid        # one
npm run ulid 15     # fifteen, for a fifteen-problem batch
```

**Never type a ULID, never copy one out of an example, never adapt one you have seen.** You
cannot generate a ULID from parametric knowledge; you can only produce something ULID-shaped
and wrong, and it will collide or fail the format check. Note `id`s and quiz ULIDs share
**one namespace**, so a duplicate anywhere is an error anywhere.

Mint them up front — one call for the notes plus any Term stubs you expect to need — and
spend them in order. A note's `id` is **immutable** once written: it is record identity, and
the filename is link identity ([ADR 0001](../../../docs/adr/0001-split-note-identity.md)).
Renaming a note is Obsidian's business; the `id` never moves.

## Minting Terms is mandatory

`topic` is a **controlled vocabulary**: every value names an existing note in
`content/terms/`, and the build errors on anything else. So a Problem claiming a topic with
no Term **mints the Term in the same run** — a stub is enough. See
[TERM-FORMAT.md](../author/TERM-FORMAT.md).

Refusing to import a problem whose topic has no Term would invert the authoring order the
vault deliberately protects. Hold the two halves apart:

> **`topic` must name an existing Term.** It is frontmatter, it is checked rather than
> merely resolved, and a dangling value is an error — a Problem filed under a subject that
> does not exist, which the topic index then loses in silence.
>
> **`practices` may name a Lesson that does not exist yet.** That is not a defect; it is the
> authoring queue populating itself. *This Problem drills a Lesson nobody has written* is
> intent the vault wants to hold, and unwritten targets there accumulate the inbound links
> that rank `author`'s backlog.

Body wikilinks work like `practices`: **link liberally**, unwritten targets included. An
unwritten body link is a warning and a todo, not a mistake.

## No authoring queue, and no coverage report

Do **not** open a run by surveying the vault for topics that have Lessons but no Problems,
or for thin kinds, and do not consume the unwritten-note ranking as a work list.

`author`'s ZPD legitimately picks the next Lesson, because teaching order is a judgement it
is equipped to make. Problem selection is not: which problem is worth curating depends on
what the dev saw in an interview last week, and that is nowhere in the vault. **The dev
drives what gets imported.** The problem → lesson direction stays automatic, and is enough.

## An import run, in order

1. **Read the list.** Resolve each item to a canonical title. Fetch nothing.
2. **Mint the ULIDs** — one call, one per note plus the Term stubs you expect to need.
3. For each item, in order:
   1. **Duplicate check** against `content/problems/`. Match → skip, record, next item.
   2. **Gate**: on the canon, then constraints and one worked example from recall. Fail →
      defer, record, next item.
   3. **Mint any missing Term** the item's `topic` needs.
   4. **Write the note**, against [PROBLEM-FORMAT.md](./PROBLEM-FORMAT.md), and save it
      before moving on. Log the resolved title and the path.
4. **Run `npm run validate`.** It must pass with no hand-editing; if it does not, the fix is
   yours, not the dev's. Unwritten-link *warnings* are expected and healthy — a body
   wikilink to a note nobody has written yet is the queue filling up. Errors never are.
5. **Report once**: what was written, what was skipped and why, and what was deferred — with
   the single ask for the deferred items.
6. **Stop there.** The dev reads the diff and commits. **Never commit for them.**

## The review gate is informal, deliberately

The dev reads the diff before committing. **No `draft: true`, and no per-problem approval in
the session.** Per-problem approval defeats the point of batching. `draft` was considered —
it would make *unreviewed* a queryable state in the vault rather than something the dev has
to remember across fifteen notes — and declined: it softens nothing in validation, and
dropping the behavioural kind removed the one case that structurally needed it, so this
skill inherits `author`'s never-set-`draft` rule with nothing to explain.

**The risk that leaves, stated plainly.** Executing each coding solution against the
problem's sample cases was proposed as the compensating control, agreed to, and then
deferred. So **nothing structural stands between a subtly-wrong solution and a commit**
except the dev reading the diff. That is a deliberate, reversible position rather than an
oversight. Write solutions you would defend, and say so in the report when one is a variant
you are less sure of.

## When the canon assumption starts failing

Recall reliability over the canon is **asserted, not measured** — no sample was checked
against real problem statements when this was decided. The gate is designed to make a miss
loud, not to make misses impossible.

So if items that are *on* the canon start failing test 2, what is wrong is the corpus
assumption, not the gate. Say that to the dev rather than lowering the bar to get the batch
through.
