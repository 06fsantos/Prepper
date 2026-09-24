# Note map: adding a Domain-Driven Design subject

Status: **spec complete and dev-approved — ready to hand to `/author` and `/import`.** No vault notes are written by
this map; authoring is a separate run. Every agent reads
[`.agents/skills/author/`](../../.agents/skills/author/SKILL.md) directly — note contracts are not
restated here.

The subject is **two topics** — `strategic-design` and `tactical-design` — carrying **8 Lessons,
2 Terms, 2 cheat sheets, 1 Reference, 1 Problem, and 1 Plan**. Sourcing is `research` against
high-trust primaries (Evans's free 2015 *DDD Reference*, the 2003 blue book, Fowler's bliki,
Vernon's *Effective Aggregate Design*, Newman); Evans's book is **not on this machine**, so every
non-Evans or post-2003 claim is cited and flagged (see **Claims to soften** below). The scope frame
is the senior interview loop: strategic serves the system-design round, a lean tactical set serves
code/design. Full-catalogue completeness is a non-goal.

Research is on disk: [`research/strategic-design.md`](research/strategic-design.md),
[`research/tactical-design.md`](research/tactical-design.md).

## Topics — two

| `topic` value      | Term file                          | Title             |
| ------------------ | ---------------------------------- | ----------------- |
| `strategic-design` | `content/terms/strategic-design.md` | Strategic design |
| `tactical-design`  | `content/terms/tactical-design.md`  | Tactical design  |

The boundary, stated once so no agent has to guess (ticket 03):

- **`strategic-design` is relationships _between_ models** — where a model boundary goes and how
  boundaries integrate. Bounded contexts, subdomains, the ubiquitous language that reveals a
  boundary, and the context map that governs the seams between contexts. This is the topic the
  system-design round reaches for: "where do the service boundaries go, and how do they talk without
  coupling?"
- **`tactical-design` is the objects _inside_ one model** — how a single model is built inside one
  boundary. Entity vs value object, the aggregate as a consistency boundary, the repository that
  fronts it, the domain event it publishes. This is the topic the code/design round reaches for.

**The filing rule for a straddling concept** (ticket 03): file it by the question it _primarily_
answers, cross-link it, and never teach it twice. Two concepts straddle and are placed by this rule:

- **Anti-Corruption Layer → strategic.** In Evans it lives in Part IV as a context-map relationship
  pattern; it is *realised* in code as a translation layer, but the decision to build one is a
  context-map decision. Taught as a context-map pattern in the `context-mapping` Lesson; the tactical
  side gets a one-line "realised in code as a translation layer" cross-link, no second teaching.
- **Domain Event → tactical.** Published *from* an aggregate (its home is the tactical building
  blocks); its integration role across contexts is cross-linked from strategic, not re-taught there.

A merged "DDD" topic was refused (ticket 03): the strategic/tactical seam is Evans's own and maps
onto the two distinct interview moments, so it earns two cards and two night-before sheets, not one.

## The map — fourteen notes

### Lessons (eight)

Two intra-topic spines, each a "spine with two forks" (ticket 05). `prerequisites` is the vault's
only ordering claim and stays a graph; the Plan is one path through it.

| #  | Filename (`content/lessons/…`) | `topic` | `prerequisites` | Primary source |
| -- | ------------------------------ | ------- | --------------- | -------------- |
| 1  | `ubiquitous-language`          | `strategic-design` | — | strategic research §1 (Evans; Fowler *UbiquitousLanguage*) |
| 2  | `bounded-context`              | `strategic-design` | `ubiquitous-language` | strategic §2 (Evans; Fowler *BoundedContext*; Newman bridge) |
| 3  | `context-mapping`              | `strategic-design` | `bounded-context` | strategic §3 (Evans Part IV; Avanscoperta) — catalogue table extracted, see References |
| 4  | `subdomains-and-distillation`  | `strategic-design` | `bounded-context` | strategic §§4–5 (Evans Distillation; Vernon trichotomy) |
| 5  | `entities-and-value-objects`   | `tactical-design`  | — | tactical §1 (Evans; Fowler *ValueObject*) |
| 6  | `aggregates`                   | `tactical-design`  | `entities-and-value-objects`, **`consistency-models`** | tactical §2 (Evans; Vernon *EAD* I–II) |
| 7  | `repositories`                 | `tactical-design`  | `aggregates` | tactical §3 (Evans; Vernon *EAD* II) |
| 8  | `domain-events`                | `tactical-design`  | `aggregates` | tactical §4 (Evans 2015 Reference; Vernon) |

**The spine.** Strategic: `ubiquitous-language → bounded-context → {context-mapping,
subdomains-and-distillation}` — language is *why* boundaries exist, so it comes first; the context
map and subdomains are two independent things you do once you have boundaries. Tactical:
`entities-and-value-objects → aggregates → {repositories, domain-events}` — the equality
distinction underlies the aggregate; the repository (how you fetch it) and the domain event (what it
publishes) are two independent things you do once you have an aggregate.

**Exactly one cross-topic prerequisite edge** (ticket 05): `aggregates → consistency-models`
(existing note). The eventual-consistency-outside-the-boundary rule is unreadable without it. Every
other neighbour is a **body cross-link, not a prerequisite**: `bounded-context ↔ microservices`,
`domain-events ↔ event-sourcing / message-queues`, `subdomains-and-distillation ↔ build-vs-buy`.
**No existing note gains a prerequisite on a DDD note** — DDD is additive and beside, both topics
are peer entry points, and neither is downstream of `system-design`/`distributed-systems`.

`ubiquitous-language` and `entities-and-value-objects` are the two roots (no inbound edge); that is
correct, not an omission.

### Terms (two)

`content/terms/strategic-design.md` and `content/terms/tactical-design.md` — the topic-anchor Terms
that render the "In this topic" index. **No standalone concept Term** (see the open call in
**Judgment calls** below): headline vocabulary — bounded context, aggregate — is taught canonically
in its Lesson and is linkable there, so a separate Term would duplicate the definition the Lesson
already owns. This matches the database run's convention (one anchor Term per topic).

### Cheat sheets (two) — one per topic

`content/cheat-sheets/strategic-design-cheat-sheet.md`,
`content/cheat-sheets/tactical-design-cheat-sheet.md`. No merged DDD sheet (ticket 03).

- **Strategic sheet**: the boundary-finding heuristic (draw the line where the language changes),
  subdomain triage (core/supporting/generic → invest / build-thin / buy), and the context-map
  relationship names as a one-liner each so the candidate can *say* "conformist," "open host
  service," "anti-corruption layer" under pressure.
- **Tactical sheet**: entity-vs-VO decision (which equality?), the four aggregate rules (small / one
  per transaction / reference by identity / eventual consistency outside), repository = collection
  illusion for one aggregate root, domain event = "something happened that experts care about."

### References (one)

| Filename (`content/references/…`) | `topic` | Source |
| --------------------------------- | ------- | ------ |
| `context-mapping-patterns`        | `strategic-design` | strategic research §3 catalogue table |

The rule that keeps a Reference from being a second Lesson: material the source presents as something
to **look up** becomes a Reference, and the owning Lesson does not restate it. The nine-row
context-map catalogue — Partnership, Shared Kernel, Customer/Supplier, Conformist, Anti-Corruption
Layer, Open Host Service, Published Language, Separate Ways, Big Ball of Mud — is a lookup table
(pattern × definition × when-to-reach-for-it × provenance). It becomes the Reference. The
`context-mapping` Lesson teaches how a context map works — upstream/downstream, why you draw one,
and two or three headline patterns *in prose* — and links the table rather than cataloguing all nine.

*(An "aggregate design rules" checklist Reference was considered and refused: those four rules are
the argument of the `aggregates` Lesson, prose not lookup, and extracting them would gut the Lesson.
See **Judgment calls** if a second Reference is wanted.)*

### Problem (one) — via `/import`

`content/problems/carve-bounded-contexts-for-an-online-marketplace.md`

- `kind: system-design`
- `topic: strategic-design`
- `practices: [bounded-context, context-mapping, subdomains-and-distillation]`
- **Prompt gist**: a single-team online marketplace (buyers, sellers, catalogue, orders, payments,
  shipping, reviews, fraud) is being pulled apart. Identify the subdomains and triage them
  core/supporting/generic; propose bounded contexts and justify each boundary from where the language
  changes (the two meanings of "order," of "user"); draw the context map and name the relationship /
  integration pattern on each seam (which team is upstream, where an ACL protects a model, where an
  open-host service + published language serves several consumers, where "separate ways" is right).
  The `## Solution` walks one defensible decomposition; `## Follow-ups` push on core-domain
  investment and on where a single context might later split into several services (Newman).

This is the topic's capstone: the strategic Lessons teach the vocabulary, the Problem exercises the
whole boundary-and-integration decision end to end.

### Plan (one)

`content/plans/reading-order-for-domain-driven-design.md`, spanning both topics. Sibling of the
existing `reading-order-for-*` Plans; asserts no sequence the graph does not already hold, and says
the note wins where the two disagree. One path, strategic-before-tactical (boundaries first, then
what you build inside one):

1. `ubiquitous-language`
2. `bounded-context`
3. `context-mapping`
4. `subdomains-and-distillation`
5. `entities-and-value-objects`
6. `aggregates` — the Plan flags the `consistency-models` prerequisite: read it first if you haven't.
7. `repositories`
8. `domain-events`
9. capstone: the `carve-bounded-contexts-for-an-online-marketplace` Problem.

Not `featured` unless the dev says so.

## What does not cross — the reconciliation (ticket 04)

The only rendered DDD already in the vault is the **monolith Lesson**'s migration-framed mentions of
bounded context and ACL (both clozed). DDD **cross-links into that material and re-teaches nothing**.

- **Bounded context is taught once, canonically, in the new `bounded-context` Lesson.** The monolith
  Lesson keeps its just-enough gloss (its `{{bounded contexts}}` cloze at line 116 stays) and gains a
  cross-link to `[[bounded-context]]`. It does not re-teach the concept.
- **ACL's migration-coexistence framing stays in the monolith Lesson** (the strangler-fig
  translation shim). DDD teaches ACL as a **context-map pattern** in `context-mapping`. The two
  cross-link; neither re-teaches the other.
