# Author: monolith → microservices modernization note(s)

Type: task
Status: resolved
Blocked by: 01

## Question

Author fluency-level vault note(s) on **modernizing monolith applications** — an explicit
responsibility ("assist with modernizing monolith applications while delivering business value").
The vault has the target patterns but not the migration story. Via `/author`, at the type/topic
decided in 01. Must cover:

- **Strangler fig** — incrementally route traffic to new services while the monolith shrinks;
  why big-bang rewrites fail.
- Decomposition: finding **seams / bounded contexts**, the **anti-corruption layer** at the
  boundary, database decoupling (shared DB → per-service data).
- "Delivering business value while modernizing" — the brief's framing: strangle by business
  capability, keep the lights on, measure.
- The honest tradeoffs: distributed-system tax (link `the-eight-fallacies-of-distributed-computing`),
  when NOT to split (modular monolith as a valid destination).

## Decided attachment (from 01)

- **Type:** Lesson → `content/lessons/`
- **`topic:`** `system-design`
- No new Term. Files to mint: **1 Lesson**.

Resolved when the note(s) pass `npm run validate` and cover the above at fluency depth.

## Answer

Authored the Lesson [[monolith-to-microservices-modernization]] (`content/lessons/`, `topic:
system-design`, no new Term — exactly the attachment ticket 01 decided), plus a matching
system-design cheat-sheet block and a `### Modernizing a monolith` subsection in `RESOURCES.md`.

The note covers all four required points at fluency depth:

- **Strangler fig** — the routing-facade mechanism (proxy/gateway routes each capability's traffic
  to old code or new service), why every step is small/shippable/reversible, and why a big-bang
  rewrite fails (the monolith is a moving target, zero value until one risky cutover). Fowler's
  fig metaphor + Microsoft's Strangler Fig pattern cited inline.
- **Decomposition** — cutting along **bounded contexts** (business capability, not technical
  layers), the **shared-database** decoupling as the hardest/riskiest part (each service owns its
  data), and the **anti-corruption layer** at the boundary during coexistence. Sam Newman + MS
  ACL pattern cited.
- **"Delivering business value while modernizing"** — sequence by payoff (move what's
  changing/blocking first), keep the lights on, and *measure* the move through the router; framed
  as the actual senior brief, not a platitude.
- **Honest tradeoffs / when NOT to split** — the distributed-systems tax linked to
  [[the-eight-fallacies-of-distributed-computing]] + lost strong consistency; the **modular
  monolith** as a valid destination; Fowler's **MonolithFirst**.

Four interleaved quiz blocks (mcq / cloze / mcq / recall), all-existing frontmatter and body
wikilinks. `npm run validate` clean (0 errors; the one warning is the pre-existing `reinsurance`
unwritten link in the sibling event-sourcing Lesson, not this note). Closes the last standalone
Tier-2 gap; only 09 (AI) and 10 (reinsurance domain) remain before the Plan (11) is unblocked.
