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
  route.
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
  violations.

- **`schema-and-identity-violations/`** — a vault that is wrong in thirteen ways at once:
  a Lesson with no `topic`, one with no `id`, one whose `id` was typed by hand, a Problem
  missing three of the four fields its type requires, a Record with no `date`, a Term that
  declares no `title`, a `draft: true` note that is wrong anyway, two notes sharing one
  ULID, a quiz block whose infostring ULID belongs to a Term, and an attachment whose stem
  collides case-insensitively with a Term's filename. Its cluster is *collect-all*: one
  run has to report every one of them, so notes here are deliberately wrong in more than
  one way and more than one note is wrong. Everything it does **not** violate — its
  `topic` values all name Terms that exist — is so that the vocabulary and graph rules can
  be added without this fixture becoming about them too.
