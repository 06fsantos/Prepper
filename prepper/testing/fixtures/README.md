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
  the Workshop boundary. The `draft: true` note stands in for a Workshop note until the
  real Library/Workshop filter exists, and each note carries a nonsense marker word so a
  leak is greppable across the whole emitted site.
- **`emitter-output-and-the-graph/`** — a Lesson, the Term it is about, and a Term nothing
  links to. Its cluster is
  *[mechanism 3](../../../.scratch/prepper-build/research/02-emitter-output-and-the-link-graph.md)*:
  the orphan is there so that "still an orphan after a page linked to it" is a fact a test
  can state.
