---
name: author
description: Author a Lesson, Term, Cheat sheet, or Reference into the Prepper vault as Markdown.
disable-model-invocation: true
argument-hint: "[lesson|term|cheat-sheet|reference] <topic, idea, or research note>"
---

The dev has asked you to put something into the vault. This is authoring, not exporting:
your output is **Markdown notes in `content/`** — frontmatter, wikilinks, quiz fences —
that Obsidian opens and the build renders. There is no second copy and no export step. The
vault is the product; the app is a rendering of it.

> **This skill is first-party repo content, not a vendored skill.** It is a sibling of the
> vendored `teach` in `.agents/skills/`, which is pinned by content hash in
> `skills-lock.json`. Roughly 60% of `teach` survives here — the philosophy, fluency versus
> storage strength, the mission, the zone of proximal development. Everything about *output*
> is rewritten. Never edit vendored `teach` to change any of this: a re-sync of
> `mattpocock/skills` clobbers the edit and the divergence is silent until then.

## Modes

```
/author <topic or idea>            # a Lesson, plus everything it drags in
/author lesson <topic or idea>     # the same thing, said explicitly
/author term <name>                # a Term on its own
/author cheat-sheet <topic>        # rebuild one topic's cheat sheet
/author reference <path to a research note>   # promote an investigation
```

Lesson mode is the main one, and it is the only mode that is not a single note: authoring a
Lesson touches **up to four notes** — the Lesson, the Term for each topic it claims (minted
if absent), the topic's cheat sheet (created or updated), and possibly a Record. That is a
decision, not a convenience. A vault where the Term and the cheat sheet lag behind the
Lessons is a vault whose topic index and whose night-before document are both quietly wrong,
and nothing in the build can repair either after the fact.

## The vault you are writing into

```
content/
  lessons/      references/    problems/
  terms/        cheat-sheets/  research/
  records/      attachments/
  MISSION.md
RESOURCES.md    NOTES.md       (repo root — outside the vault, author-side)
```

**Type is the directory. Topic never is.** There is no `type` field in frontmatter; the path
is the type, so a note in the wrong directory is a note of the wrong type. Two classes:

- **Library** — `lesson`, `reference`, `problem`, `term`, `cheat-sheet`. A page, a node in
  the link graph, and a row in search.
- **Workshop** — `research`, `record`, `mission`. In the vault, open in Obsidian, and never
  rendered. The reader does not see them.

**Filenames are unique vault-wide**, case-insensitively, `attachments/` and `research/`
included — a colliding stem is a build error. They are user-facing prose in dash-case, with
no numeric prefix outside `records/`: `content/lessons/hash-map-lookup-cost.md` is what
`[[hash-map-lookup-cost]]` looks like everywhere. Cheat sheets are decorated,
`<term>-cheat-sheet.md`, because the plain name belongs to the Term that `topic` resolves
against.

## Frontmatter

Every note carries `id` and `title`. There is no `created` field — the ULID encodes the
time.

| type          | required                                | optional                    |
| ------------- | --------------------------------------- | --------------------------- |
| `lesson`      | `topic`                                 | `prerequisites`, `draft`    |
| `reference`   | `topic`                                 | —                           |
| `term`        | —                                       | `topic`                     |
| `cheat-sheet` | `topic` (**scalar**)                    | `draft`                     |
| `problem`     | `topic`, `kind`, `difficulty`, `practices` | `source`                 |
| `research`    | `date`, `sources`                       | `topic`                     |
| `record`      | `date`                                  | `topic`                     |

`problem` is here for reading, not writing: Problems belong to the `import` skill, and this
one never authors them. Curating an interview problem is a different act, and a
ZPD-driven teaching loop that could invent one would smuggle agent-invented problems into a
vault that bans them.

**Never set `draft`.** A note is live unless the dev says otherwise, and `draft` is theirs
to set by hand. It also softens nothing in validation — publication and validity are
separate concerns — so setting it would buy a half-written note nothing but invisibility.

## Identity: every ULID is minted by running a command

```sh
npm run ulid        # one
npm run ulid 4      # four, for a Lesson with three quiz blocks
```

**Never type a ULID, never copy one out of an example, never adapt one you have seen.** You
cannot generate a ULID from parametric knowledge; you can only produce something
ULID-shaped and wrong, and it will collide or fail the format check. This skill is the only
place in the whole pipeline that mints them, which is why the instruction is worth this much
emphasis: notes and quiz blocks share **one namespace**, so a duplicate anywhere is an
error anywhere.

Run the command once per authoring run for the total number you need, and spend them in
order. A note's `id` is **immutable** once written — it is record identity, and the filename
is link identity ([ADR 0001](../../../docs/adr/0001-split-note-identity.md)). Renaming a
note is Obsidian's business; the `id` never moves.

## Which of the four you are writing

Upstream `teach` had one reference bucket. This vault splits it three ways, and the build
renders and indexes each differently, so the choice is yours to make rather than the build's
to guess.

- **Lesson** — teaches one tightly-scoped thing. Read roughly once. Carries the quiz blocks.
- **Term** — what a topic *is*: a sentence or two, and then the generated index of everything
  about it. One per topic, mandatory, and the only thing `topic` may name.
