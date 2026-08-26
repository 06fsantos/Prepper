# Problem authoring skill

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 06, 09

## Question

What skill authors `problem` notes, and what does it do?

[Ticket 09](09-fork-teach-to-emit-markdown.md) scoped `author` to lesson, term, and cheat sheet — the taught content. `reference` belongs to `/research` ([ticket 10](10-research-output-into-the-vault.md)). That leaves `problem` unowned, and it is the one Library type nothing currently authors.

It was deliberately kept out of `author`: curating an interview problem is a different act from teaching, and the map's standing decisions rule out agent-generated problems (plausible questions with subtly wrong or unverifiable answers). Whatever this skill is, it must keep the dev in the curator's seat.

To resolve:

- **Whether it is a skill at all**, or a documented convention plus a template the dev fills in by hand. The act is curation, not generation, so the agent's contribution may be small.
- **Pointer problems.** [Ticket 06](06-problem-bank-note-format.md) made these legitimate: a `source` URL plus a one-line paraphrase in the dev's own words. Paraphrasing someone else's prompt is the one sub-task an agent is clearly good at — and the one where it must not drift into reproducing the original.
- **The sealed sections.** `## Solution` and `## Complexity` are sealed and dev-authored. Does the agent draft them for the dev to correct, or stay out entirely? This is where the wrong-answer failure mode bites hardest.
- **`practices` wiring.** Required, but an unwritten link satisfies it, which makes unwritten-note ranking the authoring queue. Does this skill consume that queue — authoring problems for topics that lessons already cover — and does it hand work back to `author` the other way?
- **Difficulty calibration.** `difficulty` is within-kind and never sorted across kinds. Who judges, against what.
- **Relationship to `author`.** Separate skill, a mode of `author`, or a sibling that shares its FORMAT docs.

## Answer

### `import` — a separate skill

A new first-party skill, `import`, sibling to `author`. Not a mode of it, despite [ticket 10](10-research-output-into-the-vault.md) having set the precedent for modes with `/author reference`.

`author` is ~60% inherited teaching philosophy ([ticket 09](09-fork-teach-to-emit-markdown.md)) — fluency vs storage strength, ZPD, knowledge vs skills, wisdom. **None of it fires here.** There is no zone of proximal development in "add these fifteen LeetCode problems". A mode would be a skill whose two halves share no reasoning, only a directory.

What they *do* share is vault mechanics, and those live in FORMAT docs: **every ULID minted by running a command, never typed**; frontmatter shape; and **`import` never sets `draft`**, inheriting ticket 09's rule unchanged (see the review gate below — nothing here needed a divergence). `import` ships `PROBLEM-FORMAT.md`.

The name states the honest thing. This imports prompts that exist elsewhere; it does not compose them.

### The standing decision, amended

The map's standing decisions said *"curated problem corpus, authored by the dev — not agent-generated,"* justified by "plausible questions with subtly wrong or unverifiable answers."

**That rationale is about invented questions, and it does not reach an imported one.** Every prompt in this corpus comes from a real source — LeetCode, published interview-question lists — so the question is neither invented nor unverifiable, and the canonical solution to a well-known problem is among the safest things an agent can write. The ban narrows accordingly:

> The agent may not **invent** problems. It may author solutions to **real, externally-sourced** ones.

This is what unlocks the whole ticket: without it, the dev hand-writes hundreds of solutions to problems they are importing precisely *because* they have not done them yet.

### Scope: two kinds of three

`import` handles **`coding`** and **`system-design`**.

**Behavioural problems are hand-authored by the dev** against `PROBLEM-FORMAT.md`. The agent can write a solution to *Course Schedule*; it cannot write one to *"tell me about a time you disagreed with your manager"*, because that answer is the dev's own story and an invented one is worse than none. A middle path was considered and rejected — importing behavioural notes whose `## Solution` holds what the question probes rather than an answer, extending the per-kind asymmetry [ticket 06](06-problem-bank-note-format.md) already established for system-design — in favour of leaving the kind entirely alone.

`PROBLEM-FORMAT.md` **states this exclusion explicitly**. The silent version reads as an oversight to anyone later wondering why the importer skips a kind ticket 06 defined; written down, it is the ticket's original "maybe it is just a convention plus a template" option surviving for one kind out of three.

### Batch-shaped, and safe to run twice

The realistic invocation is *"add these fifteen"*, not *"add this one"*. `import` takes a list and writes one note at a time.

