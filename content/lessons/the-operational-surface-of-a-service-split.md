---
id: 01M3AMXNSG8JNQTYHFC1A3GSTN
title: The operational surface of a service split
topic:
  - system-design
  - distributed-systems
prerequisites:
  - microservices
  - the-eight-fallacies-of-distributed-computing
---

Split a system into [[microservices|independently-deployed services]] and you inherit a problem
the monolith never had: the services still have to **find each other, route to each other, and be
governed** across a network that is [[the-eight-fallacies-of-distributed-computing|none of the
things a single-machine mindset assumes it is]]. This is the operational surface — the cross-cutting
infrastructure a split forces you to run, over and above the services themselves. It is the tax the
fallacies predict, and it is where a design-round answer proves it has thought past "and then we
have microservices."

The senior move here is not to name Istio or an API gateway; it is to say **what problem each piece
solves, and to be honest about the one it costs you back**. Every mechanism below trades duplicated
per-service work for a shared piece of infrastructure that is itself a thing to run, scale, and keep
from becoming the new single point of failure. This Lesson maps that surface: the discovery problem,
the gateway at the edge, the mesh between services, and the ops bill at the end that a monolith never
paid.

## The problem a split creates

Inside a monolith, a call to another module is a method call: the address is a memory reference the
compiler resolved, and auth, encryption, and retries were nobody's problem because nothing left the
process. Split the modules into services and every one of those free things comes due at once:

- **Many addresses, and they move.** A caller no longer has a reference; it has a network location
  that changes as instances are added, removed, redeployed, and rescheduled. "The network is
  reliable" and "topology doesn't change" — [[the-eight-fallacies-of-distributed-computing|two of
  the fallacies]] — are now daily facts, and a hard-coded host is a bug waiting for the next deploy.
- **Many hops, each unreliable.** One user request that was a chain of method calls is now a chain of
  network calls, any of which can be slow, fail, or fail *after* doing the work. Each hop needs a
  timeout, a retry policy, and a way not to take the caller down with it.
- **Cross-cutting concerns, now duplicated per service.** Every service independently needs TLS,
  authentication, authorization, rate limiting, logging, and metrics. Implemented service-by-service,
  that is the same code written a dozen times, drifting a dozen ways — and a security fix that has to
  land in a dozen places lands unevenly.

The operational surface is the set of shared answers to these three problems. **Discovery** answers
*where is the callee*; the **gateway** and the **mesh** answer *how do I call it safely and who is
allowed to* — the gateway at the system's edge, the mesh between services inside it. The theme
throughout is **pull the duplicated concern down into infrastructure so it is solved once**, and the
counter-theme is that the infrastructure is not free.

## Service discovery

Because instances come and go, a caller cannot hold a fixed address; it has to **look one up** at
call time. A **service registry** is the piece that makes that possible: a live catalogue of which
instances of which service are currently up and where they are. Instances are added to it when they
start — either registering themselves, or registered by the platform that launched them — and, just
as importantly, removed when they stop being healthy. That removal rests on **health checks**: the
registry (or a checker beside it) probes each instance, and an instance that fails to answer is
pulled from the catalogue so no new traffic is routed to it. A registry that points at a dead
instance is worse than no registry, because it sends requests confidently into a black hole; keeping
it fresh is the whole job, and health checks are how it is done — imperfectly, since a check that
passed a second ago does not guarantee the next real request succeeds.

