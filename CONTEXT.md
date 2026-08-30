# Prepper

A software-engineering interview-prep web app that renders a Markdown vault as a linked, navigable library with in-place practice. Content is authored offline by the dev; the app never invokes an agent, stores no per-user state, and schedules nothing — the reader browses and picks what to study.

## Language

### The vault

**Vault**:
The `content/` directory: an Obsidian-compatible Markdown tree that is the sole stored form of all content.
_Avoid_: content directory, corpus, docs

**Note**:
A single Markdown file in the vault. Every note has a type.
_Avoid_: document, page, file

**Link identity**:
A note's filename, which is what `[[wikilinks]]` resolve against and what Obsidian rewrites on rename.

**Record identity**:
A note's immutable frontmatter `id`, written once at creation and never changed. Nothing currently reads it — the app stores no per-user state — so it exists to keep the vault addressable by something a rename cannot break, should scheduling or progress ever be added.
_Avoid_: slug, uid

### Note types

**Lesson**:
A note teaching one tightly-scoped thing. Read roughly once, in an order; carries prerequisites and may contain quiz blocks.

**Reference**:
A note looked up repeatedly rather than read through. Has no reading progress and no prerequisites. Reader-facing: a Reference is the distilled, published form of a Research note, promoted deliberately by an authoring run rather than written by an agent directly.
_Avoid_: cheat sheet, research note, doc

**Problem**:
A curated interview problem, authored by the dev. Structured: carries a kind, a difficulty, hints, and a solution. One note is one problem, and its body sections are named H2 headings the build knows by name.
_Avoid_: question, exercise, challenge

**Problem kind**:
Which of the three shapes a Problem takes: **coding**, **system-design**, or **behavioural**. Declared in frontmatter, never inferred from which sections a note happens to have, and the only classification that lives in frontmatter rather than in the path — a Problem's type is already the directory holding it. Kind decides which sections are required and bounds what a difficulty means, since difficulties are only comparable within a kind.
_Avoid_: problem type, category, format

**Pointer problem**:
A Problem whose prompt is hosted elsewhere: `source`, an ordered list of URLs, plus a one-line paraphrase in the dev's own words. The first URL is the one to click to attempt the problem; the rest are further reading. `source` is a reader affordance — nothing in the build or in the authoring skills reads it. Still a full note — the dev's solution and its links to Lessons are what the note is for — and the paraphrase is not optional, since a note with no prompt of its own is invisible to search and to the topic index.
_Avoid_: external problem, link-only problem, stub

**Term**:
The canonical note for one topic. `topic` values resolve to term filenames, so every topic has one, and a term's page carries the generated index of every note about it. Exists so that `[[Big-O]]` resolves to a note rather than dangling. Its body is **thin by design** — a sentence or two of definition above the index — because the condensed content of a topic belongs in its Cheat sheet; the Term page answers "what is here?", the Cheat sheet answers "remind me how this works". The exception is a topic with no Lessons, which has no Cheat sheet, so its Term body is where an area overview lives. An empty Term body is legitimate: a Term is created the moment a topic is first used, before anyone necessarily has something to say about it.
_Avoid_: glossary entry, definition, area

