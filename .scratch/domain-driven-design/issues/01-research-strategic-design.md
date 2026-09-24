# Research: DDD strategic design

Type: research
Status: resolved
Blocked by: —

## Question

What does DDD **strategic design** consist of, at the fidelity needed to author vault Lessons / Terms / References for a senior **system-design** audience?

Gather from high-trust primaries:

- Eric Evans, free **_Domain-Driven Design Reference_** (2015) PDF, and the blue book's **Part IV** — the primary authority for the vocabulary.
- Martin Fowler — **BoundedContext**, **UbiquitousLanguage** essays.
- Sam Newman — service boundaries, for the modern microservices bridge the 2003 book predates.

Cover, for each: Evans's definition, why it matters in a design interview, and where the 2003 framing is dated vs modern service-boundary practice — and **flag any concept that is not originally Evans's**:

- Bounded context
- Context map + the relationship-type catalogue: Shared Kernel, Customer/Supplier, Conformist, Anti-Corruption Layer, Open Host Service, Published Language, Separate Ways, Big Ball of Mud
- Ubiquitous language
- Subdomains: core / supporting / generic
- Distillation (core-domain focus)

Findings → `.scratch/domain-driven-design/research/strategic-design.md`, with a pointer from this ticket's `## Answer` on resolution.

## Answer

Full findings: [`.scratch/domain-driven-design/research/strategic-design.md`](../research/strategic-design.md).

Strategic DDD is the "where do service boundaries go, and how do the services talk" half of
Domain-Driven Design — the part that carries a senior system-design round. Covered at
author-fidelity, with Evans's definition, interview relevance, the dated-vs-modern gap, and an
origin flag for each:

- **Ubiquitous Language** — a rigorous shared model-based vocabulary used pervasively; language
  divergence is the *signal* of a context boundary. (Evans 2003.)
- **Bounded Context** — the boundary within which one model/language is consistent; the principled
  definition of a service. Modern bridge (Newman): a context maps to a microservice, but *one
  context may span several services, never one service two contexts*, and the boundary is found
  iteratively. (Evans 2003.)
- **Context Map + relationship catalogue** — a team/dependency topology governing integration
  seams along an upstream/downstream axis: Partnership, Shared Kernel, Customer/Supplier,
  Conformist, Anti-Corruption Layer, Open Host Service, Published Language, Separate Ways, Big Ball
  of Mud. These map cleanly onto microservice integration (OHS+Published Language ≈ documented
  versioned API + schema registry; ACL ≈ strangling a legacy system); the 2003 framing predates
  async/event-driven integration, API gateways, contract testing, and Team Topologies, and modern
  practice distrusts Shared Kernel as reintroduced coupling.
- **Subdomains (core/supporting/generic)** — a problem-space prioritization / build-vs-buy frame:
  invest in the core, buy the generic.
- **Distillation** — the discipline of separating the Core Domain from supporting/generic material
  so effort lands where it differentiates. (Evans 2003.)

**Origin flags:** most patterns are Evans's (2003 blue book, Part IV). Exceptions to cite when
authoring: **Partnership** was added in the 2015 *DDD Reference*, not the 2003 book; **Big Ball of
Mud** is Foote & Yoder (1997/1999), adopted into Evans's catalogue; and the tidy
**core/supporting/generic subdomain trichotomy** (and the term *"supporting subdomain"*) was
crystallized later by **Vaughn Vernon** (2013/2016) — Evans's own 2003 terms are *Core Domain* and
*Generic Subdomain*. Every claim is cited in the findings file's `## Sources`.
