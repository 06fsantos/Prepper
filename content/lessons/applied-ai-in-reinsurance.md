---
id: 01M37ZZQVT7GA9QQ64JWT107G7
title: Applying AI in reinsurance
topic:
  - applied-ai
---

An interview at a reinsurer that talks loudly about AI will, somewhere, ask the open question:
*"where would you apply AI here?"* It is a trap for the buzzword answer and a gift for the
structured one. The winning move is not a feature list; it is a **point of view** — a defensible
sorting of what is worth doing, what it costs, and where a machine must not be trusted. This
Lesson gives you that frame for a [[reinsurance]] backend: the one-sentence orientation, a
quick-win-versus-moonshot map of concrete applications, the tradeoffs a senior owns in a
$bn-payout domain, and the honest way to hold a "modernization **and** an ROI-free R&D lab" story
together. The bar is a credible senior conversation, not a system you could ship.

## The one sentence to lead with

Reinsurance is a **document-and-judgment business at extreme stakes**: unstructured broker
submissions and treaty slips come in, a small number of highly-paid underwriters price and
structure risk against models and appetite, and a single wrong tail decision can cost hundreds of
millions. So the honest AI story is one sentence: **AI moves the paperwork and the retrieval;
humans keep the judgment.** The value is in intake, extraction, triage, summarization and search —
**decision *support*, not decision *automation*** — and that framing is exactly what the market
data shows. Lloyd's Market Association's 2026 survey found AI adoption more than doubled in a year
and 93% of firms are building formal governance, yet deployment stays "largely focused on
operational efficiency rather than frontline underwriting or claims decision-making"
([LMA](https://lmalloyds.com/ai-adoption-more-than-doubles-across-the-lloyds-market-in-12-months-with-93-of-survey-respondents-building-governance-frameworks/)).
Lead by naming that reality: the win is not a clever model, it is being the shop that gets a
**governed** one into production — the thing roughly only 7% of insurers have done at scale.

## Sort every idea: quick win or moonshot

The single most useful thing you can do out loud is **sort** applications by blast radius and ROI
clarity, because that sorting *is* the seniority signal. Two lanes.

**Quick wins — bounded, measurable, low blast radius** (the modernization strand):

- **Submission & treaty-slip extraction** — the flagship. LLMs read broker emails, slips and loss
  runs and pull structured fields (limits, attachments, reinstatements, exclusions, governing
  law). Work that took an underwriter 20–30 minutes drops to seconds; it is the single most-cited
  reinsurance use case, and the one Arch already names publicly. *Catch:* extraction errors
  propagate silently into pricing, so low-confidence fields need human confirmation.
- **Submission triage / appetite scoring** — score an incoming risk against appetite, deduplicate,
  route to the right underwriter, so nobody reads an email just to decide it is out of appetite.
  Keep the model on the *soft* side of the decision: "deprioritize" is fine, "decline" is a hard
  call a human owns.
- **Bordereaux ingestion & reconciliation** — normalize cedent bordereaux arriving in inconsistent
  formats and reconcile against policy conditions, with an auditable diff.
- **Underwriter / broker copilots** — **RAG** over your own treaty wordings, prior submissions and
  clause libraries: "summarize this 80-page slip," "what does our follow-the-settlements language
  usually say for this cedent." Advisory, with traceable rationale.

**Moonshots — bigger bets, softer near-term ROI, high blast radius** (the R&D-lab strand):

- **Generative catastrophe modelling** — synthesize physically-plausible extreme events where
  history is too thin to fit (severe convective storms, compound wind-and-rain, tail events).
  Verisk and Moody's RMS are already here
  ([Insurance Journal](https://www.insurancejournal.com/news/national/2025/03/26/817293.htm)). It
  is valuable *and* dangerous: a synthetic event that looks plausible but violates physics is
  hallucination with a balance-sheet, because it feeds pricing.
- **Constrained ML pricing** — not "let AI price treaties" but *learned price signals a regulator
  and an actuary will sign off on*. The credible research line pairs clause-grounding with a
  worst-case-tail-loss constraint so the model stays auditable
  ([ClauseLens, arXiv 2510.08429](https://arxiv.org/pdf/2510.08429)).
- **Agentic end-to-end workflows** — a stack of specialized agents (intake → triage → analysis →
  draft), a *destination* gated on every tradeoff below being solved for each hop.

The mental table — the thing to be able to sketch:

| Application                       | Lane      | Blast radius if wrong | ROI clarity |
| --------------------------------- | --------- | --------------------- | ----------- |
| Slip / treaty extraction          | Quick win | Low–med (human confirms) | High     |
| Submission triage / appetite      | Quick win | Low (soft routing)    | High        |
| Bordereaux reconciliation         | Quick win | Low                   | High        |
| Underwriter / claims copilots (RAG) | Quick win | Low (advisory)      | Medium      |
| Generative cat / synthetic events | Moonshot  | **High** (feeds pricing) | Low near-term |
| Constrained ML pricing            | Moonshot  | **High**              | Low near-term |
| Agentic end-to-end                | Moonshot  | High                  | Low         |

```quiz 01M37ZZQVTA515VZ1N8YNJJ9WN
An interviewer asks where you'd start applying AI at a reinsurer. Which answer best shows senior
judgment?

- [x] Submission and treaty-slip extraction with human-confirmed low-confidence fields and a real eval set — highest-certainty ROI, and it builds the data and governance muscle everything else needs
  > It is the highest-certainty win, it is bounded with a human owning the risky decision, it
    builds the eval and governance substrate the moonshots depend on, and it accelerates a strategy
    the firm already has rather than proposing a science project.
- [ ] Generative catastrophe modelling, since synthesizing tail events is the highest-value use of AI for a reinsurer's balance sheet
  > High value, but the highest *blast radius* — a physically-implausible synthetic event feeds
    pricing directly. It is a moonshot to earn toward, not the place a governed programme starts.
- [ ] An autonomous underwriting agent that prices and binds standard treaties end-to-end to remove the manual bottleneck
  > This automates the judgment the whole domain says to keep human. Binding a treaty is a hard
    decision at extreme stakes; it is exactly the line to stay on the support side of.
- [ ] A fine-tuned model that memorizes the firm's clause library so it can answer wording questions without external retrieval
  > Facts that change (wordings, appetite) belong in retrieval, not weights — a fine-tuned clause
    model can't cite its source and goes stale silently. Wrong tool before any sorting is even done.
```

## The tradeoffs a senior must own

This is where the interview is actually won, because it is where you stop describing features and
start reasoning about a system at stakes. The strongest single anchor is a 2025 reinsurance-specific
benchmark ([arXiv 2511.08082](https://arxiv.org/html/2511.08082v1)) — lead with its numbers, they
turn hand-waving into engineering.

- **Evaluation first — you cannot ship what you cannot measure.** In that benchmark a zero-shot LLM
  grounded at 0.63 accuracy with a **21.4% hallucination rate**, while **RAG + structured logging +
  human-in-the-loop reached 0.91 grounding and 12.8% hallucination**. The line to say out loud:
  *reliability is engineered through governance design, not an emergent property of a bigger model.*
  Build a domain **eval set** — real slips, graded fields — before anything else, and measure
  field-level accuracy and hallucination, not vibes.
- **Hallucination has a balance-sheet cost.** A fabricated limit or a missed exclusion is a
  mispriced treaty, not a UX bug. Mitigations to name: **RAG with visible citations** (every claim
  traces to a source clause), confidence thresholds that escalate to a human, output verification
  against authoritative templates, and never letting the model be the **system of record**.
- **Human-in-the-loop, deliberately placed.** Not "a person rubber-stamps everything" — checkpoints
  at the decisions that carry the risk: confirm low-confidence extractions, approve any declination,
  sign the price. The design question is *where the human sits*, keyed to blast radius.
- **Data governance is an ROI lever, not just a cost.** Don't invent a new "AI regulation" silo;
  extend existing **model-risk management** (SR 11-7, Solvency II Pillar 2, the EU AI Act for
  higher-risk uses) — data lineage, immutable logging, segregated dev/validation/production,
  independent validation. The benchmark found documented governance cut validation-cycle durations
  10–15% and could justify trimming conservative capital add-ons.
- **Build vs buy — buy the commodity, build the differentiator.** Extraction and cat-model vendors
  (Moody's RMS, Verisk, slip-extraction startups) are mature; buy them. The differentiator is your
  proprietary corpus, appetite models, and the RAG/eval/governance plumbing around a bought
  foundation model. (This is the same remote-vs-vendor-vs-fork instinct good platforms apply to any
  dependency — own the layer that encodes *your* judgment, not the commodity underneath it.)
- **RAG vs fine-tune — default to RAG.** Reinsurance facts change (wordings, appetite, regulation);
  RAG gives citations and auditability for free and is cheaper to keep current. Fine-tune only for
  *form* (house style, structured-output reliability, a narrow classifier), never for *facts* — a
  fine-tuned model that "knows" a clause can't cite it and goes stale silently.
- **Cost & latency are real KPIs.** Intake triage is a throughput problem — batch, cache, route
  cheap models for easy fields and reserve frontier models for hard reasoning. Latency matters for a
  live broker copilot, far less for an overnight bordereaux run. Be able to sketch the arithmetic:
  (analyst-minutes saved × volume) − (inference + governance cost).

Underneath all of it sits distributed-systems reality you already have vocabulary for: an
extraction pipeline is an event-driven flow with the same **at-least-once, idempotent-handler,
eventual-consistency** shape as [[azure-service-bus-and-event-driven-soa|any messaging backbone]],
and the immutable **audit log** governance demands is the [[event-sourcing-and-cqrs|append-only
event stream]] pattern by another name — [[consistency-models|consistency]] is a knob here too.

```quiz 01M37ZZQVTGKRRB5XVP9N62WJZ cloze
The benchmark's headline is that a zero-shot model hallucinated ~21% of the time, but adding
{{RAG}}, structured logging and a {{human-in-the-loop}} pushed grounding to ~0.91 — so reliability
is engineered through {{governance}}, not bought with a bigger model. That's also why you default
to {{RAG}} over fine-tuning for facts: it can {{cite}} its source and stays current as wordings
change.
```

## Two strands, one honest frame

The brief runs two parallel strands — modernization quick wins **and** an ROI-free R&D lab — and
the trap is treating them as a contradiction. Treat them as a **portfolio with different success
criteria**, and say so:

- **Quick wins are judged by ROI and governed tightly.** Bounded scope, measurable minutes saved, a
  human on the hook, buy-the-commodity. Ship extraction and triage, instrument them, prove value at
  scale — the thing most of the market hasn't done. This is where you earn trust and budget.
- **The lab is judged by learning, not ROI — and that's the point.** "ROI-free" does not mean
  ungoverned or unmeasured; the success metric is *de-risked knowledge* — does generative cat
  modelling hold up against physics, can a constrained pricer satisfy an actuary. Most bets won't
  ship; **the portfolio is the return**. The honest move is refusing to fake a spurious ROI number
  on a research bet while still holding it to a real learning goal and the same governance floor.
- **The bridge between them is the platform.** The eval harnesses, RAG plumbing, data lineage and
  human-in-the-loop tooling built for the quick wins are exactly what the moonshots need to
  graduate. The senior contribution isn't picking the flashiest use case — it's building the
  **governed substrate** that lets a lab experiment become a production feature without a rewrite.
  That is the answer that shows you think like an owner of a $bn-payout system, not a demo-builder,
  and it is the natural place to connect the [[behavioral-interviews|"why this move" motivation
  story]] to real engineering.

```quiz 01M37ZZQVTYX1K0C9JH5K44CHP recall
"We're a reinsurer investing heavily in AI — both modernizing operations and running an R&D lab.
Where would you apply AI, and how would you think about it?" Give the answer you'd say out loud.

> I'd start by naming the reality: reinsurance is a document-and-judgment business at extreme
> stakes, so **AI moves the paperwork and retrieval and humans keep the judgment** — decision
> support, not automation. Adoption has doubled but most of the market still hasn't put a *governed*
> model into production, so that's the real prize.
>
> Then I'd **sort** the ideas. Quick wins first, because they're bounded and measurable:
> **submission and treaty-slip extraction** (20–30 minutes to seconds, with humans confirming
> low-confidence fields), **triage against appetite**, bordereaux reconciliation, and **RAG
> copilots** over our own wordings. Moonshots second, higher blast radius: **generative cat
> modelling** and **constrained, auditable ML pricing** — valuable but they feed pricing, so they're
> things to earn toward, not start with.
>
> On tradeoffs I'd lead with **evaluation** — build a domain eval set of real slips and measure
> field-level accuracy and hallucination, because governance not model size is what drove a
> benchmark from ~21% hallucination to ~13%. Then **RAG with citations** and a **human placed at the
> decisions that carry risk**, governance as an extension of existing model-risk management rather
> than a new silo, **buy the commodity and build the differentiator**, and **RAG over fine-tuning**
> for anything factual.
>
> And I'd frame the two strands as a **portfolio**: quick wins judged by ROI and governed tightly,
> the lab judged by learning — most bets won't ship, that's fine, the honest thing is not faking an
> ROI number on a research bet. The bridge is the **platform** — the eval, RAG and lineage tooling
> the quick wins need is what lets a lab experiment graduate to production without a rewrite. That's
> where a senior engineer actually adds value.
```

## What to take away

Lead with the one sentence: **AI moves the paperwork and retrieval, humans keep the judgment** —
decision support, not automation — and note that the market's real gap is *governed production*, not
ideas. **Sort** every application into quick wins (extraction, triage, bordereaux, RAG copilots —
bounded, measurable, low blast radius) and moonshots (generative cat modelling, constrained pricing,
agents — high value, high blast radius, soft near-term ROI). Own the tradeoffs: **eval set first**,
**RAG with citations** and confidence-gated **human-in-the-loop** for hallucination, governance as
an **extension of model-risk management** and an ROI lever in its own right, **buy the commodity /
build the differentiator**, **RAG over fine-tune** for facts, and cost/latency as real KPIs. Hold
the two strands as a **portfolio** with different success criteria, bridged by a **governed
platform** — the answer that reads as an owner of a $bn-payout system rather than a demo-builder.

Worth reading in full: the reinsurance-specific benchmark
[*Prudential Reliability of LLMs in Reinsurance* (arXiv 2511.08082)](https://arxiv.org/html/2511.08082v1)
for the accuracy/hallucination/governance numbers and the model-risk framing the whole argument
rests on.
