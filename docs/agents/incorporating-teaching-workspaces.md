# Incorporating a teaching workspace

A **teaching workspace** is a directory the `teach` skill built while the dev was learning
something: a `MISSION.md`, a `RESOURCES.md`, a `NOTES.md`, a run of numbered HTML lessons with
quizzes, and a `learning-records/` of what landed. They live outside this repo — currently
`../Playground/` — one per subject.

Incorporating one means **authoring its material into `content/`**. This document is the
orchestration around that: which notes get written, in what order, by how many agents, and
where the dev reviews. It is not a second copy of the note contracts —
[`.agents/skills/author/`](../../.agents/skills/author/SKILL.md) owns those, and every agent
reads them directly.

## This is an authoring run, not a port

The workspace's lessons are HTML written for a linear course. They carry a per-lesson nav, a
numeric sequence, callbacks ("as we saw in lesson 0001"), footers announcing what comes next,
and a quiz format with no per-option explanation. **None of that survives.** The vault kills
sequence outright — ordering lives in `prerequisites`, and prose may never presume the reader
arrived from another note — so a mechanical conversion produces a directory of notes that all
violate the contract at once.

Treat the workspace as the **knowledge-gathering step** of a normal `/author` run. Its lessons
are already sourced against high-trust primaries; that is what makes them usable without
re-research. Trust their citations. Do not re-fetch.

**Coverage is the target, not length.** A re-authored Lesson covers what its source lesson
covered; how long that makes it is the source's business, not a quota. Earlier notes in the vault
are calibration for *voice* — the register, the quiz style, how a section opens — and never for
word count. Agents given "look at the existing Lessons" and nothing else will each invent a
different length budget, and the run comes out uneven for no reason anyone can name afterwards.

There are two exceptions. The first is a **version-pinned number** — a library default, a
framework timeout. State the version and the date it was verified in the note's own body. A table
of numbers with a link to docs that no longer say them is how a vault starts asserting something
false.

The second is a claim the source **asserts but does not cite**. A course written to teach states
mechanism confidently, and that confidence carries into a re-authored note as an assertion the
vault cannot support. Trust extends to what the workspace cited, not to everything it said. When
a claim has no source behind it, either soften it to what the cited mechanism literally implies,
or leave it out — do not re-research it, and do not promote it to a quiz answer, which is the
place a wrong claim does the most damage.

## What crosses over

| In the workspace          | Where it goes                                                        |
| ------------------------- | -------------------------------------------------------------------- |
| `lessons/*.html`          | Lessons, References, and Problems in `content/` — see the map below   |
| `RESOURCES.md` sources    | This repo's root `RESOURCES.md`, including its unresolved gaps        |
| `learning-records/`       | **Read, never imported.** Distilled into one new `content/records/` note |
| `MISSION.md`, `NOTES.md`  | Stay put. They are that workspace's, not the vault's                  |
| Sibling research notes    | Stay put. Their sources go to `RESOURCES.md`                          |

**Nothing is written back into the workspace.** It is not this repo's to edit, and the record of
what has been incorporated lives in `content/records/` — which `/author` already reads on every
run, so the next run finds out what has landed by the same route it finds out everything else.

## Before phase 1: the note map

Settle **every filename** before a word is written, and put the map in `.scratch/<feature>/`
alongside the decisions behind it.

Filenames are link identity. A Lesson forward-links into the authoring queue — `[[a-note-nobody-
has-written]]` is a warning, and the warning *is* the queue — but only if the name it guesses is
the name the note eventually takes. Discovering names as you go means every forward link is a
coin flip, and renaming later means rewriting every link that pointed at the old one.

The map also decides, per source lesson, **which note type it becomes**. The lines are
`author`'s own:

- **Lesson** — teaches one tightly-scoped thing, read roughly once, carries the quizzes.
- **Reference** — looked up repeatedly. A selection table, an API surface, a defaults table.
- **Problem** — an interview prompt with a worked answer. `kind: system-design` is in scope for
  a teaching workspace; `/import` writes it, not `/author`.

A source lesson does not have to map to one note, and often should not. A long one splits. A
grab-bag ("advanced considerations", "further topics") usually **dissolves** — each section
folded into the Lesson whose argument it extends — with any selection table pulled out as a
Reference.

A dissolved section is not always an extension. Some are **restatements** of the lesson they
point at, adding framing and no fact, and a map row that reads like every other row will have an
agent writing the same argument twice. Say so in the row when you know, and tell the agent to
dedupe rather than to fold.

## Topics

