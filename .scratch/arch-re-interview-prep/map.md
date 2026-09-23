<!-- wayfinder:map -->

# Arch Re interview prep: close the gaps the brief exposes, in a week

## Destination

**Conversational fluency** — able to discuss tradeoffs, whiteboard a design, and hold a
credible senior conversation — on every gap the Arch Re brief exposes that the vault does
not already cover, delivered as **new vault notes** (Lessons / cheat-sheets authored via
`/author`, validated and graph-linked the house way) and **sequenced into a one-week prep
Plan** in `content/plans/`.

Not implementation-readiness, not a crib doc, not an external link list: notes in the vault,
at fluency depth, ordered for the interview. The interview is **assumed to be the mission's
four-stage loop** (coding screen, two coding rounds, a system-design round, behavioural folded
in) — Arch Re's actual format is not confirmed and the Plan orders around the mission's loop.

**This effort carries into EXECUTION** (per "Plan, don't do": overridden here). The authoring
tickets write real notes, not specs; charting itself resolves nothing.

## Notes

- **Domain**: the vault (`content/`) is a C#/.NET + DSA + generic-distributed-systems +
  behavioural corpus targeting a generic senior loop (see `content/MISSION.md`, `CLAUDE.md`).
  The Arch Re brief adds a specific Azure event-driven stack, an auth surface, a reinsurance
  domain, and a loud AI/ML mandate — verified absent from the vault by grep while charting.
