# Problem bank note format

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 01

## Question

How is a curated interview problem stored as a note?

Problems are author-curated, not agent-generated, so the format has to be pleasant to write by hand as well as machine-readable.

To resolve:

- **Note contents.** Prompt, constraints, worked solution, complexity analysis, common follow-ups, links to the lessons that teach the underlying technique.
- **Solution concealment.** The solution lives in the same file the reader can open in Obsidian. Decide how the app hides it until attempted, and accept that the vault itself offers no concealment.
- **Problem kinds.** Coding problems, system-design prompts, and behavioural questions have very different shapes. One note type with optional fields, or separate types?
- **Attempt history.** What an attempt records — outcome, time taken, notes-to-self — and where it lives (ticket 07 owns the storage; this ticket owns the shape).
- **External problems.** Whether a note can be a pointer to a problem hosted elsewhere rather than containing the prompt itself.

## Answer

### One type, three kinds

One `problem` note type in `problems/`, with a **required `kind` frontmatter field**: `coding` | `system-design` | `behavioural`.

Three separate note types were rejected: they share every cross-cutting field (`id`, `title`, `topic`, `difficulty`, `practices`) and differ only in which body sections are required, so the split would triple the directory count and the validation surface to express one matrix row.

`kind` is **declared, never inferred** from which sections happen to be present — the same rule the quiz infostring settled in [Quiz block schema](03-quiz-block-schema.md). This is a deliberate exception to ticket 01's "type is the directory, so there is no `type` field": `kind` is a sub-classification *within* one directory and has no path to be derived from.

### Body sections

**Named H2 headings are the contract**, matched by heading text: `## Prompt`, `## Constraints`, `## Hints`, `## Solution`, `## Complexity`, `## Follow-ups`. The build folds the AST on heading boundaries; no bespoke parser, and the sections show up in Obsidian's outline as ordinary structure.

Fenced blocks (the ```quiz trick) were rejected here: a solution is long and routinely contains its own code fences, which is precisely the nested-fence problem ticket 03 deferred code-completion quizzes over.

Required sections:

| kind | required |
|---|---|
| coding | `Prompt`, `Solution`, `Complexity` |
| system-design | `Prompt`, `Solution` |
| behavioural | `Prompt`, `Solution` |

The matrix's only real content is **coding requires `## Complexity`** — a coding solution with no complexity claim is an incomplete answer for interview prep specifically, and it is the section most likely to be skipped when authoring in a hurry. Beyond that, per-kind requirements would invent structure the dev has not asked for.

Accepted asymmetry: `## Solution` on a system-design note is a **discussion**, not a right answer. Same heading, different contract — acceptable because concealment only needs the region to exist.

### Solution concealment

Purely an app-side rendering rule. The vault offers no concealment and does not pretend to: Obsidian shows the whole file, and that is correct for the author.

**`## Solution` and `## Complexity` are sealed**; everything else renders open. Complexity is a spoiler in exactly the way the solution is — "O(n) time, O(n) space" tells you it is a hash map — and sealing it costs nothing, since the reader who wants it is one click away. `## Follow-ups` stays open: it is a "what next" prompt rather than an answer, and reading it before attempting sharpens the attempt.

Each sealed section unseals **independently, expanding in place** on click. In place rather than a separate route: it holds scroll position and keeps the build free of a second page per problem.

### Hints

`## Hints` holds an **ordered list, one hint per top-level item**, revealed one at a time by a "next hint" control. The ordered list *is* the ladder — the ordering is semantic, not decorative, and Obsidian renders it as a readable numbered list with no notation Obsidian lacks, the same bar [Lesson reading experience](04-lesson-reading-experience.md) used to cut margin notes. H3 subheadings would put every hint in the document outline, noise in a five-hint problem. A hint needing a code block is one list item with a fenced child.

### Pointer problems

A problem note **may point at an externally hosted prompt**: `source` holds the URL(s) and `## Prompt` holds a one-line paraphrase in the dev's own words. *(Amended by [How `import` obtains a problem's text](20-prompt-acquisition-for-import.md): `source` is an **ordered list** of URLs, first one the attempt link, and it is a **reader affordance only** — no agent ever reads it.)*

This is the honest version of what will happen — the dev will not retype a thousand LeetCode prompts, and copying them in is a licensing problem in a repo that may go public. The paraphrase is not optional: it keeps the note self-describing in the topic index and in search. The dev's value-add is the `## Solution` and the `practices` links, not the prompt.

