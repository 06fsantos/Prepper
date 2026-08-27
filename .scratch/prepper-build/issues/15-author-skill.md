# 15: The `author` skill

**What to build:** The skill the dev runs to put a Lesson into the vault. Its output is **vault
content, not an export**: Markdown notes with frontmatter and wikilinks, written into `content/`
and committed by the dev.

A **new sibling skill, not an edit to vendored `teach`** — `teach` is pinned by hash in
`skills-lock.json`, so an in-place edit is a divergence that a re-sync of `mattpocock/skills`
clobbers. Roughly 60% of upstream survives. Its scope is `lesson`, `term`, and `cheat-sheet`, plus
a **reference mode**: `/author reference <research note>` is the deliberate promotion step that
turns an investigation into reader-facing material. Upstream's single reference-doc bucket splits
three ways here — Reference, Term, Cheat sheet — so the skill needs a stated picking rule.

Things it must do, each of which is a decision rather than a detail:

- **Mint a `term` note mandatorily** for any topic it uses that lacks one, so `topic` stays a
  controlled vocabulary and never dangles.
- **Maintain the cheat sheet**: create it with the first Lesson on a topic, update it with each
  Lesson after, so the quick-catchup document is never stale — one run therefore touches up to four
  notes. Keep it a **20% filter**, not an accumulating summary that grows with the topic.
- **Mint every ULID by running a command, never by typing one.** This skill is the only place in
  the pipeline that generates them.
- **Carry prerequisites in the `prerequisites` field** and never presume the reader arrived from
  another Lesson. A Lesson stands alone; ordering lives in the graph.
- **ZPD reasoning survives, repointed** at *what should I author next* — the inherited teaching
  philosophy earns its keep now that the ordinal sequence is dead.
- **Never set `draft`.** A note is live unless the dev says otherwise.
- Diagrams go to `content/attachments/`; **`./assets/` is deleted** — the quiz fence is the vault's
  only interactive primitive.
- Citations stay **inline external links**, with `RESOURCES.md` on the authoring side. **No source
  ever becomes a note.**
- The **Workshop boundary is a constraint on the skill, not on the dev**: `author` either *promotes*
  a whole Research note (fragment promotion is not built) when the material is looked up repeatedly
  and stands alone, or *writes it into the Lesson* when it only supports that Lesson's argument. It
  never emits a Library→Workshop embed.

Also ships the **`/research` convention**: no fork of the skill — a `CLAUDE.md` convention steers
its output to `content/research/`, named after the **question** it answers so it never collides with
the Term of the same name. Research notes are **never pruned** after promotion: a Reference
supersedes them for the reader, not for the dead ends.

The skill gets **no test seam**. It is prompt-driven, and the correctness of its output is exactly
what validation already checks — a test asserting its output shape would be a second, weaker copy of
the rule set. Its checks are the FORMAT docs and the build.

**Blocked by:** 06

**Status:** resolved

- [x] `author` exists as its own skill directory; vendored `teach` is unmodified and its lock hash unchanged
- [x] An authoring run produces a Lesson that passes `npm run validate` with no hand-editing
- [x] A topic with no `term` note gets one minted in the same run
- [x] The first Lesson on a topic creates its cheat sheet; a later Lesson updates it and the sheet stays short
- [x] Every `id` in the output was produced by running a command
- [x] `/author reference <research note>` promotes a whole Research note to a Reference, leaving the Research note in place
- [x] No output note sets `draft`, embeds a Workshop note, or cites a source as a note
- [x] Diagrams land in `content/attachments/`; no `./assets/` directory ships
- [x] `CLAUDE.md` states the `/research` output convention, and `/research` is not forked
