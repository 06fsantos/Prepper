# Distil the CV into a structured Candidate Profile

Type: task
Status: resolved
Blocked by: 04

## Question

The CV exists as a PDF (`cv/Filipe_AssisSantos_CV.pdf`, see ticket 02). The Matching
context ranks roles against a **structured** profile, not a PDF. Produce that profile:
distil the CV once into the `CandidateProfile` shape decided in ticket 04, and record
where it is filed.

This is a `task`: the profile's *schema* is a ticket-04 decision, so this ticket does
the one-time distillation against that schema and captures the result. The fit-signal
facts are already extracted in ticket 02's answer — this turns them into the structured
artifact Matching consumes.

## Context

- Blocked by **Design the scanner solution & data model** (needs the `CandidateProfile`
  schema).
- Personal data stays local/uncommitted (the repo has no remote) until the architecture
  files it elsewhere — [ADR 0006](../../../docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md)
  flags this seam.
- Don't hard-filter to one language — the profile carries C#/.NET primary, Python/Java
  secondary ([[dont-narrow-stack-field]]).

## Answer

**Done.** The CV (`cv/Filipe_AssisSantos_CV.pdf`) was read and distilled once into the
ticket-04 `CandidateProfile` shape.

- **Filed at**: [`cv/profile.yaml`](../cv/profile.yaml) — next to the CV, in `.scratch/`,
  because it is personal data and the repo has no remote (the "while private" location
  [ADR 0006](../../../docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md)
  flags). **Format**: YAML mirroring the C# property names, the sibling convention of
  `companies.yaml`.
- **Schema mapped** (`Scanner.CandidateProfile.CandidateProfile` + `Preferences` +
  `ProfileTechnology`): `name`, `seniority` (Senior — Expert title maps to the ladder's
  top candidate-side band), `years: 7`, `domains`, `location`, and 13 canonical
  `technologies` flagged `primary` (csharp/dotnet/sql-server) vs `secondary`
  (python/java/mysql/nunit/jenkins/git/aws/jquery/html/css). `preferences` split hard
  (`seniorityFloor: Senior`, `locations: [London, United Kingdom]`, `remoteness: null`)
  vs soft (`industries: [hedge-fund, systematic-finance, fintech, financial-services]`,
  `preferredTechnologies: [csharp, dotnet, sql-server]`).

### Decisions folded in / facts for later tickets

- **`technologies[].slug` are canonical SharedKernel `Technology` slugs.** The alias map
  that folds "C#", ".NET Core" onto them does not exist yet — a SharedKernel curation
  concern these slugs presume. The scan v1 build (ticket 12) must ensure those slugs
  resolve, or seed them.
- **`remoteness` left `null` on purpose** — the CV states no remote/relocation constraint,
  so setting it would prune wrongly. Flag for the matching-ladder ticket (11) if remoteness
  becomes a fit dimension (carried from ticket 02).
- **Loading is ticket 12's concern, not built here.** No YAML→SQLite loader exists yet
  (`companies.yaml` itself is ticket 07). The scan v1 build should read this profile from a
  **configurable, gitignored path** pointing at `.scratch/.../cv/profile.yaml`, keeping the
  personal artifact out of the committed `scanner/` tree — the seal ADR 0006 asks for.
- **Not narrowed to one language** ([[dont-narrow-stack-field]]): Python/Java carried as
  secondary strengths, not dropped.
