---
id: 01M380GPSK78WKR9F1S00P0FFA
title: A one-week reading order for the Arch Re interview
topic:
  - reinsurance
  - applied-ai
  - nosql-databases
  - authentication-and-authorization
  - system-design
  - distributed-systems
  - databases
  - behavioral-interviews
  - engineering-levels
---

Seven days over the gaps the Arch Re brief opens on top of a vault already built for a generic
senior loop: a **reinsurance** domain, an **Azure** event-driven stack (Cosmos, Service Bus,
event sourcing), an **auth** surface, and a loud **AI/ML** mandate — none of it in the corpus
before this effort, all of it authored for **fluency, not mastery**. The bar for the week is
being able to narrate a trade-off in a design round and answer two follow-ups, not ship a
reference implementation.

This is **one path through the vault's `prerequisites` graph**, written for a week and shaped
around the mission's four-stage loop — a coding screen, two coding rounds, a system-design
round, with behavioural folded in. It asserts no order the graph does not already hold, and
**where a note disagrees with this page, the note wins**. A caveat worth stating up front: the
interview's actual format is **assumed to be the mission's loop** — Arch Re's real stages are
not confirmed — so this orders the week around that loop and not around a schedule anyone has
seen.

Two things to notice before starting. **The domain comes first and is read before any of the
technology** — [[reinsurance-domain-primer]] — because every Azure design answer and the whole
AI conversation land in *its* vocabulary: a design for "a treaty-booking ledger" is a blank
prompt until you know what a treaty is. **And the distributed-systems theory is a refresh, not
new** — CAP, PACELC and consistency models are already in the vault and already known; they sit
in this order because the Azure notes reach straight back into them (Cosmos *is* the consistency
dial made into a knob), so they are re-read the day before the stack that spends them, not
skipped as "already covered".

What this week deliberately does **not** re-teach is the two **coding rounds**. Those ride on the
vault's existing coding path and nothing in the Arch Re brief changes them — so the DSA and C#
work is a pointer, not a step: [[reading-order-for-the-coding-round]], kept warm on its own
schedule. This plan is the *other three* stages of the loop.

## The order

Grouped into seven sittings. The **Scope** column marks what is tied to a runtime or a cloud
(`Azure`/`.NET`), what is the field's regardless of stack (`Concept`), and what is business
vocabulary (`Domain`).

