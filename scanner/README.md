# The Scanner

The dynamic half of the platform ([ADR 0006](../docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md)):
a C#/.NET solution that reads a curated list of companies, pulls their open roles, and ranks
them against the owner's CV. It shares no domain model, storage, or code with the Library —
they are **Separate Ways**. The ubiquitous language is [`CONTEXT.md`](CONTEXT.md).

This is the scaffold (ticket 06): the projects, the reference wiring, the EF schema, and a
stub `scan`. The scrape ACL (09), the matching ladder (11), and the real `scan` pass (12) are
built on top of it.

## Projects

One .NET solution (`Scanner.sln`), a project per bounded context, assemblies and namespaces
all `Scanner.<Project>`:

| Project           | Role                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| `SharedKernel`    | The one shared vocabulary: the canonical `Technology` tag + alias map, and the `Seniority`/`Remoteness` scales the contexts compare on. |
| `JobScanning`     | `Company` (+ `Source`), `Role`, `ScrapeRun`. The scraping context.        |
| `CandidateProfile`| `CandidateProfile` (+ `Preferences`). The CV as data.                     |
| `Matching`        | `Match`. Ranks a role against a profile, referencing both **by id only**. |
| `Infrastructure`  | EF Core, the SQLite `ScannerDbContext`, migrations.                       |
| `Cli`             | The `scan` entry point on the Generic Host.                               |

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

# apply the schema and run the stub pass (creates ./scanner.db, or $SCANNER_DB)
dotnet run --project src/Cli -- scan

# after changing an entity, add a migration (dotnet-ef required):
dotnet ef migrations add <Name> -p src/Infrastructure -s src/Cli -o Migrations
```

`.NET 8`. The database path defaults to `scanner.db` in the working directory; override with
the `SCANNER_DB` environment variable.
