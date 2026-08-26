# 03: The validation spine — rule module, emitter, and CLI

**What to build:** The build talks back about the vault, and it fails when the vault is wrong.
One run collects **every** violation across the corpus and exits non-zero, so renaming one Term
does not mean one build run per note that referenced it.

There are exactly **two severities**, error and warning, and there is no third bucket for signal
to go and be ignored. One rule module with **two consumers**: a Quartz emitter, which surfaces
violations under `quartz build --serve` without killing the dev server so the dev sees them while
writing; and a standalone `npm run validate` CLI, which **invokes Quartz's own pipeline** rather
than parsing the vault itself, so the validator can never resolve a link differently from the
build. CI gates on the CLI, and CI is the only hard gate.

The rule module deliberately gets **no seam of its own**. Hand-built `content[]` inputs drift
from what Quartz actually hands an emitter, which is the exact class of bug the "invoke Quartz's
own pipeline" decision exists to prevent — so both consumers are exercised through the build seam.

This ticket carries the schema and identity rules through that spine end to end; the vocabulary
and graph rules follow in 06.

**Blocked by:** 01

**Status:** resolved

- [x] `npm run validate` runs the vault through Quartz's own pipeline, prints every violation found, and exits non-zero if any is an error
- [x] The same rules surface live under `quartz build --serve` without stopping the server
- [x] Violations carry exactly one of two severities; there is no `info` level and no promotion path between the two
- [x] A deliberately multi-violation fixture reports all of its violations in one run, not just the first
- [x] Error: a note missing a frontmatter field its type requires
- [x] Error: a missing or malformed ULID `id`
- [x] Error: the same ULID appearing twice anywhere — note `id` or quiz infostring, one namespace
- [x] Error: two filenames whose stems collide case-insensitively, anywhere in the vault including `attachments/`
- [x] `draft: true` softens none of these
- [x] CI fails the build on any error
