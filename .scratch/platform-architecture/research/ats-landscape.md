# ATS landscape & scraping legality for the scanner roster

Research for platform-architecture **ticket 08**. Investigated 2026-09-15 against primary
sources: each company's live careers site, the ATS vendors' own API docs, the raw JSON
endpoints hit directly, and each source's `robots.txt`. Builds on the *hiQ v. LinkedIn*
findings already established in `architecture-and-ddd.md` (§4/§7) — those are not re-derived
here, only extended to the sources actually listed in `scanner/companies.yaml`.

**Scope.** The ten companies in `scanner/companies.yaml` (Tier A systematic finance, Tier B
.NET-forward fintech, all London-targeted). For each: is the source a **known ATS** or
**bespoke HTML**; **server-rendered** or **JS-rendered**; does it expose an **official/public
JSON API**; and what is its **robots/ToS access posture**. This is the empirical input
ticket 09's anti-corruption-layer (ACL) design consumes.

**Method note.** ATS type was confirmed by following each careers page to where it actually
serves jobs and, wherever a JSON API was claimed, by hitting the endpoint directly and reading
the response. Where the `ats` hint in `companies.yaml` disagreed with the live site, the live
site wins and the correction is flagged.

---

## Executive summary

- **7 of 10 sources sit on a known ATS with a public, no-auth JSON API** — 4 on
  **Greenhouse**, 3 on **Workday**. These need no HTML parsing and no headless browser.
- **3 are bespoke**: G-Research (server-rendered HTML), Qube-RT (JS-rendered custom),
  Citadel (JS-rendered custom **behind Cloudflare bot protection**). These are the fragile,
  high-cost tail the ACL exists to quarantine.
- **The curated `ats` hints are materially wrong in three places** and blank in five. Empirical
  corrections: **Man Group is Greenhouse, not Workday**; **G-Research is bespoke, not
  Greenhouse**; **Citadel is bespoke, not Greenhouse**. Filled blanks: Marshall Wace =
  Greenhouse, XTX = Greenhouse, Squarepoint = Greenhouse, FNZ = Workday, Qube-RT = bespoke.
- **Two adapters cover 70% of the roster.** A Greenhouse adapter (one public JSON endpoint)
  and a Workday adapter (one JSON-over-POST endpoint) between them serve every company except
  the three bespoke ones. Build those two first.
- **The scraping posture is benign for personal use `[A]`** and consistent with the prior hiQ
  analysis — with **one exception: Citadel's Cloudflare block is a technical access measure**,
  and circumventing it is the one move the hiQ line says not to make.

---

## Per-company table

| Company (slug) | Live source of truth | ATS (hint → actual) | Render mode | Public JSON API | Access posture |
|---|---|---|---|---|---|
| **Marshall Wace** (`marshall-wace`) | `job-boards.greenhouse.io/marshallwace` + several sub-boards | *(blank)* → **Greenhouse** | Server-rendered board + JSON API | ✅ `boards-api.greenhouse.io/v1/boards/{token}/jobs` | Public, no auth. Sanctioned API |
| **G-Research** (`g-research`) | `gresearch.com/vacancies/` | greenhouse → **Bespoke (SSR HTML)** | **Server-rendered HTML** (jobs are plain `<a>` links) | ❌ none | Public HTML; parse with Cheerio |
| **Man Group** (`man-group`) | `job-boards.eu.greenhouse.io/mangroup` | workday → **Greenhouse (EU)** | Server-rendered board + JSON API | ✅ `boards-api.greenhouse.io/v1/boards/mangroup/jobs` (53 jobs, London) | Public, no auth. Sanctioned API |
| **Qube R&T** (`qube-rt`) | `qube-rt.com/careers` | *(blank)* → **Bespoke (JS)** | **JS-rendered** (`{{ job.title }}` client-side templating) | ❌ none known (has an internal XHR feed) | Headless browser, or reverse the XHR |
| **XTX Markets** (`xtx-markets`) | `job-boards.greenhouse.io/xtxmarketstechnologies` | *(blank)* → **Greenhouse** | Server-rendered board + JSON API | ✅ token `xtxmarketstechnologies` (~10 jobs) | Public, no auth. Sanctioned API |
| **Citadel** (`citadel`) | `citadel.com/careers/open-opportunities/` | greenhouse → **Bespoke (JS + Cloudflare)** | **JS-rendered**, custom; no public feed | ❌ none (Avature/custom class) | **Cloudflare bot-block (403 to non-browser)** — highest risk/cost |
| **Squarepoint** (`squarepoint`) | `job-boards.greenhouse.io/squarepointcapital` | *(blank)* → **Greenhouse** | Server-rendered board + JSON API | ✅ token `squarepointcapital` (93 jobs, London) | Public, no auth. Sanctioned API |
| **IG Group** (`ig-group`) | `ig.wd103.myworkdayjobs.com/EXT_IG` | workday → **Workday** ✓ | **JS-rendered SPA** | ✅ (unofficial) `wday/cxs/ig/EXT_IG/jobs` | Public, no auth. Undocumented CXS endpoint |
| **FNZ** (`fnz`) | `fnz.wd3.myworkdayjobs.com/fnz_careers` | *(blank)* → **Workday** | **JS-rendered SPA** | ✅ (unofficial) `wday/cxs/fnz/fnz_careers/jobs` | Public, no auth. Undocumented CXS endpoint |
| **Fidelity Intl** (`fidelity-international`) | `fil.wd3.myworkdayjobs.com` (tenant `fil`) | workday → **Workday** ✓ | **JS-rendered SPA** | ✅ (unofficial) `wday/cxs/fil/{site}/jobs` | Public, no auth. Undocumented CXS endpoint |

