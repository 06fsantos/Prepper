# Fixture vaults

Each directory here is a **whole Obsidian vault**, built by seam 1 exactly as `content/`
is built: same `quartz.config.yaml`, same CLI, same pipeline.

## The rule

**One fixture per behaviour cluster, and each one is as small as its subject.** A fixture
whose only job is "two filenames colliding case-insensitively" is a two-file directory,
and the test that reads it is unambiguous about what it asserts.

The failure mode this exists to prevent is the opposite: one big vault that every test
reads. That vault answers every question at once, so a test's assertion stops naming its
own subject, adding a note for one test breaks three others, and nobody can delete
anything.

## Conventions

- Name the directory after the **behaviour**, not the note types in it: `wikilink-shapes`,
  `prerequisite-cycle`, `quiz-fence-types` — not `vault-2` or `big-fixture`.
- The type-is-the-directory layout applies here too: a Lesson goes in `lessons/`, a Term in
  `terms/`. That is what the build reads type from, so a fixture that flattens it is
  testing something the vault cannot do.
- Notes carry real frontmatter, including an `id`. Fixture ULIDs are hand-written and
  deliberately unrealistic (`01M0Z9…0001`) so that a real one is never mistaken for a
  fixture one — the exception to "ULIDs are minted by running `npm run ulid`, never typed".
- Keep fixture prose short but real. Lorem ipsum makes a failing assertion unreadable.
- A fixture for a **failing** vault is legitimate and expected: validation rules are
  asserted by building a vault that breaks them and reading the violation list.

## The ones that exist

- **`minimal-vault/`** — a Lesson and the Term it is about, linked twice: once aliased
  (`[[binary-search|Binary search]]`) and once bare, under an H2 so that Quartz's heading
  permalink anchor is in the output too. Its cluster is *the harness itself*: it is what
  `build-fixture.test.ts` uses to prove that a directory of Markdown goes in and queryable
  HTML plus `contentIndex.json` come out. Every one of those details is load-bearing for a
  test, so change it only alongside them — and do not grow it; a new behaviour gets a new
  fixture.

- **`quiz-fence-wikilink/`** — a Lesson whose quiz fence holds an mcq task list with a
  wikilink inside one option's explanation, and the two Terms it points at. Its cluster is
  *[mechanism 1](../../../.scratch/prepper-build/research/02-quiz-fence-reparsing.md)*: a
  fence body is re-parsed as ordinary Markdown, so a link written in it is a link. The
  wikilink appears nowhere else in the note on purpose — the edge cannot arrive by another
  route. It is deliberately kept apart from `quiz-fence-types/` below: this one is the
  tripwire `mechanisms.test.ts` reads when an upstream merge breaks something, and it stays
  as small as the claim it pins.
- **`quiz-fence-types/`** — one Lesson carrying a quiz fence of every kind, and the two
  Terms they point at. Its cluster is *the quiz fence*: the mcq holds a wikilink inside one
  option's explanation and nowhere else in the note, so the edge it becomes cannot have
  arrived by another route; the cloze has two holes and, in the same sentence, a
  `{{literal}}` inside a code span, which is what makes "holes are found in text, never in
  code" statable; the recall has a prompt and a blockquote reveal; and the last is a
  `~~~~quiz` outer fence wrapped round a body that contains a ```` ```java ```` fence of its
  own. The vault validates clean, because a fixture about rendering should not also be a
  fixture about violations — `quiz-fence-violations/` is that.

- **`quiz-fence-violations/`** — a vault whose fences are wrong in every way there is: one
  with no ULID and one whose ULID was typed by hand, one with a type word nothing answers
  to, an mcq marking two options `[x]` and another marking none, an mcq with no options at
  all beside a cloze with no holes and a recall with no reveal, and a quiz fence written
  inside a Problem. Its cluster is *the defective fence*: each one is an error and each one
  is left as the code block it was written as, so the fixture is read twice over — once for
  the violation list and once for what the reader gets instead. Two notes carry two broken
  fences each, because a run has to report both.

- **`problem-sections/`** — four Problems of three kinds under one Term, and a second Term
  linked from nowhere but inside a sealed section. Its cluster is *the Problem page*. Two
  sum carries all six named H2s, so the fold has every boundary to find; its `## Hints` has
  a nested bullet under the second rung, which is what makes "one rung per **top-level**
  item" statable, and its `## Solution` is the only place `hash-maps` is named, so "a
  wikilink inside a seal is still a real edge" cannot be true by another route. Its `source`
  list is two URLs, the second on a `www.` host, because the chip label is the host with
  that taken off. `design-a-url-shortener` is a system-design problem with **no**
  `## Complexity`, which is not a defect and is here to say so; `median-of-two-sorted-arrays`
  carries a `## Variants` the contract has no name for. The four titles sort into an order
  that is neither of the two a difficulty scale would give, which is what makes "never
  ordered by difficulty across kinds" a fact about the emitted index. The vault validates
  clean — `problem-body-violations/` is the other half.

