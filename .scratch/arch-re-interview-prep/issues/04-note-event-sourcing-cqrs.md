# Author: event sourcing + CQRS note(s)

Type: task
Status: resolved
Claim: delegate-plan-lessons [229e8b] — re-claimed 2026-09-23; prior claim stale (no note on disk)
Blocked by: 01

## Question

Author fluency-level vault note(s) on **event sourcing + CQRS** — explicitly "preference given" in
the brief, and a likely system-design topic for "next generation reinsurance systems". Via `/author`,
at the type/topic decided in 01. Must let the candidate narrate, in a design round:

- The core model: append-only event store, state as a fold over events, **projections/read models**,
  **replay**, snapshots.
- **CQRS** as the natural pairing: separate write model (commands → events) from read models.
- Consistency: eventual consistency between write and read sides; link the vault's
  `consistency-models` / `pacelc`.
- **When to use it and when not** — the senior signal is the tradeoff, not the mechanism; a
  reinsurance angle (auditable treaty/booking history) makes it concrete.
- Footholds to link: `message-queues`, `idempotency-and-safe-retries`.

## Decided attachment (from 01)

- **Type:** Lesson → `content/lessons/`
- **`topic:`** `system-design`, `distributed-systems`
- No new Term. Files to mint: **1 Lesson**.

Resolved when the note(s) pass `npm run validate` and cover the above at fluency depth.

## Answer

Authored **1 Lesson**, `content/lessons/event-sourcing-and-cqrs.md` (`topic: system-design,
distributed-systems`; `prerequisites: transactions-and-acid, consistency-models`), and added a
compact **Event sourcing + CQRS block** to the **system-design cheat sheet**. `npm run validate`
passes: **0 errors, 1 warning** (the deliberate `[[reinsurance]]` body link — the Term ticket 10
mints; a healthy authoring-queue warning, not a defect).

Coverage against the ticket, at fluency depth:

- **Core model** — append-only, immutable event stream per entity as the source of truth; current
  state derived by **replaying (rehydration)**; **materialized views / projections** for querying;
  **snapshots** as an optimization over long replays (stream stays authoritative).
- **CQRS as the natural pairing** — write model (commands = business intent + validation) vs read
  model (queries = DTOs); single-store vs separate-store; the event store *is* the write model,
  projections *are* the read model. Also stresses they are **distinct** patterns (CQRS needs no
  events; event sourcing needs no CQRS) — a common interview trip-up.
- **Consistency** — read side eventually consistent; wired onto [[consistency-models]] and
  [[pacelc]] (else-latency); separate-store CQRS inherits the **dual-write → outbox + idempotent
  consumer** story, linked into [[azure-service-bus-and-event-driven-soa]] (ticket 06) rather than
  re-taught.
- **When to use / when not** — the senior signal is the tradeoff: reach for it where the **history
  is the requirement** (ledger, order pipeline, **reinsurance treaty-booking** audit trail); walk
  away for plain CRUD, prototypes, real-time-consistent views, or an inexperienced team. Scoped
  **per sub-domain**, never top-level.
- **Footholds linked**: [[message-queues]], [[idempotency-and-safe-retries]], [[transactions-and-acid]],
  [[azure-service-bus-and-event-driven-soa]], [[consistency-models]], [[pacelc]], and a forward
  [[reinsurance]].

Four quiz blocks (mcq rehydration; cloze ES+CQRS pairing; mcq no-ad-hoc-querying/projections; recall
"would you event-source a reinsurance ledger, and what does it cost?"). Sources added to
`RESOURCES.md`: MS Event Sourcing pattern, MS CQRS pattern, Fowler's Event Sourcing. All facts are
sourced from those primary pages, not parametric memory.

Diff is unstaged for the dev to review and commit (not committed, per the authoring contract).
