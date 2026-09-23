# Research: AI/ML applications in reinsurance

Type: research
Status: resolved

## Question

The brief's headline theme is AI/ML ("immediate value from AI", an R&D/lab mandate to imagine a
$20bn+ Arch Re, a CTO from Microsoft + scale-ups). Expect an open-ended "where would you apply AI
here?" and a motivation probe. Gather a credible, current, specific picture:

- Concrete applications at a reinsurer: underwriting/submission triage, document & treaty-slip
  extraction, catastrophe-model tooling, claims triage, pricing/risk signals, portfolio analytics,
  broker-facing copilots. Which are **quick wins** vs **moonshots**.
- The **tradeoffs** a senior must name: eval/accuracy, hallucination in a $bn-payout domain,
  data governance/regulation, human-in-the-loop, build-vs-buy, latency/cost, RAG vs fine-tune.
- The **shape of the argument**, not just a list: how to reason about ROI-free R&D vs modernization
  quick wins (the brief's two parallel strands).

AFK. Capture findings as a Markdown file the AI note (ticket 09) draws on; leave a context pointer
here. Resolved by a subagent calling the `research` skill.

## Answer

The credible reinsurance AI story is **"AI moves the paperwork and the retrieval, humans keep the
judgment"** — and that framing is backed by the market data: Lloyd's 2026 (LMA) shows adoption more
than doubled with 93% building governance frameworks, yet deployment stays in efficiency, not
frontline underwriting/claims, and only ~7% of insurers have scaled AI to production. **Quick wins**
(the modernization strand) are submission/treaty-slip extraction, submission triage/appetite scoring,
bordereaux reconciliation, and RAG underwriter/claims copilots — low blast radius, measurable ROI, and
exactly what Arch already says it does (faster submission clearance via data extraction). **Moonshots**
(the ROI-free lab) are generative catastrophe modeling / synthetic event sets, constrained interpretable
ML pricing (ClauseLens-style CVaR + clause grounding), portfolio NL analytics, and agentic end-to-end
workflows — high blast radius, soft near-term ROI. The tradeoffs a senior must own are quantified best
by arXiv 2511.08082's reinsurance benchmark: zero-shot LLMs grounded at 0.63 with 21.4% hallucination
vs 0.91 / 12.8% once RAG + logging + human-in-the-loop are added — so **reliability is engineered
through governance, not model scale**. Own eval/accuracy (build a domain eval set of real slips),
hallucination (RAG with visible citations, confidence-gated escalation, never system-of-record), HITL
placed by blast radius, data governance as an extension of existing model-risk regimes (SR 11-7,
Solvency II Pillar 2, EU AI Act) rather than a new silo, build-the-differentiator/buy-the-commodity,
**RAG-by-default / fine-tune only for form**, and cost/latency as a per-submission KPI. Frame the two
strands as a portfolio with different success criteria: quick wins judged on ROI and governed tightly;
the lab judged on *de-risked learning*, not a faked ROI number, with the same governance floor — and the
platform (eval harnesses, RAG plumbing, lineage, HITL tooling) is the bridge that lets a lab experiment
graduate to production. If asked where to start: **treaty/submission extraction with human-confirmed
low-confidence fields and a real eval set** — highest-certainty ROI, and it builds the data/governance
muscle everything else depends on.

Full findings, with primary-source citations: [research/ai-in-reinsurance.md](../research/ai-in-reinsurance.md)
