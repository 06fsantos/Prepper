# A modular platform: a sealed Library and a .NET scanner beside it

Prepper is growing a second concern it was never built for. Today it is a Quartz clone
that renders the Obsidian vault into a static site: no dynamic state, no schedule, no
agent ([ADR 0002](0002-quartz-as-the-build-pipeline.md)). The new concern is a
**job-scanner** — a stateful, eventually-scheduled service that reads a curated list of
companies, pulls their open roles, and ranks them against the owner's CV. The two share
a mission and nothing else.

The decision is to make Prepper an **umbrella platform of sealed bounded contexts**, with
the current app kept intact as the **Library** context and the scanner added **beside**
it as a new context written in **C#/.NET** — never inside it. The two are **Separate
Ways**: they share no domain model, no storage, and no code. The scanner's first
increment is a manually-run `scan` command; the eventual "one web app" is named as a
direction, not built here.

## The Library is not migrated, and that is the point

The Library stays exactly as it is: Quartz as a git remote merged periodically and never
edited in place, our code under `prepper/`, the six-files-outside-`prepper/` discipline
intact, and the Obsidian vault (`content/`) remaining its domain model. Quartz is the
only tool that treats that vault _as_ its model, and the authoring workflow — write
Markdown offline, run the build — survives the platform's arrival untouched **because
nothing about the Library changes**. Becoming a platform is not a licence to reduce
Quartz's specialness; the remote-merge discipline is what keeps Library upgrades cheap,
and Separate Ways means the scanner never has a reason to reach in.

## Considered options

- **A modular platform, one repo, scanner in C#/.NET.** Chosen. The scanner lands in a
  new top-level `scanner/` directory — a sibling of `prepper/`, joining the short list of
  things outside `prepper/` that are ours to edit. One clone, one place, matching the
  destination's "one coherent app," while the sealed-context boundary keeps the two
  toolchains from contaminating each other.
- **The scanner in Node/TS**, to share the Quartz clone's toolchain. Rejected. The only
  argument for it was toolchain proximity — and the same analysis that recommended sealed
  contexts found the two share **no domain model at all** (DDD Separate Ways), which is
  precisely the benefit that toolchain unity would buy. With that gone, the choice falls
  to the owner's context, and every axis there points to C#: it is the language of the
  interviews this whole repo exists to prepare for, the scanner is exactly the service
  the owner's CV claims mastery of (event-driven and batch pipelines, DDD, an
  anti-corruption layer, async concurrency, SQL), and building it in C# makes it
  **dual-purpose** — a real portfolio artifact and sustained reps in the interview
  language. The price is a polyglot repo; it is contained to two lanes in one CI because
  the contexts are sealed.
- **A separate repo for the scanner.** Rejected. It would buy isolation the domain model
  already enforces and cost the "one publishable app" coherence the destination names,
  for the price of a second repo to clone, version, and wire together.

## The context map

- **Learning Content** — the existing Library. Sealed, unchanged; its domain model is the
  vault. **Separate Ways** with everything below: no shared model, storage, or code.
- **Job Scanning** — fetches and normalizes roles from a curated `companies.yaml`. The
  heterogeneous careers pages are an upstream it does not control, so an
  **anti-corruption layer** sits at that edge, translating messy external HTML and ATS
  payloads into a clean internal `Role`. This ACL is the first of the two DDD moves that
  earn their keep.
- **Candidate Profile** — the CV distilled once into a structured profile. Upstream of
  matching.
- **Matching / Fit Scoring** — the downstream customer of both Job Scanning and Candidate
  Profile; ranks roles against the profile.
- **Deferred, named so the architecture does not foreclose them**: **Application
  Tracking** (future) and **Identity / Accounts** (only ever in the multi-tenant case —
  the door this architecture keeps open and never walks through).

The three scanner contexts are modules — folders or projects — inside **one .NET
solution** for v1, not separate deployables. Their internal layout is a scanner-design
question, not this decision. The sealed Library is the second DDD move that earns its
keep; everything heavier than these two is premature for a solo project.

## Persistence and the eventual shell

Scanner state — companies, roles, matches — lives in **SQLite**, one file, zero ops,
provider-swappable to Postgres via EF Core if multi-tenancy ever arrives. Not Postgres
now (ops cost for a single-user local tool), and not flat files (the scanner needs to
query).

The eventual unification is **named at low resolution and built nowhere here**: an
**ASP.NET host** that owns the dynamic scanner surface and serves or reverse-proxies the
statically-built Library beside it, so both sit under one origin when public hosting
arrives. Naming it costs nothing, proves the door stays open, and keeps the scanner's v1
output consumable by a web host later rather than only by a terminal. Public deployment
itself is out of scope; the architecture must merely not foreclose it, and this does not.

## The smallest first step

A standalone **`scan`** command in `scanner/` — a `dotnet` console or worker — that reads
a committed `companies.yaml` and the structured CV profile, fetches each careers page
**through the ACL** into normalized roles, ranks them with a **cheap-first ladder** (rule
and keyword filters, then an embeddings shortlist, then an LLM re-rank of the top N only,
so the LLM cost is bounded), and writes the results to SQLite. **Run manually.** It
decides nothing about hosting, tenancy, or the shell; the Library stays untouched; every
later option consumes its output. Scheduling arrives later — GitHub Actions running
`dotnet run`, or a .NET Worker — as its own decision.

## Consequences

- The repo becomes **polyglot**. `scanner/` joins `quartz.config.yaml`, `package.json`,
  `.prettierignore`, `tsconfig.json`, `.github/workflows/prepper.yaml`, and `content/` as
  the things outside `prepper/` that are ours to edit. CI grows a .NET lane beside the
  Node one.
- **Personal data has a home problem to solve.** The CV lives in `.scratch/` today
  because the repo has no git remote; the Candidate Profile context inherits the question
  of where a distilled profile and future scan results are filed. The architecture keeps
  that local and uncommitted for now and leaves a seam for filing it properly if hosting
  arrives — a scanner-design concern, not settled here.
- **Two empirical unknowns sit downstream of this decision, not inside it**: which LLM
  and embedding provider the ladder uses and what it costs, and whether the target
  careers pages are hand-rolled HTML or a known ATS (Greenhouse, Lever, Ashby, Workday) —
  which decides how much work the ACL in step two actually is. Both are scanner-design
  tickets.
- The platform gains a `CONTEXT-MAP.md` at the root: Prepper is now more than one bounded
  context, and the existing `CONTEXT.md` is recast as the Library context's glossary. The
  scanner's own `CONTEXT.md` is created when the scanner is built, not before.
