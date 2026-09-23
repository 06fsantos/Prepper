# Scaffold the scanner .NET solution & EF schema

Type: task
Status: resolved
Blocked by: 04

## Question

Stand up the empty `scanner/` solution in the shape decided in ticket 04, so every later
ticket has real projects and a real schema to write against. Nothing to decide — execution.

Do:

- Create the solution and the six projects: `JobScanning`, `CandidateProfile`, `Matching`
  (class libs), `SharedKernel`, `Infrastructure` (EF Core + SQLite), `Cli` (Generic Host,
  `Microsoft.Extensions.Hosting`, a stub `scan` command that resolves DI and exits).
- Wire the project references **acyclically** and by the sealing rule (contexts reference
  `SharedKernel` and `Infrastructure`, never each other's internals; cross-context links are
  by id). Add an architecture test or a reference-graph check if cheap.
- Define the EF entities from ticket 04's table (`Company`+`Source`, `Role`, `ScrapeRun`,
  `CandidateProfile`+`Preferences`, `Match`, `Technology`+aliases) and the `DbContext`;
  generate the initial migration; confirm the SQLite file is created.
- Add the CI lane for the .NET build/test (the ADR's "two lanes, one CI") if not already.

## Context

- Pure execution off ticket 04's decisions; unblocks 09, 11, 12 (real code to target).
- Respect Separate Ways: nothing here touches `prepper/` or the Library toolchain.
- `.NET 8` is on PATH. `scanner/CONTEXT.md` holds the ubiquitous language.

## Answer

Executed. The `scanner/` solution is stood up in ticket 04's shape and builds, tests, and
runs green; the SQLite schema is a committed migration and the stub `scan` creates the file.

**Solution** — `scanner/Scanner.sln`, project-per-context, assemblies/namespaces all
`Scanner.<Project>`:
- `SharedKernel`, `JobScanning`, `CandidateProfile`, `Matching` (class libs),
  `Infrastructure` (EF Core + SQLite, the `ScannerDbContext`), `Cli` (Generic Host,
  `Host.CreateApplicationBuilder`, a `scan` command that resolves DI, applies migrations, and
  exits).
- `tests/Architecture.Tests` (xUnit, 8 passing).

**Reference graph (the seal, acyclic)** — `Infrastructure → contexts → SharedKernel`;
`Cli → Infrastructure`. No context references another context; **Matching references nothing
but base** (it stores `RoleId`/`CandidateProfileId`/`ScrapeRunId` as ids). One deviation from
the ticket's wording, deliberate: the ticket said "contexts reference SharedKernel **and
Infrastructure**", but Infrastructure must reference the contexts to map their EF entities, so
the honest acyclic direction is the onion one — domain projects are persistence-ignorant,
Infrastructure depends on them. `SealingRuleTests` asserts all of this off real assembly
references, so it fails the build the day someone adds a forbidden project reference.

**EF schema** — every entity from ticket 04's table: `Company` (+ owned `Source`), `Role`
(+ `RoleTechnology` join, unique index on `(CompanyId, Url)`, and — per resolved ticket 10 —
a `byte[]? Embedding` BLOB), `ScrapeRun` (+ `ScrapeRunEntry` per-company counts),
`CandidateProfile` (+ owned `Preferences`, + `ProfileTechnology` join carrying primary/
secondary), `Match` (unique `(CandidateProfileId, RoleId, ScrapeRunId)`), `Technology`
(+ `TechnologyAlias`). Initial migration `InitialSchema` committed; `scan` applies it and the
11 tables are created in `scanner.db`.

**CI** — `.github/workflows/prepper.yaml` grows a second, independent `scanner` job (setup
.NET 8 → restore → build -c Release → test). Two lanes, one CI; Separate Ways, so neither
lane blocks the other. `scanner/.gitignore` keeps `bin/`/`obj/`/`*.db` out; migrations are
committed.

**Docs** — [`scanner/README.md`](../../../scanner/README.md) records the solution shape, the
reference-graph reasoning, and the build/migrate/run commands.

**One clarification for the owner (not acted on unilaterally):** the schema places the
`Seniority` and `Remoteness` scales in `SharedKernel` beside `Technology`, because they meet
`CONTEXT.md`'s own stated criterion for the kernel — vocabulary Job Scanning and Candidate
Profile must agree on to be comparable (a hard filter compares `Role.Seniority` to
`Preferences.SeniorityFloor`). `scanner/CONTEXT.md` still reads "nothing else is shared";
left as authored. Worth a one-line CONTEXT.md update to match, if the owner agrees the scales
belong in the kernel.

Nothing here touches `prepper/` or the Library toolchain.
