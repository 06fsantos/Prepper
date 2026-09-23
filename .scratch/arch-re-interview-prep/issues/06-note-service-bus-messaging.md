# Author: Azure Service Bus + event-driven messaging note(s)

Type: task
Status: resolved
Blocked by: 01

## Question

Author fluency-level vault note(s) on **Azure Service Bus and event-driven / message-based SOA** —
the brief's core architecture ("REST and message-based service-oriented architecture", "asynchronous
event driven", Service Bus named). The vault's `message-queues` is generic; this adds the specifics
a senior narrates. Via `/author`, at the type/topic decided in 01. Must cover:

- Service Bus building blocks: **queues vs topics/subscriptions**, **sessions** (ordering/FIFO),
  **dead-letter queues**, competing consumers, peek-lock vs receive-and-delete.
- Delivery semantics: **at-least-once + idempotent consumers**, dedup; link
  `idempotency-and-safe-retries`.
- Integration patterns: the **outbox pattern** (atomic DB write + publish), saga/choreography vs
  orchestration at a fluency level, event vs command messages.
- Queue vs event-stream (when Service Bus vs Event Hubs/Kafka-style), briefly.
- Tradeoffs vs synchronous REST — coupling, backpressure, failure isolation (link `bulkheads-and-blast-radius`).

## Decided attachment (from 01)

- **Type:** Lesson → `content/lessons/`
- **`topic:`** `system-design`, `distributed-systems`
- No new Term. Files to mint: **1 Lesson**.

Resolved when the note(s) pass `npm run validate` and cover the above at fluency depth.

## Answer

Authored **1 Lesson**, `content/lessons/azure-service-bus-and-event-driven-soa.md`
(`topic: system-design, distributed-systems`; `prerequisites: message-queues,
transactions-and-acid`), and updated the **system-design cheat sheet** with a compact
"Event-driven integration" block. `npm run validate` passes clean (185 notes, no
violations — all wikilinks resolve, so no warnings either).

Design decision: the generic queue theory (shapes, exactly-once folklore, ordering,
backpressure) already lives in `message-queues` and the cheat sheet's Message-queues
block, so this note **links to it rather than re-teaching it** and adds only the layer a
senior narrates on top — the Azure-concrete building blocks and the integration patterns
that appear once services share a bus. Coverage against the ticket:

- **Building blocks** — broker-vs-log service pick (Service Bus vs Event Hubs vs Event
  Grid, from the Compare-messaging-services table); queue (competing-consumer FIFO) vs
  topic/subscription (filtered pub/sub); receive-and-delete (at-most-once) vs **peek-lock**
  (lock→complete, redelivery window → at-least-once); **dead-letter queue** for poison
  messages; **sessions** for per-`SessionId` FIFO ordering; **duplicate detection** on
  `MessageId`.
- **Delivery semantics** — at-least-once + idempotent consumer + dedup as "effectively
  once"; links `idempotency-and-safe-retries`.
- **Integration patterns** — the **dual-write problem** and the **transactional outbox**
  (commit the event in the same DB transaction, relay it); **saga** (local transactions +
  compensating transactions) with **choreography vs orchestration**; **command vs event**
  message intent. Links `transactions-and-acid`.
- **Queue vs event-stream** — Service Bus (broker, forgets) vs Event Hubs (retained,
  partitioned, replayable log), the Azure face of `message-queues`' classic-queue-vs-log fork.
- **Tradeoffs vs synchronous REST** — a dedicated section: temporal decoupling, load
  leveling + backpressure (link `message-queues`), failure isolation (link
  `bulkheads-and-blast-radius`); paid for in eventual consistency + a broker to run.

Four quiz blocks (mcq Service Bus-vs-Event-Hubs, cloze peek-lock/at-least-once, mcq
dual-write/outbox, recall command-vs-event + saga). Primary sources added to `RESOURCES.md`
(Queues/topics/subscriptions, Compare-messaging-services, Transactional Outbox, Saga).

No new Term needed (both topics existed). No fog graduated — the practice/mock and
behavioural-angle fog still waits on the remaining authoring tickets. Diff is unstaged for
the dev to review and commit.
