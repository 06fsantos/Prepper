# 16: The `import` skill

**What to build:** The skill for *add these fifteen problems*. A **separate skill, not a mode of
`author`** — the inherited teaching philosophy fires nowhere in a bulk import, and that is the whole
reason for the split.

**Batch-shaped and safe to re-run**: it takes a list and writes **one note at a time**, so a batch
is resumable. **Duplicates are skipped and reported**, matched on any shared `source` URL and then
on title, and **never overwritten**. Review is informal — the dev reads the diff. No `draft` gate,
no per-problem approval.

Each note gets the paraphrased `## Prompt`, `## Solution`, `## Complexity`, and optional
`## Hints`, plus `topic` and `practices` filled in and **missing `term` stubs minted** as `author`
does, so importing ahead of the Lessons is possible rather than blocked. The `## Prompt` states
**what** is asked and never **how** — it is an unsealed section, so approach leaking into it defeats
the seal on `## Solution`. Difficulty is **copied from the source verbatim**: the scale the dev
already reads on every external problem needs no translation. **Solutions are written in C#**, one
language vault-wide — the repo's TypeScript is irrelevant here, and the interview language and the
build stack were kept apart deliberately.

**Acquisition is recall-only, and the corpus scope is what makes that safe — one decision, not two.**
The corpus is the **NeetCode canon**: the densely-attested head where the agent reproduces a
published solution rather than inventing one. **Widening the corpus invalidates the acquisition
method**; it is not a content decision to be made in passing. Nothing is fetched — browsing was
considered and **declined**, and recorded as declined.

The gate is **two tests before writing**: on-list against the canon, and a
**constraints-and-one-worked-example self-test**. The second exists because the first guards only
the *solution* while the real failure mode is **identification**, and the two come apart — *Course
Schedule* is not *Course Schedule II*. On failure the skill **defers the item and asks once at the
end of the batch**, never halting on the first, so fifteen problems are not punished for one
off-canon entry. A paste fallback exists and stays self-limiting by being expensive.

Kinds are **`coding` and `system-design`**. **Behavioural problems are hand-authored** against a
template, and `PROBLEM-FORMAT.md` says so **explicitly**, so the gap reads as a decision rather than
an oversight. That doc also carries the structural guard on paraphrasing, which cannot be validated
in the build because the source text is deliberately absent from the repo.

No test seam, for the same reason as 15: validation is the check.

**Accepted risk, recorded:** execution verification of imported solutions is out of scope, so
nothing structural stands between a subtly-wrong solution and a commit.

**Blocked by:** 11, 06

**Status:** resolved

- [x] `import` exists as its own skill, and `author` has no import mode
- [x] A batch writes one note at a time and can be interrupted and re-run without duplicating or overwriting
- [x] A re-run reports what it skipped, matched on shared `source` URL then title
- [x] Imported notes pass `npm run validate` with no hand-editing
- [x] `## Prompt` is a paraphrase stating what is asked, with no approach in it
- [x] Solutions are C#; difficulty is the source's own label
- [x] Missing `term` stubs are minted during the import
- [x] An unidentifiable item is deferred and raised once at the end of the batch, not on the spot
- [x] Nothing is fetched during a run
- [x] `PROBLEM-FORMAT.md` ships, states that behavioural problems are hand-authored against its template, and carries the paraphrasing guard

## Comments

**Built.** `import` is a first-party skill at `.agents/skills/import/`, symlinked from
`.claude/skills/import` the way every other skill is. Two files: `SKILL.md` and
`PROBLEM-FORMAT.md`. Nothing vendored was touched and `skills-lock.json` is unchanged —
`import`, like `author`, is not in it.

`SKILL.md` carries the reasoning that is not a detail: why this is not a mode of `author`;
the batch loop that writes and saves one note at a time; the duplicate check that runs
before every item, matching any shared `source` URL then the title, and skips rather than
overwrites; recall-only acquisition over the NeetCode canon with the two dead fetch paths
and the declined browser path both recorded so nobody re-proposes them; the two-test gate
and why test 2 guards identification specifically; defer-and-ask-once; the two kinds; C#;
difficulty copied from the source; mandatory Term minting; and the accepted risk that no
execution verification stands between a wrong solution and a commit.

`PROBLEM-FORMAT.md` is the note contract — frontmatter table, the six named H2 sections, the
per-kind requirement matrix, what seals and what does not — and it carries the two things
the build cannot check: the **structural paraphrasing guard** (no source text in the repo,
so nothing could ever diff against it) and the **behavioural exclusion**, stated with the
hand-authoring template beneath it so the gap reads as a decision.

Term minting reuses `author`'s `TERM-FORMAT.md` by reference rather than by copy.

**One correction to the drafted wording, found by running it.** The docs first said an
unwritten `practices` target raises a warning. It does not: `unwritten-link` is a **body**
link rule, and validation only checks that a `practices` target which *does* exist is
Library content. The target still earns its graph edge and its inbound-link ranking, so it
is backlog on the Vault report rather than anything on the validation channel. Both docs now
say that.

**A sample import was run, and kept.** `contains-duplicate` (canon, existing `hash-maps`
term) and `valid-parentheses` (canon, which minted `content/terms/stacks.md` and carries a
deliberately unwritten `practices` target). ULIDs from one `npm run ulid 3`. `npm run
validate`: *No violations. 14 notes checked.* — no hand-editing. They are ordinary vault
content and easy to drop if the dev would rather drive the first real batch themselves.

**Not built, deliberately: no test seam**, for ticket 15's reason. A test asserting the
shape of this skill's output would be a second, weaker copy of `prepper/validation/rules/`.
`npx tsc --noEmit` clean. `npm test` fails 37 of 323 — the identical set fails on this
branch's base with the changes stashed, so they are pre-existing and untouched by a
prompt-only ticket.
