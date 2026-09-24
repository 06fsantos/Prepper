---
id: 01M3ANGJWAZ4S58WYDVHGRWD39
title: A reading order for microservices
topic:
  - system-design
  - distributed-systems
  - strategic-design
---

Everything the vault holds on microservices, in the order that makes each note land — what a
service *is* first, then where its boundary goes, then the taxes a split pays (the network, the
data, the integration, the operations), and finally the decision the whole subject is really
about: whether to split at all. The vault carries no reading order of its own: `prerequisites`
is a graph and there are no lesson numbers. This is one path through that graph, and where a note
disagrees with this page the note wins.

Two things are worth noticing before starting. **The definition comes before the machinery** —
[[microservices]] is read first because every step after it is a *cost* of the thing it defines,
and a cost is only legible once you know what you are buying: independent deployability, bought
with distribution. **And the "should we?" comes last, not first** — [[monolith-to-microservices-modernization]]
is the capstone rather than the opener, because the honest answer to "should we split?" is
unarguable until you have priced the network tax, the data tax and the operational tax it is
weighed against. Reading the migration decision first is how a design answer ends up
recommending microservices for a system that wanted a modular monolith.

The other thing to notice is what this path deliberately does **not** re-walk. Two large clusters
sit *beside* this reading order rather than inside it — the whole of Domain-Driven Design behind
step 2, and the whole of the `http-resilience` cluster behind step 9 — and both are handed off to
their own reading orders at the foot of this page rather than inlined here. A microservices path
that re-listed thirty notes would be a path nobody finishes.

## The order

| #  | Read | Scope | Why here |
|----|------|-------|----------|
| 1  | [[microservices]] | Concept | The front door: the two defining properties (independent deploy, own data store), the **database-per-service** pattern that buys the autonomy, and the trade-off map that names where every cost below is taught. Read first because it is the definition the rest of the path spends |
| 2  | [[bounded-context]] | Concept | Where a service boundary goes. A context is the *starting* granularity for a service — Newman's bridge, and **not one-to-one** — so this is the one boundary note the microservices lens needs; step 1 records it as its prerequisite. The full boundary story is a companion order below |
| 3  | [[the-eight-fallacies-of-distributed-computing]] | Concept | The network tax. The eight assumptions a single-process program smuggles into a network, every one false — read here because a service split turns every in-process call into one of these, and naming which fallacy a hop leans on is half the design conversation |
| 4  | [[consistency-models]] | Concept | The data tax. Once each service owns its own store, a read can be stale by design; this is the spectrum from strong to eventual and why eventual is a *choice*. It is the vocabulary the integration steps below reach back into every time they name a stale read |
| 5  | [[api-design]] | Concept | The first integration surface: synchronous contracts between services — REST / gRPC / GraphQL, versioning, and the idempotency key that makes a cross-service retry safe. Read before the async steps because it is the integration style a reader already half-knows |
| 6  | [[message-queues]] | Concept | The async surface: queue vs log vs pub/sub, "effectively once" in place of exactly-once, and backpressure. Read after synchronous contracts because async integration is the move you reach for precisely when a synchronous call would couple two services too tightly |
| 7  | [[event-sourcing-and-cqrs]] | Concept | The pattern that lets services stay decoupled *and* consistent: store the events, split the write model from the read model. Read after queues because the events it stores are the messages step 6 moves, and it prerequisites [[consistency-models]] for the eventual-consistency bill it runs up |
| 8  | [[azure-service-bus-and-event-driven-soa]] | Azure | The broker made concrete, and where database-per-service's bill comes due: the **outbox** pattern for the dual-write problem, the **saga** for a workflow that spans services with no distributed transaction, command vs event. The one product-specific step — the patterns transfer, the SDK does not |
| 9  | [[the-operational-surface-of-a-service-split]] | Concept | The operational tax. Service discovery, the API gateway, and the service mesh/sidecar — how independently-deployed services find, route to, and are governed across the network. Read late because it is the cost you pay *after* the split is designed, and it prerequisites both step 1 and step 3 |
| 10 | [[monolith-to-microservices-modernization]] | Concept | The capstone: **should we even split?** Strangler fig, MonolithFirst, extract-along-the-seams, and the honest "when not to". Read last because it is the decision the whole path exists to inform — and the vault's senior signal is that "should we go microservices?" is a *migration* question, not a greenfield one |

