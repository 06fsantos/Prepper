# `prepper/` — everything of ours that is code

Quartz is a **git remote, merged periodically, never edited in place**
([ADR 0002](../docs/adr/0002-quartz-as-the-build-pipeline.md)). Divergence from upstream is
a maintenance cost this project decided not to take on, so there has to be somewhere else
for our code to go. This is it.

## The rule

**Our behaviour lives in our own files under `prepper/`, and reaches Quartz through
configuration.** A Quartz plugin is a module Quartz loads by name from
`quartz.config.yaml`, which means a local path works exactly as well as an npm package —
so there is never a reason to reach into `quartz/` and change something.

If you find yourself editing a file under `quartz/`, stop: the change belongs here, and if
it genuinely cannot, it belongs upstream as a pull request.

## What may be edited outside `prepper/`

Six files, all configuration, all expected to conflict occasionally on a merge and all
cheap to resolve:

| File                             | Ours to change                                                  | Why it is not a divergence                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quartz.config.yaml`             | yes, wholly                                                     | Our config file. Upstream ships `quartz.config.default.yaml`; we never touch that, so a merge shows us what changed and we choose.                                                                                                                                                                                                                                                                                                                   |
| `package.json`                   | scripts and dependencies only                                   | Where a plugin's dependencies and our npm scripts have to live. Keep additions grouped and minimal.                                                                                                                                                                                                                                                                                                                                                  |
| `.prettierignore`                | additions only                                                  | Excludes hand-authored prose -- the vault, the vendored skills, the docs -- so `npm run check` never asks to reflow a sentence someone wrote on purpose.                                                                                                                                                                                                                                                                                             |
| `tsconfig.json`                  | `include` paths, plus `allowImportingTsExtensions` and `noEmit` | Upstream's `include` names only `quartz/`, so without this nothing of ours is type-checked and `npm run check` would pass over every error in `prepper/`. The compiler option is what lets one of our plugin files import another: Quartz imports a local plugin as TypeScript at runtime, and Node's ESM resolver needs the `.ts` written out; `noEmit` is the flag TypeScript requires alongside it, and it is what `npm run check` passes anyway. |
| `.github/workflows/prepper.yaml` | ours, wholly                                                    | A new file, not an edit: upstream's `ci.yaml` gates on its own repository and never runs here. Cannot conflict.                                                                                                                                                                                                                                                                                                                                      |
| `content/`                       | wholly                                                          | The vault. Upstream's `content/` was one `.gitkeep`.                                                                                                                                                                                                                                                                                                                                                                                                 |

Everything else at the repo root that is not ours — `quartz/`, `quartz.ts`,
`Dockerfile`, `docs/` other than `docs/adr/`, `docs/agents/`, and
`docs/upstream-merges.md` — is upstream's, and stays untouched.

## Layout

```
prepper/
  note-type.ts              the eight note types, and the Library/Workshop split on them
  ulid.ts                   what counts as a ULID, for the two places that ask
  link-targets.ts           what a frontmatter link field names, as written and resolved
  hooks/                    git hooks, available and never installed by the build
    pre-commit              warns on a changed `id` line; install it with a symlink
  edges/                    typed edges rendered in context, untyped ones in one panel
    index.ts                the component manifest; four config entries, one per placement
    components/index.ts     the component itself, sliced by `options.section`
    edges.test.ts           the rails and the backlinks panel, through seam 1
  topics/                   the generated topic index: `topic`, inverted on the Term note
    topic-index.ts          the pure inversion, read by both views and by the entry page
    index.ts                the component manifest; two config entries, one per view
    components/index.ts     the sidebar tree and the Term page's index, one component
    topics.test.ts          one index, three renderings, through seam 1
  reading/                  the reading surface: the measure, the serif, the chips
    index.ts                the component manifest; one config entry, at `beforeBody`
    components/index.ts     the topic chips, and the page styles that ride on them
    reading.test.ts         the chips, the absent chrome, the measure, through seam 1
  home/                     the app's entry point: a generated `index.html`
    index.ts                a pageType, so the page comes out through Quartz's own layout
  graph/                    the link graph: four typed edge kinds, computed once
    graph.ts                the pure index, read by the emitter and by the components
    index.ts                the emitter, which writes static/linkGraph.json
    graph.test.ts           what is a node and what is an edge, through seam 1
  quiz/                     quiz fences: a fenced quiz block becomes an answerable question
    index.ts                the transformer, registered from quartz.config.yaml at order 25
    quiz.test.ts            the three question types and every defect, through seam 1
  problems/                 Problems: the body folded on its H2s, and the CSS-only seal
    index.ts                the transformer, registered from quartz.config.yaml at order 35
    hints.js                the hint ladder's control, as the browser runs it
    problems.test.ts        the fold, the seal, the ladder and the chips, through seam 1
    browser.test.ts         unseal and the hint ladder, through seam 2
  links/                    wikilink resolution's one gap: the unwritten-link affordance
    index.ts                the transformer, registered from quartz.config.yaml at order 65
    links.test.ts           resolution and unwritten links, through seam 1
  testing/
    build-fixture.ts        seam 1: build(fixtureVault) -> emitted site, and
                            validate(fixtureVault) -> violation list
    build-fixture.test.ts   the seam's own test
    browser.ts              seam 2: an emitted page, in a DOM, running our scripts only
    fixtures/               one small vault per behaviour cluster
    mechanisms.test.ts      the Quartz mechanisms the design rests on, run
    spike-build.ts          seam 1 with a plugin that is not in the config yet
    spikes/                 the throwaway plugins those spikes need
  report/                   the Vault report: the build's other channel, at `/report`
    report.ts               the computation: the authoring queue and the three hygiene facts
    render.ts               the page, whole and self-contained -- emitter output, never a note
    index.ts                the emitter, and the one terminal line per build
    report.test.ts          the queue, the fold and the hygiene facts, through seam 1
  workshop/                 the Workshop boundary, page half: a filter, plus the handoff
    index.ts                withholds Workshop notes, and hands them to validation
  validation/               the validation spine: one rule module, two consumers
    index.ts                the Quartz emitter, registered from quartz.config.yaml
    validate.ts             `npm run validate`, the CI gate
    rules.ts, rules/        every rule there is
