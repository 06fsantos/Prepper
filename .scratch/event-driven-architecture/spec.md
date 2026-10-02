# Spec: the `event-driven-architecture` subject — a Term, five Lessons, edits, a cheat sheet and a Plan

Status: **ready-for-agent**

_Charted 2026-10-02 from a dev-approved plan. Source of truth for every claim:
`content/research/what-does-an-event-driven-architecture-interview-probe-beyond-the-broker.md`
(the research note). The Medium teaser that prompted this is the question map only and is never
cited._

## Problem Statement

An EDA interview probes ten decision-level questions, listed below. About half of them are
answered somewhere in the vault, but scattered across `message-queues`,
`azure-service-bus-and-event-driven-soa`, `event-sourcing-and-cqrs`, `domain-events` and
`idempotency-and-safe-retries`. The other half (out-of-order invariants, replay safety, event
schema evolution, tracing through a broker, and event coupling into a distributed monolith) is
not taught anywhere. There is no topic and no reading order that treats EDA as one subject.

## Solution

- A new Term **`event-driven-architecture`** with `topic: [distributed-systems]`, so it nests
  under that tree.
- **Five new Lessons**, each with `topic` containing `event-driven-architecture` and filling one
  gap.
- **Edits to existing Lessons**: they gain the topic tag, plus the small missing halves (Q3, Q5,
  Q7).
- **One recall quiz per question** (Q1–Q10), placed in the Lesson that owns the answer. This
  vault has no question bank.
- A **cheat sheet** (`event-driven-architecture-cheat-sheet`) and a **Plan**
  (`reading-order-for-event-driven-architecture`), written last.

## The ten questions and where each one lives

| Q | Question (quiz prompt, roughly) | Owning note | New or edit |
|---|---|---|---|
| 1 | How do you keep business invariants when events are eventually consistent and arrive out of order? | `out-of-order-events-and-business-invariants` | new |
| 2 | Event loss, duplicates and reprocessing: why are they three problems? | `loss-duplicates-and-replay-safe-consumers` | new |
| 3 | When should you *not* use EDA even if you need scale? | `azure-service-bus-and-event-driven-soa`, in its "trade against synchronous REST" section, generalised beyond Azure | edit |
| 4 | How do you replay millions of old events without corrupting current state? | `loss-duplicates-and-replay-safe-consumers` | new |
| 5 | What does the outbox solve, and what does it not? | `azure-service-bus-and-event-driven-soa`, in its outbox section | edit |
| 6 | How do you evolve event schemas with several consumer versions live? | `evolving-event-schemas` | new |
| 7 | Event-driven vs message-driven? | `azure-service-bus-and-event-driven-soa`, in its "command versus event" section | edit |
| 8 | How do you debug one flow across ten event-driven services? | `tracing-a-flow-through-a-message-broker` | new |
| 9 | Immutable forever, or correctable? | `domain-events` (it already teaches immutability) | edit (quiz only, plus a short compensating-event paragraph if missing) |
| 10 | How do you stop EDA becoming a distributed monolith? | `events-as-public-contracts` | new |

## New Lessons

Each one: `topic` = `[event-driven-architecture]` unless stated otherwise. Prerequisites are
only notes that exist, and never another new Lesson from the same wave, which keeps wave 2
parallel. A wikilink to a sibling new Lesson in the body is allowed, because all five will exist
before validation.

1. **`out-of-order-events-and-business-invariants`** (Q1). Prereqs: `message-queues`,
   `consistency-models`. Covers: name the invariant and the entity that owns it, key by that
   entity, and enforce the invariant where that entity's writes are serialised (Kleppmann's
   OLEP). Rejecting stale events with versions works for state-carrying events, while delta
   events need resequencing, because rejecting a delta loses data. Event time is not an ordering
   mechanism. Link `aggregates`.
2. **`loss-duplicates-and-replay-safe-consumers`** (Q2 + Q4). Prereqs: `message-queues`,
   `idempotency-and-safe-retries`. Covers the three problems and their three mechanisms:
   durability (acks=all, ISR), deduplication (a transactional consumer dedup on message id), and
   determinism. Exactly-once applies within Kafka's own scope, not end to end. Replay rebuilds
   projections only: side effects go through gateways that are off or recorded during replay,
   external lookups are recorded with the event, and the rules in force when the event happened
   are the ones applied. Link `event-sourcing-and-cqrs`.