- **Cheat sheet** — the condensed *understanding* of a topic, for the night before. Exactly
  one per topic that has Lessons. The 20% that buys 80%.
- **Reference** — lookup material with no compression story: a syntax table, an API surface,
  an algorithm listing, a comparison. Looked up repeatedly. Unbounded in number.

The line between Lesson and Reference is **read roughly once** versus **looked up
repeatedly**. The line between cheat sheet and Reference is that a cheat sheet compresses a
topic you have taught, and a Reference is a lookup you never compressed.

Full contracts: [LESSON-FORMAT.md](./LESSON-FORMAT.md), [TERM-FORMAT.md](./TERM-FORMAT.md),
[CHEAT-SHEET-FORMAT.md](./CHEAT-SHEET-FORMAT.md),
[REFERENCE-FORMAT.md](./REFERENCE-FORMAT.md).

## An authoring run, in order

1. **Read the mission and the records.** `content/MISSION.md` is why the dev is learning any
   of this; `content/records/` is what has already landed. Both ground everything below. If
   the dev named the thing to author, skip the choosing and keep the grounding.
2. **Choose what to author** — the zone of proximal development, repointed (below).
3. **Gather knowledge from trusted sources**, `RESOURCES.md` first. Never teach from
   parametric knowledge; the vault's whole claim is that its facts are checkable.
4. **Mint the ULIDs.** One per note, one per quiz block, in one command.
5. **Mint any missing Term.** Mandatory — see below.
6. **Write the Lesson**, against `LESSON-FORMAT.md`.
7. **Create or update the topic's cheat sheet**, against `CHEAT-SHEET-FORMAT.md`.
8. **Run `npm run validate`.** It should pass with no hand-editing; if it does not, the fix
   is yours, not the dev's. Unwritten-link *warnings* are fine and expected — they are the
   authoring queue filling up. Errors never are.
9. **Open the note in Obsidian** — `open "obsidian://open?vault=<vault>&file=<path>"` — not
   in the app. The vault is the authoring surface, Obsidian renders wikilinks and degrades a
   quiz fence to a legible code block, and the app needs a build that may not have run.
10. **Stop there.** The dev reads the diff and commits. Never commit for them.

## Minting Terms is mandatory

`topic` is a **controlled vocabulary**: every value names an existing note in `content/terms/`,
and the build errors on anything else. So a Lesson that introduces a new topic **authors the
Term in the same run** — a stub is enough, a title and one paragraph, because the Term page's
real content is the index the graph generates.

This contradicts the other instruction you are given, and the contradiction is deliberate, so
hold both:

> **Link liberally in a body, including to notes that do not exist yet.** An unwritten body
> link is a warning, and it is how the reading surface doubles as a todo list — the gap
> surfaces exactly where you noticed it.
>
> **Never write an unwritten link into `topic` or `prerequisites`.** Those are frontmatter,
> they are checked rather than merely resolved, and they are errors. A `topic` naming
> nothing is a note filed under a subject that does not exist, and the topic index loses it
> in silence.

(`practices`, on a Problem, carves the opposite exception: an unwritten target is allowed
there, because "this Problem drills a Lesson I have not written yet" is intent the vault
wants to hold. It is not yours to write, but do not let it confuse the rule above.)

## Cheat sheets are living notes

The topic's cheat sheet is **created alongside the first Lesson on that topic and rewritten
in the same run as every Lesson after it.** It grows as the topic does, rather than being
compiled at a "done" moment that never arrives.

Note the asymmetry with validation on purpose: the build only *warns* once a topic has two
Lessons and no cheat sheet. That warning is the floor — the point at which a missing sheet
has become visible drift. **Your habit is the ceiling**: write it with the first Lesson, so
the warning never fires at all.

**Rewrite, do not append.** Every update is a chance to re-derive the durable 20% of what is
now known, and the failure mode is an accumulating pile of Lesson summaries that grows
without bound until nobody reads it the night before an interview. If the sheet got longer
and the topic did not get deeper, you did it wrong. `CHEAT-SHEET-FORMAT.md` carries the
test. It is advisory, not a build rule — a word count is an arbitrary number pretending to
be a structural fact — which means it bites here, on every run, or nowhere.

## Prerequisites, and the death of sequence

`prerequisites` carries **every ordering claim the vault makes**, and it is a graph, not a
line. There are no lesson numbers; the ordinal prefix survives only in `records/`.

- Assign prerequisites from **what the Lesson actually assumed**, not what is topically
  adjacent. The test is "would this be confusing without that one?", never "is that
  related?".
- **Only notes that already exist.** Unwritten targets are an error in this field, so a new
  Lesson can only point backwards — which is also why cycles are nearly impossible to write
  and why the build checks for them anyway.
- **Append prerequisites only to the note you are authoring.** Retro-fitting them onto older
  notes across a run is where a cycle would actually come from.
- **Never write prose that presumes the reader arrived from another Lesson.** No "as we saw
  last time", no "building on lesson 3". That prose is now false: the reader may have
  arrived from a backlink, from search, or from the topic index. A Lesson stands alone;
  ordering lives in the graph, where the reading surface renders it as *Read first* at the
  top and *This unlocks* at the bottom.

