# Vault validation rules

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 02, 03, 06

## Question

What does the build validate about the vault, and what fails the build versus what warns?

[Vault structure and note schema](01-vault-structure-and-note-schema.md) decided three failure rules in passing — unknown `topic` value, duplicate filename across the vault, missing or hand-edited `id` — without anyone owning the full set. Later tickets will add more cases as they land.

To resolve:

- **The full rule set.** Collect every constraint the schema implies: required frontmatter per type, `topic` values naming existing `term` notes, vault-wide filename uniqueness (including `attachments/`), `id` present and immutable, `prerequisites` resolving, wikilinks resolving, quiz blocks parsing, problems carrying a solution.
- **Fail vs warn.** A dangling wikilink in a half-written lesson is normal authoring; an unknown `topic` is a typo that silently drops the note out of an index. These want different treatment. Does `draft: true` soften the rules for a note?
- **Cycles.** `prerequisites` form a graph that must be acyclic for sequencing to mean anything. Detected at build, or left to the author?
- **Immutability enforcement.** The `id` is load-bearing for review history but is just a line in a text file the dev can edit. Can the build detect a changed `id`, and against what baseline?
- **Where validation runs.** Build step only, or also a pre-commit check so a broken vault never reaches a commit?

## Rules added by ticket 02

[Wikilink resolution and backlink graph rules](02-wikilink-resolution-and-backlink-graph.md) decided:

**Errors**
- Two filenames whose stems differ only by case (macOS hides this until a case-sensitive build box finds it).
- A cycle in the `prerequisites` graph, or a note listing itself — the error must name the full cycle path.
- ~~A `![[note]]` embed or a block reference (`[[note#^abc]]`)~~ — **withdrawn by ticket 11**, see below.
- Two `cheat-sheet` notes claiming the same `topic`.

**Warnings**
- An unwritten body link — a wikilink whose target note does not exist. Deliberately asymmetric with ticket 01's hard failure on a missing `prerequisites` or `topic` target: a dangling body link is authoring intent, a dangling prerequisite is a broken sequencing graph.

## Context added by ticket 10

[How `/research` output lands in the vault](10-research-output-into-the-vault.md) added the **Workshop** class (`research`, `record`, `mission` — never rendered) and hands this ticket three rules:

- A wikilink from Library content to a **Workshop note** must **warn**, not fail, and render as an unclickable affordance. Its message is distinct from an unwritten link's — the target exists, it is simply invisible in the app — so the two cannot share a report line.
- `topic` is **optional on `research`** and validated only when present. This is the one Library-vocabulary field with a note type that may omit it.
- Filenames stay unique **vault-wide including `content/research/`**, whose notes are named after the question they answer specifically to avoid colliding with the `term` of the same name.


## Rule withdrawn by ticket 11

[Choose the build pipeline](11-choose-static-site-tooling.md) adopted Quartz and lifted ticket 02's bans on note embeds and block references, **with no rule replacing them**. This ticket loses that error and gains none.

The shape of what is left is worth noticing: every rule this ticket still owns is about **structure** — resolution, uniqueness, cycles, required fields, class boundaries — and none is about which Obsidian syntax is permitted. Syntax policing is no longer this ticket's business.

## Answer

### Policy

**Two severities, collect-all, exit non-zero.** `error` and `warning`, nothing else. Validation never aborts on the first failure — it collects every violation across the vault and exits non-zero if any error was found. A rename of one `term` breaks the `topic` of every note about it, and fail-fast turns that into one build run per note. An `info` level was rejected: the things that wanted it (the unwritten-notes ranking, vault hygiene) are *reports*, not rules that passed, and they belong on a different channel entirely — see **Reports are not validation** below.

**One rule module, two consumers.** Quartz's docs describe no way for a plugin to throw and fail a build, and say nothing about exit codes, so "the build fails" is not something the framework hands us. The rules therefore live in one module with two entry points:

- a **Quartz emitter** — the whole-corpus seam ticket 11 identified (`emit(ctx, content[], resources)` receives every transformed file) — which surfaces violations during `quartz build --serve` without killing the dev server;
- a **standalone CLI** (`npm run validate`) which is what CI actually gates on, independent of whether Quartz honours a throw.

