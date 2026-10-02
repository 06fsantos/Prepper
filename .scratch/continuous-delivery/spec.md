# Spec: a `continuous-delivery` subject — seven Lessons, a Reference, a Plan

Status: **ready-for-agent**

_Charted 2026-10-02. The grill session was skipped at the dev's request; the open decisions from the
plan were settled by the orchestrating agent and are recorded under **Decisions** below. Every agent
reads [`.agents/skills/author/`](../../.agents/skills/author/SKILL.md) directly — note contracts are
not restated here._

## Problem Statement

The vault teaches that independent deployability is the point of a service split, but nothing in it
teaches how a change gets from a commit to production safely. A senior candidate is asked "how do you
ship this?", "how would you roll it out?", "what if the deploy is bad?" and "how do you migrate the
schema with no downtime?" in the system-design round and in behavioural stories about shipping, and
today the vault has no answer to any of them.

## Solution

One new topic, **`continuous-delivery`**, covering two clusters: **delivery practice** (CI vs
continuous delivery vs continuous deployment, the deployment pipeline, trunk-based development, DORA
metrics) and **release & deploy strategies** (blue-green / canary / rolling, feature flags, and
zero-downtime schema changes with rollback vs roll-forward). The subject is tool-agnostic: no
pipeline syntax for any vendor.

## Topic

| `topic` value         | Term file                                | Title               | Cheat sheet                                          |
| --------------------- | ---------------------------------------- | ------------------- | ---------------------------------------------------- |
| `continuous-delivery` | `content/terms/continuous-delivery.md`   | Continuous delivery | `content/cheat-sheets/continuous-delivery-cheat-sheet.md` |

## The note map

### Lessons (seven)