Nothing is ever gated. A prerequisite is a signal, not a lock.

## The zone of proximal development, repointed

Upstream conflated two senses of order. Here, ZPD answers **"what should I author next?"** —
a question about the dev's authoring backlog — and never "what should I read next?", which
the app deliberately refuses to answer.

When the dev has not named a topic, choose by reading the vault:

- **`content/MISSION.md`** — what this is all for. Everything traces back to it. If it is
  unpopulated or vague, interview the dev before writing anything; a bad mission is worse
  than none.
- **`content/records/`** — what has landed, what did not stick, and what the dev said to
  drill next. This is the floor: do not re-teach what a Record says is known.
- **The unwritten links already in the vault** — every `[[…]]` pointing at nothing is a gap
  the dev marked while writing. `npm run validate` lists them, and the Vault report ranks
  them by inbound links. A note three Lessons are waiting on outranks a passing mention.
- **Terms minted with an empty body**, which are backlog rather than defects.

Then pick the thing that is challenged *just enough*: inside reach of what the records show,
outside what they show is already automatic.

## Philosophy — inherited, and still true

Deep learning needs three things:

- **Knowledge**, from high-trust sources — never from parametric memory.
- **Skills**, from retrieval practice with a tight feedback loop. In this vault that is the
  quiz fence.
- **Wisdom**, from real-world practice. Here that is `content/problems/`, the interview
  itself, and the communities in `RESOURCES.md`.

**Fluency versus storage strength.** Fluency is in-the-moment retrieval and gives an
illusory sense of mastery; storage strength is long-term retention and is the real goal.
Build it with desirable difficulty: retrieval practice, spacing, interleaving. For
*acquiring* knowledge, difficulty is the enemy — it eats the working memory needed for
understanding. For *making it stick*, difficulty is the tool.

A Lesson should be short and completable quickly, give one tangible win, and tie to the
mission. Working memory is small; respect it.

## Citations and sources

**Citations are plain inline external links in the body.** An external URL is not a wikilink
and has no business in the link graph.

**No source ever becomes a note.** Not a "resource note", not a stub, not a URL with a
sentence under it. Such a note is not teaching material and would sit in the topic index
beside real Lessons, and the vault would have two provenance models instead of one. The
ledger of what is trusted is `RESOURCES.md` at the repo root, deliberately outside `content/`.
Add a source there when you find a good one — with the one line saying what it covers and
when to reach for it — and prune one that turned out to be shallow or wrong.

Each Lesson should recommend one primary source worth going and reading.

## The Workshop boundary

This is a constraint on **you**, not on the dev. They may link a Research note from anywhere
they like in Obsidian; you may not put one in front of the reader.

When a Lesson needs material that currently lives in a Research note, there are exactly two
moves:

- **Promote it** — `/author reference <the research note>` — when the material is looked up
  repeatedly and stands on its own: a table, an API surface, a comparison. The Lesson then
  links to the resulting Reference, which is Library content the reader can follow.
- **Write it into the Lesson**, in the Lesson's own words, when it only supports the argument
  that Lesson is making.

There is no third move. **Fragment promotion is not built**: `/author reference` takes a
whole note. And the Research note **stays where it is** — a Reference supersedes it for the
reader, never for the sources, the dead ends, and the options that were ruled out. Nothing is
ever pruned out of `content/research/`.

**Never emit a Library→Workshop embed.** `![[some-research-note]]` in a Lesson says *show
this here* of something that will never be shown; the build degrades it to a dead affordance
and raises an error. A plain wikilink to a Workshop note is a *warning* rather than an error
— the dev writes those deliberately while authoring — but you have no reason to write one:
you had the two moves above.

## Diagrams, and what a Markdown vault cannot do

Diagrams are images in **`content/attachments/`**, embedded with `![[diagram.png]]`. There
is no `./assets/` directory here and there must never be one: the renderer owns
look-and-feel, and making the Lessons look like one course is the app's job by construction
rather than a shared stylesheet's.

What that genuinely costs, stated plainly rather than worked around: **simulators and
interactive widgets have no Markdown form.** The quiz fence is the vault's only interactive
primitive. This is an accepted narrowing of what a Lesson can be. Do not reach for inline
HTML or a script tag to get the widget back.

## Mission and records

`content/MISSION.md` and `content/records/` are Workshop notes you **read on every run** and
write rarely. See [MISSION-FORMAT.md](./MISSION-FORMAT.md) and
[RECORD-FORMAT.md](./RECORD-FORMAT.md).

- Change the mission **only with the dev's explicit confirmation**, and write a Record
  capturing the shift when you do. A stale mission steering future sessions is the worst
  outcome; a silently rewritten one is the second worst.
- Write a Record when a genuinely non-obvious insight lands, when the dev discloses prior
  knowledge, or when a misconception is corrected. Coverage is not learning: material merely
  covered earns nothing.

`NOTES.md` at the repo root is the dev's free-form scratch space. Nothing reads it, including
you, unless they point you at it.
