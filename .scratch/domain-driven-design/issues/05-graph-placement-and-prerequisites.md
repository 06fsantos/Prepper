# Decision: graph placement and prerequisites

Type: grilling
Status: resolved
Blocked by: 03

## Question

Place the two DDD topics in the link graph — the `prerequisites` / `topic` spine the manifest will apply.

Decide:

- Does **strategic design** sit under `system-design` / `distributed-systems` as a prerequisite chain, or beside them?
- Does **tactical** presuppose **strategic**, or are the two independent entry points?
- The **cross-topic prerequisite edges** to existing notes — `system-design`, `distributed-systems`, `monolith-to-microservices-modernization` — named as specific edges, not "topically adjacent."
- The intra-topic Lesson ordering spine (which Lesson is the root under each topic).

Output: the prerequisite rules for the spec, in the style of the database note-map's "spine with forks" — each edge justified, and non-edges called out where adjacency is not dependency. Informed by ticket 03's boundaries.

## Answer

**Topic placement — beside, not under.** `strategic-design` and `tactical-design` are new
**peer** topics, entry points in their own right — not downstream of `system-design` /
`distributed-systems`. DDD is a *lens* a senior brings, taught cold from Evans primaries;
adjacency to the system-design corpus is not dependency. Its connections to the existing graph
are a single named prerequisite edge (below) plus body cross-links, never a topic-level chain.

**strategic ↔ tactical — independent, no bridge.** Neither topic is a prerequisite of the other.
They serve two different interview moments (system-design round vs code/design) and are two
separate deliverables (two cards, two cheat sheets). The reading-order *across* both is the
Plan's job (ticket 06); there is **no cross-topic prerequisite edge between the two DDD topics**.

**Intra-topic spine — two roots, one internal link, two forks each** (database note-map's
"spine with forks"; stated over concepts — ticket 06 binds each to a note-type/filename, the
dependency edges hold regardless):

- **strategic-design:** root **Ubiquitous Language** → **Bounded Context** → { **Context Map**
  (fork), **Subdomains & Distillation** (fork) }. UL is *why* bounded contexts exist; a context
  map is the relationship *between* contexts; subdomains are the problem-space companion. Nothing
  depends on Context Map or Subdomains.
- **tactical-design:** root **Entity vs Value Object** → **Aggregates** → { **Repositories**
  (fork), **Domain Events** (fork) }. Aggregates cluster entities/VOs; a repository persists an
  aggregate *root*; a domain event is *published from* an aggregate. Nothing depends on
  Repositories or Domain Events.

**Cross-topic prerequisite edges into the existing graph — exactly one.**

- **`aggregates` (tactical) → prerequisite `consistency-models`.** Vernon's "eventual consistency
  *outside* the boundary" rule is unreadable without the consistency-model vocabulary that already
  lives in `lessons/consistency-models.md`. This is the only outbound edge that clears the
  "unreadable without" bar.

**Non-edges — called out so the manifest does not invent them** (adjacency ≠ dependency):

- `strategic-design` takes **no** prerequisite on `system-design` or `distributed-systems`. The
  bounded-context ↔ microservice bridge is a *body cross-link / topic connection*, taught cold.
- `domain-events` takes **no** prerequisite on `message-queues`, `event-sourcing-and-cqrs`, or
  `azure-service-bus-and-event-driven-soa` — those are *consumers/peers* of domain events, wired
  as body cross-links, not gates on understanding one.
- **No existing note gains a prerequisite on a DDD note.** DDD is purely additive to the graph;
  the single exception is the reconciliation edge below, and it is a body link, not a prereq.

**The one reconciliation edge (form ticket 04 deferred here) — two body wikilinks, not
prerequisites.** Both sites that currently point "bounded context" at `[[distributed-systems]]`
(wrong target) — the **monolith Lesson's** prose gloss and the **system-design cheat-sheet**
bullet — re-point to `[[<the DDD bounded-context note>]]`, producing *untyped body edges*. It
stays a body link because ticket 04 kept the monolith Lesson self-sufficient with a just-enough
gloss; a prerequisite would contradict that. The target's exact filename is resolved in ticket
06. This is the sole change to existing notes.
