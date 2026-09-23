# AI/ML in reinsurance — credible, current applications and the tradeoffs a senior must narrate

Research for a senior Software Engineer interview at Arch Re. Goal: **conversational fluency**, not
implementation. This file arms you to answer an open-ended "where would you apply AI here?" and the
motivation probe, and to hold your own on the tradeoffs a $bn-payout domain forces.

Date: 2026-09-23. Sources are linked inline; the strongest are two 2025-26 arXiv papers written
specifically about reinsurance, the Lloyd's Market Association's 2026 AI survey, and cat-modeling
vendors' own material.

---

## 0. The one-sentence orientation

Reinsurance is a **document-and-judgment business at extreme stakes**: unstructured broker
submissions and treaty slips come in, a small number of highly-paid underwriters price and structure
risk against models and appetite, and a single wrong tail decision can cost hundreds of millions. So
the honest AI story is: **AI moves the paperwork and the retrieval, humans keep the judgment** — the
value is in intake, extraction, triage, summarization and search, and the frontier is decision
support, not decision automation. That framing is exactly what the market data shows below, and it is
the frame a senior should lead with rather than a feature list.

---

## 1. Where the industry actually is (so you calibrate, not over-claim)

- **Adoption is real but shallow, and concentrated in efficiency, not decisions.** The Lloyd's Market
  Association's April 2026 survey (39 firms, >60% of Lloyd's stamp capacity) found AI adoption *more
  than doubled* in 12 months and **93% of firms have or are building formal AI governance
  frameworks** — but deployment is "largely focused on operational efficiency rather than frontline
  underwriting or claims decision-making." Governance ownership sits with the CTO at 44% of firms; 33%
  have a dedicated AI committee.
  ([LMA](https://lmalloyds.com/ai-adoption-more-than-doubles-across-the-lloyds-market-in-12-months-with-93-of-survey-respondents-building-governance-frameworks/),
  [Reinsurance News](https://www.reinsurancene.ws/ai-adoption-governance-accelerate-across-lloyds-market-lma/))
- **"Value at scale" is rare.** Industry commentary reports only ~7% of insurers have scaled AI into
  production and roughly a third are generating value at scale in core workflows — most is still
  pilots. Use this to sound grounded: the opportunity is *crossing the pilot-to-production chasm*, not
  inventing use cases. ([Data-Pilot / P&C underwriting](https://data-pilot.com/blog/pc-underwriting-ai-automation/))
- **Arch's own posture.** Arch Capital president Maamoun Rajeh has publicly said AI will have "as big
  an impact on humanity as fire and electricity," and Arch describes embedding AI-powered automation
  into end-to-end processes including data extraction for **faster submission clearance** — i.e. the
  quick-win lane, exactly. ([Intelligent Insurer](https://www.intelligentinsurer.com/impact-of-ai-will-be-as-big-as-fire-or-electricity-on-humanity-says-arch-capital-president))

**Interview move:** open by naming this reality. "Adoption doubled but two-thirds of the market still
hasn't put AI into underwriting or claims — the win isn't a clever model, it's being the shop that
gets a governed one into production."

---

## 2. Concrete applications across the reinsurance lifecycle

Sorted by lane. Each has: what it does, why it fits reinsurance, and the honest catch.

### Quick wins (modernization strand — measurable, bounded, low blast radius)

1. **Submission & treaty-slip extraction (the flagship quick win).**
   NLP/LLMs read broker emails, slips, loss runs and policy wordings and extract structured fields —
   layer structures, attachments, limits, aggregates, reinstatements, ALAE handling, claims
   cooperation, follow-the-settlements, sanctions, governing law, arbitration, exclusions. Work that
   took an underwriter 20–30 minutes per submission drops to seconds; sandboxes report ~40% reductions
   in manual review time. This is the single most-cited reinsurance use case and the one Arch already
   names.
   ([Nomad Data / treaty review](https://www.nomad-data.com/doc-chat/automated-treaty-review-using-ai-to-analyze-facultative-and-treaty-reinsurance-contracts-in-minutes-reinsurance-analyst-f00c1),
   [LandingAI / reinsurance extraction](https://landing.ai/developers/reinsurance-document-extraction-re-ink),
   [V7 / London-market slip automation](https://www.v7labs.com/blog/london-market-insurance-slip-automation))
   *Catch:* extraction errors propagate silently into pricing — needs field-level confidence and
   human confirmation on low-confidence fields.

2. **Submission triage / clearance / appetite scoring.**
   Intake agents receive submissions, extract risk data, **score against appetite**, deduplicate, and
   route to the right underwriter — so a human never reads an email just to decide it's out of
   appetite. Cuts time-to-quote 30–40% for standard risks and lets underwriters spend attention on the
   risks that deserve it.
   ([Ema](https://www.ema.ai/additional-blogs/addition-blogs/ai-insurance-underwriting-transforming-workflows),
   [vdf.ai / reinsurance agents](https://vdf.ai/blog/ai-agents-reinsurance-document-analysis/))
   *Catch:* "route/deprioritize" is a soft decision; "decline" is a hard one — keep the model on the
   soft side of that line.

3. **Bordereaux ingestion & reconciliation.**
   Cedent bordereaux arrive in inconsistent formats; LLMs normalize them and reconcile against policy
   conditions and standardized templates — a classic messy-data-to-clean-data job with an auditable
   diff. ([vdf.ai](https://vdf.ai/blog/ai-agents-reinsurance-document-analysis/))

4. **Underwriter / broker copilots (retrieval over your own corpus).**
   RAG over treaty wordings, prior submissions, guidelines and clause libraries: "what does our
   follow-the-settlements language usually say for this cedent," "summarize this 80-page slip,"
   "find comparable risks we've written." Drafting of pricing narratives and coverage-exception
   summaries with **traceable rationale chains**.
   ([arXiv 2511.08082, Prudential Reliability of LLMs in Reinsurance](https://arxiv.org/html/2511.08082v1))

5. **Claims triage & loss-narrative classification.**
   LLMs classify loss narratives, extract triggers, and reconcile cessions — routing and
   summarization, not payout decisions. ([arXiv 2511.08082](https://arxiv.org/html/2511.08082v1))

6. **Internal knowledge search / ops copilots.** Generic but real: search across solvency filings,
   guidelines, past decisions — lowers "search, reconciliation and explanation costs," which the
   governance paper frames as reduced information friction.

### Moonshots (the ROI-free R&D / lab strand — bigger bets, softer near-term ROI)

7. **Generative catastrophe modeling / synthetic event sets.**
   The frontier in cat modeling is using generative models to synthesize physically-plausible extreme
   events where **history is too thin to fit** — severe convective storms (hail/tornado/thunderstorm),
   compound wind-and-rain, tail events. Verisk now models extreme wind and rain jointly with
   generative AI; Moody's RMS uses AI on satellite/aerial imagery to estimate post-event damage (used
   after the 2025 LA wildfires). This is genuinely valuable *and* genuinely dangerous: models can
   produce events that look plausible but violate physics — hallucination with a balance-sheet.
   ([Insurance Journal](https://www.insurancejournal.com/news/national/2025/03/26/817293.htm),
   [The Decoder](https://the-decoder.com/insurers-turn-to-generative-ai-for-catastrophe-modeling-but-hallucinations-and-sales-logic-could-get-in-the-way/),
   [Moody's, AI-powered cat modeling](https://www.moodys.com/web/en/us/insights/insurance/catastrophe-modeling-for-a-resilient-future-powered-by-ai.html))

8. **ML pricing / risk signals with hard risk constraints.**
   Beyond GLMs: RL and ML price signals — but the credible research line is *constrained,
   interpretable* ML. ClauseLens (arXiv 2510.08429) pairs clause-grounding with a **CVaR constraint**
   (bound worst-case tail loss) so an RL pricer respects Solvency II / EU AI Act auditability instead
   of optimizing an opaque objective. The moonshot isn't "let AI price treaties," it's "learned price
   signals a regulator and an actuary will sign off on." ([arXiv 2510.08429](https://arxiv.org/pdf/2510.08429))

9. **Portfolio analytics & accumulation copilots.** Natural-language interrogation of the whole book
   — accumulation, correlation, "what if this peril doubles" — layered on the analytics that already
   exist. Solvency-narrative generation (explaining risk movements) is an emerging reporting use.
   ([arXiv 2511.08082](https://arxiv.org/html/2511.08082v1))

10. **Agentic end-to-end workflows.** A stack of specialized agents (intake → triage → analysis →
    draft) rather than one chatbot. This is where the CTO's "imagine a $20bn Arch Re" lands — but it's
    a *destination*, gated on every one of the tradeoffs in §3 being solved for each hop.

### The quick-win vs moonshot table

| Application | Lane | Blast radius if wrong | ROI clarity |
|---|---|---|---|
| Slip/treaty extraction | Quick win | Low–med (human confirms) | High, measurable |
| Submission triage/appetite | Quick win | Low (soft routing) | High |
| Bordereaux reconciliation | Quick win | Low | High |
| Underwriter/claims copilots (RAG) | Quick win | Low (advisory) | Medium |
| Claims triage | Quick win | Medium | Medium |
| Generative cat / synthetic events | Moonshot | **High** (feeds pricing) | Low near-term |
| Constrained ML pricing (ClauseLens-style) | Moonshot | **High** | Low near-term |
| Portfolio NL analytics | Moonshot | Medium | Medium |
| Agentic end-to-end | Moonshot | High | Low |

---

## 3. The tradeoffs a senior must own (this is where the interview is won)

The best single primary source here is arXiv 2511.08082, which built a reinsurance-specific benchmark
(RAIRAB) and measured what governance buys you. Lead with its numbers — they turn hand-waving into
engineering.

- **Evaluation & accuracy — you can't ship what you can't measure.** The paper reports, across six LLM
  families, that a **zero-shot LLM grounded at 0.63 accuracy with a 21.4% hallucination rate**, while
  **RAG + structured logging + human-in-the-loop reached 0.91 grounding / 12.8% hallucination**, and
  nearly doubled a transparency index (0.42 → 0.86). Takeaway you can say out loud: *"reliability is
  engineered through governance design, not an emergent property of a bigger model" — governance
  outweighs scale, and open-weight models matched proprietary ones on compliance once RAG+HITL were
  added.* Build a **domain eval set** (real slips, graded fields) before anything else; measure
  field-level accuracy and hallucination, not vibes. ([arXiv 2511.08082](https://arxiv.org/html/2511.08082v1))

- **Hallucination in a $bn-payout domain.** A fabricated limit, a missed exclusion, or a plausible-
  but-wrong cat event is not a UX bug — it's a mispriced treaty. Mitigations to name: **RAG with
  visible citations** (every claim traces to a source clause), confidence thresholds that escalate to
  a human, output verification against authoritative templates, and *never* letting the model be the
  system of record. For generative cat models, physics/plausibility checks on synthetic events.

- **Human-in-the-loop, deliberately placed.** HITL isn't "a person rubber-stamps everything." It's
  checkpoints at the decisions that carry the risk: confirm low-confidence extractions, approve any
  declination, sign the price. The design question is *where the human sits*, and the answer is keyed
  to blast radius (see the table). Reinsurance's own framing: AI as **decision support**, humans keep
  authority.

- **Data governance & regulation.** Treaty and claims data is sensitive and jurisdictional. The
  credible position: don't invent a new "AI regulation" silo — extend existing **model-risk
  management** (SR 11-7 in the US, **Solvency II Pillar 2** in Europe, and the **EU AI Act** for
  higher-risk uses). That means data lineage/immutable logging, segregation of dev/validation/
  production, independent model validation, and jurisdiction-aware handling. The upside the paper
  quantifies: documented governance cut validation-cycle durations 10–15% and could justify trimming
  conservative capital add-ons — i.e. **governance is an ROI lever, not just a cost.**
  ([arXiv 2511.08082](https://arxiv.org/html/2511.08082v1), [ClauseLens on Solvency II / EU AI Act](https://arxiv.org/pdf/2510.08429))

- **Build vs buy.** Extraction and cat-model vendors (Moody's RMS, Verisk, plus a crowd of
  slip/treaty-extraction startups) are mature — **buy the commodity, build the differentiator.** The
  differentiator is your proprietary corpus, appetite models, and the RAG/eval/governance plumbing
  around a bought foundation model. Don't fork a document-extraction stack; do own the layer that
  encodes *Arch's* judgment. (This mirrors the repo's own remote-vs-vendor-vs-fork instinct — good
  language to borrow if it comes up.)

- **RAG vs fine-tune.** Default to **RAG**: reinsurance facts change (wordings, appetite, regulation),
  RAG gives citations and auditability for free, and it's cheaper to keep current. Fine-tune only for
  *form/format* (house style, structured-output reliability, a narrow classifier), not for *facts* —
  a fine-tuned model that "knows" a clause can't cite it and goes stale silently. The benchmark's
  best config is RAG-based, not fine-tuned, which is the empirical backing for this stance.

- **Cost & latency.** Submission triage at intake volume is a throughput problem — batch, cache,
  route cheap models for easy fields and reserve frontier models for hard reasoning; latency matters
  for a live broker copilot, less for overnight bordereaux runs. Cost per submission is a real KPI:
  the ROI case is (analyst-minutes saved × volume) − (inference + governance cost), and you should be
  able to sketch that arithmetic.

- **Drift & operational resilience.** Interpretive drift (same input, different output across runs)
  is a reinsurance-specific hazard the paper measures and reduces via governance; you need
  monitoring, fallbacks, and rollback, because a model that quietly changes its reading of "follow the
  settlements" is a slow-moving loss.

---

## 4. The shape of the argument: two strands, honestly framed

The brief runs two parallel strands — modernization quick wins **and** an ROI-free R&D/lab. Don't
treat them as a contradiction; treat them as a **portfolio with different success criteria**, and say
so explicitly:

- **Quick wins are judged by ROI and are governed tightly.** Bounded scope, measurable minutes saved,
  a human on the hook for the decision, buy-the-commodity. Ship extraction and triage, instrument them,
  prove value at scale (the thing 93% of the market hasn't done). This is where you earn trust and
  budget.

- **The lab is judged by learning, not ROI — and that's the point.** "ROI-free" doesn't mean
  "ungoverned" or "unmeasured"; it means the success metric is *de-risked knowledge* — does generative
  cat modeling hold up against physics, can a constrained RL pricer satisfy an actuary, what breaks at
  the $20bn scale. Frame R&D honestly: **most bets won't ship, the portfolio is the return, and the
  lab's job is to convert frontier uncertainty into either a fundable quick win or a documented "not
  yet."** The intellectual honesty move — and the one a Microsoft-plus-scale-ups CTO will respect — is
  refusing to fake a spurious ROI number on a research bet, while still holding it to a real learning
  goal and a real governance floor (nothing touches a live treaty without the §3 controls).

- **The bridge between the strands is the platform.** Eval harnesses, RAG plumbing, data lineage, and
  human-in-the-loop tooling built for the quick wins are exactly what the moonshots need to graduate.
  The senior-engineer contribution isn't picking the flashiest use case — it's building the **governed
  substrate** that lets a lab experiment become a production feature without a rewrite. That's the
  answer that shows you think like an owner of a $bn-payout system, not a demo-builder.

**If asked "where would you start?"** — submission/treaty extraction with human-confirmed low-
confidence fields and a real eval set, because it's the highest-certainty ROI, it builds the data and
governance muscle everything else depends on, and it's precisely what Arch already says it's doing —
so you're accelerating a live strategy, not proposing a science project.

---

## Sources (primary / authoritative first)

- [arXiv 2511.08082 — Prudential Reliability of LLMs in Reinsurance: Governance, Assurance, Capital Efficiency](https://arxiv.org/html/2511.08082v1) — reinsurance-specific benchmark (RAIRAB), the accuracy/hallucination/governance numbers, five-pillar framework, Solvency II / SR 11-7 framing. **The single best source.**
- [arXiv 2510.08429 — ClauseLens: Clause-Grounded, CVaR-Constrained RL for Trustworthy Reinsurance Pricing](https://arxiv.org/pdf/2510.08429) — constrained interpretable pricing; Solvency II / EU AI Act auditability.
- [Lloyd's Market Association — 2026 AI adoption survey](https://lmalloyds.com/ai-adoption-more-than-doubles-across-the-lloyds-market-in-12-months-with-93-of-survey-respondents-building-governance-frameworks/) and [Reinsurance News coverage](https://www.reinsurancene.ws/ai-adoption-governance-accelerate-across-lloyds-market-lma/) — market-wide adoption/governance figures.
- [Intelligent Insurer — Arch Capital president Maamoun Rajeh on AI](https://www.intelligentinsurer.com/impact-of-ai-will-be-as-big-as-fire-or-electricity-on-humanity-says-arch-capital-president) — Arch's own posture (paywalled beyond the headline quote).
- [Insurance Journal — Catastrophe experts tap AI](https://www.insurancejournal.com/news/national/2025/03/26/817293.htm), [The Decoder — genAI cat modeling + hallucination risk](https://the-decoder.com/insurers-turn-to-generative-ai-for-catastrophe-modeling-but-hallucinations-and-sales-logic-could-get-in-the-way/), [Moody's — AI-powered cat modeling](https://www.moodys.com/web/en/us/insights/insurance/catastrophe-modeling-for-a-resilient-future-powered-by-ai.html) — cat-model frontier (Verisk/Moody's RMS).
- [Nomad Data — automated treaty review](https://www.nomad-data.com/doc-chat/automated-treaty-review-using-ai-to-analyze-facultative-and-treaty-reinsurance-contracts-in-minutes-reinsurance-analyst-f00c1), [LandingAI — reinsurance document extraction](https://landing.ai/developers/reinsurance-document-extraction-re-ink), [V7 — London-market slip automation](https://www.v7labs.com/blog/london-market-insurance-slip-automation), [vdf.ai — reinsurance document agents](https://vdf.ai/blog/ai-agents-reinsurance-document-analysis/) — extraction/triage use-case detail (vendor material — treat specifics as directional).
- [Data-Pilot — P&C underwriting AI automation](https://data-pilot.com/blog/pc-underwriting-ai-automation/), [Ema — AI underwriting workflows](https://www.ema.ai/additional-blogs/addition-blogs/ai-insurance-underwriting-transforming-workflows) — adoption-at-scale and time-to-quote figures (vendor/secondary).

*Note on trust: the two arXiv papers, the LMA survey, and the cat-model vendors' own material are the
high-trust core. The extraction-vendor blogs are directionally useful for the shape of use cases but
are marketing — cited for texture, not as neutral evidence.*
