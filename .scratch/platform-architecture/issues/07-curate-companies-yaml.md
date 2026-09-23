# Curate the initial companies.yaml

Type: task
Status: resolved
Blocked by: 04

## Question

The scanner scans a **curated** list; it does not discover companies. Produce the first
`companies.yaml` against the schema fixed in ticket 04 — the source list the whole pipeline
runs over, and the input the ACL research (ticket 08) needs to size itself.

Do:

- Author `companies.yaml`: per entry an `id`/slug, `name`, one or more `careers` sources
  `{ url, ats? }`, optional `tags`/`notes`. Filters are NOT here (they live on the profile).
- Fill the `ats` hint per source where known (`greenhouse`/`lever`/`ashby`/`workday`/`html`);
  leave blank where unknown — ticket 08 resolves the unknowns empirically.
- The CV hints a systematic-finance / hedge-fund + fintech target set in London (ticket 02);
  curate accordingly, but the list is the owner's call.

## Context

- HITL task: the owner supplies/approves the company list. Committed (not personal data).
- Blocks ticket 08 (ATS-landscape research reads these URLs) and ticket 12 (the build scans them).

## Answer

Authored [`scanner/companies.yaml`](../../../scanner/companies.yaml) — committed config at the
CLI's working-dir default (sibling to `Scanner.sln`), against the ticket-04 schema
(`slug`/`name`/`careers[]`{`url`,`ats?`}/`tags`/`notes`; **no filters** — those live on the
profile's Preferences).

Owner steer (asked live): **both tiers, tight ~10**. Final roster of 10, London throughout:

- **Tier A — systematic finance / hedge funds (7):** Marshall Wace (the CV hint, leads),
  G-Research, Man Group, Qube RT (QRT), XTX Markets, Citadel, Squarepoint.
- **Tier B — C#/.NET-forward fintech / financial services (3):** IG Group, FNZ,
  Fidelity International.

`ats` hints filled where reasonably known (`greenhouse`: G-Research, Citadel; `workday`:
Man Group, IG Group, Fidelity International) and **left blank elsewhere** — the URLs and hints
are unverified curation-time values, which **ticket 08 confirms empirically** (URL reachability,
actual ATS, server- vs JS-rendered). Roster is easily edited in place; no reopen needed for a
config tweak.
