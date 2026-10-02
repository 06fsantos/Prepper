---
id: 01M3YND3SHJF38BPFM413CZYQ9
title: A reading order for event-driven architecture
topic:
  - event-driven-architecture
  - distributed-systems
  - system-design
  - distributed-tracing
---

This page covers everything the vault holds on event-driven architecture, ordered so that each
note makes sense when you reach it. It runs from the broker's two narrow promises (order within a
partition, delivery at least once), through the question of where a business rule is enforced
when events arrive late, to the costs that follow: duplicates, replays, schemas that several
consumer versions read, contracts between domains, and flows that no single service can show you.
The vault has no reading order of its own. `prerequisites` is a graph, and it is the only ordering
claim the vault makes, and there are no lesson numbers. This page is one path through that graph.
Where a note disagrees with this page, the note wins.

Two choices in the order are worth knowing about first. **The mechanism comes before the
argument.** [[message-queues]] is read first because every question after it applies its two
facts: order holds within a partition, and delivery is at-least-once. **The invariant comes before
the plumbing.** [[out-of-order-events-and-business-invariants]] comes before the outbox, dedup and
replay, because "where is this rule enforced?" decides which entity you key by. Every later answer
assumes you have chosen that key.

This path also leaves some things out on purpose. Several notes it relies on belong to other
subjects, such as aggregates, context maps and `traceparent`. Those are listed below with the
reading order that owns them, and are not repeated here.

## The order

| #  | Read | Scope | Why here |
|----|------|-------|----------|
| 1  | [[message-queues]] | Concept | The mechanism: queue vs log vs pub/sub, "effectively once" rather than exactly-once, and ordering **within a partition, not across**. It has no prerequisites of its own, and steps 4, 5 and 8 list it as theirs, so it is read first |
| 2  | [[consistency-models]] | Concept | The vocabulary for "eventually consistent": a stale read is a *choice*, not a bug. Steps 4 and 6 list it as a prerequisite, and step 4's question is unreadable without it |
| 3  | [[domain-events]] | Concept | What an event *is*: a past-tense, immutable fact raised by an aggregate. It answers **Q9** (never edit; append a full reversal) and is the prerequisite for step 10. It is read early because every event on the rest of the path is one of these |
| 4  | [[out-of-order-events-and-business-invariants]] | Concept | **Q1.** Name the invariant and the entity that owns it, key by that entity, and enforce the rule where its writes are serialised. A snapshot may skip a gap; a delta must be resequenced. Read here because the key chosen here is what every later step relies on |
| 5  | [[azure-service-bus-and-event-driven-soa]] | Azure | **Q3, Q5, Q7**, in one product's vocabulary. It covers when *not* to go event-driven, what the outbox closes (the dual write) and leaves open (it turns loss into duplication), and event vs command, including the passive-aggressive command and orchestration as a legitimate choice. It is the one product-specific step: the patterns transfer, the SDK does not |
| 6  | [[event-sourcing-and-cqrs]] | Concept | The log as the source of truth, and projections as derived views. Read before step 8 because replay is only safe once you know which data is the source of truth and which is a rebuildable cache |
| 7  | [[idempotency-and-safe-retries]] | Concept | Why sending something twice has to mean the same as sending it once. It is written about HTTP retries, but the reasoning is identical for a redelivered message, and step 8 lists it as a prerequisite |
| 8  | [[loss-duplicates-and-replay-safe-consumers]] | Concept | **Q2 and Q4.** Loss, duplicates and replay are three problems, fixed by durability, dedup committed with the effect, and determinism plus gateways that are off during a replay. "Exactly-once" holds inside Kafka only. It pays for steps 5 to 7: the outbox's duplicates are absorbed here, and the projections from step 6 are what a replay rebuilds |
| 9  | [[evolving-event-schemas]] | Concept | **Q6.** Backward vs forward decides who deploys first; use `FULL_TRANSITIVE` for widely read events; a change of meaning is a new event; upcast on read, never rewrite. Read after replay because a replay is what reaches the oldest schema in the log |
| 10 | [[events-as-public-contracts]] | Concept | **Q10.** An event that leaves its domain is a public API. Translate internal events rather than leaking them, and know that notification vs state transfer trades runtime coupling for schema coupling. It lists step 3 as a prerequisite and points to step 9 for the compatibility mode a contract is registered under |
| 11 | [[tracing-a-flow-through-a-message-broker]] | Concept | **Q8**, and the end of the path. It covers a creation context in the headers, consumers that link rather than parent, and a correlation id because traces expire. It comes last because it is what you need once the flow from steps 4 to 10 exists and something in it has gone wrong |

