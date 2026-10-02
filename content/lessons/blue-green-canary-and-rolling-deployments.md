---
id: 01M3Y57FR45P436Z22ZEDFQ0VW
title: Blue-green, canary and rolling deployments
topic:
  - continuous-delivery
prerequisites:
  - the-deployment-pipeline
  - metrics-logs-and-the-golden-signals
---

Every deployment strategy answers the same question: while the new version replaces the old one,
who is exposed to it, and how do you get back if it is bad? **Blue-green** switches everyone at
once and keeps the old version warm, so going back is a router flip. **Canary** exposes a small
slice first and compares it to everyone else before going further. **Rolling** replaces instances a
few at a time, so old and new run side by side until it finishes. The three are compared on four
axes: **rollback speed, blast radius, capacity cost, and what the infrastructure must support**. A
senior answer to "how would you roll it out?" names a strategy and says what it costs on each axis.

The baseline they all improve on is the one with downtime. Kubernetes calls it `Recreate`: "All
existing Pods are killed before new ones are created"
([Kubernetes, Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)).
It is simple, nothing old and new ever runs together, and there is a gap with nothing serving, which
[[availability-and-the-nines#The nines, and what they cost|no high-nines target can afford]].

## Blue-green: two environments and a switch

Martin Fowler's
[BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html) describes "two
production environments, as identical as possible. At any time one of them, let's say blue for the
example, is live." You do the final testing of the new release in green, then "switch the router so
that all incoming requests go to the green environment." Blue is now idle. Rollback is the
same move in reverse: "if anything goes wrong you switch the router back to your blue environment."
The two then swap roles on every release, "regularly cycling between live, previous version (for
rollback) and staging the next version."

What it costs, on the four axes:

- **Rollback speed: as fast as a switch.** The old version is still running, so there is nothing to
  redeploy. The SRE Workbook calls rollback "a trivial reversal of the router change"
  ([Canarying Releases](https://sre.google/workbook/canarying-releases/)).
- **Blast radius: everyone.** The cutover moves all traffic at once, so a defect that testing in
  green missed reaches every user at the same moment.
- **Capacity: double.** The same chapter says plainly that the setup "uses twice as many resources
  as a more 'traditional' deployment."
- **What it needs:** something that can switch all traffic between two pools — a
  [[load-balancing|load balancer]] or router — and two environments kept as identical as possible.

Two caveats are in Fowler's own entry. First, the switch does not undo data: there is "still the
issue of dealing with missed transactions while the green environment was live." Second, the
database is usually shared, which makes schema changes the hard part. His advice is to "separate the
deployment of schema changes from application upgrades", so that the schema supports both versions
before the new code ships. How to do that is [[zero-downtime-schema-changes]]; the point here is
only that a router flip back to blue is safe only if blue still works against the database as green
left it.

Fowler also names a benefit that is easy to miss: it is "the same basic mechanism as you need to get
a hot-standby working," so every release tests your disaster-recovery switch.

```quiz 01M3Y57FR6DR8W6E1HECBAZMXF
A team uses blue-green deployment. Green has just gone live and starts returning errors. Why is
rolling back fast, and what does the fast rollback *not* take care of?

- [x] Blue is still running, so traffic flips back; data written while green was live is not undone
  > Rollback is "a trivial reversal of the router change", since nothing has to be redeployed. But
    Fowler names the leftover problem: transactions handled by green while it was live, and a
    schema blue must still be able to read.
- [ ] Blue is redeployed from the pipeline in seconds; only the green environment's logs are lost
  > Nothing is redeployed: blue is the previous version, still running and idle. That standing copy
    is what the doubled capacity pays for.
- [ ] Only a few users ever reached green, so rollback is quick; the canary metrics are the loss
  > That describes a canary. A blue-green cutover moves all traffic at once, so every user reached
    green the moment the router switched.
- [ ] The load balancer drains green's connections gradually; in-flight requests are all retried
  > The rollback is the same all-at-once router switch as the cutover. What it leaves unsolved is
    the data, not the connections.
```

## Canary: a slice first, compared against the rest

Danilo Sato's [CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html), on Fowler's site,
defines it as "slowly rolling out the change to a small subset of users before rolling it out to the
entire infrastructure." It starts like blue-green, with the new version deployed to infrastructure
"to which no users are routed". Then a few selected users are routed to it: a random sample,
internal staff first, or a chosen region or brand. More users follow as confidence grows. Rollback
"is simply to reroute users back to the old version." Sato notes it is also called a **phased
rollout** or an **incremental rollout**.

The SRE Workbook gives the definition that makes it rigorous: canarying is "a partial and
time-limited deployment of a change in a service and its evaluation." The part that receives the
change is **the canary**, and "the remainder of the service is 'the control.'" The *evaluation* is
what makes it a canary rather than a slow rollout. You compare the canary's signals with the
control's, and a canary needs three things: a way to deploy to a subset, an evaluation that decides
"good" or "bad", and that evaluation wired into the release process. When "the error rate of the
canary metric is too far from the control error rate," the chapter says to "pause and roll back the
deployment, or perhaps contact a human."

### Canary analysis is the golden signals, split by population

What you compare are the [[metrics-logs-and-the-golden-signals|golden signals]]. The Workbook
recommends "using SLIs as a place to start thinking about canary metrics," keeping to the top few
("perhaps no more than a dozen"). In its example the best are "HTTP return codes and latency of
response because their degradation most closely maps to an actual problem that impacts users". CPU
usage is a poor one, because a rise "doesn't necessarily impact a service" and makes the canary
noisy enough that operators start ignoring it.

Two mistakes in reading those signals are the ones interviewers probe:

- **Looking at the whole service.** In the Workbook's example the canary is 5% of traffic and fails
  20% of its requests. Whole-service monitoring sees an error rate of 1%, which "might be
  indistinguishable from other sources of errors." Broken down by population, canary against
  control, the problem is obvious. So your metrics must be **taggable by version or population**.
- **Comparing before and after.** Replacing the system and comparing this hour with last hour is
  "a canary deployment in time-space", and "time is one of the biggest sources of change in observed
  metrics" — weekday against weekend, peak against off-peak. The control runs at the same time as
  the canary, so time affects both equally.

The chapter's other practical rules: the canary must be large and long enough to be representative;
performance bugs "typically manifest only under heavy load", so an off-peak canary can miss them;
metric intervals must be no longer than the canary itself; and run "only one canary deployment at a
time", because overlapping canaries contaminate each other's signal.

```quiz 01M3Y57FR6WY19W9PRE416RVK2 cloze
A release candidate fails 20% of requests. Deployed to everyone, it fails {{20%}} of all traffic.
As a canary on 5% of traffic, the whole service sees an error rate of only {{1%}}, so the canary
risks a small part of the {{error budget}}. That same 1% can hide among other errors, which is why
canary metrics are compared {{canary against control}}, not across the whole service, and not
{{before against after}}, because time changes the metrics as well.
```

What canary costs, on the four axes:

- **Rollback speed: fast.** Reroute the canary's users; the old version is still serving everyone
  else.
- **Blast radius: the canary population.** The Workbook's point is that "impact on the
  [[metrics-logs-and-the-golden-signals#SLI, SLO, SLA: indicator, objective, agreement|budget]] is
  directly proportional to the amount of traffic exposed to defects."
- **Capacity: small.** Only the canary slice is extra.
- **What it needs:** traffic splitting by percentage or by user, monitoring that can tell canary
  from control, and an evaluation step in the pipeline. It also means **two versions serve real
  traffic at the same time**. Sato calls that the main drawback: "you have to manage multiple
  versions of your software at once," so keep the number to a minimum. Both versions also share the
  database, which again is [[zero-downtime-schema-changes]].

Sato also warns against using one canary for A/B testing. A canary is for finding regressions in
minutes or hours. An A/B test can need days to reach statistical significance, and running both on
the same split muddies each result. Exposing a *feature* to a slice of users is the job of
[[feature-flags-and-separating-deploy-from-release]]; a canary exposes a *version*.

## Rolling: replace instances a few at a time

A rolling deployment has no second environment and no separate evaluation. It replaces the fleet in
place. Kubernetes, where it is the default, describes it as "gradually scale down the old ReplicaSets
and scale up the new one"
([Kubernetes, Rolling Update Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)).
The concepts carry over to any platform. Two numbers set the pace:

- **Max unavailable** — how many instances may be down during the update. With the default of 25%,
  "it ensures that at least 75% of the desired number of Pods are up."
- **Max surge** — how many extra instances may exist above the desired count. With the default of
  25%, "at most 125% of the desired number of Pods are up."

Those two numbers *are* the capacity trade-off. Surge spends extra capacity to keep full serving
strength. Unavailability spends serving strength to avoid extra capacity. One of them must be
non-zero, or the rollout could never move.

What rolling costs, on the four axes:

- **Rollback speed: slow compared with the other two.** There is no idle copy of the old version
  waiting. Going back means rolling the previous revision through the fleet the same way (in
  Kubernetes, `rollout undo` back to an earlier revision).
- **Blast radius: grows as the rollout goes on.** Early on, few instances run the new version. If
  nothing stops it, every instance does. A rolling deploy limits the blast radius only if something
  watches it and halts it.
- **Capacity: at most the surge**, and zero if you accept running below strength.
- **What it needs:** a load balancer that sends traffic only to instances that are ready. That is
  the [[load-balancing#The fourth choice: health checks and slow-start|health check]] doing its
  job, so new instances receive traffic only once they can serve. And, as with canary, **old and new
  versions serve side by side** for the length of the rollout. Every request can hit either, and
  the schema has to work for both.

Rolling and canary sit close together. Google's
[Release Engineering](https://sre.google/sre-book/release-engineering/) chapter describes rollouts
fitted "to the risk profile of a given service": for large user-facing services, "starting in one
cluster and expand exponentially until all clusters are updated," and for sensitive infrastructure,
over several days "interleaving them across instances in different geographic regions." A staged
rollout with an evaluation between stages is a canary with several steps. The Workbook describes
exactly this, with a small first stage because "we have no confidence or knowledge about the
behavior of this release." A rolling deploy with no evaluation is just a slow cutover.

```quiz 01M3Y57FR6HPV27G274MZ8HBG7
A service has a tight hardware budget and cannot double its capacity even briefly. Bad releases
must reach as few users as possible, and the team can split traffic by percentage. Which strategy
fits best?

- [x] Canary: a small extra slice, judged against the control before the rollout goes further
  > Canary costs only the slice's capacity, and its blast radius is that slice's traffic. Comparing
    canary against control is what stops a bad version before it spreads.
- [ ] Blue-green: an instant router switch makes it the safest option for every release
  > The switch makes *rollback* fast, but it doubles capacity, which the budget rules out, and the
    cutover exposes every user at once.
- [ ] Rolling with no checks: replacing instances gradually already limits who sees the bug
  > Without an evaluation step, a bad version keeps rolling until every instance runs it. Gradual
    replacement limits exposure only if something halts it.
- [ ] Recreate: stopping everything first avoids running two versions side by side at once
  > It avoids version coexistence, but at the cost of downtime, and its blast radius is everyone the
    moment it starts.
```

## The comparison, in one place

| | Blue-green | Canary | Rolling |
| --- | --- | --- | --- |
| **Rollback** | Router flip back to the idle old version | Reroute the canary slice | Roll the old revision back through the fleet |
| **Blast radius** | Everyone, at cutover | The canary population | Grows with progress unless halted |
| **Extra capacity** | Double | The canary slice | Up to the max surge |
| **Infrastructure needs** | A switch for all traffic | Traffic splitting and per-population metrics | Readiness-aware load balancing |
| **Versions serve together?** | Not in the basic form, but they share the database | Yes, for the whole rollout | Yes, for the whole rollout |

They also combine. The Workbook notes that blue-green can be used "more or less as normal canaries"
by splitting traffic slowly between the two environments, with green as the control. And in a
[[microservices|service split]] all of this happens per service, which is why a service is
independently deployable only if it has its own [[the-deployment-pipeline|route to production]]. The
operational cost of that is in [[the-operational-surface-of-a-service-split]].

## Saying it in the room

When the interviewer asks "how would you roll this out?" or "what if the deploy is bad?", answer on
the four axes rather than naming a favourite. Choose blue-green when rollback has to be instant and
you can pay for double capacity. Choose canary when the blast radius has to be small and you can
split traffic and measure each population. Choose rolling as the cheap default when a slower rollback
is acceptable. Then say the part candidates leave out: **canary and rolling both run two versions at
once, and blue-green shares the database, so the schema must work for both** — which is
[[zero-downtime-schema-changes]]. A schema change is usually the thing that makes rollback hard.

```quiz 01M3Y57FR61NCXWD5ZBMSAM39V recall
An interviewer asks: "You're about to ship a new version of the checkout service. How do you roll it
out, and how do you know whether to stop?" Give the answer you would say out loud.

> I'd canary it. Deploy the new version to a small slice, say 5% of traffic, and leave the rest on
> the current version as the control. Then compare the two populations on the golden signals that
> users actually feel: error rate (HTTP status codes) and latency, split by version. I wouldn't use
> whole-service metrics, because 5% of traffic failing at 20% shows up as 1% overall and can
> disappear in the noise. I also wouldn't compare before and after, because time of day changes the
> metrics on its own. The canary has to run long enough, and at a busy enough time, to be
> representative. If the canary's errors or latency are clearly worse than the control's, the
> pipeline pauses and routes the slice back to the old version. If not, I widen it in stages.
>
> The trade-offs: blue-green would give me an instant rollback but costs double capacity and exposes
> everyone at once. A plain rolling deploy is cheapest but only limits damage if something halts it,
> and rolling back means rolling the old version through again. And because a canary runs two
> versions at the same time against the same database, any schema change has to be compatible with
> both — expand and contract — or I lose the ability to roll back.
```

## What to take away

Three strategies, four axes. **Blue-green**: two environments and a router switch, an instant
rollback, double the capacity, everyone exposed at cutover. **Canary**: a small slice judged against
a control running at the same time, on golden-signal SLIs split by population — never the whole
service, never before against after — with blast radius and error-budget cost proportional to the
slice. **Rolling**: replace instances in place, with max surge and max unavailable setting the
capacity trade-off; slow to roll back, and safe only if something halts it. Canary and rolling both
run old and new together, and blue-green shares the database, so the schema has to work for both
versions.

Worth reading in full: the Google SRE Workbook chapter
[Canarying Releases](https://sre.google/workbook/canarying-releases/). It defines canary against
control, works through the error-budget arithmetic, explains why before/after comparison and
whole-service metrics mislead, and compares blue-green, artificial load and traffic teeing.