Different consumers, one rule set. The rules are the asset; duplicating them is how the two paths start disagreeing.

**The CLI invokes Quartz's own pipeline** rather than doing its own frontmatter-and-regex parse. A validator that resolves links differently from the build is worse than no validator: it green-lights a vault that then breaks, or blocks one that is fine, and either bug costs a day to even believe. Ticket 02 put real subtlety into resolution — case-insensitive stem matching, pipe aliases, heading anchors, placeholder nodes for unwritten targets — and a second implementation drifts from it on the first edge case. The cost is that `npm run validate` pays roughly a build's runtime; Quartz's caching and `partialEmit` are what make that survivable, and correctness is worth the seconds regardless.

**CI is the hard gate; no pre-commit hook by default.** The hook is available, uninstalled. This is a single-author vault whose author is the only reviewer, and a pre-commit hook costing a full build taxes every mid-lesson save until `--no-verify` becomes reflex, which kills the gate outright. Nobody is blocked by a red branch but the dev, so catching it before deploy is soon enough — and the `--serve` emitter already gives the fast loop where it belongs, during the writing.

**`draft: true` softens nothing.** It controls publication, not validity. A second severity matrix keyed on a boolean doubles the rule surface to buy something the schema already provides: `prerequisites` is optional, so the escape hatch for a half-written lesson is to omit the field, not to point it at a note that does not exist. `draft` has exactly one effect here — an unpublished note's body links do not count toward the unwritten-notes ranking, so the authoring queue fills with committed intent rather than speculation.

**`id` immutability is not enforced by the build.** The build validates that `id` is present and a well-formed ULID; it does not check that it has not changed. Ticket 05 removed every consumer of record identity — the ULIDs survive as scheduler-ready anchors that nothing dereferences today — so a committed baseline artifact (`ids.json` or similar) would protect a value nothing reads, at the cost of one more file that drifts. A **pre-commit git diff against `HEAD`** that warns on a changed `id` line is nearly free and needs no new artifact, so it ships as a warning in the optional hook. It must never be the thing that makes committing hard.

**Structural rules are vault-wide; link rules are class-aware.** `id`, `title`, required fields, and filename uniqueness apply to every note including Workshop — ticket 10 kept `content/research/` inside the vault-wide uniqueness set, which is only meaningful if it is checked. Body links out of Workshop warn on unwritten targets like anywhere else. The direction carrying a distinct message stays as ticket 10 set it: Library → Workshop warns, because the target exists and is merely invisible.

**Typed edges constrain the target's type, at two tightnesses.** `topic` must name a **`term`** — not a new rule, just ticket 01's controlled vocabulary finally enforced rather than assumed. `prerequisites` and `practices` must name **Library content**, and deliberately *not* only a `lesson`: "you need Big-O first" pointing at the `term`, or at a `reference`, is legitimate authoring, and narrowing to lessons forbids it for no gain. Workshop targets **error** here — stricter than ticket 10's Library→Workshop body-link *warning*, and deliberately so: a body link is prose, a `prerequisites` entry is the sequencing graph.

This produces an asymmetry on `practices` that is correct: ticket 06 lets an **unwritten** link satisfy it, so a target that does not exist **passes** while a target that exists with the wrong type **fails**. Unwritten is intent; wrong-type is a mistake.

**One ULID namespace.** Note `id`s and quiz-block ULIDs are checked for uniqueness together. ULIDs do not collide by construction, so any duplicate — note/note, block/block, or note/block — is a copy-paste of an existing note or block, which is the authoring accident worth catching. Two namespaces means two checks, a rule to explain, and tolerance for a collision that should never be tolerated.

### The rule set

Per-type required fields are ticket 01's table as amended by ticket 10 (`research`: `id`, `title`, `date`, `sources`; `topic` optional) and by ticket 14 (`cheat-sheet`: `topic` required and **scalar**; `draft` optional).

**Errors**

