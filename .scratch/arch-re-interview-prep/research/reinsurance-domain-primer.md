# Reinsurance Domain Primer

A fluency-and-curiosity primer for a senior software engineer interviewing at Arch Re. The
goal is accurate vocabulary and a working mental model of how the business runs and where a
software system plugs into it — **not** actuarial depth. Every claim is tied to a high-trust
source (Triple-I, Munich Re, Swiss Re, Guy Carpenter, the CAS/SOA actuarial literature,
Moody's RMS, ACORD, and Arch Re's own site).

---

## 1. What reinsurance is, and why cedents buy it

**Reinsurance is insurance for insurance companies.** A primary insurer (the one that sold
the auto/home/business policy) transfers some of the financial risk it assumed to another
insurer, the **reinsurer**. The primary insurer is the **cedent** (or ceding company); it
**cedes** business; the reinsurer accepts it in exchange for a share of premium. [Triple-I]

Cedents buy reinsurance for four connected reasons:

1. **Capital relief / solvency.** Ceding risk reduces the insurer's net liability, which
   lowers the capital and reserves it is required to hold. [Triple-I]
2. **Capacity.** Freed-up capital lets the cedent underwrite *larger* or *more* policies than
   its own balance sheet could otherwise support. [Triple-I]
3. **Catastrophe protection.** Reinsurance shields the cedent from large single losses and
   from accumulations of many losses from one event — hurricane, earthquake, wildfire,
   tornado. [USPTO patent corpus / industry framing]
4. **Earnings stability.** Smoothing volatile results year to year.

Reinsurers themselves buy reinsurance — this is called **retrocession**, and the buyer is the
**retrocedent**, the seller the **retrocessionaire**. (Arch Re lists "retrocessional covers"
among its property products.) [Arch Re]

### The broker / intermediary model

Cedents can buy **direct** from a reinsurer, but the largest and most complex placements go
through a **reinsurance broker (intermediary)** — Guy Carpenter, Aon, Gallagher Re are the
big three. The broker locates, negotiates and procures cover, advises on program structure,
runs the catastrophe/actuarial analytics, and represents the cedent across a **panel** of
reinsurers who each take a **line** (a percentage share) of the same contract. [Guy Carpenter;
USPTO corpus] This "one contract, many subscribing reinsurers each signing a line" pattern is
the London/Lloyd's **slip** model and is central to how the placement data flows.

---

## 2. Contract types — the two axes

Two independent classifications combine. A contract is (treaty **or** facultative) **and**
(proportional **or** non-proportional).

### Axis A — Treaty vs. Facultative (how the deal is scoped)

- **Treaty** — covers a **whole defined book** of the cedent's business (e.g. "all our
  auto"). Once terms are set, every policy falling within them is covered **automatically**;
  the reinsurer cannot cherry-pick individual risks. This is the bulk of the market and the
  bread-and-butter of a "treaty" underwriter. [Triple-I]
- **Facultative** — covers **one specific risk**, usually large or hazardous (a refinery, a
  hospital, a stadium). The reinsurer underwrites *each* risk individually and may accept or
  decline it — the reinsurer's "**faculty**" to choose is where the name comes from. [Triple-I]

### Axis B — Proportional vs. Non-proportional (how losses are shared)

**Proportional (pro-rata):** cedent and reinsurer share **premium and losses in the same
agreed proportion.** [Triple-I]

- **Quota share** — a **fixed** percentage of every risk in the book (e.g. reinsurer takes
  50% of premium and pays 50% of every loss, up to a limit). Simple; strong capital relief.
  The reinsurer usually pays the cedent a **ceding commission** to cover acquisition costs. [Triple-I / Munich Re]
- **Surplus** — the ceded share **varies risk by risk.** The cedent keeps a fixed retention
  ("line") and cedes only the *surplus* above it, so small risks may be wholly retained while
  large ones are heavily ceded. More work to administer than quota share; better tailored to a
  book with a wide spread of sums insured. [Triple-I / Munich Re]

**Non-proportional (excess of loss, XoL):** the reinsurer does **not** share every loss
pro-rata. Instead the cedent **retains** losses up to an **attachment point** (its retention),
and the reinsurer pays the slice **above** that, up to a **limit**. A layer is written
"**limit xs retention**", e.g. **$5m xs $5m**. Premium is a negotiated cost of the layer, not
a fixed proportion. [Triple-I / Munich Re] Flavours:

- **Per-risk XoL** — attaches on each individual risk/policy loss.
- **Per-occurrence / Catastrophe XoL ("cat XoL")** — attaches on the **aggregated** loss from
  a **single event** (one hurricane, one quake) across many policies. This is the core natural-
  catastrophe protection layer and the thing cat models exist to price. [Triple-I / Munich Re]
- **Aggregate / Stop-loss** — attaches on the cedent's **total losses over a period** (usually
  a year), protecting the whole result rather than any single event. Often expressed as a loss
  *ratio* band (e.g. covers the loss ratio between 80% and 110%). [CAS/SOA]

Two XoL terms an engineer will meet in the data:

- **Rate on line (RoL)** — layer premium ÷ layer limit; the headline "price" of a layer. [CAS/SOA]
- **Reinstatement** — after a layer is exhausted by a loss, a **reinstatement premium** buys
  the cover back for the rest of the term; contracts specify a number of reinstatements and
  their cost. [CAS/SOA]

---

## 3. The lifecycle a software system touches

Reinsurance placement follows a repeatable cycle, and it is heavily **message-driven** — the
industry standard is **ACORD's Global Reinsurance & Large Commercial (GRLC) data standards**,
which define machine-readable messages for **Placing, Accounting and Claims**. The
Ruschlikon / ePlacing initiative is the market's push to do this electronically end-to-end. A
system in this space is largely about moving structured messages through these stages. [ACORD]

1. **Submission.** The cedent (usually via broker) sends the risk: exposure data, loss
   history, the cover sought. This is the raw input a pricing/underwriting system ingests.
2. **Underwriting / risk assessment.** The reinsurer evaluates the book (treaty) or the single
   risk (fac): appetite, terms, exclusions. For fac, each risk is judged individually. [ACORD / Triple-I]
3. **Pricing.** Actuaries/underwriters produce a technical price (see §4). Broker submits a
   **quotation request**; reinsurer returns a **quotation** (price + terms). [ACORD]
