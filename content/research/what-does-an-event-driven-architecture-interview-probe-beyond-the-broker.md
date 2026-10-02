---
id: 01M3YMN9NAQRR2QFGM0AN158FS
title: What does an event-driven architecture interview probe beyond the broker?
date: 2026-10-02
topic:
  - distributed-systems
  - system-design
sources:
  - https://martinfowler.com/articles/201701-event-driven.html
  - https://martinfowler.com/eaaDev/EventSourcing.html
  - https://martinfowler.com/bliki/CQRS.html
  - https://martinfowler.com/bliki/DDD_Aggregate.html
  - https://martinfowler.com/articles/microservices.html
  - https://martin.kleppmann.com/papers/olep-acm-queue.pdf
  - https://martin.kleppmann.com/2015/01/29/stream-processing-event-sourcing-reactive-cep.html
  - https://microservices.io/patterns/data/transactional-outbox.html
  - https://microservices.io/patterns/data/transaction-log-tailing.html
  - https://microservices.io/patterns/communication-style/idempotent-consumer.html
  - https://microservices.io/patterns/data/saga.html
  - https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html
  - https://kafka.apache.org/intro
  - https://kafka.apache.org/43/design/design/
  - https://kafka.apache.org/41/configuration/producer-configs/
  - https://docs.kurrent.io/clients/tcp/dotnet/21.2/appending
  - https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/
  - https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
  - https://leanpub.com/read/esversioning/leanpub-auto-why-cant-i-update-an-event
  - https://leanpub.com/read/esversioning/leanpub-auto-basic-type-based-versioning
  - https://leanpub.com/read/esversioning/leanpub-auto-weak-schema
  - https://leanpub.com/read/esversioning/leanpub-auto-whoops-i-did-it-again
  - https://leanpub.com/read/esversioning/leanpub-auto-internal-vs-external-models
  - https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
  - https://www.enterpriseintegrationpatterns.com/patterns/messaging/EventMessage.html
  - https://www.enterpriseintegrationpatterns.com/patterns/messaging/CommandMessage.html
  - https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html
  - https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html
  - https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageSequence.html
  - https://www.enterpriseintegrationpatterns.com/patterns/messaging/Resequencer.html
  - https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
  - https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
  - https://www.w3.org/TR/trace-context/
  - https://github.com/w3c/trace-context/issues/504
---

This is a Workshop note: it exists so that authoring has somewhere to put an
investigation, and the reader never sees it.

## The question

Once a candidate has picked a broker, what does a senior event-driven-architecture (EDA)
interview go on to probe? Ten sub-questions follow, taken from a Medium teaser that listed
them with one-line "indicative" answers. That article is **only the question map**: it is not
cited anywhere below, and every claim here goes back to the source that owns it. Those
sources are specs (CloudEvents, W3C Trace Context, the OpenTelemetry semantic conventions),
first-party docs (Kafka, Confluent, Debezium, Flink, Kurrent/EventStoreDB) and the original
authors' own writing (Fowler, Kleppmann, Richardson, Hohpe & Woolf, Greg Young). *Designing
Data-Intensive Applications* ch. 11 was not reachable as text, so Kleppmann is cited from his
own ACM Queue paper "Online Event Processing" (Kleppmann, Beresford & Svingen, 2019), hereafter
**OLEP**, and from his blog. Each section ends with a **Verdict for an interview**: the stance
you can defend, and where the indicative answer oversimplifies.

## 1. Business consistency under eventual consistency and reordering

**Answer.** Order is a property of a partition, not of the system, so you buy the ordering you
need by keying events to the entity whose invariant matters. Kafka: "Events with the same event
key (e.g., a customer or vehicle ID) are written to the same partition, and Kafka guarantees
that any consumer of a given topic-partition will always read that partition's events in
exactly the same order as they were written" ([Kafka intro](https://kafka.apache.org/intro)).
OLEP is explicit that the log scales "by having many partitions ... and to have no ordering
guarantee across different log partitions," and that the events of a single partition "are
processed sequentially on a single thread, using deterministic logic"
([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)).