*Schema and identity*
- A required frontmatter field is missing for the note's type.
- `id` is missing, or is not a well-formed ULID.
- A ULID appears twice anywhere in the vault (notes and quiz blocks, one namespace).
- Two filenames whose stems collide case-insensitively, vault-wide including `attachments/` and `content/research/`. *(ticket 02 — macOS hides this until a case-sensitive build box finds it.)*

*Vocabulary and edges*
- A `topic` value naming a note that does not exist, or that exists but is not a `term`.
- A `prerequisites` target that does not exist, or that is not Library content.
- A `practices` target that exists but is not Library content. *(A nonexistent one passes — ticket 06.)*
- A cycle in the `prerequisites` graph, or a note listing itself. The error names the full cycle path. *(ticket 02.)*
- Two `cheat-sheet` notes claiming the same `topic`. *(ticket 02 — mechanically checkable now that `topic` is scalar on this type.)*
- A list-valued `topic` on a `cheat-sheet`, including a list of one. *(ticket 14 — the scalar shape is what makes one-per-topic checkable.)*

*Problems (ticket 06)*
- Unknown `kind`.
- Unknown `difficulty`.
- A missing per-kind required H2 section.
- A quiz fence inside `problems/` — practice units never nest.

*Quiz fences (ticket 03)*
- An unparsable fence body.
- A missing or malformed ULID in the infostring.
- An unknown type word in the infostring.
- An `mcq` without exactly one `[x]`.

**Warnings**
- An unwritten body link — a wikilink whose target note does not exist. Deliberately asymmetric with the hard failure on `prerequisites` and `topic`: a dangling body link is authoring intent, a dangling prerequisite is a broken sequencing graph.
- A topic that has Lessons but no `cheat-sheet`. *(ticket 14 — not an error, since ticket 09 lets a Term carry only Problems or exist only to be linked; not silent, since `author` maintains this on every run, so absence is drift.)*
- A body link from Library content to a **Workshop** note. Distinct message from the above — the target exists, it is simply invisible in the app — so the two never share a report line.
- *(optional pre-commit hook only)* A frontmatter `id` changed relative to `HEAD`.