`topic` is a controlled vocabulary: every value names a note in `content/terms/`, and an unknown
value is a build error. A workspace normally introduces two to four.

Pick the level where each topic is **a subject someone would sit down and study**. Finer than
that and the topic index becomes a taxonomy — a card per pattern, a cheat sheet per pattern, none
of them worth reading alone. Coarser and one card hides ten notes.

A Term is *the canonical note for one topic*, not a dictionary definition, and `CONTEXT.md`
already provides for a body that is an **area overview** rather than a sentence. Broad topics are
in the model. There is no hierarchy and none is being added: if several workspaces in a row strain
flat topics, that is when an ADR earns itself, not before.

`topic` is list-valued. A note that genuinely belongs to two topics takes both — and note that
this moves the cheat-sheet count, because the sheet rule keys off how many Lessons a topic has.

## The three phases

The shape is forced by four things that cannot happen concurrently. Read the hazards before
changing the phases.

### Phase 1 — Scaffold (serial, no subagents)

1. The note map, in `.scratch/<feature>/`.
2. Every Term the map's `topic` values name.
3. The `RESOURCES.md` additions — sources and unresolved gaps.
4. **Any Lesson that is a prerequisite of Lessons in another topic.** Usually the root of the
   prerequisite graph.

Then stop. The dev reviews.

### Phase 2 — Author (parallel, one subagent per topic, each in its own worktree)

Each agent owns **one topic**: every Lesson filed under it, and that topic's cheat sheet. It runs
`/author`'s contract, mints its own ULIDs, and runs `npm run validate` before reporting.

The sheet is written **once, after the topic's last Lesson**. `author/SKILL.md` makes rewriting
the sheet a habit of authoring *every* Lesson after a topic's first, and that habit is suspended
for the duration of an incorporation run: a sheet rewritten five times against five partial
topics is not the sheet derived from the finished one. Say so in the agent's prompt, because
nothing else will — `npm run validate` warns about a missing sheet only well above one Lesson per
topic, so an agent that defers its sheet gets a clean run and no reminder.

The first topic authored is the **calibration slice** — run it alone, by subagent, and correct
this document against what the agent got wrong before fanning out the rest. The failure mode of a
document written for subagents is not a wrong procedure, it is one that assumes context its reader
does not have, and that is only visible when someone without the context follows it.

Then stop. The dev reviews.

### Phase 3 — Consolidate (serial)

1. The References — they span topics, so no single topic agent owns them.
2. The Problem, via `/import`.
3. The Record: one `content/records/` note naming the workspace and what the incorporation
   established. This is also what marks the workspace as done.
4. `npm run validate` over the whole vault.

Then stop. The dev reviews and commits.

## The hazards these phases exist to prevent

- **Cheat sheets are rewritten, not appended**, and there is exactly one per topic. Two agents
  writing Lessons on the same topic would both rewrite the same sheet and one would win silently.
  Giving an agent a whole topic makes the rule an invariant inside one agent instead of a
  coordination problem between several.
- **`topic` and `prerequisites` are checked, not resolved.** A value naming a note that does not
  exist yet is a build **error**, not an unwritten-link warning. So every Term must exist before
  any Lesson citing it, and a cross-topic prerequisite must exist before the worktree that needs
  it forks — which is why phase 1 writes a Lesson and is not purely structural.
- **`RESOURCES.md` is one file every agent wants to touch.** It is written once, in phase 1.
- **Worktrees isolate, and that is the point** — agents' outputs are disjoint by construction, so
  each can run `npm run validate` and be believed. It only holds if phase 1 put everything
  cross-cutting in place first.

ULIDs are not a hazard: `npm run ulid` is collision-free, and every agent mints its own.

A phase-2 agent's **warning count is not a number to compare against anything.** It depends on how
many sibling agents have already landed notes that resolve its forward links, so the same run
reports differently depending on fork order. Errors are the gate; warnings are a queue.

## What is delegated

Do not restate these here. Two documents describing one contract disagree eventually, and the
disagreement is silent until a note is wrong.

- Note shape, frontmatter, quiz fences, the Workshop boundary, the ULID rule, the `draft` rule:
  [`author/SKILL.md`](../../.agents/skills/author/SKILL.md) and its FORMAT docs.
- Problems: [`import/SKILL.md`](../../.agents/skills/import/SKILL.md) and `PROBLEM-FORMAT.md`.
- Issue and spec layout under `.scratch/`: [`issue-tracker.md`](issue-tracker.md).

