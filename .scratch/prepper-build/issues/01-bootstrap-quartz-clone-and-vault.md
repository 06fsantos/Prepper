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

**Status:** ready-for-agent

- [ ] The repo is a git repo with Quartz configured as an upstream remote, and a documented merge procedure
- [ ] `content/` exists with the settled layout: `lessons/`, `references/`, `problems/`, `terms/`, `cheat-sheets/`, `research/`, `records/`, `attachments/`, and `MISSION.md`
- [ ] `RESOURCES.md` and `NOTES.md` exist at the repo root, outside the vault
- [ ] `npm run build` emits a site from `content/` with no manual steps
- [ ] Opening `content/` in Obsidian works: notes render, `[[wikilinks]]` resolve, no numeric filename prefixes outside `records/`
- [ ] A test can build a fixture vault from a directory of Markdown and assert on emitted HTML and `contentIndex.json`
- [ ] No code of ours lives as an edit to a Quartz file
