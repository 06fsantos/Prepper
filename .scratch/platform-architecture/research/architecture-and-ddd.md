# Platform architecture and DDD: coexisting static learning content with a dynamic job-scanner

Research for the platform-architecture feature. Investigated 2026-09-15 against primary
sources (official framework docs, RFC 9309, Fowler's DDD/architecture essays, the Ninth
Circuit ruling in *hiQ v. LinkedIn*) plus the repo's own prior research. Every non-obvious
claim carries the URL that owns it in the Sources section.

**Assumptions stated up front** (the ticket left these open):

- The owner is a **solo developer** who wants **low operational overhead but room to grow**.
- The two audiences are treated as live: **(A) single-user personal tool** and **(B) multi-tenant product with accounts**. Where the answer diverges, it is flagged `[A]` / `[B]`.
- The **Obsidian-vault-in-Markdown authoring workflow is a hard requirement** — the owner values it and the whole existing app (CONTEXT.md) is built on it.
- The scanner starts **adhoc-run** and should have **room to become scheduled**, needs **external HTTP scraping**, **persisted state**, and **possibly LLM-based matching**.
- "Publishable as one coherent web application" is read as: one deployable, one domain, the learning Library and the scanner reachable from the same shell — not necessarily one process.

---

## Executive summary and recommendation

**The core tension is real but smaller than it looks.** A static SSG and a dynamic scheduled
service are not opposites you must choose between; every current meta-framework (Astro,
Next.js, SvelteKit, Remix) is *static-first with opt-in server rendering*, and every one of
them defers the "long-running scheduled scraper" to a **separate execution context** (a cron
trigger hitting a function, or a worker process) rather than doing it inside the page build.
So the architecture question is not "static or dynamic" — it is "**where does the scanner's
runtime live, and how loosely is it coupled to the content site**".

**Primary recommendation: a modular monolith with two clearly separated bounded contexts,
deployed as a static-first app plus a scheduled worker — but do NOT fold the learning content
into a meta-framework yet.** Concretely:

1. **Keep Quartz as-is for the Library.** It is the only tool that treats the Obsidian vault
   as its domain model (wikilinks, transclusion, backlinks, graph, search all free and
   correct — see the repo's prior SSG research). Migrating that into a meta-framework's
   content layer is weeks of work that rebuilds machinery you already have and that the
   scanner does not need. The Library stays a static build.
2. **Build the scanner as its own bounded context in a separate directory / package**, with
   its own storage, its own domain model (Role, Company, CvProfile, FitScore), and an
   **anti-corruption layer** at the scraping boundary. Start it as a **plain Node/TypeScript
   CLI or script** that you run adhoc — no framework, no server — writing results to a small
   database (SQLite locally; Postgres/Turso/D1 when hosted).
3. **Publish them as one app via a thin shell**, not a rewrite: the scanner gets a small
   dynamic front-end (its results page is genuinely dynamic), the Library stays static, and
   both sit behind one domain. The simplest coherent wrapper is a **hybrid meta-framework
   app (Astro, on-demand-rendering adapter) that owns the scanner UI + API + the schedule,
   and links to / embeds the Quartz-built Library as static assets** under a path.
4. **The schedule is a cron trigger, not a long-running daemon.** Vercel Cron / Cloudflare
   Cron Triggers / GitHub Actions `schedule:` all fire an HTTP endpoint or worker on a cron
   expression; that endpoint runs one scan pass. This is the "adhoc → scheduled" path with
   near-zero extra architecture.

**Recommended incremental first step (smallest move that doesn't paint you into a corner):**
Build the scanner as a **standalone Node/TS package with a `scan` command** that reads a
committed `companies.yaml` (curated careers-page list) + your CV, scrapes, ranks, and writes
results to **SQLite**, run manually. Nothing about hosting, accounts, or the meta-framework
choice is decided yet, the Library is untouched, and every later option (serverless cron, a
worker service, a meta-framework UI) consumes that same package. This is `MonolithFirst`
applied to a solo project: get the domain boundaries right before committing to topology.

**Strongest alternative: fully separate repos/services** (Quartz site + independent scanner
service). Cleaner isolation, but it fights "one coherent web application", doubles
deploy/ops surface, and for a solo dev buys isolation you don't yet need. Prefer it only
if the scanner grows a real team, real tenants `[B]`, or compliance requirements that must
not touch the public content site.

**The single biggest decision that depends on the owner, not on more research:** *single-user
personal tool `[A]` or multi-tenant product with accounts `[B]`.* It changes almost
everything downstream — whether you need Identity/auth at all, whether the scanner's storage
is one CV or many, whether the LLM-matching cost is bounded or per-tenant, and whether the
scraping legal exposure is "my own tool" or "a product profiting from others' data". See §7.

---

## 1. Architecture patterns for coexisting static content + dynamic services

The four candidates from the ticket, with tradeoffs for a low-overhead solo dev.

### (a) Modular monolith
One deployable, internal module boundaries (packages/directories), shared runtime. Fowler's
`MonolithFirst` is the directly-relevant primary source: *"you shouldn't start a new project
with microservices, even if you're sure your application will be big enough to make it
worthwhile"* because service boundaries are hard to get right early and *"any refactoring of
functionality between services is much harder than it is in a monolith"* (martinfowler.com/bliki/MonolithFirst.html).

- **For a solo dev:** lowest ops overhead, one thing to deploy, boundaries enforced by
  discipline (directory/package structure) rather than by network. This is the recommended
  starting shape.
- **Caveat specific to Prepper:** the "monolith" here is unusual because half of it (the
  Library) is a *build-time static generator* and half (the scanner) is *runtime*. They
  don't share a process naturally. So "modular monolith" in practice means **one repo, one
  deploy pipeline, two clearly separated modules** — not one Node process serving both.

### (b) SSG frontend + separate API/worker backend
Quartz builds static HTML; a separate service exposes the scanner API and runs the schedule.

- **Pro:** clean separation matching the actual runtime split (static vs dynamic); the
  scanner can be a long-running process (needed if scraping exceeds serverless time limits —
  see §4). Each scales/deploys independently.
- **Con:** two deploy targets, two things to monitor, CORS/domain glue to make it "one app".
  More ops than a solo dev wants on day one, though it is where (a) naturally grows.

### (c) Hybrid meta-framework (Astro / Next.js / Remix / SvelteKit)
One app that does static pages **and** server routes/endpoints. All four are **static-first
with opt-in on-demand rendering**:

- **Astro:** static by default; `export const prerender = false` on a page opts it into SSR;
  official adapters for Node, Vercel, Netlify, Cloudflare; API endpoints are `.ts` files in
  `src/pages/`; **Astro Actions** give type-safe, Zod-validated backend functions callable
  from the client (`defineAction()` in `src/actions/`, called as `await actions.myAction()`).
  Docs advise *"Start with the default 'static' mode until you are sure that most or all of
  your pages will be rendered on demand"* (docs.astro.build/en/guides/on-demand-rendering/,
  /guides/actions/).
- **Next.js:** the App Router with Route Handlers and Server Actions is the heaviest/most
  capable; but its static-export mode disables most dynamic features, and (per the repo's
  prior research) it ships a React runtime on every page and has no content-collection layer.
  Better suited if the dynamic surface will eventually dominate.
- **Tradeoff for Prepper:** a meta-framework is the cleanest *shell* for the scanner UI and
  is where "one coherent web app" is easiest. But **it is not a good host for the Library**:
  reproducing Quartz's vault semantics (wikilinks, transclusion, backlinks, graph) inside
  Astro/Next is custom work you'd be rebuilding (repo prior research §2, §6). So the sweet
  spot is a meta-framework that owns the *dynamic* half and **links to / serves the
  Quartz-built static Library**, not one that absorbs the content.

### (d) Fully separate repos/services
Two codebases, two deploys, integrated only at the domain/routing edge.

- **Pro:** maximum isolation; the content site's uptime and the scanner's scraping risk are
  fully decoupled; different languages possible (a Python scraper, say).
- **Con:** most ops overhead; hardest to present as "one app"; premature for a solo dev.

**Verdict for a solo dev wanting low overhead + room to grow:** start at **(a) modular
monolith** with the scanner as an isolated package, and let it evolve toward **(c)** for the
UI shell. (b) and (d) are the growth destinations if tenancy `[B]` or scale arrives, not the
starting point.

---

## 2. DDD / bounded contexts, and how much ceremony is warranted

Fowler's Bounded Context is the anchor: total unification of a domain model *"will not be
feasible or cost-effective"*; you need *"a different model when the language changes"*, and
boundaries are driven primarily by shifts in vocabulary and human culture
(martinfowler.com/bliki/BoundedContext.html). The vocabularies here genuinely diverge — a
"Note" and a "Role" have nothing in common — so the contexts are real, not invented.

### Bounded contexts implied by the situation

1. **Learning Content (the Library)** — the existing, mature context. Ubiquitous language is
   already written down in CONTEXT.md: Vault, Note, Lesson, Term, Problem, Cheat sheet, Plan,
   Reference, Link graph, Topic index. Static, no per-user state. *Leave its language intact.*
2. **Job Scanning** — new. Language: Company, CareersPage/Source, ScrapeRun, RawPosting,
   Role (normalized), Industry, Technology/Stack, FilterCriteria. Dynamic, stateful, scheduled.
3. **Candidate / CV Profile** — the owner's CV as structured data: Skills, Experience,
   Preferences (industries, technologies, seniority, location). Feeds matching. In `[A]` this
   is a singleton; in `[B]` it is per-user and merges with Identity.
4. **Matching / Fit Scoring** — arguably its own context: FitScore, MatchExplanation,
   RankingModel. It sits between CV Profile and Job Scanning and is where the LLM lives. Worth
   separating because its model (embeddings/prompts/scores) is unlike either neighbour's.
5. **Application Tracking** *(likely future)* — Application, Stage, Status, follow-ups. Not in
   scope now; name it so it has a place to land.
6. **Identity / Accounts** — **only exists in `[B]`.** In `[A]` there is no user, no auth, no
   Identity context at all. This is the sharpest `[A]`/`[B]` fork.

### Sketch context map (relationships)

```
                 ┌─────────────────────┐
                 │  Learning Content    │   (static; unchanged)
                 │  (Quartz / Library)  │
                 └─────────────────────┘
                         │  Separate Ways
                         │  (no shared model; linked only in the UI shell)
                         ▼
   ┌──────────────┐  Customer/Supplier   ┌──────────────────┐
   │ CV Profile   │────────────────────▶ │  Matching /      │
   │ (Candidate)  │   (supplies CV)      │  Fit Scoring     │
   └──────────────┘                      └──────────────────┘
          ▲                                       ▲
          │ shares Role/skill vocabulary          │ consumes normalized Roles
          │ (Shared Kernel, small)                │  (Customer/Supplier)
          │                                       │
   ┌──────────────┐   Anti-Corruption Layer  ┌──────────────────┐
   │  Identity    │   (only in [B])          │  Job Scanning    │
   │  (only [B])  │─────────────────────────▶│  (scraper +      │
   └──────────────┘                          │   normalizer)    │
                              external world ─┤   ACL here       │
                              (careers pages) └──────────────────┘
```

Relationship types (DDD patterns):
- **Learning Content ↔ everything else: Separate Ways.** No shared model. They meet only in
  the UI shell (a nav link, a shared header). This is the key insight: the static/dynamic
  tension dissolves because the two halves *don't share a domain* — forcing them into one
  model would be the mistake.
- **Job Scanning → external careers pages: Anti-Corruption Layer.** The scraper translates
  messy, per-site HTML into your clean `Role` model. This ACL is the single most important
  DDD investment here: it quarantines scraping fragility (every site's HTML differs and
  changes) behind a stable internal type. Without it, HTML structure leaks into your core.
- **Job Scanning → Matching: Customer/Supplier.** Scanning produces normalized Roles;
  Matching consumes them. Matching is the customer and dictates what fields it needs.
- **CV Profile ↔ Matching: Customer/Supplier**, with a **small Shared Kernel** (the
  skill/technology vocabulary both sides must agree on to compare CV to Role).
- **Identity → CV Profile `[B]`: Customer/Supplier** (a user owns a CV profile).

### How much ceremony is warranted

For a solo project: **name the contexts and their relationships (as above), draw one context
map, and enforce boundaries with directory/package structure — and stop there.** Do *not*
adopt: separate deployables per context, event sourcing, CQRS, aggregates-with-repositories
ceremony, or a message bus. Those are `MicroservicePremium` costs Fowler warns against. The
high-value, low-cost DDD moves are exactly two: **(1) the ACL at the scraping edge**, and
**(2) keeping the Library's language sealed off** (Separate Ways) so the scanner's churn never
touches it. Everything else is premature until `[B]` with real tenants arrives.

---

## 3. Preserving the Obsidian-vault authoring model

The requirement: keep authoring in an Obsidian-compatible Markdown vault while the
surrounding app becomes dynamic. Three options.

### Option 1 — Keep Quartz as-is, embed/link it *(recommended)*
The Library stays a Quartz static build; the dynamic app links to it (or serves it under a
path, e.g. `/library/*` as static assets). Authoring workflow is **completely unchanged** —
this is its whole point.
- **Pro:** zero disruption to the working, tested content pipeline (CLAUDE.md documents a
  large, deliberate investment: validation, quiz blocks, the link graph, the reading surface,
  topic tree). No re-authoring, no re-testing. The scanner's evolution can't destabilize it.
- **Con:** two build steps (Quartz build + app build); shared chrome (nav/header) must be
  duplicated or injected, since Quartz owns its own layout. Search/graph stay Library-only.
- **Best when:** the Library is "done enough" and you want to spend effort on the scanner.

### Option 2 — Migrate content into a meta-framework's content layer
Move the vault into **Astro Content Collections** (glob loader + Zod-validated frontmatter,
`getCollection()`/`render()`) or Next's hand-rolled `fs`/frontmatter approach.
- **Pro:** one framework, one build, one component system; the scanner UI and content pages
  share everything.
- **Con (decisive):** you rebuild what Quartz gives free — wikilink resolution (no native
  support; a `remark-wiki-link` two-pass build with an Obsidian pipe-vs-colon alias caveat),
  the reverse **backlink index** (no plugin/framework computes it; ~50 lines in a custom
  Astro loader), transclusion, graph view (fully custom), popovers. The repo's prior research
  is explicit: *"Quartz is the only tool that treats the vault as the domain model … Fastest
  to a good-looking vault; slowest to a good app."* Astro is *"the closest match"* for the
  app half but *"you build wikilink resolution and the backlink index yourself."*
- **Best when:** the Library and scanner UI must be deeply interwoven (shared components on
  the same page), or you're willing to spend the migration budget for one unified codebase.

### Option 3 — Content-as-data / headless
Treat the vault as a data source read by a build step or API (Astro's Content Loader `store`
+ `renderMarkdown()` is the sanctioned whole-corpus hook), decoupling authoring format from
rendering framework.
- **Pro:** authoring stays Markdown; rendering is free to change; the same content could feed
  both a static site and, later, dynamic/personalized views.
- **Con:** you're building a mini content pipeline — the thing Quartz already is.

**Verdict:** Option 1 now. Keep Obsidian → Quartz → static exactly as it is. Revisit Option 2
**only** if a concrete feature needs Library and scanner content on the *same page* with
shared interactivity — which nothing in the current requirements demands.

---

## 4. The scanner as a bounded context: architecture

A typical adhoc-then-scheduled scraper has four concerns: **scheduling, scraping, storage,
matching.**

### Scheduling (adhoc → scheduled)
The migration path is deliberately trivial: write the scan as *one idempotent function that
runs a full pass*, invoke it manually first, then attach a trigger.
- **Vercel Cron:** fires an HTTP GET to a function on a cron expression, defined in
  `vercel.json`. **Critical limit for a solo dev on the free tier:** *Hobby accounts are
  limited to cron jobs that run **once per day**, precision ±59 min*; per-minute scheduling
  requires **Pro**. 100 cron jobs/project on all plans. Timezone always UTC; no `MON`/`JAN`
  aliases (docs: /docs/cron-jobs, /docs/cron-jobs/usage-and-pricing).
- **Cloudflare Cron Triggers:** a `scheduled(controller, env, ctx)` handler, five-field cron
  (Quartz syntax, incl. `L`/`W`/`#`); config changes propagate in up to 15 min
  (developers.cloudflare.com/workers/configuration/cron-triggers/). **Watch the Workers CPU
  time limit** for heavy scraping — long crawls may exceed it; Cloudflare Queues + a consumer
  Worker, or Durable Objects, are the escape hatch, but this adds architecture.
- **GitHub Actions `schedule:`** — free, cron-based, runs a script in CI, can commit results
  back or push to a DB. Excellent zero-hosting-cost option for `[A]` while adhoc/low-frequency.
- **A long-running worker on a PaaS** (Railway/Render/Fly) — a Node process with `node-cron`
  in-process. Choose this when a single scan legitimately exceeds serverless time limits.

**Recommendation:** while adhoc → **manual CLI**, then → **GitHub Actions schedule** (free,
no hosting) for `[A]`, graduating to **Vercel Cron (Pro) or a PaaS worker** if you need
sub-daily frequency or scans that outlast a function timeout.

### Scraping approach + legal/ToS/robots considerations
- **Technique:** prefer, in order — (1) an official/JSON API or job board feed if the company
  exposes one; (2) a structured endpoint (many careers pages are Greenhouse/Lever/Workday/
  Ashby — these have predictable, often JSON, endpoints, so scrape *those* patterns, not
  bespoke HTML); (3) HTML parsing (Cheerio) for static pages; (4) a headless browser
  (Playwright) only for JS-rendered pages, since it's far heavier and harder to run
  serverless. Put all of this **behind the ACL** so the core sees only normalized `Role`s.
- **robots.txt (RFC 9309):** it is a **published standard but advisory** — *"These rules are
  not a form of access authorization"*, there is no enforcement mechanism, compliance is the
  crawler's choice. A well-behaved scanner should still fetch and honor it, honor the longest
  matching rule, cache ≤24h, and rate-limit. Honoring robots.txt is reputational/ethical, not
  a legal shield (rfc-editor.org/rfc/rfc9309.html).
- **Legal landscape (US, informative not legal advice):** *hiQ v. LinkedIn* established that
  the CFAA's "without authorization" does **not** apply to scraping **public** web data, and
  that violating a site's user agreement alone doesn't trigger CFAA liability (9th Cir., Apr
  2022). **But** the case *settled in Dec 2022 with a $500k judgment against hiQ and a finding
  of liability under California trespass-to-chattels and misappropriation*, plus an injunction
  — i.e. scraping public data isn't a *CFAA crime*, but you can still lose on **contract/ToS
  breach and state torts**, and the settlement itself has no precedential value. Practical
  takeaways: scrape only **public** pages; respect robots.txt and rate limits; don't
  circumvent technical blocks or logins; be mindful that a site's **ToS** can still bind you
  contractually; keep volume low and identify your bot.
- **The `[A]`/`[B]` split matters enormously here:** a *personal tool* scraping public
  careers pages for your own job search is low-risk and easily defensible; a *product* that
  scrapes others' sites and resells/redistributes that data is exactly the profile that drew
  hiQ's tort liability. See §7.

### Storage of results
- **State to persist:** curated Companies/Sources, ScrapeRuns (for change detection + audit),
  RawPostings, normalized Roles, FitScores, and a dedup/seen-set so re-scans don't re-alert.
- **`[A]`:** **SQLite** (or a file) locally; **Turso/libSQL**, **Cloudflare D1**, or a small
  **Postgres** (Neon/Supabase free tier) when hosted. SQLite is the right first choice —
  zero ops, trivially backed up, and it forces you to design the schema, which is the durable
  artifact.
- **`[B]`:** managed **Postgres** (Neon/Supabase) with per-tenant rows from day one; add a
  vector column (pgvector) if matching uses embeddings.

### Where LLM-based CV-to-role matching fits
Isolate it in the **Matching context** behind an interface (`score(cv, role) -> {score,
rationale}`) so the implementation can evolve without touching Scanning or CV Profile.
- **Cheap-first ladder:** (1) deterministic keyword/skill overlap + rules (free, explainable,
  a strong baseline); (2) **embeddings** — embed CV and each Role, rank by cosine similarity
  (cheap, batchable, good recall); (3) **LLM re-rank/explain** only the top-N candidates
  (bounds token cost, gives human-readable rationales). Running the LLM over *every* posting
  is the cost trap — gate it behind the cheap stages.
- **Cost control is a `[B]` gate:** for `[A]` the volume is trivially cheap; for `[B]` per-
  tenant LLM cost must be capped or passed through, or matching stays embeddings-only.

---

## 5. Deployment / hosting implications and cost/ops for a solo dev

| Option | What runs where | Scheduling fit | Cost `[A]` | Ops burden | Long scrapes? |
|---|---|---|---|---|---|
| **Static host only** (Cloudflare Pages / Netlify / GH Pages) | Library only | none | free | trivial | no |
| **Static + serverless functions** (Vercel / Netlify / CF Pages+Workers) | Library static + scanner API/cron as functions | Vercel Cron (Hobby=daily; Pro=per-min), CF Cron Triggers | free–low | low | limited by function timeout / Worker CPU |
| **Static + GitHub Actions** | Library static + scan as scheduled CI job | cron via `schedule:`; commit/push results | free | low | yes (CI runners are generous) |
| **PaaS long-running service** (Railway / Render / Fly.io) | scanner as a persistent Node process (`node-cron`) | in-process cron | low (~$5–7/mo tiers) | medium | yes |
| **Separate API + worker** | app + independent worker/queue | queue + cron | medium | higher | yes, scalable |

Guidance:
- **`[A]` cheapest coherent path:** Library on **Cloudflare Pages / Netlify (free static)**;
  scanner as a **GitHub Actions scheduled job** writing to SQLite/Turso, with a small
  dynamic results page served as functions or as a nightly-regenerated static page. Near-zero
  cost, near-zero ops.
- **If you want it all on one platform:** **Vercel** (Astro adapter + Cron + Functions) or
  **Cloudflare** (Pages + Workers + Cron Triggers + D1) unify static + dynamic + schedule
  under one deploy. Mind Vercel Hobby's **once-per-day cron** limit and Cloudflare's **Worker
  CPU** limit for heavy scrapes.
- **When scrapes need Playwright or run long:** a **PaaS worker** (Railway/Render/Fly) is the
  honest fit — serverless timeouts and headless-browser weight fight you otherwise. This is
  the moment pattern (b)/(d) earns its keep.
- **`[B]` multi-tenant:** managed Postgres + a real background-job/queue system + auth
  provider; costs and ops step up materially — treat it as a different project economically.

---

## 6. Incremental migration path (no big-bang rewrite)

Ordered so each step is independently useful and none forecloses a later option.

1. **Scanner as a standalone package/CLI (the recommended first step).** New directory (e.g.
   `scanner/`) or workspace package. Reads a committed `companies.yaml` + your CV; scrapes via
   the ACL; ranks with the cheap-first ladder; writes to **SQLite**. Run manually. *Decides
   nothing about hosting, UI, framework, or tenancy.* Establishes the domain model and the
   ACL — the two high-value DDD moves. Library untouched.
2. **Add a schedule without new architecture.** Wrap the CLI's scan in one idempotent entry
   point; trigger it from **GitHub Actions `schedule:`** (free). Now it's "scheduled" with no
   hosting decision made.
3. **Give the scanner a thin dynamic UI.** A minimal **Astro app (on-demand adapter)** that
   renders the results table from the DB and exposes an "run now" **Astro Action**. This is
   the first genuinely dynamic surface. Deploy it on Vercel/Cloudflare/PaaS.
4. **Unify under one domain ("one coherent web app").** Serve the Quartz-built Library as
   static assets under `/library/*` (or a subdomain) behind the same host/router as the Astro
   scanner app; share a minimal header/nav. No content migration — Separate Ways in practice.
5. **Only if a real need appears:** migrate content into Astro Content Collections (Option 2,
   §3) for a single unified codebase, or split the scanner into its own service (pattern b/d)
   if scans outgrow serverless or tenancy `[B]` arrives.

The corner-avoiding property: steps 1–2 commit to **no framework, no host, no tenancy model**,
yet produce a working, valuable tool. The expensive, irreversible choices (meta-framework
migration, multi-tenant storage, auth) are pushed to the last possible moment, behind
evidence of need.

---

## 7. Where the answer diverges: single-user `[A]` vs multi-tenant product `[B]`

This is the biggest open decision and it depends on the owner, not on further research.

| Concern | `[A]` Single-user personal tool | `[B]` Multi-tenant product |
|---|---|---|
| **Identity context** | **Does not exist.** No auth, no accounts. | Required from early on; owns users, sessions, per-tenant isolation. |
| **CV Profile** | Singleton (your CV, maybe a file). | Per-user; multiplies storage and matching cost. |
| **Storage** | SQLite / a file / Turso is plenty. | Managed Postgres with tenant scoping; row-level isolation. |
| **Scheduling** | GH Actions daily is fine; one scan for one CV. | Per-tenant scans; needs a queue/worker and cost controls. |
| **LLM matching cost** | Trivially cheap; run freely. | Per-tenant token cost must be capped/passed through or dropped for embeddings-only. |
| **Scraping legal exposure** | Low: personal use of public data for your own job search. | High: this is the *hiQ* profile — a product built on others' public data drew trespass/misappropriation liability even after winning on CFAA. ToS breach risk, redistribution concerns, possible need to prefer official APIs/partnerships. |
| **Hosting/ops** | Free tiers, near-zero ops. | Real infra budget, auth provider, monitoring, backups, support. |
| **DDD ceremony** | Name contexts + ACL; stop. | Contexts may become deployables; queues, per-tenant boundaries, harder integration. |
| **Architecture pattern (§1)** | Modular monolith → hybrid meta-framework shell. | Grows toward separate API + worker services (b/d). |

**Recommendation regardless of which way it goes:** build steps 1–2 of §6 the same way — a
standalone scanner package with a clean domain model and ACL. That code is identical for `[A]`
and `[B]`; only what wraps it (auth, tenant-scoped storage, queues) differs. So the tenancy
decision can be **deferred** without waste — but it should be made *before* step 3's UI and
storage choices harden.

---

## Sources

- https://martinfowler.com/bliki/BoundedContext.html — Fowler on Bounded Context: unification of a large model *"will not be feasible or cost-effective"*; *"you need a different model when the language changes"*; boundaries driven by vocabulary/human-culture shifts. Anchors the context map in §2.
- https://martinfowler.com/bliki/MonolithFirst.html — *"you shouldn't start a new project with microservices"*; boundaries are hard to get right early; refactoring across services is far harder than in a monolith. Anchors §1's start-as-monolith recommendation.
- https://docs.astro.build/en/guides/on-demand-rendering/ — Astro static-first + opt-in SSR: `export const prerender = false`, `output: 'server'` with `prerender = true` for static pages; official Node/Vercel/Netlify/Cloudflare adapters; API endpoints in `src/pages/`. §1, §3.
- https://docs.astro.build/en/guides/actions/ — Astro Actions: type-safe, Zod-validated backend functions in `src/actions/`, called as `await actions.myAction()`; form actions require on-demand rendering. §1, §6.
- https://vercel.com/docs/cron-jobs — Vercel Cron mechanism: HTTP GET to a function on a cron expression via `vercel.json`; UTC only; no `MON`/`JAN` aliases; can't set both day-of-month and day-of-week. §4.
- https://vercel.com/docs/cron-jobs/usage-and-pricing — Hard limit: **Hobby = once/day, ±59 min precision; Pro/Enterprise = once/minute**; 100 cron jobs/project on all plans. Key cost fact for a solo dev. §4, §5.
- https://developers.cloudflare.com/workers/configuration/cron-triggers/ — Cloudflare `scheduled(controller, env, ctx)` handler; five-field Quartz cron syntax incl. `L`/`W`/`#`; config propagation up to 15 min. (Worker CPU limits for long scrapes not specified on this page — flagged as a caveat.) §4, §5.
- https://www.rfc-editor.org/rfc/rfc9309.html — Robots Exclusion Protocol standard: robots.txt format, longest-match rule, ≤24h cache; explicitly *"These rules are not a form of access authorization"* — advisory, no enforcement; unreachable file ⇒ MUST assume complete disallow. §4.
- https://law.justia.com/cases/federal/appellate-courts/ca9/17-16783/17-16783-2022-04-18.html — *hiQ v. LinkedIn* 9th Cir. (Apr 2022): CFAA "without authorization" does not reach scraping of public data. §4, §7.
- https://www.morganlewis.com/blogs/sourcingatmorganlewis/2022/12/linkedin-v-hiq-landmark-data-scraping-suit-provides-guidance-to-data-scrapers-and-web-operators — analysis of the Dec 2022 settlement: $500k judgment against hiQ, liability under CA trespass-to-chattels + misappropriation, injunction; scraping public data survived CFAA but lost on contract/tort. Basis for the "CFAA-safe ≠ risk-free" point. §4, §7.
- https://www.proskauer.com/blog/hiq-and-linkedin-reach-proposed-settlement-in-landmark-scraping-case — corroborating account of the settlement terms and that the stipulation carries no precedential value. §4, §7.
- Repo prior research: `/Users/filipesantos/Projects/Prepper/.scratch/prepper/research/08-static-site-tooling.md` — primary-sourced comparison of Quartz vs Astro vs Next.js vs Eleventy for an Obsidian vault; establishes that only Quartz treats the vault as its domain model and that Astro/Next require custom wikilink + backlink work. Anchors §3's "keep Quartz" recommendation.
- Repo context: `/Users/filipesantos/Projects/Prepper/CLAUDE.md` and `/Users/filipesantos/Projects/Prepper/CONTEXT.md` — the current static-by-design model, the Library/Workshop boundary, and the existing ubiquitous language reused for the Learning Content context in §2.

## What I could not verify / out of scope

1. **Cloudflare Workers CPU/wall-clock limits for a full scrape pass** — the cron-triggers page doesn't state them; whether a real scan fits inside a Worker (vs needing Queues/Durable Objects or a PaaS worker) needs a spike against the actual company list.
2. **Non-US legal exposure** — the *hiQ* analysis is US/9th-Circuit. GDPR/EU implications of storing scraped personal-adjacent data (recruiter names, etc.), and other jurisdictions, were not researched. Relevant mainly for `[B]`.
3. **Whether target careers pages are JS-rendered** (Playwright required) or served by known ATSs (Greenhouse/Lever/Ashby/Workday with scrapable JSON) — decides scraping technique and hosting (§4/§5). Determine empirically from the curated list.
4. **Exact embedding/LLM provider and cost** — the matching ladder is described in principle; specific model choice and per-run cost were not priced (and belong in a separate LLM-focused research pass).
5. **Framework long-term fit if the dynamic surface grows large** — Astro is recommended as the shell on current requirements; if the app becomes dominantly interactive/app-like, Next.js/Remix/SvelteKit merit a re-comparison.
</content>
</invoke>
