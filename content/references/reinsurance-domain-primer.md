---
id: 01M3800GSH6XB120SYKVJBBMFC
title: Reinsurance domain primer
topic:
  - reinsurance
---

The vocabulary and mental model to walk into a [[reinsurance]] conversation with — accurate
terms and a working picture of how the business runs and where a system plugs into it, **not**
actuarial depth. Look here to place a word ("what's a cat XoL layer?", "what does the cedent
send at submission?"), not to price a treaty. The bar the role sets is vocabulary plus
curiosity: the COO is a Fellow actuary, so recognising the terms and knowing which questions
are hard matters more than doing the maths.

## What it is, and why cedents buy it

A primary insurer — the **cedent** (ceding company) — **cedes** part of the risk it wrote to a
**reinsurer** for a share of premium. Reinsurers in turn cede to other reinsurers:
**retrocession** (buyer = retrocedent, seller = retrocessionaire). Four connected reasons a
cedent buys ([Triple-I](https://www.iii.org/article/background-on-reinsurance)):

| Reason | What it buys |
| --- | --- |
| **Capital relief / solvency** | Ceding risk cuts net liability → lower required capital and reserves |
| **Capacity** | Freed capital underwrites *larger* / *more* policies than the balance sheet alone allows |
| **Catastrophe protection** | Shields against one large loss, or accumulated losses from one event |
| **Earnings stability** | Smooths volatile year-to-year results |

**The broker model.** Big/complex placements go through a **reinsurance broker (intermediary)**
— Guy Carpenter, Aon, Gallagher Re — who structures the program, runs the analytics, and
places it across a **panel** of reinsurers that each sign a **line** (a % share) of the *same*
contract. "One contract, many subscribing reinsurers each signing a line" is the London/Lloyd's
**slip** model, and it shapes how the placement data flows
([Guy Carpenter](https://www.guycarp.com/solutions/capabilities/reinsurance-broking.html)).

## Contract types — the two axes

A contract is (**treaty** or **facultative**) **and** (**proportional** or
**non-proportional**). The two axes are independent.

**Axis A — how the deal is scoped** ([Triple-I](https://www.iii.org/article/background-on-reinsurance)):

| | Covers | Reinsurer picks risks? |
| --- | --- | --- |
| **Treaty** | A whole defined *book* ("all our auto"); every qualifying policy is covered **automatically** | No — cannot cherry-pick; bulk of the market |
| **Facultative** | One specific large/hazardous risk (a refinery, a stadium) | Yes — underwrites *each* risk; "faculty" to accept or decline |

**Axis B — how losses are shared** ([Triple-I](https://www.iii.org/article/background-on-reinsurance);
[Munich Re](https://www.munichre.com/content/dam/munichre/contentlounge/website-pieces/documents/Types-of-Reinsurance.pdf/_jcr_content/renditions/original./Types-of-Reinsurance.pdf)):

| Type | How | Note |
| --- | --- | --- |
| **Proportional — quota share** | Reinsurer takes a **fixed %** of premium *and* every loss (e.g. 50/50, up to a limit) | Simple; strong capital relief; reinsurer pays a **ceding commission** |
| **Proportional — surplus** | Ceded share **varies by risk**: cedent keeps a fixed retention ("line"), cedes only the *surplus* above it | Small risks wholly retained, large ones heavily ceded; more admin |
| **Non-proportional — XoL** | Cedent retains losses to an **attachment point**; reinsurer pays the slice **above**, up to a **limit** | Written "**limit xs retention**", e.g. **$5m xs $5m**; premium is a negotiated layer cost |

**XoL flavours:** **per-risk** (attaches on each individual loss) · **per-occurrence / cat
XoL** (attaches on aggregated loss from *one event* — one hurricane, one quake — the core
natural-cat layer cat models price) · **aggregate / stop-loss** (attaches on *total* losses
over a year, often as a loss-ratio band, e.g. 80–110%).

**Two XoL terms you'll meet in the data** ([CAS — Clark](https://www.casact.org/sites/default/files/old/studynotes_clark_2014.pdf)):
**rate on line (RoL)** = layer premium ÷ layer limit (the headline "price" of a layer);
**reinstatement** = after a layer is exhausted, a reinstatement premium buys the cover back for
the rest of the term (contracts fix how many, and their cost).

## The placement lifecycle a system touches

Heavily **message-driven**: the standard is **ACORD's Global Reinsurance & Large Commercial
(GRLC)** data standards, defining machine-readable messages for **Placing, Accounting and
Claims**; **Ruschlikon / ePlacing** is the market's push to run it electronically end-to-end.
A system here is largely about moving structured messages through these stages
([ACORD](https://www.acord.org/standards-architecture/acord-data-standards/Global_Reinsurance_Data_Standards)).

| # | Stage | What flows |
| --- | --- | --- |
| 1 | **Submission** | Cedent (via broker) sends exposure data, loss history, cover sought — the raw input a pricing system ingests |
| 2 | **Underwriting** | Reinsurer assesses appetite, terms, exclusions (per-book for treaty, per-risk for fac) |
| 3 | **Pricing** | Technical price produced (see below); broker sends a **quotation request**, reinsurer returns a **quotation** |
| 4 | **Binding / placement** | Cedent gives an **order**; each reinsurer signs a **line** (%); the **slip** is subscribed to 100% and **bound** |
| 5 | **Booking / accounting** | Premiums, ceding commissions, installments; **technical accounts / bordereaux** (periodic premium & loss listings) set up |
| 6 | **Claims** | Cedent notifies losses; large/cat losses trigger **cash calls**; flows under the ACORD claims standard |
| 7 | **Settlement** | Money moves — premiums, commissions, recoveries — reconciled against the technical accounts |
| 8 | **Renewal** | Treaties are typically **annual**; the cycle repeats. Big dates: **1 Jan, 1 Apr, 1 Jul** |

## Actuarial touchpoints

Two canonical pricing methods, usually blended
([CAS — Clark](https://www.casact.org/sites/default/files/old/studynotes_clark_2014.pdf)):

- **Experience rating** — price off the cedent's **own historical losses**: strip cat/shock
  losses, **trend** to future cost levels, **develop** to ultimate, apply layer terms, derive a
  **burning cost** (losses to the layer ÷ premium), load for expenses and profit. Needs
  **"working layers"** hit often enough to have credible data.
- **Exposure rating** — price off the **exposure** profile (sums insured / policy limits) using
  severity curves, independent of the cedent's history. Works on **all layers**, including high
  ones that rarely produce losses.

Also in the vocabulary: **reserving** (**IBNR** — incurred but not reported), **capital
modelling / solvency** (Solvency II, economic capital), **portfolio roll-up** of accumulations.
For cat layers, the pricing engine is the cat model.

## Catastrophe modelling

Cat layers can't be priced from history (events are too rare, the world changes), so the
industry uses **probabilistic catastrophe models** — and most (re)insurers **license
third-party vendor models** rather than build their own. Dominant vendors: **Moody's RMS** and
**Verisk (AIR)** (CoreLogic third) ([Moody's RMS](https://www.rms.com/catastrophe-modeling);
[CAS — Homer & Li](https://www.casact.org/sites/default/files/2021-02/2017_most-practical-paper_homer-li.pdf)).

**Four modules:** ① **event / stochastic catalog** (tens of thousands of simulated events, each
with an annual rate) → ② **hazard** (physical intensity at each location) → ③ **vulnerability /
damage** (how much a building takes → a damage ratio) → ④ **financial** (applies policy and
reinsurance terms → insured loss).

**Outputs an engineer passes around:**

| Output | What it is |
| --- | --- |
| **EP curve** (Exceedance Probability) | Probability annual loss exceeds a given amount — the foundation of cat pricing |
| **PML** (Probable Maximum Loss) | The loss at a stated **return period** (e.g. the **1-in-250-year** loss); drives pricing and capital/retro held |
| **AAL** (Average Annual Loss / "pure premium") | Mean annual modelled loss — the technical loss-cost baseline for a layer |
| **TVaR / tail metrics** | For capital |

Because everyone licenses the same few models, **model choice, version and assumptions
("model blending", "own view of risk") are themselves competitive decisions** — and much of the
software work is ingesting exposure in the vendor's schema, running the model, and consuming
EP/PML output.

## Cyber — the emerging, data-heavy line

The growth line, and where a data/engineering background is most directly relevant. Roughly
**~40% of cyber premium is ceded**, mostly via **quota share** — proportional cover gives young
cyber insurers capital relief and, through **overriding commissions**, funds the analytics they
must build ([Swiss Re](https://www.swissre.com/reinsurance/insights/cyber-reinsurance-in-the-new-normal.html)).
Why it's a data problem:

- **Aggregation is not geographic.** Property accumulation is monitored by physical location;
  cyber accumulation spans **connected systems** — one cloud provider, OS, or widely-used
  package (a Log4j or a CrowdStrike-style event) hits thousands of insureds at once, across
  every line ([Guy Carpenter](https://www.guycarp.com/content/dam/guycarp/en/documents/dynamic-content/Measuring%20Cyber%20Aggregation%20Risk.pdf)).
- **Systemic / catastrophic tail.** Cyber-war and critical-infrastructure scenarios can exceed
  the industry's whole capacity → hard war/infrastructure exclusions and careful wording.
- **Data scarcity.** Limited loss history and new, untested models make pricing genuinely
  uncertain, so the line runs on improving **data quality** and maturing the models.

## Arch Re's named lines

Arch writes "treaty and facultative property and casualty reinsurance on a worldwide basis"
([Arch Re](https://reinsurance.archgroup.com/)):

| Line | What it is | Axis placement |
| --- | --- | --- |
| **Property Catastrophe** | Cover for accumulated losses from one natural-cat event across a property book; priced by cat models | Treaty, **non-proportional (cat XoL)** — also writes property pro-rata & per-risk |
| **Property Excess of Loss** | Per-risk/per-occurrence non-proportional property: cedent retains a layer, Arch pays above | Treaty, **non-proportional (XoL)** |
| **Professional Liability** | Reinsurance of PI / E&O books — a **casualty / long-tail** line (claims emerge over years) | Treaty or fac, proportional **or** XoL |
| **Marine Treaties** | Marine & offshore-energy books — cargo, hull, marine liability (P&I), offshore energy; volatile specialty | **Treaty**, written **both** proportional and XoL |

Mental model: **Property Cat** and **Property XoL** are short-tail, event-driven, model-priced
property; **Professional Liability** is long-tail casualty priced off experience and exposure;
**Marine** is a volatile specialty book. All four are the *same machinery* — submission →
underwrite → price → bind → book → claims → settle → renew — with different data and a different
pricing engine at step 3.

## The three things that cost people points

- **Mixing the two axes.** "Treaty vs facultative" is *scope* (a book vs one risk);
  "proportional vs non-proportional" is *loss-sharing*. A contract is one from each — a quota
  share treaty and a cat XoL treaty are both treaties.
- **Thinking cat losses are priced from history.** They aren't — rare events, changing world.
  They're priced from **vendor cat models** (EP curve → PML/AAL), and the model *is* the
  competitive edge.
- **Treating cyber like property.** The accumulation is through **shared technology**, not
  geography, which breaks the location-based tooling the rest of the book relies on.

For the fuller picture and every source, see the investigation this distils. Sources ledger is
`RESOURCES.md`.
