# Spec: the `microservices` front door — two Lessons and a Plan

Status: **ready-for-agent**

_Charted 2026-09-24 in a `grill-with-docs` session; see `HANDOVER.md` in this directory for the
coverage read and the round-by-round decisions this spec synthesizes._

## Problem Statement

A reader preparing for a senior interview cannot, today, get a straight answer to "what is a
microservice, and am I ready if it comes up?" The material a microservices question probes is
already in the vault — decomposition, when-not-to-split, the network tax, consistency,
integration, resilience, observability — but it is **scattered across ~20 notes and two topics
with no front door**. There is no note that defines a microservice head-on, no note that names
the `database per service` pattern, and no reading order that assembles the scattered parts into
one interview-ready path. The gap also surfaces as a tolerated `unwritten-link` warning:
`bounded-context.md` links `[[microservices]]`, and nothing answers to that name.

## Solution

Author **three artifacts**, filed under the two topics this material already lives in
(`system-design`, `distributed-systems`) — **no new topic slug**:

1. **An anchor Lesson** (`microservices`) that defines a microservice, owns the missing
   `database per service` pattern, and carries the trade-off map pointing at where every other
   concern is already taught. Its filename is the `[[microservices]]` link target, so authoring
   it clears the warning.
2. **An operational-surface Lesson** that fills the one substantive coverage gap — API gateway,
   service discovery, service mesh/sidecar — as a single deep lesson.
3. **A Plan** (`reading-order-for-microservices`) that is the navigational front door: one
   ordered path that stitches the anchor and the existing notes together, handing off to sibling
   reading-orders rather than re-listing their notes.

The reader ends up able to open one page, follow one order, and walk into the interview with the
whole subject assembled — while the vault re-teaches nothing and gains no new topic.

## User Stories

1. As an interview candidate, I want a single note that defines what a microservice is, so that I
   can answer "what is a microservice?" without assembling it from six other notes.
2. As an interview candidate, I want the `database per service` pattern named and explained, so
   that I can state the pattern that defines a service's data autonomy.
3. As an interview candidate, I want the consequences of database-per-service (no cross-service
   joins, no distributed transaction) linked to the saga/outbox notes, so that I can trace the
   pattern to its mechanics without the anchor re-teaching them.
4. As an interview candidate, I want the anchor to say plainly that a bounded context is the
   *starting* granularity for a service (Newman, not one-to-one), so that I do not overclaim the
   context→service mapping in a design round.
5. As an interview candidate, I want a trade-off map that tells me where each cost of a split is
   taught (network, consistency, integration, resilience, ops), so that I can navigate to depth
   on any follow-up.
6. As an interview candidate, I want a lesson on the operational surface a split creates, so that
   I can speak to how services find, route to, and are governed across the network.
7. As an interview candidate, I want service discovery explained (client- vs server-side, the
   registry, health), so that I can answer how a caller locates a callee it no longer shares a
   process with.
8. As an interview candidate, I want the API gateway explained (edge routing, auth/TLS
   termination, aggregation, and where it becomes a bottleneck), so that I can reason about the
   edge of a service system.
9. As an interview candidate, I want the service mesh and sidecar explained (mTLS,
   retries/timeouts as infra, traffic shifting, and when the complexity is earned), so that I can
   say when a mesh is and is not worth it.
10. As an interview candidate, I want the honest ops tax stated, so that I can answer "what do you
    now run that a monolith didn't?"
11. As an interview candidate, I want a reading order dedicated to microservices, so that I have a
    front door telling me where to start and in what sequence.
12. As an interview candidate, I want that reading order to open with the anchor, so that I have
    the definition before the machinery.
13. As an interview candidate, I want the reading order to place the migration decision
    (monolith-to-microservices) last as a capstone, so that I decide "should we even split?"
    after understanding the machinery, not before.
14. As an interview candidate, I want the reading order to hand off to the existing DDD and
    api-requests reading-orders instead of re-listing their notes, so that the path stays a short,
    scannable jump-list.
