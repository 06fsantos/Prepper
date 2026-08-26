# Prepper — spec

Labels: `ready-for-agent`
Parent: [Prepper — wayfinder map](map.md)

## Problem Statement

The dev is preparing for software-engineering interviews and has nowhere coherent to put what they learn. Notes accumulate as a flat pile of Markdown: a Lesson on hash maps has no stated relationship to the Big-O Lesson it assumes, or to the three LeetCode problems that drill it. Finding the note that explains a thing means remembering where it was filed, and re-reading a topic before an interview means opening six files and skimming for the parts that matter.

The obvious fixes each break something the dev wants to keep:

- **Obsidian alone** gives links and search but no practice — a question written into a note is just text, and a solution sits in plain sight next to the problem it spoils.
- **A flashcard app (Anki, RemNote)** gives practice but takes the content hostage: prose lives in a proprietary store, and prose is most of what interview prep is.
- **A published static site** gives a readable library but is a one-way export — the authoring surface and the reading surface stop being the same thing, and they drift.

Underneath all three is one requirement: the stored form must stay Markdown the dev can open, edit, and link in Obsidian, and the reading surface must be a rendering of exactly that — never a second copy. And what makes the pile a pile rather than a library is that nothing computes across the whole corpus: no backlinks, no topic index, no way to see that four Problems are all waiting on a Lesson that was never written.

## Solution

**Prepper is a static web app that renders an Obsidian vault as a linked, navigable interview-prep library with practice in place.**

`content/` is a real Obsidian vault inside the app repo. Markdown is the sole stored form; `[[wikilinks]]` are real links; HTML is only ever a rendered output. The build resolves links, folds the whole corpus into a link graph, validates the vault, and emits a static site. Nothing is stored per user — no accounts, no progress, no schedule, no server. The build is a **pure function of `content/`**.

The reader — the dev — opens the app and browses. A sidebar tree keyed by **topic** (not by directory) is the front door. A Lesson reads as prose with **quiz blocks** in the flow that grade on click and record nothing. A Problem shows its prompt and hides its solution behind a seal the reader opens when they are ready, with hints revealed one rung at a time. A Term page carries the generated index of everything about that topic. A Cheat sheet gives the 20% of a topic that buys 80% of the understanding, for the night before.

Nothing is ever gated. Prerequisites are a signal, never a lock. There is no reading order, because the dev jumps around.

Content is authored **offline, by the dev**, running terminal skills that write Markdown into the vault: `author` for Lessons, Terms, Cheat sheets, and References; `import` for Problems from the NeetCode canon; `/research` for investigations that stay in the vault and are never published. The app itself never invokes an agent and holds no keys.

Every note is in one of two classes, and the boundary is what keeps the dev's workshop out of the reader's library:

- **Library** — `lesson`, `reference`, `problem`, `term`, `cheat-sheet`. Rendered, indexed, in the graph.
- **Workshop** — `research`, `record`, `mission`. In the vault, visible in Obsidian, never a page and never a node.

The build talks back on two channels that never share a line. **Validation** shouts: errors fail CI. The **Vault report** whispers: a page at `/report` answering *what should I write next* and *what has rotted*.

## User Stories

### Reading the library

1. As the dev, I want the app to open on a topic index, so that I can pick what to study without the app pretending it knows what is due.
2. As the dev, I want a persistent sidebar tree keyed by topic, so that navigation answers "what shall I study today" — which I ask in topics, never in directories.
3. As the dev, I want a note that is about two topics to appear under both in the tree, so that the many-to-many-ness the vault was designed around is visible rather than deduped away.
4. As the dev, I want the sidebar to group a topic's leaves by note type with the Cheat sheet pinned first, so that the quick-catchup document is the first thing I see under a topic.
5. As the dev, I want a flat alphabetical "Cheat sheets" list in the sidebar, so that I can go straight to a condensed topic without navigating into it.
6. As the dev, I want the sidebar to go off-canvas below ~900px, so that the app is usable on a phone.
7. As the dev, I want the prose column to hold a ~38rem measure regardless of viewport, so that long-form reading stays comfortable and the sidebar takes the leftover width rather than squeezing the text.
8. As the dev, I want body prose set in a serif, so that Lessons read like documents rather than like documentation.
9. As the dev, I want no breadcrumb, no next/previous, and no progress bar, so that the chrome does not imply a reading order that does not exist.
10. As the dev, I want a note's topics rendered as chips under its title, so that its several subjects are stated honestly rather than one being picked arbitrarily.
11. As the dev, I want a Term page to carry the generated index of every Library note about that topic, so that "what is here on Big-O" is answered by the graph rather than by a hand-maintained list.
12. As the dev, I want the Term page and the sidebar tree to be two views of one generated index, so that there is never a second index to maintain.
13. As the dev, I want a Term with no Lessons to be able to carry an area overview in its body, so that a topic like "System Design" has somewhere to explain itself.
14. As the dev, I want a Cheat sheet to stay short as its topic grows, so that it remains the 20% filter rather than becoming an accumulating summary.

### Links and the graph