- **`folded-headings/`** — one Lesson whose body runs `##` → `###` → `####` → `###` → `##`,
  with a paragraph above the first heading and a wikilink written under the last one, plus the
  Term that link names. Its cluster is *collapsible headings*: the depths make nesting
  statable, the preamble makes "what is above the first heading is not a section" statable, and
  the wikilink -- which appears nowhere else in the note -- makes "a fold is markup wrapped
  round the same subtree" statable, because the edge cannot have arrived by another route.

- **`problem-body-violations/`** — four Problems the body contract is not satisfied by: a
  coding problem with only a `## Prompt`, a `kind` nothing answers to, a `difficulty`
  nothing answers to, and a pointer problem whose `source` list holds two sentences and no
  URL. Its cluster is *the defective Problem*: each is an error, and each note still renders
  the sections it does have, so the fixture is read twice over — once for the violation list
  and once for what the reader gets anyway. The unknown-kind note is also missing a
  `## Solution` and is deliberately **not** reported for it: with no kind, nothing knows
  which sections it required.

- **`embed-of-a-pageless-note/`** — a Lesson embedding two notes: one with a page, one
  without. Its cluster is
  *[mechanism 2](../../../.scratch/prepper-build/research/02-embed-of-a-pageless-note.md)*,
  the Workshop boundary. The `workshop: true` note stands in for a Workshop note until the
  real Library/Workshop filter exists — it is dropped by a spike *filter*, which is the
  shape that split has to take, and deliberately not by `draft`, whose filter ticket 03
  disabled so that `draft: true` softens no validation rule. Each note carries a nonsense
  marker word so a leak is greppable across the whole emitted site.
- **`emitter-output-and-the-graph/`** — a Lesson, the Term it is about, and a Term nothing
  links to. Its cluster is
  *[mechanism 3](../../../.scratch/prepper-build/research/02-emitter-output-and-the-link-graph.md)*:
  the orphan is there so that "still an orphan after a page linked to it" is a fact a test
  can state.
- **`wikilink-shapes/`** — a Lesson linking one Term five ways (bare, differently cased,
  with the extension, pipe-aliased, and anchored at a heading) plus an attachment embed,
  and the Term and the PNG those point at. Its cluster is *resolution*: the same link has
  to work in Obsidian and in the app, so every shape here resolves to the same page. The
  Term's `title` ("Hash maps") deliberately differs from its filename stem, which is what
  makes "never against `title`" a fact a test can state.
- **`unwritten-link/`** — a Lesson pointing at two notes nobody has written, one of them
  twice and one of them pipe-aliased, alongside one link whose target exists and one
  *embed* of a third unwritten note. Its cluster
  is *the unwritten link*: a marked, unclickable affordance, a warning rather than an
  error, and a placeholder node in the link graph that is in neither the Library index nor
  search. It carries three boundary markers as well as the behaviour itself: an `![[…]]`
  whose target is missing is left for the transform that owns embeds, and an inline tag
  and a folder link are pages Quartz *generates* rather than notes anybody could write —
  none of the three is an unwritten link, and the fixture is where that is stated. It is
  also the vault that proves warnings alone exit zero, so it is wrong in no other way — a
  single error here would make that assertion say nothing.
- **`typed-edges/`** — a chain of four Lessons wired by `prerequisites`, two Problems that
  `practise` one of them, three Terms they are `about`, a Reference that links that Lesson
  in prose *and* names one Term in both `topic` and its body, and a Workshop note that links
  it too. Its cluster is *the link graph*: four edge kinds, each typed by the field it was
  written in. Every detail is one of those facts. The Reference's double mention is what
  makes "typed by field, never by inline syntax" statable — the same target, the same
  spelling, two edge types. `lessons/open-addressing` is the other half of that: it names
  the same Term in `topic` **only**, so the pair pins down that a field-written link is
  never also an untyped body edge. That Lesson also writes both its frontmatter targets
  Obsidian's way, `topic: "[[hash-maps]]"`, which is what a note edited through Obsidian's
  property UI looks like on disk, and it links `[[missing-folder/]]` — a target that
  resolves to an *index* slug, the one shape where the page, the validation report and the
  graph can end up calling one gap by two different names. The Reference's alias
  (`[[hash-map-lookup-cost|why lookups are cheap]]`) is what makes "labelled by `title`,
  never by the alias" statable, and the titles `open addressing` and `Éviction policies`
  are what make "sorted alphabetically" mean what a reader means by it rather than what
  code-point order does. One `practices` entry names a Problem nobody has written, because
  that is the deliberate exception the spec allows. And the Workshop note carries a `topic`
  and a body link so that "neither a node nor the source of an edge" is a fact about a note
  that would otherwise have contributed two edges.

