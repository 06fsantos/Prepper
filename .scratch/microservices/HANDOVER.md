# Handover: the missing `microservices` note/topic

Status: **charted — dev-approved outline, ready to author.** The charting decision below was
made in a `grill-with-docs` session (2026-09-24) and confirmed at every branch. What remains is
authoring: two Lessons and one Plan, specced in "The outline" below.

## Why this exists

Authoring the Domain-Driven Design subject (commit `68ad871`) left one deliberate
`unwritten-link` warning:

```
lessons/bounded-context.md
  warning unwritten-link  unwritten link to `microservices`: nothing in the vault answers to that name yet
```

The DDD spec named `bounded-context ↔ microservices` as a **body cross-link neighbour**
(never a prerequisite), on the assumption the target existed or was someone else's job. It
does not exist. The warning is tolerated (nothing is gated), so the vault ships correct
today — this handover is about whether, and how, to fill the gap, not a defect to rush-fix.

## The single fact to anchor on

`[[microservices]]` is linked from **exactly one place**:

- `content/lessons/bounded-context.md:105` — "...the starting granularity for a
  `[[microservices|service boundary]]` is one context, split no finer until..." (the Newman
  bridge paragraph, already provenance-flagged: a context is the *starting* granularity, not
  one-to-one with a service).

No other note links `[[microservices]]`. No `microservices` topic slug exists. So the blast
radius of any decision here is one link in one Lesson.

## What already covers this ground (do not re-teach)

The migration/adoption angle of microservices is **already taught**, and taught well:

| Note | Topic(s) | What it owns |
| --- | --- | --- |
| `lessons/monolith-to-microservices-modernization` | `system-design` | The senior signal: "should we go microservices?" is a *migration* question. Strangler fig, MonolithFirst, the distributed-systems tax, extract-along-the-seams. Newman's *Monolith to Microservices* is its primary source. |
| `lessons/the-eight-fallacies-of-distributed-computing` | `distributed-systems` | The network-reality tax any service split pays. |
| `lessons/consistency-models` | `distributed-systems` | Eventual consistency across service boundaries (the DDD `aggregates` cross-topic prereq). |
| `lessons/message-queues`, `lessons/event-sourcing-and-cqrs`, `lessons/azure-service-bus-and-event-driven-soa` | `system-design`, `distributed-systems` | Inter-service integration mechanics. |
| `lessons/api-design` | `system-design`, `http-resilience` | Service contracts / synchronous integration. |
| `terms/distributed-systems`, `terms/system-design` | (topic anchors) | The two homes this material already files under. |

**There is no "what is a microservice / when to adopt / trade-offs" canonical note.** That is
the only real gap — the *definition-and-tradeoffs* node that `bounded-context` wants to point
at when it says "a context is the starting granularity for a service boundary."

## The decision (made)

