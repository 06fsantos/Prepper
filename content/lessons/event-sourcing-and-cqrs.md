---
id: 01M37Z4WHP76GCZWTNCM74D7Y4
title: Event sourcing and CQRS
topic:
  - system-design
  - distributed-systems
prerequisites:
  - transactions-and-acid
  - consistency-models
---

Most systems store the **current state** of a thing and overwrite it on every change: a row
per account, updated in place, and the previous value is gone. Event sourcing inverts that —
it stores **the sequence of changes** as the source of truth and treats current state as
something you *derive* by replaying them. CQRS is the split that almost always rides along:
serve reads from a model that is separate from the one that takes writes. Neither is a default
— Microsoft is blunt that event sourcing "is a complex pattern that introduces significant
trade-offs" and that "for most systems and most parts of a system, traditional data management
is sufficient" ([Event Sourcing
pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)). The
senior signal is not knowing the mechanism; it is knowing **when the audit trail and the
history are worth the complexity, and when they are not.**

## Event sourcing: store the events, not the state

The pattern is a change of what the database *is*. Instead of a table holding the latest
values, you keep an **append-only store** recording "the full series of actions taken on an
object", and that store "acts as the system of record that you can use to materialize the
domain objects." Every change is an immutable **event** describing what happened —
`AddedItemToOrder`, `OrderCanceled`, `SeatsReserved` — appended, never updated. Each entity has
its own ordered **eventstream**, and you get the entity's current state by **replaying** its
stream from the start — a fold of every event over an initial state. Microsoft calls that
reconstruction **rehydration**.

Two mechanisms make it practical, and both are worth naming because an interviewer will ask
"isn't replaying everything slow?":

- **Materialized views** (projections). Rehydrating on every read is costly, so you maintain
  **read-only projections of the event store that are optimized for querying** — an event
  handler updates a view as events arrive, and queries hit the view, not the raw stream. The
  view is "a durable, read-only cache" you can throw away and rebuild.
- **Snapshots.** For a long stream, replaying thousands of events to rehydrate one entity is
  wasteful, so you periodically serialize the entity's state — "load the most recent snapshot
  and replay only the events that occur after it." A snapshot is *an optimization, not a
  replacement*: the eventstream stays the source of truth and you can regenerate any snapshot
  from it.

What this buys is concrete. Writes are **append-only**, so they "avoid the row-level lock
contention that update-in-place systems create" — no read-modify-write cycle to serialize. And
because nothing is ever overwritten, you get an **audit trail** for free: the complete history
of what happened and in what order, which a state-only store destroys on every update. The
[[transactions-and-acid|ACID update]] gives you the *latest* value fast; event sourcing gives
you *every* value and how you got there.

```quiz 01M37Z4WHQ6WWPWWB8QGMW2R4F
In an event-sourced system, how is the current state of an entity obtained?

- [x] By replaying (folding) the entity's ordered stream of events from an initial state, often shortcut with a snapshot
  > This is rehydration: the eventstream is the source of truth and the state is derived from it. A snapshot caches a point in the stream so you replay only the events after it, but the stream — not the snapshot — remains authoritative.
- [ ] By reading the latest row for that entity, which the event handler overwrites on each change
  > That is exactly the update-in-place model event sourcing replaces. Nothing is overwritten; events are appended, and no single row holds "the current value."
- [ ] By querying the event store with SQL that aggregates the events into the present value
  > There is no standard query mechanism over an event store — you extract a stream by entity id and replay it. Ad-hoc SQL over events is precisely what the pattern gives up.
- [ ] By taking the most recent event in the stream, which by definition carries the full state
  > An event records one change (`SeatsReserved`), not the whole entity. Only the fold of the entire stream (or a snapshot plus the tail) yields current state.
```

## CQRS: split the write model from the read model

CQRS — Command Query Responsibility Segregation — is the simpler idea and stands on its own.
A traditional design uses "a single data model for both read and write operations", but reads
and writes "often have different performance and scaling requirements", and one model serving
both gets pulled in two directions. So you **separate write operations, or *commands*, from
read operations, or *queries*.** A command represents a business task — "Book hotel room", not
"Set ReservationStatus to Reserved" — captures intent, updates data, and carries the domain
logic and validation. A query "never alters data"; it returns DTOs "optimized for the
presentation layer" with no domain logic.

There are two levels, and the distinction matters because the second is where the real cost
and the real payoff live:

- **Separate models, one store.** The read and write models are distinct code paths over a
  single shared database — the foundational level. It buys clarity and a query-shaped read
  path without any consistency problem, because there is only one store.
- **Separate models, separate stores.** The write store and read store are genuinely
  different databases — you might "use a document database for the read data store and a
  relational database for the write data store", scale each to its own load, and give the read
  side a schema (a [[message-queues|materialized]] view) that avoids joins entirely. This is
  where reads and writes scale **independently**, which is CQRS's headline benefit for a
  read-heavy workload.