- **strangler fig / modular monolith / MonolithFirst / the distributed-systems tax stay
  `system-design`** and do not cross into DDD.
- **`content/research/architecture-and-ddd.md` (Workshop) does not cross** — it never renders, and
  ticket 01 already re-derived its strategic vocabulary from Evans-sourced primaries.

**The two reconciliation edits are body wikilinks, not prerequisites** (ticket 05), both *inbound*
to the new `bounded-context` Lesson:

1. `content/cheat-sheets/system-design-cheat-sheet.md:220` — the bullet
   `**Cut along [[distributed-systems|bounded contexts]]**` currently points "bounded contexts" at
   the wrong target. **Re-point to `[[bounded-context|bounded contexts]]`.** The bullet's system-design
   content stays put and gains no DDD content (ticket 04).
2. `content/lessons/monolith-to-microservices-modernization.md` — at its bounded-context gloss
   (§ "Finding the seams", ~line 89/116), **add a cross-link to `[[bounded-context]]`.** Keep the
   gloss and clozes; do not re-teach.

*(Verified: the monolith Lesson does not currently mis-wikilink "bounded context" to
`[[distributed-systems]]` — its distributed-systems links are for the "tax" and the eight fallacies.
The only wrong wikilink is the cheat-sheet bullet above. The monolith edit is purely additive.)*