15. As the dev, I want `[[wikilinks]]` to resolve against the filename stem, case-insensitively, so that the same link works in Obsidian and in the app.
16. As the dev, I want `[[note|alias]]` with Obsidian's pipe to work, so that I can fit a link's text to its sentence without the vault rendering differently in the two places I read it.
17. As the dev, I want `[[note#Heading]]` to link to a heading, so that I can point at the part of a long note I actually mean.
18. As the dev, I want `![[image.png]]` attachment embeds to render, so that diagrams work in the app as they do in Obsidian.
19. As the dev, I want a wikilink whose target does not exist to render as a marked, unclickable affordance rather than break the build, so that the reading surface doubles as a todo list and gaps surface where I noticed them.
20. As the dev, I want prerequisites rendered as a "Read first" block at the top of a Lesson, so that I know what a Lesson assumes before I start it.
21. As the dev, I want the inverse of prerequisites rendered as a "This unlocks" rail at the bottom, so that I can see where a Lesson leads without the app inventing a "next".
22. As the dev, I want a Lesson to list the Problems that practise it, and a Problem to list the Lesson it drills, so that reading and practising connect in both directions.
23. As the dev, I want untyped body links collected in one backlinks panel labelled by the source note's `title` and sorted alphabetically, so that the list is stable as the vault grows and no entry is mislabelled by an alias fitted to another sentence.
24. As the dev, I want nothing ever locked — no Lesson, no Problem, no quiz — so that prerequisites stay a signal and the app never obstructs a re-read.
25. As the dev, I want a wikilink inside a quiz block's explanation to become a real graph edge, so that a link is a link wherever I write it.

### Practice — quiz blocks

26. As the dev, I want a fenced ```quiz block inside a Lesson to render as an answerable question in the reading flow, so that retrieval practice sits where the material is.
27. As the dev, I want the fence body to be ordinary Markdown, so that I am never learning a second notation and the block stays readable as a code block in Obsidian.
28. As the dev, I want a multiple-choice block to grade the instant I click an option, so that the feedback loop is as tight as it can be.
29. As the dev, I want a wrong answer to show its own explanation and the correct option's, leaving the others closed, so that I learn why I was wrong without being handed the whole answer key.
30. As the dev, I want a cloze block to reveal all its spans together on one grade, so that a sentence with three holes is one question rather than three.
31. As the dev, I want a free-recall block to show a prompt, reveal on click, and let me grade myself, so that the type the app cannot grade is still usable.
32. As the dev, I want to scroll straight past a quiz block with no consequence, so that a re-read is never obstructed.
33. As the dev, I want answering a quiz block to record nothing at all, so that the app stays a read-only library and I am never managing state I did not ask for.
34. As the dev, I want a quiz block to carry its own stable ULID, so that the vault stays scheduler-ready should spaced repetition ever return as its own effort.

### Practice — Problems

35. As the dev, I want a Problem's `## Solution` and `## Complexity` sealed until I click, so that I can attempt the problem without the answer in my peripheral vision.
36. As the dev, I want `## Complexity` sealed as firmly as `## Solution`, so that "O(n) time, O(n) space" does not tell me it is a hash map before I have thought.
37. As the dev, I want each sealed section to unseal independently and expand in place, so that scroll position holds and I can read the complexity without the solution.
38. As the dev, I want sealing to survive being injected into the search preview pane, so that a search result never leaks a solution.
39. As the dev, I want `## Hints` revealed one at a time by a "next hint" control, so that I can take the smallest nudge that unblocks me rather than the whole ladder.
40. As the dev, I want `## Follow-ups` to render open, so that reading it before attempting sharpens the attempt.
41. As the dev, I want a Problem to declare its `kind` — coding, system-design, or behavioural — so that the app knows which sections it must have and never sorts a mixed-kind list by difficulty alone.
42. As the dev, I want `difficulty` compared only within a kind, so that a `hard` behavioural question is not presented as equivalent to a `hard` graph problem.
43. As the dev, I want a pointer Problem's `source` URLs rendered as chips labelled by host, so that I can click through to attempt it on LeetCode or read it on NeetCode without anything being authored per link.
44. As the dev, I want the first `source` URL treated as the attempt link, so that the click I make most often is the one that is one click away.
45. As the dev, I want a pointer Problem's `## Prompt` to carry a one-line paraphrase in my own words, so that the note is self-describing in search and in the topic index even though the prompt lives elsewhere.
46. As the dev, I want the build to reject a quiz fence inside `problems/`, so that practice units never nest and a mid-attempt MCQ cannot masquerade as the attempt.

### Search

47. As the dev, I want full-text search over all five Library types, so that jumping around by memory of a phrase works as well as jumping around by the tree.
48. As the dev, I want search results to carry a type chip, so that I can tell a Problem from a Lesson before I click.
49. As the dev, I want Workshop notes never to appear in search, so that my research dead-ends and records stay out of the reading surface.
50. As the dev, I want a quiz block's options, explanations, and reveals stripped from the search index, so that searching a topic does not hand me the answers to its questions.
51. As the dev, I want a cloze span reduced to its surface text in the index, so that the sentence is findable without the hole being filled in.
52. As the dev, I want a Problem's sealed sections to stay in the index, so that a solution — often the richest prose on a topic — is findable.
53. As the dev, I want the result excerpt suppressed for `problems/` results, so that a searchable solution is not a spoiled one.

### Validation

