# Vault search

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: —

## Question

What does search over the vault find, and where is its index built?

Surfaced by [Lesson reading experience](04-lesson-reading-experience.md), which put a search
affordance in the top bar three times without ever deciding what sits behind it. With the
index page and the topic tree as the browsing model, search is plausibly the *primary* way
the dev jumps to a note, not a fallback.

To resolve:

- **Scope.** Titles and topics only, or full text of every Library note. Full text over a
  growing vault is a real payload; titles-only is a few kilobytes and answers "where is that
  note" but not "where did I write about tombstones".
- **Where it runs.** A build-time index shipped to the client (static deploy stays intact,
  payload grows with the vault) versus a server endpoint (breaks the static-deploy standing
  decision from the map's Notes).
- **What it searches over.** Rendered prose, raw Markdown, or a stripped form — and whether
  quiz block bodies and unwritten-link placeholders are searchable.
- **Result shape.** Whether results distinguish note types, show topic context, and whether
  problems and their solutions are searchable (a solution in results can spoil a problem).
- **Tooling consequence for [Choose the build pipeline](11-choose-static-site-tooling.md).**
  If 11 resolves first, this ticket inherits the choice and only decides scope; if this one
  goes first, its answer is a constraint on 11.


## Reframed by ticket 11

[Choose the build pipeline](11-choose-static-site-tooling.md) adopted **Quartz**, which ships search. This ticket's last bullet is discharged: 11 went first, so this one inherits the choice.

The question is no longer "what do we build" but **"does Quartz's search do what we want, and over which notes"**:

- Quartz's search is full-text and build-time indexed, which answers "where it runs" — the static deploy stays intact and the payload grows with the vault.
- **The sharp remaining question is scope**, and it is a Library/Workshop question rather than a tooling one: Quartz indexes what it renders, so `research`, `record`, and `mission` are excluded for free. **Unwritten-link placeholder nodes must stay out** (ticket 02 already says so), and whether quiz block bodies and sealed Problem sections are searchable is genuinely undecided — a solution surfacing in results spoils the problem.
- Whether Quartz's result shape can distinguish note types, and what it costs to change it, is unverified.

## Answer

**Quartz's search is adopted whole in mechanism; what changes is what lands in the index and how a result reads.** No search is built, no server endpoint appears, and the static deploy is untouched — the index is `contentIndex.json`, emitted at build by `quartz-community/content-index` and consumed client-side by Flexsearch in `quartz-community/search`.

### The facts that settled it

The ticket's unverified questions all resolved by reading source rather than by deciding:

- **Search is a community plugin**, not core: `quartz-community/search`, Flexsearch, three separate indexes — title, content, tags — weighted in that order via `fieldPriority`. Top 5 results, a 30-word excerpt with match highlighting, `enablePreview` as a single global toggle.
- **`contentIndex.json` carries exactly** `slug`, `filePath`, `title`, `links`, `tags`, `content` per note. No other frontmatter survives the emitter. `data.unlisted === true` drops a note from the index entirely.
- **`content` is the rendered tree flattened**, not raw Markdown: the `description` plugin sets `file.data.text = toString(tree)` as an htmlPlugin. This is the load-bearing fact of the whole ticket — **anything the app renders is searchable, including content the app visually conceals.**

### Scope: all Library content, nothing excluded by type

All five Library types — lesson, reference, problem, term, cheat sheet — are indexed. Workshop (`research`, `record`, `mission`) is excluded **for free and structurally**: it is never rendered, so it never reaches the emitter. This is the Library/Workshop boundary from [How `/research` output lands in the vault](10-research-output-into-the-vault.md) paying for itself a second time — no search-specific exclusion rule exists, or is needed.

A Term matching on title alone is the correct outcome, not a defect: "where is the Big-O page" is a real query, and the thin-by-design body from [Cheat sheet note type](14-cheat-sheet-note-type.md) means a Term can never drown out the notes it indexes. `unlisted` stays available as a per-note escape hatch and is deliberately **not** wired to any type-level rule.

Unwritten-link placeholders stay out, as [Wikilink resolution and backlink graph rules](02-wikilink-resolution-and-backlink-graph.md) already required — they have no page, so they have no index entry. Nothing enforces this; it falls out.

### The index is not the page

Because `content` is the rendered tree, making the index differ from the page means **`file.data.text` must be recomputed, never the tree mutated**. Stripping a node to keep it out of search strips it off the page too. This is the trap, and it dictates the seam:

**A new htmlPlugin of ours, ordered after `description`, overwrites `file.data.text` from a filtered walk of the tree.** Chosen over forking `quartz-community/description` (which would fork a file to change three lines) and over forking the `content-index` emitter (which would move text extraction into the wrong plugin). It adds a file rather than forking one, keeping [Choose the build pipeline](11-choose-static-site-tooling.md)'s "our code confined to our own plugin files" intact, and costs one extra tree walk per note — nothing at vault scale.

**What the plugin drops, per quiz type** — the rule is per-type, so the plugin reads the type off the fence infostring, exactly as [Quiz block schema](03-quiz-block-schema.md)'s parser does:

| Quiz type | Indexed | Dropped |
| --- | --- | --- |
| mcq | the prose prompt | every option, every explanation blockquote |
| cloze | the sentence, spans reduced to surface text (`{{binary}}` → `binary`) | nothing else — the sentence *is* the prompt |
| recall | the prompt | the reveal |

The reasoning differs by type. MCQ options are noise as much as spoiler: ticket 03 requires options of equal length so formatting leaks no clue, which makes four near-identical strings per block — poison for a prose search. A cloze answer is a single word with near-zero spoiler value, and the sentence around it is genuine authored prose worth finding. A recall reveal is a full answer and sits on the same footing as a sealed solution.

### Spoilers are handled at render, not at index

**Sealed Problem sections stay in the index.** Rejected: stripping them (kills recall — a solution is often the richest prose written on a topic, and "where did I write about tombstones" should find it) and leaving the excerpt alone (defeats the only thing sealing exists for). What ships instead is **findable but not shown**: the result appears, the 30-word excerpt is suppressed for `problems/` results, and opening the note puts the reader at their own choice to unseal.

`enablePreview` is a single global attribute read once in `search.inline.ts`, so a per-result override is a patch — but `slug` is in hand at the per-item render site, so the patch is a few lines.

**The excerpt was not the only leak.** The search UI also has a *preview pane*: highlighting a result calls `fetchContent(slug)`, fetches that page's real HTML and injects its elements. For a Problem that puts the solution's markup in the pane, and whether it stays sealed depends entirely on how sealing is implemented. So:

**Solution sealing becomes pure CSS** — no JS initialisation, so injected HTML seals itself wherever it lands. This is worth having on its own terms: correct with JS disabled, correct in the preview pane, correct anywhere else the markup is reused. **Hints may remain JS**, since revealing a ladder one rung at a time probably requires it, and hints are not the spoiler. Fallback if solution sealing turns out to need JS after all: disable the preview pane for `problems/` results only. Disabling it globally was rejected — it is a real affordance for the other four types.

### Results distinguish note type

Vanilla results are title plus excerpt. `slug` and `filePath` are both in the index and **type is the directory** ([Vault structure and note schema](01-vault-structure-and-note-schema.md)), so a type chip is derivable client-side at zero cost to the emitter. It ships. "Binary search" will match a Lesson, a Cheat sheet, a Term and three Problems; without a chip the reader is parsing URLs to tell them apart — and with the topic index as the front door ([Lesson reading experience](04-lesson-reading-experience.md)), search is plausibly the primary way the dev jumps to a note, not a fallback.

This is the **same patch** as the preview suppression, a few lines apart in the same render function, so the two decisions cost one change between them.

### `topic` is copied to `tags`, and feeds search only

Quartz's tag index and `#`-prefixed search read frontmatter `tags`. Prepper authors `topic`. **A transformer copies `topic` into `tags` at build; the field is never renamed.** `topic` is load-bearing vocabulary across the whole map — a controlled vocabulary resolving to Term notes that must exist — and `tags` actively misdescribes it, since a tag is free-form. Cheat sheets' scalar `topic` ([Cheat sheet note type](14-cheat-sheet-note-type.md)) is wrapped to a single-element array.

Two consequences, both decided here:

- **`tag-page` stays disabled. The Term page is the only topic index.** Enabling it would generate `/tags/big-o` listing every note with that topic — a second index page at a second URL that nothing links to, competing with the Term page that [Wikilink resolution and backlink graph rules](02-wikilink-resolution-and-backlink-graph.md) already made the canonical topic index. The derived `tags` field exists to feed search and nothing else, which is worth stating explicitly because "we have tags now" otherwise reads as an invitation. `tag-list` is enabled **only if** its chips can be pointed at Term slugs rather than `/tags/`; otherwise it stays off too. *(Unverified — carried as a gate, below.)*
- **Authored `tags` frontmatter is a validation error.** Once the build owns the field, a hand-written `tags:` is either silently overwritten or silently merged, and either way the vault grows a second, uncontrolled topic vocabulary — the exact failure ticket 01's controlled vocabulary exists to prevent. Trivial to detect, trivial to fix, and the same shape as the errors [Vault validation rules](13-vault-validation-rules.md) already carries.

### The search component is vendored

Preview suppression, the type chip, and the preview-pane fallback all require editing the client script of `quartz-community/search`, which is installed by the plugin CLI rather than living in core — so [Choose the build pipeline](11-choose-static-site-tooling.md)'s "upstream stays a git remote, our code confined to our own plugin files" does not cover this case.

**The component is vendored into our own plugin directory and the upstream dependency dropped.** It is one client script plus a component and a stylesheet, and we are changing what results *mean* rather than fixing a bug worth upstreaming, so there is no ongoing upstream value to track. A GitHub fork was rejected as a second repo to maintain for no gain; a patch file re-applied at install was rejected because it breaks silently on any upstream refactor of the render function we are editing.

This sets a precedent worth naming: **core Quartz stays a remote; community plugins we alter get vendored.** The two are different modalities and ADR 0002's rule was written before the distinction mattered.

### Amendments and constraints handed elsewhere

- **[Problem bank note format](06-problem-bank-note-format.md)**: sealing was "unseals in place on click", implementation unspecified. Now constrained — **`## Solution` and `## Complexity` seal with CSS alone**, because their markup must stay sealed when injected into the search preview pane. Hints keep the freedom to use JS.
- **[Vault validation rules](13-vault-validation-rules.md)**: one new error — authored `tags` frontmatter, on any note type.
- **[Quiz fence re-parsing under Quartz](17-quiz-fence-under-quartz.md)**: the fence's **type must be readable by a second consumer** — the index-shaping htmlPlugin — not only by the parser that renders it. Whatever ticket 17 lands on must leave the type recoverable from the tree at html-plugin time, or the per-type stripping rule above cannot be applied.

### Verification gate

**Can `tag-list` chips be pointed at Term slugs rather than `/tags/`?** If yes, enable it; if no, it stays off. Not ticket-worthy — it changes one config line either way and nothing downstream depends on the outcome.
