# Quiz block schema

Parent: [Prepper — wayfinder map](../map.md)
Type: prototype
Status: resolved
Blocked by: 01

## Question

What is the exact format of a fenced ```quiz block, and how does it render?

Build a rough, concrete artifact to react to rather than discussing it abstractly.

To resolve:

- **Body format.** YAML, JSON, or a lighter line-based convention inside the fence. It has to be comfortable for an agent to emit and tolerable for a human to read as a code block in Obsidian.
- **Question types.** Multiple choice only, or also free recall, cloze deletion, and code-completion? `teach` specifies that for multiple choice every answer must be the same number of words and characters, so formatting leaks no clue — the schema should make that easy to honour.
- **Feedback.** Immediate reveal, explanation text per option, and whether a wrong answer links back into the lesson.
- **Scheduler hook.** Each quiz block needs a stable identity so a review record can point at it. Relates directly to the identity decision in ticket 01.
- **Obsidian degradation.** Confirm what a reader sees in Obsidian itself — a code block is acceptable, unreadable YAML soup is not.

## Answer

Settled form, with worked examples: [prototypes/03-quiz-fence.md](../prototypes/03-quiz-fence.md).
Candidates compared: [03-quiz-fence-candidates.md](../prototypes/03-quiz-fence-candidates.md).
Render mockup: [03-quiz-render.html](../prototypes/03-quiz-render.html).

### Body format — Markdown inside the fence

The fence body is **ordinary Markdown**, parsed by the same parser as the note body. The
prompt is prose, the options are a GFM task list, an explanation is a blockquote nested
under the option it belongs to.

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

Beaten: **YAML**, which parses for free and extends for free but reads worst in Obsidian —
keys outnumber content, and a `:` or `#` in a prompt starts a quoting fight in the file the
dev reads constantly. And **line-prefix sigils** (`?`/`=`/`-`/`>`), which read well but buy a
bespoke parser and a sigil table in the authoring agent's prompt for a legibility win that
Markdown already delivers.

The load-bearing reason is that this is the one format with **no new notation**: the vault is
Markdown, the build already walks a Markdown AST, and the authoring agent already emits
Markdown fluently. The known cost is that headings and lists are a small vocabulary — a
fourth or fifth question type may not have syntax left. Accepted: three types ship, and the
infostring is where an unrepresentable type would escape to.

### Infostring

    ```quiz <ULID> [type]

`type` is `cloze` or `recall`; omitted means `mcq`. **Explicit, not inferred from body shape** —
inference means a cloze whose `{{` you typo'd silently becomes a valid recall question, and the
build cannot know. Explicit makes that a build failure.

A body that itself contains a fence uses a `~~~~quiz` outer fence.

### Question types at launch

**Multiple choice, cloze deletion, free recall.** Code completion is **deferred**, not rejected:
it is the highest-fidelity type for this domain and the most parser and rendering work
(a fence inside a fence, plus hole-marking inside code). Revisit once authoring reveals whether
prose types cover it.

- **MCQ**: exactly one `[x]`; more or fewer is a build failure. Every option the same word count,
  and character count where manageable — the `teach` rule, so formatting leaks no clue. Because
  nested explanations break the options out of an unbroken column, this can no longer be eyeballed
  reliably; it becomes a **build warning**, handed to ticket 13.
- **Cloze**: `{{span}}`, any number per block, all revealed together, one grade for the block.
- **Free recall**: prompt, reveal, self-grade. The only type whose grade the app cannot compute.

### Feedback

**Immediate on click**, no submit step — the tightest loop, which is what `teach` asks for. The
consequence is that MCQ is strictly single-select. Clicking reveals the blockquote on both the
clicked option and the correct one; the rest stay closed until the reader opens them.

A wrong answer links back into the lesson through an **ordinary wikilink in its blockquote** —
no per-option anchor field, no position-derived link. It is a link like any other, so it is
authored like any other and it appears in the graph like any other.

### Scheduler hook — identity

Each block carries a **hand-written ULID in the infostring**, emitted once by the authoring agent
and never hand-edited. Same rule as a note's frontmatter `id` (ticket 01, [ADR 0001](../../../docs/adr/0001-split-note-identity.md)),
and for the same reason: progress state keys off it, so it must survive both reordering and rewording.

- **Lesson id + ordinal** was rejected: inserting a question mid-lesson silently re-dates the
  review record of every block below it.
- **Content hash** was rejected: fixing a typo orphans the review record, and typo-fixing a live
  vault is a daily act.

The 26 characters of noise per block are the price, and the infostring is the least intrusive
place in the file to pay it.

### Obsidian degradation — confirmed acceptable

With no plugin, Obsidian renders the fence as a code block: monospace, unhighlighted, literal.
Under this format that is a prompt in prose, three short options in a checkbox list, and indented
explanations — readable as-is, and the `[x]` marks the answer for a reader skimming in Obsidian.
This was the deciding test against YAML, whose code-block form is unreadable at a glance.

### Consequences for other tickets

- **The fence body is not opaque to the build.** It must be parsed as Markdown, and the wikilink
  transform must run *inside* it — quiz-body wikilinks are real links producing real untyped
  *relates-to* edges under ticket 02's rule. Any pipeline chosen in ticket 11 has to allow a
  custom fence handler that re-enters the Markdown parser, not just one that receives a raw string.
- **Quiz blocks appear in lessons only** (ticket 01's reviewability split is unchanged).
- **Ticket 13** inherits: one-`[x]` enforcement, ULID present and unique vault-wide, unknown `type`
  word, unbalanced `{{`, and the equal-length option warning.
