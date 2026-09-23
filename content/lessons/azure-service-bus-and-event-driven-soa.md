---
id: 01M37YKV2EEHQ2GD9Y1SEAE79S
title: Azure Service Bus and event-driven SOA
topic:
  - system-design
  - distributed-systems
prerequisites:
  - message-queues
  - transactions-and-acid
---

"REST and message-based service-oriented architecture, asynchronous and event driven" is the
sentence a brief uses to say *the services do not call each other synchronously; they hand work
to a broker and move on.* The generic decisions behind that — [[message-queues|which shape of
queue, what delivery guarantee, how you order and how you shed load]] — do not change because the
broker is Azure's. What this Lesson adds is the layer a senior is actually asked to narrate on
top of them: the **concrete Service Bus building blocks**, and the **integration patterns**
(outbox, saga, command-versus-event) that only appear once several services share a bus. Reach
for [[message-queues]] for the theory; reach for this for the vocabulary you say out loud when the
whiteboard has "Azure Service Bus" on it.

## Service Bus is a broker, not a log — and that is the first fork

Azure has three messaging services and picking the wrong one is a down-level tell, so name the
distinction first. **Service Bus is enterprise *message* brokering; Event Hubs is *event
streaming*.** Microsoft draws the line as a data-model difference: Service Bus carries **"messages
(high-value payloads)"** where **"a contract exists between publisher and consumer"**, Event Hubs
carries **"event streams (time-ordered series)"** — telemetry, "distributed data streaming,
real-time analytics" ([Compare messaging
services](https://learn.microsoft.com/en-us/azure/service-bus-messaging/compare-messaging-services)).
This is the same **classic-queue-versus-log** fork [[message-queues]] draws generically: Service
Bus *forgets a message once it is handled*, Event Hubs is the **retained, partitioned, replayable**
log (it alone has "Capture / replay"; Service Bus has none). So a design that needs to **replay six
months of history** or fan a firehose of telemetry into analytics wants Event Hubs; order
processing, financial transactions, and workflows — one job done once, reliably, with a contract —
want Service Bus.

Inside Service Bus the second fork is **queue versus topic**:

- A **queue** is **point-to-point**: "First In, First Out (FIFO) message delivery to one or more
  *competing consumers* … only one message consumer receives and processes each message." That is
  the [[message-queues|classic competing-consumer]] shape — task distribution and **load
  leveling**, so "the consuming application only needs to handle average load instead of peak
  load."
- A **topic with subscriptions** is **publish/subscribe**, one-to-many: "each published message is
  made available to each subscription registered with the topic." A subscription "resembles a
  virtual queue" — so every competing-consumer trick still works *per subscriber* — and each
  subscription can carry a **filter** so it receives only the subset it cares about
  ([Queues, topics, and
  subscriptions](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions)).

The senior move is to pick the entity from **who needs the message**: one pool of workers draining
a work queue → a queue; several independent services each reacting to the same fact → a topic, so
you are not re-publishing the same event N times.

```quiz 01M37YKV2FD7NDW310XS914RR7
A team needs to ingest millions of IoT telemetry readings per second and let an analytics job
reprocess the last month of them through a new model. Which Azure service, and why?

- [x] Event Hubs, because it is a retained, partitioned event stream built for high-throughput ingestion and replay
  > Event Hubs is the log: "big data streaming and ingestion", time-ordered series, and the only
    one of the three with Capture / replay. High-volume telemetry that must be reprocessed is
    exactly the streaming-and-replay job Service Bus cannot do.
- [ ] Service Bus queue, because competing consumers scale the throughput of processing each reading
  > A Service Bus queue drops each message once one consumer completes it — no retention, so the
    month-long replay is impossible, and it is brokered messaging, not a streaming firehose.
- [ ] Service Bus topic, because multiple analytics subscribers each get a copy of every reading
  > Fan-out gets each team a live copy, but a topic keeps no history, so reprocessing last month is
    off the table; and it is sized for high-value messages, not millions-per-second telemetry.
- [ ] Event Grid, because it reactively routes each discrete telemetry event to a handler
  > Event Grid routes discrete state-change notifications for reactive, serverless work; it neither
    retains a stream nor is built for sustained multi-million-per-second ingestion and replay.
```

## Getting a message off safely — peek-lock, dead-letter, and sessions

The generic claim from [[message-queues]] — *design for at-least-once and make the consumer
idempotent* — has a concrete mechanism here, and it is worth being able to name. Service Bus offers
two **receive modes**:

- **Receive-and-delete** marks the message consumed the instant it is handed over. "If the consumer
  crashes before processing the message, the message is lost … This process is often called
  **at-most once** processing." Simplest, and fine only when a dropped message costs nothing.
- **Peek-lock** makes the receive **two-stage**: Service Bus **locks** the message so no other
  consumer can take it, hands it over, and waits for the application to **complete** it before
  marking it consumed. If the app cannot process it, it **abandons** (unlock, redeliver); if it
  takes too long, the **lock timeout** unlocks it; and — the case that matters — "if the
  application crashes after processing the message but before completing it, Service Bus redelivers
  the message when the application restarts. This process is often called **at-least once**
  processing" ([Queues, topics, and
  subscriptions](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions)).

