---
id: 01M3YN00V0H15J9QA3FXVH5T62
title: Events as public contracts
topic:
  - event-driven-architecture
prerequisites:
  - domain-events
  - context-mapping
---

An event that leaves its own domain is a **public API**. It has one owner, a schema other teams
compile against, and consumers whose release schedules you do not control — every property of an
HTTP endpoint except the request. Event-driven systems do not couple services because they use
events; they couple them when an event is treated as an internal detail that happens to be
visible, so that consumers end up reading another domain's private model off the wire. The cure is
the one you already apply to a REST API: decide what is published, translate to it on purpose, and
review changes to it as changes to a contract. That is what stops a web of events from becoming a
system in which nothing can be deployed alone.

## One owner, one contract

A [[domain-events|domain event]] is born inside an aggregate, in the vocabulary of one
[[bounded-context|bounded context]]. The moment another context subscribes to it, the event has
crossed a seam on the [[context-mapping|context map]], and the publisher is now **upstream** of
every subscriber: its changes flow to them, and they have to cope. That is not a new kind of
relationship, and it does not need new vocabulary. A topic many teams subscribe to is an **Open
Host Service**, and the schema it is published under is a **Published Language** — the
interchange format both sides translate to and from ([[context-mapping-patterns]]).

What naming it that way buys you is ownership. A published event belongs to exactly one domain:
that domain decides its name, its fields and its meaning, registers its schema, and is the only
one allowed to emit it. A topic that two services write to, or an event whose shape is "whatever
the producer's ORM serialised this week", has no owner, and an unowned contract is changed by
whoever moves first.

## Translate internal events; never leak them