Steps 1–2 are the definition and its boundary, and can be read as a pair: together they answer
"what is a service, and how big is one". Steps 3–4 are the two taxes that are *theory* — the
network and the data — and are the vocabulary the rest of the path spends; a reader who already
knows the eight fallacies and the consistency spectrum can skim them and move on. Steps 5–8 are
the **integration spine**, read close together: synchronous first, then the three async moves
that let services stay decoupled, ending on the broker where the outbox and the saga make the
database-per-service bill concrete. Step 9 is the operational tax the split forces, and step 10
is the decision it all informs.

## Companion reading orders

Two clusters are handed off rather than inlined — open each when its step makes you want the
whole story:

- [[reading-order-for-domain-driven-design]] — the full boundary story behind step 2. Where step
  2 gives the one bounded-context idea the microservices lens needs, this orders the whole
  subject: ubiquitous language, aggregates, context maps, and how contexts integrate without
  coupling. Read it when "where exactly does the boundary go?" becomes the question.
- [[reading-order-for-api-requests]] — the `http-resilience` cluster behind step 9. The service
  mesh in step 9 pushes retries, timeouts and circuit-breaking *down into infrastructure*; this
  reading order is what those patterns actually are, in code — retry vs circuit breaker, total vs
  per-attempt timeouts, bulkheads, and idempotent-safe retries. Read it when you want to know
  what the mesh is doing on your behalf.

## Practice checkpoint

Microservices in an interview is a **spoken design conversation, not a solved artifact** — the
question is almost never "write a service" and almost always "how would you decompose this?" or
"should this be microservices at all?". So the rehearsal is spoken. After step 10, take a
monolith you know — an order system, a booking system — and run the decomposition aloud: name the
bounded contexts (step 2), pick the *starting* service boundaries and say why you would split no
finer, then walk one cross-service workflow end to end and say out loud where the transaction
became a saga (step 8), where a read went eventually consistent (step 4), and what you now have
to run that you did not before (step 9). Then argue the *other* side — why this system might want
a modular monolith instead (step 10). If you go quiet, that is the [[what-senior-means-as-a-level|mission's]]
named failure mode surfacing, and it is exactly what the rehearsal is for.

## The stack-specific half, stated plainly

Nine of the ten steps are concepts that transfer to any stack; **one is product-specific.** Step
8 is written against Azure Service Bus, and step 7's examples lean .NET — but the *patterns* they
teach (outbox, saga, event sourcing, CQRS) are the field's, not a runtime's. What the
product-shaped ideas look like elsewhere, so the concept has somewhere to land:

| The idea | Where you meet it in production |
|---|---|
| Async broker (queue / topic) | Azure Service Bus ↔ RabbitMQ, AWS SQS + SNS, Google Cloud Pub/Sub — the competing-consumers queue and the fan-out topic in every ecosystem |
| Event log (ordered, replayable) | Kafka is the reference; Azure Event Hubs, AWS Kinesis, Google Pub/Sub Lite are the managed equivalents — the shape step 7's event store and step 6's "log" both assume |
| The outbox pattern | Not a product — a pattern. Debezium (change-data-capture off the DB log) is the common off-the-shelf relay; most teams hand-roll the outbox table and a poller |
| Saga orchestration | Azure Durable Functions or a workflow engine (Temporal, Camunda) for orchestrated sagas; plain broker choreography for the decentralized kind |
| API gateway | Azure API Management ↔ Kong, AWS API Gateway, NGINX, Envoy — edge routing, auth/TLS termination, throttling |
| Service mesh | Istio and Linkerd are the reference meshes; Consul Connect and AWS App Mesh are the managed kind — the sidecar doing mTLS and retries-as-infra |
| Service discovery | Consul, etcd, Netflix Eureka; in a Kubernetes cluster, Services and DNS do server-side discovery for you |

The claim that survives any stack: **a microservice split buys independent deployability with
distribution**, and every step of this path is one of the ways that bill comes due — so the design
answer is never "use microservices", it is "split here, for this autonomy, and here is the network,
data and operational cost I am paying for it".

## The night before

[[system-design-cheat-sheet]] and [[distributed-systems-cheat-sheet]] — the microservices and
operational-surface blocks live in the first, the consistency and fallacies material in the
second. A reading order is for the fortnight before; a cheat sheet is for the morning of.