That last line *is* the reason idempotency is not optional: the gap between "did the work" and
"told the broker I did the work" is a real window, and a crash inside it redelivers. Service Bus
gives you two tools to close it, and neither is magic — both compose to the **"effectively once"**
[[message-queues|the Kafka section describes]]:

- **Duplicate detection** — Service Bus "checks whether a message already exists … based on the
  application-controlled `MessageId`", and "when Service Bus receives a duplicate message, it
  ignores and drops the message"
  ([Transactional
  outbox](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-out-box-cosmos)).
  Microsoft itself calls duplicate detection **"exactly once" processing** — which is the folklore
  trap [[message-queues]] warns about: it is at-least-once *plus* a dedup check on a stable id, not
  a wire guarantee.
- **A [[idempotency-and-safe-retries|idempotent]] consumer** keyed off that same `MessageId`, so a
  redelivery duplicate detection missed is still a no-op.

Two more entities finish the picture, because an interviewer will ask "what happens to a message
that keeps failing?" and "how do you keep order?":

- The **dead-letter queue (DLQ)** is a sub-queue every queue and subscription has, where messages
  that exceed the delivery-attempt limit or expire are moved instead of blocking the queue behind
  them. It is the concrete home of the "shed to a dead-letter queue" move [[message-queues]] names
  under backpressure — a **poison message** goes to the DLQ and the workers keep draining live work.
- **Sessions** are Service Bus's answer to ordering. [[message-queues|Ordering is narrow]] — a log
  keeps order only within a partition — and Service Bus's version is that a **session** preserves
  **FIFO** for all messages sharing a `SessionId`, and a single consumer holds the session lock, so
  "events are processed in the correct sequence." Route all events for one aggregate to one
  `SessionId` and you get per-entity order without forcing one global queue; the comparison table
  lists Service Bus ordering as exactly **"FIFO (sessions)"**.

```quiz 01M37YKV2FP0FCZ1752GN0F7DH cloze
In {{peek-lock}} mode the receive is two-stage: the broker locks the message and waits for the app
to {{complete}} it, so a crash after doing the work but before that step causes a redelivery — which
is why the guarantee is {{at-least-once}} and the consumer must be {{idempotent}}. To keep all
events for one entity in order, give them the same {{SessionId}}.
```

## The dual-write problem, and why the outbox pattern exists

Here is the failure the whole "event-driven" architecture stands or falls on, and it is the single
richest thing to be able to narrate. A service does two things when an order is placed: it **writes
the order to its database** and it **publishes an `OrderCreated` event** to the bus. Those are two
separate systems, and there is no [[transactions-and-acid|ACID transaction]] spanning both. So the
naïve code —

```csharp
var result = _orderRepository.Create(order);          // 1. commit to the DB
_messagingService.Publish(new OrderCreatedEvent(result)); // 2. publish to the bus
```

— has a hole between the two lines. Microsoft names it exactly: "this approach works until an error
occurs between saving the order object and publishing the event", and then, from a "Network error",
a "Message service outage", or a "Host failure", "the system can't publish the `OrderCreated` event
… and other services aren't notified" — **lost events cause data inconsistencies across the
application**
([Transactional
outbox](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-out-box-cosmos)).
This is the **dual-write problem**: you cannot atomically update a database *and* a message broker,
and doing them in sequence loses one of them on a crash. (Flipping the order — publish first, then
write — only trades a lost event for a published event whose database change never happened, which
is worse.)