- **`topic-index/`** — four Terms and six notes filed under two of them: a Cheat sheet, two
  Lessons, a Reference and a Problem under *Hash maps*, and a Cheat sheet plus one of those
  Lessons under *Complexity*. Its cluster is *the topic index*, so every detail is a fact
  about navigation rather than about links. `lessons/hash-map-lookup-cost` names both topics
  and is the note that has to appear under **both**, not deduped to one. The four note types
  under *Hash maps* are what make "grouped by note type, Cheat sheet first" statable — a
  Cheat sheet that sorts first against the alphabet's advice, and a Reference before a
  Problem, which no alphabet would give. `terms/system-design` has nothing filed under it and
  a body that explains the area, which is the **area overview** a topic with no Lessons and
  therefore no Cheat sheet has to fall back on; `terms/eviction` is empty too and titled
  *Éviction policies*, which is what makes the tree's alphabetical ordering mean what a
  reader means by it rather than what code-point order does. The two Cheat sheets are named
  `…-quick-reference` rather than after their topics because filenames are unique
  vault-wide ([ADR 0001](../../../docs/adr/0001-split-note-identity.md)) and a
  `cheat-sheets/hash-maps.md` would collide with the Term. The vault is otherwise correct —
  it validates clean — because a fixture about navigation should not also be a fixture about
  violations. It is also read by
  [`layout.test.ts`](../layout.test.ts), which is not a second cluster: that test needs one
  page of every kind at once — a home page, a Lesson, a Term, a Problem, a folder index and
  404 — and this is the smallest vault that already emits them all. Nothing was added for it,
  and nothing should be.

- **`schema-and-identity-violations/`** — a vault that is wrong in fourteen ways at once:
  a Lesson with no `topic` that wrote a hand-authored `tags` instead — the build's own
  field, derived from `topic` to feed search — one with no `id`, one whose `id` was typed
  by hand, a Problem
  missing three of the four fields its type requires, a Record with no `date`, a Term that
  declares no `title`, a `draft: true` note that is wrong anyway, two notes sharing one
  ULID, a quiz block whose infostring ULID belongs to a Term, and an attachment whose stem
  collides case-insensitively with a Term's filename. Its cluster is *collect-all*: one
  run has to report every one of them, so notes here are deliberately wrong in more than
  one way and more than one note is wrong. Everything it does **not** violate — its
  `topic` values all name Terms that exist — is so that the vocabulary and graph rules can
  be added without this fixture becoming about them too.

- **`reading-surface/`** — one Lesson filed under two Terms, with an aside in its body. Its
  cluster is *the reading surface*: the chips under the title (two of them, in the order
  `topic` wrote them, labelled by each Term's own `title`), the Term that has no `topic` of
  its own and therefore no chips at all, and the ordinary blockquote that carries an aside
  because Obsidian Markdown has no notation for a margin note. It is deliberately smaller
  than `topic-index/`, which is about the same field read the other way round: this one
  never asks what is filed under a topic, only what a note says it is about.

- **`vault-report/`** — a vault with a backlog and some rot. Its cluster is *the Vault
  report*, so every detail is a fact about what the build has to say that is not a failure.
  Three notes nobody has written yet are leaned on differently on purpose:
  `robin-hood-hashing` carries two `practices` obligations and two mentions,
  `linear-probing` one obligation and two links, `open-addressing` three mentions and no
  obligation at all — which is what makes "typed first, then total, and no constant deciding
  by how much" a fact a test can state, since a weighting constant is exactly what would let
  three mentions overtake one obligation. `terms/eviction` is minted with an **empty body**,
  so backlog and defect are told apart. `lessons/speculative-sketch` is `draft: true` and
  names `speculative-idea`, which nothing else names, so a note that is only ever
  speculated about must not reach the queue at all. On the hygiene side:
  `attachments/unused-diagram.png` is shown by nothing while `bucket-diagram.png` is
  embedded, `references/interview-notes-index` is the one note nothing links to, and
  `terms/probing` is named in a sentence and has nothing filed under it — the narrow
  reading, which is the one that does not fire on correct authoring. Every other note has an
  inbound link deliberately, so each hygiene list holds exactly one thing. The vault has no
  errors; its warnings are unwritten links and one missing cheat sheet, both of which are
  the authoring practice the fixture is about.

- **`long-authoring-queue/`** — one Lesson naming twelve unwritten notes, and the Term it is
  about. Its cluster is *the queue's long tail*: twelve rows leaned on identically, so the
  ranking has nothing to separate them and the whole queue is tail. It exists because the
  tail is **folded and never capped**, and a fixture whose queue fits on a screen cannot say
  so. Deliberately kept apart from `vault-report/`, whose ranking assertions read the whole
  queue and would be about this instead.