54. As the dev, I want the build to collect every violation across the vault and exit non-zero, so that renaming one Term does not mean one build run per note that referenced it.
55. As the dev, I want exactly two severities — error and warning — so that there is never a third bucket where signal goes to be ignored.
56. As the dev, I want `npm run validate` to fail on any error, so that CI has a hard gate.
57. As the dev, I want violations surfaced live under `quartz build --serve`, so that I see them while writing rather than at commit time.
58. As the dev, I want the CLI to run Quartz's own pipeline rather than its own parse, so that the validator can never resolve a link differently from the build.
59. As the dev, I want a missing required frontmatter field for a note's type to be an error, so that a note is never half-declared.
60. As the dev, I want a missing or malformed `id` to be an error, so that record identity is never silently absent.
61. As the dev, I want a ULID appearing twice anywhere — note or quiz block, one namespace — to be an error, so that a copy-paste is caught.
62. As the dev, I want two filenames whose stems collide case-insensitively to be an error, so that macOS does not hide a break until a case-sensitive box finds it.
63. As the dev, I want a `topic` value that names a nonexistent note, or one that is not a `term`, to be an error, so that tag drift is impossible and the topic index cannot silently lose a note.
64. As the dev, I want a `prerequisites` target that does not exist, or is not Library content, to be an error, so that the sequencing graph is never broken.
65. As the dev, I want a `practices` target that exists but is not Library content to be an error, while a nonexistent one passes, so that intent is allowed and mistakes are not.
66. As the dev, I want a cycle in the prerequisites graph to be an error naming the full cycle path, so that I can find the loop rather than hunt it.
67. As the dev, I want two Cheat sheets claiming one topic — or a list-valued `topic` on a Cheat sheet — to be an error, so that one-per-topic stays a checkable property.
68. As the dev, I want an unknown `kind`, an unknown `difficulty`, or a missing per-kind H2 section to be an error, so that a Problem is never structurally incomplete.
69. As the dev, I want an unparsable quiz fence, a missing or malformed infostring ULID, an unknown type word, or an MCQ without exactly one `[x]` to be an error, so that a broken question fails loudly rather than rendering wrong.
70. As the dev, I want a pointer Problem whose `source` list is empty to be an error, so that a problem I cannot reach is not a valid note.
71. As the dev, I want an unwritten body link to warn rather than fail, so that marking intent stays free.
72. As the dev, I want a body link from Library content to a Workshop note to warn with its own distinct message, so that "invisible in the app" never shares a report line with "does not exist".
73. As the dev, I want an embed from Library content to a Workshop note to be an **error**, not a warning, so that broken published output is caught — a link at Workshop can be deliberate, an embed never is.
74. As the dev, I want a topic that has Lessons but no Cheat sheet to warn, so that drift from a maintained invariant is visible without being fatal.
75. As the dev, I want `draft: true` to soften no rule, so that publication and validity stay separate concerns.
76. As the dev, I want an optional, uninstalled pre-commit hook that warns on a changed `id` line relative to `HEAD`, so that immutability has a cheap guard without taxing every mid-Lesson save.

### The Vault report

77. As the dev, I want a page at `/report` emitted by every build, so that the build's non-fatal observations have one destination.
78. As the dev, I want one terminal line per build pointing at the report, so that validation shouts and the report whispers.
79. As the dev, I want an **authoring queue** section listing unwritten notes ranked by how much of my existing writing leans on them, so that "what should I write next" is answered by the vault rather than by memory.
80. As the dev, I want typed edges to outrank untyped ones in that ranking, sorted typed-then-total with the breakdown printed, so that a committed `practices` obligation is not weighed the same as a passing mention.
81. As the dev, I want each queue row's breakdown to link to its inbound sources, so that a row I cannot click through to is navigation rather than decoration — an unwritten note has no page of its own.
82. As the dev, I want Terms minted with an empty body listed in the authoring queue, so that a note waiting to be written is treated as backlog and not as a defect.
83. As the dev, I want a **vault hygiene** section listing unreferenced attachments, Terms with no inbound `topic` edge, and Library notes nothing links to, so that "what rotted" is answered without a third severity.
84. As the dev, I want a `draft: true` note's body links excluded from the queue ranking, so that the queue fills with committed intent rather than speculation.
85. As the dev, I want the report's own links excluded from the link graph, so that the hygiene section does not erase itself on the second build by linking to every orphan it lists.
86. As the dev, I want the report published unlisted rather than `--serve`-only, so that the build has one mode rather than two that diverge.

### Authoring — the `author` skill

87. As the dev, I want `author` to write Lessons, Terms, and Cheat sheets as Markdown notes with frontmatter and wikilinks, so that authored output is vault content rather than an export.
88. As the dev, I want `author` to be a new sibling skill rather than an edit to vendored `teach`, so that a re-sync of `mattpocock/skills` does not clobber it.
89. As the dev, I want `author` to mint a `term` note for any topic it uses that does not have one, so that `topic` stays a controlled vocabulary and never dangles.
90. As the dev, I want `author` to create a Cheat sheet with the first Lesson on a topic and update it with each Lesson after, so that the quick-catchup document is never stale.
91. As the dev, I want every ULID minted by running a command, never typed, so that identity is generated in exactly one place in the pipeline.
92. As the dev, I want `author` to carry prerequisites in the `prerequisites` field and never presume the reader arrived from another Lesson, so that a Lesson stands alone and ordering lives in the graph.
93. As the dev, I want `author`'s ZPD reasoning repointed at "what should I author next", so that the inherited teaching philosophy earns its keep now that the ordinal sequence is dead.
94. As the dev, I want `author reference <research note>` as an explicit promotion step, so that turning an investigation into reader-facing material is a deliberate act.
95. As the dev, I want `author` to write into the Lesson, or promote a whole Research note to a Reference, rather than ever embedding a Workshop note, so that the Workshop boundary is a constraint on the skill and not on me.
96. As the dev, I want citations kept as inline external links with `RESOURCES.md` on the authoring side, so that no source ever becomes a note.
97. As the dev, I want `author` never to set `draft`, so that a note is live unless I say otherwise.
98. As the dev, I want diagrams written to `content/attachments/`, so that images live in the vault where Obsidian can render them.

### Authoring — the `import` skill