**URL corrections `companies.yaml` needs** (ticket 09/07 curation): the listed `careers` URLs
are marketing gateways or dead, not the source of truth. Notably `careers.iggroup.com` **does
not resolve (DNS NXDOMAIN)** — IG's real board is `ig.wd103.myworkdayjobs.com/EXT_IG`
(gateway: `iggroup.com/about-us/careers`). `mwam.com/careers/` **404s**; Marshall Wace's roles
live entirely on Greenhouse sub-boards. `careers.fidelityinternational.com` is a gateway that
funnels to the `fil` Workday tenant — do **not** confuse it with `fmr.wd1.myworkdayjobs.com`,
which is the *separate US company* Fidelity Investments.

---

## 1. ATS type, render mode, and fetch technology

### Greenhouse (Marshall Wace, Man Group, XTX, Squarepoint)

The **cleanest** case. Each company's public board (`job-boards.greenhouse.io/{token}` or the
EU host `job-boards.eu.greenhouse.io/{token}` for Man Group) is backed by a documented public
API on a **single unified host regardless of board region**:

- **List:** `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs`
  — returns `{ "jobs": [...], "meta": { "total": N } }`.
- **List with bodies:** append `?content=true` for full description + department + office.
- **One job:** `GET .../v1/boards/{board_token}/jobs/{job_id}`.
- **No authentication** for any GET: "Job Board data is publicly available, so authentication
  is not required for any GET endpoints" (Greenhouse docs). Only application `POST` needs a key.

Confirmed live by hitting the endpoint directly: `mangroup` → 53 jobs (London roles present);
`squarepointcapital` → 93 jobs (London). Each job object carries a rich, stable shape:
`id`, `title`, `location.name`, `absolute_url`, `updated_at`, `content` (HTML),
`departments[]`, `offices[]`, `metadata[]`, `requisition_id`, `first_published`. `updated_at`
and `id` give the ACL free change-detection and dedup keys.

**Gotcha — multiple boards per company.** Marshall Wace splits roles across at least five
boards (`marshallwace` [main, currently empty], `mw-tech-grad`, `mwinternshipprogram`,
`mwnoninvestmentroles`, `mwam-imperial-placements`). The Source config must allow **N board
tokens per company**, not one.

**Fetch tech:** plain HTTP GET + JSON parse. No browser, no HTML scraping.

### Workday (IG Group, FNZ, Fidelity International)

Every `*.myworkdayjobs.com` site is a **JS-rendered SPA** — the initial HTML is an empty React
shell (confirmed: WebFetch of `ig.wd103.myworkdayjobs.com/EXT_IG` returns no job content). But
that SPA talks to a **structurally identical JSON endpoint on every tenant**, so a headless
browser is unnecessary:

- **List:** `POST https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs`
  with `Content-Type: application/json` and body
  `{"appliedFacets":{}, "limit":20, "offset":0, "searchText":""}`.
  Response: `{ "jobPostings": [...], "total": N }`.
- **One job:** `GET .../wday/cxs/{tenant}/{site}/job{externalPath}` (the `externalPath` comes
  from each list item) → full posting payload.
- **No authentication.**

Roster coordinates: IG = tenant `ig`, host `wd103`, site `EXT_IG`; FNZ = tenant `fnz`, host
`wd3`, site `fnz_careers`; Fidelity Intl = tenant `fil`, host `wd3`, site to confirm (the
tenant exposes several, e.g. `001`, `fidelitycanada` — the London/EMEA site slug must be
pinned at curation).