**Cheat sheet**:
A note condensing one topic to the 20% of the information that gives 80% of the understanding, for quick reading rather than study. Exactly one per topic that has any Lessons, created with the first and updated with each one after; a topic with no Lessons — a Term that exists only to be linked, or one carrying only Problems — has none. It stays short as the topic grows: the 20% is a filter, not an accumulating summary of every Lesson. Its `topic` is **single-valued**, unlike every other note type, which is what makes one-per-topic a checkable property. Distinguished from a Reference by what it distils (the dev's own Lessons, not an investigation), by cardinality (one per topic, where References are unlimited and arbitrarily scoped), and by how it is written (a side effect of every authoring run, where a Reference is a deliberate promotion). Its body is free-form — no section contract, since nothing in the build reads its headings.
_Avoid_: summary, overview, crib sheet

**Research**:
The captured findings of one investigation, written into the vault by `/research` and never shown to a reader. Workshop, not Library: raw investigation — dead ends, ruled-out options, the sources consulted — is what makes it worth keeping and what makes it wrong to publish. Named after the question it answers, not the topic it touches, so it never collides with the Term or Lesson of the same name. A Reference is its published distillation; the Research note survives that promotion permanently.
_Avoid_: research note (as a Reference), investigation, findings doc

**Record**:
A learning record: what the dev has learned and when. Learner-state, not library content.
_Avoid_: log, journal entry

**Mission**:
The singleton note stating why the dev is preparing, used to ground what gets authored next. Learner-state, not library content.

### Cross-cutting

**Library**:
The set of notes a reader browses and searches: Lessons, References, Problems, Terms, and Cheat sheets. The build gives a page and a link-graph node to Library content and nothing else. Everything else in the vault is Workshop, and the boundary does not leak: Workshop notes are filtered out of the corpus the build renders from, so an Embed of one has nothing to resolve against and renders as an empty placeholder.

**Workshop**:
The dev's side of the vault: every note the build never renders — Research, Records, and the Mission. Present in Obsidian, browsable and searchable while authoring, and never a page in the app. Being **filtered out of the build's corpus** is what makes the class airtight, and it is stronger than having no page: embeds are resolved at build time against that corpus, so a note still in it would be spliced into any Library note embedding it whether or not it got a page of its own. Excluding Workshop notes with a filter, never with an emitter that declines to write them, is therefore the implementation obligation the boundary rests on ([ADR 0002](docs/adr/0002-quartz-as-the-build-pipeline.md)). The class is defined by renderability, not by subject matter: a Research note is about the subject and still Workshop, because raw investigation is not learning material.
_Avoid_: private notes, drafts, staging

**Learner state**:
The subset of Workshop notes that are about the dev rather than about the subject matter: Records and the Mission. Authored into the vault like any other note — they are content, not application state — but never indexed in the Library.

**Quiz block**:
A fenced ```quiz block inside a Lesson carrying in-lesson retrieval practice. Its body is ordinary Markdown, re-parsed by the build, so wikilinks inside it are real links. Degrades to a readable code block in Obsidian. Carries its own ULID in the infostring — record identity at block granularity, since a block is addressable independently of the Lesson holding it. Answering a block is ephemeral: it grades on click, shows its explanation, and records nothing.

**Question type**:
What a Quiz block asks. Three ship: **multiple choice** (a GFM task list, exactly one `[x]`, options of equal length so formatting leaks no clue), **cloze** (`{{spans}}` inside a sentence), and **free recall** (prompt, reveal, self-grade). Declared by a word in the infostring, never inferred from the body; multiple choice is the unmarked default.
_Avoid_: quiz kind, question format

**Sealed section**:
A body section the app hides until the reader clicks to open it, so a Problem can be attempted before its answer is read. Solutions and complexity analyses are sealed; hints are revealed one at a time up a ladder from nudge to near-answer. Sealing is a rendering rule of the app alone — the vault conceals nothing, and the note read in Obsidian shows everything at once, which is correct for the author. It conceals a section from the page, not from the Library: sealed text is still searchable, because what sealing protects is the moment of attempting, not the secrecy of the answer.
_Avoid_: spoiler, hidden section, collapsed block

**Practice unit**:
A thing the reader can attempt rather than read: a Problem or a Quiz block. Attempting one is ad-hoc and ephemeral — the reader chooses it by browsing, and nothing is scheduled, queued, or recorded. References, Terms, Cheat sheets, Records, and the Mission are not practice units. Practice units never nest: a Problem carries no Quiz blocks.
_Avoid_: reviewable, card, review item

**Reading surface**:
The article column and the way a note's own prose is set in it: the measure it holds, the serif it is set in, its leading, and its asides. Sovereign — it takes its rules from typography rather than from the app's design system, because a document is a surface the reader dwells in rather than one they operate ([ADR 0003](docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md)). Defined by **what a page's body is, not by which page it is**: a body of prose is a Reading surface and holds the measure, and a body that is a Topic index is not and is laid out wide. A Term page is both in turn — thin prose above its generated index — and the boundary runs between them on the page ([ADR 0004](docs/adr/0004-a-persistent-top-bar-and-the-retired-right-column.md)). What the retired right column gave up is **margin** on a page whose body is prose, and columns on a page whose body is an index; nothing of the app is laid out in the width the measure leaves except the table of contents — and not even that on a page whose body is an index, where the index has taken the margin and the list stands down.
_Avoid_: content area, article body, main

**Chrome**:
Everything the app puts around a note that is not the note: the top bar and the controls it carries, the rail and its topic tree, search, the topic chips under a title, the typed edges rendered in context and the backlinks panel below them, and the table of contents that sits in the margin the retired right column left behind, on the pages that still have a margin to spare it. Styled as one system from a shared token vocabulary, which is exactly what distinguishes it from the Reading surface. It is also where the app's only motion is: the rail fades as it goes, and nothing else in the build animates by our hand. A disclosure never does — the Problem seal, a heading fold and a topic fold are shut by the HTML specification before any stylesheet or script runs, and an eased one would be a seal that needs a script. States only what is true — there is no reading order for it to imply and no per-user state for it to display. That rule forbids chrome that **asserts something the app does not know**, which is why there is no breadcrumb, progress bar or review-queue badge; it does not forbid chrome that merely gives an existing control a fixed place.
_Avoid_: UI, shell, navigation, furniture

**Top bar**:
The one persistent band across the top of every page, carrying every control the app has: the rail toggle and the app's name, search, and the theme, reader-mode and graph controls. Fixed rather than scrolling, and the only Chrome element present on every page whatever the body is. It holds controls and never content — a thing that would go in it because it is important, rather than because it is operated, belongs on the page.
_Avoid_: header, navbar, app bar, banner

**Rail**:
The collapsible left column, whose sole occupant is the Topic index in its jump-list view. Collapses to **nothing** rather than to a strip of icons — its contents are author-written topic names, and there is no icon for a topic. Below 800px it has no column to collapse, so it takes its other presentation: absent until called up, and then fixed over the article rather than stacked above it. Same control, same remembered word, two presentations. Whether it is put away is the one fact about a reader that the app remembers, alongside which items of the tree are folded shut, and it is a fact about a window rather than about the reader's work.
_Avoid_: sidebar, panel; and _drawer_ as a name for the rail — the drawer is its narrow-window presentation, not a second thing beside it

**Topic index**:
`topic` inverted: for each topic, every note filed under it, grouped by note type. Computed once from the Link graph and rendered in three **views** that share one source and differ only in density — a bare foldable name list in the Rail, and a wide multi-column landing on the app's entry page and beneath a Term's own prose. One source is what stops two views disagreeing about what is filed where; identical markup was never what it meant.
_Avoid_: explorer, topic tree (that is one view of it), navigation tree

**Topic card**:
One topic, drawn as a surface with everything filed under it on show and the note-type groups as columns across it. The unit the two landing views of the Topic index are built from — the entry page renders one per topic, a Term page renders the one for its own topic, and that card *is* the "In this topic" section rather than a box inside it. Does not fold: a card is looked at, whereas the Rail's view is jumped from and has to stay short. How many fit across is asked of the container it is in, never of the viewport.
_Avoid_: tile, panel, topic box

**Wikilink**:
An `[[filename]]` reference in a note body, optionally aliased `[[filename|display text]]` (Obsidian's pipe, never a colon) and optionally anchored `[[filename#Heading]]`. Resolves against link identity, case-insensitively. `![[…]]` is an **embed**, which renders the target in place rather than linking to it — an attachment or another note.
_Avoid_: internal link, cross-reference

**Embed**:
An `![[…]]` wikilink, which renders its target in place rather than linking to it. An attachment embed shows the image; a note embed is transclusion, and the embedded note's content appears on the embedding note's page while still belonging to the note it was written in. A Library note embedding a Workshop one is a build error, and renders as the same marked affordance an unwritten link gets — the discipline is the build's, not the author's. The reverse, a Workshop note embedding a Library one, is unrestricted.
_Avoid_: transclusion (for the syntax), include

**Unwritten link**: 
A wikilink whose target note does not exist. Legitimate authoring practice — it marks intent — so it renders as a marked, unclickable affordance rather than failing the build. A missing `prerequisites` or `topic` target is not an unwritten link; those are build failures.
_Avoid_: broken link, dangling link

**Link graph**:
The whole-vault index of links between notes, computed at build. Edges are typed by the field they come from: `prerequisites` yields _prerequisite-of_, `topic` yields _about_, `practices` yields _practices_, and a body wikilink yields an untyped _relates-to_. Never typed by inline syntax.
_Avoid_: backlink graph, knowledge graph

**Vault report**:
What the build has to say about the vault that is not a validation failure — nothing is wrong when it prints. Two sections, split by when the dev asks: an **authoring queue** (unwritten notes ranked by how much existing writing leans on them, plus Terms minted without a body yet) answering _what next_, and **vault hygiene** (unreferenced attachments, Terms nothing is about, Library notes nothing links to) answering _what rotted_. Belongs to neither Library nor Workshop, because it is not a note: the build produces it, the vault never stores it, and nothing the build writes ever becomes vault content — a report that lived in the vault would count its own links and rank itself.
_Avoid_: dashboard, authoring queue (that is one of its two sections), reports channel

**Validation**:
The build's pass/fail judgement on the vault: a violation is a defect, and the failing kind stops a release. Deliberately a separate channel from the Vault report, and the two never share a line — one shouts, the other points. A fact worth failing a build over is a rule; a fact that is not is a report; there is nothing in between.
_Avoid_: linting, checks