99. As the dev, I want `import` to be its own skill rather than a mode of `author`, so that the teaching philosophy does not fire on "add these fifteen problems".
100. As the dev, I want `import` to take a list and write one note at a time, so that a batch is resumable and safe to re-run.
101. As the dev, I want `import` to write the paraphrased `## Prompt`, `## Solution`, `## Complexity`, and optional `## Hints`, so that I am not hand-writing hundreds of solutions to problems I am importing precisely because I have not done them yet.
102. As the dev, I want `import` to state *what* is asked and never *how* in the `## Prompt`, so that an unsealed section does not leak the approach.
103. As the dev, I want imported solutions written in C#, one language vault-wide, so that the interview language is a decision of its own and not a consequence of the build stack.
104. As the dev, I want `import` to work from recall over the NeetCode canon with nothing fetched, so that copyrighted prompts are never the agent's routine working material.
105. As the dev, I want `import` to run two gates before writing — on-list against the canon, and a constraints-and-one-worked-example self-test — so that identification is guarded, not just the solution.
106. As the dev, I want `import` to defer an item it cannot identify and ask me once at the end, so that fifteen problems are not punished for one off-canon entry.
107. As the dev, I want `import` to skip and report duplicates matched on any shared `source` URL then on title, never overwriting, so that a re-run is safe.
108. As the dev, I want `import` to copy the source's difficulty label verbatim, so that the scale I already read on every external problem needs no translation.
109. As the dev, I want `import` to mint missing `term` stubs as `author` does, so that importing ahead of the Lessons is possible rather than blocked.
110. As the dev, I want behavioural problems hand-authored against a template, stated explicitly in `PROBLEM-FORMAT.md`, so that the gap reads as a decision rather than an oversight.
111. As the dev, I want to review an import by reading the diff, so that the process stays as light as a single-author vault warrants.

### Authoring — research

112. As the dev, I want `/research` output written to `content/research/`, so that Obsidian sees it and the reader never does.
113. As the dev, I want a Research note named after the question it answers, so that it never collides with the Term of the same name.
114. As the dev, I want Research notes never pruned after promotion, so that the dead ends and ruled-out options survive for me even once a Reference supersedes them for the reader.
115. As the dev, I want `/research` steered by a `CLAUDE.md` convention rather than forked, so that upstream stays upstream.

### The vault as an Obsidian vault

116. As the dev, I want `content/` to open in Obsidian and work, so that authoring and reading are the same corpus.
117. As the dev, I want a quiz fence to degrade to a readable code block in Obsidian, so that a question is legible while I am writing it.
118. As the dev, I want the vault to conceal nothing, so that a Problem read in Obsidian shows everything at once — which is correct for the author.
119. As the dev, I want filenames to be user-facing prose with no numeric prefix outside `records/`, so that `[[big-o-notation]]` is what every link to that Lesson looks like.
120. As the dev, I want Obsidian's rename to rewrite links across the vault and the build to keep working, so that renaming is not a hazard.

### Build and deploy

121. As the dev, I want the build to be a pure function of `content/`, so that the same vault always produces the same site and nothing the build writes ever becomes vault content.
122. As the dev, I want Quartz upstream kept as a git remote with our code confined to our own plugin files, so that periodic merges are cheap.
123. As the dev, I want an altered community plugin vendored in-tree while core Quartz stays a remote, so that the fork/vendor line is drawn once and consistently.
124. As the dev, I want the site to deploy statically with no server and no keys, so that hosting is free of operational surface.

## Implementation Decisions

### Architecture

- **The repo is a Quartz clone with `content/` inside it** ([ADR 0002](../../docs/adr/0002-quartz-as-the-build-pipeline.md)). TypeScript is the language by consequence of that adoption, never chosen on merit. Quartz upstream stays a **git remote**, merged periodically; our code lives in our own plugin files and config, never as edits to Quartz's.
- **Vendoring line**: core Quartz stays a remote; an altered community plugin (the search component) is **vendored in-tree**. Fork-or-patch of core is not done.
- `quartz-community/*` refs are **pinned** — they are read at HEAD on un-versioned `0.1.x`.
- **Our own browser interactivity is hand-written custom elements with no build step.** Quartz's client runtime ships on every page regardless; the "no framework in the browser" rule reads "no framework *of ours*".
- **The build is a pure function of `content/`.** No per-user state, no persistence layer, no server. Nothing the build writes ever re-enters the vault.

### The vault

Directory layout — **type is the directory, topic never is**, so there is no `type` frontmatter field:

```
content/
  lessons/      references/    problems/
  terms/        cheat-sheets/  research/
  records/      attachments/
  MISSION.md
RESOURCES.md    NOTES.md       (repo root, outside the vault)
```

Two classes, defined by renderability:

- **Library** (page + graph node + search): `lesson`, `reference`, `problem`, `term`, `cheat-sheet`
- **Workshop** (in the vault, never rendered): `research`, `record`, `mission` — of which `record` and `mission` are the **learner-state** subset

**Filenames are unique vault-wide**, including `attachments/` and `research/`. Cheat sheets are `<term>-cheat-sheet.md` — decorated because the undecorated name is reserved for the `term` that `topic` resolves against. The `0001-` numeric prefix survives only in `records/`.

### Frontmatter

Every note carries `id` (ULID, required, immutable) and `title` (required). No `created` field — the ULID encodes it.

| type | required | optional |
|---|---|---|
| lesson | `topic` | `prerequisites`, `draft` |
| reference | `topic` | — |
| problem | `topic`, `kind`, `difficulty`, `practices` | `source` |
| term | — | `topic` |
| cheat-sheet | `topic` (**scalar**) | `draft` |
| research | `date`, `sources` | `topic` |
| record | `date` | `topic` |
| mission | — | — |