- **The gap inventory** (this map's origin, one place, not restated per ticket):
  - _Tier 1 — named, zero coverage, high odds_: **event sourcing + CQRS**, **Cosmos DB**,
    **Azure Service Bus / event-driven messaging**, **AI/ML applications**.
  - _Tier 2 — named, zero coverage, moderate odds_: **OAuth / OIDC / JWT**,
    **reinsurance domain**, **monolith → microservices modernization**.
  - _Tier 3 — CUT for the week_: WPF, React/TypeScript deep, Snowflake deep (see Out of scope).
  - _Already covered, don't re-prep_: C# internals, async, DSA, SQL Server, CAP/PACELC/
    consensus/consistency, resilience, observability, STAR/levels.
- **Output contract**: new notes go in via **`/author`** (the only place ULIDs are minted),
  filed by **type = directory**, attached to topics/plans decided in ticket 01. Checks are
  the FORMAT docs + `npm run validate`.
- **Depth bar is fluency**: each note is "enough to narrate the tradeoff in a design round and
  answer two follow-ups", not a reference implementation.
- **Skills**: per decision ticket, call `grilling` + `domain-modeling`; `research` (AFK) for
  the two facts-gathering tickets. Authoring tickets run `/author`.

## Decisions so far

<!-- one line per closed ticket; the detail lives in the ticket, this only gists + links -->

- [Author: the one-week Arch Re prep Plan](issues/11-the-week-prep-plan.md): **Destination
  reached.** Authored [[arch-re-one-week-prep]] — "A one-week reading order for the Arch Re
  interview" — a Plan sequencing the seven new gap notes (04–10) with the existing strengths into
  **seven day-sittings** shaped around the mission's four-stage loop: (1) domain + frame — the
  [[reinsurance-domain-primer]] read *before* any technology, then the senior/process lenses; (2) a
  CAP/PACELC/consistency **refresh** re-read as what the Azure notes spend; (3) the Azure data +
  messaging layer (choosing-a-datastore → Cosmos → message-queues → Service Bus); (4) event sourcing
  + modernization; (5) auth + API design; (6) the AI POV framed as an *architecture* answer; (7)
  behavioural + a timed mock (*design an event-sourced treaty-booking service on Azure*). House
  format kept — sequence disclaimed, order table with a **Scope** column, a ".NET-and-Azure-specific
  half" with AWS/GCP/JVM equivalents, look-ups and a night-before list; the two coding rounds
  explicitly *not* re-taught (pointed at [[reading-order-for-the-coding-round]]). Not `featured`.
  `topic:` claims all nine threaded topics. `validate` clean, 196 notes. **Every ticket on this map
  is now closed.**

- [Author: reinsurance domain primer](issues/10-note-reinsurance-domain.md): Minted the new
  **top-level Term** `reinsurance` + the **Reference** [[reinsurance-domain-primer]] (ticket 03's
  research distilled to lookup shape — a Reference, not a Lesson, because the domain is
  lookup-shaped vocabulary). The fluency layer for "talk credibly to the business": the two
  independent contract axes (**treaty/fac** × **proportional (quota share, surplus) /
  non-proportional (XoL, cat XoL, stop-loss)**, "limit xs retention", RoL + reinstatements); the
  **ACORD**-messaged placement lifecycle a system moves; experience-vs-exposure pricing; the
  **vendor cat-model** concept (four modules → EP curve/PML/AAL) and why model choice is the edge;
  cyber as the non-geographic, data-heavy line; and Arch's four named lines placed on the axes.
  Added a Reinsurance-domain section to `RESOURCES.md`. `validate` clean — and this **clears the
  dangling `[[reinsurance]]` warning** ticket 04 left. Closes the last standalone Tier-2 gap; with
  09 also done, **all authoring is complete and only the Plan (11) remains**.

- [Author: AI-in-reinsurance note](issues/09-note-ai-in-reinsurance.md): Minted the top-level Term
  `applied-ai` + the Lesson [[applied-ai-in-reinsurance]] + its cheat sheet (3 files, cheat sheet by
  the effort's precedent) + a `RESOURCES.md` subsection. The brief's headline theme, as a defensible
  POV not a buzzword list: lead sentence **"AI moves the paperwork and retrieval, humans keep the
  judgment"** (support, not automation; the market's gap is *governed production*); **sort every idea
  quick-win vs moonshot** by blast radius + ROI (extraction/triage/RAG copilots vs generative cat
  modelling / constrained pricing / agents); own the tradeoffs — **eval-first**, RAG-with-citations +
  confidence-gated **HITL**, **governance not scale** (RAIRAB ~21%→~13% hallucination), build-vs-buy,
  RAG-vs-fine-tune; two strands as a **portfolio bridged by a governed platform**. Reuses the vault's
  Service Bus / event-sourcing / consistency vocabulary rather than re-teaching. `validate` clean (195
  notes, no violations). **Closes the last of the four Tier-1 gaps** — all Tier-1 and Tier-2 authoring
  is now done; only the domain note (10) and the Plan (11) remain.

- [Author: monolith → microservices modernization](issues/08-note-monolith-modernization.md):
  Wrote the Lesson [[monolith-to-microservices-modernization]] (`system-design`, no new Term — the
  attachment 01 decided) + a cheat-sheet block + a `RESOURCES.md` subsection. The migration story
  the vault lacked: **strangler fig** (a routing facade sends each capability's traffic to a new
  service, small/shippable/reversible, the monolith shrinks) over the **big-bang rewrite** (a moving
  target, value only at one risky cutover); cut along **bounded contexts**, decouple the **shared
  database** (each service owns its data), an **anti-corruption layer** during coexistence; sequence
  by **business value** and *measure* the move. The honest exit — the distributed-systems tax of the
  [[the-eight-fallacies-of-distributed-computing|eight fallacies]] + lost strong consistency, so a
  **modular monolith** is a valid destination (Fowler's MonolithFirst). `validate` clean. Closes the
  last standalone Tier-2 gap.

- [Author: OAuth / OIDC / JWT note(s)](issues/07-note-oauth-oidc-jwt.md): Minted the new **top-level
  Term** `authentication-and-authorization` + the Lesson [[oauth-oidc-and-jwt]] + its cheat sheet
  (three files, not the ticket's stated two — cheat sheet by the effort's own precedent). Fluency
  layer for the "how do the services authenticate?" follow-up: **OAuth = authorization vs OIDC =
  authentication** + the four roles; **authorization code + PKCE** (user) and **client credentials**
  (service-to-service, the reinsurance-backend case) grants; **JWT** structure/validation/rotation
  and access-vs-refresh-vs-ID; and the **Entra ID** picture — stateless local validation, `aud`
  rejection, on-behalf-of. Added an auth section to `RESOURCES.md`. `validate` clean. Closes a Tier-2 gap.

- [Author: event sourcing + CQRS note(s)](issues/04-note-event-sourcing-cqrs.md): Wrote the Lesson
  [[event-sourcing-and-cqrs]] (`system-design`, `distributed-systems`; prereqs `transactions-and-acid`,
  `consistency-models`) + a system-design cheat-sheet block. **Event sourcing** = append-only immutable
  event stream as source of truth, state by **replay/rehydration**, **materialized views** for queries,
  **snapshots** as optimization; **CQRS** = split write model (commands) from read model (queries),
  single- vs separate-store; the pair lets you **replay history to rebuild any view**. The bill:
  eventual consistency ([[consistency-models]]/[[pacelc]]), no ad-hoc querying, immutable-history
  versioning (compensating events, upcasters), idempotent at-least-once handlers. Framed as a
  **per-sub-domain** call — reach for it where history *is* the requirement (a reinsurance
  treaty-booking ledger), CRUD elsewhere. Reuses [[azure-service-bus-and-event-driven-soa]]'s
  outbox/idempotency rather than re-teaching. Closes a third of the four Tier-1 gaps (the AI note,
  09, is the last one open). `validate` clean (1 expected `[[reinsurance]]` warning).

- [Author: Azure Service Bus + event-driven messaging](issues/06-note-service-bus-messaging.md):
  Wrote the Lesson [[azure-service-bus-and-event-driven-soa]] (`system-design`,
  `distributed-systems`) + a cheat-sheet block. Links, rather than re-teaches, the generic queue
  theory in `message-queues`; adds the Azure-concrete layer — broker-vs-log (Service Bus vs Event
  Hubs), queue vs topic/subscription, peek-lock/DLQ/sessions/dedup — and the integration patterns a
  senior narrates: the **dual-write problem + transactional outbox**, **saga**
  (choreography vs orchestration), command vs event, and the async-vs-REST trade. `validate` clean.

- [Author: Cosmos DB note(s)](issues/05-note-cosmos-db.md): Minted the **`nosql-databases` Term**
  (under `databases`) plus a fluency Lesson [[azure-cosmos-db]] and its cheat sheet — Cosmos framed
  as the worked example that makes three distributed-systems trade-offs explicit knobs: partition-key
  design (20 GB logical / 50 GB + 10k RU/s physical, hot partitions, immutable, synthetic/hierarchical
  keys), Request Units (~1 RU/1 KB point read, 429 on overflow, provisioned/autoscale/serverless), the
  five consistency levels wired onto [[consistency-models]]/[[pacelc]] (strong = 2× read RU), cross-
  vs single-partition query fan-out, embed-for-read vs 3NF, and the Cosmos-vs-SQL tradeoff with the
  fits-on-one-machine tiebreaker. Validates clean. Closes one of the four Tier-1 gaps.

- [Research: reinsurance domain primer](issues/03-research-reinsurance-domain.md): Primer
  gathered from high-trust sources (Triple-I, Munich/Swiss Re, Guy Carpenter, CAS/SOA, Moody's
  RMS, ACORD, Arch Re's own pages) — business rationale + broker model; the two contract axes
  (**treaty/facultative**, **proportional (quota share, surplus)** vs **non-proportional (XoL,
  cat XoL, stop-loss)**); the ACORD-messaged placement lifecycle; actuarial pricing (experience
  vs exposure rating); vendor cat models (EP/PML/AAL outputs); cyber as the data-heavy line; and
  Arch Re's four named lines mapped onto the vocabulary. Unblocks the domain note (ticket 10).
  Full doc: [reinsurance-domain-primer.md](research/reinsurance-domain-primer.md).
- [Research: AI/ML applications in reinsurance](issues/02-research-ai-in-reinsurance.md): The
  honest current picture is **"AI moves the paperwork and retrieval, humans keep the judgment"** —
  quick wins are governed extraction / submission triage / copilot work; the moonshots are
  cat-model generation and constrained ML pricing. Tradeoffs anchor on a 2025 reinsurance-specific
  benchmark showing **RAG + logging + human-in-the-loop cuts hallucination ~21%→~13%** (reliability
  is engineered through governance, not model scale). Strong sources: two 2025-26 arXiv papers on
  reinsurance (2511.08082, ClauseLens 2510.08429) + the LMA's 2026 adoption survey; vendor blogs
  flagged as marketing. Unblocks the AI note (ticket 09). Full doc:
  [ai-in-reinsurance.md](research/ai-in-reinsurance.md).
- [Where do the new notes attach?](issues/01-where-new-notes-attach.md): A **topic is a Term**;
  a new topic = a new Term + its content notes. Decided per gap — **4 new Terms** (`nosql-databases`
  under `databases`; `authentication-and-authorization`, `applied-ai`, `reinsurance` top-level),
  **6 Lessons + 1 Reference + 1 Plan**. Event sourcing/Service Bus → `system-design` +
  `distributed-systems` (no Azure topic); Cosmos → new `nosql-databases` + `distributed-systems`;
  OAuth → new `authentication-and-authorization`; modernization → `system-design`; AI → new
  `applied-ai` (Lesson); reinsurance → new `reinsurance` (**Reference**, not Lesson). Each new-topic
  ticket mints its Term alongside its note (05/07/09/10); Plan carries all touched topics, not
  `featured`. Unblocks 04–11.

## Not yet specified

<!-- The destination (new gap notes authored + sequenced into a one-week Plan) is REACHED: every
     ticket is closed. What stays below is optional work BEYOND the destination line — each a fresh
     effort if pursued, not a next ticket on this route. -->

- **A behavioural angle for the Arch Re narrative** — the "why leave a conventional path for a
  reinsurer's tech transformation / R&D-lab mandate" story, and how to talk about modernization
  and AI as motivation. Sharpens once the domain (10) and AI (09) notes give it substance; may
  graduate into a note or fold into the existing STAR material.
- **A practice/mock pass** — once the notes exist, a self-quiz or mock system-design run over
  the new material (e.g. "design an event-sourced treaty-booking service on Azure"). Graduates
  after the authoring tickets close.
- **Arch-Re-flavoured coding/design problems** — whether to add a Problem or two in the new
  idiom (Cosmos partition modelling, an event-sourced aggregate). Undecided until 04–06 land.

## Out of scope

<!-- ruled beyond the destination; per the user's scope cuts -->

- **WPF** — legacy/desktop; dropped entirely.
- **React / TypeScript deep** — interviews are in C#; at most boundary-awareness, no frontend prep.
- **Snowflake deep** — at most a one-paragraph OLAP-vs-OLTP mention if it lands free inside
  another note; no dedicated hands-on ticket.
- **Implementation-readiness** — coding against Cosmos/Service Bus or building a working
  event-sourced service; the bar is fluency, not a running system.
