---
name: delegate
description: Author every unwritten lesson a Plan references, one subagent per lesson, each fact-checked by a verifier.
disable-model-invocation: true
argument-hint: "<path to a Plan in content/plans/>"
---

The dev has a Plan whose reading order links to lessons that are not written yet. Those
`[[dangling]]` links are the authoring queue — an unwritten body link is a validation
*warning*, and the warning is how the reading surface doubles as a todo list. This skill
**drains that queue**: it reads the Plan, and for each lesson the Plan names but the vault does
not hold, it spawns a subagent that runs [`/author`](../author/SKILL.md) to write it, then a
second subagent on **Sonnet** that checks the new lesson's facts against its sources. A flagged
fact loops back through `/author` for a revision. The whole batch is authored linearly; the dev
reviews it once at the end and commits. **Agents commit nothing.**

> **This skill is first-party repo content, not a vendored skill.** Like [`author`](../author/SKILL.md)
> and [`import`](../import/SKILL.md), it is not pinned in `skills-lock.json` and is ours to edit
> freely. It orchestrates `author`; it does not reimplement it.

This inverts the usual order — a Plan is normally a reading order over notes that **already
exist** ([ADR 0005](../../../docs/adr/0005-a-plan-is-a-note-type.md)). Writing the path first
and filling it after is a legitimate authoring workflow, and it is the one this skill serves.
The Plan still asserts no sequence the graph does not hold; `delegate` just writes the notes the
path is waiting on.

## Modes

```
/delegate <path to a Plan in content/plans/>
```

One mode. The argument is a Plan file. There is no dry-run flag — the run stops before
committing anyway, so the diff *is* the preview.

## What delegate owns, and what it does not

`delegate` authors **Lessons only**, because `/author` authors Lessons and `/author` is the only
thing it drives. A Plan's dangling links are not all Lessons, so the run **classifies** each one
and authors only its own:

| Dangling link sits in…             | Intended type      | delegate…                                            |
| ----------------------------------- | ------------------ | ---------------------------------------------------- |
| the reading-order step(s)           | Lesson             | **authors it**                                        |
| a practice-checkpoint list          | Problem            | lists it for the dev — `/import` owns Problems         |
| "look this up" / "the night before" | Reference / cheat sheet | lists it for the dev — `/author reference` / `/author cheat-sheet` |

`/author` never writes Problems, and this skill never reaches around it to try. A deferred link
is reported, never authored silently by the wrong tool.

**Dangling only.** A link that already resolves to a note on disk is left exactly as it is — this
skill fills gaps, it does not re-author what exists.

## The contracts live in `author`, not here

Note shape, frontmatter, the quiz fence, the ULID rule, the Workshop boundary, the `draft` rule,
what makes a Lesson versus a Reference — all of it is [`author/SKILL.md`](../author/SKILL.md) and
its FORMAT docs, and each subagent reads them directly. **Do not restate any of it here.** Two
documents describing one contract disagree eventually, and the disagreement is silent until a
note is wrong. This document is the orchestration around `author`: which lessons, in what order,
by how many agents, checked how. The pattern is the parallel one in
[`docs/agents/incorporating-teaching-workspaces.md`](../../../docs/agents/incorporating-teaching-workspaces.md),
run linearly instead (see "Why this run is linear").

## A delegate run, in order

1. **Read the Plan** the dev named, and confirm it lives in `content/plans/`. Read
   `content/MISSION.md` and `content/records/` for the same grounding `/author` reads on every
   run — the mission is why any of this is being learned, and a Record may say a topic is already
   known and needs no lesson.
2. **Find the dangling lessons.** Collect every `[[wikilink]]` in the Plan, resolve each against
   the notes on disk, and keep the ones that resolve to nothing. Classify each per the table
   above; keep the Lessons, set the rest aside for the run summary. Order the Lessons by the
   Plan's own reading order, top to bottom.
