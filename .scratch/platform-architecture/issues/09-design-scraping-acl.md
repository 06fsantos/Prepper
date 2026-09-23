# Design the scraping anti-corruption layer

Type: grilling
Status: resolved
Blocked by: 06, 08

## Question

Design the ACL at the scraping edge (Job Scanning): messy per-site HTML / ATS payloads in,
normalized `Role` out. The `Role` shape is fixed (ticket 04); this decides how it is
produced.

Settle:

- The **fetch/parse strategy** per source class the research (ticket 08) found — ATS JSON
  endpoint vs HTML (Cheerio-equivalent, e.g. AngleSharp) vs headless browser (Playwright)
  — and how a `Source`'s `ats` hint selects it.
- The **ACL seam**: the interface Job Scanning depends on (e.g. `IRoleSource` per ATS/site
  family), so a new company/ATS is a new adapter, not a change to the core.
- **Normalization rules**: dedup via `SourceHash`, `FirstSeen`/`LastSeen` bookkeeping,
  mapping raw skill strings onto canonical `Technology` tags, handling missing fields.
- **Politeness**: robots.txt honoring, rate limiting, bot identification (per ticket 08).

## Context

- Call `grilling` + `domain-modeling`; new terms → `scanner/CONTEXT.md`. The ACL term is
  already seeded there.
- Blocked by scaffold (06, real projects) and ATS research (08, the source facts).
- Blocks ticket 12 (the build wires these adapters into `scan`).

## Answer

The ACL is **three collaborating parts, not one class** — settled against ticket 08's
empirical landscape (7/10 on public JSON APIs, 3 bespoke, Citadel behind Cloudflare). New
domain language folded into [`scanner/CONTEXT.md`](../../../scanner/CONTEXT.md): sharpened
**Source** and **Anti-corruption layer**, new **Role source**, and a **Role** that is never
deleted.

### 1. The seam: `IRoleSource` adapters + one shared normalizer + one shared policy

- **`IRoleSource`** is the seam Job Scanning depends on: one implementation **per ATS
  family** — `GreenhouseRoleSource`, `WorkdayRoleSource`, `HtmlRoleSource` — selected by a
  Source's `Kind`. An adapter owns **fetch + per-source field-mapping** and emits a
  *candidate* `Role`. Adding a company or ATS is a new `Source` row or a new adapter, never
  a change to the core.
- **One central normalizer**, downstream of every adapter, owns everything ATS-independent:
  Technology-tag extraction, `SourceHash`/dedup, `FirstSeen`/`LastSeen` bookkeeping, and
  missing-field handling. The DDD boundary is *translation per-source, invariants central*.
- **Politeness is a shared `DelegatingHandler`** on the `HttpClient` every adapter uses — not
  re-implemented per adapter.

### 2. `Source` is one endpoint, typed by `Kind`

- **One `Source` = one fetchable endpoint**; a `Company` has many. Marshall Wace's five
  Greenhouse boards are five `Source` rows, not an array inside one. Keeps a Source atomic
  and makes the `Scrape run`'s per-source audit meaningful.
- `Source` becomes a **discriminated union on `SourceKind`** (`Greenhouse` | `Workday` |
  `Html`) carrying typed params per kind: Greenhouse `boardToken`, Workday
  `tenant`/`wdN` host/`site`, Html `url`. The old free-text `ats` hint is retired into this.
- **Flag for ticket 12**: this refines ticket 04's `Source` shape → needs an EF migration
  over the scaffolded schema. `companies.yaml` also needs ticket 08's corrections
  (Man Group→Greenhouse, G-Research→Html, Citadel→dropped, the five filled blanks, and the
  dead/gateway URL repairs).

### 3. v1 scope: three adapters, no headless browser

Fetch ladder = Greenhouse API → Workday CXS → SSR HTML (AngleSharp) → *(future)* headless.
- **Build**: `Greenhouse`, `Workday`, `Html`. Reaches **8/10** companies with **zero browser
  dependency** — serverless-friendly and cheap.
- **Qube-RT** (JS-rendered): a `Source` recorded but **deferred** — its `Kind` has no adapter
  yet; the `Scrape run` records it skipped-with-reason. The `IRoleSource` interface
  anticipates a future `HeadlessRoleSource` without building it.
- **Citadel**: **dropped** at the hard line — Cloudflare bot-block, and no anti-bot evasion
  is built.

### 4. Technology tags: deterministic keyword match, in the normalizer

- An ATS payload gives title + HTML description, not clean skill tags. v1 extracts tags by
  **matching the canonical Technology alias map (the Shared Kernel vocabulary) over
  title + plain-text description** — word-boundary, case-insensitive, zero-network, zero-key
  (consistent with the rules-only Matching ladder, ticket 11).
- ATS-independent, so it lives in the **central normalizer**, not per-adapter. Accept false
  negatives — a technology absent from the map isn't tagged; the map grows. LLM extraction is
  deferred with the rest of the LLM rung.

### 5. Normalization invariants (the central normalizer's contract)

- **Change-detection**: `SourceHash` = hash of the *normalized content* (title, location,
  description, link, tags), computed after field-mapping. A re-scan always bumps `LastSeen`;
  a differing hash updates the role and flags it changed. Per-ATS freshness fields
  (`updated_at`, ids) are **ignored** — not uniformly available across the three source
  classes.
- **Vanished roles**: **never deleted.** "Currently open" is *derived* — a `Role` whose
  `LastSeen` == the latest **successful** `Scrape run` for its `Source`. A **failed or
  skipped source closes nothing** (guards against a transient outage mass-closing a company).
- **Missing fields**: emit `Unknown`/null for soft fields (seniority, location, remoteness,
  empty tags) — never drop, matching the fail-open Preferences contract. **Skip + log only**
  when the actionable minimum (title, link) is absent. The description is stored as
  **stripped plain text** so hashing, tag-extraction, and the search index all read clean
  text, not ATS HTML.

### 6. Good-citizen policy (the shared handler), one hard line

- Honest identifying `User-Agent` (`PrepperScanner/1.0 (personal job-search tool)`); fetch
  and honour `robots.txt`; ≤24h response cache (chiefly for dev-iteration); trickle rate
  limit (~1 req/s per host — the roster is ~10 companies, not a crawl); prefer JSON APIs over
  HTML.
- **Hard line**: no header-spoofing, no anti-bot evasion. A 403/bot-block (Citadel) is
  recorded as failed and **never retried with evasion**.
- **Failures are per-source and non-fatal**: the `Scrape run` records each source's status;
  one dead source does not fail the `Scan`.
