---
id: 01M3YN04DGZ6YNRNBE74P4CB2B
title: Loss, duplicates and replay-safe consumers
topic:
  - event-driven-architecture
prerequisites:
  - message-queues
  - idempotency-and-safe-retries
---

"We use Kafka with exactly-once, so we don't lose or duplicate anything" is three claims, and an
interviewer who hears it will take them apart one at a time. **Loss**, **duplication** and
**reprocessing** look like one reliability problem, because each one ends with state that is
wrong. They are three problems, at three different places in the pipeline, and each has its own
mechanism. A fix for one does nothing for the other two: a durable broker still delivers
duplicates, a deduplicating consumer can still be corrupted by a replay, and a replay can be
perfectly deterministic and still charge a card a second time. This Lesson keeps the three apart,
and then takes the hardest one, replaying millions of old events, on its own.

The delivery guarantees themselves (at-most-once, at-least-once, and why exactly-once is not
something the wire gives you) are in [[message-queues]]. Why the same request sent twice has to
mean the same thing as sending it once is in [[idempotency-and-safe-retries]]. What follows
assumes both and asks where each guarantee is actually earned.

## Three problems, three places, three mechanisms

| Problem | Where it happens | What fixes it |
| --- | --- | --- |
| **Loss**: an event that was published is never seen | Producer to broker, and inside the broker | **Durability**: acknowledged writes replicated before the producer is told "done" |
| **Duplication**: one event takes effect twice | The producer retrying a send, and the consumer reprocessing after a crash | **Deduplication**: the idempotent producer for the first, a consumer dedup keyed on a message id for the second |
| **Reprocessing**: you deliberately read history again | A replay, a backfill, or rebuilding a projection | **Determinism**: the same events, through the same rules, give the same state and no new side effects |

The table is the answer to the first question. The rest of the Lesson is the reasons behind it,
because "acks=all" with no reason attached is a word you memorised.

## Loss is the producer's and the broker's problem

An event is lost when the producer thinks it was written and it was not. That is decided before
any consumer is involved, by how much the producer waits for and how many copies the broker keeps
before answering.

