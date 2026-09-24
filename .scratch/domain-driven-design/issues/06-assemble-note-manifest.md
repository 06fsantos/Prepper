# Decision: assemble the note manifest (the spec)

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

Produce the **deliverable** — the full DDD note-map / spec, the destination of this map.

Following the shape of [`incorporate-database-fundamentals/note-map.md`](../../incorporate-database-fundamentals/note-map.md), assemble:

- **Topics** table — the two slugs + their boundary statements (from ticket 03).
- **Lessons** — every Lesson with `topic`, `prerequisites`, and cited source section (from tickets 01/02/05).
- **Terms** — one per topic at minimum; any concept that earns its own Term.
- **Cheat sheets** — one per topic.
- **References** — the lookup-flavoured material extracted so no Lesson restates it (e.g. the context-map relationship catalogue as a table).
- **One Problem** — `kind: system-design`, with prompt gist, `topic`, and `practices` edges.
- **One Plan** — reading order across both topics, sibling of the existing `reading-order-for-*` Plans.
- **"What does not cross"** (from ticket 04) and the **Out-of-scope** fence (from the map).

Include, per the source discipline the database run used, a short **"claims to soften / provenance to flag"** list — anything post-2003 or non-Evans, cited.

Write it to `.scratch/domain-driven-design/spec.md`. When it exists and reads complete, the map is done.

## Answer

The deliverable is [`spec.md`](../spec.md) — dev-approved, ready for `/author` and `/import`.

**Fourteen notes across two topics** (`strategic-design`, `tactical-design`):

- **8 Lessons**, two "spine-with-two-forks" prerequisite chains. Strategic:
  `ubiquitous-language → bounded-context → {context-mapping, subdomains-and-distillation}`.
  Tactical: `entities-and-value-objects → aggregates → {repositories, domain-events}`.
- **Exactly one cross-topic prerequisite**: `aggregates → consistency-models` (existing note).
  Every other neighbour is a body cross-link, not a prereq. No existing note gains a prereq on DDD.
- **2 Terms** (topic anchors only), **2 cheat sheets** (one per topic, no merged sheet),
  **1 Reference** (`context-mapping-patterns` — the 9-row catalogue table extracted from the
  `context-mapping` Lesson), **1 Problem** (`carve-bounded-contexts-for-an-online-marketplace`,
  `kind: system-design`, `practices: [bounded-context, context-mapping, subdomains-and-distillation]`),
  **1 Plan** (`reading-order-for-domain-driven-design`, strategic-before-tactical, Problem as capstone).

**Straddling concepts placed** (ticket 03 rule): ACL → strategic (context-map pattern), Domain Event
→ tactical (published from an aggregate); each cross-linked, neither taught twice.

**Reconciliation** (ticket 04/05) — two inbound body wikilinks, not prereqs, both to the new
`bounded-context` Lesson: (1) re-point `system-design-cheat-sheet.md:220`
`[[distributed-systems|bounded contexts]]` → `[[bounded-context|bounded contexts]]`; (2) add a
`[[bounded-context]]` cross-link at the monolith Lesson's existing gloss (keep gloss + clozes).
Verified the monolith Lesson has no wrong wikilink to fix — only the cheat-sheet bullet does; the
monolith edit is purely additive.

**Provenance flagged** (7 items): Partnership (2015), Big Ball of Mud (Foote & Yoder), the
core/supporting/generic trichotomy and "supporting subdomain" (Vernon), Domain Event (post-2003),
the sharp aggregate rules (Vernon's codification), bounded-context-as-microservice (Newman, not
1:1), Shared Kernel-as-smell.

**Three judgment calls settled with the dev**: two anchor Terms only; one Reference; marketplace
Problem domain — all as recommended.

The destination is reached: the spec exists, reads complete, and nothing about the topic's shape is
left to decide. Authoring is a separate run.