4. **Binding / placement.** The cedent gives an **order**; each reinsurer signs a **line** (its
   %). The **slip** is subscribed until 100% is placed; the contract is **bound**. [ACORD / Lloyd's]
5. **Booking / accounting.** The bound contract is set up in systems: premiums, ceding
   commissions, installments, and **technical accounts / bordereaux** (periodic listings of
   premiums and losses the cedent reports to the reinsurer). [ACORD]
6. **Claims.** When events occur, the cedent notifies claims/cessions against the treaty;
   large or cat losses trigger **cash calls**. Claims messages flow under the ACORD claims
   standard. [ACORD]
7. **Settlement.** Money moves — premiums, commissions, claim recoveries — reconciled against
   the technical accounts.
8. **Renewal.** Treaties are typically **annual**; the whole cycle repeats at renewal (the big
   dates are **1 January, 1 April, 1 July**). Terms, pricing and structure are renegotiated
   each time. [Guy Carpenter]

---

## 4. Actuarial touchpoints

The COO being an actuary is a hint: pricing and reserving are where actuaries live, and a
senior engineer should recognise the vocabulary. Two canonical pricing methods, usually run
side by side and blended: [CAS/SOA — David Clark, "Basics of Reinsurance Pricing"]

- **Experience rating** — price off the cedent's **own historical loss experience**: take
  historical premium and losses, strip out cat/shock losses, **trend** them to future cost
  levels, **develop** them to ultimate, apply the layer terms, and derive a **burning cost**
  (losses to the layer ÷ premium), then load for expenses and profit. Works best on
  **"working layers"** that get hit often enough to have credible data. [CAS/SOA]
- **Exposure rating** — price off the **exposure** (the profile of sums insured / policy
  limits) using severity curves, independent of the cedent's own history. Works on **all
  layers**, including high ones that rarely produce losses and so have no experience to rate. [CAS/SOA]

Other actuarial touchpoints: **reserving** (IBNR — incurred but not reported), **capital
modelling / solvency** (Solvency II, economic capital), and **portfolio roll-up** of
accumulations. For catastrophe layers, the pricing engine is the **cat model** (§5).

---

## 5. Catastrophe modelling and the vendor-model concept

Natural-catastrophe layers can't be priced from history — big events are too rare and the
world changes (exposure growth, climate). Instead the industry uses **probabilistic
catastrophe models**, and — crucially — most (re)insurers **license third-party "vendor
models"** rather than building their own. The two dominant vendors are **Moody's RMS**
(formerly RMS) and **Verisk (AIR)**; a third, CoreLogic, also competes. [Moody's RMS; CAS —
Homer & Li, "Notes on Using Property Catastrophe Model Results"]

A cat model has four conceptual modules: [Moody's RMS]

1. **Event / stochastic catalog** — tens of thousands of simulated plausible events (each
   hurricane track, each quake rupture) with an annual rate of occurrence.
2. **Hazard** — the physical intensity each event produces at each location (windspeed,
   ground shaking, flood depth).
3. **Vulnerability / damage** — how much a given building takes at that intensity
   (construction, occupancy, year built → a damage ratio).
4. **Financial** — applies policy and reinsurance terms (deductibles, limits, the XoL layer)
   to turn damage into insured loss.

The headline outputs an engineer will pass around: [CAS — Homer & Li]

- **Exceedance Probability (EP) curve** — probability that annual loss exceeds a given
  amount; the foundation of cat pricing.
- **PML (Probable Maximum Loss)** — the loss at a stated **return period** on the EP curve
  (e.g. the **1-in-250-year** loss). Return periods drive both pricing and how much capital /
  retro a reinsurer holds.
- **AAL (Average Annual Loss / "pure premium")** — the mean annual modelled loss; the
  technical loss cost baseline for a layer.
- **TVaR / tail metrics** for capital.

Because everyone licenses the same handful of vendor models, **model choice, version, and
assumptions ("model blending", "own view of risk") are themselves competitive decisions** —
and a lot of the software work is ingesting exposure data in the vendor's schema, running the
model, and consuming EP/PML output.

---

## 6. Cyber reinsurance — the emerging, data-heavy line

Cyber is the growth line and the one where a data/engineering background is most directly
relevant. Reinsurers matter a lot here: an estimated **~40% of total cyber premium** is ceded,
mostly via **quota share** treaties, because proportional cover gives young cyber insurers
**capital relief** and — through **overriding commissions** — helps fund the analytics
capability they need to build. [Swiss Re]

Why it's hard, and why it's a data problem: [Swiss Re; Guy Carpenter; Munich Re]

- **Aggregation is not geographic.** Traditional property accumulation is monitored by
  physical location; cyber accumulation spans **connected systems** — a single cloud provider,
  OS, or widely-used software (think a Log4j or a CrowdStrike-style event) can hit thousands of
  insureds at once, across every line, regardless of geography. This is the central modelling
  headache. [Guy Carpenter]
- **Systemic / catastrophic tail.** Cyber-war or critical-infrastructure outage scenarios
  could exceed the industry's entire capacity, which drives hard war/infrastructure exclusions
  and careful treaty wording. [Swiss Re]
- **Data scarcity.** Limited loss history, incomplete incident data, and **new, relatively
  untested probabilistic models** make pricing and capital estimation genuinely uncertain — so
  the whole line runs on improving **data quality** and maturing the models. [Swiss Re; Munich Re]

Cyber is, in effect, the frontier where cat-modelling techniques are being reinvented for a
peril with no coastline.

---

## 7. Placing Arch Re's named lines

From Arch Re's own offering pages, the terms in the brief map cleanly onto the two axes above.
Arch Re writes "treaty and facultative property and casualty reinsurance on a worldwide basis."
[Arch Re]

| Arch Re line | What it is | Axis placement |
| --- | --- | --- |
| **Property Catastrophe** | Cover for accumulated losses from a single natural-cat event across a property book; priced by cat models. | Treaty, **non-proportional (cat XoL)** — Arch also writes property **pro-rata / quota share** and **per-risk**. |
| **Property Excess of Loss** | Per-risk (or per-occurrence) non-proportional property cover: cedent retains a layer, Arch pays above it. | Treaty, **non-proportional (XoL)**. |
| **Professional Liability** | Reinsurance of professional-indemnity / E&O books (a **casualty / liability** line — "long-tail", claims emerge over years). | Treaty or fac, proportional **or** XoL. Sits in Arch's **casualty/liability** offering. |
| **Marine Treaties** | Reinsurance of marine & offshore-energy books — cargo, hull, marine liability (incl. P&I), offshore energy. Volatile, specialist. | **Treaty** (as named), written **both proportional and excess of loss**. |

Mental model to carry in: **Property Cat** and **Property XoL** are short-tail, event-driven,
model-priced property; **Professional Liability** is long-tail casualty priced off experience
and exposure; **Marine** is a volatile specialty book. All four are the same machinery —
submission → underwrite → price → bind → book → claims → settle → renew — with different data
and different pricing engines behind step 3.

---

## Sources

- [Triple-I — Background on: Reinsurance](https://www.iii.org/article/background-on-reinsurance) — reinsurance definition, cede/cedent, capital & capacity rationale, treaty vs facultative, proportional vs excess of loss, cat bonds / ILW / sidecars.
- [Munich Re — Types of Reinsurance (LIMA programme)](https://www.munichre.com/content/dam/munichre/contentlounge/website-pieces/documents/Types-of-Reinsurance.pdf/_jcr_content/renditions/original./Types-of-Reinsurance.pdf) and [Non-Proportional](https://www.munichre.com/content/dam/munichre/contentlounge/website-pieces/documents/NL-Non-Proportional_30-03-2023.pdf/_jcr_content/renditions/original./NL-Non-Proportional_30-03-2023.pdf) / [Proportional Treaties](https://www.munichre.com/content/dam/munichre/contentlounge/website-pieces/documents/Proportional-Treaties-29-03-2023.pdf/_jcr_content/renditions/original./Proportional-Treaties-29-03-2023.pdf) — quota share, surplus, XoL structure.
- [Swiss Re — Cyber reinsurance in the "new normal"](https://www.swissre.com/reinsurance/insights/cyber-reinsurance-in-the-new-normal.html) and [Could cyber risk be a growth engine for reinsurance?](https://www.swissre.com/reinsurance/insights/reinsurance-a-growth-engine-for-cyber.html) — ~40% cyber cession via quota share, overriding commissions, data scarcity, systemic tail.
- [Guy Carpenter — Measuring Cyber Aggregation Risk](https://www.guycarp.com/content/dam/guycarp/en/documents/dynamic-content/Measuring%20Cyber%20Aggregation%20Risk.pdf) and [Reinsurance Broking](https://www.guycarp.com/solutions/capabilities/reinsurance-broking.html) / [Glossary](https://www.guycarp.com/company/news-and-events/glossary.html) — broker role, non-geographic cyber accumulation.
- [Moody's RMS — Catastrophe Risk Modeling](https://www.rms.com/catastrophe-modeling) — vendor cat model, event catalog / hazard / vulnerability / financial, EP curve, PML, perils.
- [CAS — Homer & Li, "Notes on Using Property Catastrophe Model Results"](https://www.casact.org/sites/default/files/2021-02/2017_most-practical-paper_homer-li.pdf) — RMS vs Verisk/AIR, EP curve, PML, AAL, return periods.
- [CAS — David R. Clark, "Basics of Reinsurance Pricing" (study note)](https://www.casact.org/sites/default/files/old/studynotes_clark_2014.pdf) and [CAS — Introduction to Experience Rating](https://www.casact.org/sites/default/files/presentation/sections_care_0813_presentations_happ.pdf) — experience vs exposure rating, burning cost, working layers, rate on line, stop-loss.
- [ACORD — Global Reinsurance & Large Commercial Data Standards](https://www.acord.org/standards-architecture/acord-data-standards/Global_Reinsurance_Data_Standards) and [Ruschlikon ePlacing Best Practice Guide](https://www.acord.org/docs/default-source/ruschlikon-documents-newsletters/ruschlikon-member-resources/best-practice-guide-(eplacing).pdf) — placing/accounting/claims messages, quotation → order → line, technical accounts.
- [Arch Reinsurance — offering pages](https://reinsurance.archgroup.com/) ([Property Treaty](https://reinsurance.archgroup.com/offering/property-treaty), [Liability / Casualty Treaty](https://reinsurance.archgroup.com/offering/casualty-treaty/), [Marine & Offshore Energy](https://reinsurance.archgroup.com/offering/marine-and-offshore-energy/)) — Property Cat, Property per-risk/pro-rata, professional liability, marine treaties, retrocessional covers.