Steps 1–2 are the theory, and a reader who already knows queues and the consistency spectrum can
skim them. Steps 3–5 are **the event and where it is decided**: what a fact is, where the rule
behind it is enforced, and how it leaves the service. Steps 6–8 are **the consumer's side**, best
read in one sitting: what is the truth, why a repeat must be harmless, and the three problems that
come from both. Steps 9–10 are **the event as a contract over time and between teams**. Step 11 is
debugging.

## What the path assumes, and where each one is taught

Five notes are prerequisites of steps above but belong to another subject. Nothing is gated, so
skip them if you know them. Otherwise, read each one before the step that needs it, or follow the
reading order that owns it:

| Before step | Read | Owned by |
|---|---|---|
| 3 | [[aggregates]] | [[reading-order-for-domain-driven-design]] |
| 5, 6 | [[transactions-and-acid]] | [[reading-order-for-databases]] |
| 9 | [[zero-downtime-schema-changes]] | [[reading-order-for-continuous-delivery]] |
| 10 | [[context-mapping]] | [[reading-order-for-domain-driven-design]] |
| 11 | [[trace-context-across-retries]] | [[reading-order-for-api-requests]] |

## Companion reading orders

- [[reading-order-for-microservices]]: the split that event-driven integration serves. Steps 1, 2,
  5 and 6 here are also steps in that path, where they serve as the integration spine. This path
  goes deeper into the consumer and the contract, and that one goes wider into discovery, the
  gateway and the decision whether to split at all. Read it when the question becomes "should
  these even be separate services?"
- [[reading-order-for-the-system-design-round]]: the round where these questions are asked. It
  places [[message-queues]] as one building block among many and covers the theory (CAP, PACELC)
  that step 2 assumes. Read it for the 45-minute frame these answers fit into.

## Practice checkpoint

The vault has no event-driven Problem yet, so the practice is spoken. Each of steps 3, 4, 5, 8, 9,
10 and 11 ends on the **recall quiz for the interview question it owns**, ten in all. After step
11, go back and answer all ten aloud without the page, in order, each in under two minutes. Then
run them once more against one design you know, such as an order system or a payment flow: say
what the key is, what happens on a duplicate, what happens on a replay, and who owns each event's
schema.

The nearest worked Problem is [[carve-bounded-contexts-for-an-online-marketplace]]. It practises
the boundaries rather than the events, but its answer integrates contexts *through* events, so it
is a good place to say step 10 out loud. If you go quiet, that is the
[[what-senior-means-as-a-level|mission's]] named failure mode showing up, and it is what the
rehearsal is for.

## The stack-specific half, stated plainly

Ten of the eleven steps are concepts. **Step 5 is the one written against a product**, Azure
Service Bus. The lessons cite Kafka for durability, ordering and the idempotent producer because
Kafka's docs are the primary source, but the ideas belong to the field. Some C# sketches appear
(steps 4 and 8). They are short and read as pseudocode in any language. How the
product-shaped ideas look elsewhere:

| The idea | Where you meet it in production |
|---|---|
| Per-entity ordering | A Kafka message key → partition; Azure Service Bus **sessions** (`SessionId`); AWS SQS FIFO **message group id** |
| Broker-side dedup on a message id | Kafka's idempotent producer (producer retries only); Service Bus **duplicate detection** on `MessageId`; SQS FIFO **deduplication id** |
| Schema registry with compatibility modes | Confluent Schema Registry; Azure Schema Registry (in Event Hubs); AWS Glue Schema Registry |
| Outbox relay | Debezium reading the database log; the outbox features in MassTransit and NServiceBus (.NET); many teams write a table and a poller themselves |

The claim that holds in any stack: **a broker promises order within a key and delivery at least
once, and nothing more.** Every answer on this path is about being explicit, in the design, about
what the broker does not promise.

## The night before

[[event-driven-architecture-cheat-sheet]] has the ten questions with the stance to defend for
each. [[distributed-tracing-cheat-sheet]] has the broker caveat for step 11, and
[[distributed-systems-cheat-sheet]] has the consistency vocabulary from step 2. A reading order is
for the fortnight before; a cheat sheet is for the morning of.