There are two broad shapes for who does the lookup, and the distinction is worth being able to
state — Chris Richardson's microservices.io catalogues them as the
[client-side and server-side service-discovery patterns](https://microservices.io/patterns/service-registry.html),
around the same service-registry piece described above:

- **Client-side discovery.** The caller queries the registry itself, gets back the list of healthy
  instances, and picks one — doing its own [[load-balancing|load balancing]] across them. It is one
  fewer network hop and gives the client full control of the balancing policy, at the cost of putting
  discovery logic into every client (and, classically, into every language a client is written in).
- **Server-side discovery.** The caller sends the request to a fixed intermediary — a load balancer
  or router — which consults the registry and forwards to a healthy instance. The client stays simple
  and knows only one address; the trade is an extra hop and a router tier you now run. This is the
  shape platform load balancers and orchestrators like Kubernetes commonly implement for you.

Either way, discovery is the concrete answer to the "topology changes" fallacy, and it is why a
design that says "service A calls service B" owes a follow-up sentence about *how A finds B* when B
has five instances that were rescheduled onto new hosts this morning.

```quiz 01M3AMXNSG2R3HZ235JHJDNJGG
A service registry lists three healthy instances of the payments service, but one of them crashed
two seconds ago and the registry hasn't noticed yet. A caller looks it up and routes there. What is
the most precise thing this shows about discovery?

- [x] The registry is only as good as its health checks, and a stale entry routes traffic to a dead instance
  > Discovery depends on the catalogue being fresh, which depends on health checks pruning dead
    instances. There is always a window between a crash and its detection, so callers still need
    [[retry-versus-circuit-breaker|retries and circuit breaking]] for the requests that slip through it.
- [ ] Client-side discovery is unsafe and server-side discovery would have prevented this entirely
  > Neither shape prevents it: both read the same registry, so both inherit the same detection lag.
    The stale window is a property of health-checking, not of who does the lookup.
- [ ] The registry should never remove instances, since removing one caused the crash to matter
  > Removing dead instances is the registry's core job; the problem is that it hadn't removed this
    one *yet*, not that it removes them at all. Keeping stale entries would make every crash matter more.
- [ ] Discovery is unnecessary if the caller simply hard-codes the three instance addresses
  > Hard-coding is exactly what discovery exists to replace: the instances were rescheduled onto new
    hosts, so a hard-coded address breaks on the next deploy. That is the topology-changes fallacy.
```

## The API gateway

The **API gateway** is a single entry point that sits at the **edge** of the system, in front of the
services, and is the one address external clients talk to. It exists to solve the duplication problem
from above **once, at the boundary**, rather than in every service:

- **Edge routing.** It maps an incoming request — by path, host, or method — to the service that
  should handle it, so a client sees one coherent API instead of a dozen service addresses. The
  contracts it fronts are the ones [[api-design|API design]] is about.
- **Auth and TLS termination.** It terminates TLS at the edge and authenticates the caller —
  validating the [[oauth-oidc-and-jwt|OAuth/OIDC token or JWT]] — so a request is proven to belong to
  someone *before* it reaches any service, and the services behind it are not each re-implementing
  token validation.
- **Rate limiting and load balancing.** It sheds overload and enforces fair use at the edge — the
  [[rate-limiting|token-bucket throttle]] per client or key that AWS's own gateway applies
  ([AWS API Gateway request throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html))
  — and spreads the requests it lets through across instances, which is [[load-balancing|load
  balancing]] doing its edge job.
- **Response aggregation.** For a client that would otherwise make several calls, the gateway can fan
  out to several services and compose one response — useful for a mobile client on a slow link, and
  the seed of the backend-for-frontend pattern.

The cost is structural and worth naming before the interviewer does: **every external request flows
through the gateway, so it is a bottleneck and a single point of failure by construction**. It has to
be scaled out and made redundant like any edge tier, and the more work you give it — especially
aggregation, which couples it to the latency of everything it calls — the more it becomes a place
where the whole system can slow down or fall over at once. The failure mode to avoid by name is
putting *business logic* in the gateway: do that and you have quietly rebuilt a monolith at the edge,
with all the services reduced to data access behind it. Keep it to routing and cross-cutting
concerns; that is the line that keeps it thin.

## Service mesh and the sidecar

The gateway governs **north-south** traffic — the edge, external clients coming in. It does nothing
for **east-west** traffic — the far larger volume of service-to-service calls happening inside the
system. A **service mesh** is the infrastructure that governs *those*, and its defining mechanism is
the **sidecar**: a small proxy deployed right alongside each service instance, through which all of
that instance's inbound and outbound traffic is routed. The service itself talks to what looks like
localhost; the sidecar does the network work. A central **control plane** configures every sidecar,
and the sidecars themselves are the **data plane** that carries the traffic. This is the shape most
service meshes implement — Sam Newman's _Building Microservices_ (2nd ed., O'Reilly, 2021) has a
service-mesh section describing it, and mainstream implementations like Istio and Linkerd apply the
same control-plane / data-plane split.

Pushing the network concerns down into that proxy is the whole point, because it moves them out of
application code and out of every language's libraries into one uniform layer:

- **mTLS between services.** The mesh can give every service an identity and encrypt every hop with
  mutual TLS, so "the network is not secure" is handled once for the whole system rather than
  configured service by service.
- **Retries, timeouts, and circuit breaking as configuration.** What
  [[retry-versus-circuit-breaker|retry versus circuit breaker]],
  [[total-versus-per-attempt-timeouts|per-attempt versus total timeouts]], and
  [[bulkheads-and-blast-radius|bulkheads]] teach as things you write into a resilience pipeline in
  code, a mesh can apply as **policy in the sidecar** — the same behaviour, moved from the library to
  the infrastructure, so it is consistent across services written by different teams in different
  languages.
- **Traffic shifting.** Because the sidecars route every call, the mesh can send a small percentage of
  traffic to a new version — a canary — and roll forward or back by changing a rule, without touching
  the services.

