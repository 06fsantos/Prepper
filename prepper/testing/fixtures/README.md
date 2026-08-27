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
