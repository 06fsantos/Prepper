# Research: reinsurance domain primer

Type: research
Status: resolved

## Question

The role stresses "a solid understanding of Arch Re's primary business", working "hand in hand with
business users", and the COO is a Fellow actuary. The bar is **fluency and curiosity**, not actuarial
depth. Gather accurate vocabulary and the mental model:

- Reinsurance basics: what reinsurance is, why cedents buy it, the intermediary/broker model.
- Contract types: **treaty vs facultative**; **proportional (quota share, surplus)** vs
  **non-proportional (excess-of-loss / XoL, cat XoL, stop-loss)**.
- The lifecycle a system would touch: submission → underwriting → pricing → binding → booking →
  claims → settlement; the actuarial touchpoints; catastrophe modelling (the vendor-model idea);
  cyber-risk reinsurance as an emerging, data-heavy line.
- The handful of terms Arch Re's brief names (Property Cat, Property XoL, Professional Liability,
  Marine Treaties) — enough to place each.

AFK. Capture findings as a Markdown file the domain note (ticket 10) draws on; leave a context
pointer here. Resolved by a subagent calling the `research` skill.

## Answer

Reinsurance is insurance for insurers: a cedent transfers risk to a reinsurer for capital
relief, capacity, cat protection and earnings stability, usually via a broker (Guy Carpenter/
Aon/Gallagher Re) who places a slip across a panel each signing a line. Contracts sit on two
axes — **treaty** (a whole book, automatic) vs **facultative** (one underwritten risk), and
**proportional** (quota share = fixed %, surplus = varying %, sharing premium and loss pro-rata)
vs **non-proportional / XoL** (cedent retains up to an attachment, reinsurer pays the layer
above; per-risk, cat XoL on a single event, and aggregate/stop-loss on annual results). A
software system rides the ACORD-messaged lifecycle submission → underwrite → price → bind →
book → claims → settle → renew; actuaries price via experience rating (burning cost on working
layers) and exposure rating, while cat layers are priced by **vendor cat models** (Moody's RMS,
Verisk/AIR) built from event catalog → hazard → vulnerability → financial modules and consumed
as EP curves, PML at a return period, and AAL. **Cyber** is the emerging, data-heavy line —
~40% ceded via quota share, with non-geographic (cloud/software) aggregation and scarce data
as the core modelling problem. Arch Re's named lines place cleanly: **Property Catastrophe**
(treaty cat XoL, model-priced) and **Property Excess of Loss** (treaty per-risk XoL) are
short-tail property; **Professional Liability** is long-tail casualty; **Marine Treaties** are
a volatile specialty book written both proportional and XoL.

Full primer with sources: [`research/reinsurance-domain-primer.md`](../research/reinsurance-domain-primer.md)