**Which names an agent may link.** Link freely to any note the map names and to any note already on
disk; never invent a name that is in neither. A forward link is the authoring queue only when it
guesses the name the note will actually take, and an agent inventing one puts a dead edge in the
graph that no later note will ever resolve. This has to be said explicitly in both directions,
because a prompt listing some link targets reads as a closed set and an agent will drop good links
rather than exceed it.

A subagent is told which topic it owns and where the note map is, and reads the rest itself —
with one addition it cannot derive: **name the source sections it folds in**. "A grab-bag usually
dissolves" is a decision the map records and not an instruction an agent can act on, so the
prompt states which sections of the dissolved lesson are that agent's and that nothing else from
it crosses.

## Quizzes

Keep **what each source question probes** — that is real signal about what the dev found hard —
and re-author the question itself. The source's four-option shape is an artefact of its own
`quiz.js`, its distractors are usually padding, and it has no equivalent of `cloze` or `recall`.
Two to four per Lesson, interleaved with the prose rather than gathered at the end.

Not every source lesson has questions. Some carry the workspace's `quiz.css` and no quiz block
at all, so "keep what it probes" has nothing to work from — derive the questions from what the
lesson's own argument turns on instead, and check `learning-records/` for a record about that
lesson, which is the other place the dev's difficulty is written down.

**Mix the types.** Every source question is an mcq, so "keep what it probes" biases hard towards
a Lesson of three mcqs; the vault has `cloze` and `recall` and a Lesson should reach for them. A
number worth recalling exactly is a `cloze`, an argument worth reconstructing is a `recall`, and
a distinction with a tempting wrong answer is an mcq. A source question also does not have to
become a question here: one whose subject is a whole Lesson of its own is better served by a
wikilink to that Lesson.

## Two ways to lose a link silently

Both survive a clean `npm run validate`, which is what makes them worth stating here.

- **A wikilink that wraps across a line break is not a link.** Re-authoring long-form prose to a
  measure invites it, and nothing warns: the text renders as literal brackets and the graph edge
  is simply absent. Keep every `[[...]]` on one line, however awkward the wrap.
- **A heading anchor is not checked.** `[[note#Some Heading]]` validates whether or not the
  target has that heading, so a clean run says nothing about whether the anchor resolves. Either
  verify it against the target note by hand, or link the note and let the reader find the section.

## Gates

The dev reviews and commits at **every phase boundary**. Agents commit nothing. A scaffold diff —
the Terms, `RESOURCES.md`, the map, one Lesson — is the cheapest moment to catch a wrong topic
name, which is the single most expensive thing to change afterwards.

---

## Worked example: `learning-httpclient-dotnet`

Ten HTML lessons on `HttpClient` and resilience patterns, ~127KB, no images or tables.

**Topics (3):** `httpclient`, `http-resilience`, `distributed-tracing`. A `retry` /
`circuit-breaker` / `bulkhead` / `hedging` split was considered and refused — eight cards and
eight night-before sheets for one subject.

**Map (~19 notes):**

| Source                          | Becomes                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| 0001 lifetime refresher         | Lesson, `httpclient` — **phase 1**, root of the graph           |
| 0002 retry vs circuit breaker   | Lesson, `http-resilience` (+ 0010's sharded deps, `Retry-After`) |
| 0003 timeouts                   | Lesson, `httpclient` **and** `http-resilience`                  |
| 0004 hedging                    | Lesson, `http-resilience`                                       |
| 0005 bulkheads                  | Lesson, `http-resilience` (+ 0010's per-dependency section)     |
| 0006 idempotency                | Lesson, `http-resilience`                                       |
| 0007 tracing                    | **Two** Lessons, `distributed-tracing`                          |
| 0008 composing patterns         | Lesson, `http-resilience`                                       |
| 0009 payment-polling scenario   | Problem, `kind: system-design`, via `/import`                   |
| 0010 advanced considerations    | **Dissolved**; its synthesis table becomes a Reference          |
| defaults scattered in 0002/3/8  | Reference, carrying `Polly v8.7.0` and the date verified        |

Plus three Terms, three cheat sheets, one Record, and eleven sources into `RESOURCES.md` with
the unresolved hedging/trace-context gap under **Gaps**.

**Prerequisites:** root-plus-fan. The lifetime Lesson under everything; the composition Lesson
under retry, breaker and timeouts; nothing else. Topical adjacency earns no edge.

**Calibration slice:** the lifetime Lesson (phase 1) plus the retry/circuit-breaker Lesson. Those
two exercise the two riskiest mechanics — a cheat sheet rewritten rather than appended on a
topic's second Lesson, and sequential prose cut into a prerequisite edge.
