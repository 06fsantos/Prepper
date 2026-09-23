---
id: 01M37ZZQVTZ71Z6K3NTHXHKSQD
title: Applied AI — cheat sheet
topic: applied-ai
---

**Lead sentence:** in a high-stakes domain, **AI moves the paperwork and retrieval; humans keep
the judgment** — decision *support*, not automation. The market's gap is *governed production*, not
ideas (adoption up, but most firms haven't shipped AI into core decisions).

**Sort every idea by blast radius + ROI clarity:**

- **Quick wins** (bounded, measurable, low blast radius): document **extraction**, **triage /
  appetite scoring** (keep it on the soft "route", not the hard "decline"), reconciliation, **RAG
  copilots** over your own corpus. Start here — highest-certainty ROI, builds the eval + governance
  muscle everything else needs.
- **Moonshots** (high value, **high blast radius**, soft near-term ROI): generative modelling of
  rare events (can produce plausible-but-wrong outputs that feed pricing), **constrained /
  auditable ML pricing**, agentic end-to-end. Earn toward them; don't start there.

**Tradeoffs a senior owns:**

- **Eval first** — you can't ship what you can't measure. Build a domain eval set; measure
  field-level accuracy + hallucination, not vibes. Governance, *not* model size, is what buys
  reliability (a reinsurance benchmark: ~21% → ~13% hallucination via RAG + logging + HITL).
- **Hallucination = a real cost**, not a UX bug → **RAG with visible citations**, confidence
  thresholds that escalate, output verification, model never the **system of record**.
- **Human-in-the-loop, deliberately placed** at the risky decisions (confirm low-confidence
  extraction, approve any declination, sign the price) — keyed to blast radius.
- **Governance = extend existing model-risk management** (SR 11-7 / Solvency II / EU AI Act), not a
  new silo. Data lineage, immutable logging, independent validation. It's also an **ROI lever**
  (faster validation cycles, lower capital add-ons).
- **Build vs buy:** buy the commodity (extraction, cat models), **build the differentiator** (your
  corpus, appetite, and the RAG/eval/governance plumbing).
- **RAG vs fine-tune:** default **RAG** (facts change, gives citations, cheap to keep current).
  Fine-tune only for *form* (house style, structured output, a narrow classifier), never facts.
- **Cost/latency are KPIs:** batch/cache, route cheap models for easy work + frontier models for
  hard reasoning; sketch (minutes saved × volume) − (inference + governance cost).

**Two strands = a portfolio, not a contradiction:** quick wins judged by **ROI**, governed tightly;
the lab judged by **learning** (most bets won't ship — the portfolio is the return; don't fake an
ROI number on a research bet). **The bridge is the platform** — eval, RAG, lineage and HITL tooling
built for quick wins is what lets a lab experiment graduate without a rewrite.

The reach-for-it signal: any "where would you apply AI here?" or "how would you think about
AI/ML in this system?" question — sort, then reason about eval/hallucination/governance.

Full treatment: [[applied-ai-in-reinsurance]].
