# Author: the one-week Arch Re prep Plan

Type: task
Status: resolved
Blocked by: 01, 04, 05, 06, 07, 08, 09, 10

## Question

Author the **destination artifact**: a Plan in `content/plans/` that sequences the new gap notes
(04–10) together with the relevant existing vault notes into a **one-week reading order** for the
Arch Re interview, shaped around the mission's four-stage loop. Via `/author`, respecting the Plan
conventions ([ADR 0005](../../../docs/adr/0005-a-plan-is-a-note-type.md)): a Plan asserts no
sequence the vault does not already hold, names the topics it spans, and says the note wins where
it disagrees with the graph.

- Order for a **one-week** run: what to hit first given fluency (not mastery) is the bar.
- Thread new (event sourcing, Cosmos, Service Bus, OAuth, modernization, AI, domain) **with**
  existing strengths (system-design building blocks, async, SQL, resilience, STAR) so the reader
  sees the whole loop, not just the gaps.
- Consider `featured: true` if this should lead the entry-page Plans band.

## Decided attachment (from 01)

- **Type:** Plan → `content/plans/` (per [ADR 0005](../../../docs/adr/0005-a-plan-is-a-note-type.md)).
- **`topic:`** lists **every topic it threads** — the four new Terms (`nosql-databases`,
  `authentication-and-authorization`, `applied-ai`, `reinsurance`) plus the existing topics it orders
  (`system-design`, `distributed-systems`, `databases`, `async-await`/`concurrency-and-async`,
  `http-resilience`, `behavioral-interviews`, `coding-interviews`, etc.) — so it surfaces in each
  topic card.
- **Not `featured`** — the mission's own featured Plan keeps the entry-page Plans band's lead; this is
  a personal, time-boxed prep path.

Resolved when the Plan passes `npm run validate` and renders a coherent one-week Arch Re path.
This ticket closing = **destination reached**.

## Answer

Authored the destination artifact via `/author plan`:
[`content/plans/arch-re-one-week-prep.md`](../../../content/plans/arch-re-one-week-prep.md) —
**"A one-week reading order for the Arch Re interview"** (ULID minted with `npm run ulid`, not
`featured`, per the ticket).

**Shape** — seven day-sittings threading the seven new gap notes (04–10) with the existing
strengths so the whole loop shows, not just the gaps:

1. **Domain + frame** — [[reinsurance-domain-primer]] first (every later answer is spoken in its
   vocabulary), then [[what-senior-means-as-a-level]] and [[system-design-is-graded-on-process]].
2. **Theory refresh** — CAP / PACELC / consistency-models / eight-fallacies, re-read as the thing
   the Azure notes reach back into, not skipped as "already covered".
3. **Azure data + messaging** — [[choosing-a-datastore]] → [[azure-cosmos-db]] →
   [[message-queues]] → [[azure-service-bus-and-event-driven-soa]].
4. **Event-driven** — [[event-sourcing-and-cqrs]], [[monolith-to-microservices-modernization]].
5. **Service boundary** — [[oauth-oidc-and-jwt]], [[api-design]].
6. **AI mandate** — [[applied-ai-in-reinsurance]] (framed as an *architecture* answer reusing
   days 3–4).
7. **Behavioural + rehearsal** — [[the-behavioral-round-proves-the-ladder]], [[the-star-method]],
   then a timed mock: *design an event-sourced, Service-Bus-backed treaty-booking service on Azure*,
   imitating [[design-a-url-shortener]] / [[design-a-rate-limiter]].

**House-format compliance**: opening disclaims sequence (one path through `prerequisites`, note
wins); order is a table with a **Scope** column (`Domain` / `Concept` / `Azure`/`.NET`); a
"look up rather than read" section for the un-re-read strengths (idempotency, ACID, building
blocks); a practice checkpoint; a **".NET-and-Azure-specific half"** section naming the five
stack-bound steps and their AWS/GCP/JVM equivalents; and a "night before" cheat-sheet list. The
two **coding rounds** are explicitly *not* re-taught — pointed at
[[reading-order-for-the-coding-round]] instead — because the brief changes nothing there.

`topic:` claims all nine topics it threads (the four new Terms + system-design,
distributed-systems, databases, behavioral-interviews, engineering-levels), so it surfaces on
each of their cards and in the entry-page Plans band.

`npm run validate` — **clean, 196 notes, no violations**. **Destination reached**: every ticket on
this map is now closed.
