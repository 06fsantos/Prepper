<!-- wayfinder:map -->

# Platform architecture: Prepper → publishable web app with a job-scanner

## Destination

The target architecture for evolving Prepper from a locally-hosted static Quartz
clone into a web application that unifies the learning **Library** and a
**job-scanner** is **decided and documented (an ADR)** — and the scanner is
**built as that architecture's first dynamic module**: a working adhoc-run v1 over
a curated company list, ranking roles by CV-fit.

Two milestones, one route: *architecture chosen* → *scanner built on it*.

## Notes

- **Domain**: Prepper is today a Quartz clone (static SSG over an Obsidian vault) —
  see `CLAUDE.md` and `CONTEXT.md`. This effort adds a dynamic, stateful, scheduled
  concern (the scanner) it was never built for.
- **This effort carries into EXECUTION**: the scanner v1 is built, not merely
  specced. The architecture decision itself is a planning output (an ADR).
- **Fixed framing constraints** (settled while charting, not tickets):
  - _Audience_: single-user now; the architecture must keep the multi-tenant door
    open, but multi-tenancy is **not built** in this effort.
  - _Publish_: north-star is both surfaces public; **near-term the app is
    local-only**, so actually deploying to the public is out of scope — the
    architecture must merely not foreclose it.
  - _Ordering_: settle architecture first, then build the scanner as module #1.
  - _Target set_: a curated list of companies, not open-web discovery. Industry /
    preferred-technology are filters over roles found, not a search engine.
  - _Match signal_: the owner's CV, distilled once into a structured profile.
- **Skills**: per decision ticket, call `grilling` + `domain-modeling`; `research`
  for AFK facts. The architecture decision is a prime **ADR** candidate.

## Decisions so far

<!-- one line per closed ticket; the detail lives in the ticket, this only gists + links -->

- [Research: architecture & DDD for a content + scanner web app](issues/01-research-architecture-ddd.md):
  Modular monolith, two sealed contexts — **keep Quartz as-is** for the Library, build
  the scanner as an isolated package (own domain model + storage + a scraping
  anti-corruption layer), and later unify under a thin Astro shell (Separate Ways: the
  two halves share no domain). First step: a standalone `scan` CLI over a curated
  `companies.yaml` + CV → cheap-first ranking (rules→embeddings→LLM top-N) → SQLite, run
  manually; scheduling later via GitHub Actions. Full doc:
  [architecture-and-ddd.md](research/architecture-and-ddd.md).
- [Provide the CV the scanner ranks against](issues/02-provide-cv.md): CV supplied at
  `cv/Filipe_AssisSantos_CV.pdf` (private, no git remote). Fit signal — senior/expert
  C#/.NET + SQL Server, fintech domain, event-driven/batch-pipeline & DDD strengths;
  secondary Python/Java (don't hard-filter to one language); London. Source folder hints
  a hedge-fund / systematic-finance target set. CV→structured-profile distillation now
  unblocked.
- [Decide the target architecture](issues/03-decide-target-architecture.md):
  **[ADR 0006](../../docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md)** +
  new root [CONTEXT-MAP.md](../../CONTEXT-MAP.md). Prepper becomes an **umbrella platform
  of sealed bounded contexts, one repo**; the current app is kept intact as the **Library**
  (Quartz untouched, vault its model), the **scanner** is a new sibling `scanner/` context
  in **C#/.NET** (overriding research's Node default — Separate Ways cancels the toolchain
  argument, and C# is the interview language + dual-purpose). Contexts: Job Scanning (ACL at
  the scrape edge), Candidate Profile, Matching/Fit Scoring; Application Tracking & Identity
  named-but-deferred. **SQLite** persistence; **ASP.NET-serves-both** named as the unbuilt
  target. First step: a manual **`scan`** command → ACL → cheap-first ladder (rules →
  embeddings → LLM top-N) → SQLite.
