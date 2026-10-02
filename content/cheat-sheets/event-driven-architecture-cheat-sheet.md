---
id: 01M3YND3SEXRW3P2T9AES4GSRY
title: Event-driven architecture — cheat sheet
topic: event-driven-architecture
---

**The one idea under all ten questions.** Order holds **within a partition** and nowhere else, and
delivery is **at-least-once**. Every answer below is that fact applied somewhere specific. Picking
the broker is the easy part.

**1. Invariants when events are eventually consistent and arrive out of order.** Say four moves in
order: name the **invariant**, name the **entity** that owns it, **key** events by that entity, and
**enforce** the rule where that entity's writes are serialised. That place is the aggregate, a
single-threaded executor on its partition (OLEP), or an event-store append with an expected
version. Downstream consumers react to facts that have already passed the check.

- A version per entity on every event. At or below the applied version is a duplicate, so drop it.
- A **gap** depends on the event's shape. A **state-carrying** event (a snapshot) can skip the gap,
  because the latest one wins. A **delta** (a debit) must be **resequenced**, because rejecting it
  loses data.
- **Event time is not an ordering mechanism.** Producer clocks are not a sequence. Use event time
  for reporting windows.
- [[out-of-order-events-and-business-invariants]]

**2. Loss, duplicates and reprocessing are three problems.** Each has its own place and its own
mechanism.

- **Loss** happens between producer and broker. The fix is durability: `acks=all` +
  `min.insync.replicas` + unclean leader election disabled. Name all three settings.
- **Duplicates** come from two directions. The idempotent producer removes its own retries **and
  nothing else**. On the consumer, record a stable message id (CloudEvents `source` + `id`) **in the
  same transaction as the effect**, or make the effect idempotent by construction.
- **Reprocessing** is a determinism problem, not a dedup problem.
- "Exactly-once" holds **inside Kafka**. Once processing writes to external storage it is
  at-least-once again, so always say which scope you mean.
- [[loss-duplicates-and-replay-safe-consumers]]

**3. When not to use EDA, even at scale.** "Scale" alone is not a reason, because a partitioned
database or a horizontally scaled synchronous service scales too. Refuse EDA when:

- the caller needs a **decision in its own response** (authorisation, the last seat), because
  nothing bounds when an event gets processed;
- a **cross-entity read must be consistent**. This is an **isolation** anomaly, the read-committed
  one, so name the isolation level you need;
- the system is **simple CRUD with one consumer**, where there is nothing to decouple.

[[azure-service-bus-and-event-driven-soa]]

**4. Replaying millions of old events.** A replay rebuilds **projections** and nothing else.

- **Rebuild into a new projection and swap.** A replay that fails halfway then leaves a table nobody
  reads.
- Send every side effect through a **gateway that is off or recorded during a replay**.
- **Record external lookups with the event**, so the replay uses the exchange rate from December 5th.
- Apply the **rules in force when the event happened**.
- A deterministic consumer is necessary but not enough, because it can still call a payment API.
- [[loss-duplicates-and-replay-safe-consumers]]

**5. What the outbox solves, and what it does not.** It closes the **dual write** and nothing else.
The event is published if and only if the transaction commits.

- It turns **"lost" into "duplicate"**: the relay can publish twice, so the outbox always ships with
  an idempotent consumer.
- Ordering holds **per aggregate key** only.
- It says **nothing about downstream success**. A failure downstream is handled by a saga's
  compensation.
- [[azure-service-bus-and-event-driven-soa]]

**6. Evolving schemas with several consumer versions live.** The compatibility mode decides **who
deploys first**:

| Mode | Upgrade first |
| --- | --- |
| `BACKWARD` (the default) | consumers |
| `FORWARD` | producers |
| `FULL` | either |

- Use **`FULL_TRANSITIVE`** for an event many teams consume, because plain modes check only the
  previous version and the log keeps every version ever written.
- **Additive, optional** changes are the only free ones.
- A change of **meaning** you cannot write a conversion for is a **new event type**.
- **Upcast on read; never rewrite the log.**
- [[evolving-event-schemas]]

**7. Event-driven vs message-driven.** The difference is **intent**, not transport. An event
states a fact and expects nothing. A command asks one recipient to act, and the sender cares
whether it did.

- The smell is Fowler's **passive-aggressive command**: an "event" whose publisher breaks if one
  particular subscriber stops listening.
- **Orchestration is a legitimate choice, not a failure.** The anti-pattern is the orchestrator
  nobody wrote down.
- [[azure-service-bus-and-event-driven-soa]]

**8. Debugging one flow across ten services.** Carry two different things on each message.

- A **creation context** in the message headers. The consumer's Process span **links** to it rather
  than parenting off it, because a batch has many producers and a span has one parent.
- A **business correlation id** beside it, because traces are sampled and expire. Start from the
  entity's event timeline, find the gap, then open the traces at that hop.
- Two caveats: the OTel messaging conventions are **Development** status, and `traceparent` in a
  Kafka header is OTel practice, **not a W3C standard**.
- Keep three identifiers apart: the message id (dedup), the key (order) and the correlation id
  (the flow).
- [[tracing-a-flow-through-a-message-broker]]

**9. Immutable forever, or correctable?** Both. **Never edit; append a correction.** One permitted
edit makes the store mutable and the audit trail is gone.

- Prefer a **full reversal** (reverse the whole entry, then record the right one), because an
  auditor can read it.
- **Deltas** reverse cleanly; overwrites do not.
- A correction is a **visible new fact** (a refund email), not a silent undo, and a saga's
  compensation gives no isolation.
- [[domain-events]]

**10. Stopping EDA becoming a distributed monolith.** An event that leaves its domain is a
**public API**: one owner, a registered schema, reviewed like an endpoint.

- **Translate** internal events into a coarser external model rather than leaking them (Young).
- **Notification vs event-carried state transfer** trades runtime coupling for schema coupling.
  Neither shape is the villain. The rot is consumers reading another domain's internals.
- "Distributed monolith" is a label **no primary source owns**. Argue from the mechanisms.
- [[events-as-public-contracts]]

The reach-for-it signal: any design with a broker on the whiteboard. Ask four questions: what is
the key, what happens on a duplicate, what happens on a replay, and who owns this event's schema.
Answering those four covers most of the round.

The mechanisms underneath are [[message-queues]] (shapes, delivery, ordering) and
[[event-sourcing-and-cqrs]] (the log as the source of truth). Reading order:
[[reading-order-for-event-driven-architecture]].
