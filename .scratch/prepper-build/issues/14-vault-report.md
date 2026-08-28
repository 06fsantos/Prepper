# 14: The Vault report at `/report`

**What to build:** The build's other channel. **Validation shouts and the report whispers**, and the
two never share a line: a fact worth failing a build over is a rule, a fact that is not is a report,
and there is nothing in between and no promotion path between them. Nothing is wrong when the
report prints.

A page at `/report`, emitted by **every** build, plus **one terminal line per build** pointing at
it. Published **unlisted** rather than `--serve`-only, so the build has one mode rather than two
that diverge. Two sections:

**Authoring queue** — *what should I write next*, answered by the vault rather than by memory.
Unwritten notes ranked by how much existing writing leans on them, sorted **typed-then-total with
the breakdown printed** and **no weighting constant**, so a committed `practices` obligation
outranks a passing mention without a magic number deciding by how much. The breakdown is
**navigation, not decoration**: an unwritten note has no page of its own, so each row links to its
inbound sources. Terms minted with an empty body are listed here too — a note waiting to be written
is backlog, not a defect. A `draft: true` note's body links are excluded, so the queue fills with
committed intent rather than speculation. The long tail is folded, never capped.

**Vault hygiene** — *what rotted*: unreferenced attachments; Library notes with no inbound links;
Terms with **no inbound `topic` edge** (narrowed from "nothing points at", whose wide reading fires
constantly on correct authoring).

**Load-bearing implementation constraint:** the report must be emitted **as a page** and must
**never** be generated as a virtual `content/` file fed through the transform pipeline. Were its
links to become graph edges, the report would link to every orphan it lists, each would gain an
inbound link, and the hygiene section would **erase itself on the second build** — a failure that
is silent. Being emitter output is also what keeps it out of `description` and `crawl-links`
structurally, the same category as `contentIndex.json` and the 404 page, so the Library-only
rendering rule is untouched. 02 is where this was proven.

Nothing on this channel is ever validated.

**Blocked by:** 05, 02

**Status:** resolved

- [x] Every build emits `/report`, and prints exactly one terminal line pointing at it
- [x] The report is published unlisted, in both `build` and `build --serve`
- [x] The authoring queue ranks unwritten notes typed-then-total, printing the breakdown, with no weighting constant
- [x] Each queue row links to the notes that link to it
- [x] Terms with an empty body appear in the queue
- [x] A `draft: true` note's body links do not contribute to queue ranking
- [x] Hygiene lists unreferenced attachments, Library notes with no inbound links, and Terms with no inbound `topic` edge
- [x] Building twice in a row leaves the hygiene section unchanged
- [x] `/report` contributes no edges to the link graph and does not appear in `contentIndex.json`

## What was built

`prepper/report/`, registered from `quartz.config.yaml` as one **emitter** entry
(`- source: "./prepper/report"`, `enabled: true`, appended after `./prepper/validation`;
that is the only edit to that file).

- **`report.ts`** — the computation, pure. Reads the link graph rather than re-deriving it:
  the queue's rows are the graph's **placeholder nodes** (a target no node answers to) plus
  Terms whose body is empty, ranked `typed → total → alphabet` with no weighting constant,
  each row carrying its inbound edges grouped by type and named by their source note's
  `title`. `draft: true` drops a note's *relates-to* edges and nothing else — its
  frontmatter edges are commitments whatever its publication state. Hygiene is three
  derivations off the same graph plus `ctx.allFiles`: an attachment nothing links or shows,
  a node with no inbound edge, a Term with no inbound *about* edge.
- **`render.ts`** — the page: one self-contained HTML document. Quartz's `renderPage` is
  `.tsx` and therefore unreachable from a local plugin, which settled the question the spike
  had already answered from the other side. The tail folds at ten rows into a `<details>`;
  nothing is ever dropped.
- **`index.ts`** — the emitter. Writes `report.html` (Quartz's dev server serves `/report`
  from it), prints exactly one line — `[prepper] report: /report — N in the authoring queue,
  M in vault hygiene` — and never throws, for the same reason validation does not. It reads
  `content[]` **plus `withheldNotes(ctx)`**: an attachment a research note shows is an
  attachment in use, and the graph drops the Workshop half on its own anyway.

Attachment references needed one thing no existing list held: `crawl-links` rewrites an
`<img>` src and does not record it, so an embedded image is invisible in `file.data.links`
and in `bodyLinks`. `assetsOf(tree, slug)` reads them off the emitted tree — the build's own
output, not a second parse of the Markdown.

Fixtures: **`vault-report/`** (the ranking, the empty Term, the draft, and one item in each
hygiene list) and **`long-authoring-queue/`** (twelve identically-ranked rows, so the fold is
statable). Both described in `prepper/testing/fixtures/README.md`.

`npm test` 337 pass / 0 fail; `npx tsc --noEmit` clean; `npm run validate` clean;
`npx prettier . --check` clean.
