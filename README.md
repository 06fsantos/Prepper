# Prepper

A software-engineering interview-prep web app. It renders a Markdown vault (`content/`) — authored offline in Obsidian — as a linked, navigable library you read and practice in. The reader browses and picks what to study: the app **runs no agent, stores no per-user state, and schedules nothing**.

Prepper is a **Quartz v5 clone with the vault inside it** ([ADR 0002](docs/adr/0002-quartz-as-the-build-pipeline.md)). Quartz is a git remote, merged periodically and never edited in place; every line of ours lives under [`prepper/`](prepper/README.md) and reaches Quartz through `quartz.config.yaml`.

## The vault

Content is a tree of typed Markdown notes under `content/`. A note's **type is its directory** — nothing is inferred from a slug or a frontmatter flag:

| Type | What it is |
| --- | --- |
| **Lesson** | Teaches one tightly-scoped thing; carries prerequisites and may hold quiz blocks. |
| **Term** | The canonical note for one topic; thin prose above a generated index of everything about it. |
| **Cheat sheet** | One topic condensed to the 20% worth remembering. One per topic that has Lessons. |
| **Reference** | A looked-up note, the published distillation of a Research investigation. |
| **Problem** | A curated interview problem (coding, system-design, or behavioural) with sealed solution. |
| **Plan** | A reading order over notes that already exist — one path through the prerequisite graph. |

Everything else — **Research**, **Records**, the **Mission** — is _Workshop_: present in Obsidian, filtered out of the build, never a page. The reader only ever sees the _Library_ (the six types above). See [`CONTEXT.md`](CONTEXT.md) for the full vocabulary.

## What the app does with it

- **Link graph** — every link indexed at build, each edge typed by the field it was written in (`prerequisites`, `topic`, `practices`, or the body). Typed edges render in context at the foot of an article; untyped ones collect in a backlinks panel.
- **Quiz blocks** — a fenced ` ```quiz ` block in a Lesson becomes an answerable question (multiple-choice, cloze, or free recall). It grades on click and **records nothing** — no storage, no request, no history.
- **Problems** — body sections are named H2s the build folds on; the solution and complexity land in a `<details>` sealed by markup (never a script), so the search-preview pane can't leak it.
- **Reading surface** — a ~52rem serif measure that reads like a document, not documentation. No breadcrumb, progress bar, or read/unread state — there's no per-user state to show.
- **Chrome** — a persistent top bar (search, theme, reader mode, graph), a collapsible left rail carrying the topic tree, and a Material 3 token layer painting all of it from one seed. The reading surface is exempt on the merits ([ADR 0003](docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md)).
- **The one thing remembered** is whether the rail is put away and which tree folds are shut — one `localStorage` key, a fact about a window, not about the reader's work.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Emit the site from `content/` into `public/`. |
| `npm run serve` | Build and serve with live reload. |
| `npm test` | Upstream's suite plus ours. |
| `npm run validate` | Run the vault through the build and report every violation. **The CI gate.** |
| `npm run ulid` | Mint a ULID (record identity is generated, never typed). |
| `npx tsc --noEmit` | Typecheck. |

## Where things are

- [`prepper/`](prepper/README.md) — all of our code, one directory per concern (`quiz/`, `problems/`, `reading/`, `topbar/`, `graph/`, `validation/`, …).
- [`content/`](content/) — the vault.
- [`docs/adr/`](docs/adr/) — the decisions that shaped the app.
- [`CLAUDE.md`](CLAUDE.md) / [`CONTEXT.md`](CONTEXT.md) — architecture and domain vocabulary.

Built on [Quartz v5](https://quartz.jzhao.xyz/) by Jacky Zhao, under the terms in [`LICENSE.txt`](LICENSE.txt).
