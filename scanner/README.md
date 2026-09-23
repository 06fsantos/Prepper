# The Scanner

The dynamic half of the platform ([ADR 0006](../docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md)):
a C#/.NET solution that reads a curated list of companies, pulls their open roles, and ranks
them against the owner's CV. It shares no domain model, storage, or code with the Library —
they are **Separate Ways**. The ubiquitous language is [`CONTEXT.md`](CONTEXT.md).

`scan` is the working adhoc-run v1 (ticket 12): it reads the curated roster, pulls each Source
through the Anti-corruption layer into normalized roles, ranks them against the owner's profile
with the rules ladder, and persists everything to SQLite — the sole source of truth, no report.

## Projects

One .NET solution (`Scanner.sln`), a project per bounded context, assemblies and namespaces
all `Scanner.<Project>`:

| Project           | Role                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| `SharedKernel`    | The one shared vocabulary: the canonical `Technology` tag + alias map (seeded from `TechnologyCatalog`), and the `Seniority`/`Remoteness` scales the contexts compare on. |
| `JobScanning`     | `Company` (+ typed `Source`), `Role`, `ScrapeRun`, and the ACL seam: `IRoleSource` + the shared `RoleNormalizer`. |
| `CandidateProfile`| `CandidateProfile` (+ `Preferences`). The CV as data.                     |
| `Matching`        | `RulesMatcher` + `RoleView`/`ProfileView`. Ranks a role against a profile, referencing both **by id only** (primitives only — no Shared Kernel). |
| `Infrastructure`  | EF Core + SQLite `ScannerDbContext` + migrations; the concrete ACL adapters (Greenhouse/Workday/Html) behind one shared politeness handler; the YAML loaders and the technology seeder. |
| `Cli`             | The `scan` entry point on the Generic Host; the `ScanRunner` orchestrator. |

## The reference graph is the seal

The sealing rule is enforced at compile time by which project may reference which. The graph
is **acyclic**, one direction only:

```
Infrastructure ─▶ JobScanning ─▶ SharedKernel
      │           CandidateProfile ─▶ SharedKernel
      │           Matching        (no context, no kernel — id-only)
      └─────────▶ (all three contexts + SharedKernel)
Cli ─▶ Infrastructure ─▶ …
```

Two things make it real:

- **No context references another context.** Matching stores `RoleId` / `CandidateProfileId`
  / `ScrapeRunId` as plain ids, never an EF navigation into another context's object graph.
- **Domain projects stay persistence-ignorant.** `Infrastructure` references the contexts (its
  `DbContext` maps their entities); the contexts do **not** reference `Infrastructure`. This is
  the onion arrangement — it is the only way to keep the graph acyclic, and it is why the ADR
  ticket's loose phrase "contexts reference Infrastructure" is read as its opposite here.

[`tests/Architecture.Tests`](tests/Architecture.Tests/SealingRuleTests.cs) tripwires both by
inspecting real assembly references, so a project reference that a compile would accept still
fails the build.

## Persistence

EF Core on SQLite — one file, **the sole source of truth**; `scan` persists and emits no
report. Migrations are the versioned schema artifact (the ADR's Postgres-swap path lives on
this seam). The `DbContext` is `Scanner.Infrastructure.ScannerDbContext`.

## Commands

```bash
cd scanner
dotnet build Scanner.sln
dotnet test  Scanner.sln

# run one scan: apply the schema, scrape the roster, rank, persist (creates ./scanner.db).
# SCANNER_PROFILE is required and points OUTSIDE the committed tree (personal data).
SCANNER_PROFILE=../.scratch/platform-architecture/cv/profile.yaml \
  dotnet run --project src/Cli -- scan

# after changing an entity, add a migration (dotnet-ef required):
dotnet ef migrations add <Name> -p src/Infrastructure -s src/Cli -o Migrations
```

`.NET 8`. Environment variables:

| Var                | Default          | What                                                            |
| ------------------ | ---------------- | --------------------------------------------------------------- |
| `SCANNER_DB`       | `scanner.db`     | The SQLite file (the sole source of truth).                     |
| `SCANNER_COMPANIES`| `companies.yaml` | The committed curated roster.                                   |
| `SCANNER_PROFILE`  | *(required)*     | The gitignored candidate profile, kept outside `scanner/`.      |

## The scan pass

`ScanRunner` runs one idempotent pass: migrate → seed the `Technology` vocabulary → load the
roster and profile → open a `ScrapeRun` → for each `Source`, resolve its adapter by `Kind` and
fetch through the **Anti-corruption layer** (a `Source` whose `Kind` has no adapter, e.g.
`headless`, is recorded skipped-with-reason; a failed source closes nothing) → normalize,
dedup and upsert `Role`s by `(CompanyId, Url)` → run the **rules matcher** over the roles seen
this run → persist `Match` rows → close the run. It emits no report; query `scanner.db`.

The ACL is three parts (ticket 09): the per-`Kind` `IRoleSource` adapters (`Greenhouse` public
JSON, `Workday` CXS JSON-over-POST, `Html` via AngleSharp), one shared `RoleNormalizer` (tags,
seniority/remoteness inference, `SourceHash`), and one shared `PolitenessHandler` (honest
User-Agent, robots.txt honoured, ~1 req/s per host, **no anti-bot evasion**). The matching
ladder is v1's rules rung only — a deterministic 0–100 score whose weights are configuration.