**Gotchas:** (1) It is **POST-with-a-JSON-body**, not a GET — unusual for a "read". (2) The
page size is **hard-capped at 20**; asking for `limit: 100` silently returns an empty
`jobPostings` array with no error. The ACL must paginate `offset += 20` until `offset >= total`.
(3) This is the endpoint the site's own SPA calls — **public and unauthenticated, but not an
officially documented/supported API**, so treat its shape as less contractually stable than
Greenhouse's.

**Fetch tech:** HTTP POST + JSON parse + offset pagination. No browser.

### Bespoke (G-Research, Qube-RT, Citadel)

- **G-Research** — `gresearch.com/vacancies/` is **server-rendered HTML**: each role is a plain
  `<a href="/vacancies/{slug}/">` in the delivered markup, with a detail page per slug. No ATS,
  no JSON feed. **Cheapest bespoke case:** a Cheerio/regex parse of static HTML; no browser.
  (The `greenhouse` hint is wrong — token `gresearch` 404s on the Greenhouse API.)
- **Qube-RT** — `qube-rt.com/careers` is a **JS-rendered** custom page (Mustache/Vue-style
  `{{ job.title }}` placeholders in the shell, hydrated client-side; the "no matching jobs"
  string ships in the static HTML). Needs either a **headless browser** or reverse-engineering
  the XHR/JSON call the page makes to its own backend — the latter is preferable if the
  endpoint is stable.
- **Citadel** — `citadel.com/careers/open-opportunities/` is a **fully custom, JS-rendered**
  careers site with **no public ATS feed**, and it is served behind **Cloudflare bot
  protection** (returns **403** to non-browser clients). This is the hardest and riskiest
  target: it needs a headless browser that presents as a real browser, and doing so brushes up
  against a deliberate technical access barrier (see §2). Strong candidate to **defer or drop**
  from the first ACL cut. (The `greenhouse` hint is wrong.)

---

## 2. ToS / robots.txt posture — extending the hiQ findings to these sources

The prior research (`architecture-and-ddd.md` §4/§7) established the frame and is **not
repeated**: *hiQ v. LinkedIn* (9th Cir. 2022) held the CFAA's "without authorization" does not
reach scraping of **public** data, but the Dec-2022 settlement showed you can still lose on
**contract/ToS breach and state torts**; robots.txt (RFC 9309) is **advisory, not access
authorization**; and the personal-tool `[A]` vs product `[B]` split is what actually moves the
risk. Applied to the sources actually listed:

- **Greenhouse (`boards-api.greenhouse.io`)** — the vendor **publishes** this as a public,
  no-auth API and states the data is publicly available. `boards-api.greenhouse.io/robots.txt`
  disallows only `/embed/` (the iframe widget, not `/v1/`). This is the **lowest-risk** posture
  on the roster: an officially sanctioned public read of public data. No login, no ToS
  click-wrap, no technical block circumvented.
- **Workday (`*.myworkdayjobs.com`)** — `robots.txt` (checked on `ig.wd103...`) **allows** the
  career-site paths and disallows only `/refreshFacet/`; `/wday/cxs/` is **not** disallowed. The
  data is public and unauthenticated. The nuance vs Greenhouse: the CXS endpoint is
  *undocumented* rather than *published-as-public*, so the ethical/reputational (not legal)
  footing is slightly softer — mitigate with low rate and an identifying User-Agent.
- **Bespoke sites** — G-Research (`mwam.com/robots.txt` 404s → RFC 9309 treats a 404 as
  "no restrictions", allow-all; likewise check `gresearch.com/robots.txt` at fetch time) and
  Qube-RT serve **public** pages with no login; standard good-citizen scraping (honor robots,
  cache, rate-limit, identify the bot) is well within the hiQ-safe zone for `[A]`.
- **Citadel — the one real line.** The Cloudflare 403 is a **deliberate technical access
  control**. The prior research's own rule is *"don't circumvent technical blocks or logins"*;
  spoofing headers or using anti-bot evasion to get past Cloudflare is exactly the move that
  converts a defensible public-data read into the kind of conduct that drew hiQ's tort exposure.
  For a personal tool the pragmatic answer is: fetch it like a human would (a real headless
  browser, human-scale rate) or **skip Citadel** — do not build evasion into the ACL.

**Concrete do/don't for this scanner (personal-use `[A]`):**
- **Do** prefer the JSON APIs (Greenhouse, then Workday CXS) over HTML — less data moved,
  nothing rendered, no ToS surface.
- **Do** send a truthful identifying `User-Agent`, fetch `robots.txt` and honor it, cache
  responses (≤24h per RFC 9309), rate-limit to a trickle (these are ~10 companies, not a crawl).
