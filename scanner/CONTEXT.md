# The Scanner

The dynamic half of the platform ([ADR 0006](../docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md)):
a C#/.NET solution that reads a curated list of companies, pulls their open roles, and
ranks them against the owner's CV. It shares no domain model, storage, or code with the
Library — they are **Separate Ways**. It decomposes into three sealed sub-contexts (Job
Scanning, Candidate Profile, Matching) that reference each other **by id only**, plus a
small **Shared Kernel** and an Infrastructure layer. Its persistence is one SQLite file.

## Language

### Solution shape

**Scan**:
One idempotent pass — fetch every company's roles, normalize, score against the profile,
persist. The unit of work the `scan` command runs and, later, a schedule fires.
_Avoid_: crawl, run (unqualified), job

**Scrape run**:
The recorded audit of a single Scan: when it started, per-company counts and status. What
"new since last time" and dedup are computed against.
_Avoid_: batch, execution, session

**Shared Kernel**:
The one vocabulary Job Scanning and Candidate Profile must agree on to be comparable —
the canonical [[Technology]] tag set. Deliberately tiny; nothing else is shared.

### Job Scanning

The sub-context that turns heterogeneous careers pages into clean internal roles. Owns
`Company`, `Role`, and `Scrape run`.

**Company**:
A curated employer the scanner watches, identified by a stable `Slug` and carrying one or
more careers **Sources**. Authored by hand in `companies.yaml`, not scraped or discovered.
_Avoid_: employer, org, target

**Source**:
One careers-page entry on a Company: a URL and an optional `ats` hint
(`greenhouse` | `lever` | `ashby` | `workday` | `html`). The hint records, at curation
time, whether the page is a known applicant-tracking system or bespoke HTML — which is
what sizes the [[Anti-corruption layer]].
_Avoid_: careers page, feed, endpoint

**Role**:
A single open position, **normalized** — the clean internal shape the Anti-corruption
layer emits, never the raw page. Carries title, location/remoteness, a description, a set
of canonical [[Technology]] tags, seniority, a link, and a `SourceHash` + `FirstSeen`/
`LastSeen` for dedup and change-detection. Identified by `(CompanyId, ExternalId ?? Url)`.
_Avoid_: job, posting, listing, vacancy

**Anti-corruption layer**:
The translation shell at the scraping edge (a DDD ACL): messy per-site HTML or ATS
payloads in, a normalized [[Role]] out, so upstream churn never reaches the scanner's own
model. One of the two DDD moves ADR 0006 keeps.
_Avoid_: scraper (the ACL is more than the fetch), adapter, parser

### Candidate Profile

The sub-context holding the owner distilled into structured, matchable form. Owns
`Candidate profile`. One row today; a table, so multi-tenancy can add rows without a
reshape.

**Candidate profile**:
The CV turned into data: canonical [[Technology]] tags (primary vs secondary — C#/.NET
primary, Python/Java secondary, never narrowed to one), seniority, years, domains
(e.g. fintech), location, and **Preferences**. What Matching ranks a [[Role]] against.
_Avoid_: CV, resume, user

**Preferences**:
The filters, held on the Candidate profile, split into **hard** filters (prune before
scoring) and **soft** filters (feed the score). **Hard** — fail-open — is a confidently
non-UK location and a seniority *clearly* below the band (Junior or lower); a mid-level,
plainly-titled, or `Unknown` role is kept, since "Software Engineer" is often a senior role
by another name. **Soft** is the `seniorityFloor` as a scoring *target* (a mid role ranks
lower but survives), industry, and preferred-tech. The filters live here, not in
`companies.yaml`, because the match signal is the candidate.
_Avoid_: filters (unqualified), criteria, settings

### Matching

The downstream sub-context that ranks. Consumes a [[Role]] and a [[Candidate profile]] (by
id) and produces a `Match`. Owns `Match`.

**Match**:
One scored `(Candidate profile, Role, Scrape run)` triple: a `Score` (0–100), a
human-readable `Rationale`, an optional `Breakdown` (per-signal JSON, filled in as the
[[Matching ladder]] grows), and a `Method` recording which stage produced it. The
persisted answer to "how well does this role fit."
_Avoid_: fit score (that's one field), result, ranking

**Matching ladder**:
The cheap-first scoring escalation — rules → embeddings → LLM re-rank — gated so the
expensive rungs touch few roles. **v1 builds the rules rung only**: a deterministic `Score`
that ranks a shortlist the owner scrolls and decides by hand, so the score's job is to
*rank and filter*, never to decide. Embeddings and the LLM re-rank are designed rungs built
later; `Match` is shaped to record any rung's output without a schema change.
_Avoid_: algorithm, model, pipeline

### Shared Kernel

**Technology**:
A canonical skill/technology tag — a lowercased `Slug` (`csharp`, `dotnet`, `sql-server`)
with an alias map folding variants (`C#`, `.NET`, `CSharp`) onto it. Both a [[Role]] and a
[[Candidate profile]] store these, which is what makes them comparable.
_Avoid_: skill, tag, stack, tech