| # | Filename (`content/lessons/…`) | `topic` | `prerequisites` | Primary sources |
| - | ------------------------------ | ------- | --------------- | --------------- |
| 1 | `continuous-integration-delivery-and-deployment` | `continuous-delivery` | — | Fowler, [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html); [continuousdelivery.com](https://continuousdelivery.com/); Fowler, [ContinuousDelivery](https://martinfowler.com/bliki/ContinuousDelivery.html) |
| 2 | `the-deployment-pipeline` | `continuous-delivery` | `continuous-integration-delivery-and-deployment` | Humble & Farley via [continuousdelivery.com](https://continuousdelivery.com/implementing/patterns/); Fowler, [DeploymentPipeline](https://martinfowler.com/bliki/DeploymentPipeline.html) |
| 3 | `trunk-based-development` | `continuous-delivery` | `continuous-integration-delivery-and-deployment` | [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/); Fowler, [Patterns for Managing Source Code Branches](https://martinfowler.com/articles/branching-patterns.html) |
| 4 | `blue-green-canary-and-rolling-deployments` | `continuous-delivery` | `the-deployment-pipeline`, **`metrics-logs-and-the-golden-signals`** | Fowler, [BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html), [CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html); Google SRE, [Release Engineering](https://sre.google/sre-book/release-engineering/) and SRE Workbook [Canarying Releases](https://sre.google/workbook/canarying-releases/) |
| 5 | `feature-flags-and-separating-deploy-from-release` | `continuous-delivery` | `trunk-based-development` | Hodgson, [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) |
| 6 | `zero-downtime-schema-changes` | `continuous-delivery`, `databases` | `blue-green-canary-and-rolling-deployments` | Fowler, [ParallelChange](https://martinfowler.com/bliki/ParallelChange.html); Sadalage & Fowler, [Evolutionary Database Design](https://martinfowler.com/articles/evodb.html) |
| 7 | `dora-metrics` | `continuous-delivery` | `continuous-integration-delivery-and-deployment` | [dora.dev](https://dora.dev/guides/dora-metrics-four-keys/); Forsgren, Humble & Kim, *Accelerate* |

Each URL above is a starting point: the authoring agent fetches it and teaches only what the source
actually says. If a URL is dead, find the canonical replacement and record it.

**Scope per Lesson** (what each owns; never teach another Lesson's material, cross-link instead):

1. The three terms told apart precisely: CI (integrate to mainline at least daily, a build + tests on
   every commit, fix a red build first), continuous delivery (every change is *releasable*; release
   is a business decision), continuous deployment (every passing change *is* released). The
   interview trap is using them interchangeably.
2. Build once, promote the same artifact through stages; commit stage fast feedback then slower
   acceptance stages; every environment deploys the same way; the pipeline is the only route to
   production. Test stages are taught here as pipeline stages, not as a testing-pyramid Lesson.
3. Short-lived branches or direct commits to trunk vs long-lived feature branches; why merge pain
   grows with branch age; release branches cut from trunk; how unfinished work stays dark
   (cross-link Lesson 5, do not teach flags).
4. Blue-green, canary and rolling, compared on rollback speed, blast radius, capacity cost and what
   each needs (a load balancer switch, traffic splitting, version coexistence). Canary analysis
   compares the golden signals of canary vs baseline — that is why Lesson 4 depends on
   `metrics-logs-and-the-golden-signals`.
5. Decouple deploy from release; Hodgson's four toggle categories (release, experiment, ops,
   permissioning) and their lifetimes; toggle debt and removing them; dark launches.
6. Expand / migrate / contract (parallel change) so old and new code both run against the schema
   during a rolling or blue-green deploy; why a schema change is the thing that makes rollback hard;
   rollback vs roll-forward and when each is the right call.
7. The four keys (deployment frequency, lead time for changes, change failure rate, time to restore
   / failed deployment recovery time — use whatever name dora.dev currently uses, and note the
   rename if there was one), the claim that throughput and stability are not a trade-off, and how
   to use them in a behavioural answer without gaming them.

### Cross-topic prerequisite edges — exactly one

`blue-green-canary-and-rolling-deployments → metrics-logs-and-the-golden-signals`. Every other
neighbour is a **body link, not a prerequisite**: `load-balancing`, `microservices`,
`the-operational-surface-of-a-service-split`, `availability-and-the-nines`,
`transactions-and-acid`, `idempotency-and-safe-retries`. **No existing note gains a prerequisite on a
continuous-delivery note.**

### Reference (one)

`content/references/deployment-strategies-compared.md`, topic `continuous-delivery`: a lookup table
of recreate / rolling / blue-green / canary / feature-flag release / shadow (dark) traffic against:
rollback speed, blast radius, extra capacity, what the infrastructure must support, whether two
versions coexist (and therefore whether the schema must be expand/contract-safe), and when to reach
for it. Written after Lessons 4–6 exist, sourced from the same primaries.

### Plan (one)

`content/plans/reading-order-for-continuous-delivery.md`, `topic: [continuous-delivery,
system-design]`, not featured. Order: 1 → 2 → 3 → 5 → 4 → 6 → 7, with the Reference as the
scan companion. It hands off to `reading-order-for-microservices` for "why independent deploy is
the prize" rather than re-listing those notes.

## Reconciliation — additive body links only

- `content/lessons/microservices.md`: where "independent deploy" is defined, one link to
  `[[the-deployment-pipeline]]` (a service is independently deployable only if it has its own path to
  production).
- `content/cheat-sheets/system-design-cheat-sheet.md`: the "per-service pipelines" bullet links
  `[[the-deployment-pipeline]]`.
- `content/lessons/monolith-to-microservices-modernization.md`: where it says "deploy it
  independently", a link to `[[blue-green-canary-and-rolling-deployments]]` or
  `[[the-deployment-pipeline]]`, whichever reads truer in context.
- `content/plans/reading-order-for-the-system-design-round.md`: one hand-off line to
  `[[reading-order-for-continuous-delivery]]`, placed where the round's operational follow-ups are
  discussed. No renumbering of existing steps.

## Decisions

1. **Slug** `continuous-delivery`, not `ci-cd`: it names the discipline (Humble & Farley's term)
   and reads as a topic name, not an acronym.
2. **Slate** of seven, as above. Testing strategy is a stage of the pipeline Lesson, not its own Lesson.
3. **One cross-topic prerequisite edge** (canary → golden signals). Expand/contract does not need
   `transactions-and-acid`, so that is a body link.
4. **The Reference is kept**: the strategy comparison is looked up repeatedly, which is what makes
   a note a Reference.
5. **Reconciliation** is the four additive links above.
6. **The Plan hands off** from the system-design round reading order, not from `learning-path`,
   which stays seven reading orders long.
7. **No Problem.** `/import` owns Problems and the vault bans agent-invented ones.
8. **Out of scope:** pipeline tooling (GitHub Actions, Azure DevOps, GitLab CI, Jenkins, …),
   infrastructure as code, containers and image builds, supply-chain security (SBOM, signing),
   and a standalone testing-pyramid Lesson. Ruling any of these in is a new effort.