**Invariants live where the writes are serialised.** OLEP's payments example is the clearest
primary statement of "enforce at the domain boundary, not downstream": the user appends a
payment *request* that "merely indicates the intention to transfer funds; it does not imply
that the transfer has been successful," and a "single-threaded payment executor" subscribed to
the source-account log "deterministically checks whether the payment request should be allowed,
based on the current balance" before it emits the outgoing and incoming payment events
([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)). In DDD terms that executor is
an aggregate: "Transactions should not cross aggregate boundaries"
([Fowler, DDD Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html)). Downstream
consumers only ever see facts that have already passed the check.

**Versioned aggregates and stale writes.** At the write side, an event store's optimistic
concurrency check is the version guard: "Append operation supports an optimistic concurrency
check on the version of the stream to which events are appended," and `ExpectedVersion.Any`
"disables the check" ([Kurrent/EventStoreDB](https://docs.kurrent.io/clients/tcp/dotnet/21.2/appending)).
At the read side, EIP's Message Sequence gives each message a "position identifier" that
"uniquely identifies and sequentially orders each message"
([EIP](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageSequence.html)),
and a Resequencer is "a stateful filter ... to collect and re-order messages" using "an
internal buffer to store out-of-sequence messages"
([EIP](https://www.enterpriseintegrationpatterns.com/patterns/messaging/Resequencer.html)). A
consumer that carries a per-entity version can either buffer (resequence) or drop anything at
or below the version it already applied.

**Event time vs processing time.** Flink owns these definitions: processing time "refers to the
system time of the machine that is executing the respective operation"; event time "is the time
that each individual event occurred on its producing device." A watermark declares "there should
be no more elements from the stream with a timestamp t' <= t," and yet "certain elements will
violate the watermark condition" and arrive late
([Flink, Timely stream processing](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/)).

**Verdict for an interview.** Name the invariant, name the entity that owns it, key by that
entity, and check the invariant in the one place writes for it are serialised. The indicative
answer's "reject stale events" is right only for **state-carrying** events where the latest
version wins (a profile snapshot); for **delta** events (a debit) rejecting one is data loss, and
the consumer has to resequence instead. And event time is a business-reporting concern
(windows, late data), not a substitute for per-entity sequence numbers: clocks on producing
devices are not an ordering mechanism.

## 2. Loss, duplication and reprocessing are three different problems

**Loss** is a producer-and-broker property. Kafka's `acks=all` means the "leader will wait for
the full set of in-sync replicas to acknowledge the record. This guarantees that the record will
not be lost as long as at least one in-sync replica remains alive"; `acks=0` means the record is
"considered sent" once it is in the socket buffer; the default is `all`
([Kafka producer configs](https://kafka.apache.org/41/configuration/producer-configs/)). The
design docs pair `acks=all` with the broker-side `min.insync.replicas` and with unclean leader
election disabled ([Kafka design](https://kafka.apache.org/43/design/design/)).

**Duplication on the write path** is what the idempotent producer fixes: `enable.idempotence`
"ensures that exactly one copy of each message is written in the stream," defaults to `true`,
and requires `acks=all`, `retries > 0` and `max.in.flight.requests.per.connection <= 5`
([Kafka producer configs](https://kafka.apache.org/41/configuration/producer-configs/)). It
dedups the producer's own retries and nothing else.

**Duplication on the read path** is the consumer's. Kafka is at-least-once by default, and for
output to an external system it recommends storing the consumer offset alongside the output
rather than relying on two-phase commit ([Kafka design](https://kafka.apache.org/43/design/design/)).
Richardson's Idempotent Consumer records processed message IDs in a `PROCESSED_MESSAGES` table
keyed `(subscriberId, messageID)` inside the same transaction as the business change, so a
duplicate's insert fails and is discarded
([microservices.io](https://microservices.io/patterns/communication-style/idempotent-consumer.html)).
EIP names the two options: "Explicit 'de-duping'" or "Defining the message semantics to support
idempotency" ([EIP, Idempotent Receiver](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html)).
CloudEvents makes the dedup key a spec requirement: "Producers MUST ensure that `source` + `id`
is unique for each distinct event," and consumers "MAY assume that Events with identical
`source` and `id` are duplicates" ([CloudEvents](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)).

**Reprocessing** is a deliberate re-read, and it is a determinism problem rather than a dedup
problem: OLEP says a recovered subscriber "may process some events twice ... but it never skips
any events," so "state updates must also be idempotent," and the deterministic executor "will
make the same decisions to approve or decline requests" on recovery
([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)). See Q4.

**Verdict for an interview.** Keep the three apart and give each its own mechanism: durability
(acks, ISR), dedup at the consumer (message ID stored transactionally with the effect), and
determinism for replay. The indicative stance is right; the trap is believing the idempotent
producer or Kafka "exactly-once" makes the consumer safe. OLEP: frameworks "with exactly-once
semantics still exhibit at-least-once processing when interacting with external storage and
rely on idempotence" ([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)). See
[[idempotency-and-safe-retries]] and [[message-queues]].

## 3. When not to use EDA, even at scale

**Answer.** When the caller needs an answer now, when reads must be consistent across services,
or when the team cannot afford a flow nobody can see. OLEP's own "Disadvantages" section:
"there is no upper bound on the time until an event is processed," so a client reading two
stores updated by different consumers "may be inconsistent," and "the OLEP approach does not
provide isolation for read requests that are sent directly to data stores"
([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)). Fowler on event notification:
"It can be hard to see such a flow as it's not explicit in any program text ... you're losing
sight of that larger-scale flow, and thus set yourself up for trouble in future years"
([Fowler, What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html)).
His microservices article concedes that choreography "leads to emergent behavior" and that
"emergent behavior can sometimes be a bad thing," and frames the choice as whether "the cost
of fixing mistakes is less than the cost of lost business under greater consistency"
([Fowler & Lewis, Microservices](https://martinfowler.com/articles/microservices.html)). On the
heavier patterns EDA tends to drag in: "for most systems CQRS adds risky complexity"
([Fowler, CQRS](https://martinfowler.com/bliki/CQRS.html)).

**Verdict for an interview.** "Scale" is not a reason on its own: a partitioned database or a
horizontally scaled synchronous service scales too. Refuse EDA where a user-facing request needs
a decision in its own response (an authorisation, a seat booking), where a cross-entity read must
be consistent, or for simple CRUD with one consumer. The indicative answer usually stops at
"strong consistency"; the sharper point from OLEP is that the anomaly is an **isolation** one,
the same one a read-committed database exhibits, so name the isolation level you would need.

## 4. Replaying millions of old events without corrupting current state

**Answer.** Make the distinction between source of truth and derived state explicit, then make
derived-state consumers deterministic and side-effect-free on replay. Kleppmann: "The database
you read from is just a cached view of the event log," and "If you deploy buggy code that writes
bad data to a database, you can just re-run it after you fixed the bug"
([Kleppmann blog, 2015](https://martin.kleppmann.com/2015/01/29/stream-processing-event-sourcing-reactive-cep.html)).

**Side effects need a gateway that knows it is a replay.** Fowler: if "events cause update
messages to be sent to external systems, then things will go wrong because those external
systems don't know the difference between real processing and replays"; the fix is gateways
that "be able to be disabled during the replay processing ... in a way that's invisible to the
domain logic." External *queries* are the mirror problem: "If I ask for an exchange rate on
December 5th and replay that event on December 20th, I will need the exchange rate on Dec 5,"
so the gateway "remembers the responses to its queries and uses them during replay"
([Fowler, Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)).

**Version-aware logic.** Fowler: "The domain model should be able to run events at any time with
the correct rules for the event processing" — the rules in force when the event happened, not
today's ([Fowler, Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)). Greg
Young's email example shows why mutable history breaks this: edit a username event after the
welcome email went out and a replayed projection no longer matches what the customer received
([Young, Why can't I update an event?](https://leanpub.com/read/esversioning/leanpub-auto-why-cant-i-update-an-event)).

**Verdict for an interview.** Replay rebuilds **projections**; it never re-sends emails or
re-captures payments. Rebuild into a new projection and swap, route every side effect through a
gateway that is off (or recorded) during replay, and record external lookups with the event. The
indicative "deterministic consumers" is necessary but not sufficient: a consumer can be
deterministic and still call a payment API. See [[event-sourcing-and-cqrs]].

## 5. What the transactional outbox solves, and what it does not

**Solves.** "How to atomically update the database and send messages to a message broker?" —
without 2PC. Messages are written to an outbox table in the same transaction, and "Messages are
guaranteed to be sent if and only if the database transaction commits"
([Richardson, Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)).
It also preserves the order the application wrote them (same source). Debezium's outbox router
turns `aggregateid` into the Kafka message key, "important for maintaining correct order in
Kafka partitions," and puts the outbox `id` in a header so consumers can "remove duplicate
messages" ([Debezium outbox event router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)).

**Does not solve.** Duplicates: "The Message relay might publish a message more than once," so
"a message consumer must be idempotent, perhaps by tracking the IDs of the messages that it has
already processed" ([Richardson](https://microservices.io/patterns/data/transactional-outbox.html));
the log-tailing relay lists "Tricky to avoid duplicate publishing" among its drawbacks
([Richardson, Transaction log tailing](https://microservices.io/patterns/data/transaction-log-tailing.html)).
Ordering beyond one aggregate: Debezium only orders by key within a partition. Downstream
consistency: it guarantees the event leaves; it says nothing about whether the consumer's
own state change succeeds, which is a saga's problem (Q7, Q9). And Richardson lists the human
drawback that developers "may forget to publish messages after database updates."

**Verdict for an interview.** The outbox closes the **dual-write** gap and nothing else. The
indicative stance is right; say explicitly that it converts "lost event" into "duplicate event,"
which is why it is always paired with an idempotent consumer.

## 6. Evolving event schemas while several consumer versions are live

**Answer.** Pick a compatibility mode and let the registry enforce it, make additive changes,
and treat anything non-convertible as a new event type. Confluent defines BACKWARD as
"consumers using new schema can read data written with old schema," FORWARD as "consumers
using old schema can read data written with new schema," FULL as both, and the `_TRANSITIVE`
variants as holding against every earlier version rather than just the last; the default is
BACKWARD. Upgrade order follows: BACKWARD means "Upgrade consumers before producers," FORWARD
means producers first, FULL means "Upgrade independently." Adding or removing an *optional*
field is allowed in all three; adding a required field is forward-only, removing one
backward-only ([Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)).

Greg Young sets the rule for explicit versioning: "A new version of an event must be convertible
from the old version of the event. If not, it is not a new version of the event but rather a new
event." Upcasting passes old events "through some converters that move it forward in terms of
version" so the domain sees only the latest
([Young, Basic type based versioning](https://leanpub.com/read/esversioning/leanpub-auto-basic-type-based-versioning)).
His weak-schema alternative maps by name — present in both takes the value, present only in the
data is ignored, present only on the type gets a default — at the price that "you are no longer
allowed to rename something" ([Young, Weak schema](https://leanpub.com/read/esversioning/leanpub-auto-weak-schema)).
CloudEvents' `dataschema` attribute identifies the schema the payload adheres to, with a
different URI expected for incompatible changes
([CloudEvents](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)).

**Verdict for an interview.** Say "FULL_TRANSITIVE for a widely consumed event, additive and
optional changes only, a new event type for a change of meaning, and old events upcast on read,
never rewritten." The indicative stance lumps these together; the precise point is that
**backward vs forward decides who deploys first**, and that the non-transitive modes only check
against the previous version, which is not enough when a log retains events for years.

## 7. Event-driven vs message-driven: events, commands, and the drift to orchestration

**Answer.** An event states a fact; a command requests an action. CloudEvents defines an
occurrence as "the capture of a statement of fact during the operation of a software system"
([CloudEvents](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)). EIP: a
Command Message is used "to reliably invoke a procedure in another application"
([EIP](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CommandMessage.html)),
while for an Event Message "Many events are empty; their mere occurrance tells the observer to
react" ([EIP](https://www.enterpriseintegrationpatterns.com/patterns/messaging/EventMessage.html)).
Fowler names the anti-pattern: "An event is used as a passive-aggressive command. This happens
when the source system expects the recipient to carry out an action, and ought to use a command
message to show that intention, but styles the message as an event instead"
([Fowler](https://martinfowler.com/articles/201701-event-driven.html)).

Richardson's saga gives the two coordination styles: choreography, where "Each local transaction
publishes domain events that trigger local transactions in other services," and orchestration,
where "An orchestrator (object) tells the participants what local transactions to execute";
choreography's listed drawback is cyclic dependencies between services
([Richardson, Saga](https://microservices.io/patterns/data/saga.html)).

**Verdict for an interview.** Use events for facts other domains may react to, commands where one
service needs another to do something and cares whether it did, and an orchestrator once a flow
has enough steps that nobody can draw it. The "drift into orchestration" in the indicative answer
is real as a smell — a growing set of passive-aggressive events is an orchestrator nobody wrote
down — but the primary sources frame orchestration as a legitimate choice, not a failure; say so.
See [[domain-events]] and [[azure-service-bus-and-event-driven-soa]].

## 8. Debugging one flow across ten services

**Answer.** Carry two different things in message metadata: a business correlation ID and a
trace context. EIP's Correlation Identifier is "a unique identifier that indicates which request
message this reply is for" ([EIP](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html));
OpenTelemetry's `messaging.message.conversation_id` is "Sometimes called 'Correlation ID'," and is
distinct from `messaging.message.id`, and the Kafka key attribute is "not unique"
([OTel messaging attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/)).
W3C Trace Context's `traceparent` carries version, a 16-byte trace-id, an 8-byte parent-id and
flags; the Recommendation is "defined for HTTP" and defers other protocols to extension specs
([W3C Trace Context](https://www.w3.org/TR/trace-context/)).

The OTel messaging conventions decide the trace shape. "A producer SHOULD attach a message
creation context to each message," and "For each message it accounts for, the 'Process' or
'Receive' span SHOULD link to the message's creation context." Parent/child is the exception:
"Exclusively for single messages scenarios, the 'Process' span MAY use the message's creation
context as its parent," and it is "NOT RECOMMENDED" by default when processing happens inside
another span. The reason given is that links are "the only option to correlate producer and
consumer(s) in batch scenarios as a span can only have a single parent"
([OTel messaging spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)).
OLEP adds the business-side version: "The original event ID is included in all of these
generated events so that their origin can be traced" ([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)).

**Verdict for an interview.** Propagate creation context per message in headers, link (do not
parent) batch consumers, and keep a business correlation/causation ID alongside it, because
a trace is sampled and expires while an event timeline is queried by order ID weeks later. The
indicative answer is right; the nuance most candidates miss is **links vs parent**. Note also
that the conventions are still **Development** status. See [[trace-context-across-retries]].

## 9. Immutable events and corrections

**Answer.** Never edit; append a correcting event. Young: allowing one edit makes your data
"definitely maybe immutable. Also known as mutable," and "The moment you allow a single edit of
an event, maintaining a proper audit log becomes impossible"
([Young, Why can't I update an event?](https://leanpub.com/read/esversioning/leanpub-auto-why-cant-i-update-an-event)).
His corrections chapter takes the accountant's line — accountants "don't erase things in the
middle of their ledgers" — and distinguishes a **partial reversal** (book only the difference)
from a **full reversal** (reverse the whole entry, then record the correct one), advising
"Always consider the auditor's perspective"
([Young, Whoops, I did it again](https://leanpub.com/read/esversioning/leanpub-auto-whoops-i-did-it-again)).
Fowler adds the design constraint that makes reversal possible: "'add $10 to Martin's account'
as opposed to 'set Martin's account to $110'. In the former case I can reverse by just
subtracting $10, but in the latter case I don't have enough information"
([Fowler, Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)). In a saga the
same idea is a compensating transaction that "undo[es] the changes that were made by the
preceding local transactions" ([Richardson](https://microservices.io/patterns/data/saga.html)).

**Verdict for an interview.** The audit trail is the sequence *including* the mistake and its
reversal; that is what makes it an audit trail. Prefer full reversal where an auditor will read
it. The indicative answer omits that a compensation is a new business fact other consumers see
(a refund email, not a silent undo), and that a saga's compensation gives no isolation: other
sagas may have read the intermediate state.

## 10. Keeping EDA from becoming a distributed monolith

**Answer.** Own your events, publish a deliberate external contract, and choose payload size
knowingly. Fowler's two shapes trade differently: event notification keeps the source ignorant
of consumers ("the source system doesn't really care much about the response"), whereas
event-carried state transfer lets consumers avoid calling back, giving "Greater resilience,
since the recipient systems can function if the customer system becomes unavailable," at the
cost of replicated data ([Fowler](https://martinfowler.com/articles/201701-event-driven.html)).
Greg Young is the primary source for the coupling argument: internal events are fine-grained and
using them as an external API "will likely start to blur your service boundaries"; he publishes
a separate, coarser external model through a dedicated translator, because external models
"tend to be much more conservative in how they approach change" and "changes to a contract
require a change in every user of the contract"
([Young, Internal vs external models](https://leanpub.com/read/esversioning/leanpub-auto-internal-vs-external-models)).
Microservices are meant to be "as decoupled and as cohesive as possible," with "smart endpoints
and dumb pipes" ([Fowler & Lewis](https://martinfowler.com/articles/microservices.html)).

**Verdict for an interview.** An external event is a **public API**: owned by one domain, schema
registered under a compatibility mode (Q6), reviewed like an endpoint, and translated from
internal events rather than leaked. The indicative stance tends to cast event-carried state
transfer as the coupling villain; the sources say the reverse is just as true — ECST removes
*runtime* coupling and adds *schema* coupling, and notification does the opposite. The rot is
consumers reading another domain's internal fields, whichever shape carries them.

## Unverified, or where the sources disagree

- **DDIA ch. 11 itself was not read.** Kleppmann is cited from the OLEP paper (ACM Queue,
  2019) and his 2015 blog post, both his own writing. OLEP's text was extracted from the PDF by
  hand, so quotations are faithful but page numbers are not given.
- **The main Kafka docs page did not render.** Delivery semantics and durability came from the
  versioned design page (4.3) and producer configs page (4.1), partly through a summarising
  fetcher; the "store the offset alongside the output" recommendation is paraphrased, not
  quoted.
- **Greg Young's book** was read chapter by chapter through Leanpub's free reader, via a
  summarising fetcher. "Accountants don't erase things in the middle of their ledgers" and the
  partial/full reversal distinction are from "Whoops, I Did It Again"; exact wording should be
  re-checked against the chapter before quoting it in a Lesson.
- **W3C Trace Context has no Kafka binding.** The Recommendation is HTTP-only; AMQP and MQTT
  bindings exist as drafts, and a Kafka binding is an open issue labelled "revisit-later"
  ([w3c/trace-context#504](https://github.com/w3c/trace-context/issues/504)). Putting
  `traceparent` in Kafka headers is OTel instrumentation practice, not a W3C standard.
- **The OTel messaging conventions are Development status**, so the links-vs-parent guidance can
  still change.
- **"Drift into orchestration"** (Q7) and **"distributed monolith"** (Q10) are industry framing
  with no owning primary source; the underlying mechanisms are sourced, the labels are not.
- **The Polling Publisher page** on microservices.io could not be fetched; its ordering and
  duplicate claims are therefore not used.
- **Disagreement on "exactly-once":** Kafka's docs describe the idempotent producer as
  strengthening delivery "to exactly once," while OLEP says exactly-once frameworks "still exhibit
  at-least-once processing when interacting with external storage." Both are true at their own
  scope — inside Kafka vs end to end — and an interview answer should name the scope.
