# Research: ATS landscape & scraping legality for the curated list

Type: research
Status: resolved
Blocked by: 07

## Question

For the actual companies in `companies.yaml` (ticket 07), determine empirically what the
anti-corruption layer is up against — the unknown the architecture research flagged as
un-verifiable in the abstract.

Surface:

- Per company/source: is the careers page a **known ATS** (Greenhouse/Lever/Ashby/Workday
  — often a predictable JSON endpoint) or **bespoke HTML**, and is it server-rendered or
  **JS-rendered** (needs a headless browser)? This sizes the ACL and picks the fetch tech.
- The **ToS/robots.txt** posture of the sources actually listed, and the concrete
  do/don't for a personal-use scanner of public pages (build on the `hiQ` findings already
  in `research/architecture-and-ddd.md` §4/§7 — don't re-derive them).
- Whether any listed ATS exposes an **official/JSON API** worth preferring over HTML.

## Context

- AFK research ticket: resolve by calling the Skill tool with `research`; capture findings
  as a Markdown file under `research/` and link it from this ticket. Fire on a throwaway
  `research/ats-landscape` branch with a context pointer.
- Blocks ticket 09 (ACL design consumes these facts). Reads ticket 07's URLs.

## Answer

Full findings: [research/ats-landscape.md](../research/ats-landscape.md). Each ATS was
confirmed empirically — careers pages followed to where they actually serve jobs, JSON
endpoints hit live.

**Net: 4 Greenhouse + 3 Workday (all with public JSON APIs) + 3 bespoke.** Three curated
`ats` hints were empirically wrong (Man Group workday→**Greenhouse EU**, G-Research
greenhouse→**bespoke SSR**, Citadel greenhouse→**bespoke JS + Cloudflare**); five blanks
filled; several careers URLs are gateways or dead (`careers.iggroup.com` doesn't resolve).

| Company | Actual ATS | Render | Public JSON API | Posture |
|---|---|---|---|---|
| Marshall Wace | Greenhouse (5 boards) | SSR + API | ✅ boards-api | sanctioned public |
| G-Research | Bespoke | SSR HTML | ❌ (Cheerio) | public HTML |
| Man Group | Greenhouse EU | SSR + API | ✅ `mangroup` | sanctioned public |
| Qube-RT | Bespoke | JS | ❌ (internal XHR) | headless / reverse XHR |
| XTX Markets | Greenhouse | SSR + API | ✅ `xtxmarketstechnologies` | sanctioned public |
| Citadel | Bespoke + Cloudflare | JS | ❌ | **403 bot-block — highest risk** |
| Squarepoint | Greenhouse | SSR + API | ✅ `squarepointcapital` | sanctioned public |
| IG Group | Workday | JS SPA | ✅ CXS `ig/EXT_IG` | public, undocumented |
| FNZ | Workday | JS SPA | ✅ CXS `fnz/fnz_careers` | public, undocumented |
| Fidelity Intl | Workday | JS SPA | ✅ CXS `fil/{site}` | public, undocumented |

**Implications for the ACL (ticket 09):**
1. **Two adapters cover 7 of 10** — a Greenhouse adapter (one public GET, JSON) and a
   Workday adapter (one POST + `offset` pagination, JSON); no HTML, no browser. Key
   adapters off ATS type, one per **ATS**, not per company.
2. **Promote the `ats` hint to typed connection params** — Greenhouse needs `board_token(s)`
   (Marshall Wace has five), Workday needs `tenant`+`wdN`+`site`. Make `Source` a
   discriminated union; correct the wrong/blank/dead `companies.yaml` entries.
3. **The 3 bespoke sources are the fragile tail — rank and isolate**: G-Research cheap
   (static HTML), Qube-RT medium (JS → reverse XHR or headless), Citadel expensive **and**
   legally sensitive → defer/drop.
4. **A fetch-strategy ladder falls out**: Greenhouse API → Workday CXS API → SSR HTML →
   headless browser. Only Qube-RT/Citadel ever need a browser.
5. **Central good-citizen policy, one hard line at Citadel** — rate-limit, cache, honest
   User-Agent, honor robots, prefer APIs; the single exception is **no anti-bot evasion for
   Citadel** (the one source where scraping would cross from hiQ-safe public access into
   circumventing a technical barrier — extends the §4/§7 hiQ findings).

Two Workday gotchas for the build: the CXS list is a **POST with a JSON body** (not GET),
and page size is **hard-capped at 20** (larger `limit` silently returns empty).
