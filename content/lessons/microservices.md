---
id: 01M3AMCWQ0P7QF6AAB5M82AE73
title: Microservices, and the database-per-service pattern
topic:
  - system-design
  - distributed-systems
prerequisites:
  - bounded-context
---

A microservice is a service that can be **deployed on its own** and **owns its own data store** —
that pair carries the definition, and dropping either gives you a distributed monolith, which pays a
distributed system's costs and collects none of its benefits. Two more properties consistently travel
with it: the service **scales independently** of the rest of the system, and it is **built and run by
one team**. Those follow from the first two more than they stand beside them, but the literature names
all four together and each earns its place. The style is a bet that the independence is worth the
price — and the price, paid in full and up front, is that every call that used to be a method call is
now a network hop across an unreliable wire.

The senior move in a design round is not proposing services; it is being able to say *why this is a
service and that is not*, and *what the split just cost you*. This Lesson defines the unit, owns the
one pattern that makes a service's data autonomy real — **database per service** — and then hands you
a map to where every other cost of a split is already taught, because the honest answer to "should we
go microservices?" is assembled from a dozen concerns, not one.

## What makes a service "micro"

The word "micro" is misleading: it is not about lines of code. A microservice is *small* only in the
sense that it does one bounded thing and can be reasoned about, deployed, and replaced on its own.
These are the properties the literature consistently names — the first two carry the definition, and
the other two are the properties that typically follow:

- **Independent deploy** (defining). You can ship this service without coordinating a release train
  with any other. This is the prize — the thing the whole style exists to buy. If shipping service A
  forces a simultaneous deploy of service B, they are one service wearing two hats.
- **Its own data store** (defining). The service owns its data and nobody reaches around the service to
  read or write it directly. This is the property most often faked, and the one this Lesson makes
  concrete below.
- **Independent scale** (usually follows). The part under load scales without dragging the rest along.
  A read-heavy catalogue and a write-heavy ledger get sized separately instead of over-provisioning one
  monolith to the peak of its hottest component.
- **One team** (an organizational consequence). A service tends to be owned end to end by a single
  team — Conway's law used on purpose: the boundary is drawn to match the team boundary so that
  communication cost inside a service is cheap and coordination cost between services is made explicit.
  This is a strong organizational correlate, not a definitional test: a service does not stop being one
  the day a second team touches its code, though that is usually a smell worth naming.

```quiz 01M3AMCWQ18SW784QAVMPVHDF9
Two services are deployed together in a single release every time because service A reads service B's
database tables directly. What is the most precise thing wrong here?

- [x] They are not independently deployable and B's data is not private, so this is a distributed monolith
  > Both the independent-deploy and own-data-store properties are violated: A's coupling to B's
    schema forces the joint release, so the split has bought the network cost of two services with the
    coupling of one.
- [ ] The two services should be merged because microservices must always be large in scope
  > "Micro" is about doing one bounded thing with independent lifecycle, not about size; merging is one
    option, but the diagnosis is the coupling, not the count.
- [ ] The problem is only the shared database and the joint deploy is a separate, unrelated issue
  > They are the same issue: the shared database is exactly what forces the joint deploy, which is why
    data ownership is load-bearing rather than incidental.
- [ ] Nothing is wrong as long as both services are owned by one team each
  > One-team ownership does not rescue a design where one team's service reads another team's tables;
    the private-data-store property is still broken.
```

## Database per service, and the bill it creates

**Database per service** is the pattern that makes a service's autonomy real rather than nominal:
each service owns its data, and no other service touches that data except through the owning service's
API. Not a shared database with a table per service, not a shared database with polite conventions —
a boundary the other services *cannot* reach across, because reaching across it is what re-couples two
services into one. If two services share a database, a schema change in one can break the other, and
the independent-deploy property you paid for is gone. The data boundary is the service boundary; this
is where it is enforced.

The pattern buys autonomy and charges for it immediately, in two specific coins:

- **No cross-service joins.** The data you want to join now lives in two different stores owned by two
  different services. You cannot write one `JOIN` across them. You either call the other service and
  compose in application code, or you keep a local read-model copy of the data you need and keep it
  fresh — which is the [[event-sourcing-and-cqrs|CQRS/read-model]] move, kept in sync over a
  [[message-queues|message bus]].
- **No distributed transaction.** You cannot wrap a change that spans two services in one ACID
  [[transactions-and-acid|transaction]] — there is no shared database to commit against, and
  two-phase commit across services is the thing microservices deliberately refuse. A business
  operation that spans services becomes a sequence of local transactions, each committing in one
  service and emitting an event, with **compensating** transactions to undo on failure. That is the
  **saga**, and getting the event out atomically with the state change is the **outbox** — whose
  mechanics live in [[azure-service-bus-and-event-driven-soa|event-driven integration]]. What matters
  here is that this pattern is what forces you to reach for them.

So the rule of thumb: the moment a design says "database per service," it has also said "eventual
consistency across services" and "sagas instead of transactions." Say both in the same breath — the
autonomy and its bill — because an interviewer who hears "each service has its own database" will
immediately ask "then how do you keep an order and its payment consistent?", and the answer is not a
distributed transaction.

```quiz 01M3AMCWQ1WVXF1EGCZ7W0NNA6 cloze
Under database per service, no other service may touch a service's data except through its {{API}}.
The two consequences that follow immediately are: you can no longer write a cross-service {{join}},
and you can no longer wrap a cross-service change in a single distributed {{transaction}} — so a
multi-service operation becomes a {{saga}} of local transactions with compensating steps on failure.
```

