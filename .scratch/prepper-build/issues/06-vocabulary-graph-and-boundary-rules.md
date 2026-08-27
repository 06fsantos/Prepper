# 06: The vocabulary, graph, and boundary validation rules

**What to build:** The rest of the rule set, on the spine 03 built. These are the rules that need
the graph to exist, so they land once edges do.

`topic` is a **controlled vocabulary**: every value names an existing note, and that note is a
`term`. Tag drift is impossible and the topic index cannot silently lose a note. `prerequisites`
must point at Library content that exists, and the prerequisite graph must be a **DAG** — a cycle
is an error that names the full cycle path, so the dev can find the loop rather than hunt it.
`practices` is the deliberate exception: it is required with at least one entry, an **unwritten**
target passes because intent is allowed, and a target that *exists but is not Library content* is
an error because that is a mistake.

The **Workshop boundary** is guarded here, and the asymmetry is the point. A Library note *linking*
to a Workshop note **warns**, with its own distinct message — the target exists, it is merely
invisible in the app, and "invisible" must never share a report line with "does not exist". A
Library note *embedding* a Workshop note is an **error**: a link at Workshop can be deliberate, an
embed never is, and the embed is degraded to the same marked, unclickable affordance an unwritten
link gets. (2 establishes *why* this cannot leak: the embed resolves client-side against a page
that does not exist.)

Also ships the **pre-commit hook**: available, **uninstalled by default**, and carrying exactly one
extra check — a warning on a changed `id` line relative to `HEAD`. Immutability gets a cheap guard
without taxing every mid-Lesson save. `id` immutability is deliberately **not** a build rule;
nothing dereferences the value.

Deliberately **not** validated: `id` immutability in the build; equal-length MCQ options; an empty
`term` body; whether a paraphrase reproduces its source prompt (unwriteable — the source text is
deliberately absent from the repo, so that guard is structural and lives in `PROBLEM-FORMAT.md`);
and, as a principle, anything on the report channel, ever.

**Blocked by:** 05, 02

**Status:** ready-for-agent

**Inherited from 05: the page half of the Workshop boundary.** 05 delivered the graph half —
a Workshop note is neither a node nor the source of an edge — and stopped there, because
excluding one from the *corpus* is a Quartz **filter**, and a filter drops a note from
`content[]` before any emitter sees it. Validation is an emitter over the whole corpus and
`research` and `record` have required fields of their own, so a filter added naively would
silently stop validating every Workshop note in the vault. That is the same collision 03 hit
when it disabled `remove-draft`, and it has to be resolved here, where the boundary is
guarded. Until it is, a Workshop note still gets a page.

- [ ] A Workshop note is dropped from the corpus by a filter, and gets no page
- [ ] Every validation rule still sees Workshop notes, filter or no filter

- [ ] Error: a `topic` value naming a note that does not exist, or one that is not a `term`
- [ ] Error: a `prerequisites` target that does not exist, or that is not Library content
- [ ] Error: a `practices` target that exists but is not Library content — while a nonexistent one passes
- [ ] Error: a cycle or self-reference in the prerequisites graph, with the full path named in the message
- [ ] Error: two cheat sheets claiming one topic, or a list-valued `topic` on a cheat sheet
- [ ] Warning: a body link from Library content to a Workshop note, with its own message distinct from the unwritten-link warning
- [ ] Error: an embed from Library content to a Workshop note, rendered as the marked unclickable affordance
- [ ] Warning: a topic that has Lessons but no cheat sheet
- [ ] A pre-commit hook exists, is not installed by the build, and warns on a changed `id` line relative to `HEAD`