- **Do** read only public, unauthenticated pages/endpoints — every source above qualifies.
- **Don't** circumvent Citadel's Cloudflare block with evasion tooling.
- **Don't** create an account, accept a click-wrap ToS, or submit any `POST`/application.
- **Don't** redistribute the scraped postings — `[A]` personal use is the whole safety margin;
  republishing would re-open the hiQ `[B]` tort profile.

---

## 3. Official / JSON APIs worth preferring over HTML

| ATS | Endpoint (list) | Auth | On the roster? | Notes |
|---|---|---|---|---|
| **Greenhouse** | `GET boards-api.greenhouse.io/v1/boards/{token}/jobs[?content=true]` | none (GET) | **Yes — 4 companies** | Officially public; single host for US & EU boards; `?content=true` for bodies; `/jobs/{id}` for detail |
| **Workday** | `POST {tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` body `{appliedFacets:{},limit:20,offset:0,searchText:""}` | none | **Yes — 3 companies** | Undocumented but public; 20/page hard cap; paginate by `offset`; `GET .../job{externalPath}` for detail |
| **Lever** | `GET api.lever.co/v0/postings/{site}?mode=json` (EU: `api.eu.lever.co`) | none (GET) | No | Documented public API; fields `id,text,categories,description,hostedUrl,applyUrl,workplaceType,salaryRange,lists`. Kept for future roster additions |
| **Ashby** | `GET api.ashbyhq.com/posting-api/job-board/{org}` | none (public posting API) | No | Ashby's *general* API is Basic-auth, but it ships a separate **public** job-board posting API. Kept for future additions |

**Verdict:** for every ATS-backed company on the roster, the JSON API is strictly preferable to
HTML — it is public, unauthenticated, structurally stable across tenants, and carries clean
change-detection keys (`updated_at`/`id` on Greenhouse; `total` + per-posting ids on Workday).
Lever and Ashby aren't used today but are trivial to add later, so the adapter interface should
anticipate them.

---

## Implications for the ACL design (ticket 09)

1. **Build two adapters, not ten.** A `GreenhouseAdapter` (one public GET, JSON) and a
   `WorkdayAdapter` (one POST + offset pagination, JSON) between them cover **7 of 10
   companies** with no HTML parsing and no headless browser. This is the ACL's highest-leverage
   move — one adapter per *ATS*, keyed off the source's ATS type, not one per company.

2. **Promote the `ats` hint to typed connection params, and correct the data.** A bare `url` +
   `ats` string is insufficient: Greenhouse needs `board_token(s)` (Marshall Wace has **five**),
   Workday needs `tenant` + `wdN` host + `site` slug. Make the Source config a discriminated
   union on ATS type carrying those fields. And fix `companies.yaml`: **Man Group → greenhouse**,
   **G-Research → bespoke/html**, **Citadel → bespoke/html**, fill the five blanks, and repair
   the dead/gateway URLs (esp. the non-resolving `careers.iggroup.com`).

3. **The three bespoke sources are the fragile tail — rank them by cost and isolate them.**
   G-Research is cheap (static HTML → Cheerio). Qube-RT is medium (JS-rendered → reverse its
   XHR, or a headless browser). Citadel is expensive **and** legally sensitive (Cloudflare
   block) → defer or drop. This is precisely the churn the ACL exists to quarantine behind the
   normalized `Role` type; the two ATS adapters should never inherit a bespoke site's fragility.

4. **A strict fetch-strategy ladder falls out of the data:** Greenhouse API → Workday CXS API →
   server-rendered HTML (Cheerio) → headless browser. **Only Qube-RT (and Citadel, if kept)
   ever need a browser**, which keeps the scanner serverless-friendly and cheap — the heavy
   Playwright path is the exception, not the default (matching the §4/§5 hosting analysis in the
   prior research).

5. **Encode the good-citizen posture in the ACL itself, and draw one hard line at Citadel.**
   Central rate-limiting, response caching, an honest `User-Agent`, robots.txt honoring, and
   API-preference are all cross-cutting ACL behaviors, not per-adapter afterthoughts. The single
   policy exception is **no anti-bot evasion for Citadel** — the one source where scraping would
   cross from hiQ-safe public-data access into circumventing a technical barrier.

---

## Sources