3. **`evolving-event-schemas`** (Q6). Prereq: `zero-downtime-schema-changes`, the DB analogue,
   which is fine as a cross-topic prereq. Covers: backward vs forward compatibility decides who
   deploys first; FULL_TRANSITIVE for widely consumed events, since non-transitive modes are too
   weak for long-retained logs; additive optional fields; a new event type when the meaning
   changes ("if not convertible, it is a new event"); upcast on read, never rewrite.
4. **`tracing-a-flow-through-a-message-broker`** (Q8). `topic: [event-driven-architecture,
   distributed-tracing]`. Prereq: `trace-context-across-retries`. Covers: creation context per
   message in headers; consumers link to it rather than parent off it (OTel messaging
   conventions, which are still Development status); W3C Trace Context has no Kafka binding
   (open issue #504); a business correlation id beside the trace, because traces are sampled and
   expire; reading an event timeline. **This agent also updates
   `distributed-tracing-cheat-sheet`** with one entry for this Lesson.
5. **`events-as-public-contracts`** (Q10). Prereqs: `domain-events`, `context-mapping`. Covers:
   an external event is a public API owned by one domain; translate internal events to external
   ones rather than leaking internal ones (Young); event notification vs event-carried state
   transfer as a runtime-vs-schema coupling trade (Fowler); reviewing contracts like APIs. Say
   plainly that "distributed monolith" is a label no primary source owns; the mechanisms are
   sourced.

## Edits to existing Lessons (one agent owns all of these files)

- Add `event-driven-architecture` to `topic` on `message-queues`,
  `azure-service-bus-and-event-driven-soa`, `event-sourcing-and-cqrs` and `domain-events`. Keep
  every existing topic.
- `azure-service-bus-and-event-driven-soa`:
  - Outbox section: add the half on what it does not solve. The relay can publish twice, so
    "lost" becomes "duplicate" and consumers must deduplicate; ordering is per aggregate key
    only; nothing is said about downstream success. Add a Q5 recall quiz.
  - Command-versus-event section: Fowler's "passive-aggressive command" smell, and orchestration
    as a legitimate choice, not a failure. Add a Q7 recall quiz.
  - Trade-against-REST section: generalise it into when *not* to use EDA (a response that needs
    a decision, a cross-entity read that must be consistent, simple CRUD; "scale" is not a reason
    on its own). Add a Q3 recall quiz.
- `domain-events`: a Q9 recall quiz (append, never edit; full reversal; deltas reverse cleanly;
  a compensation is a visible new fact), with a short paragraph only if the Lesson does not
  already carry the idea.
- Link forward to the new Lessons where a section now hands off (e.g. the outbox → 
  `loss-duplicates-and-replay-safe-consumers`).

## Quizzes

- Infostring `<ULID> recall` for each Q quiz; mint every ULID with `npm run ulid`. Each new
  Lesson may carry extra mcq/cloze quizzes as LESSON-FORMAT prescribes, but must carry the Q
  recall quiz for each question it owns.
- An answer states the defensible stance and the oversimplification the research verdict names.

## Waves

1. **Term** `event-driven-architecture` (one agent).
2. **Parallel**: one agent per new Lesson (5), plus one agent for all edits. Wave-2 agents do
   **not** touch the Term, `event-driven-architecture-cheat-sheet`, the Plan or each other's
   files. Lesson-mode's "update the cheat sheet" step is deferred to wave 3, except for agent 4
   with the distributed-tracing cheat sheet.
3. **Cheat sheet and Plan** (one agent). The Plan states that `prerequisites` is the only
   ordering claim and that the note wins where the two disagree, per PLAN-FORMAT.
4. **Record 0006** to close.

## Out of Scope

- No Problem (that belongs to `/import`).
- No new topic other than `event-driven-architecture`.
- No re-teaching of outbox mechanics, ES/CQRS, delivery semantics or `traceparent`; those are
  linked.
- `idempotency-and-safe-retries` stays filed under `http-resilience`, untouched.

## Testing

`npm run validate` exits 0 after each wave (the existing `build-vs-buy` warning is
pre-existing). `npm test` and `npm run build` pass at the end.
