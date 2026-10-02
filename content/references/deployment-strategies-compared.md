---
id: 01M3Y5GPY0N4A2NK81BC7DAV0W
title: Deployment strategies compared
topic:
  - continuous-delivery
---

How each way of putting a new version in front of users answers the same two questions: who is
exposed while it happens, and how do you get back if it is bad. Six strategies against the axes an
interviewer probes. They are not all alternatives to one another — a feature-flag release still
rides on one of the deploy strategies, and blue-green can be run as a canary — so read each row as
*what is this one for*.

## By what you need

| The constraint | Reach for | Because |
|---|---|---|
| Rollback must be instant, and you can pay for a second environment | **Blue-green** | The old version is still running; going back is a router flip |
| A bad release must reach as few users as possible | **Canary** | Exposure, and error-budget cost, are proportional to the slice |
| A cheap default, and a slower rollback is acceptable | **Rolling** | No second environment; extra capacity is at most the surge |
| Two versions must never serve at once, and a gap in service is acceptable | **Recreate** | Everything old stops before anything new starts |
| The feature must ship now and be released later, or switched off without a deploy | **Feature-flag release** | Release and rollback become configuration changes |
| A back-end change must be measured on real load before anyone sees it | **Shadow (dark) traffic** | The new code runs on real requests and its answers are discarded |

## The comparison

| Strategy | Rollback | Blast radius | Extra capacity | The infrastructure must support | Two versions coexist? |
|---|---|---|---|---|---|
| **Recreate** | Redeploy the old version, with the same gap | Everyone, plus downtime | None | Nothing beyond the deploy itself | No — the one strategy where they never serve together |
| **Rolling** | Slow: roll the old revision back through the fleet | Grows with progress unless something halts it | Up to the max surge; zero if you run below strength | A load balancer that routes only to ready instances | Yes, for the whole rollout |
| **Blue-green** | Instant: switch the router back | Everyone, at cutover | Double | A switch for all traffic, and two environments kept as identical as possible | Not serving together in the basic form, but both use the same database |
| **Canary** | Fast: reroute the canary slice | The canary population | The canary slice | Traffic splitting by percentage or user, metrics split by version, an evaluation step in the pipeline | Yes, both serve real traffic for the whole rollout |
| **Feature-flag release** | Flip the flag: a config change, no deploy | The cohort the flag is on for | None — both code paths are in one artifact | A toggle router, and configuration that can change at runtime | Both *behaviours* are live, across cohorts |
| **Shadow (dark) traffic** | Turn the calls off; no user saw a result | No user sees its answers, but its load and shared state are real | Whatever serves the copied traffic | Copying requests to the new code (at the router, or in code behind a flag) and discarding the responses | Yes, both run on every shadowed request |

**The schema column is the coexistence column.** Wherever two versions share the database — every
row but recreate — a schema change has to work for both, so it ships as expand, migrate, contract
rather than in lockstep with its code. Recreate is not exempt either: its rollback still needs the
old code to run against the new schema. A flag can even be
the switch that moves the code between old and new columns during the migrate phase. See
[[zero-downtime-schema-changes]].

## What each one is for, and its source

- **Recreate** — "All existing Pods are killed before new ones are created"
  ([Kubernetes, Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)).
  Simple, and the baseline the others improve on: there is a gap with nothing serving.
- **Rolling** — "gradually scale down the old ReplicaSets and scale up the new one", with max
  unavailable and max surge both defaulting to 25%
  ([Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)).
  Those two numbers *are* the capacity trade-off. A rolling deploy with no evaluation between stages
  is a slow cutover.
- **Blue-green** — two production environments and a router; rollback is "switch the router back"
  ([Fowler, BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)). It
  "uses twice as many resources as a more 'traditional' deployment"
  ([SRE Workbook, Canarying Releases](https://sre.google/workbook/canarying-releases/)), and it tests
  your hot-standby switch on every release.
- **Canary** — "a partial and time-limited deployment of a change in a service and its evaluation"
  ([SRE Workbook](https://sre.google/workbook/canarying-releases/)); the evaluation, canary against a
  control running at the same time, is what makes it more than a slow rollout. Sato's
  [CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html) names the cost: "you have to
  manage multiple versions of your software at once."
- **Feature-flag release** — code ships latent and is released by configuration, "separating
  [feature] release from [code] deployment"
  ([Hodgson, Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)). Every flag
  is inventory with a carrying cost, so it needs a removal date.
- **Shadow (dark) traffic** — two names for one idea. Traffic **teeing** copies production traffic
  to the new version, which "serves the copy and discards the responses"
  ([SRE Workbook](https://sre.google/workbook/canarying-releases/)). A **dark launch** calls new
  back-end behaviour "from existing users without the users being able to tell it's being called",
  behind a flag that can switch it off "before anyone really notices"
  ([Fowler, DarkLaunching](https://martinfowler.com/bliki/DarkLaunching.html)).

## The things that cost people points

- **A fast rollback of the code is not a rollback of the data.** Blue-green's router flip leaves
  "missed transactions while the green environment was live", and a schema the old version cannot
  read makes any strategy's rollback unsafe. A dropped column cannot be redeployed.
- **A flag exposes a feature; a canary exposes a version.** They answer different questions and
  combine rather than compete: a flag release still needs a deploy strategy to get the code onto the
  servers. Using one canary split as an A/B test muddies both — a canary wants an answer in minutes
  or hours, an experiment can need days.
- **Canary metrics are compared canary against control, never across the whole service and never
  before against after.** A 5% canary failing 20% of its requests is a 1% blip in the whole-service
  error rate.
- **Shadow traffic proves less than it seems.** It "doesn't adequately identify risk in stateful
  systems" — a shared cache inflates the hit rate and spoils the measurement
  ([SRE Workbook](https://sre.google/workbook/canarying-releases/)) — and it cannot test anything a
  user has to choose to do: "To test something that depends on a user's choice, Canary Release is
  the way to go" ([Fowler](https://martinfowler.com/bliki/DarkLaunching.html)). And "dark launch"
  has drifted to mean a canary for some people, so define it when you say it.

Full treatment: [[blue-green-canary-and-rolling-deployments]] for the three deploy strategies,
[[feature-flags-and-separating-deploy-from-release]] for flags and dark launches, and
[[zero-downtime-schema-changes]] for the schema every coexisting pair shares.