And now the honest part, because a mesh is where microservices architectures commonly over-build.
**A mesh is itself a distributed system**: a control plane to run and a proxy running beside every
single instance, which costs latency on every hop, memory and CPU per instance, and a real
operational learning curve. It earns that complexity when you have **enough services that per-service
libraries are the bigger problem** — many services, several languages (one sidecar behaves the same
for all of them where a resilience library would have to be rewritten per language), a hard mTLS or
compliance requirement across all traffic, or a genuine need for fine-grained traffic control. Below
that scale — a handful of services, one language — a shared resilience library for retries and
timeouts plus TLS terminated at the gateway does the same job with far less to run, and reaching for
a mesh there buys operational weight for benefits the system is too small to collect. "Would a mesh
help here, or is it complexity we haven't earned?" is exactly the kind of trade-off a design round is
listening for.

```quiz 01M3AMXNSGV0QFS9PA0E42F1YA cloze
A service mesh routes every service-to-service call through a {{sidecar}} proxy deployed beside each
instance, configured by a central {{control plane}}. This lets the infrastructure — rather than each
service's own code — provide {{mTLS}} between services and enforce retries, timeouts, and circuit
breaking as policy. The catch is that the mesh is itself a distributed system to run, so for a small
number of services it often is {{not}} worth the complexity.
```

## The honest ops tax

Put the pieces together and the point of the Lesson lands: a split does not just give you services,
it gives you a standing bill of infrastructure to operate that a monolith never had. Stated plainly,
because "what do you now run that a monolith didn't?" is a question a good interviewer will ask:

- **Discovery** — a registry and the health-checking that keeps it honest.
- **An edge tier** — the gateway, scaled and made redundant, doing auth, TLS, and throttling.
- **Possibly a mesh** — a control plane and a proxy per instance, if the scale earns it.
- **Aggregated observability** — logs are now scattered across many services, so they have to be
  collected centrally; a single request crosses many services, so you need [[metrics-logs-and-the-golden-signals|metrics
  and the golden signals]] per service and distributed tracing to follow one request end to end. In a
  monolith this was one log file and one stack trace.
- **Deployment machinery** — independent deployability is only real if each service has its own
  pipeline, and something has to schedule, place, and restart all of them (the container-orchestration
  layer). That machinery is the price of the "deploy on its own" prize.

None of this is the point of the system; all of it is the cost of having split it. That is why the
honest answer to "should we go microservices?" includes this surface, and why
[[microservices|the microservices Lesson]] insists the split is worth it **only where the prize of
independent deployability beats the price** — and this operational surface is a large part of that
price. A monolith with a clean module boundary pays none of it.

```quiz 01M3AMXNSG23G6SNHRGP16DV05 recall
An interviewer says: "You've proposed splitting this into services. What do you now have to run and
operate that the monolith didn't — and how would you decide it's worth it?" Give a focused answer.

> Splitting adds a whole operational surface on top of the services. First, **service discovery** — a
> registry of healthy instances kept fresh by health checks — because instances move and I can't
> hard-code addresses. Second, an **API gateway** at the edge as the single entry point: it does
> routing, terminates TLS, authenticates the caller's token once so the services don't each
> re-implement it, and rate-limits — accepting that it's a bottleneck and single point of failure I
> have to scale and keep thin. Third, for service-to-service traffic, possibly a **service mesh**:
> sidecar proxies that give me mTLS and push retries, timeouts, and circuit breaking down into
> infrastructure — but a mesh is itself a distributed system, so I'd only reach for it with enough
> services and languages to justify it, not for a handful. And underneath all of it: **aggregated
> logging, distributed tracing, per-service pipelines, and orchestration**, because one process, one
> log, and one deploy have become N of each.
>
> How I'd decide it's worth it: the split is worth it only where **independent deployability** buys
> something real — a part that must scale or ship on its own cadence, or a team that must own it — and
> that benefit beats this standing operational bill. If it doesn't, a modular monolith pays none of
> this, and I'd stay there.
```

## What to take away

A service split forces you to run infrastructure a monolith never needed, because the services now
have to find, route to, and be governed across an unreliable network. **Service discovery** — a
registry kept fresh by health checks — answers *where is the callee* when instances move; the lookup
is either client-side (the caller balances) or server-side (a router balances). The **API gateway**
is the single edge entry point that solves TLS, auth, rate limiting, and routing once at the
boundary, at the cost of being a bottleneck and single point of failure you must scale and keep thin.
The **service mesh** governs service-to-service traffic through **sidecar** proxies, pushing mTLS and
resilience policy down into infrastructure — powerful at scale, and usually not worth its complexity
for a small system. The through-line is the same one the split itself rides: each mechanism trades
duplicated per-service work for shared infrastructure that is itself a thing to run, and the honest
accounting of "should we split?" has to include this whole surface as part of the price.

Worth reading in full: Sam Newman's _Building Microservices_ (2nd ed., O'Reilly, 2021) is the single
best treatment of this surface — its chapters on service communication, and on the operational
concerns of running many services, walk the discovery, gateway, and observability problems in the
order a real system meets them.