- `topic` is a **controlled vocabulary**: every value names an existing `term` by filename. It is a **list on every type except `cheat-sheet`**, where scalar is what makes one-per-topic checkable.
- `kind` is `coding` | `system-design` | `behavioural` — **declared, never inferred**. The one sub-classification the type-is-the-directory rule cannot derive from a path.
- `difficulty` is `easy` | `medium` | `hard`, **within-kind and never sorted across kinds**.
- `practices` is **required with at least one entry, and an unwritten link satisfies it** — the deliberate exception to the hard failure on `topic` and `prerequisites`.
- `source` is an **ordered list of URLs**; the first is the attempt link. A **reader affordance only** — no agent ever reads it. Host-derived chips, no authored labels.
- `draft: true` is opt-in; a note is live unless it says otherwise.

### Identity

**Two identities per note** ([ADR 0001](../../docs/adr/0001-split-note-identity.md)): the **filename** is link identity (wikilinks, `topic`, `prerequisites`; Obsidian maintains it on rename); an immutable **frontmatter ULID** is record identity. Nothing currently dereferences the ULID — it is a *future-proofing anchor* that keeps the vault scheduler-ready, not a live key.

**One ULID namespace** across note `id`s and quiz-block infostring ULIDs.

### Wikilink resolution and the link graph

- Resolve against the **filename stem, case-insensitively**, extension optional. Never against `title`. No shortest-unique-path matching — vault-wide uniqueness makes it unnecessary.
- **Aliases use Obsidian's pipe** (`[[note|text]]`). This ruled out `remark-wiki-link` as-shipped and is satisfied by Quartz's `remark-obsidian`, which registers a **micromark syntax extension** producing real `wikilink` mdast nodes at parse time, converted to links by a separate tree transform.
- Heading links (`[[note#Heading]]`) and attachment embeds (`![[img.png]]`) are in. **Note embeds and block references are permitted** — the bans were lifted with no rule replacing them; block refs stay out **by convention, not by build error**.
- An **unwritten link** renders as a marked, unclickable affordance, warns, and is carried as a **placeholder node** so unwritten notes can be ranked by inbound links. Placeholder nodes never enter the Library index or search.
- **Edges are typed by the field they sit in, never by inline syntax**:

| source | edge |
|---|---|
| `prerequisites` | *prerequisite-of* |
| `topic` | *about* |
| `practices` | *practices* |
| body wikilink | *relates-to* (untyped) |

- **The prerequisite graph must be a DAG.**
- Typed edges render **inline, in context**; untyped edges collect in **one backlinks panel** labelled by the source note's `title` (never the alias), sorted alphabetically.
- `topic` inverted on the **term note** is the generated topic index, and the sidebar tree is the **same index, rendered early**. One index, two views.
- **The build renders Library content only.** Anything not Library content is neither a page nor a node.

### The order-25 transform (ours)

One local-path remark plugin at **`order: 25`** — after highlighting (20), before obsidian-flavoured-markdown (30). It does two things:

1. **Re-parses quiz fence bodies as Markdown** with `self.parse()`, letting the downstream transforms resolve wikilinks inside them. Not an opaque string handler and not our own wikilink resolution — Quartz's parser, Quartz's transforms. `crawl-links` then walks the injected subtree, so a quiz-body wikilink becomes a real graph edge for free.
2. **Degrades a Library→Workshop embed** into the same marked, unclickable affordance an unwritten link gets, and raises a validation **error**.

Two mechanics this depends on:

- `data.hProperties` carries `data-quiz-type` / `data-quiz-id` through to the hast element — Quartz's own `data-callout` / `data-clipboard` pattern — so **fence type stays recoverable at html-plugin time**, not only at parse time.
- Injected nodes carry **fence-relative offsets** and remark-obsidian's task-char transform slices the whole file, so `position` must be **stripped** on injected nodes. Cost: no line numbers inside quiz bodies, which constrains violation messages rather than adding a rule.
- Syntax highlighting cannot interfere — it is a **rehype** plugin, a phase later.

### Quiz blocks

Infostring: ```` ```quiz <ULID> [type] ````. `type` is `cloze` or `recall`; omitted means `mcq`. Explicit, never inferred from body shape. A body containing its own fence uses a `~~~~quiz` outer fence.

Body is **ordinary Markdown**: prose prompt, GFM task list of options, a blockquote nested under the option it explains. From the prototype, this is the settled shape:

```quiz 01JQ9F3K2M7VXN4V
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Constant time, one scan
  > Nothing is scanned unless buckets collide.
  > See [[Collision handling]]
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```

- **MCQ**: exactly one `[x]`; strictly single-select, because feedback is immediate on click. Clicking reveals the blockquote on the clicked option *and* the correct one; the rest stay closed.
- **Cloze**: `{{span}}`, any number, all revealed together, one grade.
- **Free recall**: prompt, reveal, self-grade — the only type the app cannot grade.
- **Code completion is deferred**, not rejected.
- Answering **records nothing**. Quiz blocks appear in Lessons only; a fence in `problems/` is an error.

### Problems

Body contract is **named H2 headings**, matched by heading text, with the build folding the AST on heading boundaries: `## Prompt`, `## Constraints`, `## Hints`, `## Solution`, `## Complexity`, `## Follow-ups`.

| kind | required sections |
|---|---|
| coding | `Prompt`, `Solution`, `Complexity` |
| system-design | `Prompt`, `Solution` |
| behavioural | `Prompt`, `Solution` |

