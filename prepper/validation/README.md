# `prepper/validation/` — the validation spine

**Validation is the build's pass/fail judgement on the vault.** A violation is a defect,
and the failing kind stops a release. It is deliberately a separate channel from the
[Vault report](../../CONTEXT.md), and the two never share a line: one shouts, the other
points.

## Two severities, and only two

`error` and `warning` — schema and identity defects err; `unwritten-link`, the first of
the warnings, marks intent. There is no `info` level and **no promotion path** between the
two. A fact worth failing a build over is a rule; a fact that is not is a report line;
there is nothing in between. Every future "should this be a warning or just
informational?" is already answered — and widening `Severity` is a change to that
decision, not a refactor.

`draft: true` **softens nothing**. Publication and validity are separate concerns, which
is also why `@quartz-community/remove-draft` is disabled in `quartz.config.yaml`: it is a
_filter_, and a filter drops a note from `content[]` before any emitter sees it, so
leaving it on would let a half-written note validate clean by being invisible. The
consequence is that a draft is currently rendered like any other note — hiding one is a
rendering decision (unlisted, which leaves it in the corpus the rules see) for the
reading-surface work, never a filter.

## One rule module, two consumers

```
                 rules.ts  ──  validateVault(vault)
                    ▲                    ▲
                    │                    │
   index.ts  (Quartz emitter)      validate.ts  (npm run validate)
   every build, --serve included   spawns `quartz build`, reads the list back
   prints, never throws            exits 0 / 1 / 2   ← CI gates here
```

- **`index.ts`** is a Quartz emitter, registered from `quartz.config.yaml` as
  `./prepper/validation`. `emit(ctx, content[], resources)` is Quartz's whole-corpus
  seam — the one place a plugin is handed every note at once — which is what lets **one
  run collect every violation** instead of one per build. It emits no files, and it never
  throws: Quartz treats a throwing emitter as fatal, and under `quartz build --serve` that
  would take the dev server down exactly when the vault is mid-edit.
- **`validate.ts`** is the hard gate. It does not parse the vault — it runs
  `quartz build`, the same binary with the same config and the same pipeline, and reads
  back the list the emitter collected. A validator with its own parse would eventually
  resolve a link differently from the build, and then the build would be right and the
  gate would be wrong.

CI is the **only** hard gate. `npm run build` and `npm run serve` report and carry on.

### The CLI's contract

```
npm run validate                                   # the vault, content/
npm run validate -- -d prepper/testing/fixtures/x  # any vault
```

| exit | meaning                                                                         |
| ---- | ------------------------------------------------------------------------------- |
| `0`  | no errors — a clean vault, or one with warnings only. A warning marks intent.   |
| `1`  | at least one error. **This is the CI gate.**                                    |
| `2`  | the vault could not be validated: the build failed, or produced no list at all. |

Output is grouped by the note a violation is about, with vault-wide facts under `vault`,
and closes with a count line in the only two words there are:

```
lessons/no-topic.md
  error   frontmatter-required-fields  no frontmatter `topic`: a lesson requires it

vault
  error   ulid-namespace               ULID 01M0Z9…0010 is used 2 times, …

13 errors, 0 warnings in 11 notes.
```

## Adding a rule

1. Write a `Rule` — a kebab-case name and `check(vault): Finding[]` — in a file under
   `rules/`, grouped by what it is about (`schema.ts`, `identity.ts`, `links.ts`,
   `vocabulary.ts`, `graph.ts`, `boundary.ts`, `quiz.ts`, `problems.ts`).
2. Export it from that file's rule array, and list that array in `rules.ts`.

Nothing else moves. Both consumers go through `validateVault`, so a rule added here
surfaces under `--serve` and gates CI at the same moment.

A rule must be:

- **Total** — collect every occurrence, never stop at the first.
- **Pure and order-free** — same vault, same violations. Sorting is the reporter's job.
- **Blind to `draft`.**

`Vault` (see `vault.ts`) is all a rule may read: every note the build parsed — its path,
its filename stem, its type-from-directory, the frontmatter Quartz parsed, the keys the
note itself declared, its Markdown, and the unwritten links the build resolved out of its
body — plus every file on disk, which is the only way to see the half of the vault that is
not Markdown.

That last field is the pattern for anything a rule needs that only the _pipeline_ knows.
`quizDefects` is the second use of it: `prepper/quiz` is the only thing in the build that
parses a quiz fence body, so the quiz rules report what it found rather than going looking
themselves. `problemDefects` is the third: `prepper/problems` is what folded a Problem's
body on its H2 headings and decided what to seal, so the Problem rules report the page's
own account of the note rather than reading its frontmatter and headings a second time.
`unwrittenLinks` is not re-derived here: `prepper/links` records what `crawl-links` had
already decided and leaves it on the vfile, so `unwritten-link` reports the build's own
resolution. A rule that parsed a note's wikilinks itself could eventually resolve one
differently from the page the reader gets, which is the drift this whole design is
arranged against.

That is also why the gate builds with `--concurrency 1`. `ctx.allSlugs`, which is what
wikilink resolution asks whether a target exists, is only complete on Quartz's
single-threaded parse path; under the worker pool it silently loses alias and permalink
slugs, and the same vault would then validate differently depending on how many notes it
has. Every invocation this repo owns pins it. See `prepper/links/index.ts`.

One thing the emitter cannot promise under `npm run serve`: a watch rebuild re-parses
only the files that changed, so writing the note an unwritten link pointed at leaves the
_linking_ page's warning standing until that page is itself touched. `npm run validate`
and CI always build from scratch, so the gate is never stale.

## Why the rule module has no seam of its own

Hand-built `content[]` inputs drift from what Quartz actually hands an emitter, which is
the exact class of bug the "invoke Quartz's own pipeline" decision exists to prevent. Both
consumers are therefore exercised through **seam 1**: the emitter through `site.log` on a
`buildFixture` result, the CLI through `validateFixture`. See
[`validation.test.ts`](validation.test.ts).
