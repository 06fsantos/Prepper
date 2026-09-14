---
id: 01M22X5XHGFJECP8ZW45K5W60Q
title: Message queues
topic:
  - system-design
  - distributed-systems
---

A message queue is asynchronous middleware that lets a producer hand off work without waiting
for the consumer to finish it — the two are decoupled in time. It is one of the
[[system-design-building-blocks|building blocks]] a design round expects you to **select and
justify** rather than name, and, like every one of them, it is
[[system-design-is-graded-on-process|graded on the reasoning]]: drawing a box labelled "queue"
earns nothing; saying which of three shapes it is, what delivery guarantee it gives, and what
you did about ordering and backpressure is the signal. This Lesson is those decisions.

## Three shapes, and choosing between them is the whole question

"Message queue" is a loose name for three genuinely different things, and the first job in the
round is to say which one you mean and why.

- A **classic queue** (RabbitMQ, AMQP) fans one message out to a pool of *competing consumers*
  and drops it once a consumer acknowledges it. Each message is handled **once, by one of N
  workers**, so you scale throughput by adding workers. Reach for it for task distribution — a
  job that has to be done once: resize this image, send this email, charge this card.
- A **log** (Kafka) is not a queue at all in the drop-on-read sense: it is an **append-only,
  partitioned, retained** sequence of events. "Events in a topic can be read as often as needed
  — unlike traditional messaging systems, events are not deleted after consumption," and are
  kept "for as long as you want" ([Apache Kafka](https://kafka.apache.org/intro)). Reach for a
  log when several independent consumers each need the *full* stream, when you need to **replay**
  history — reprocess after a bug, backfill a new consumer, recover from a bad deploy — or when
  you need ordering within a partition at high throughput.
- **Pub/sub** delivers each message to *every* subscriber rather than to one consumer of a group.
  Reach for it for event broadcast and fan-out, where N interested parties each want their own
  copy.

The distinction that trips people up is **classic queue versus log**, because both look like "a
pipe you put messages in." The tell is *what happens after a message is read*. A classic queue
forgets it; a log keeps it, so a second consumer — or the same consumer a week later — can read
the whole history again. That retention is the entire reason to pay for a log, and the reason to
*not* reach for one when a fire-and-forget work queue would do.

```quiz 01M22X5XHG7GYXG4XRCTBAGE87
A fraud-detection team and a billing team both need to process every "order placed" event, and
the fraud team wants to re-run six months of history through a new model. Which shape fits, and
why?

- [x] A log, because multiple independent consumers each need the full retained stream and one needs to replay history
  > A log is append-only and retained, so both teams read the same events independently and the
    fraud team can reprocess the backlog from the start — replay is exactly what a log buys that a
    classic queue cannot.
- [ ] A classic queue, because competing consumers scale the throughput of processing each order
  > A classic queue hands each message to *one* of its consumers and drops it on ack, so the two
    teams would fight over messages and neither could replay — the retention the ask needs is gone.
- [ ] Pub/sub with no retention, because each team simply subscribes to the order events it wants
  > Fan-out gets both teams a live copy, but plain pub/sub keeps no history, so the six-month
    replay is impossible — the retention requirement is what forces a log over bare pub/sub.
- [ ] Any of them, because all three deliver the order events and the choice is purely operational
  > The replay-the-backlog requirement decides it: only a retained log can serve history a team
    asks for after the fact, so this is a correctness fork, not an ops preference.
```

## Delivery semantics, and interrogating "exactly once"

The trade-off that matters most, and the one an interviewer will push on, is **delivery
semantics**. There are three guarantees:

- **At-most-once** — fire and forget. The message may be lost, never duplicated. Cheap, and fine
  only when a dropped message costs nothing.
- **At-least-once** — retry until acknowledged. The message is never lost, but may be
  **delivered more than once**. This is the default a classic queue gives you.
- **Exactly-once** — the message takes effect once, no loss and no duplicate.

Here is the senior correction to interview folklore, and it is worth saying out loud because it
is the single biggest trap: **there is no "exactly once" you turn on at the wire.** True
exactly-once *delivery* over an unreliable network is not a thing a broker gives you. What the
industry calls exactly-once is really **"effectively once"** — at-least-once delivery *plus*
idempotent processing or deduplication somewhere. Both primary brokers say so.

RabbitMQ is explicit that its model is at-least-once: any unacknowledged delivery "is
automatically requeued" when a channel or connection drops, and therefore "consumers must be
prepared to handle redeliveries and otherwise be implemented with idempotence in mind"
([RabbitMQ — consumer acknowledgements](https://www.rabbitmq.com/docs/confirms)). A duplicate is
a normal event, not a fault, and the consumer is where you handle it.

Kafka does advertise "exactly-once," but it is a **composed guarantee, not a wire primitive**. Its
foundation is producer-side **deduplication**: the idempotent producer is assigned a unique producer
id (PID) and stamps each message with a per-partition sequence number; the broker tracks the highest
sequence it has seen and rejects any retried message at or below it, so a producer retry after a
network hiccup does not append the same record twice
([Kafka KIP-98 / Idempotent Producer](https://cwiki.apache.org/confluence/display/KAFKA/Idempotent+Producer)).
Kafka builds its end-to-end exactly-once *processing* (its "EOS") on top of that, with transactions
that commit a consumer's offset and its output atomically. But the idempotent producer on its own
solves only the duplicates *the producer* creates on retry: a *consumer* that processes a record,
crashes before committing its offset, and reprocesses it on restart is a duplicate you absorb
yourself unless you have adopted that transactional machinery.

So the honest design stance is: assume **at-least-once**, and make the consumer
[[idempotency-and-safe-retries|idempotent]] so that handling the same message twice has the same
effect as handling it once. This is the same idempotency that makes an HTTP retry safe — a
dedup key you have already seen is a no-op:

```csharp
// A message consumer that is safe under at-least-once delivery.
// The broker may hand us the same message again after a crash or a missed ack;
// idempotency makes the second handling a no-op instead of a double charge.
public async Task HandleAsync(OrderPlaced msg, CancellationToken ct)
{
    // MessageId is a stable key the producer stamped once, per business event.
    if (await _processed.SeenAsync(msg.MessageId, ct))
        return; // already applied — a duplicate delivery, not new work

    await _billing.ChargeAsync(msg.OrderId, msg.Amount, ct);
    await _processed.RecordAsync(msg.MessageId, ct); // mark done, then ack
}
```

The dedup store and the side effect ideally commit together (or you record-then-ack carefully),
because the gap between "did the work" and "remembered doing it" is where a duplicate slips
through — which is the same reason "exactly once" is effectively-once and not magic.

```quiz 01M22X5XHGV6DS59D5ASSAVM3C
An interviewer says: "I'll just turn on exactly-once delivery so my consumer never sees a
duplicate." What is the sharpest correction?

- [x] There is no wire-level exactly-once; it is at-least-once plus dedup, so the consumer must still be idempotent
  > Exactly-once end-to-end is "effectively once" — at-least-once delivery with deduplication.
    Kafka's version is producer-side PID + sequence dedup; a consumer that crashes after doing the
    work and before committing still reprocesses, so idempotency is not optional.
- [ ] That is correct, because the broker's exactly-once flag removes every duplicate on the wire
  > No broker gives true once-only delivery over an unreliable network; both Kafka and RabbitMQ
    say the application must be idempotent. Treating the flag as a guarantee is the exact trap.
- [ ] Exactly-once works, but only if you also disable all producer retries to avoid resends
  > Disabling retries trades duplicates for lost messages (at-most-once); it does not deliver
    exactly-once, and Kafka's idempotent producer exists precisely so retries are safe.
- [ ] It is fine as long as the queue is a log, because retained logs are inherently exactly-once
  > Retention lets you replay; it says nothing about duplicates. A log consumer that reprocesses
    after a crash sees the same record again, so it too needs idempotent handling.
```

## Ordering is narrow: within a partition, not across

The next thing a design round listens for is a claim about **ordering**, because people
routinely assume a queue preserves the order they sent in and it does not — not globally. A log
is split into **partitions** for throughput, and the guarantee is deliberately narrow: "any
consumer of a given topic-partition will always read that partition's events in exactly the same
order as they were written" ([Apache Kafka](https://kafka.apache.org/intro)). Order holds
**within a partition, not across a topic**.

The consequence is a real design lever. If you need events for one entity to be processed in
order — all events for one `orderId`, say — you must route them to the **same partition**,
usually by hashing a partition key. A **global** total order across everything means a **single
partition**, which means **no consumer parallelism**, because a partition is consumed by one
member of a consumer group at a time. So global ordering and throughput are directly opposed,
and the senior move is to need ordering only *per key* and partition by that key — keeping order
where it matters and parallelism everywhere else.

```quiz 01M22X5XHGTJVW7QQ8F5THFX0W cloze
A log keeps events in order only {{within a partition}}, not across a topic, so to process all
events for one entity in order you route them to the same partition by a {{partition key}}. A
single global total order therefore forces a {{single partition}}, which costs you all consumer
{{parallelism}}.
```

## Backpressure: the queue is not an infinite buffer

The last cost to name is **backpressure**. A queue decouples producer from consumer in time,
which is exactly its value — but if producers enqueue faster than consumers drain, the backlog
grows **unbounded**, and unbounded means memory exhausted, disk filled, or messages aged out and
lost. A queue is a buffer, not an infinite one, and pretending otherwise is a down-level tell.

The clean answer is that consumers **pull at their own pace** and the system pushes back when it
cannot keep up. A **pull-based consumer** — the model a log like Kafka uses — is a natural
throttle: the consumer fetches when it is ready, so a slow consumer simply falls behind in the
log rather than being flooded — the lag becomes a metric you alert on instead of a crash. A
classic queue pushes back differently: you can **bound the queue** and, past the limit, block or
reject producers (or shed to a dead-letter queue), so the pressure is felt at the producer rather
than swallowed silently. Either way the
design decision is the same — **decide what happens when the consumer cannot keep up** (slow the
producer, shed load, or scale consumers out) rather than assuming the buffer is free.

And name the standing costs while you are at it: a broker is a cluster you must run, monitor, and
keep from becoming the new single point of failure, and the asynchrony means downstream state is
**eventually consistent** — a reader sees the world after the queue's lag, so a value written a
moment ago may not be visible yet.

```quiz 01M22X5XHGCAHDM7ZJR74TQZ5P recall
An interviewer says: "You've put a message queue between your API and your order processors.
Defend it — what shape, what delivery guarantee, and what about ordering and overload?" Give the
answer you would say out loud.

> I'd reach for a **classic competing-consumer queue** if this is task distribution — each order
> processed once by one of a pool of workers I scale out — or a **log** if other teams also need
> the order stream or I need to replay it; the tell is whether anyone needs to re-read history.
>
> On delivery: I'd design for **at-least-once**, because that is what you actually get — there is
> no true exactly-once on the wire, only at-least-once plus dedup. So the processor is
> **idempotent**: it keys off a stable message id and treats a message it has already applied as a
> no-op, which means a redelivery after a crash or a missed ack double-charges nobody.
>
> On ordering: I only need order **per order id**, not globally, so I partition by order id — a
> log keeps order within a partition, and demanding one global order would force a single
> partition and kill my consumer parallelism.
>
> On overload: the queue is a buffer, not infinite, so I plan for **backpressure** — consumers
> pull at their own pace and I alert on consumer lag; if producers outrun them I scale consumers
> out, and past a bound I shed or dead-letter rather than let the backlog grow until it falls
> over. And I'd call out that the broker is itself a tier to run redundantly and that everything
> downstream of it is eventually consistent.
```

## What to take away

A message queue is a set of decisions, not a box. **Shape:** a classic queue hands each message
to one of N competing consumers and forgets it (task distribution); a log retains a partitioned,
append-only stream for many consumers and for replay; pub/sub fans each message out to every
subscriber. **Delivery:** there is no wire-level exactly-once — it is "effectively once,"
at-least-once delivery plus dedup (Kafka's producer PID and sequence number, or your own key), so
a consumer must be [[idempotency-and-safe-retries|idempotent]]. **Ordering** holds only within a
partition, so partition by the key you need ordered and accept that a global order costs all
parallelism. **Backpressure** is the reminder that the buffer is finite — consumers pull, you
alert on lag, and you decide what gives when they cannot keep up. Lead with what each choice gives
up and the box becomes an argument. The scan-grid companion is [[system-design-building-blocks]].

Worth reading in full: Kafka's [introduction](https://kafka.apache.org/intro) for the log shape
and the per-partition ordering guarantee, alongside the
[Idempotent Producer design (KIP-98)](https://cwiki.apache.org/confluence/display/KAFKA/Idempotent+Producer)
— together they are the primary source for why "exactly once" is producer-side dedup and not a
delivery guarantee, which is the one claim about queues most worth getting right.