- **`## Solution` and `## Complexity` seal with CSS alone — no JS initialisation.** Quartz's search preview pane fetches a result's real HTML and injects its elements, so a JS-initialised seal would render open there. Pure CSS seals wherever the markup lands, and is correct with JS disabled.
- **`## Hints` may use JS** — an ordered list, one hint per top-level item, revealed one rung at a time by a "next hint" control. The ordering is semantic.
- Sealing is a **rendering rule of the app alone**; the vault conceals nothing.
- Sealed sections **stay in the search index**; the spoiler is handled by suppressing the excerpt for `problems/` results.

### Search

Quartz's search is **adopted whole in mechanism**; what changes is what lands in the index.

The decisive fact: `contentIndex.json`'s `content` field is the **rendered tree flattened** (`description` sets `file.data.text = toString(tree)`), so anything rendered is searchable — including what the page visually conceals. Making the index differ from the page therefore means **recomputing `file.data.text` in our own htmlPlugin ordered after `description`**, never mutating the tree (which would strip content off the page too). Encode that ordering as *greater than `description`'s order*, never the literal number.

That plugin strips quiz material **per type**: mcq — options and explanations; cloze — spans reduced to surface text; recall — the reveal.

- All five Library types indexed, **no type-level exclusions**. Workshop is out structurally, by never rendering.
- `topic` is **copied to `tags` at build to feed search and nothing else**; `tag-page` stays disabled, since the Term page is already the canonical topic index.
- Results carry a **type chip derived from the slug** — free, since type is the directory.
- The search component is **vendored**, not forked or patched.

### Validation

**Two severities, collect-all, exit non-zero.** No `info` level. **One rule module, two consumers**:

- a **Quartz emitter** (`emit(ctx, content[], resources)` — the whole-corpus seam) surfacing violations under `--serve` without killing the dev server;
- a **standalone CLI** (`npm run validate`) that **invokes Quartz's own pipeline** rather than re-parsing, so the validator can never resolve links differently from the build. CI gates on this.

**CI is the only hard gate.** A pre-commit hook is available but uninstalled; its one extra check is a `git diff HEAD` warning on a changed `id` line. `draft: true` **softens nothing** — its only effect here is keeping unpublished body links out of the authoring queue. **`id` immutability is not enforced by the build** — nothing dereferences the value.

**Errors** — schema and identity: missing required field for the type; missing or malformed ULID `id`; a ULID appearing twice anywhere (one namespace); case-only filename stem collision vault-wide. Vocabulary and edges: `topic` naming a nonexistent note or a non-`term`; a `prerequisites` target that is nonexistent or not Library content; a `practices` target that exists but is not Library content; a prerequisites cycle or self-prerequisite (error names the full path); two cheat sheets claiming one topic; a list-valued `topic` on a cheat sheet. Problems: unknown `kind`; unknown `difficulty`; missing per-kind required H2; a quiz fence in `problems/`; a `source` list with no well-formed URL. Quiz fences: unparsable body; missing or malformed infostring ULID; unknown type word; an mcq without exactly one `[x]`. Boundary: a **Library→Workshop embed**.

**Warnings**: an unwritten body link; a topic with Lessons but no cheat sheet; a **Library→Workshop body link** (distinct message — the target exists, it is merely invisible); *(hook only)* a changed `id` relative to `HEAD`.

**Deliberately not validated**: `id` immutability as a build rule; equal-length MCQ options; an empty `term` body; whether a paraphrase reproduces its source prompt (unwriteable — the source text is deliberately absent from the repo, so the guard is structural and lives in `PROBLEM-FORMAT.md`); and, as a principle, **anything on the report channel, ever**. There is no third severity and no promotion path between the two.

### The Vault report

**A page emitted by the build at `/report`**, plus one terminal line per build pointing at it. Two sections:

- **Authoring queue** — unwritten notes ranked by inbound links, plus Terms minted with an empty body. Sorted **typed-then-total with the breakdown printed**, no weighting constant, so a committed `practices` obligation outranks a passing mention. The breakdown is **navigation**: an unwritten note has no page, so the row links to its inbound sources. Long tail folded, never capped.
- **Vault hygiene** — unreferenced attachments; Library notes with no inbound links; **Terms with no inbound `topic` edge** (narrowed from "nothing points at", whose wide reading fires constantly on correct authoring).

**Implementation constraint, load-bearing**: the report must be **emitted as a page and must never be generated as a virtual `content/` file** fed through the transform pipeline. Were its links to become graph edges, the report would link to every orphan it lists, each would gain an inbound link, and the hygiene section would erase itself on the second build. Being emitter output rather than a note is also what keeps it out of `description` and `crawl-links` structurally — the same category as `contentIndex.json` and the 404 page, so the Library-only rendering rule is untouched.

Published **unlisted**, not `--serve`-only — one build mode, not two that diverge.

### Reading surface

- Entry point is the **topic index**. Navigation is a **persistent sidebar tree keyed by topic**, off-canvas below ~900px, leaves grouped by type with the cheat sheet pinned first, plus a **flat alphabetical Cheat sheets list**.
- Prose column ~38rem serif, regardless of viewport; the sidebar takes leftover width.
- **No** breadcrumb, next/previous, progress bar, review-queue badge, or read/unread state. Topics render as **chips under the title**.
- Prerequisites render as a "Read first" block, inverted as a "This unlocks" footer rail; `practices` renders both directions. **Nothing is ever gated** — the DAG is a build-time integrity property, not a runtime permission system.
- **No margin notes** — they need a notation Obsidian Markdown does not have. Ordinary blockquotes carry asides.

### The authoring skills

