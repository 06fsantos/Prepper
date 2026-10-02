---
id: 01M3YMZVP8MT42P6E74206VWV8
title: Out-of-order events and business invariants
topic:
  - event-driven-architecture
prerequisites:
  - message-queues
  - consistency-models
---

"Events are eventually consistent and can arrive out of order — so how do you keep the business
rules true?" is the question an event-driven design round asks once the broker is on the
whiteboard. The answer that holds up is a sequence of four moves, and saying them in order is
the signal: **name the invariant, name the entity that owns it, key events by that entity, and
enforce the invariant in the one place where that entity's writes are serialised.** Everything
downstream of that place only ever sees facts that have already passed the check. Two
refinements separate a senior answer from the textbook one: "reject stale events" is right for
one kind of event and data loss for the other, and event time is not an ordering mechanism.

## Order is a property of a partition, not of the system

Start with what the broker actually promises, because the whole design is shaped by how narrow
it is. Kafka: "Events with the same event key (e.g., a customer or vehicle ID) are written to the
same partition, and Kafka guarantees that any consumer of a given topic-partition will always
read that partition's events in exactly the same order as they were written"
([Apache Kafka](https://kafka.apache.org/intro)). There is no promise across partitions, and that
is deliberate. Kleppmann, Beresford and Svingen's ACM Queue paper on *Online Event Processing*
(OLEP) describes the log as scaling "by having many partitions ... and to have no ordering
guarantee across different log partitions," while the events of a single partition "are
processed sequentially on a single thread, using deterministic logic"
([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)).

So "out of order" is not one problem. Two events for **different keys** have no order to keep,
and a design that needs one has a cross-entity invariant it has not named yet. Two events for
**the same key** are ordered by the log, and they reach a consumer out of order only through
something the design added: a producer that wrote them under different keys, two producers
writing the same entity, or a consumer that fans a partition out to parallel workers. The
lever is the one [[message-queues]] teaches for throughput, used here for correctness: you
**buy exactly the ordering you need by choosing the key**, and the key you need is the entity
whose invariant matters.

```quiz 01M3YMZVPBMHYNYE0H3RXX7G5P cloze
A log guarantees order only {{within a partition}}, so to keep the events of one entity in
order you key them by {{the entity that owns the invariant}}. Events with different keys have
{{no ordering guarantee}} between them, which is why a rule spanning two entities needs a
single place where its writes are {{serialised}}.
```

## Invariants live where the writes are serialised

The common wrong answer is to check the rule downstream: every consumer validates what it
receives and rejects what breaks the invariant. That fails twice. The consumer sees the event
after the fact, when the thing it would refuse has already happened; and two consumers reading
at different lags can each decide differently about the same history.

OLEP's payments example is the clearest primary statement of the alternative. The user does not
append "money moved"; they append a payment **request**, which "merely indicates the intention to
transfer funds; it does not imply that the transfer has been successful." A "single-threaded
payment executor" subscribed to the source account's log "deterministically checks whether the
payment request should be allowed, based on the current balance," and only then emits the
outgoing and incoming payment events
([OLEP](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)). The invariant (no overdraft)
belongs to the source account, the source account's events all land in one partition, one
thread applies them in order, and so the check runs against a balance that cannot be changing
underneath it. The consumers of "payment made" never re-check the balance; they react to a fact.

In domain-driven design that executor is an [[aggregates|aggregate]]: the cluster of objects
whose rules must hold together, changed only through its root, with the rule that "transactions
should not cross aggregate boundaries"
([Fowler, DDD Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html)). The aggregate is
the unit you key by, the unit whose writes are serialised, and the unit an invariant is allowed
to span. A rule that spans two aggregates (a transfer touching two accounts) is split the way
OLEP splits it: the part one aggregate can decide (does the source have the funds?) is decided
there, and the rest becomes events the other aggregate reacts to.

On the write side of an event-sourced store the same serialisation point has a concrete guard.
Appends carry an expected stream version: "Append operation supports an optimistic concurrency
check on the version of the stream to which events are appended," and `ExpectedVersion.Any`
"disables the check"
([Kurrent/EventStoreDB](https://docs.kurrent.io/clients/tcp/dotnet/21.2/appending)). Two writers
that both decided from version 7 cannot both append version 8; the loser reloads and decides
again. That is the invariant being enforced at the boundary, with ordering as the mechanism.

## Stale events: reject or resequence, and which kind decides it

Downstream of the boundary, a consumer still has to cope with a late or redelivered event for an
entity it has already moved past. Two tools, both from Hohpe and Woolf. A **Message Sequence**
gives each message a "position identifier" that "uniquely identifies and sequentially orders each
message" ([EIP, Message Sequence](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageSequence.html)).
A **Resequencer** is "a stateful filter ... to collect and re-order messages," using "an internal
buffer to store out-of-sequence messages"
([EIP, Resequencer](https://www.enterpriseintegrationpatterns.com/patterns/messaging/Resequencer.html)).
Given a per-entity version on each event, the consumer can either **drop** anything at or below
the version it has applied, or **buffer** until the gap is filled.

Which one is correct depends on what the event carries, and this is the refinement the
interviewer is listening for:

- A **state-carrying** event holds the entity's whole state, or the whole value of a field ("the
  customer's address is now X", "profile snapshot v12"). The latest version wins, so an event at
  or below the applied version is genuinely stale, and **rejecting it is correct and loses
  nothing**: the newer one already holds everything it said.
- A **delta** event holds a change ("debit 30", "add item"). Every one of them is part of the
  answer, so rejecting a late one is **data loss**: the balance is now wrong by 30 and nothing
  will ever correct it. A delta consumer has to **resequence**: hold version 9 until version 8
  arrives, apply them in order, and alert if the gap does not close.

```csharp
// Per-entity version guard in a projection. The two branches are the two event shapes.
public async Task HandleAsync(AccountEvent e, CancellationToken ct)
{
    var applied = await _versions.GetAsync(e.AccountId, ct);   // last version applied

    if (e.Version <= applied)
        return;                       // duplicate or stale: safe to drop for either shape

    if (e is AddressChanged snapshot) // state-carrying: latest wins
    {
        await _view.SetAddressAsync(e.AccountId, snapshot.Address, e.Version, ct);
        return;                       // skipping versions in between loses nothing
    }

    if (e.Version != applied + 1)     // delta with a gap: never apply out of order
    {
        await _pending.BufferAsync(e, ct);   // resequence once the gap fills
        return;
    }

    await _view.ApplyDeltaAsync(e, ct);      // also drains any buffered successors
}
```

Note what the first branch drops: an event at or below the applied version, which for a delta is
a **redelivery** of something already applied, not a late arrival of something missing. That
is [[idempotency-and-safe-retries|deduplication]], and it is safe for both shapes. The shapes
diverge only on a *gap*: a snapshot may jump over it, a delta must wait for it. Duplicates,
loss and replay are their own three problems, taken apart in
[[loss-duplicates-and-replay-safe-consumers]].

```quiz 01M3YMZVPB58XR818J6XB7W4MB
A balance projection receives "debit 30, version 9" for an account whose last applied version
is 7. Version 8 has not arrived. What should the consumer do?

- [x] Buffer version 9 until version 8 arrives, then apply both in their sequence order
  > A debit is a delta: each one is part of the balance. Holding 9 until the gap closes is
    resequencing, and it is the only option that ends with the right number.
- [ ] Apply version 9 now and record 9, since it is newer than the version applied
  > Recording 9 means version 8, when it arrives, is at or below the applied version and gets
    dropped as stale. A debit vanishes and the balance is wrong for good.
- [ ] Reject version 9 as out of order and wait for the producer to send it again
  > Nothing makes the producer resend it: the broker already delivered it. Rejecting a delta
    loses it, which is the data loss "reject stale events" causes for deltas.
- [ ] Apply version 9 now, because the order of debits cannot change the final balance
  > Sums commute, but the version bookkeeping does not: once 9 is recorded, 8 looks stale.
    And a rule like "no overdraft" depends on order even when the total does not.
```

## Event time is not an ordering mechanism

The tempting shortcut is to sort by timestamp. Flink owns the vocabulary here: processing time
"refers to the system time of the machine that is executing the respective operation"; event
time "is the time that each individual event occurred on its producing device." A watermark is
the stream declaring "there should be no more elements from the stream with a timestamp t' <= t,"
and yet "certain elements will violate the watermark condition" and arrive late anyway
([Flink, Timely stream processing](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/)).

Read that last clause as the argument. Event time is stamped by producing devices whose clocks
disagree, and even a system built around it has to plan for elements that break its own
completeness guess. It is the right tool for a **business-reporting** question: which hourly
window did this sale belong to, and how late may a straggler be before the window closes. It is
the wrong tool for "which of these two writes to account 42 came first", because two producers'
clocks are not a sequence. The ordering that invariants rest on is a **per-entity sequence
number assigned at the serialisation point**: the log offset within the partition, or the stream
version the event store's concurrency check enforced.

```quiz 01M3YMZVPB5V5V1J68VYJ4SWRV recall
An interviewer asks: "Your events are eventually consistent and can arrive out of order. How do
you keep business invariants true?" Give the answer you would say out loud.

> I'd name the invariant first, say "an account never goes overdrawn", and then the entity that
> owns it: the account. Order is only guaranteed within a partition, so I key every event for
> that account by account id; events for different accounts have no order to keep. Then I
> enforce the rule where that entity's writes are serialised, not downstream. That's the
> aggregate, or in a log design a single-threaded executor on the account's partition: it takes
> a *request*, checks it against current state, and only then emits the fact. Consumers react
> to facts that already passed the check. On an event store, the optimistic concurrency check
> on stream version is what stops two writers deciding from the same state.
>
> Downstream, each event carries a per-entity version. I drop anything at or below what I've
> applied, which handles duplicates. A gap is where the event shape matters: for a
> state-carrying event, latest wins and skipping is fine; for a delta like a debit, rejecting it
> is data loss, so I resequence: buffer until the gap fills, and alert if it doesn't.
>
> And I wouldn't order by event time. Producer clocks aren't a sequence, and even watermarks
> admit late data. Event time is for reporting windows; ordering comes from the sequence
> number assigned where the writes are serialised.
>
> The oversimplification to avoid is "just reject stale events": that's right for snapshots
> and loses data for deltas.
```

## What to take away

Out-of-order delivery is a question about **where an invariant is enforced**, and the answer is
the place one entity's writes are serialised. **Key** events by the entity that owns the rule,
because order holds within a partition and nowhere else. **Enforce** the rule at that entity's
boundary: an [[aggregates|aggregate]], an executor on its partition, an event-store append with
an expected version. Consumers then react to facts rather than re-litigating them. **Version**
every event per entity: a duplicate is dropped for either shape, a gap is skipped for a
state-carrying event and **resequenced** for a delta, because rejecting a delta loses data.
**Never** use event time for ordering; it is for reporting windows, and a sequence number from
the serialisation point is what an invariant can rest on. When the events are a public contract
between domains rather than one domain's internals, see [[events-as-public-contracts]].

Worth reading in full: Kleppmann, Beresford and Svingen,
[*Online Event Processing*](https://martin.kleppmann.com/papers/olep-acm-queue.pdf) (ACM Queue,
2019). The payments executor is the primary source for "enforce the invariant where writes are
serialised," and its "Disadvantages" section is the honest account of what a log-based design
gives up.
