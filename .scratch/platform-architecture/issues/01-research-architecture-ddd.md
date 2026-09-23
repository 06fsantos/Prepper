# Research: architecture & DDD for a content + scanner web app

Type: research
Status: resolved
Blocked by: —

## Question

How should Prepper be structured so a static learning Library (today's Quartz
clone) and a dynamic, stateful, scheduled job-scanner can live in one coherent,
eventually-publishable web application?

Investigate, with tradeoffs for a solo dev with low ops overhead but room to grow:

1. Patterns for coexisting static content + dynamic services (modular monolith;
   SSG frontend + separate API/worker; hybrid meta-framework like Next/Astro/Remix;
   fully separate repos).
2. DDD bounded contexts implied here + a context map, and how much DDD ceremony a
   solo project actually warrants.
3. Preserving the Obsidian-vault Markdown authoring model while the app turns
   dynamic.
4. The scanner as its own context: scheduling, scraping approach + ToS/robots,
   result storage, where LLM CV-to-role matching fits.
5. Deployment/hosting implications and cost/ops per option.
6. The smallest first incremental step that doesn't corner the architecture.
7. Where the answer diverges for single-user vs multi-tenant.

## Context

- Running as an AFK subagent (fired during charting).
- Findings land at
  `.scratch/platform-architecture/research/architecture-and-ddd.md`.
- Feeds the **Decide the target architecture** ticket.

## Answer

Full findings (primary-sourced): [architecture-and-ddd.md](../research/architecture-and-ddd.md).

**Headline**: start as a **modular monolith with two sealed bounded contexts**. Keep
Quartz exactly as-is for the static Library (it is the only tool that treats the
Obsidian vault as its domain model — don't migrate it). Build the scanner as its own
isolated package with its own domain model + storage and an **anti-corruption layer**
at the scraping edge. Publish "as one app" later via a thin hybrid meta-framework
shell (Astro, on-demand adapter) that owns the dynamic scanner UI and links to / serves
the Quartz-built Library statically. The static-vs-dynamic tension largely dissolves
because the two halves share no domain model (DDD **Separate Ways**).

**Bounded contexts**: Learning Content (existing, unchanged), Job Scanning, CV/Candidate
Profile, Matching/Fit Scoring, Application Tracking (future), Identity/Accounts (only in
the multi-tenant case). The two high-value, low-cost DDD moves are the **scraping ACL**
and **keeping the Library's language sealed off**; everything heavier is premature.

**Recommended first incremental step**: build the scanner as a standalone Node/TS package
with a `scan` command that reads a committed `companies.yaml` + the CV, scrapes through
the ACL, ranks with a **cheap-first ladder** (rules → embeddings → LLM re-rank of top-N
only), and writes to **SQLite** — run manually. Decides nothing about hosting, framework,
or tenancy; the Library stays untouched; every later option consumes it. Scheduling then
arrives nearly free via **GitHub Actions `schedule:`**.

**Strongest alternative**: fully separate repos/services — cleaner isolation, more ops,
fights the "one coherent app" goal; adopt only if tenancy or scale arrives.

**Biggest owner-dependent open decision**: single-user personal tool vs multi-tenant
product. Steps 1–2 are identical either way, so it can be deferred — but must be made
before UI/storage choices harden (it governs auth, per-user storage, LLM cost bounds, and
scraping legal exposure — the *hiQ* tort profile).

**Follow-up facts the research flagged as unverified** (empirical, deferred to fog): are
target careers pages JS-rendered or served by known ATSs (Greenhouse/Lever/Ashby/Workday);
whether a full scrape fits serverless CPU limits; exact embedding/LLM provider + cost;
non-US (GDPR) exposure for `[B]`.
