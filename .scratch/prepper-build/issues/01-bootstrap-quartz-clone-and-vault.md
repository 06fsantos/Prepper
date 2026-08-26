# 01: Bootstrap the repo as a Quartz clone with the vault inside it

**What to build:** A repo that builds. `npm run build` takes `content/` and emits a site, and a
test can build a small fixture vault and assert on what came out. The vault is a real Obsidian
vault the dev can open and edit today, seeded with enough hand-written notes to see a page.

Quartz upstream is a **git remote, merged periodically, never edited in place** — our code lives
in our own plugin files and config from the first commit ([ADR 0002](../../../docs/adr/0002-quartz-as-the-build-pipeline.md)).

The test harness set up here is **seam 1**, which nearly every later ticket asserts through:
`build(fixtureVault) → emitted site`. Fixtures are small, purpose-built vaults, one per
behaviour cluster — not one large vault every test reads. Match Quartz's own test suite in
shape, so the tests stay legible across upstream merges.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The repo is a git repo with Quartz configured as an upstream remote, and a documented merge procedure
- [x] `content/` exists with the settled layout: `lessons/`, `references/`, `problems/`, `terms/`, `cheat-sheets/`, `research/`, `records/`, `attachments/`, and `MISSION.md`
- [x] `RESOURCES.md` and `NOTES.md` exist at the repo root, outside the vault
- [x] `npm run build` emits a site from `content/` with no manual steps
- [x] Opening `content/` in Obsidian works: notes render, `[[wikilinks]]` resolve, no numeric filename prefixes outside `records/`
- [x] A test can build a fixture vault from a directory of Markdown and assert on emitted HTML and `contentIndex.json`
- [x] No code of ours lives as an edit to a Quartz file

## Answer

Done across three commits: the repo's own material, the Quartz `v5` merge, and our work on
top.

**The repo.** `upstream` → `https://github.com/jackyzha0/quartz.git`, branch `v5`, merged
with `--allow-unrelated-histories` after Prepper's own files were committed first, so the
merge reads as purely additive and `git log --first-parent` stays a history of our work.
Only `.gitignore` conflicted. The procedure is
[`docs/upstream-merges.md`](../../../docs/upstream-merges.md).

**Where our code goes.** [`prepper/`](../../../prepper/README.md), reaching Quartz through
`quartz.config.yaml`. Four files outside `prepper/` are ours and no others:
`quartz.config.yaml`, `package.json` (scripts and dependencies), `.prettierignore`
(additions), and `content/`. Nothing under `quartz/` was touched.

**Seam 1** is [`prepper/testing/build-fixture.ts`](../../../prepper/testing/build-fixture.ts):
`buildFixture(name) → EmittedSite`, which shells out to `quartz build -d <vault> -o <tmp>`
so a test can never resolve a link differently from a real build, and hands back emitted
HTML (queried by CSS selector), `contentIndex.json`, the emitted file list, the build log,
and the exit code. Fixtures are small purpose-built vaults under
`prepper/testing/fixtures/`, one per behaviour cluster; the convention is written down in
that directory's README.

**One decision made along the way that later tickets inherit:** the build was made a pure
function of `content/` by pointing `created-modified-date` at frontmatter only. Git and
filesystem dates would otherwise have made a fixture build depend on more than its vault,
and the spec's purity claim is what seam 1 rests on.