The charting question was: re-point the link and write nothing (smallest), one anchor Lesson
(medium), or a whole new topic (largest)? A `grill-with-docs` session reframed it around the
real driver — **interview-readiness** ("if microservices come up, is there enough here to feel
comfortable?") — and read the actual corpus to judge coverage.

**Coverage verdict:** the substance a system-design round probes is *almost entirely present*
already — decomposition (the DDD subject, `bounded-context`), when-not-to-split
(`monolith-to-microservices-modernization`), the network tax (`the-eight-fallacies`), data
consistency (`consistency-models`/CAP/PACELC/partitioning/Raft), async integration
(`message-queues`/`event-sourcing-and-cqrs`/`azure-service-bus`), sync contracts (`api-design`),
a whole `http-resilience` topic, and observability (`golden-signals`/tracing). It is deep but
**scattered, with no front door**. Two genuine gaps:

1. **No anchor.** Nothing says head-on *"what a microservice is, and here is the map of
   everything above."* The `[[microservices]]` link wants exactly this definitional target — a
   Plan cannot be it, and a reading-order is not a definition.
2. **`database per service`: 0 hits.** The one microservices-defining pattern named nowhere,
   though every consequence of it (saga, outbox, eventual consistency) is already taught. The
   operational surface (API gateway, service discovery, service mesh/sidecar) is only glancingly
   mentioned.

So the answer is **neither option 1 (a re-point can't state the missing pattern or be a real
front door) nor option 3 (a new topic would fragment material already filed under two topics)**.
The decided vehicle is **three artifacts**: two Lessons that fill the two content gaps, and a
Plan that supplies the missing navigational front door.

## The outline (dev-approved — author these three)

All three file under the two topics this material already lives in — matching
`message-queues` / `event-sourcing-and-cqrs` / `azure-service-bus`, its exact cohort. **No new
topic slug.** Author via `/author`, mint ULIDs with `npm run ulid`.

### 1. `content/lessons/microservices.md` — the anchor (clears the warning)

- **`topic: [system-design, distributed-systems]`**, **`prerequisites: [bounded-context]`**
  (the definitional hinge — you cannot define a service boundary without the context concept).
- This filename **is** the `[[microservices]]` link target, so authoring it resolves
  `bounded-context.md:105` and clears the warning. It carries the **reciprocal body link** back
  to `[[bounded-context]]` (the DDD spec named this a body neighbour, *not* a prerequisite —
  consistent with the one-directional prereq edge above).
- **Owns** (and nothing more — everything else it *links*, never re-teaches): the definition and
  characteristics; `database per service`; the trade-off synthesis and the map.
- Proposed H2 spine:
  - `## What makes a service "micro"` — independent deploy, its own data store, one team,
    independent scale.
  - `## Database per service — the pattern that buys the autonomy` — and the bill it creates: no
    cross-service joins, no distributed transaction → links out to saga/outbox in
    `[[azure-service-bus-and-event-driven-soa]]` and `[[event-sourcing-and-cqrs]]`.
  - `## The boundary is Newman's, not one-to-one` — one context is the *starting* granularity;
    reciprocal link to `[[bounded-context]]`.
  - `## The trade-off map — what a split costs, and where each cost is taught` — network →
    `[[the-eight-fallacies-of-distributed-computing]]`, consistency → `[[consistency-models]]`,
    integration → the queues/event-sourcing/service-bus/api-design cluster, resilience → the
    `http-resilience` topic, ops → the operational-surface lesson below.
  - `## What to take away`

### 2. `content/lessons/the-operational-surface-of-a-service-split.md` — the ops gap

- **`topic: [system-design, distributed-systems]`**,
  **`prerequisites: [microservices, the-eight-fallacies-of-distributed-computing]`** (it is the
  tax the fallacies predict).
- One coherent story — *how independently-deployed services find, route to, and are governed
  across the network* — authored **deep** (a single well-structured lesson, not 2–3 thin ones):
  the "fluency, not mastery" bar is met by depth in one node, and splitting fragments the story.
- Proposed H2 spine:
  - `## The problem a split creates` — many addresses, many hops, cross-cutting concerns now
    duplicated per service.
  - `## Service discovery` — client- vs server-side, the registry, health checks.
  - `## The API gateway` — edge routing, auth/TLS termination, response aggregation, and where
    it turns into a bottleneck.
  - `## Service mesh and the sidecar` — mTLS, retries/timeouts pushed into infra, traffic
    shifting; when the mesh earns its complexity and when it does not.
  - `## The honest ops tax` — what you now run that a monolith never did.
  - `## What to take away`

### 3. `content/plans/reading-order-for-microservices.md` — the front door

- **`topic: [system-design, distributed-systems, strategic-design]`** (the topics the path
  spans). **Not `featured`** — a focused subject Plan, not the mission's headline "where do I
  start."
- Standard Plan preamble: *one path through the `prerequisites` graph, asserts no order the vault
  does not already hold, and where a note disagrees with this page the note wins.*
- **Hands off to sibling reading-orders** rather than re-listing their notes (matching
  `learning-path.md`), which keeps it short — the vault rewards short jump-lists.
- The spine:
  1. `[[microservices]]` — the front door: what it is, database-per-service, the trade-off map.
  2. Boundaries — hand off to `[[reading-order-for-domain-driven-design]]` (or point straight at
     `[[bounded-context]]`).
  3. `[[the-eight-fallacies-of-distributed-computing]]` — the network tax.
  4. `[[consistency-models]]` (CAP behind it) — data across boundaries.
  5. Integration — `[[api-design]]` (sync), then `[[message-queues]]` →
     `[[event-sourcing-and-cqrs]]` / `[[azure-service-bus-and-event-driven-soa]]` (async).
  6. Resilience — hand off to `[[reading-order-for-api-requests]]` (the whole `http-resilience`
     cluster) rather than re-listing its lessons.
  7. `[[the-operational-surface-of-a-service-split]]`.
  8. `[[monolith-to-microservices-modernization]]` — **the capstone**: "should we even split?",
     decided *after* the machinery is understood.

## Guardrails (inherited from the DDD run — the same rules apply)

- **Note type is the directory**; a topic is a `topic:` slug. Don't name a slug/filename in the build.
- **Author via `/author`**, mint ULIDs with `npm run ulid` (never typed).
- **Newman provenance**: bounded-context ↔ microservice is Newman's bridge, *not* Evans, and
  **not one-to-one** — one context may span several services, never a service across two
  contexts. `bounded-context.md` already states this; a new note must stay consistent, not
  contradict it.
- **Don't re-teach** strangler fig / MonolithFirst / the distributed tax — those stay in
  `monolith-to-microservices-modernization`. A new note cross-links to it.
- **`database per service` lives in the anchor**, not the operational-surface lesson — it is a
  *data* pattern that defines a service's autonomy, and its consequences already have homes to
  link to.
- Close with `npm run validate` — target **0 errors, 1 warning** (only `build-vs-buy` remains,
  tracked separately below), and the `microservices` warning gone.

## The sibling warning, for the same someday

`lessons/subdomains-and-distillation.md` links `[[build-vs-buy]]` (the generic-subdomain "buy
it" decision), also unwritten. Same category — a spec-named neighbour with no note yet. Not
this effort's job, but if a "build vs buy" decision note is ever wanted, that link is waiting
for it. Track separately.

---
_Provenance: written after commit `68ad871` (the DDD authoring run); charted 2026-09-24 in a
`grill-with-docs` session (coverage read of the live corpus + a four-round grill). Vault state at
handover: `npm run validate` → 0 errors, 2 warnings (`microservices`, `build-vs-buy`), 211 notes.
After authoring the three artifacts above: expect 0 errors, 1 warning (`build-vs-buy` only)._