```

Plugins, components, and browser code land here as they are built, each in its own
directory, each registered from `quartz.config.yaml`.

## Two things Quartz's plugin loader constrains

**A component plugin is `.ts`, never `.tsx`.** Quartz loads a local plugin by importing it,
and the thing performing that import is Node, which strips TypeScript types but does not
compile JSX. Components therefore build their markup with preact's `h` directly. It is the
same tree; only the notation is denied us, and only in the files Quartz imports at runtime.
For the same reason a plugin that imports a `quartz/` module must pick one whose own imports
name their extensions -- `quartz/util/path.ts` does, `quartz/plugins/emitters/helpers.ts`
does not, and the second is unreachable from here however much upstream's bundler resolves
it for upstream's own plugins.

**A component plugin needs a `package.json`.** Quartz finds a plugin's components through
its `./components` subpath export, and the fallback it tries when there is no `exports` map
looks only for `.js`. Ours is three lines and exists for that one reason.

## Testing

Tests are `node:test` + `node:assert` run by `tsx --test`, which is Quartz's own shape —
matching it is what keeps the suite legible to anyone who knows Quartz, and cheap to keep
working across merges. `npm test` runs ours and upstream's together.

Almost everything is asserted through **seam 1**, the vault-in/site-out contract: a test
states a fact about Markdown that goes in and a fact about the output that comes out. See
[`testing/build-fixture.ts`](testing/build-fixture.ts) for the harness and
[`testing/fixtures/README.md`](testing/fixtures/README.md) for how fixtures are shaped.

A test that asserts which plugin ran, in what order, or what an intermediate mdast node
looked like, is testing our arrangement of Quartz rather than Prepper's behaviour — and it
will break on the next merge for no reason.

**Seam 2** is the small remainder: what our custom elements do when clicked, in a real DOM.
[`testing/browser.ts`](testing/browser.ts) is the harness, and its rule is that the page it
loads is one **seam 1 emitted** — a DOM test over hand-written markup can pass while the
build writes something else, and then the two seams agree with each other about a page that
does not exist. It runs Prepper's scripts and not Quartz's, picked out by the `prepper-`
prefix every custom element of ours is named with; `{ scripts: false }` runs none, which is
the reader with JavaScript off and is a fixture in its own right rather than a lesser one.

The exception is [`testing/mechanisms.test.ts`](testing/mechanisms.test.ts), which asserts
on Quartz's behaviour rather than on ours, on purpose: it pins the three mechanisms
Prepper's design rests on
([ticket 02](../.scratch/prepper-build/issues/02-spike-the-unrun-mechanisms.md)), two of
which fail silently. Breaking on a merge is what it is _for_, and
[`docs/upstream-merges.md`](../docs/upstream-merges.md) points at it as the tripwire.