Kafka makes the choice explicit in the producer's `acks` setting. With `acks=0` a record is
"considered sent" as soon as it is in the socket buffer, so a broker crash loses it silently. With
`acks=all` the "leader will wait for the full set of in-sync replicas to acknowledge the record.
This guarantees that the record will not be lost as long as at least one in-sync replica remains
alive", and `all` is the default
([Kafka producer configs](https://kafka.apache.org/41/configuration/producer-configs/)).

"As long as at least one in-sync replica remains alive" has a catch. If the **in-sync replica set
(ISR)** has shrunk to the leader alone, `acks=all` means "the leader has it", which is one copy.
So Kafka's design docs pair it with two broker-side settings: `min.insync.replicas`, which refuses
writes when too few replicas are in sync rather than accepting them on one copy, and **unclean
leader election disabled**, so a replica that fell behind cannot be promoted to leader and quietly
drop the writes it never received
([Kafka design](https://kafka.apache.org/43/design/design/)). Durability is these three settings
together, and the interview answer names all three. If you name one, you have only shown that you
know the default exists.

Durability does not prevent duplicates. A producer that waits for `acks=all`, times out, and
retries can write the record twice. That is the second problem.

## Duplicates come from two directions

A duplicate is created in one of two places, and they have different fixes.

**On the write path, the producer's retries.** The producer sends, the ack is lost, and it sends
again. Kafka's **idempotent producer** closes this: `enable.idempotence` "ensures that exactly one
copy of each message is written in the stream". It defaults to `true` and requires `acks=all`,
`retries > 0` and `max.in.flight.requests.per.connection <= 5`
([Kafka producer configs](https://kafka.apache.org/41/configuration/producer-configs/)). How it
does this (a producer id and per-partition sequence numbers) is in [[message-queues]]. What
matters here is its reach: **it dedups the producer's own retries and nothing else.** It does not
cover two different producers that publish the same business fact, or an
[[azure-service-bus-and-event-driven-soa|outbox relay]] that crashes after publishing and before
marking the row sent, so it publishes the row again on restart. To the broker, those are new
messages.

**On the read path, the consumer.** Kafka is at-least-once by default for consumers. A consumer
that applies an event and crashes before committing its offset will read that event again. For
output to an external system, Kafka's design docs recommend storing the consumer's offset **in the
same place as its output**, rather than coordinating the two with a two-phase commit
([Kafka design](https://kafka.apache.org/43/design/design/); the recommendation is paraphrased
here, because the page was read through a summary and its exact wording was not checked). The
reasoning is that one write cannot be half-done. Either the effect and the record of having done
it both exist, or neither does.

The pattern that does this for a database is Richardson's **Idempotent Consumer**. It records
each processed message id in a `PROCESSED_MESSAGES` table keyed `(subscriberId, messageID)`,
**inside the same transaction as the business change**, so a duplicate's insert fails on the key
and the whole transaction is discarded
([microservices.io](https://microservices.io/patterns/communication-style/idempotent-consumer.html)).
This is what closes the gap the check-then-record sketch in [[message-queues]] leaves open,
because there is no longer a moment between "did the work" and "remembered doing it":

```csharp
// The dedup record and the effect commit together, or not at all.
public async Task HandleAsync(OrderPlaced msg, CancellationToken ct)
{
    await using var tx = await _db.BeginTransactionAsync(ct);
    try
    {
        // Primary key (SubscriberId, MessageId): a second insert throws.
        _db.ProcessedMessages.Add(new(SubscriberId: "billing", msg.MessageId));
        _db.Invoices.Add(Invoice.For(msg.OrderId, msg.Amount));
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
    catch (DbUpdateException) when (IsDuplicateKey())
    {
        return; // already applied: roll back and acknowledge
    }
}
```

The pattern covers a **local** effect: a row in the database the dedup table lives in. An effect
in somebody else's system, such as a payment API, cannot join that transaction. It needs the
[[idempotency-and-safe-retries|idempotency key]] passed through to that system, so that the other
side does the deduplicating.

Hohpe and Woolf name the two ways a receiver can be safe: "Explicit 'de-duping'", which is the
table above, or "Defining the message semantics to support idempotency", so that applying a
message twice is harmless by construction. "Set the order's status to `shipped`" is idempotent on
its own; "add 1 to the shipped count" is not
([EIP, Idempotent Receiver](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html)).
Either way the dedup key has to be **stable per business event**, and CloudEvents makes that a
specification requirement: "Producers MUST ensure that `source` + `id` is unique for each distinct
event," and consumers "MAY assume that Events with identical `source` and `id` are duplicates"
([CloudEvents](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)). That rule only
holds if the id is assigned once, when the fact happens, and travels with the event. An id minted
at publish time gives the outbox relay's second publish a new id, and the consumer can no longer
tell it is a duplicate.

```quiz 01M3YN04DHGG46KX6SQKJDP0SZ
A team turns on Kafka's idempotent producer and concludes their billing consumer no longer needs
deduplication. Which duplicate does the setting leave them exposed to?

- [x] A consumer that applies an event, crashes before committing its offset, and reads it again
  > The idempotent producer dedups the producer's own retries at the broker. A consumer that
    re-reads after a crash is on the read path, and only a dedup record committed with the effect
    (or an idempotent effect) makes that second read harmless.
- [ ] A producer that resends a record after its ack was lost and the send timed out on the network
  > This is exactly the duplicate `enable.idempotence` exists for: the broker sees the repeated
    sequence number and keeps one copy. It is the one case the team is right about.
- [ ] A record that the leader accepted but no in-sync replica copied before the leader crashed
  > That is loss, not duplication, and it is handled by `acks=all`, `min.insync.replicas` and
    disabling unclean leader election. Deduplication has nothing to say about a write that is gone.
- [ ] Two partitions of the same topic each delivering their events in a different relative order
  > Cross-partition order is never guaranteed, but that is an ordering question, not a duplicate.
    See [[out-of-order-events-and-business-invariants]].
```

## "Exactly once" is a statement about a scope

The two primary sources appear to disagree. Kafka's docs describe the idempotent producer as
strengthening delivery "to exactly once"
([Kafka design](https://kafka.apache.org/43/design/design/)). Kleppmann, Beresford and Svingen,
in their ACM Queue paper on online event processing (OLEP), write that frameworks "with
exactly-once semantics still exhibit at-least-once processing when interacting with external
storage and rely on idempotence"
([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)).

Both statements are true, and they apply to different scopes. **Inside Kafka**, from a producer
to a topic, or from a consumer's input topic to its output topic in one Kafka transaction, a
record takes effect once. **End to end**, from Kafka into a database, an email service or a
payment API, the external system is outside Kafka's transaction, and the processing it sees is
at-least-once again. The senior answer to "do you have exactly-once?" is not yes or no. It is
"within which boundary?", followed by what makes the effect safe outside that boundary.

```quiz 01M3YN04DH5NAAZ32EVRK6Q00Y cloze
Kafka's `acks=all` protects against {{loss}}, but only together with {{min.insync.replicas}} and
unclean leader election disabled. The idempotent producer removes duplicates from the producer's
own {{retries}}, and a consumer is protected by recording the {{message id}} in the same
transaction as the business change. Kafka's exactly-once holds {{inside Kafka}}, and becomes
at-least-once again as soon as processing writes to {{external storage}}.
```

```quiz 01M3YN04DHQHWTZJ6X2K8W63XG recall
An interviewer asks: "Event loss, duplicates and reprocessing: aren't those all the same
reliability problem? How do you handle them?" Give the answer you would say out loud.

> They are three problems at three places, and each one has its own mechanism.
>
> **Loss** is decided between the producer and the broker. I'd use `acks=all`, so the producer is
> only told "done" once the in-sync replicas have the record. I'd pair it with
> `min.insync.replicas`, so the broker refuses writes it can only hold on one copy, and with
> unclean leader election disabled, so a lagging replica can't become leader and drop
> acknowledged writes.
>
> **Duplicates** come from two directions. The idempotent producer removes the producer's own
> retries, and that is all it removes. The consumer is at-least-once, so it records the event's
> stable id (CloudEvents' `source` + `id`) in the same transaction as its effect, or makes the
> effect idempotent by construction. For an external effect, such as a payment, I pass an
> idempotency key through to that system.
>
> **Reprocessing** is a replay I chose to do, and it's a determinism problem rather than a dedup
> problem: the same events have to rebuild the same state and send nothing.
>
> The trap is believing Kafka's "exactly-once" makes the consumer safe. It is exactly-once inside
> Kafka. As soon as the consumer writes to external storage, it's at-least-once again, so the
> consumer still has to be idempotent.
```

## Replay is a determinism problem, not a dedup problem

A replay is not an accident. You re-read history on purpose because a projection had a bug, a new
consumer needs a backfill, or a read model is changing shape. Kleppmann states the premise that
makes this possible: "The database you read from is just a cached view of the event log," and "If
you deploy buggy code that writes bad data to a database, you can just re-run it after you fixed
the bug"
([Kleppmann, 2015](https://martin.kleppmann.com/2015/01/29/stream-processing-event-sourcing-reactive-cep.html)).
That only works if you know which data is the source of truth (the log) and which is derived (every
view built from it). [[event-sourcing-and-cqrs]] is the architecture that makes that split
explicit.

Deduplication is the wrong tool for a replay. The point of a replay is to apply events a second
time, so a dedup table that remembered them would turn the rebuild into a no-op. What a replay
needs instead is **determinism**. OLEP puts it as an invariant: a recovered subscriber "may
process some events twice ... but it never skips any events," so "state updates must also be
idempotent," and a deterministic executor "will make the same decisions to approve or decline
requests" when it runs again
([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)). Feed the same events through the
same logic and you get the same state.

The safe shape for replaying millions of events follows from that. **Rebuild into a new
projection and swap**, rather than replaying over the live one. The current read model keeps
serving while the new one catches up from the start of the log. When the new one reaches the head
of the log, you point reads at it and retire the old one. A replay that fails halfway leaves a
half-built table that nobody reads, instead of a corrupted one that everybody reads.

Determinism is necessary but not sufficient. A consumer can be completely deterministic and still
call a payment API, and it will make the same call again on every replay.

## Side effects, lookups and rules need to know it is a replay

Fowler's Event Sourcing article names the three ways a replay corrupts something outside the
projection. All three come from the same mistake: treating replay as if it were new processing.

**Outbound side effects.** If "events cause update messages to be sent to external systems, then
things will go wrong because those external systems don't know the difference between real
processing and replays." The fix is to send every side effect through a **gateway** that can "be
disabled during the replay processing ... in a way that's invisible to the domain logic"
([Fowler, Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)). The handler still
asks for the welcome email to be sent. During a replay, the gateway does not send it.

**Inbound lookups.** The mirror problem is an external query whose answer has changed since. "If I
ask for an exchange rate on December 5th and replay that event on December 20th, I will need the
exchange rate on Dec 5," so the gateway "remembers the responses to its queries and uses them
during replay" ([Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)). The general rule is
to **record any external input with the event that used it**. A replay that asks the outside world
again is processing today's world, not history.

**Rules.** "The domain model should be able to run events at any time with the correct rules for
the event processing"
([Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)). Apply the rules that were **in
force when the event happened**, not today's. If a discount policy changed in March, a February
order replayed under the March rules produces an invoice that never existed.

Greg Young's example shows why history has to stay fixed for any of this to work. Edit a username
event after the welcome email has gone out, and a replayed projection no longer matches what the
customer actually received
([Young, Why can't I update an event?](https://leanpub.com/read/esversioning/leanpub-auto-why-cant-i-update-an-event)).
Correcting an event is a new event, which is the subject of [[domain-events]]. An old event whose
**shape** has changed is upcast on read, never rewritten. That is
[[evolving-event-schemas]].

```quiz 01M3YN04DHHNGSA7Y5N7YX5YQF recall
An interviewer asks: "You need to replay three years of order events, millions of them, to fix a
bug in a read model. How do you do it without corrupting current state?" Give the answer you would
say out loud.

> First I'd separate the source of truth from derived state. The log is the truth, and the read
> model is a cached view of it, so a replay rebuilds **projections** and nothing else. It never
> re-sends an email or re-captures a payment.
>
> I'd **rebuild into a new projection and swap**. The live read model keeps serving while the new
> one replays from the start, and I only point reads at it once it has caught up. A replay that
> fails halfway leaves a table nobody reads.
>
> The consumer has to be deterministic, and that isn't enough, because a deterministic consumer
> can still call a payment API. So every **side effect goes through a gateway** that is switched
> off or recorded during a replay. Every **external lookup**, such as an exchange rate, is recorded
> with the event so the replay uses December 5th's rate and not today's. And the logic applies the
> **rules in force when the event happened**, not the current ones.
>
> Dedup doesn't do this job. A replay is supposed to apply the events again, so it's determinism
> plus side-effect isolation, not "we're idempotent, so it's fine."
```

## What to take away

Keep the three problems apart and give each its own mechanism. **Loss** is fixed by durability:
`acks=all` together with `min.insync.replicas` and unclean leader election disabled.
**Duplicates** are fixed by deduplication on two paths: the idempotent producer for its own
retries, and on the consumer a stable event id recorded in the same transaction as the effect, or
an effect that is idempotent by construction. **Reprocessing** is fixed by determinism, and
determinism is not enough without side-effect isolation: rebuild into a new projection and swap,
send side effects through gateways that are off during a replay, record external lookups with the
event, and apply the rules that were in force at the time. "Exactly-once" is true inside Kafka and
false at the boundary with anything else, so always say which scope you mean.

Ordering is a separate problem, covered in [[out-of-order-events-and-business-invariants]].
Following one of these events across services when something does go wrong is
[[tracing-a-flow-through-a-message-broker]].

Worth reading in full: the "Online Event Processing" paper by Kleppmann, Beresford and Svingen
([ACM Queue, 2019](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)). It is short, it treats
the log as the source of truth, and its sections on recovery and determinism are the primary
source for why a replay-safe consumer is something you design, rather than something a broker
setting gives you.