The **transactional outbox** dissolves it by making the publish a *database* write. You "save
events in … an outbox table in your database *before* it pushes them to a message broker … within
the same database transaction", so the transaction "either commits everything or rolls back
everything." Then "a separate service or worker process queries the outbox table for unhandled
entries, publishes them, and marks them as processed." The event now shares the order's atomic
commit — it cannot be lost — and the relay retries publishing until Service Bus acknowledges. That
relay is at-least-once by construction, so it leans on the **same duplicate-detection + idempotent
consumer** from the last section to make a re-published event harmless. Outbox, dedup, and
idempotency are one story: *commit the intent atomically, publish it reliably, absorb the duplicate
that reliability creates.*

```quiz 01M37YKV2FBB4SVEJQQDFS5PT8
A service commits an order to its database, then calls `bus.Publish(orderCreated)` on the next line.
An interviewer asks what breaks. What is the sharpest answer?

- [x] A crash between the two writes loses the event with no rollback — the dual-write problem — so use an outbox committed in the same transaction
  > There is no transaction across the DB and the broker. A network error or host failure after the
    commit but before the publish leaves the order saved and the event never sent. The outbox writes
    the event in the *same* DB transaction and a relay publishes it, so it can't be lost.
- [ ] Nothing breaks, because the database transaction already guarantees the publish also succeeds
  > The DB transaction covers only the database. The `Publish` call is a separate system with its
    own failure modes; the commit succeeding says nothing about whether the broker ever got the event.
- [ ] Publishing first and committing second fixes it, because the event is then guaranteed to be sent
  > That inverts the loss into a worse one: an event announcing an order whose row was never written.
    Reordering two non-atomic writes never makes them atomic — you need the outbox.
- [ ] It only breaks under high load, so a retry with backoff around the publish call is sufficient
  > A retry helps a transient publish failure but cannot survive the process crashing between the two
    writes — the in-memory event is gone. The fix is durability via the outbox, not just retries.
```

## Command versus event, and coordinating a workflow with a saga

Two more distinctions separate a fluent answer from a hand-wave. The first is **message intent**.
Microsoft's saga docs put it precisely: **"a *command* encapsulates all information needed to
perform an action"**, whereas **"an *event* refers to a state change that affects an entity"**
([Saga pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)). A command is
addressed — *do this* — and couples the sender to one recipient's capability; an event is a
broadcast fact — *this happened* — and the publisher "has no expectation about how the event is
handled." Prefer **events for decoupling** (a Service Bus topic, fan-out, add a subscriber without
touching the publisher) and reserve **commands** for when you genuinely need one service to make
another act.

The second is the workflow question: **how do you keep data consistent across services when there
is no distributed transaction?** [[transactions-and-acid|ACID]] holds inside one service's
database, but "traditional transaction models like two-phase commit" are "better suited" being
replaced by the **saga pattern** across microservices. A saga breaks a business transaction into a
"sequence of *local transactions*", each of which "completes its work atomically within a single
service" and "initiates the next transaction via an event or message." There is no rollback across
services, so failure is handled by **compensating transactions** — "a series of compensating
transactions … undoes the changes that the preceding local transactions made" (cancel the payment,
release the stock). The two ways to coordinate one are a genuine fork:

- **Choreography** — "services exchange events without a centralized controller"; each local
  transaction publishes events that trigger the next. It "doesn't introduce a single point of
  failure" and suits **simple workflows**, but "workflow can be confusing when you add new steps"
  and there is "a risk of cyclic dependency between saga participants."
- **Orchestration** — "a centralized controller, or *orchestrator*, … tells the participants which
  operation to perform." It suits **complex workflows**, "avoids cyclic dependencies", and gives a
  "clear separation of responsibilities" — at the cost of "a point of failure because the
  orchestrator manages the complete workflow" and the coordination logic you must build.

The senior instinct: choreography for a short, stable chain of reactions; orchestration once the
workflow has enough steps or branches that *nobody can say what the current state is* without a
component whose job is to know.

