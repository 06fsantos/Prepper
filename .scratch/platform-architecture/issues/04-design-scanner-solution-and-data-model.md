# Design the scanner solution structure & data model

Type: grilling
Status: resolved
Blocked by: 03

## Question

With the architecture decided ([ADR 0006](../../../docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md)),
design the **inside** of the `scanner/` .NET solution — the next pivot, from which the
ACL, matching, and build tickets hang.

Settle at least:

- **Solution/project layout**: are Job Scanning, Candidate Profile, and Matching/Fit
  Scoring separate projects, folders in one project, or a mix? What is the `scan`
  command's entry-point project (console vs Worker)?
- **Data model**: the shape of `Company`, `Role`, `Match`, and the structured
  `CandidateProfile` — the fields, and which are owned by which context. This is the
  schema the SQLite store persists (EF Core vs Dapper is an implementation call to note,
  not necessarily settle here).
- **`companies.yaml`**: its schema (what identifies a company, its careers-page
  URL(s), any per-company filters) and how the curated list is maintained.
- **v1 result surfacing**: what `scan` emits for a human to read now (terminal table,
  a Markdown report, SQLite-only queried later) — kept minimal, since the ASP.NET shell
  is a named-but-unbuilt direction.

## Context

- The pivot after the architecture decision; resolving it graduates the ACL, matching,
  and build fog into sharp tickets.
- Call `grilling` + `domain-modeling`. New domain terms belong in a `scanner/CONTEXT.md`
  created here (the first scanner term crystallises the file), linked from the root
  [CONTEXT-MAP.md](../../../CONTEXT-MAP.md).
- Respect Separate Ways: the scanner shares no model with the Library.

## Answer

Settled with the owner (grilling, two rounds). Domain terms crystallised into
[`scanner/CONTEXT.md`](../../../scanner/CONTEXT.md), linked from the root
[CONTEXT-MAP.md](../../../CONTEXT-MAP.md).

### Solution & project layout
**Project per bounded context** in one .NET solution — the boundaries are physical and
compile-time-enforced (acyclic references), which is the point of a dual-purpose portfolio
artifact that demonstrates DDD:

- `JobScanning`, `CandidateProfile`, `Matching` — one class library each (the sealed contexts).
- `SharedKernel` — the canonical `Technology` tag vocabulary + alias map, the one shared thing.
- `Infrastructure` — EF Core, the SQLite `DbContext`, migrations.
- `Cli` — the `scan` entry point, on the **Generic Host** (`Microsoft.Extensions.Hosting`)
  so DI/config/logging are wired once and the later scheduled Worker / ASP.NET shell is a
  hosting swap, not a rewrite.

Contexts reference each other **by id only** — Matching stores `RoleId` / `CandidateProfileId`,
never an EF navigation into another context's object graph. That is what keeps the seal real.

### Persistence
**EF Core** on the SQLite provider (the ADR-named Postgres swap path; migrations make the
schema a versioned artifact). Not Dapper/ADO — no raw-SQL/perf need at single-user scale.

### Data model (owner → entity → identity)

| Entity | Owner | Identity |
|---|---|---|
| `Company` (+ `Source` value objects) | Job Scanning | `Slug` (from `companies.yaml`) |
| `Role` | Job Scanning | `(CompanyId, ExternalId ?? SourceUrl)`; `SourceHash`, `FirstSeen`/`LastSeen` |
| `ScrapeRun` | Job Scanning | surrogate `Id` + `StartedAt` |
| `CandidateProfile` (+ `Preferences`) | Candidate Profile | surrogate `Id` (one row now; a table for `[B]`) |
| `Match` | Matching | `(CandidateProfileId, RoleId, ScrapeRunId)` |
| `Technology` (+ alias map) | SharedKernel | canonical `Slug` |

- `ScrapeRun` **in** (audit + dedup + change-detect); a separate `RawPosting` table **out** —
  `Role.SourceHash` covers dedup; raw snapshots are additive later if ACL debugging needs them.
- `Role` carries canonical `Technology` tags; `CandidateProfile` carries the same, primary vs
  secondary (C#/.NET primary, Python/Java secondary — [[dont-narrow-stack-field]]).
- **Filters live on `CandidateProfile.Preferences`**, not in `companies.yaml`: hard filters
  (location, seniority floor) prune before scoring; soft (industry, preferred-tech) feed it.
- `Match` = `Score` (0–100) + `Rationale` (text) + nullable `Breakdown` (per-signal JSON) +
  `Method` (`Rules`|`Embedding`|`Llm`) + `ScoredAt` + `ScrapeRunId` — forward-compatible with
  the (later-designed) matching ladder without a migration.

### companies.yaml
Minimal source-list-plus-hints (schema confirmed in ticket 04's question): per entry an
`id`/slug, `name`, one or more `careers` sources `{ url, ats? }`, optional `tags`/`notes`.
Filters are **not** here. Hand-edited and committed (not personal data).

### v1 result surfacing
**SQLite is the sole source of truth.** `scan` persists Companies/Roles/Matches/ScrapeRuns
and emits no report; a later surface (queries now, the ASP.NET shell eventually) reads it.
No Markdown report.

### Fog graduated by this decision
The `Role` model, the `Company`/`Source` shape, the `Match` shape and the `CandidateProfile`
schema now exist to hang the rest off: solution scaffold (06), companies curation (07), the
scraping-ACL research+design (08→09), the matching provider research + ladder design
(10→11), and the `scan` v1 build (12). Ticket 05 (distil the CV) is unblocked.
