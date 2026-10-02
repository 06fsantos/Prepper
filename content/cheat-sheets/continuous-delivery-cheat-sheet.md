---
id: 01M3Y4YNV1P6D2RZS0S6AF2GG6
title: Continuous delivery — cheat sheet
topic: continuous-delivery
---

## Say which D you mean

- **CI** is a *merge frequency*: everyone merges into **mainline at least daily**, every push runs a
  self-testing build, and a red build is **fixed first**, usually by reverting. A CI server building
  feature branches is **semi-integration**, not CI.
- **Continuous delivery** is a *state*: every green build is **releasable**, deployable on demand.
  **Release is a business decision.**
- **Continuous deployment** is a *policy*: every change that passes the pipeline goes to production,
  no human deciding. Each requires the one before it, and releasing on demand is a legitimate choice.

## The pipeline

- **Stages ordered by cost**: a commit stage of minutes (compile, unit tests, analysis) that stops
  the team when red, then slower acceptance stages, then staging and production on demand.
- **Build once, promote the same package.** What you tested is what you ship; only
  version-controlled configuration differs between environments. Deploy the same way everywhere,
  with a smoke test.
- **The pipeline is the only road to production**, hotfixes included. Too slow for a hotfix? Make it
  faster — a bypass skips the tests and the audit trail exactly when the risk is highest.
- Whether the last stage is automatic or a button is the whole difference between deployment and
  delivery.

## Branching

- **Trunk-based development**: one shared branch; any other lives a day or two, has one owner, and
  is deleted after merge. Small teams commit straight to trunk.
- **Merge pain grows with branch age**: bigger merges, conflicts found late, semantic conflicts that
  merge cleanly and break the build, and integration fear. "If it hurts, do it more often."
- Integration frequency is not feature length: a three-week feature reaches trunk daily, kept
  **dark** by a keystone interface, branch by abstraction, or a flag.
- Release branches are cut just in time, fixed on trunk and cherry-picked across, never merged back.
  CD teams usually release from trunk and roll forward instead.

## Deploy is not release

- A **feature flag** ships code latent, so release and turn-off are configuration changes, not
  deploys or rollbacks.
- Hodgson's four categories, by lifetime: **release** (days to weeks), **experiment** (until
  significance), **ops** (short, plus long-lived kill switches), **permissioning** (years). The
  category decides how the flag is built.
- **Every flag is inventory with a carrying cost**: a removal task and an expiry the day it is added.
  Test production's config with the new flag on and off, plus all on — not every combination.
- A **dark launch** runs new code on real traffic with the result hidden. Define the term when you
  use it.

## Rolling it out

- Compare strategies on **rollback speed, blast radius, extra capacity, and what the infrastructure
  must support**. Blue-green: instant rollback, double capacity, everyone at cutover. Canary: small
  slice, fast reroute. Rolling: cheap, slow to undo, safe only if something halts it. The full grid:
  [[deployment-strategies-compared]].
- **Canary analysis** compares the canary against a concurrent control on golden-signal SLIs. Never
  the whole service (5% failing at 20% is 1% overall), never before against after.
- A flag exposes a *feature*; a canary exposes a *version*.

## The schema is what makes rollback hard

- Code redeploys; the schema and the rows written don't. During any rolling, canary or blue-green
  deploy, **two versions share one schema**, so a lockstep schema change breaks the old one.
- **Expand, migrate, contract**, each phase its own deploy, each rollbackable one step back.
  **Contract is the only irreversible step** — run it once nothing you might roll back to reads the
  old structure.
- **Roll back first, diagnose after.** Roll forward only when rollback is unsafe: after a contract,
  after data corruption, or with no rollback mechanism. Roll back the app; leave the schema expanded.

## Measuring it

- **DORA's five** — throughput: change lead time, deployment frequency, failed deployment recovery
  time; instability: change fail rate, deployment rework rate. MTTR became **failed deployment
  recovery time** in 2023 (deploy-caused failures only); rework rate was added in 2024.
- **Speed and stability are not a trade-off.** Small batches improve both.
- Measure one service against its own past, pair throughput with instability, and never make them
  targets. In a behavioural story the practice is the Action and the metric's movement the Result.

The reach-for-it signal: "how do you ship this?", "how would you roll it out?", "what if the deploy is
bad?", "how do you migrate the schema with no downtime?", or any story about shipping.

Full treatment starts at [[continuous-integration-delivery-and-deployment]]; the path through all
seven is [[reading-order-for-continuous-delivery]].
