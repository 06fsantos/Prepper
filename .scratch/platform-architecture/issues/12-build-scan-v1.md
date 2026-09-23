# Build scanner v1: the end-to-end `scan` command

Type: task
Status: resolved
Blocked by: 05, 07, 09, 11

## Question

The effort's execution milestone: wire the pieces into one working `scan` that reads
`companies.yaml`, scrapes via the ACL, ranks against the profile, and persists everything to
SQLite — the adhoc-run v1 the destination names. Nothing left to decide; assemble.

Do:

- `scan` opens a `ScrapeRun`, iterates the curated companies, runs each source through the
  ACL (ticket 09) to normalized `Role`s, dedups via `SourceHash`.
- Loads the `CandidateProfile` (ticket 05), runs the matching ladder (ticket 11) to produce
  `Match` rows, closes the `ScrapeRun` with counts/status.
- Idempotent: re-running updates `LastSeen` and re-scores without duplicating roles.
- Verify against the real list (ticket 07): the SQLite file holds queryable
  Companies/Roles/Matches/ScrapeRuns and the top matches look sane.

## Context

- Execution off the sealed contexts; SQLite is the sole source of truth (no report — ticket 04).
- Reaching a working `scan` graduates the last fog: the **scheduling path** (adhoc →
  GitHub Actions `dotnet run` vs a .NET Worker), which only sharpens once there is a `scan`
  to schedule.

## Answer

**Done — the adhoc-run v1 is built and verified live against the real roster. This reaches the
map's destination: architecture chosen (ADR 0006) → scanner built on it.**

### What was assembled

The pieces the design tickets settled, wired into one idempotent `ScanRunner.RunAsync`
(`src/Cli/ScanRunner.cs`): migrate → seed the `Technology` vocabulary → load roster + profile →
open a `ScrapeRun` → per `Source`, resolve the adapter by `Kind` and fetch through the ACL →
normalize/dedup/upsert `Role`s → rank the roles seen this run → persist `Match` rows → close
the run. **SQLite is the sole source of truth; no report** (ticket 04).

- **The ACL, three parts** (ticket 09), all new:
  - `IRoleSource` + three adapters in `Infrastructure/Acl/RoleSources.cs`: **Greenhouse** (public
    boards JSON GET), **Workday** (CXS JSON-over-POST, paginated), **Html** (AngleSharp over
    G-Research's `<a href="/vacancies/…">`). A `headless` Kind has no adapter → recorded
    skipped-with-reason.
  - One shared `RoleNormalizer` (`JobScanning/RoleNormalizer.cs`): HTML→text, canonical
    Technology tagging (word-boundary alias match over the seeded vocabulary), seniority/
    remoteness inference, and the `SourceHash` change signal — pure, unit-tested.
  - One shared `PolitenessHandler` (`Infrastructure/Acl/PolitenessHandler.cs`): honest
    User-Agent, robots.txt honoured, ~1 req/s per host, **no anti-bot evasion** (the hard line).
- **`Source` promoted** to the typed discriminated shape (ticket 08/09): `SourceKind`
  (`Greenhouse`|`Workday`|`Html`|`Headless`) + typed params, replacing the old `ats` hint.
  Shipped as committed EF migration `SourceTypedParams`.
- **`companies.yaml` corrected** to ticket 08's empirical facts: 5 Marshall Wace Greenhouse
  boards, Man Group→Greenhouse, G-Research→Html, IG/FNZ/Fidelity Workday coordinates (Fidelity
  `fil`/`wd3`/`001` pinned live during the build), Qube-RT→headless, **Citadel dropped** at the
  no-evasion line.
- **The rules matcher** (ticket 11), Matching kept sealed on primitives (no Shared Kernel — the
  architecture test still passes): `RulesMatcher` + `RoleView`/`ProfileView`; fail-open hard
  filter, the tech-50/seniority-20/industry-20/preferred-10 formula with **weights as config**,
  and `Rationale`+`Breakdown` computed together, no LLM.
- **Profile loader** (ticket 05): reads the gitignored `profile.yaml` from `SCANNER_PROFILE`,
  keeping personal data out of the committed tree; the `TechnologyCatalog` seed ensures its
  slugs resolve.

### Verified (live, 2026-09-17)

Two full runs against the real roster:

- **469 roles** across 8 live companies (Fidelity 106, Squarepoint 94, FNZ 67, G-Research 62,
  IG 61, Man Group 55, Marshall Wace 14 over 5 boards, XTX 10); Qube-RT skipped (headless),
  Citadel absent. All source statuses `ok`.
- **345 matches** scored (124 roles hard-filtered — junior/intern or confidently non-UK; a
  DB check finds **0** matches for a known-junior role). Top matches are sane: senior roles at
  the hedge funds (Man Group, Squarepoint) lead; C#/.NET tagging fires on real Man Group roles.
- **Idempotent**: the second run reported **0 new roles**, the role count held at **469**, and
  `LastSeen` bumped — dedup by `(CompanyId, Url)` holds. Matches are per-run snapshots (345×2).
- Two bugs found and fixed during verification: Workday reports `total` only on page 1 (later
  pages return `total:0` while still carrying postings) — paginate on the returned count; and
  SQLite's EF provider can't translate a `DateTimeOffset` filter — score the touched roles from
  memory instead. Also bumped AngleSharp to 1.5.0 (the earlier pin carried a moderate mXSS CVE).
- `dotnet test Scanner.sln`: **28 passing** (8 architecture-seal + 20 new domain tests for the
  matcher and normalizer); Release build clean, no warnings.

### Fog beyond the destination (not graduated)

The map's destination is reached, so the remaining fog is **future work past this effort's line**,
not a next ticket on this route: the **scheduling path** (a `scan` now exists to schedule —
GitHub Actions `dotnet run` vs a .NET Worker), the **auth/identity seam**, and the **ASP.NET
shell** that unifies Library + scanner (all named-but-deferred in ADR 0006). Each is a fresh
effort if pursued.