- **Halts on the first problem it cannot identify.** *(Amended by [How `import` obtains a problem's text](20-prompt-acquisition-for-import.md) to defer-and-ask-once — see below.)* If the agent is not confident which problem a URL and title name, it stops and asks rather than guessing. A hallucinated prompt is the one failure mode here that poisons the vault silently — everything else is visible in the diff.
- **Duplicates are skipped and reported**, matched on the `source` URL, falling back to title. *(Amended by [ticket 20](20-prompt-acquisition-for-import.md): `source` is now a list, so the match is **any URL in common**, falling back to title.)* Never overwritten: a silent overwrite destroys a solution the dev may have hand-corrected. Never halting the batch either — fifteen problems should not be punished for one repeat. Skip-and-report is the only option that is safe to re-run, which matters because the input is a hand-assembled list that will inevitably be re-pasted.

This batch shape, more than anything else, is what makes `import` a different artifact from `author`: a review-gated bulk importer, not a conversational authoring loop.

### What the agent writes

Everything except the behavioural kind and the dev's judgement about *what* to import:

- **`## Prompt`** — the one-line paraphrase [ticket 06](06-problem-bank-note-format.md) requires beside the `source` URL. It must state *what you are asked for*, never *how*: a paraphrase that leaks the approach is a spoiler sitting in an unsealed section.
- **`## Solution`** and **`## Complexity`** — both agent-authored. Complexity is downstream of an approach, so an agent that can write the complexity analysis already has the solution in mind; splitting them was incoherent.
- **`## Hints`** — agent-written and **optional**. The ladder is derivative of the solution the agent just wrote, it is mechanical work no one wants to do 200 times, and a bad hint has a small blast radius: it is a nudge, sealed behind a click, not an answer. No section is required by ticket 06's matrix, so a bulk import that skips hints still produces valid notes.
- **`difficulty`** — agent-assigned, **copying the source's label verbatim where there is one**. It is the scale the dev already reads on every external problem, and re-deriving it invents disagreement with the site the problem lives on. Low-stakes by the dev's own assessment.
- **`topic` and `practices`** — with **missing `term` stubs minted**, exactly as `author` does. Refusing to import a problem whose topic has no term would invert the authoring order ticket 06 deliberately protected: it made `practices` satisfiable by an *unwritten* link precisely so the problem bank could run ahead of the lessons, and a hard `topic` requirement would re-impose through the back door the constraint ticket 06 removed through the front. Unwritten `practices` targets are expected and correct — that is the authoring queue populating itself.

### Solutions are written in C#

Ticket 06 never fixed the solution language and it could not stay open: `## Solution` on a coding problem is code.

**One language for the whole vault**, not per-problem. Cross-problem comparison only works in a single idiom, and one language means one runtime for any future verification step.

**The repo being TypeScript is irrelevant to this choice.** The build stack is a fact about the app; the solution language is a fact about the interviews being prepared for. They were kept apart deliberately rather than allowed to default into each other — the same unexamined-assumption trap [ticket 08](08-static-site-tooling-for-obsidian-vaults.md) fell into when it scoped itself to JavaScript.

### The review gate: informal, by deliberate choice

The dev reads the diff before committing. **No `draft: true`, no per-problem in-session approval.**

Both alternatives were on the table. Per-problem approval defeats the point of batching. `draft: true` would have made "unreviewed" a queryable state in the vault instead of something the dev has to remember across fifteen notes, at the cost of diverging from `author`'s never-set-`draft` rule — a divergence justifiable by *attendance* rather than authorship (`author` writes one note with the dev in the conversation; `import` writes fifteen unattended). It was declined, and dropping the behavioural kind removed the one case that structurally needed it, so `import` inherits ticket 09's rule cleanly with nothing to explain.

**Accepted risk, stated plainly.** Executing each coding solution against the problem's sample cases in a scratch project — cheap, since `dotnet` 8.0.401 is already on the dev's PATH — was proposed as the compensating control for having no draft gate, agreed to, and then **deferred**: not needed yet, revisitable if it proves useful. The consequence is that **nothing structural stands between a subtly-wrong agent-written solution and a commit** except the dev reading the diff. This is a deliberate, reversible position, not an oversight. Carried to the map as fog.

### No authoring queue

`import` does **not** open with a coverage report — topics carrying lessons but no problems, thin kinds — and does not consume the unwritten-note ranking as a work queue.

`author`'s ZPD legitimately picks the next lesson because teaching order is a pedagogical judgement the skill is equipped to make. Problem selection is not: which problem is worth curating depends on what the dev saw in an interview last week, which is nowhere in the vault. **The dev drives what gets imported.**

The problem→lesson direction is unaffected and still automatic: unwritten `practices` targets accumulate inbound links, and that ranking remains the authoring queue [ticket 06](06-problem-bank-note-format.md) made it.

### Carried out of this ticket

- **Prompt acquisition** — how the agent obtains a problem's text in order to paraphrase and solve it (browse the URL, dev pastes it, or work from recall of the named problem) — was parked and is sharp enough to state, so it graduates to [How `import` obtains a problem's text](20-prompt-acquisition-for-import.md). It is load-bearing: the halt-on-unidentified rule above assumes an answer to it.
- **Execution verification** — deferred as above, recorded as fog on the map.

### Vocabulary

**No `CONTEXT.md` changes.** This ticket added no note types and no new domain terms; `Pointer problem` already names the imported-prompt case, and `import` is a tool, not domain vocabulary.

## Amended by ticket 20

[How `import` obtains a problem's text](20-prompt-acquisition-for-import.md) supplied the mechanism this ticket's halt rule presupposed, and changed the rule's shape in the process.

**Acquisition is recall-only**, scoped to the NeetCode canon, with a dev paste as the fallback. Nothing is fetched: LeetCode 403s a plain fetch and neetcode.io renders client-side, so browsing survives only as driving the dev's logged-in Chrome, which was declined.

**Halt-on-first becomes defer-and-ask-once.** The run writes every item that passes the confidence gate, collects the ones it cannot identify, and asks for those prompts in a single ask at the end. This is the reasoning this ticket already applied to duplicates — fifteen problems should not be punished for one — and it only became available once the gate below made a miss mean *one off-canon item* rather than *the agent has lost the plot*.

**The gate is two tests**: on the NeetCode list is above the line and off it is presumed below; and, before writing, the agent must produce the problem's constraints and one worked example from recall. The second test guards **identification** specifically, which the published-solutions argument does not reach — an agent can be right about the canonical solution to *Course Schedule* while having misidentified an item that was *Course Schedule II*.

**Duplicate matching** follows `source` from scalar to list: any URL in common, falling back to title.