3. **For each unwritten Lesson, in reading order:**
   a. **Author it.** Spawn one subagent (default model) with the author prompt below. It calls
      the `author` skill in lesson mode, mints its own ULIDs, mints any missing Term, writes the
      Lesson, updates the topic's cheat sheet, runs `npm run validate`, and reports the
      filename(s) it wrote. It commits nothing.
   b. **Verify it.** Spawn one subagent on **Sonnet** (`model: sonnet`) with the verify prompt
      below. It reads the new Lesson and checks its claims against the Lesson's cited sources and
      the matching `content/research/` notes. It reports findings; it edits nothing.
   c. **Revise if flagged.** If the verifier flags a factual problem, spawn a fresh author
      subagent told exactly what to correct in that Lesson, then verify again. Cap at **two**
      revise rounds. If it still has not converged, record the unresolved concern in the run
      summary and move on — never leave a Lesson silently wrong, and never let one Lesson block
      the rest of the queue.
4. **Finish.** Run `npm run validate` over the whole vault. Then **stop** and give the dev a run
   summary: the Lessons authored with their filenames, the verify outcome for each (confirmed /
   revised / unresolved), and the deferred non-Lesson links from step 2 with the skill that owns
   each. The dev reviews the batch diff and commits.

## The author subagent's prompt

Compose it per Lesson so the agent has the Plan's intent without re-deriving it. State, in the
prompt:

- **Invoke the `author` skill** — call the Skill tool with `"author"` in lesson mode. (Precedent:
  `wayfinder` spins up subagents that call the Skill tool with `"research"`.) The agent reads
  `author/SKILL.md` and `LESSON-FORMAT.md` itself; do not paste their contents.
- **What to author** — the Lesson's intended filename and title (from the wikilink), the **Scope**
  and **Why here** cells of its Plan row, and the Plan's framing paragraph. That is what places
  the Lesson in the path; the agent should not have to guess it.
- **Where to gather from** — the paths of the `content/research/` notes whose `topic` matches the
  Lesson's topic, and the relevant `RESOURCES.md` entries. These are knowledge input, the way the
  workspace is in the incorporation doc. **They are input, never links:** research is Workshop, so
  never `[[link]]` one into the Lesson — `author`'s Workshop boundary is the authority.
- **Which names it may link, in both directions** — link freely to any note the Plan names and any
  note already on disk; never invent a name in neither. A prompt that lists some link targets reads
  as a closed set, and an agent will drop good links rather than exceed it, so say both halves
  out loud.
- **Mint your own ULIDs, run `npm run validate`, commit nothing, and report the filename(s) you
  wrote.**

## The verify subagent's prompt (Sonnet)

Give it the authored Lesson's path, the sources that Lesson cites, and the paths of the matching
`content/research/` notes. Tell it to:

- Check each factual claim and each quiz answer in the Lesson against those cited sources and
  research notes.
- Flag any claim with **no source behind it** — trust extends to what a source cited, not to
  everything a Lesson asserts. These are soften-or-cut candidates, not things to re-research.
- Report a structured verdict: what it confirmed, and each issue as *(the claim, why it is
  suspect, what the source actually says)*.
- **Edit nothing.** Its output is the input to the revise loop, not a change to the vault.

## Why this run is linear

The incorporation doc runs one subagent per topic **in parallel**, and pays for it with three
phases and a worktree each. Every one of those hazards dissolves when the run is serial, so this
skill has neither phases nor worktrees:

- **Cheat-sheet clobber** — one sheet per topic, rewritten not appended. With one agent at a time,
  two Lessons on the same topic just rewrite the sheet in sequence, which is `author`'s ordinary
  contract, not a race.
- **`RESOURCES.md` contention** — one file every parallel agent wants. No concurrent writer here.
- **`topic` / `prerequisites` are checked, not resolved** — a value naming a missing note is a
  build error. Each `/author` run mints its own missing Term, and authoring in reading order means
  a Lesson's prerequisite is already on disk before the Lesson that names it — so nothing has to be
  scaffolded ahead of the run.
- **Worktree isolation** — the point of worktrees was disjoint outputs for a trustworthy
  per-agent `validate`. Serial writes into the working tree with one batch diff at the end need no
  isolation.

Do not reintroduce phasing or worktrees to make this "match" the incorporation doc. The linearity
is the design, not a shortcut.

## Gates

The dev reviews and commits once, at the end of the run. Agents commit nothing, at any point.
`npm run validate` is the gate: errors block, and unwritten-link *warnings* for the Plan's
still-empty later steps are expected — they are the rest of the queue.