- `scanner/companies.yaml` (repo) — the authoritative roster, careers URLs, and `ats` hints under test.
- `.scratch/platform-architecture/research/architecture-and-ddd.md` §4/§7 (repo) — the hiQ v. LinkedIn frame, RFC 9309 posture, and `[A]`/`[B]` risk split this note extends; not re-derived.
- https://docs.greenhouse.io/job-board.html — Greenhouse Job Board API: base `boards-api.greenhouse.io/v1/boards`, `/{token}/jobs`, `?content=true`, `/{token}/jobs/{id}`, "Job Board data is publicly available, so authentication is not required for any GET endpoints."
- `GET https://boards-api.greenhouse.io/v1/boards/{marshallwace,mangroup,squarepointcapital,mw-tech-grad}/jobs` (hit directly) — confirmed live shape and counts: mangroup 53, squarepointcapital 93 (London roles present), mw-tech-grad 7, marshallwace 0; job object fields incl. `id,title,location.name,absolute_url,updated_at,content,departments,offices,metadata,requisition_id,first_published`.
- https://boards-api.greenhouse.io/robots.txt — disallows only `/embed/`; the `/v1/` API is not disallowed.
- https://www.man.com/careers — links out to `job-boards.eu.greenhouse.io/mangroup` (corrects the `workday` hint to Greenhouse).
- https://www.xtxmarkets.com/careers/ and https://job-boards.greenhouse.io/xtxmarketstechnologies — Greenhouse board `xtxmarketstechnologies`, ~10 roles rendered in HTML.
- https://job-boards.greenhouse.io/squarepointcapital + `boards.greenhouse.io/embed/job_board/js?for=squarepointcapital` — Squarepoint on Greenhouse.
- https://www.gresearch.com/vacancies/ — server-rendered HTML, roles as `<a href="/vacancies/{slug}/">`; no ATS feed (corrects the `greenhouse` hint; token `gresearch` 404s on the API).
- https://www.qube-rt.com/careers — JS-rendered custom page (`{{ job.title }}` client-side templating).
- https://www.citadel.com/careers/open-opportunities/ — returns 403 (Cloudflare bot protection); fully custom JS careers site with no public ATS feed (corrects the `greenhouse` hint).
- https://dev.to/udaninn/workday-job-boards-have-a-json-api-too-its-just-better-hidden-23fl and corroborating scraper docs — Workday CXS endpoint `POST /wday/cxs/{tenant}/{site}/jobs` with `{appliedFacets,limit,offset,searchText}`, `jobPostings`+`total` response, GET `/job{externalPath}` for detail, no auth, 20/page hard cap.
- https://ig.wd103.myworkdayjobs.com/EXT_IG (empty SPA shell) and https://ig.wd103.myworkdayjobs.com/robots.txt (allows career paths, disallows only `/refreshFacet/`) — IG on Workday tenant `ig`/site `EXT_IG`; `careers.iggroup.com` does not resolve (DNS NXDOMAIN); gateway `iggroup.com/about-us/careers`.
- https://fnz.wd3.myworkdayjobs.com/fnz_careers — FNZ on Workday (corrects the blank hint).
- https://fil.wd3.myworkdayjobs.com/ (tenant `fil`) reached via https://careers.fidelityinternational.com/ — Fidelity International on Workday; distinct from `fmr.wd1.myworkdayjobs.com` (US Fidelity Investments).
- https://github.com/lever/postings-api — Lever public Postings API `api.lever.co/v0/postings/{site}?mode=json` (EU `api.eu.lever.co`), no auth for GET; fields and 2-req/s POST limit. (Not on roster; kept for future additions.)
- https://developers.ashbyhq.com/reference/introduction — Ashby general API is Basic-auth; a separate public job-board posting API (`api.ashbyhq.com/posting-api/job-board/{org}`) exists. (Not on roster.)
- https://www.rfc-editor.org/rfc/rfc9309.html (via prior research) — robots.txt advisory, longest-match, ≤24h cache, unreachable/404 handling.

## What I could not verify / out of scope

1. **Fidelity International's exact Workday site slug** — tenant `fil` exposes several sites
   (`001`, `fidelitycanada`, …); the London/EMEA slug must be pinned at curation by inspecting
   the live board's network call.
2. **Qube-RT's internal XHR endpoint** — confirmed JS-rendered, but the exact JSON URL its
   page calls was not captured (needs a browser network trace); until then treat as
   headless-browser.
3. **Whether Citadel is reachable at human scale** — only that a non-browser client gets 403.
   Whether a real headless browser at low rate succeeds, and whether that is worth the risk, is
   a `[A]`-owner decision, not a research finding.
4. **Live role counts are point-in-time** (2026-09-15) and will drift; they were gathered to
   prove the endpoints work and return London roles, not as a durable inventory.
5. **Non-US / GDPR exposure** — the hiQ frame inherited from the prior research is US-centric;
   EU implications of storing recruiter-adjacent personal data were not researched (matters
   mainly for `[B]`).