15. As an interview candidate, I want the microservices material discoverable from both the
    `system-design` and `distributed-systems` topic cards, so that I reach it from either subject.
16. As a reader following a link, I want `[[microservices]]` in `bounded-context` to resolve to a
    real note, so that the cross-link is live rather than dangling.
17. As a vault maintainer, I want the `microservices` `unwritten-link` warning gone after this
    effort, so that `npm run validate` reports only the separately-tracked `build-vs-buy` warning.
18. As a vault maintainer, I want no new topic slug introduced, so that this material is not
    fragmented away from the cohort it already sits with.
19. As a vault maintainer, I want the anchor to cross-link back to `bounded-context` in its body
    (not as a prerequisite), so that the DDD-specified body-neighbour relationship is honoured
    without inventing a graph ordering claim.
20. As a vault maintainer, I want the three artifacts to re-teach nothing already covered, so that
    the corpus does not grow duplicate explanations of strangler fig, the fallacies, or
    consistency.
21. As a vault maintainer, I want record identity minted with `npm run ulid`, so that no ULID is
    typed by hand.
22. As a vault maintainer, I want each artifact filed by directory (Lessons in `content/lessons/`,
    the Plan in `content/plans/`), so that note type is the directory and nothing in the build
    names a slug or filename to recognise it.

## Implementation Decisions

- **Vehicle: three artifacts, not one.** A re-point of the link was rejected (it can neither state
  `database per service` nor be a real front door); a whole new topic was rejected (it fragments
  material already filed under two topics). The two content gaps and the one navigational gap map
  one-to-one onto anchor Lesson / operational-surface Lesson / Plan.

- **Authoring path.** All three are authored via `/author`, the only place in the pipeline that
  mints ULIDs (`npm run ulid`). No build code changes; no new module.

- **Artifact 1 — anchor Lesson `content/lessons/microservices.md`.**
  - `topic: [system-design, distributed-systems]`; `prerequisites: [bounded-context]` (the single
    load-bearing edge — a service boundary is undefinable without the context concept).
  - Filename is the `[[microservices]]` link target; authoring it resolves `bounded-context.md`'s
    link and clears the warning. No edit to `bounded-context.md`.
  - **Owns and nothing more:** the definition/characteristics (independent deploy, own data store,
    one team, independent scale); `database per service` (a *data* pattern — it lives here, not in
    the operational-surface lesson); the trade-off synthesis and the map.
  - **Links, never re-teaches:** migration (`monolith-to-microservices-modernization`), network
    tax (`the-eight-fallacies-of-distributed-computing`), consistency (`consistency-models`),
    integration (`message-queues` / `event-sourcing-and-cqrs` / `azure-service-bus` / `api-design`),
    resilience (the `http-resilience` topic), ops (the operational-surface lesson).
  - Carries a reciprocal **body** link to `[[bounded-context]]` (a body neighbour per the DDD
    spec, deliberately not a prerequisite).
  - Proposed H2 spine: what makes a service "micro"; database per service and the bill it creates;
    the boundary is Newman's, not one-to-one; the trade-off map; what to take away.

- **Artifact 2 — operational-surface Lesson `content/lessons/the-operational-surface-of-a-service-split.md`.**
  - `topic: [system-design, distributed-systems]`;
    `prerequisites: [microservices, the-eight-fallacies-of-distributed-computing]` (it is the tax
    the fallacies predict).
  - **One deep lesson, not a cluster of thin ones** — the "fluency, not mastery" bar is met by
    depth in a single coherent node; splitting fragments the one story (how independently-deployed
    services find, route to, and are governed across the network).
  - Proposed H2 spine: the problem a split creates; service discovery; the API gateway; service
    mesh and the sidecar; the honest ops tax; what to take away.