## The boundary is Newman's bridge, not one-to-one

Where does a service boundary go? The starting granularity is a
[[bounded-context|bounded context]] — the region within which one domain model applies and its
language stays consistent. But the mapping from context to service is a claim to state carefully,
because it is routinely over-stated: it is **Sam Newman's** bridge from context to service, **not
Evans's** original claim (microservices did not exist as a named style when Evans wrote), and it is
**not one-to-one**. A single bounded context may be implemented by several services; a single service
must **never** straddle two contexts. One context, possibly many services — never the reverse.

And a bounded context is the *starting* granularity, not the finishing one. You begin coarse — one
service per context — and split a context into more services only when a real pressure justifies it:
a part that must scale independently, deploy on its own cadence, or be owned by a separate team.
Splitting for its own sake buys a distributed system's costs with none of its reasons. The graceful
version in the room keeps the nuance intact: "I'd draw a bounded context here — that's the modelling
boundary — and start it as one service, then split it only if a piece needs to scale or ship on its
own." That sentence shows you know where the concept comes from and where the pragmatics take over.

## The trade-off map: where each cost of a split is taught

A microservices question is really a dozen questions wearing one coat, and the interview reward is
navigating to depth on any of them. Each cost of a split has a home already in the vault; this Lesson
is the front door, not the re-teaching:

- **The network tax.** Every method call that became a network call inherits every one of
  [[the-eight-fallacies-of-distributed-computing|the eight fallacies]] — the network is not a slower
  local call. This is the first cost, and the one under all the others.
- **Consistency across boundaries.** Database per service means [[consistency-models|eventual
  consistency]] between services, governed by [[the-cap-theorem|CAP]]: name what a stale answer costs
  per boundary rather than reaching for a global guarantee you no longer have.
- **Integration — how services talk.** Synchronously via [[api-design|API design]] (REST/gRPC and the
  contract's cost); asynchronously via [[message-queues|message queues]] and the event-driven patterns
  in [[event-sourcing-and-cqrs|event sourcing and CQRS]] and
  [[azure-service-bus-and-event-driven-soa|Azure Service Bus]] — including the saga and outbox the
  data pattern above forces.
- **Resilience.** A dead downstream must not take the caller with it: the `http-resilience` toolbox —
  [[retry-versus-circuit-breaker|retry versus circuit breaker]] and
  [[bulkheads-and-blast-radius|bulkheads and blast radius]] — is how a call chain survives a partial
  failure that a monolith never had.
- **The operational surface.** Once services are independently deployed, they must find, route to, and
  be governed across the network — the gateway, service discovery, and the mesh — taught in
  [[the-operational-surface-of-a-service-split|the operational surface of a service split]].
- **The migration decision.** "Go microservices" is usually a *migration* prompt, not a greenfield
  one: [[monolith-to-microservices-modernization|carving a monolith into services]] with the strangler
  fig, and Fowler's MonolithFirst caution that you often should not split at all — a modular monolith
  is a valid destination.

The through-line of the map: **independent deployability is the prize; distribution is the price**,
paid in the network tax, lost transactions, and an operational surface a monolith never had. Split
only where the prize is worth that price, and be able to point at where each part of the price is
paid.

```quiz 01M3AMCWQ177AJ4V8KNG4JEGV9 recall
An interviewer asks: "you've said each service owns its own database — so how do you keep an order
service and a payment service consistent, and what does that cost you?" What do you say?

> There is no shared database and no distributed transaction across the two services, so I don't try
> to make the change atomic. I model the business operation as a saga: a sequence of local
> transactions, each committing in one service and emitting an event, with compensating transactions
> to undo earlier steps if a later one fails. To publish the event atomically with the state change I
> use the outbox pattern — write the event to an outbox row in the same local transaction, and a
> relay publishes it — so a crash between the write and the publish can't lose it.
>
> The cost is that the two services are only *eventually* consistent: there is a window where the
> order exists and the payment hasn't been reflected yet, and the design has to tolerate that window
> and make consumers idempotent because delivery is at-least-once. That's the bill database per
> service always creates — I trade a cross-service ACID transaction for autonomy, and pay for it in
> eventual consistency and saga machinery. If the domain genuinely can't tolerate that window, that's
> a signal these two shouldn't be separate services in the first place.
```

## What to take away

A microservice deploys independently and owns its own data store — miss either and you have a
distributed monolith — and it typically also scales on its own and is owned by one team. **Database
per service** is the pattern that makes the data-ownership property real: no service touches another's
data except through its API, which immediately costs you cross-service joins and distributed
transactions, and hands you eventual consistency, sagas, and the outbox in their place. The boundary
starts at one bounded context per service — Newman's bridge, not Evans's, and not one-to-one: one
context may span several services, a service never two contexts, split only under real pressure.
Everything else a split costs — the network tax, consistency, integration, resilience, and the
operational surface — has a home to navigate to; this note is the map. The prize is independent
deployability; distribution is the price, paid only where it is earned.

Worth reading in full: Sam Newman's _Building Microservices_ (O'Reilly, 2015) is where the
context-to-service bridge lives — decentralized data, a service per bounded context, and each service's
private data store as the thing that makes the split real. Its migration-focused follow-up, _Monolith
to Microservices_ (O'Reilly, 2019), is the decomposition playbook that contributes the concrete
database-splitting patterns for carving that private store out of a shared one.
