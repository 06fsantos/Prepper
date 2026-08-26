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
  testing/
    build-fixture.ts        seam 1: build(fixtureVault) -> emitted site, and
                            validate(fixtureVault) -> violation list
    build-fixture.test.ts   the seam's own test
    fixtures/               one small vault per behaviour cluster
    mechanisms.test.ts      the Quartz mechanisms the design rests on, run
    spike-build.ts          seam 1 with a plugin that is not in the config yet
    spikes/                 the throwaway plugins those spikes need
  validation/               the validation spine: one rule module, two consumers
    index.ts                the Quartz emitter, registered from quartz.config.yaml
    validate.ts             `npm run validate`, the CI gate
    rules.ts, rules/        every rule there is
```

Plugins, components, and browser code land here as they are built, each in its own
directory, each registered from `quartz.config.yaml`.

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

The exception is [`testing/mechanisms.test.ts`](testing/mechanisms.test.ts), which asserts
on Quartz's behaviour rather than on ours, on purpose: it pins the three mechanisms
Prepper's design rests on
([ticket 02](../.scratch/prepper-build/issues/02-spike-the-unrun-mechanisms.md)), two of
which fail silently. Breaking on a merge is what it is _for_, and
[`docs/upstream-merges.md`](../docs/upstream-merges.md) points at it as the tripwire.