Greg Young draws the distinction that does most of the work here, in his book on event
versioning ([Young, "Internal vs external models"](https://leanpub.com/read/esversioning/leanpub-auto-internal-vs-external-models)).
A service's **internal** events are fine-grained and shaped by its own model — they are what its
aggregates and projections need, and they change whenever that model is refactored. Exposing them
directly as the integration API, he warns, will likely start to blur your service boundaries:
every consumer is now coupled to your aggregate's internals, so an internal refactor is a breaking
change for teams you have never met.

His answer is two models. Publish a separate, **coarser external model**, produced from the
internal events by a dedicated translator, and let it change far more conservatively than the
internal one — because a change to a contract needs a change in every user of the contract.
Internally you may split `OrderLineAdjusted` into three events next quarter; externally, Shipping
still sees one `OrderPlaced` with the fields it was promised.

That translator is the same move as an **Anti-Corruption Layer**, run from the other side of the
seam. An ACL is the downstream refusing to let a foreign model leak *in*; the translator is the
upstream refusing to let its own model leak *out*. Both are translation at a boundary, and both cost
a layer that does no business work so that two models can change independently. The modernization
version of the same layer is in [[monolith-to-microservices-modernization]].

(Young's book was read for this Lesson through a summarising fetch of Leanpub's free reader, so the
argument above is his and the wording is a paraphrase; read the chapter itself before quoting him.)

## Notification or state transfer: pick the coupling you pay

Martin Fowler separates two shapes an event can take
([Fowler, "What do you mean by 'Event-Driven'?"](https://martinfowler.com/articles/201701-event-driven.html)),
and the choice between them is a choice between two different couplings — not between coupled and
decoupled.

- **Event notification** carries little more than "this happened" and an identifier. The source
  doesn't really care much about the response, so it knows nothing of its consumers. But a
  consumer that needs the details has to call back to the source to get them, and so it is
  **coupled at runtime**: if the source is down, the consumer stalls.
- **Event-carried state transfer** puts the data the consumer needs into the event, so the consumer
  keeps its own copy and never calls back. Fowler names the gain as greater resilience, since the
  recipients keep working when the source is unavailable — at the cost of replicated data and
  eventual consistency. But the consumer now reads the event's fields, so it is **coupled to the
  schema**, and the fatter the event, the more of the producer's model it has bound itself to.

Neither shape is the villain. Notification removes schema coupling and adds runtime coupling;
state transfer does the reverse. What produces a distributed monolith is the same in both:
**consumers reading another domain's internal fields**, whether they fetched them on a callback or
found them in the payload. A state-transfer event built from the external model is a clean
contract; a notification whose consumers all call back into the producer's internal API is not.

Fowler adds one more cost that belongs to every event-driven design, whichever shape it uses: the
flow is not explicit in any program text, so it is easy to lose sight of it as the system grows.
That is the argument for keeping the contracts few, coarse and deliberate.

```quiz 01M3YN00V26ARQWYQCSXS44TPJ
A Customer service switches from publishing `CustomerChanged { id }` notifications to publishing
`CustomerChanged` with the full customer record. What happens to the consumers' coupling?

- [x] Runtime coupling drops and schema coupling to the payload rises
  > Consumers no longer call back, so they keep working when Customer is down, but they now depend
    on every field they read from the event — Fowler's event-carried state transfer trade.
- [ ] All coupling drops, because the consumers stop calling the source
  > Only the runtime half goes. Each field a consumer reads is now part of a contract the producer
    cannot change without breaking it.
- [ ] Runtime coupling rises because the events are larger to deliver
  > Size costs bandwidth and storage, not availability. Runtime coupling is about needing the
    source to be up, which a fat event removes.
- [ ] Nothing changes, because both shapes are just domain events
  > Both are events, but they couple differently: notification needs callbacks, state transfer
    needs a stable schema. See [[domain-events]].
```

## Review an event contract like an endpoint

If an external event is an API, it gets an API's discipline. In practice that means four things:

- **A named owner** — one domain, one team, the only producer of that event type.
- **A registered schema under a compatibility mode**, so a breaking change is refused at publish
  time rather than discovered by a consumer at 3 a.m. Which mode, and who deploys first, is the
  subject of [[evolving-event-schemas]].
- **A review**, the same as a public endpoint gets: is this field part of the domain's promise, or
  an internal detail we are about to be stuck with forever? A field once published is one you
  support for as long as any consumer reads it — and on a log retained for years, that is a long
  time.
- **Facts, not instructions.** An event that only one consumer acts on, and whose producer
  quietly expects that action, is a command dressed as an event — Fowler's "passive-aggressive
  command" — and it couples the two services as tightly as a direct call, with none of the
  visibility. Send a command when you need something done; see
  [[azure-service-bus-and-event-driven-soa]].

```quiz 01M3YN00V2EN7NNR82VXE86WS3 cloze
Young keeps two event models: fine-grained {{internal}} events that change whenever the model is
refactored, and a coarser {{external}} model, produced by a {{translator}}, that changes
conservatively because every consumer must follow each change.
```

## "Distributed monolith" is a label, not a source

The failure all of this guards against is usually called a **distributed monolith**: services that
cannot be deployed or changed independently, so the system pays a distributed system's costs and
collects none of its benefits. [[microservices]] uses the name for a split that loses independent
deploy or private data, and [[monolith-to-microservices-modernization]] for a "service" that still
shares the monolith's database.

Be precise about what the term is when you use it in an interview. It is **industry framing with
no owning primary source** — no spec or original author defines it — so do not cite it as if it
were a pattern. The **mechanisms** underneath it are sourced, and they are what to name: internal
events used as the integration API blur service boundaries (Young); every field a consumer reads is
a contract (Fowler's state-transfer trade); a callback per notification is runtime coupling
(Fowler); and microservices are meant to be "as decoupled and as cohesive as possible", with "smart
endpoints and dumb pipes"
([Fowler & Lewis, "Microservices"](https://martinfowler.com/articles/microservices.html)). A broker
whose topics are a shared copy of everyone's internal model is a shared database with extra steps.

```quiz 01M3YN00V2QH9EDEXT1CBGQYYV recall
How do you stop an event-driven architecture from becoming a distributed monolith?

> Treat every event that leaves its domain as a **public API**: one owning domain, a schema
> registered under a compatibility mode, and changes reviewed like changes to an endpoint. Publish a
> coarser **external** model, translated from the internal events, rather than leaking the
> fine-grained internal ones — consumers coupled to your internals turn every refactor into a
> cross-team release (Young). Choose the event's shape knowingly: **notification** keeps the schema
> small but couples consumers at runtime through callbacks; **event-carried state transfer** removes
> the callbacks but couples them to the payload (Fowler). Publish facts, and send a command when you
> need something done.
>
> The oversimplification to avoid is casting event-carried state transfer as the coupling villain.
> Each shape trades one coupling for the other; the actual rot is consumers reading another domain's
> internal fields, whichever shape carries them. And "distributed monolith" itself is a label with no
> primary source — name the mechanisms instead.
```

## What to take away

An event that crosses a bounded context is a public contract, and the publisher is upstream of
everyone who reads it: in context-map terms it is an Open Host Service speaking a Published
Language. Give it one owner, publish a coarse external model translated from your internal events
rather than the internal events themselves, and review its schema the way you review an endpoint.
Notification and event-carried state transfer are not "coupled" and "decoupled" — they trade
runtime coupling for schema coupling — and the thing that actually welds services together is
consumers depending on another domain's internals. "Distributed monolith" names the outcome; the
mechanisms are what you argue from.

Worth reading in full: Martin Fowler's
["What do you mean by 'Event-Driven'?"](https://martinfowler.com/articles/201701-event-driven.html)
— a short article that separates the four patterns hiding under one word, and the clearest primary
statement of the notification versus state-transfer trade.
