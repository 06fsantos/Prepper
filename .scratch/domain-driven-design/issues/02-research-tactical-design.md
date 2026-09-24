# Research: DDD tactical design

Type: research
Status: resolved
Blocked by: —

## Question

What does DDD **tactical (building-block)** design consist of, for authoring vault notes aimed at code/design fluency?

Gather from high-trust primaries:

- Eric Evans, blue book **Part II** + the **_DDD Reference_** (2015) PDF.
- Vaughn Vernon, **_Implementing DDD_** and his **"Effective Aggregate Design"** essays — the modern primary source for aggregate rules.
- Martin Fowler — **ValueObject**, **DDD_Aggregate**.

Cover, for each: definition, the interview-relevant tradeoff, and **provenance** (Evans vs Vernon vs later):

- Entity vs value object
- Aggregate + aggregate root, and the **consistency-boundary rules**: one aggregate per transaction, reference other aggregates by identity, eventual consistency between aggregates
- Repository
- Domain event — **flag: not in the 2003 book**; Evans added it in the 2015 Reference
- Anti-corruption layer as a *tactical* pattern (note the overlap with its context-map role — feeds ticket 03's edge case)

**Explicitly EXCLUDE** factories, specifications, modules — ruled out of scope on the map.

Findings → `.scratch/domain-driven-design/research/tactical-design.md`, with a pointer from this ticket's `## Answer` on resolution.

## Answer

Findings: [`research/tactical-design.md`](../research/tactical-design.md). Read from web primaries — Evans's free **2015 DDD Reference** PDF (blue-book Part II not on this machine), Vernon's **Effective Aggregate Design** Part I & II PDFs, and Fowler's **ValueObject** / **DDD_Aggregate** bliki. Each in-scope block carries Definition / interview-tradeoff / provenance with inline citations; factories, specifications, and modules excluded as directed.

Summary by block:

- **Entity vs Value Object** — entity = identity/continuity over time; value object = no identity, defined by attributes, **immutable** (Fowler's aliasing argument, "the Evans Classification"). The lever is *which equality the domain needs*. Core Evans 2003, unchanged in 2015.
- **Aggregate + Aggregate Root** — cluster with a boundary and one root that guards invariants; the sharp modern rules (**model true invariants in one consistency boundary, design small aggregates, one aggregate per transaction, reference other aggregates by identity, eventual consistency outside the boundary**) are **Vernon's** codification in *Effective Aggregate Design* (2011). Evans 2003 originated aggregate/root and the transaction-boundary idea (Vernon quotes blue book p128 for eventual consistency); Vernon sharpened it. It's a consistency-scope decision, not object-graph modelling.
- **Repository** — collection-like access to **aggregate roots only** (not DAO-per-table); separates domain from persistence. Evans 2003, unchanged 2015.
- **Domain Event** — **NOT in the 2003/2004 blue book**; Evans added it in the **2015 Reference**, where it is starred "New term introduced since the 2004 book." It's the mechanism realizing one-aggregate-per-transaction + eventual consistency (aggregate publishes event → async subscribers update other aggregates). Vernon gives the fuller treatment.
- **Anti-Corruption Layer** — isolating translation layer letting a downstream context consume a foreign/legacy model in its own terms; the defensive alternative to Conformist. Evans 2003, but lives in **Part IV Strategic Design** as a **context-map** relationship pattern — tactical only in that it's realized as concrete translation code. This strategic/tactical overlap feeds ticket 03.