The catch is that two stores must be kept in sync. "A common pattern is to have the write
model publish events when it updates the database, which the read model uses to refresh its
data" — and that is a **[[azure-service-bus-and-event-driven-soa#The dual-write problem, and why the outbox pattern exists|dual-write]]** across a database and a
broker. Microsoft points straight at the fix: "use the Transactional Outbox pattern to persist
the state change and event atomically, and make the read-model consumer
[[idempotency-and-safe-retries|idempotent]] to tolerate duplicate delivery." The moment CQRS
splits the stores, it inherits the exact messaging problems the
[[azure-service-bus-and-event-driven-soa|event-driven]] Lesson works through.

## Why they pair — and why they are not the same thing

Event sourcing and CQRS are **separate patterns** that fit together so naturally they are
usually taught as one, and a crisp answer keeps them distinct. Event sourcing answers *how do
I store state* (as events); CQRS answers *how do I serve reads versus writes* (separate
models). You can do CQRS with no events at all — two models over ordinary tables — and you can
event-source without CQRS. But combine them and each side plays a role that was already there:

- The **event store is the write model** and the single source of truth. Commands load an
  entity by replaying its stream, run business logic, and append new events.
- The **read model generates materialized views from those events**, "typically in a highly
  denormalized form." The same events that update the write side are the inputs that build the
  read side.

The combination's real superpower is **replay to rebuild**: because the event store holds
every change, "you can easily regenerate materialized views or adapt to changes in the read
model by replaying historical events." Ship a new read model? Replay history into it. A
projection got corrupted? Delete it and rebuild from the events. A state-only store cannot do
this — the history it would need was overwritten.

```quiz 01M37Z4WHQ9WC7ES9882FNCRKD cloze
When event sourcing and CQRS are combined, the {{event store}} is the write model and the
single source of truth, while the read side serves queries from {{materialized views}}
(projections) built by consuming those events. Because every change is retained, a new or
corrupted read model can be rebuilt by {{replaying}} the historical events. The write and read
stores are separate, so the read side is only {{eventually consistent}} with the write side.
```

## The bill: eventual consistency, querying, and versioning

These patterns pay for their power in three currencies, and naming all three is what separates
a fluent answer from an enthusiastic one.

**Eventual consistency.** The instant reads and writes live in separate stores, the read model
lags: "the read data might not show the most recent changes immediately … this delay results
in stale data." That is not a bug to fix but the [[consistency-models|consistency model]] you
have chosen — a write is durable in the event store before its projection catches up. Reach for
[[pacelc|PACELC]] to say it precisely: **else-latency** — even with no partition, you are
trading consistency for read latency and scale. A design that "requires consistency and
real-time updates to the views" is one event sourcing is *wrong* for.

**No ad-hoc querying.** An event store has "no standard approach or existing mechanisms, such
as SQL queries, for reading events." You extract a stream by entity id and replay it; you
cannot ask "which orders contain product X" of the event store directly. That question is
answered by a **projection built for it** — which is the whole reason CQRS's read model exists,
but it means every query shape you need is a view you must design and maintain in advance.

**Versioning and replay side effects.** The store is immutable, so "you should never update the
event data" — you correct a mistake by appending a **compensating event** (a `ReservationCanceled`
that reverses a prior `SeatsReserved`), never by editing history. And when the event *schema*
changes over years, old events still have to deserialize — handled with tolerant
deserialization, a version tag, or **upcasters** that transform old shapes to new on read.
Finally, replay is dangerous around **side effects**: Fowler's warning is that "if these events
cause update messages to be sent to external systems, then things will go wrong because those
external systems don't know the difference between real processing and replays"
([Fowler, Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)). Delivery to
event handlers is **at-least-once**, so every consumer "must be
[[idempotency-and-safe-retries|idempotent]] so processing a duplicate event doesn't change the
outcome" — the same discipline a [[message-queues|queue]] consumer needs, for the same reason:
a redelivery must be a no-op, or a replay charges the card twice.

```quiz 01M37Z4WHQPZMQ0F2CH8H2F0BC
A team event-sources their orders and asks the interviewer's favourite question: "How do you
find every order that contains a discontinued product?" What is the right answer?

- [x] The event store can't answer it directly — you maintain a projection (read model) shaped for that query and keep it eventually consistent
  > Event stores have no ad-hoc query mechanism; you extract a stream by entity id and replay it. Any query shape you need is a materialized view you design in advance — which is exactly what CQRS's read model is for, at the cost of eventual consistency.
- [ ] Run a SQL join across the event tables filtering on the product id in each event's payload
  > There is no standard SQL query surface over an event store, and querying raw event payloads across entities is precisely the capability the pattern trades away.
- [ ] Replay every entity's full eventstream on each request and filter the rehydrated orders
  > Replaying every stream per query is prohibitively expensive and defeats the point of projections; rehydration is for loading one entity to append to it, not for cross-entity search.
- [ ] Add the query result as a new field on each future order event so it becomes searchable
  > Events are immutable records of what happened, not a place to denormalize query results; and it would still leave historical orders unsearchable. The answer is a dedicated projection.
```

