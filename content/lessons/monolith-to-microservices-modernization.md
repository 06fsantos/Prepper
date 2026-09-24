---
id: 01M37ZPZ5G1E2AP705REDMY86P
title: Modernizing a monolith
topic:
  - system-design
prerequisites:
  - the-eight-fallacies-of-distributed-computing
---

Most "should we do microservices?" questions in an interview are really *migration* questions:
there is a large monolith that already runs the business, and the ask is to modernize it
**without stopping the business it runs**. The senior signal here is not naming microservices —
it is knowing that a **big-bang rewrite almost always fails**, that the safe path is to carve the
new system out of the old one **incrementally** while both run side by side, and that the honest
destination is sometimes *not* microservices at all. The pattern with a name is the **strangler
fig**, and the whole conversation hangs off it. Lead with the risk you are managing —
keeping the lights on while the shape of the system changes underneath — and the patterns fall
out as answers to that risk.

## Why the rewrite is the wrong instinct

The tempting move is to freeze the monolith, build the replacement clean, and cut over on a
flag day. It is tempting because the monolith is where the pain is, and a fresh codebase has
none of the accumulated compromise. It fails for a reason that has nothing to do with
engineering skill: the monolith is a **moving target**. The business does not stop needing
changes while you rebuild, so either you freeze features for months — which the business will
not accept — or you build the replacement *and* keep patching the original, and the two drift
apart until the cutover is a guess. Meanwhile the replacement has shipped **zero value** until
the day it fully replaces the original, so the entire investment is at risk right up to a single
high-stakes switch, with no way to learn whether the new design is right until it is too late to
change cheaply.