- **Artifact 3 — Plan `content/plans/reading-order-for-microservices.md`.**
  - `topic: [system-design, distributed-systems, strategic-design]` (the topics the path spans).
    **Not `featured`** — a focused subject Plan, not the mission's headline "where do I start."
  - Standard Plan preamble: one path through the `prerequisites` graph, asserting no order the
    vault does not already hold, and where a note disagrees with the page the note wins.
  - **Hands off to sibling reading-orders** (`reading-order-for-domain-driven-design`,
    `reading-order-for-api-requests`) rather than re-listing their notes — matching
    `learning-path.md` — to keep it a short jump-list.
  - Spine (ordered): (1) `microservices` anchor; (2) boundaries → hand off to the DDD reading-order
    (or `bounded-context` directly); (3) `the-eight-fallacies-of-distributed-computing`;
    (4) `consistency-models` (CAP behind it); (5) integration — `api-design`, then `message-queues`
    → `event-sourcing-and-cqrs` / `azure-service-bus-and-event-driven-soa`; (6) resilience → hand
    off to `reading-order-for-api-requests`; (7) `the-operational-surface-of-a-service-split`;
    (8) `monolith-to-microservices-modernization` as the capstone migration decision.

- **Guardrails inherited from the DDD run.** Note type is the directory; a topic is a `topic:`
  slug; nothing in the build names a slug or filename. Newman provenance is preserved:
  bounded-context ↔ microservice is Newman's bridge, not Evans, and not one-to-one — the new notes
  must stay consistent with `bounded-context.md`, never contradict it.

## Testing Decisions

- **A good test here asserts external behaviour, not authored prose.** The vault's rule is
  explicit: `/author` output has no bespoke test seam, because a test of a note's shape would be a
  second, weaker copy of the FORMAT docs and the validation rule set. So no unit tests are written
  for these three artifacts.

- **The single, highest seam is `npm run validate`** — the CI gate that runs the vault through
  Quartz's own pipeline and reports every violation (exit 1 on any error). This is the same seam
  every authored note in the repo is checked through; it is preferred over any new seam, and no new
  seam is introduced.

- **Acceptance through that seam:**
  - `npm run validate` → **0 errors**.
  - The `microservices` `unwritten-link` warning is **gone**; the only remaining warning is
    `build-vs-buy` (out of scope, tracked separately).
  - `npx tsc --noEmit` clean (unchanged — no code touched).

- **Prior art.** This is the same close-out the DDD authoring run used (commit `68ad871`): author
  via `/author`, then drive to `0 errors` on `npm run validate`. No test files accompanied that
  run for the same reason.

## Out of Scope

- **The `[[build-vs-buy]]` dangling link** from `subdomains-and-distillation.md`. Same category
  (a spec-named neighbour with no note), different subject (generic-subdomain procurement
  economics, not distributed systems). Tracked separately; its warning is expected to remain after
  this effort.
- **A dedicated `api-gateway`, `service-mesh`, or `service-discovery` lesson each.** The
  operational surface is deliberately one lesson, not a cluster; splitting is a later effort only
  if a follow-up proves one pattern needs its own node.
- **A new `microservices` topic slug, an anchor Term, or a `microservices` topic card.** Rejected
  as fragmentation.
- **Re-teaching migration, the fallacies, consistency, integration, or resilience.** These keep
  their existing homes; the new artifacts only link to them.
- **Any build/code change** (validation rules, components, graph, plugins). This is content-only.
- **Deployment/orchestration depth** (containers, Kubernetes, CI/CD pipelines) beyond naming them
  as the ops tax — outside the design-round "fluency" bar.

## Further Notes

- The `unwritten-link` warning is tolerated (nothing is gated), so the vault ships correct today;
  this effort is an enhancement, not a defect fix.
- The blast radius before authoring is one link in one Lesson (`bounded-context.md:105`).
- Full round-by-round provenance — the coverage verdict table, the three-option rejection, and
  every confirmed branch — is in `HANDOVER.md` in this directory.