**Deliberately not validated**
- **`id` immutability**, as a build rule. See policy above.
- **Equal-length MCQ options** (ticket 03's convention). Authoring craft with no crisp threshold; a length heuristic fires on correct content constantly.
- **An empty `term` body.** *(ticket 14.)* `author` mints Terms mandatorily the moment a topic is first used, ahead of anyone having something to say about them, so this would fire on every correctly-created Term until backfilled — noise by construction. The backlog belongs on the reports channel.
- **Cheat-sheet length**, against the durable-20% discipline. *(ticket 14.)* A word count is an arbitrary number pretending to be a structural fact; the discipline lives in `CHEAT-SHEET-FORMAT.md`, where `author` reads it on every update.
- **Cheat-sheet body structure.** *(ticket 14.)* No named-heading contract — unlike Problems, nothing in the build keys off a cheat sheet's sections, and a contract the build never reads can only be violated, never enforced.
- **Vault hygiene** — unreferenced attachments, `term` notes nothing points at, Library notes with no inbound links. None is a defect: an unused attachment is a picture not used *yet*, an unlinked `term` is exactly the placeholder ticket 01 sanctioned ("topics that are areas rather than vocabulary still get a `term` note"), and an orphan lesson is one written before the note that will link it. A warning that fires on correct authoring is noise that gets filtered, and it takes the real warnings with it.
- **Block references**, which stay out by convention, not by build error. *(ticket 11.)*
- **Obsidian syntax generally.** Every rule above is structural — resolution, uniqueness, cycles, required fields, class boundaries. Ticket 11 ended this ticket's syntax-policing business and nothing replaced it.

### Reports are not validation

Ticket 02 had the build carry unwritten links as placeholder nodes so notes could be **ranked by inbound links** — the authoring queue. That ranking ships from the same run but is **not a validation result**: nothing is wrong when it prints. It gets its own artifact and never shares the pass/fail channel, which keeps the map's **Authoring feedback surface** question ("terminal, a page in the app, or a note in the vault") genuinely open rather than pre-decided here. The hygiene facts ruled out above belong to that same channel if they are ever wanted.

**Terminal format** is fixed here: grouped by note, `path:line` where a line exists, severity-prefixed, with counts and the exit code at the end. The shape every linter has, because it is the shape editors and CI logs already parse.

### This ticket resolves as a living rule set

**Cheat sheet note type** (14), **Problem authoring skill** (16), and **Quiz fence re-parsing under Quartz** (17) are open and will each hand this ticket rules, exactly as 02, 06, 10, and 11 already did. It resolves now anyway. What it owns is *policy* — two severities, collect-all, one module with two consumers, draft softens nothing, CI gates, edges typed by class — and that policy is stable no matter how many individual rules land later. Blocking it would make it resolve last, after everything that wants to depend on it: ticket 16's authoring skill needs to know what the validator rejects *before* it is written. The rule table is an appendix that grows; the ticket was done when the policy settled.

### Surfaced by this ticket

The Library→Workshop warning fires on `![[research-note]]` too, since an embed is a wikilink — which partly softens ticket 11's accepted risk ("nothing to catch it" becomes "warned, never blocked"). But ticket 10 specified that a Library→Workshop link *renders as an unclickable affordance*, and what that means for an **embed** is undecided: does it still transclude the Workshop content, or degrade to the affordance? Raised as [Library-to-Workshop embed rendering](18-library-to-workshop-embed-rendering.md).

## Amended by ticket 14

[Cheat sheet note type](14-cheat-sheet-note-type.md) landed the `cheat-sheet` frontmatter row (`topic` required and scalar), one error (list-valued `topic` on a cheat sheet), one warning (a topic with Lessons but no cheat sheet), and three entries under *Deliberately not validated* (empty `term` body, cheat-sheet length, cheat-sheet body structure). The policy this ticket owns is unchanged — the first living-set append landed exactly as predicted.

## Appended by ticket 15

[Vault search](15-vault-search.md) adds one rule to the living set.

| Severity | Rule | Rationale |
| --- | --- | --- |
| error | A note must not author a `tags` frontmatter field, on any type. | Ticket 15 has the build derive `tags` from `topic` to feed Quartz's search index. A hand-written `tags` is either silently overwritten or silently merged, and either way the vault grows a second, uncontrolled topic vocabulary beside the controlled one from [ticket 01](01-vault-structure-and-note-schema.md). Trivial to detect, trivial to fix. |

## Appended by ticket 17

[Quiz fence re-parsing under Quartz](17-quiz-fence-under-quartz.md) adds no rule. It constrains the **messages**.

The quiz fence body is parsed by our own transformer and injected as a subtree, so its mdast nodes carry offsets relative to the **fence body**, not to the file. remark-obsidian's `customTaskCharTransform` slices the whole-file source at each `listItem` offset and runs *after* us, so leaving the offsets unshifted corrupts `dataTaskChar` on exactly the GFM task list [ticket 03](03-quiz-block-schema.md) chose as the MCQ option format.

The one-line fix — strip `position` from the injected subtree, so the transform skips our nodes — **costs this ticket line numbers inside quiz bodies**. A violation in a quiz option would then report the note but not the line. The alternative is to shift the offsets by the fence's start position, which keeps line numbers at the cost of carrying the arithmetic. Not decided here: it is one implementation choice with a stated trade, and this ticket's policy — two severities, collect-all, CI gates — is untouched either way. Flagged so that whoever implements the transformer knows a validator ergonomic is riding on it, rather than discovering it as a regression.

## Appended by ticket 18

[Library-to-Workshop embed rendering](18-library-to-workshop-embed-rendering.md) adds one rule and one deliberate non-rule.

| Severity | Rule | Rationale |
| --- | --- | --- |
| error | A Library note must not embed (`![[…]]`) a Workshop note — `research`, `record`, or `mission`. | Quartz resolves non-media embeds **client-side**, by fetching the target's rendered page; a Workshop note has none, so the embed renders as nothing. This is broken output, not an authoring smell. It is an **error** where the Library→Workshop *link* from [ticket 10](10-research-output-into-the-vault.md) stays a **warning**, because a link that points at Workshop can be deliberate — a note awaiting promotion — while an embed that targets it is always a stale link or an agent bug: `author` and `import` never emit one. |

The build additionally **converts** such an embed to ticket 10's marked, unclickable affordance rather than leaving the silent empty transclude box. That is a rendering behaviour, not a rule, and it lives in the same order-25 transform as [ticket 17](17-quiz-fence-under-quartz.md)'s fence handling.

Under *Deliberately not validated*:

- **A Workshop note embedding a Library note.** *(ticket 18.)* `![[Big-O]]` inside a Research note. The rule is **directional**, and the direction is the whole point: Workshop never renders, so nothing can leak outward, and the embed is useful while authoring in Obsidian. Recorded here so the table shows it was considered rather than overlooked.

## Appended by ticket 20

[How `import` obtains a problem's text](20-prompt-acquisition-for-import.md) adds one rule and one deliberate non-rule.

| Severity | Rule | Rationale |
| --- | --- | --- |
| error | A pointer problem's `source` must hold at least one well-formed URL. | [Ticket 06](06-problem-bank-note-format.md)'s `source` was a scalar, where present-or-absent was the only question and the per-type required-fields check already covered it. Ticket 20 made it an **ordered list**, which makes an empty list newly expressible — `source: []` satisfies "the field exists" while leaving the note with no way to reach the prompt it points at. The first entry is load-bearing (it is the attempt link), so an empty list is a broken pointer problem, not a stylistic one. |

Under *Deliberately not validated*:

- **Whether the paraphrase reproduces the source prompt.** *(ticket 20.)* The obvious rule — no run of N words shared with the source — **cannot be written**, because the source text is deliberately not in the repo, so there is nothing to diff against and the rule could never run. The guard is structural instead and lives in `PROBLEM-FORMAT.md`: the recall path has no source text to copy from, a pasted prompt is a working input that is never quoted or stored, and ticket 06's one-line what-not-how constraint makes a reproduction impossible at that length. Recorded here so the absence reads as a decision rather than an oversight.

## Appended by ticket 19

[Authoring feedback surface](19-authoring-feedback-surface.md) adds **no rule**. It closes the conditional this ticket left open and adds one constraint plus one deliberate non-rule.

This ticket split the *reports* off the validation channel and left their destination genuinely open ("if they are ever wanted"). It is now settled: they land on the **Vault report**, a page emitted by the build at `/report`, in two sections — an authoring queue (unwritten notes ranked by inbound links, plus empty Terms) and vault hygiene. The channel discipline this ticket set is unchanged and reinforced: **validation shouts, the report whispers a pointer** — each build prints one summary line pointing at the page, and nothing about pass/fail moves.

Every item this ticket parked under *Deliberately not validated* now has a stated home rather than a conditional one:

- the **empty `term` body** *(ticket 14)* → the authoring queue, alongside unwritten notes, because an empty Term is a note waiting to be written and not a defect;
- **unreferenced attachments** and **Library notes with no inbound links** → vault hygiene, unchanged;
- **`term` notes nothing points at** → vault hygiene, **narrowed to "no inbound `topic` edge"**. As parked, it was two facts under one name: nothing being *about* a topic is a real signal (a stale rename, or one of [ticket 01](01-vault-structure-and-note-schema.md)'s area-Terms), while no inbound links *of any kind* fires constantly on correct authoring. The wide reading would have reproduced on the report channel exactly the noise-drowns-signal failure this ticket rejected an `info` severity to avoid.

**Constraint on the implementation.** The vault report must be **emitted as a page** and must never be generated as a virtual `content/` file fed through the transform pipeline. The shortcut looks tidier and breaks the orphan section silently: were the report's own links to become link-graph edges, the report would link to every orphan it lists, each would acquire an inbound link, and the section would erase itself on the second build. Ticket 19 records the same cycle as the reason a build-authored *note* was rejected outright.

Under *Deliberately not validated*:

- **Anything on the report channel, ever.** *(ticket 19.)* Not a new entry so much as the principle behind the existing ones, now that the channel has a destination: the report exists precisely because nothing is wrong when it prints. A fact that would justify failing a build is a rule and belongs in the tables above; a fact that would not is a report and belongs at `/report`. There is no third severity and no promotion path between the two.