Martin Fowler named the alternative after a plant. He watched strangler figs in Australia, which
"seed in the upper branches of a tree and gradually work their way down the tree until they root
in the soil" — eventually enveloping and replacing the host
([Fowler, StranglerFigApplication](https://martinfowler.com/bliki/StranglerFigApplication.html)).
The engineering version is the same shape: **grow the new system around the edges of the old
one**, route real traffic to each new piece as it is ready, and let the monolith shrink until it
is gone — or until what is left is small enough to leave alone. The migration ships value
continuously and stays reversible, because at every step both systems are live and a bad new
service can be routed back to the old code.

```quiz 01M37ZPZ5HSVFBETAF1H69YJ80
Why is an incremental strangler-fig migration usually preferred over a big-bang rewrite of a
running monolith?

- [x] The business keeps changing the monolith, so a rewrite chases a moving target and ships no value until a single risky cutover
  > A rewrite freezes nothing: the business still needs changes, so you either stall features or maintain two diverging systems, and the whole investment rides on one flag-day switch that can't be validated cheaply beforehand.
- [ ] A rewrite is technically impossible because the monolith's code cannot be read or understood at all
  > The old code is usually readable; the problem is organisational and risk-based, not that the source is unknowable. Plenty of rewrites are technically feasible and still fail on the flag-day risk.
- [ ] Microservices are always faster and cheaper to build than a monolith from a clean start
  > They aren't — distributed systems add real cost. The argument for incremental migration is risk management, not that the target is cheaper to build.
- [ ] Incremental migration avoids ever having to run the old and new systems at the same time
  > It's the opposite: the strangler fig depends on both running side by side, with traffic routed piece by piece. Coexistence is the mechanism, not something it avoids.
```

## The strangler fig, mechanically

The pattern needs one piece of machinery: a **routing layer** — a facade, a reverse proxy, or an
API gateway — sitting in front of the monolith that intercepts calls and decides, per request,
whether the old code or a new service handles it. Microsoft's write-up calls it exactly that:
"incrementally replace specific pieces of functionality with new applications and services," with
a facade that "intercept[s] requests going to the backend legacy system" and routes them "either
to the legacy application or the new services"
([Microsoft, Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)).

The loop is: pick one capability, build it as a new service, flip the router for that capability's
requests to the new service, watch it, and delete the now-dead code path in the monolith. Repeat.
Two properties make it safe:

- **Every step is small and shippable.** One capability moves at a time, so a mistake is one
  capability's worth of blast radius, not the whole system's.
- **Every step is reversible.** The router is a switch. If the new service misbehaves, you route
  its traffic back to the monolith, which is still there, and you have lost nothing but the
  attempt. This is why the router earns its place: it is the thing that makes the migration a
  sequence of cheap, undoable bets instead of one expensive irreversible one.

The router is also where you **measure** — it sees both paths, so it can compare the new service's
latency and error rate against the old code path before you trust it with all the traffic, and can
send it a fraction of requests first. The migration ends when the router forwards nothing to the
monolith and the facade is deleted along with it — or, deliberately, when what remains in the
monolith is not worth moving.

## Finding the seams: bounded contexts and decomposition

You cannot strangle a capability you cannot cut cleanly out of the monolith, so the hard part is
**where to cut**. The wrong axis is technical layers (pull out "the data-access layer"); the right
axis is **business capability**. The tool for finding those cuts is domain-driven design's
**bounded context**: a boundary inside which a model and its language are consistent, and across
which they change meaning. `Customer` in billing is not `Customer` in shipping; those are two
contexts, and the seam between them is a candidate service boundary (see [[bounded-context]] for the
canonical treatment). Sam Newman's guidance in
*Monolith to Microservices* is to extract along these seams, starting with the contexts that are
**easiest to separate** or that deliver the most value soonest — not the ones deepest in the
tangle.

Two hazards live at the seam, and naming both is the fluent answer:

- **The database is the real coupling.** A monolith's modules usually share one database and reach
  freely into each other's tables, so the code boundary is a fiction the schema does not respect.
  Splitting a service means giving it **its own data** and cutting the shared-table access — often
  the largest and riskiest part of the whole migration, done incrementally: a new service owns its
  tables, the monolith stops reading them directly and asks the service instead, and only then is
  the coupling actually gone. A "microservice" that still shares the monolith's database is a
  distributed monolith wearing a service's clothes.
- **The two models must be kept from corrupting each other.** While both run, the new service
  speaks the clean model and the monolith speaks the legacy one, and every call across the boundary
  is a chance for the legacy model's quirks to leak into the new design. The fix is an
  **anti-corruption layer** (ACL): a translation shim at the boundary that maps between the two
  models so the new service never has to adopt the monolith's vocabulary. Microsoft pairs the two
  patterns deliberately — the ACL "isolat[es] the two systems by placing an anti-corruption layer
  between them" and is a natural companion to the strangler fig during the coexistence period
  ([Microsoft, Anti-corruption Layer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)).
  It is scaffolding: once the monolith side is gone, the ACL can go with it.

```quiz 01M37ZPZ5HX1JYKYZSTRDVA2P1 cloze
The seams a monolith should be split along are its {{bounded contexts}} — business-capability
boundaries, not technical layers. The hardest and riskiest part of extracting a service is
usually decoupling the {{database}}, because a shared one couples modules the code pretends are
separate; the new service must own its own data. While the old and new systems coexist, an
{{anti-corruption layer}} translates between the two models so the legacy model's quirks don't
leak into the new design.
```

## Delivering business value while modernizing

The brief that senior engineers get is rarely "rewrite this" — it is "modernize this **while
delivering business value**," and that phrase is a constraint, not a platitude. It rules out the
long rewrite with no user-visible output for a year. The strangler fig satisfies it structurally,
but only if you sequence the work by **business capability and payoff**, not by architectural
tidiness:

- **Strangle the capabilities that pay first.** Move the piece that is changing most often, or
  hurting most, or blocking a new feature — so each extraction unlocks something the business
  wanted anyway, and the migration funds itself in value as it goes. Extracting a stable,
  never-touched corner first is technically valid and a poor use of the risk budget.
- **Keep the lights on.** Because both systems run and the router is reversible, users see
  continuous service, not a maintenance window. Feature work continues on the monolith for
  capabilities not yet moved; the migration does not freeze the business.
- **Measure the move.** Modernization has to be *demonstrated*, not asserted. Watch the new
  service's latency, error rate, and the business metric the capability drives, through the router,
  and compare against the old path before and after cutover. "We modernized it" with no numbers is
  a down-level answer; "error rate on checkout fell and we can now deploy it independently" is the
  senior one.

The through-line is that the architecture change is in service of a business outcome, and the
migration is judged on outcomes delivered along the way — not on reaching a target diagram.

## The honest tradeoffs — and when not to split

Splitting a monolith buys **independent deployability, independent scaling, and team autonomy**:
each service ships on its own cadence, scales to its own load, and is owned end-to-end by one
team. That is the case for microservices, and it is real. But the moment a call that used to be an
in-process method becomes a network hop, you inherit **every** [[the-eight-fallacies-of-distributed-computing|fallacy
of distributed computing]] — the network is not reliable, latency is not zero, the topology
changes — and the [[consistency-models|strong consistency]] a single database gave you for free
becomes a distributed-transaction problem you now solve with sagas and
[[idempotency-and-safe-retries|idempotent]] handlers. A cross-service query that was a SQL join is
now an orchestration. This is the **distributed-systems tax**, and it is charged whether or not
the split was worth it.

So the fluent answer names the exit: **do not split when the tax buys you nothing.** Fowler's own
guidance is **"MonolithFirst"** — most systems that succeeded as microservices started as
monoliths that were later broken up, and most that were built microservices-first from scratch ran
into serious trouble; you do not yet know the right boundaries until the domain has taught them to
you ([Fowler, MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)). And the
strangler fig's destination need not be many services at all: a **modular monolith** — one
deployable with clean internal module boundaries along the same bounded contexts — captures most
of the maintainability and none of the network tax, and is a perfectly valid place to stop. The
migration that matters is often **decoupling the modules**, not distributing them; you split into
separate services only for the modules that genuinely need independent scaling or deployment, and
leave the rest in one process.

```quiz 01M37ZPZ5H0N2RXDD66H8K15AW recall
An interviewer says: "We've got a big monolith and leadership wants to 'go microservices.' Walk me
through how you'd approach it — and would you even do it?" Give the answer you'd say out loud.

> I'd separate two questions: how to migrate safely, and whether full microservices is the right
> destination at all.
>
> On the how: not a big-bang rewrite — the monolith is a moving target, the business keeps needing
> changes, and a rewrite ships no value until one risky flag-day cutover. I'd use the **strangler
> fig**: put a routing facade in front of the monolith, then extract one capability at a time into
> a new service, flip the router for that capability's traffic, verify it against the old path, and
> delete the dead code. Every step is small, shippable, and reversible, because the monolith is
> still there to route back to.
>
> I'd cut along **bounded contexts** — business capabilities, not technical layers — and sequence
> by payoff, moving what's changing most or blocking a feature first, so modernization delivers
> value as it goes. The hardest part is decoupling the **shared database** so each service owns its
> data; while both run I'd put an **anti-corruption layer** at the boundary so the legacy model
> doesn't leak into the new one.
>
> On the whether: I'd push back on "go microservices" as a goal. Every split turns a method call
> into a network hop and buys the whole distributed-systems tax — the fallacies, eventual
> consistency, sagas instead of joins. So I'd split only the modules that genuinely need
> independent scaling or deployment, and be happy to land on a **modular monolith** — clean module
> boundaries, one deployable — for the rest. Independent deployability is the prize; distribution
> is the cost, and you pay it only where it's earned.
```

## What to take away

Modernizing a monolith is a **risk-management** problem before it is an architecture problem. The
big-bang rewrite fails because the monolith is a moving target and value arrives only at a single
risky cutover; the **strangler fig** replaces it with a sequence of small, reversible steps —
a **routing facade** sends each capability's traffic to a new service as it is ready, and the
monolith shrinks until it is gone or small enough to leave. Cut along **bounded contexts**, not
technical layers; the real coupling is the **shared database**, so each service must own its data,
and an **anti-corruption layer** keeps the two models from corrupting each other while they
coexist. Sequence by **business value** and *measure* the move through the router, because
"modernize while delivering value" is the actual brief. And name the honest cost: every split pays
the **distributed-systems tax** of the [[the-eight-fallacies-of-distributed-computing|eight
fallacies]] plus lost strong consistency — so **do not split what does not need it**, and treat a
**modular monolith** as a legitimate destination. Independent deployability is the benefit;
distribution is the price, paid only where it is earned.

Worth reading in full: Sam Newman's *Monolith to Microservices* (O'Reilly) for the decomposition
patterns and the database-splitting playbook, and Martin Fowler's
[StranglerFigApplication](https://martinfowler.com/bliki/StranglerFigApplication.html) and
[MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html) for the metaphor and the
"start with a monolith" argument the whole approach rests on.
