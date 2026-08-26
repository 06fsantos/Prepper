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

**Status:** ready-for-agent

- [ ] `import` exists as its own skill, and `author` has no import mode
- [ ] A batch writes one note at a time and can be interrupted and re-run without duplicating or overwriting
- [ ] A re-run reports what it skipped, matched on shared `source` URL then title
- [ ] Imported notes pass `npm run validate` with no hand-editing
- [ ] `## Prompt` is a paraphrase stating what is asked, with no approach in it
- [ ] Solutions are C#; difficulty is the source's own label
- [ ] Missing `term` stubs are minted during the import
- [ ] An unidentifiable item is deferred and raised once at the end of the batch, not on the spot
- [ ] Nothing is fetched during a run
- [ ] `PROBLEM-FORMAT.md` ships, states that behavioural problems are hand-authored against its template, and carries the paraphrasing guard