## When to reach for it — and when not

The interview is won on the tradeoff, so lead with the shape of the workload, not the pattern.
**Reach for event sourcing when the history *is* the requirement**: a payment ledger, an
order-processing pipeline, or a [[reinsurance|reinsurance]] treaty-booking system where every
endorsement, cession, and cancellation on a contract must be reconstructable years later and
"who changed what, when, and why" is a regulatory question, not a nice-to-have. There the audit
trail is not overhead you bolt on — it *is* the data model, and the ability to replay the ledger
to any point in time answers the auditor directly. Microsoft's own tip is that it "doesn't have
to be an all-or-nothing decision" — apply it "to the parts of your system that it benefits the
most, such as a payment ledger", and keep plain [[transactions-and-acid|CRUD]] for user
profiles and configuration.

**Walk away when the history buys nothing.** Straightforward CRUD "that doesn't require
auditability, replay, or historical reconstruction" gets only the operational overhead of an
event store for its trouble. Prototypes and short-lived systems never recoup the upfront cost of
event design and projection infrastructure. Anything needing "consistency and real-time updates
to the views" fights the pattern's inherent eventual consistency. And a team with no
event-driven experience adopting it wholesale is buying "antipatterns that are costly to
reverse" — the migration cost runs both ways.

CQRS scales down more gently: the single-store split is cheap and often worth it for a
task-based UI or a lopsided read/write ratio, and you only pay the eventual-consistency tax when
you actually split the stores. But Microsoft is explicit that even CQRS is overkill when "the
domain or the business rules are simple" and "a simple CRUD-style user interface and data access
operations are sufficient." The honest senior answer to "should we event-source this?" is
usually "for this one sub-domain, yes; for the rest of the system, no."

```quiz 01M37Z4WHQDAT85ED3WJHV61DD recall
An interviewer says: "We're building the ledger for a reinsurance platform — every change to a
treaty needs a full audit history. Would you event-source it? What does it cost you?" Give the
answer you would say out loud.

> Yes, for the ledger specifically. The requirement *is* the history — every endorsement,
> cession, and cancellation on a contract has to be reconstructable and attributable years
> later for auditors and regulators. Event sourcing makes that the data model rather than a
> bolt-on audit log: I store each change as an immutable event in an append-only stream, and I
> can replay a treaty's stream to see its exact state at any point in time. Append-only writes
> also dodge the lock contention of updating a hot balance in place.
>
> I'd pair it with CQRS: the event store is the write model and source of truth, and I build
> read-optimized projections for the queries the business actually runs — outstanding exposure,
> a treaty's current terms — because the event store itself can't be queried ad hoc.
>
> The costs I'd name: the read side is only **eventually consistent**, so I have to be sure the
> business tolerates a small lag on those views; I can never edit history, so a correction is a
> **compensating event**, and schema changes over the years need versioning or upcasters; event
> handlers have to be **idempotent** because delivery is at-least-once and replays mustn't fire
> side effects twice. And I'd scope it — event-source the ledger, keep plain CRUD for the boring
> parts like user accounts and config, where the history earns nothing.
```

## What to take away

**Event sourcing stores the events, not the state** — an append-only, immutable stream per
entity is the source of truth, and current state is *rehydrated* by replaying it, with
**materialized views** for querying and **snapshots** to shortcut long replays. It buys an
**audit trail** and contention-free append-only writes; it costs you ad-hoc querying and easy
edits. **CQRS splits the read model from the write model** — commands (intent, business logic,
writes) from queries (DTOs, reads) — and scales them independently once the stores are separate,
at which point it inherits the [[azure-service-bus-and-event-driven-soa#The dual-write problem, and why the outbox pattern exists|dual-write / outbox / idempotency]]
story. They **pair** because the event store is a natural write model and projections are a
natural read model, and together they let you **replay history to rebuild any view**. The bill
is **[[consistency-models|eventual consistency]]**, no SQL over the events, immutable-history
versioning, and idempotent handlers for at-least-once replay. And the whole thing is a
**per-sub-domain** decision, never a top-level architecture: reach for it where the history is
the requirement — a ledger, an order pipeline, a reinsurance treaty book — and leave CRUD alone
everywhere else.

Worth reading in full: Microsoft's [Event Sourcing
pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) for the
benefits/issues lists and the seat-reservation worked example, and its [CQRS
pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) for the read/write
split and the two-store synchronisation problem — the two ideas a design round on auditable,
high-write systems turns on most.