## Out of scope (from the map)

Ruling any of these in would redraw the destination and start a fresh effort, not resume this one.

- **Factories, Specifications, Modules** (Evans Part II tail) — tactical catalogue a senior interview
  does not reach.
- **Part III "supple design" refactoring patterns** (intention-revealing interfaces, side-effect-free
  functions, assertions, closure of operations) — a refactoring-craft subject, not interview design
  vocabulary.
- **Large-scale structure** (system metaphor, responsibility layers, evolving order) — Evans Part IV
  tail, rarely asked.

## Claims to soften — provenance to flag

The subject reads 20 years old if these go unflagged. Each is cited in the research; carry the flag
into the note body (the way the database run carried its version-pinned facts).

1. **Partnership is a 2015 addition, not 2003.** It is in the *DDD Reference*, not the blue book.
   Present the other eight context-map patterns as Evans (2003) and mark Partnership as later.
2. **Big Ball of Mud is Foote & Yoder (1997/99), not Evans.** Evans adopted it into the catalogue.
   Attribute it, don't imply he coined it.
3. **The core/supporting/generic subdomain trichotomy — and the term "supporting subdomain" — is
   Vernon (2013/16), not literal 2003 Evans.** Evans had **Core Domain** and **Generic Subdomain**
   under Distillation; the tidy symmetric three-way split is Vernon's. Treat it as standard modern
   DDD, but don't put it in Evans's mouth.
4. **Domain Event is post-2003.** Starred "new term introduced since the 2004 book" in the 2015
   Reference. Never call it one of the original building blocks.
5. **The sharp aggregate rules are Vernon's codification, not Evans's wording.** "Small aggregates /
   one per transaction / reference by identity / eventual consistency outside the boundary" are
   Vernon's *Effective Aggregate Design* (2011); Evans's original is terser ("apply consistency rules
   synchronously within a boundary; across boundaries, asynchronously"). Teach Vernon's rules —
   they're what interviewers expect — but attribute them.
6. **Bounded-context-as-microservice is a bridge, not Evans.** The mapping is Newman's, and it is
   **not one-to-one**: one context may span several services, never a service across two contexts;
   a context is the *starting* granularity, split further only under scaling/team pressure.
7. **Shared Kernel is a smell in modern practice.** Present it as Evans's neutral option *and* flag
   that a shared library/schema across services reintroduces the coupling microservices exist to
   avoid — a narrow-exception pattern now, not a default.

## Judgment calls — settled with the dev

The three live seams in the assembly, all confirmed:

1. **Terms = the two topic anchors only** (no standalone `bounded-context` / `aggregate` Term):
   matches the vault convention, and the canonical Lesson owns the definition. **Confirmed.**
2. **One Reference (`context-mapping-patterns`).** The four aggregate rules stay as prose in the
   `aggregates` Lesson — its argument, not a lookup table. **Confirmed.**
3. **The Problem domain is an online marketplace, `kind: system-design`** — a general, widely
   understood domain with clear language-divergence seams, over a narrower reinsurance framing.
   **Confirmed.**

## Which names an agent may link

Link freely to any note this map names and to any note already on disk; **never invent a name that
is in neither.** A forward link to a note this map names is the authoring queue.