| #  | Read | Scope | Why here |
|----|------|-------|----------|
| **Day 1 — the domain and the frame** ||||
| 1  | [[reinsurance-domain-primer]] | Domain | Read first, before a line of technology. The two contract axes (treaty/fac × proportional/non-proportional), the ACORD-messaged placement lifecycle, cat models and their EP/PML outputs, and Arch's own lines — this is the vocabulary every design and AI answer below is spoken in. A senior who can say "the treaty-booking ledger" credibly has already won half the room |
| 2  | [[what-senior-means-as-a-level]] | Concept | The master lens the whole loop is graded against: scope, autonomy, ownership of ambiguity — not the diagram. Read before anything about design, because the design and behavioural rounds are both scored on it |
| 3  | [[system-design-is-graded-on-process]] | Concept | How the design round is actually marked: decompose the vague prompt, pin the requirements, name each trade-off out loud. It prerequisites step 2, and everything applied below hangs off it |
| **Day 2 — the theory the Azure stack rests on (a refresh)** ||||
| 4  | [[the-cap-theorem]] | Concept | The root: under a partition you keep answering *or* keep agreeing, never both. Re-read now because the Cosmos and Service Bus notes are consequences of it — you cannot defend a consistency level you cannot derive |
| 5  | [[pacelc]] | Concept | CAP's blind spot closed: even with a healthy network, a replicated store trades latency for consistency all the time. This is the exact axis Cosmos exposes as a five-level dial in step 9 |
| 6  | [[consistency-models]] | Concept | The spectrum from strong to eventual, and why eventual is a *choice*. Read before the stack because Cosmos's five levels and event sourcing's read-model lag both land on this vocabulary |
| 7  | [[the-eight-fallacies-of-distributed-computing]] | Concept | The false assumptions a single-machine program carries into a network. The lens for the honest exit in step 12 (modernization's distributed-systems tax) and for every "what happens when the broker is down" follow-up |
| **Day 3 — the Azure data and messaging layer** ||||
| 8  | [[choosing-a-datastore]] | Concept | The workload-signal frame — *which* of five data models, read as the signal that picks each rather than "SQL vs NoSQL". The slot Cosmos plugs into, so the choice reads as a decision and not a default |
| 9  | [[azure-cosmos-db]] | Azure | The first named-stack gap: partition-key design, Request Units and 429s, and the five-level consistency dial wired straight onto steps 5–6. Cosmos is the worked example that turns three distributed-systems trade-offs into explicit knobs |
| 10 | [[message-queues]] | Concept | Generic queue-vs-log-vs-pub/sub theory, "effectively once", per-partition ordering, backpressure — the layer Service Bus concretizes. Read immediately before it so the Azure specifics land on a frame that already exists |
| 11 | [[azure-service-bus-and-event-driven-soa]] | Azure | Service Bus over the step-10 theory: queue vs topic/subscription, peek-lock/DLQ/sessions, and the patterns a senior narrates — the dual-write problem and the transactional **outbox**, saga choreography vs orchestration, command vs event |
| **Day 4 — event-driven architecture** ||||
| 12 | [[event-sourcing-and-cqrs]] | Concept | The capstone of the messaging layer: an append-only event stream as source of truth, state by replay, CQRS splitting the write model from read models — and the bill (eventual consistency, no ad-hoc queries, idempotent handlers). Framed per-sub-domain: reach for it where history *is* the requirement, like a treaty-booking ledger, CRUD elsewhere. It reuses step 11's outbox rather than re-teaching it |
| 13 | [[monolith-to-microservices-modernization]] | Concept | The migration story: **strangler fig** over the big-bang rewrite, cutting along bounded contexts, decoupling the shared database, an anti-corruption layer during coexistence. Its honest exit — a modular monolith is a valid destination — leans on the step-7 fallacies. This is the "we're modernizing" narrative the brief invites |
| **Day 5 — the service boundary** ||||
| 14 | [[oauth-oidc-and-jwt]] | Azure | How the services in steps 11–13 authenticate: OAuth (authorization) vs OIDC (authentication), the **client-credentials** grant for service-to-service, JWT structure and stateless validation, and the Entra ID picture. The answer to the "how do these services trust each other" follow-up a distributed design always draws |
| 15 | [[api-design]] | Concept | REST/gRPC/GraphQL, pagination, versioning, and idempotency keys — the same idempotency contract step 12's handlers rest on, now at the synchronous edge. Closes the boundary: how the system is *called*, having settled how its parts *talk* |
| **Day 6 — the AI mandate** ||||
| 16 | [[applied-ai-in-reinsurance]] | Domain | The brief's headline theme, as a defensible POV: "AI moves the paperwork and retrieval, humans keep the judgment." Sort every idea quick-win vs moonshot; own the trade-offs — eval-first, RAG-with-citations, confidence-gated human-in-the-loop, governance not scale. It reuses the Service Bus / event-sourcing / consistency vocabulary from days 3–4 rather than re-teaching it, which is the point: the AI answer is an *architecture* answer |
| **Day 7 — the behavioural thread and rehearsal** ||||
| 17 | [[the-behavioral-round-proves-the-ladder]] | Concept | Behavioural questions are folded into every round, and they prove the same ladder as step 2: leadership, "I" not "we", quantified results. Read last because the stories you tell are now about the systems you spent the week learning to narrate |
| 18 | [[the-star-method]] | Concept | The structure that keeps a story from wandering — Situation, Task, Action, Result. Pair two prepared stories with the Arch Re narrative: why leave a conventional path for a reinsurer's tech transformation, framed as motivation, not apology |

Days 1–2 are the frame and the theory and can be read as a block — they are what everything after
assumes. Days 3–4 are the applied spine and are best read close together: they are one story told
in order — pick the store, move the messages, and only then decide where history itself is the
requirement. Day 5 closes the boundary, day 6 spends the whole week's vocabulary on the AI answer,
and day 7 turns it all into stories.

## Look up rather than read

Strengths the vault already holds that an Arch Re design answer leans on — do **not** re-read them
this week, but know where they surface so you can reach for them under a follow-up:

- [[idempotency-and-safe-retries]] and [[retry-versus-circuit-breaker]] — the at-least-once
  default every broker in step 11 leaves you to handle, and the resilience the Azure calls in
  steps 9–14 need. The outbox pattern in step 11 is idempotency spent on the dual-write problem.
- [[transactions-and-acid]] and [[isolation-levels-and-row-versioning]] — the strong-consistency
  end Cosmos (step 9) and event sourcing (step 12) trade *away*; naming what you gave up is half
  the trade-off.
- [[system-design-building-blocks]] — the five generic components (load balancing, rate limiting,
  queues, CDNs, API design) as one comparison table, for a fast re-scan the night before.

## Practice checkpoint

The design and behavioural rounds are **spoken conversations, not solved artifacts** — so after
day 5, imitate before you improvise. Read the vault's two worked walkthroughs,
[[design-a-url-shortener]] and [[design-a-rate-limiter]]: not answer keys, but the four moves run
to completion on a real prompt — requirements pinned, scale estimated, components placed with the
trade-off named, consistency spent out loud.

Then close the book and run the Arch Re prompt aloud, timed: **design an event-sourced,
Service-Bus-backed treaty-booking service on Azure.** State the requirements and the domain
assumptions first (what a treaty booking *is*, from day 1), size it, then place Cosmos and Service
Bus naming the consistency you keep and the consistency you give up, and say where event sourcing
earns its cost and where CRUD would have been fine. If you go quiet, that is the
[[what-senior-means-as-a-level|mission's]] named failure mode surfacing, and rehearsing it aloud is
exactly the fix.

## The .NET-and-Azure-specific half, stated plainly

Five of the eighteen steps are tied to Microsoft's cloud rather than to the subject: **Cosmos DB**
(9), **Service Bus** (11), **Entra ID** inside OAuth (14), and the .NET framing inside **event
sourcing** (12) and **API design** (15). Everything else — the domain, the frame, the whole theory
run, CQRS-as-a-pattern, the modernization playbook, and the AI POV — is the field's and transfers
whole. If Arch Re's stack turns out to differ, or the next interview is elsewhere, only those five
need re-mapping, and here is what they map to:

| The Azure thing | What it is elsewhere |
|---|---|
| Cosmos DB (partition key, RUs, tunable consistency) | DynamoDB (partition/sort key, RCU/WCU, eventual-or-strong reads) or Cassandra (`LOCAL_QUORUM` as tunable consistency); MongoDB for the document model without the global dial |
| Azure Service Bus (queue, topic/subscription, DLQ, sessions) | AWS SQS + SNS for the queue-plus-fanout, or RabbitMQ for a broker; Kafka / Event Hubs when it should be a **log** (replay, high throughput) rather than a broker |
| Entra ID (OIDC provider, client-credentials, on-behalf-of) | Auth0, Okta, AWS Cognito, or Keycloak self-hosted — all OIDC providers issuing the same JWTs; the grant types are the OAuth spec's, not Microsoft's |
| Event sourcing in .NET (EventStoreDB, a projections host) | EventStoreDB or Marten anywhere; Axon on the JVM; Kafka-as-source-of-truth in the log-centric camp — the pattern is language-neutral, only the toolkit changes |
| ASP.NET Core Web API (minimal APIs, controllers) | Spring Boot, Express/Fastify, FastAPI, Go's net/http — REST, gRPC and the idempotency-key contract are the same everywhere |

Being wrong about another cloud is worse than saying less about it: the two claims that survive any
stack are that **Cosmos-or-DynamoDB is the CAP/PACELC dial made concrete**, and that **a broker
buys decoupling with at-least-once delivery you must make idempotent** — so the answer is never
"use Service Bus", it is "use a broker, and here is the duplicate delivery I am handling for it".

## The night before

[[reinsurance-domain-primer]] (the domain has no cheat sheet — the primer *is* the lookup)
and [[applied-ai-cheat-sheet]] for the two domain-shaped rounds;
[[nosql-databases-cheat-sheet]], [[distributed-systems-cheat-sheet]] and [[system-design-cheat-sheet]]
for the stack; [[authentication-and-authorization-cheat-sheet]] for the auth follow-up; and
[[behavioral-interviews-cheat-sheet]] and [[engineering-levels-cheat-sheet]] for the stories. A
reading order is for the week before; a cheat sheet is for the morning of.
