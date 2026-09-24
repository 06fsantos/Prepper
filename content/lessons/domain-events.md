---
id: 01M3AF96KGM4V5EHA6GAFBX088
title: Domain events and what an aggregate publishes
topic:
  - tactical-design
prerequisites:
  - aggregates
---

An entity tracks *what state a thing is in*, but not *why it got there* — the cause of a
change is usually buried in whatever procedural code happened to make it, or reconstructed
after the fact from an audit trail that has kept the rows and lost the meaning. A **domain
event** is the pattern that makes that cause a first-class part of the model: a record of
**something that happened in the domain that domain experts care about**, named in the past
tense and in the ubiquitous language — `OrderPlaced`, `PaymentReceived`, `ShipmentDispatched`.
Evans's own gloss is exactly that plain: "something happened that domain experts care about."
It is a full domain object in its own right, not a log line — but one with two defining
properties. It is **immutable**, because it is a record of the past and the past does not
change; and it **carries what happened**, which in practice means a timestamp for when the
event occurred and the identity of the entities involved. This lesson's job is to make two
things sayable under pressure: what a domain event *is*, and **where it comes from** — an
[[aggregates|aggregate]], which is why it lives here in the tactical toolkit and not with the
strategic patterns.

## An event is published from an aggregate

The reason a domain event is a **tactical** building block — sitting next to the entity, the
value object, the [[aggregates|aggregate]] and the [[repositories|repository]] rather than up
among the strategic patterns — is that it is **published from inside an aggregate's boundary**,
as part of the state change the aggregate just made. When an aggregate executes a command that
changes its state, it also **raises an event** saying what happened, and hands that event out
to whoever is listening. That is the exact mechanism the aggregate rules run on. The rule that a
transaction should modify [[aggregates|only one aggregate]] at a time, with everything beyond
the boundary reached by **eventual consistency**, is not workable without something to carry the
"then this happened" across the boundary — and the domain event is that something. An `Order`
aggregate places an order in one transaction and publishes `OrderPlaced`; an asynchronous
subscriber picks the event up and decrements warehouse stock in its *own* later transaction, on
a *different* aggregate. The event is how one aggregate lets the world react to it without any
outside object reaching in and changing it synchronously. So the event's home is the aggregate
that emits it: model the cause of the change as a discrete object, and let the aggregate publish
it as it commits.

```quiz 01M3AF96KH8D6W5248D7GA1E7X
A domain event is *published* from where, in the tactical model?

- [x] From inside an aggregate, as part of the state change that aggregate just committed
  > Right. The aggregate raises the event as it commits its own change, which is exactly what lets other aggregates react through eventual consistency without being reached into synchronously.
- [ ] From a repository, at the moment the changed aggregate is written to the database
  > A repository fetches and stores an aggregate; it is not where the domain decides that something meaningful happened. The event is raised by the aggregate's own command, not by persistence.
- [ ] From an application service, which inspects the aggregate afterward for changes
  > Diffing an aggregate from outside to guess what changed is the buried-cause problem the pattern exists to fix. The aggregate states what happened, in the language, as it happens.
- [ ] From the messaging infrastructure, when a message is placed on the transport
  > The transport delivers an event; it does not originate one. The event is a domain object raised inside the model, independent of how it is later carried.
```

## It is a record of the past, so it is immutable

Two properties make an event an *event* rather than just another mutable entity. First, it is
**named in the past tense**, in the ubiquitous language — `OrderPlaced`, not `PlaceOrder` or
`OrderService`. The past tense is not a style rule; it is the claim the pattern makes, that this
object represents a fact that has already become true and that domain experts recognise as
meaningful. Second, and following directly, an event is **immutable**: "ordinarily immutable,
as they are a record of something in the past," in Evans's words. You do not edit `OrderPlaced`
after the order was placed, any more than you can un-place the order — if something later
changes, that is a *new* event (`OrderCancelled`), never a mutation of the old one. What the
event carries is likewise fixed at birth: a **timestamp** for when it occurred, and the
**identity** of the entities involved, so a subscriber has what it needs without reaching back
into the aggregate. One practical consequence worth knowing: because an event's content is
fixed, its identity can be derived from its properties, which is how a subscriber recognises a
**duplicate delivery** as the same event — idempotency is a design concern the immutability
makes tractable.

```quiz 01M3AF96KH7NV1XWZKQTQ32CB9 cloze
A domain event is named in the {{past}} tense in the ubiquitous language, and it is
{{immutable}} because it records something that has already happened; it carries a
{{timestamp}} for when it occurred and the identity of the entities involved.
```

## It integrates bounded contexts — but that is the strategic view