- **`author`** — a **new sibling skill**, not an edit to vendored `teach` (which is pinned by hash in `skills-lock.json`; an in-place edit is a divergence a re-sync clobbers). ~60% of upstream survives. Scope: `lesson`, `term`, `cheat-sheet`, plus a **reference mode** (`/author reference <research note>`) as the deliberate promotion step. Upstream's single reference-doc bucket splits three ways with a picking rule. **Mints `term` notes mandatorily.** **Maintains the cheat sheet** on every Lesson run, so one run touches up to four notes. **Every ULID is minted by running a command, never typed** — the only place in the pipeline that generates them. ZPD survives, repointed at "what should I author next". **`./assets/` is deleted** — the quiz fence is the vault's only interactive primitive; diagrams go to `attachments/`. Citations stay inline external links with `RESOURCES.md` author-side; **no source ever becomes a note**. Never sets `draft`; opens output in Obsidian.
- **`import`** — a **separate skill**, not a mode of `author`: the inherited teaching philosophy fires nowhere in "add these fifteen". Ships `PROBLEM-FORMAT.md`. Kinds: **`coding` and `system-design`; behavioural is hand-authored** against the template, stated explicitly so the gap reads as a decision. **Batch-shaped, safe to re-run**: one note at a time; **duplicates skipped and reported** on any shared `source` URL then title, never overwritten. Writes the paraphrased `## Prompt` (*what*, never *how*), `## Solution`, `## Complexity`, optional `## Hints`; copies the source's difficulty label verbatim; fills `topic`/`practices` and **mints missing `term` stubs**. **Solutions are C#**, one language vault-wide — the repo's TypeScript is irrelevant, build stack and interview language were kept apart deliberately. Review is informal: the dev reads the diff. No `draft` gate, no per-problem approval.
- **Acquisition is recall-only, and the corpus scope is what makes it safe** — one decision, not two. The corpus is the **NeetCode canon**, the densely-attested head where the agent reproduces a published solution rather than inventing one; **widening the corpus invalidates the acquisition method** rather than being a content decision made in passing. Browsing was declined and recorded as declined (LeetCode 403s a plain fetch; neetcode.io returns an empty Angular shell; driving the dev's logged-in Chrome needs them present and fails mid-batch). The gate is **two tests**: on-list against the canon, and a **constraints-and-one-worked-example self-test** before writing — which guards *identification*, where the published-solutions argument reaches only the *solution*, and the two come apart (*Course Schedule* vs *Course Schedule II*). On failure: **defer and ask once** at the end of the batch, not halt-on-first. A paste fallback exists and stays self-limiting by being expensive.
- **`/research`** — **no fork**; a `CLAUDE.md` convention steers it to `content/research/`. Notes are named after the **question** they answer, and **never pruned**: a Reference supersedes a Research note for the reader, not for the dead ends.
- **The Workshop boundary is a constraint on the skills, not on the dev**: `author` either **promotes** (whole-note; fragment promotion is not built) when material is looked up repeatedly and stands alone, or **writes it into the Lesson** when it only supports that Lesson's argument. Neither skill ever emits a Library→Workshop embed.

## Testing Decisions

### What makes a good test here

Test **external behaviour, never implementation**. The unit under test is the vault-in / site-out contract: a test states a fact about Markdown that goes in and a fact about the output that comes out. A test that asserts which plugin ran, in what order, or what an intermediate mdast node looked like, is testing our arrangement of Quartz rather than Prepper's behaviour, and it will break on the next upstream merge for no reason.

The project's own facts make this unusually clean, and the tests should lean on them:

- **The build is a pure function of `content/`** — no state, no clock, no network, no user. A fixture vault fully determines the output.
- **Type is the directory** and **filenames are unique vault-wide** — a fixture vault is legible at a glance and needs no setup beyond files on disk.

Assertions are on rendered output and emitted data, in project vocabulary: *this Lesson's page carries a `practices` rail naming that Problem*; *this Term page's index lists these five notes*; *this violation list contains exactly this error*. Not: *this transformer returned a node with these fields*.

### Seams

**Two seams, one dominant.**

**Seam 1 — the build, over a fixture vault.** `build(fixtureVault) → emitted site`. Input is a directory of Markdown; output is the emitted HTML pages, `contentIndex.json`, `/report`, and the violation list. This is the highest seam available and it is nearly total. It covers:

- wikilink resolution (stem matching, case-insensitivity, pipe aliases, heading anchors, attachment embeds)
- unwritten links — affordance markup, warning, placeholder node
- the link graph — all four edge types, inline typed rendering, the backlinks panel's labelling and sort
- the topic index falling out of the graph, on both the Term page and the sidebar
- quiz fence re-parsing, per-type rendering, `data-quiz-*` attributes, and wikilinks inside fence bodies becoming real edges
- Problem section folding, per-kind requirements, CSS-only seal markup, hint ladder markup, host-derived `source` chips
- the Library→Workshop embed degradation and its error
- the search index — quiz stripping per type, sealed sections retained, excerpt suppression for `problems/`, `topic`→`tags`, type chips
- **every validation rule**, error and warning, including collect-all behaviour across a deliberately multi-violation fixture
- the Vault report — queue ranking (typed-then-total), breakdown links, empty Terms, all three hygiene facts

Fixtures should be **small, purpose-built vaults, one per behaviour cluster**, not one large vault every test reads. A fixture whose only job is "two filenames colliding case-insensitively" is a two-file directory, and the test that reads it is unambiguous about what it asserts.

The dev-facing entry points are the two consumers of the rule module, and both are exercised through this seam: the **CLI** for the violation list, the **emitter** for the same rules surfacing under `--serve`. The rule module is deliberately **not** given a seam of its own — hand-built `content[]` inputs drift from what Quartz actually hands the emitter, which is the exact class of bug the "CLI invokes Quartz's own pipeline" decision exists to prevent.

**Seam 2 — the custom elements, over emitted markup, in a DOM.** Three genuine browser behaviours: quiz **grade-on-click** (all three types), the **hint ladder** revealing one rung at a time, and **unseal**. The input to these tests is markup produced by seam 1, not markup hand-written for the test — otherwise the two seams can pass while disagreeing. Sealing itself is CSS, so *seal-closed* is asserted in seam 1 as markup and class presence; seam 2 asserts only the click behaviour.

**The authoring skills get no test seam.** `author` and `import` are prompt-driven, and their output's correctness is exactly what validation checks — a test asserting a skill's output shape would be a second, weaker copy of the rule set. Their checks are the FORMAT docs and the build.

### Prior art

There is none in-repo — this is a greenfield build with no code yet. The relevant prior art is upstream: **Quartz's own test suite** is the model to match for how a plugin and an emitter are exercised, and matching it keeps our tests legible to anyone who knows Quartz and cheap to keep working across upstream merges.

### First thing to prove

`self.parse()` yielding `wikilink` nodes inside a re-parsed quiz fence body is the **first thing the build spike must demonstrate**. It is load-bearing for [ADR 0002](../../docs/adr/0002-quartz-as-the-build-pipeline.md): the citations are unambiguous but no build has been run, and a failure there falls back into the ADR. Two other decisions rest on cited-but-unrun mechanisms and belong in the same spike: Quartz resolving non-media embeds **client-side** (which is what makes the Workshop boundary airtight), and the report's structural exclusion from `description` and `crawl-links` (which is what keeps the hygiene section from erasing itself).

## Out of Scope

- **Spaced repetition, and all per-user state.** No scheduler, no review queue, no reading progress, no attempt history — and therefore no accounts, no multi-user, no server-side storage. **Deliberate and revisitable, not rejected**: quiz-block and note ULIDs stay stable so the vault remains scheduler-ready, and it can return as its own effort. None of it is designed now.
- **In-app agent execution and BYO-key custody.** The pipeline is author-only: the dev runs the skills locally, they write Markdown, the dev commits. Removes Managed Agents, the Agent SDK, sandboxing, and credential storage entirely.
- **Mock-interview simulator.** A conversational agent that plays interviewer and grades. Wanted eventually; a different product with a different hard part, and it constrains none of the storage or content decisions here.
- **Code-completion quiz type.** Deferred, not rejected — the highest-fidelity type for this domain and the most parser and rendering work (a fence inside a fence, plus hole-marking inside code). Revisit once there is authored content to judge whether the three shipping types cover the need.
- **Execution verification for imported solutions.** Running each `coding` solution against sample cases before writing the note. Proposed as the compensating control for having no draft gate, agreed, then deferred. `dotnet` 8.0.401 is already on PATH, so the cost is one reused console project. **Accepted risk**: nothing structural stands between a subtly-wrong solution and a commit.
- **Deployment target.** Where the build is hosted and what the publish step looks like. Narrowed to whatever Quartz's own deployment guides support.
- **Graph view.** Quartz ships `@quartz-community/graph` fed by `contentIndex.json`, so this is a configuration question — "does Quartz's do what we want, over which notes" — not a build question.
- **Library bootstrap.** How much content must exist before the app is useful, and which topics come first. Narrowed on the Problem side to the NeetCode canon; what remains is ordering and volume.
- **Block references.** Out **by convention, not by build error**. Obsidian-generated `^ids` in Markdown the dev reads daily, and a target that breaks silently when the paragraph around it is edited.
- **Fragment promotion.** `/author reference` promotes a whole Research note; promoting part of one is not built.
- **Behavioural problem generation.** Hand-authored against a template. Stated in `PROBLEM-FORMAT.md` so the gap reads as a decision.

## Further Notes

**Three decisions rest on mechanisms that were cited but never run.** Each ticket said so plainly, and the spike should treat them as the first work, not the last: quiz-fence re-parsing under Quartz's parser (the load-bearing one — a failure falls back into ADR 0002), client-side embed resolution (which is what withdrew the Workshop-leak risk rather than mitigating it), and the report's structural exclusion from the link graph (which fails *quietly*, by erasing the orphan section on the second build).

**Recall reliability for `import` is asserted, not measured.** No sample was drafted against real problem statements. The first real batch is where the NeetCode-canon assumption gets its evidence — and the failure mode to watch for is *identification*, not solution quality, since the two come apart.

**Two decisions were reached by noticing an unexamined assumption rather than by weighing options**, and both are worth remembering as a pattern:

- The static-site research was scoped to JavaScript by a brief nobody had questioned; widening it to Rust, Go, Python, and Java changed the question from "which framework" to "adopt vs build".
- The interview language (C#) and the build stack (TypeScript) were kept deliberately apart, having nearly collapsed into each other by the same reflex.

**The Workshop class is defined by renderability, never by subject matter.** A Research note is about the subject and is still Workshop, because raw investigation is not learning material. Any future carve-out that reintroduces subject matter as the criterion reopens a boundary that is currently airtight — and it is airtight for a mechanical reason (a Workshop note has no page, and Quartz's embeds fetch a page), not a disciplinary one.

**Validation and the Vault report are one decision seen twice.** A fact worth failing a build over is a rule; a fact that is not is a report; there is nothing in between and no promotion path. Every future "should this be a warning or just informational?" question is already answered.