### `difficulty`

Controlled vocabulary of exactly three — `easy` | `medium` | `hard` — validated at build like `topic` is. It matches the scale the dev already reads on every external problem, so there is no translation step at authoring time. An integer scale invites precision the dev cannot calibrate; free text drifts (`Medium` / `med` / `moderate`) exactly the way ticket 01 refused to let tags drift.

**Difficulty is within-kind, not comparable across kinds.** A `hard` behavioural question and a `hard` graph problem are not the same claim, so the app never sorts a mixed-kind list by difficulty alone: kind groups first, difficulty within. The field stays required for all three kinds — dropping it for the non-coding kinds would lose the one handle the dev has for picking a practice unit on a low-energy day, which is the purpose ticket 01 gave it when it refused to put difficulty on lessons.

### `practices`

**Required, at least one, and an unwritten link satisfies it.**

Required, because a problem bank that does not connect to the lessons is a folder of files rather than a link graph. Satisfiable by an unwritten link, because requiring an existing target inverts the authoring order — the dev imports problems long before the lessons exist. Ticket 02 already built the machinery: unwritten links warn, render as a marked affordance, and are carried as placeholder nodes ranked by inbound links. That ranking **becomes the authoring queue** — the lesson the most problems want is the next lesson to write.

Deliberate exception: ticket 01 made an unknown `topic` and an unknown `prerequisites` target hard build failures. `practices` is not one.

### No quiz blocks in problems

The build **fails** on a ```quiz fence anywhere in `problems/`. CONTEXT.md defines a practice unit as "a Problem or a Quiz block" — one flat set — and a quiz inside a problem makes one practice unit contain another. The reader who has opened a problem is already in attempt mode; an MCQ that grades on click mid-attempt is a different, easier interaction wearing the same clothes. `## Follow-ups` is the tempting exception and still loses: a follow-up's value is that it is open-ended.

### Dead on arrival

- **Attempt history.** The ticket asked what an attempt records. Nothing: [Spaced-repetition model](05-spaced-repetition-model.md) cut all per-user state, and attempting a problem is ephemeral. The ticket text predates that resolution.
- **Links to the teaching lessons.** Already decided in [Wikilink resolution](02-wikilink-resolution-and-backlink-graph.md) as the `practices` field; this ticket only fixed its requiredness.

### Surfaced by this ticket

Four validation rules for [Vault validation rules](13-vault-validation-rules.md): unknown `kind`, unknown `difficulty`, missing per-kind required section, quiz fence inside `problems/`. Ticket 13 is unblocked by this resolution.

### Vocabulary

Terms captured in [CONTEXT.md](../../../CONTEXT.md).

## Amended by ticket 15

[Vault search](15-vault-search.md) constrains how sealing is built. This ticket left "unseals in place on click" implementation-free; it no longer is.

**`## Solution` and `## Complexity` must seal with CSS alone**, no JS initialisation. Quartz's search UI has a preview pane that fetches a result's real HTML and injects its elements, so a Problem's solution markup appears outside its own page — where a JS-initialised seal would never run and the solution would render open. Pure-CSS sealing seals wherever the markup lands, and is additionally correct with JS disabled.

**Hints keep the freedom to use JS** — revealing a ladder one rung at a time likely requires it, and a hint is not the spoiler a solution is.

Ticket 15 also decided that sealed sections **remain in the search index**: they are findable, and the spoiler is handled by suppressing the result excerpt for `problems/`, not by making solutions unsearchable.

## Amended by ticket 20

[How `import` obtains a problem's text](20-prompt-acquisition-for-import.md) changes two things about `source`.

**It is an ordered list of URLs, not a scalar.** A problem typically has both a LeetCode page and a NeetCode page, and both are worth carrying: the first entry is the link you would click to *attempt* the problem, the rest are further reading. Rejected alternatives: a scalar plus a named `neetcode:` field, which bakes today's corpus source into the schema where the next one would need its own field; and labelled `{url, label}` entries, since the label is derivable from the host — the page renders `leetcode.com` / `neetcode.io` chips off the URL with nothing authored and nothing to drift.

**It is a reader affordance, never an input.** This ticket's wording made `source` sound like the place the agent goes to read the prompt. It is not: ticket 20 resolved acquisition as recall-only, with nothing fetched from anywhere. `source` exists so the dev can click through and attempt the problem.
