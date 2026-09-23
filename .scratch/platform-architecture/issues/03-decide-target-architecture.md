# Decide the target architecture

Type: grilling
Status: resolved
Blocked by: 01

## Question

Given the research findings, choose the target architecture for Prepper as a web
app that unifies the static Library and the dynamic job-scanner, and document it as
an **ADR**. The decision must respect the map's fixed framing constraints:
single-user now with the multi-tenant door open, local-only now with public hosting
not foreclosed, scanner built as module #1.

The decision should settle at least:

- The top-level shape (monolith / SSG + backend / hybrid meta-framework / separate
  repos) and what happens to the current Quartz build.
- The bounded contexts and how they relate (Learning Content, Job Scanning,
  Candidate/CV Profile, and any others the research surfaces).
- How the Markdown/Obsidian authoring model survives the change.
- The smallest first incremental step, so the scanner can be built without a
  big-bang rewrite.

## Context

- Blocked by **Research: architecture & DDD for a content + scanner web app**.
- This is the pivot: resolving it graduates most of the map's "Not yet specified"
  fog into real tickets (scanner design, CV ingestion, matching, scheduling,
  persistence, presentation, migration steps).
- Call `grilling` + `domain-modeling`; produce an ADR under `docs/adr/`.

## Answer

**Decided and documented as [ADR 0006](../../../docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md).** A new root [CONTEXT-MAP.md](../../../CONTEXT-MAP.md) records the two-context structure. Settled through grilling (rounds Q1–Q7, all confirmed):

- **Top-level shape**: Prepper becomes an **umbrella platform of sealed bounded contexts** (modular, one repo). The current app is kept intact as the **Library** context — Quartz stays a git remote merged periodically, our code under `prepper/`, the vault its domain model, nothing migrated. The **scanner** is a new sibling context in a top-level `scanner/` dir, never inside `prepper/`.
- **Scanner language**: **C#/.NET** — *not* the research's Node/TS default. The Node pick rested only on toolchain proximity, which the Separate-Ways finding cancels; C# is the interview language, plays to the owner's expert strengths, and makes the scanner dual-purpose (portfolio + interview reps).
- **Contexts & relationships**: Learning Content (sealed) is **Separate Ways** with the scanner. The scanner decomposes into **Job Scanning** (with an **ACL** at the scraping edge), **Candidate Profile**, **Matching/Fit Scoring**. **Application Tracking** and **Identity/Accounts** are named-but-deferred so the multi-tenant door stays open.
- **Persistence**: **SQLite** (EF Core, provider-swappable to Postgres later).
- **Eventual shell**: named at low resolution — an **ASP.NET host** serving/reverse-proxying the static Library beside the dynamic scanner UI. Not built here; proves public hosting isn't foreclosed.
- **Smallest first step**: a manually-run **`scan`** command (dotnet console/worker) reading `companies.yaml` + CV profile → fetch via ACL → **cheap-first ladder** (rules → embeddings → LLM re-rank of top-N) → SQLite. Scheduling deferred.

Two empirical unknowns explicitly pushed downstream (scanner-design tickets, not architecture): the LLM/embedding provider + cost bound, and whether target careers pages are hand-rolled HTML or a known ATS (which sizes the ACL). Personal-data location (CV/profile) also deferred to CV-ingestion.
