# Author: AI-in-reinsurance note

Type: task
Status: resolved
Blocked by: 01, 02

## Question

Author a fluency-level vault note giving a **defensible point of view on applying AI/ML at a
reinsurer** — the brief's headline theme and near-certain open question ("where would you apply AI
here?"). Draws on ticket 02's research. Via `/author`, at the type/topic decided in 01. Must let the
candidate:

- Name concrete applications and sort them **quick-win vs moonshot** (the brief's modernization vs
  R&D strands), grounded in the reinsurance lifecycle (link ticket 10's domain note).
- Reason about the **tradeoffs a senior must own** in a $bn-payout domain: eval/accuracy,
  hallucination, human-in-the-loop, data governance, build-vs-buy, RAG vs fine-tune, cost/latency.
- Hold a **structured argument**, not a buzzword list — how to frame ROI-free R&D honestly.

## Decided attachment (from 01)

- **Type:** Lesson → `content/lessons/`
- **`topic:`** `applied-ai`
- **Also mint the new Term** `content/terms/applied-ai.md` as a **top-level topic** (no `topic:`
  field) — this ticket owns it. The behavioural R&D-mandate angle stays in `behavioral-interviews`
  and *links to* this Lesson rather than living inside it.
- Files to mint: **1 Term + 1 Lesson**.

Resolved when the note passes `npm run validate` and equips a credible AI conversation at fluency depth.

## Answer

Authored via `/author`. Minted the top-level Term **`applied-ai`** and the Lesson
**[[applied-ai-in-reinsurance]]** (`topic: applied-ai`), plus the topic's cheat sheet
**`applied-ai-cheat-sheet.md`** — 3 files, not the stated 2, by this effort's own precedent
(every authoring ticket writes the topic's cheat sheet; the auth ticket 07 did the same for its
new top-level Term). Also added an "Applied AI in insurance / reinsurance" subsection to
`RESOURCES.md` with the four high-trust sources.

The Lesson gives the candidate a **defensible point of view**, not a buzzword list, built on
ticket 02's research:

- **The one sentence to lead with:** *AI moves the paperwork and retrieval; humans keep the
  judgment* — decision support, not automation — and the market's real gap is *governed
  production*, not ideas (LMA 2026: adoption doubled, deployment stays in efficiency).
- **Sort every idea quick-win vs moonshot** by blast radius + ROI clarity (the brief's
  modernization vs R&D strands), with a table: extraction / triage / bordereaux / RAG copilots
  (quick, low blast) vs generative cat modelling / constrained pricing / agentic (moonshot, high
  blast, feeds pricing). Grounded in the reinsurance lifecycle via `[[reinsurance]]`.
- **The tradeoffs a senior owns:** eval-set-first, hallucination → RAG-with-citations +
  confidence-gated HITL, governance as an extension of model-risk management *and* an ROI lever
  (anchored on the RAIRAB benchmark's ~21%→~13% hallucination number — "governance not scale"),
  build-vs-buy, RAG-vs-fine-tune, cost/latency KPIs. Wires the extraction pipeline back to the
  vault's own `[[azure-service-bus-and-event-driven-soa]]` / `[[event-sourcing-and-cqrs]]` /
  `[[consistency-models]]` vocabulary rather than re-teaching it.
- **Two strands, one honest frame:** a portfolio with different success criteria (quick wins by
  ROI, the lab by learning), bridged by the **governed platform** — the owner-not-demo-builder
  answer, linked to the `[[behavioral-interviews]]` motivation story per 01's decision.

Three interleaved quiz blocks (mcq on where-to-start judgment, cloze on the governance/RAG
tradeoff, recall = the full "where would you apply AI here?" spoken answer). `npm run validate`
clean — 195 notes, **no violations** (the `[[reinsurance]]` link resolves; that Term now exists).
Closes the last of the four Tier-1 gaps.