- [Design the scanner solution & data model](issues/04-design-scanner-solution-and-data-model.md):
  **Project per bounded context** in one .NET solution (`JobScanning`, `CandidateProfile`,
  `Matching` + `SharedKernel` + `Infrastructure` + a Generic-Host `Cli`), contexts referencing
  each other **by id only** so the seal is compile-time real. **EF Core** on SQLite (the
  ADR's Postgres-swap path). Entities & owners: `Company`(+`Source`)/`Role`/`ScrapeRun` in Job
  Scanning, `CandidateProfile`(+`Preferences`, where the filters live) in Candidate Profile,
  `Match` (`Score`/`Rationale`/nullable `Breakdown`/`Method`) in Matching, canonical
  `Technology` tags in the Shared Kernel. `companies.yaml` = source-list-plus-`ats`-hints only.
  **SQLite is the sole source of truth** — `scan` persists, emits no report. Domain language:
  [scanner/CONTEXT.md](../../scanner/CONTEXT.md).
- [Scaffold the scanner .NET solution & EF schema](issues/06-scaffold-scanner-solution.md):
  `scanner/Scanner.sln` stood up, builds/tests/runs green. Project-per-context (`SharedKernel`,
  `JobScanning`, `CandidateProfile`, `Matching`, `Infrastructure`, `Cli`), assemblies
  `Scanner.<Project>`. **Reference graph is the seal, acyclic**: `Infrastructure → contexts →
  SharedKernel`, no context references another, Matching is id-only — asserted by 8 passing
  `Architecture.Tests`. EF schema from ticket 04 (+ ticket 10's `Role.Embedding` BLOB) shipped
  as committed migration `InitialSchema`; stub `scan` applies it and creates the 11-table
  `scanner.db`. CI grows an independent .NET `scanner` lane (two lanes, one CI). Docs:
  [scanner/README.md](../../scanner/README.md). One flagged clarification: `Seniority`/
  `Remoteness` scales placed in SharedKernel (CONTEXT.md still says "nothing else is shared").
- [Distil the CV into a structured Candidate Profile](issues/05-distil-cv-into-structured-profile.md):
  CV distilled once into the ticket-04 `CandidateProfile` shape and filed at
  [`cv/profile.yaml`](cv/profile.yaml) (private, next to the CV; YAML mirroring the C#
  properties, the `companies.yaml` sibling convention). Senior / 7yrs / London; 13 canonical
  `technologies` (csharp/dotnet/sql-server **primary**, python/java/… secondary —
  [[dont-narrow-stack-field]]); `preferences` hard (`seniorityFloor: Senior`, London locations,
  `remoteness: null`) vs soft (hedge-fund/systematic-finance industries, C#-stack preferred).
  Slugs presume a not-yet-built SharedKernel alias map; **ticket 12** loads it from a
  configurable, gitignored path (personal data stays out of the committed `scanner/` tree).
- [Research: embedding/LLM provider & cost](issues/10-research-matching-provider-cost.md):
  **Voyage `voyage-3.5-lite`** embeddings (1024-dim; free tier → $0 here), local ONNX
  `all-MiniLM-L6-v2` as a zero-dependency fallback; **Claude re-rank** via the official
  `Anthropic` C# SDK (`IChatClient`, default `claude-opus-5`, structured `{Score, Rationale}`).
  SQLite has no vector type → store `float[]` as a BLOB on `Role`, cosine in-process; `sqlite-vec`
  only if it outgrows a brute-force scan. Per-scan cost ≈ $0 embeddings + ~$0.09–0.50 re-rank —
  **cost does not constrain the design**. Full doc:
  [matching-provider-cost.md](research/matching-provider-cost.md).
- [Curate the initial companies.yaml](issues/07-curate-companies-yaml.md): Committed
  [`scanner/companies.yaml`](../../scanner/companies.yaml) authored against the ticket-04 schema
  (filters excluded — they're on the profile). Owner steer: **both tiers, tight ~10**, all London
  — Tier A systematic-finance/hedge funds (Marshall Wace, G-Research, Man Group, QRT, XTX, Citadel,
  Squarepoint) + Tier B C#/.NET fintech (IG Group, FNZ, Fidelity International). `ats` hints filled
  where known, blank elsewhere; **ticket 08 verifies URLs/ATS/render-mode empirically**. Unblocks
  08 (and, with 09/11, 12).

- [Research: ATS landscape & scraping legality for the curated list](issues/08-research-ats-landscape-legality.md):
  Empirically: **4 Greenhouse + 3 Workday (all with public JSON APIs) + 3 bespoke**; three
  curated `ats` hints were wrong and several careers URLs are gateways/dead. **Two adapters
  (Greenhouse GET, Workday POST) cover 7 of 10** — key adapters off ATS type, one per **ATS**;
  promote the hint to typed connection params (`Source` → discriminated union). The 3 bespoke
  sources are the fragile tail: G-Research cheap HTML, Qube-RT JS, **Citadel expensive +
  Cloudflare + legally sensitive → defer/drop**. Fetch ladder: Greenhouse API → Workday CXS
  → SSR HTML → headless. Central good-citizen policy, one hard line: **no anti-bot evasion for
  Citadel**. Full doc: [ats-landscape.md](research/ats-landscape.md). **Unblocks ticket 09.**
- [Design the matching ladder](issues/11-design-matching-ladder.md): **v1 is the rules rung
  only** — a deterministic 0–100 `Score` that ranks a shortlist the owner scrolls and decides
  by hand (the score *ranks and filters*, never decides), so the LLM re-rank is overkill.
  Embeddings + LLM stay **designed-but-deferred** (the `Match` shape already records them; no
  migration to add later). No top-N cutoff/cost gate — rank all survivors; `Method` always
  `Rules`; zero keys/network. **Hard filter fail-open**: prune only seniority `known && ≤ Junior`
  or confidently non-UK — so `seniorityFloor: Senior` becomes a **soft scoring target**, not the
  hard cut. **Sealed input seam**: orchestrator hands Matching `RoleView`/`ProfileView` (incl.
  company industry), `Match` stores ids only. **Formula** tech 50 (primary 2×) / seniority 20 /
  industry 20 / preferred-tech 10, **weights as config**. `Rationale` = one-liner over the
  `Breakdown` JSON, no LLM. Edited `CONTEXT.md` (Matching ladder + Preferences) and
  `cv/profile.yaml`. **Unblocks ticket 12.**
- [Design the scraping anti-corruption layer](issues/09-design-scraping-acl.md): The ACL is
  **three parts, not one class** — `IRoleSource` adapters (fetch + field-map, **one per ATS**:
  `Greenhouse`/`Workday`/`Html`, selected by a Source's `Kind`), one **shared normalizer**
  (change-detection, Technology tagging, missing-field handling), one **shared politeness
  handler**. **`Source` = one endpoint**, a discriminated union on `SourceKind` carrying typed
  params (MW's five boards = five Sources) — refines ticket-04 schema, **needs an EF migration
  (ticket 12)**. **v1 builds three adapters, no headless browser** → 8/10 companies; Qube-RT
  deferred (recorded, skipped), **Citadel dropped** at the no-evasion line. **Tech tags** =
  deterministic alias-map keyword match over title+plain-text description, in the normalizer
  (zero-network, matches the rules-only ladder). **`SourceHash`** = content hash; a Role is
  **never deleted** — openness derived from `LastSeen` vs the latest *successful* Scrape run,
  a failed source closes nothing; soft fields → `Unknown`, skip only if title/link missing.
  New terms in [scanner/CONTEXT.md](../../scanner/CONTEXT.md). **This was ticket 12's last
  blocker — the build (12) is now the sole frontier ticket.**
- [Build scanner v1: the end-to-end `scan`](issues/12-build-scan-v1.md): **DESTINATION REACHED.**
  The adhoc-run v1 is built and verified live. `ScanRunner` wires the sealed contexts into one
  idempotent pass — ACL (three `IRoleSource` adapters + shared normalizer + politeness handler,
  all new) → normalize/dedup/upsert → rules matcher (Matching kept sealed on primitives) → SQLite,
  no report. `Source` promoted to the typed `SourceKind` union (+ committed `SourceTypedParams`
  migration); `companies.yaml` corrected to ticket-08 facts (5 MW boards, Workday coords incl.
  Fidelity `fil/wd3/001` pinned live, Qube-RT→headless, **Citadel dropped**). Live: **469 roles**
  across 8 companies, **345 matched** (124 hard-filtered), **idempotent** (re-run: 0 new, count
  held at 469); 28 tests pass, AngleSharp bumped to 1.5.0 (CVE). Two live bugs fixed (Workday
  page-1-only `total`; SQLite `DateTimeOffset` non-translation).

## Not yet specified

<!-- The destination (architecture chosen → scanner built on it) is REACHED: every ticket is
     closed. What remains below is future work BEYOND the destination line, not a next ticket on
     this route — each is a fresh effort if pursued. -->

Everything on the route is closed. What stays fog is strictly beyond the execution milestone:

- **Scheduling path** — adhoc now → scheduled later (GitHub Actions `dotnet run` vs a .NET
  Worker). The `scan` to schedule now exists (ticket 12), but scheduling sits past this
  effort's destination — a fresh effort, not a resumption.
- **The auth/identity seam** that keeps the multi-tenant door open — only sharpens if
  tenancy is ever pursued (named-but-deferred in ADR 0006).
- **The ASP.NET shell** that unifies Library + scanner — named in ADR 0006, built nowhere
  here; sharpens only if/when local-only gives way to hosting (near the out-of-scope line).

## Out of scope

<!-- ruled beyond the destination; never graduates unless the destination is redrawn -->

- Building the actual multi-tenant product (accounts, billing, per-user isolation)
  — the door is kept open by the architecture, but nothing multi-tenant is built.
- Deploying to the public — near-term hosting is local; the architecture must not
  foreclose public hosting, but shipping it is a later, separate effort.
