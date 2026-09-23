# Author: reinsurance domain primer note

Type: task
Status: resolved
Blocked by: 01, 03

## Question

Author a fluency-level vault note that is a **reinsurance domain primer** — the role stresses
understanding Arch Re's primary business and working with business users; the COO is a Fellow actuary.
The bar is vocabulary + curiosity, not actuarial depth. Draws on ticket 03's research. Via `/author`,
at the type/topic decided in 01. Must give the candidate:

- What reinsurance is and why cedents buy it; the broker/intermediary model.
- Contract types placed clearly: **treaty vs facultative**, **proportional (quota share/surplus)**
  vs **non-proportional (XoL, cat XoL, stop-loss)**.
- The lifecycle a system touches: submission → underwriting → pricing → binding → booking → claims
  → settlement; catastrophe modelling; cyber-risk as a data-heavy emerging line.
- Enough to place Arch Re's own named lines (Property Cat, Property XoL, Professional Liability,
  Marine Treaties) and speak credibly to business users.

## Decided attachment (from 01)

- **Type:** **Reference** → `content/references/` (a distilled vocabulary/fact sheet, *not* a
  Lesson — the domain is lookup-shaped vocabulary rather than a taught tradeoff).
- **`topic:`** `reinsurance`
- **Also mint the new Term** `content/terms/reinsurance.md` as a **top-level topic** (no `topic:`
  field) — this ticket owns it.
- Files to mint: **1 Term + 1 Reference**.

Resolved when the note passes `npm run validate` and equips a credible domain conversation at fluency depth.

## Answer

Authored the two files decided in 01, via `/author reference` plus a minted Term:

- **Term** `content/terms/reinsurance.md` — new **top-level topic** (no `topic:` field), ULID
  `01M3800GSG8AV9YJ03PEFQKH0Z`. Two-sentence hub label — insurance-for-insurers, cedent/cede,
  the four buying reasons, and the message-driven placement lifecycle — pointing at the primer.
- **Reference** `content/references/reinsurance-domain-primer.md` — `topic: reinsurance`, ULID
  `01M3800GSH6XB120SYKVJBBMFC`. Ticket 03's primer distilled to lookup shape (narrative dropped,
  inline citations carried across, no `sources` field). Reference not Lesson because the domain
  is lookup-shaped vocabulary, not a taught tradeoff.

The primer covers what the ticket asked for and reads for scanning:

- **What it is / why cedents buy it** — cedent/cede/retrocession; a table of the four reasons
  (capital relief, capacity, cat protection, earnings stability); the broker/panel/**line**/slip
  model.
- **Contract types on two independent axes** — Axis A treaty (a book, automatic) vs facultative
  (one risk, reinsurer's faculty to decline); Axis B proportional (quota share / surplus) vs
  non-proportional (XoL, written "limit xs retention"), with per-risk / cat XoL / stop-loss
  flavours and the RoL + reinstatement data terms. A "cost people points" callout nails that the
  axes are independent (a contract is one from each).
- **The lifecycle a system touches** — the eight stages as a table, tied to **ACORD GRLC** /
  Ruschlikon messages, so the "this is mostly moving structured messages" framing lands.
- **Actuarial touchpoints** — experience vs exposure rating, burning cost, working layers, IBNR,
  Solvency II — pitched at recognition for the Fellow-actuary COO.
- **Cat modelling** — the vendor-model concept (RMS/Verisk), the four modules, and the
  EP-curve → PML/AAL outputs; the point that model choice *is* the competitive edge.
- **Cyber** — the data-heavy emerging line: ~40% ceded via quota share, non-geographic
  accumulation through shared tech, systemic tail, data scarcity.
- **Arch Re's four named lines** placed onto the axes in a table, with the "same machinery,
  different pricing engine at step 3" mental model.

Also added a **"Reinsurance domain" subsection to `RESOURCES.md`** (the effort's precedent),
merged around ticket 09's concurrent "Applied AI" edit.

`npm run validate` clean, 194 notes — and this **clears the expected `[[reinsurance]]` warning**
that ticket 04's event-sourcing note left dangling. Closes the last standalone Tier-2 gap; only
the AI note (09, in progress) and the Plan (11) remain.
