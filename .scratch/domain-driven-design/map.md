# Map: Add a Domain-Driven Design topic

Label: `wayfinder:map`
Status: **complete** — all six tickets resolved; the destination ([`spec.md`](spec.md)) exists and is dev-approved. Authoring is a separate run.

## Destination

A **spec / note-map** — like [`incorporate-database-fundamentals/note-map.md`](../incorporate-database-fundamentals/note-map.md) — for a full **Domain-Driven Design** subject, ready to hand to `/author` and `/import`. It names **two topics** (strategic + tactical), every Lesson / Term / Cheat sheet / Reference with its `topic` / `prerequisites` / cited source, one design Problem, and one Plan. The map is done when that spec exists and nothing about the topic's shape is left to decide. **No vault notes are written by this map** — authoring is a separate run.

## Notes

Domain: an interview-prep vault, note types = directory (`author/SKILL.md`); a "topic" is a `topic:` slug carried by notes, usually with a Term of the same name. Every session consult the vault model in `CLAUDE.md` and, for boundaries, [`.agents/skills/author/`](../../.agents/skills/author/SKILL.md). For any decision ticket call the Skill tool twice, for `grilling` and `domain-modeling`.

Standing decisions from charting (destination-shaping, so recorded here rather than as closed tickets):

- **Two topics**, matching Evans's own strategic/tactical seam and the two interview moments (system-design round vs code/design). Precise slugs + boundary are ticket 03.
- **Evans is the conceptual authority, researched — not transcribed.** His book is **not on this machine**; sourcing is `research` against high-trust primaries (Evans's free *DDD Reference* PDF + blue-book parts, Fowler's essays, Vernon's *IDDD* for aggregates, Newman for the modern service-boundary bridge). Every non-Evans or post-2003 claim is cited and its provenance flagged; the topic must read interview-current, not 20 years old.
- **Scope frame** (from `MISSION.md`): senior interview loop. Strategic design serves the system-design round; a lean set of tactical patterns serves code/design. Full-catalogue completeness is a non-goal.
- Ends with **one design Problem** (`kind: system-design`) and **one Plan** (reading order across both topics).

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [Research: strategic design](issues/01-research-strategic-design.md): strategic vocabulary gathered and cited → [`research/strategic-design.md`](research/strategic-design.md). Provenance flags for ticket 03 to carry: **Partnership** is a 2015-Reference addition, **Big Ball of Mud** is Foote & Yoder (not Evans), and the **core/supporting/generic** subdomain split was crystallised later by Vernon.
- [Research: tactical design](issues/02-research-tactical-design.md): building-block vocabulary gathered and cited → [`research/tactical-design.md`](research/tactical-design.md). Provenance flags: **Domain Event** is post-2003 (starred "new since the 2004 book" in the 2015 Reference); the sharp **aggregate rules** (small aggregates, one-per-transaction, reference-by-identity, eventual consistency) are **Vernon's** codification of Evans's terser original. **Anti-Corruption Layer lives in Part IV strategic design** as a context-map pattern, tactical only as translation code — the strategic/tactical overlap ticket 03 must place.
- [Decision: reconcile with existing DDD material](issues/04-reconcile-existing-ddd-material.md): the only rendered DDD in the vault is the **monolith Lesson**'s migration-framed mentions (bounded context + ACL, both clozed) — DDD **cross-links into them and re-teaches nothing**. Fence for the spec: strangler fig / modular monolith / MonolithFirst / distributed-tax stay `system-design` (don't cross); **bounded context taught once, canonically, in DDD** (monolith keeps a just-enough gloss + cross-link); **ACL's migration-coexistence framing stays in the monolith Lesson**, DDD teaches ACL as a context-map pattern; the system-design cheat-sheet bullet stays put, gains cross-links, gets no DDD content. `architecture-and-ddd.md` (Workshop) **does not cross** — ticket 01 already has its strategic vocabulary, Evans-sourced. One reconciliation edge, *inbound*: monolith Lesson + cheat sheet point "bounded context" at `[[distributed-systems]]` (wrong target) → re-point at the new DDD note, form finalized by **ticket 05**.
- [Decision: topic decomposition and slugs](issues/03-topic-decomposition-and-slugs.md): two topics, slugs **`strategic-design`** (where model boundaries go + how they integrate — bounded contexts, subdomains, ubiquitous language, context map) and **`tactical-design`** (how one model is built inside a boundary — entity/VO, aggregates, repositories, domain events). Filing rule: *strategic = relationships between models; tactical = objects inside one model*; a straddling concept is filed by the question it primarily answers and cross-linked, never taught twice. **ACL → strategic** (context-map pattern; code realization only mentioned), **Domain Events → tactical** (published from an aggregate; integration role cross-linked). One card + one cheat sheet each — no merged DDD sheet.
- [Assemble the note manifest (the spec)](issues/06-assemble-note-manifest.md): **the destination** — [`spec.md`](spec.md), dev-approved, ready for `/author` + `/import`. Fourteen notes: 8 Lessons (two spines), 2 anchor Terms, 2 cheat sheets, 1 Reference (`context-mapping-patterns`), 1 Problem (`carve-bounded-contexts-for-an-online-marketplace`, `system-design`), 1 Plan (`reading-order-for-domain-driven-design`). One cross-topic prereq (`aggregates → consistency-models`); reconciliation is two inbound wikilinks to the new `bounded-context` Lesson (re-point `system-design-cheat-sheet.md:220`; additive cross-link in the monolith Lesson). Seven provenance flags carried into the spec. **The map is done.**
- [Decision: graph placement and prerequisites](issues/05-graph-placement-and-prerequisites.md): DDD is **additive and beside** — both topics are peer entry points, **not** downstream of `system-design`/`distributed-systems`, and **neither DDD topic is a prerequisite of the other** (reading order across both is the Plan's job). Two intra-topic spines, database-style "spine with two forks": strategic **Ubiquitous Language → Bounded Context → {Context Map, Subdomains & Distillation}**; tactical **Entity vs VO → Aggregates → {Repositories, Domain Events}**. **Exactly one** outbound cross-topic prerequisite edge: **`aggregates → consistency-models`** (eventual-consistency rule unreadable without it); every other neighbour (bounded-context↔microservices, domain-events↔event-sourcing/queues) is a **body cross-link, not a prereq**, and no existing note gains a prerequisite on a DDD note. The ticket-04 reconciliation is **two body wikilinks** (monolith Lesson gloss + system-design cheat-sheet bullet re-point `[[distributed-systems]]` → the DDD bounded-context note), not prerequisites; target filename bound in ticket 06.

## Not yet specified

_Empty — the frontier reached the destination._ The note bodies and cheat-sheet groupings are the **authoring run**'s job, downstream of this map; the spec binds every note's name, type, topic, prerequisites, and source. No third research pass was needed — ticket 03 exposed no concept the two research passes had missed.

## Out of scope

- **Factories, Specifications, Modules** (Evans Part II tail) — tactical catalogue a senior interview does not reach.
- **Part III "supple design" refactoring patterns** (intention-revealing interfaces, side-effect-free functions, assertions, closure of operations, etc.) — a refactoring craft subject, not interview design vocabulary.
- **Large-scale structure** (system metaphor, responsibility layers, evolving order) — Evans Part IV tail, rarely asked.
- Ruling these in later would redraw the destination and start a fresh effort, not resume this one.
