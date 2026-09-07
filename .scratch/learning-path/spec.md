# Learning Path — spec

Labels: `ready-for-agent`

## Problem Statement

The vault now covers the whole senior loop, but only in pieces. Six Plans each give a
reading order over **one cluster** — C# fundamentals, concurrency, databases, API requests,
the system-design round, the behavioral round — and Record 0005 closes with the loop
"covered but untested." What no note answers is the question a reader asks *before* they pick
a cluster: **"I want to be hired as a senior engineer — where do I start, and in what order do
these six reading orders come?"**

The `Mission` frames everything as a four-stage loop (a coding screen, two coding rounds, a
system-design round, behaviourals folded in) and puts *recall on the fundamentals* first. The
six Plans serve the legs of that journey; nothing yet is the journey. A reader landing on the
entry page sees six sibling "A reading order for …" bands and has to infer the arc across
them — that the fundamentals come before the rounds, that the design round leans on the
distributed-systems theory, that the behavioural round proves the same seniority claim the
whole thing is about.

Two structural facts make this the right moment:

- There is **no Plan for the coding round** — the Mission's #1 priority. Its ingredients have
  cluster Plans (C#, concurrency, databases) and its meta-signal is a Lesson
  ([[the-senior-coding-signal]]), but nothing sequences big-O + the DSA + the Problems +
  that Lesson into "how a coding round is passed." That Plan is a **follow-on**, not this
  effort — but the journey has to be able to point at it before it exists.
- The entry page's opening band (`StartHere`, from `plans()`) is a **flat, alphabetical,
  type-keyed list** with no featuring mechanism. Adding a seventh Plan is the whole lever
  available without touching the build.

## Solution

**Author one new note: the vault's seventh Plan, `content/plans/learning-path.md`, titled
"Learning Path" — a Plan-of-Plans whose body sequences the six existing reading orders (plus
the not-yet-written coding-round one) into a single base-then-rounds journey from zero to
hired.**

It is an ordinary `plan` note. No build change, no new note type, no per-user state, no
gating, no progress, no readiness tracking. "Zero to hired" is the **framing of a reading
order**, not machinery the app enforces — consistent with every other Plan and with the
model's stance that per-user state is written nowhere ([ADR 0005](../../docs/adr/0005-a-plan-is-a-note-type.md)).

The note **delegates**: its spine is links to the cluster Plans, with connective prose between
the legs saying why each comes where it does. Detail stays in the sub-Plans. When a note
downstream changes, the master needs no edit — the opposite of flattening all six reading
orders into one table that would have to be maintained twice.

It asserts **no sequence the vault does not already hold**. `prerequisites` remains the only
ordering claim in the corpus; the Learning Path is one path through that graph, written in
prose, and it says so and says the notes win where they disagree — the same disclaimer every
existing Plan carries.

## The note

### Frontmatter

```yaml
---
id: <mint with `npm run ulid` — never typed>
title: Learning Path
topic:
  - engineering-levels
  - coding-interviews
  - system-design
  - distributed-systems
  - behavioral-interviews
---
```

- **`title: Learning Path`** — deliberately *not* "A reading order for …". Among six
  near-identical "A reading order for X" siblings in the entry band, the one entry named
  "Learning Path" is the one that catches the eye. This is **prominence by contrast, not by
  sort position**: `plans()` sorts alphabetically by title, so "Learning Path" lands at **L,
  after** the six "A …" entries — but it reads as the odd-one-out that names the whole journey,
  and it needs no `plans()`/`StartHere` change to stand out. (This reverses the earlier
  "title it to sort first" idea; the distinctive name buys the same prominence more honestly.)
- **`topic` — the five interview-frame anchors only.** A Plan's `topic` decides which Terms'
  "In this topic" cards list it. These five are the topics the Learning Path is *distinctively*
  about, so it surfaces on those Term pages. It is deliberately **left off** the low-level
  fundamentals Terms (`hash-maps`, `garbage-collection`, `relational-design`, …): those already
  have their own cluster Plans, and a whole-journey Plan under all ~30 topics would be noise on
  every card. All five Terms already exist, so every `topic` target resolves (a missing one is a
  build failure, not an unwritten-link warning).

### Body — the spine

Prose Plan, in the voice of the existing six. Opening paragraph states what the page is (the
one path across the six reading orders, from the fundamentals to the four rounds), the standard
"the vault carries no reading order of its own; where a note disagrees, the note wins"
disclaimer, and the base-then-rounds shape. Then the ordered legs:

**Frame (read first)** — `[[what-senior-means-as-a-level]]`
: The one **direct-Lesson** exception to delegation. It is the master lens the system-design and
  behavioural sub-Plans already open with, pulled to the very top so the whole journey inherits
  it once: "senior" is a scope claim, and everything below is either the fundamentals that make
  the claim defensible or the rounds where it is proved.

**Base — earn the fundamentals recall is built on**
1. `[[reading-order-for-csharp-fundamentals]]` — the language the loop is conducted in.
2. `[[reading-order-for-concurrency]]` — what the runtime does with more than one thing at once.
3. `[[reading-order-for-databases]]` — the relational model, indexing, transactions, query cost.

**Rounds — rehearse each stage of the loop**
4. `[[reading-order-for-the-coding-round]]` — **unwritten link.** Renders as a marked,
   unclickable affordance today and goes live the moment that Plan is authored, **with zero
   edits to this note**. This is the whole reason the note delegates. (A body wikilink to a
   nonexistent note is a legitimate unwritten link — a validation *warning*, not an error —
   unlike a missing `topic`/`prerequisites` target.)
5. `[[reading-order-for-the-system-design-round]]` — the 45-minute design conversation and the
   theory under it. Its **companion reading** is `[[reading-order-for-api-requests]]`, named here
   as a side leg off the design round rather than as its own stage: HTTP resilience (retries,
   circuit breakers, timeouts, bulkheads) is design vocabulary a senior *narrates*, not a
   fourth stage of the loop.
6. `[[reading-order-for-the-behavioral-round]]` — the leadership round, where the seniority
   claim from the frame is evidenced directly.

A closing note that there is no coding-round Plan *yet* and this page will start linking to it
the day there is — the reader is told the one gap rather than left to find a dead link
unexplained.

## Decisions (from the grilling round)

| # | Decision | Why |
|---|----------|-----|
| 1a | A new top-level **Plan note**, not a new type or app feature | Nothing in the Mission asks for stored progress; a Plan is already "one prose path through the prerequisite graph, spanning several topics" — the master is that, one level up. Authorable with `/author`, no build change. |
| — | **Plan-of-Plans (delegate)**, coding leg as an **unwritten link** | "Easily updatable": the master is a spine of links; the coding round drops in as one resolved link, not a re-sequencing. |
| 3c | Spine is **base-then-rounds** | "Zero to hired" is literally earn-the-base then drill-the-rounds; maps cleanly onto three base clusters and three round clusters. |
| 2b | `topic` = **five interview-frame anchors** | Surfaces the Plan on the Terms it is distinctively about; keeps it off ~30 low-level Term cards. |
| 3a | **No readiness/progress prose** — a pure reading order | The app stores no state and shows none; readiness cues would read like a progress checklist the app deliberately does not keep. |
| 4 | **"Learning Path"** — prominence by contrast, not by sort or by a build tweak | Distinctive among six "A reading order for …" siblings; no `plans()`/`StartHere` change (which would be an ADR-sized departure). |
| 5b | `api-requests` is **companion to the system-design leg** | Resilience is design vocabulary, not a stage; keeps the spine to the four stages the Mission names. |
| 5 | **Open with the frame Lesson** `[[what-senior-means-as-a-level]]` directly | The one direct-Lesson exception; it earns it by being the lens every leg inherits. |

## Non-goals (named follow-ons, not this effort)

- **Authoring `reading-order-for-the-coding-round`.** Its own `/author` run and note-map. The
  Learning Path is written to expect it via the unwritten link and needs no edit when it lands.
- **Growing the Problem bank** (6 today). A separate authoring effort with its own queue.
- **Any build-level "featuring"** of the Learning Path in the entry band (pinning, first-place
  in `plans()`, a description under each band). ADR-sized; explicitly out.

## Acceptance

- `content/plans/learning-path.md` exists with the frontmatter above (`id` minted via
  `npm run ulid`) and the delegating base-then-rounds body.
- `npm run validate` passes. The only expected violation is an **unwritten-link warning** for
  `[[reading-order-for-the-coding-round]]` — a warning, not an error; every `topic` target and
  every other spine link resolves.
- On `npm run build`: the note appears as a seventh entry in the entry-page `StartHere` band
  (at L, after the six "A …" entries), and as a `plan`-group row on the five anchor Terms'
  cards. Its five spine links to the existing Plans are live; the coding-round link renders as
  the marked unwritten affordance.