```quiz 01M37YKV2F2CSW69660G7QV25R recall
An interviewer says: "Placing an order touches Payment, Inventory, and Shipping, each with its own
database. How do you keep them consistent without a distributed transaction, and how would you
coordinate it?" Give the answer you would say out loud.

> I wouldn't reach for two-phase commit across three services — I'd model it as a **saga**: a
> sequence of **local transactions**, each committing atomically in one service's own database and
> then emitting an **event** (this happened) or a **command** (do this) that triggers the next step.
> There's no cross-service rollback, so if a step fails I run **compensating transactions** that
> undo the earlier ones — refund the payment, release the reserved stock.
>
> On coordination it's choreography versus orchestration. **Choreography** is services reacting to
> each other's events with no central controller — no single point of failure, great for a short
> chain, but it gets hard to follow and risks cyclic dependencies as steps grow. **Orchestration**
> puts a central **orchestrator** in charge of the sequence and the compensations — clearer and
> cycle-free for a complex workflow, but the orchestrator is itself a component to run and a point
> of failure. For a three-step order flow that's likely to grow branches, I'd lean orchestration.
>
> And every participant is **idempotent** keyed off a message id, because the bus is at-least-once
> and the retryable steps after the point of no return will see redeliveries.
```

## The trade against synchronous REST

Everything above is the cost side of a single decision: **replace a synchronous REST call with a
message.** Say what it buys and what it charges, because the interviewer is listening for the
trade, not the enthusiasm.

- **Coupling** — a queue gives **temporal decoupling**: "producers and consumers don't have to send
  and receive messages at the same time", and a consumer "can be upgraded without affecting the
  producer." A synchronous REST call needs the callee up *right now*; a message does not.
- **Load and backpressure** — the queue is **load leveling**, so a service sizes for average not
  peak — but it is still the finite buffer [[message-queues|backpressure]] insists on: you alert on
  queue depth and decide what gives when consumers fall behind, rather than letting the backlog grow
  until it falls over.
- **Failure isolation** — a slow or dead downstream behind a bus is a growing queue, not a cascade
  of blocked request threads back through the caller. That is [[bulkheads-and-blast-radius|blast-radius
  containment]] by construction: the failure is trapped at the queue instead of propagating up a
  synchronous call chain.

The bill is **eventual consistency** (the reader sees the world after the queue's lag), a **broker
to run** as its own tier and potential single point of failure, and the **dual-write / ordering /
duplicate** problems this Lesson spent its length on — none of which a plain REST call has. Async is
resilience and decoupling bought with consistency and operational complexity; a senior answer names
both sides and says which the workload can afford.

## What to take away

Message-based SOA on Azure is [[message-queues|the same queue decisions]] plus a concrete
vocabulary. **Service Bus is a broker** (messages, contracts, order processing) and **Event Hubs is
the log** (streams, telemetry, replay) — pick by whether anyone replays history. Inside Service Bus,
a **queue** is competing-consumer point-to-point and a **topic** is filtered pub/sub fan-out.
**Peek-lock** makes delivery at-least-once (lock → complete, with a redelivery window on crash), so
lean on **duplicate detection** (a dedup check on `MessageId`) and an **[[idempotency-and-safe-retries|idempotent]]**
consumer; a **DLQ** absorbs poison messages and **sessions** give per-`SessionId` FIFO. The
**outbox pattern** is the load-bearing one — it kills the **dual-write problem** by committing the
event in the [[transactions-and-acid|same transaction]] as the state change and relaying it later.
Coordinate cross-service work as a **saga** of local transactions with **compensating transactions**,
choosing **choreography** (events, no controller, simple) or **orchestration** (a central
orchestrator, complex, a SPOF). And every one of these is the cost of trading a synchronous REST call
for a message: decoupling and failure isolation, paid for in eventual consistency and a broker to run.

Worth reading in full: Microsoft's [Compare messaging
services](https://learn.microsoft.com/en-us/azure/service-bus-messaging/compare-messaging-services)
for the Service-Bus-versus-Event-Hubs line, and the [Saga
pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga) for the choreography
/ orchestration fork and compensating transactions — the two ideas an event-driven design round
turns on most.