An event published inside one aggregate does not have to be consumed inside the same model. The
same `OrderPlaced` that a local subscriber uses to decrement stock can cross a
[[bounded-context|bounded context]] boundary entirely: the Ordering context publishes it, and a
separate Shipping or Billing context — its own model, its own team — subscribes and reacts,
without either context holding a reference into the other. That is how contexts **integrate
without coupling**, and on a [[context-mapping|context map]] it is one of the ways an upstream
context feeds a downstream one. But that integration story is the **strategic** view of the same
object, and it is taught over there, not here — this lesson teaches what a domain event *is* and
that an aggregate publishes it; [[context-mapping]] teaches what it *does* between contexts. The
event is defined once, tactically, and reused strategically.

## What it is not: event sourcing, and the transport

A domain event gets confused with two neighbours, and the senior move is to keep all three apart.

It is **not [[event-sourcing-and-cqrs|event sourcing]]**. A domain event is a record that
something happened, published so others can react; event sourcing is a *persistence strategy* in
which the stored sequence of events **is the source of truth**, and current state is derived by
replaying them. You can raise and publish domain events with an ordinary state-stored aggregate
and never event-source anything — the event is a notification, not necessarily your system of
record. Event sourcing uses events; it is not what makes an event a domain event.

And it is **not the [[message-queues|message queue]]** it may travel on. The queue, bus, or
broker is the **transport** that carries an event from publisher to subscriber, with its own
concerns — delivery guarantees, ordering, retries. The domain event is the *meaning*; the
transport is the *plumbing*. An event is still a domain event when it is dispatched in-process
with no queue at all, and a queue carries plenty of messages that are not domain events. Naming
which of the three you mean — the domain fact, the persistence strategy, or the transport — is
often the whole of the answer an interviewer is listening for.

```quiz 01M3AF96KH5WFD5ZQBJ5JM8HEA recall
Distinguish a domain event from (a) event sourcing and (b) a message queue. Why is confusing
them a tell?

> A **domain event** is a domain object: an immutable, past-tense record that something
> meaningful happened, raised inside an [[aggregates|aggregate]] as it commits and published so
> others can react. **[[event-sourcing-and-cqrs|Event sourcing]]** is a *persistence strategy* —
> the stored stream of events is the **source of truth**, and current state is rebuilt by
> replaying it. You can publish domain events from an ordinary state-stored aggregate and never
> event-source; the event is a notification, not necessarily your record of truth. A
> **[[message-queues|message queue]]** is the *transport* that may carry the event — it owns
> delivery, ordering, and retries, not meaning; an event dispatched in-process with no queue is
> still a domain event, and most messages on a queue are not domain events. Confusing them is a
> tell because it collapses three separate design decisions — *what happened* (the model), *how
> state is stored* (persistence), and *how the notification travels* (infrastructure) — into one,
> and a senior answer keeps them named and apart.
```

## Provenance: a domain event is not one of the original building blocks

One fact to get right, because it dates a candidate who gets it wrong. A domain event is **not**
one of Evans's original 2003/2004 blue-book building blocks — those are the Entity, the Value
Object, the Aggregate, the Repository, the Factory, and the Service. Domain Event was **added
later**: in the free 2015 [*DDD Reference*](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
it is explicitly starred, and the legend reads "new term introduced since the 2004 book." It is
a product of the decade *after* the blue book — Evans's own later addition, given its fuller
treatment by Vaughn Vernon (*Implementing Domain-Driven Design* and the *Effective Aggregate
Design* essays) and the wider event-driven community that grew up around aggregates, eventual
consistency, and event-driven integration. So teach it as core modern DDD, because it is — but
never call it one of the original tactical patterns. If someone lists "Entity, Value Object,
Aggregate, Repository, Factory, Service, **Domain Event**" as the blue-book set, the last one is
the giveaway.

## Where it sits in the tactical toolkit

A domain event is one of the two patterns that stand directly on the [[aggregates|aggregate]]:
it is **what an aggregate publishes**, the mirror of the [[repositories|repository]] that is
**how you fetch and store** one. Get the aggregate boundary right and the event has an obvious
place to be raised — inside the commit that makes the change it announces — and an obvious job to
do: carry the "then this happened" out to other aggregates, and out to other
[[bounded-context|bounded contexts]], without anyone reaching back in. For the surrounding
tactical vocabulary — [[entities-and-value-objects|entities and value objects]], the aggregate
itself, and the [[repositories|repository]] — see the [[tactical-design]] topic.

The one primary source worth reading in full is Evans's own one-page summary in the free
[*DDD Reference*](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
("Domain Events" — note the asterisk), read alongside Vaughn Vernon's
[*Effective Aggregate Design* Part II](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_2.pdf),
which shows an aggregate publishing an event to drive eventual consistency in worked code rather
than as a slogan.
