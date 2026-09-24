# DDD Strategic Design — research findings

Scope: the strategic half of Domain-Driven Design, at the fidelity needed to author vault
Lessons / Terms / References for a **senior system-design** audience. Primary authority is
Eric Evans (the 2003 blue book Part IV and the free 2015 *DDD Reference*), bridged to modern
service-boundary practice via Martin Fowler and Sam Newman. Full citations in `## Sources`.

A note on method: Evans's *DDD Reference* PDF is on this machine but could not be text-extracted
(no `pdftotext`/PDF libs installed, and the model-based PDF reader needs `poppler`). Definitions
below are drawn from the web-accessible primary essays (Fowler, Microsoft/Newman) and from
high-fidelity secondary renderings of the Reference's pattern summaries, cross-checked across
independent sources. Where a definition is a close paraphrase of the Reference rather than a
verbatim quote, it is marked as such.

---

## The three layers of DDD

Strategic design is one of three concerns, and it is the one that matters most in a system-design
interview because it is about **boundaries and integration**, not classes:

1. **Ubiquitous Language** — the shared vocabulary.
2. **Strategic design** — bounded contexts, context maps, subdomains, distillation. *(this doc)*
3. **Tactical design** — entities, value objects, aggregates, repositories. *(out of scope)*

The interview payoff of strategic DDD is that it gives you a principled, vendor-neutral answer to
the two hardest questions in a design round: **"where do the service boundaries go?"** and **"how do
these services talk to each other without coupling?"** Bounded contexts answer the first;
the context-map catalogue answers the second.

---

## 1. Ubiquitous Language

**Evans's definition.** A rigorous, shared language built around the domain model and used
*pervasively* — in conversation, in docs, and in the code itself — by developers and domain
experts alike. Fowler: it is "the practice of building up a common, rigorous language between
developers and users," grounded in the domain model, because "software doesn't cope well with
ambiguity." The model and the language are inseparable: the model gives the terms their rigor, and
using the terms consistently sharpens the model. Both sides are accountable — experts flag terms
that sound wrong, developers flag ambiguity and inconsistency.

**Why it matters in an interview.** It is the *reason* bounded contexts exist. When the
interviewer's "user" means one thing to the CRM team and another to billing, that ambiguity is the
signal that you are crossing a context boundary. Naming that out loud — "these are two different
models of 'user'; I'd give each its own context" — is exactly the senior move.

**Dated vs. modern.** The concept is undated; it is as true for a microservice's API contract as
for a 2003 monolith. What has shifted is emphasis: modern practice (Event Storming, Newman) treats
language divergence as the *primary discovery tool* for finding service boundaries, not just a
communication nicety.

**Origin.** Originally Evans (2003). Fowler's essay popularized it but attributes it to Evans.

---

## 2. Bounded Context

**Evans's definition.** The explicit boundary — a subsystem, a team's work, a specific
codebase/database — within which a particular domain model applies and its Ubiquitous Language is
consistent. Evans's premise: "total unification of the domain model for a large system will not be
feasible or cost-effective" (Fowler paraphrasing Evans). So instead of one model, you have several,
each internally consistent, each valid only inside its boundary. Fowler's canonical example: "meter"
means subtly different things to different departments of an electricity utility — different models
of the same word, which is a polysemy the software must honor rather than paper over.

**Why it matters in an interview.** This is the concept that converts a hand-wavy "we'll split it
into services" into a defensible boundary. A bounded context is *autonomous*, *owns its model and its
data*, and *defines integration contracts with its neighbors* (Microsoft/Newman) — which is almost
word-for-word the definition of a well-designed service. Saying "I draw the boundary where the
language changes" is the strategic-design answer to "how did you decide these were separate
services?"

**Dated vs. modern — the key nuance.** In 2003 a bounded context was usually a module or a
subsystem inside one deployable. Modern practice maps it to a **microservice**, but the mapping is
**not one-to-one**: Newman's rule (via Microsoft's DDD guidance) is *"sometimes a BC could be
composed of several physical services, but not vice versa"* — i.e. one context may span several
services, but a single service should never straddle two contexts. Newman also cautions that a
bounded context is the *starting* granularity: begin coarse (context-sized services) and split
further only when scaling, deployment, or team-ownership pressures justify it — the boundary is
discovered iteratively, "not a one-shot process." Conway's law is the modern companion: the
context boundary tends to follow the team boundary, and you can deliberately choose team structure
to force the architecture you want ("reverse Conway").

**Origin.** Originally Evans (2003).

---

## 3. Context Map and the relationship-type catalogue

**Evans's definition.** A **Context Map** is a document (typically a diagram) naming every
bounded context in play and the **relationship** between each pair — the direction of dependency,
who has leverage (upstream/downstream), and which integration pattern governs the seam. Its whole
point is to make *explicit* the integrations that otherwise accrete by accident. This is the single
most interview-relevant artifact in DDD strategic design: it is a **team-and-dependency topology**,
not a class diagram.

Upstream/downstream is the axis the catalogue turns on: the **upstream** context's changes flow
*to* the **downstream** one; the downstream depends on the upstream. Each pattern below is a
different political-and-technical answer to "how does downstream cope with upstream?"

### The catalogue

| Pattern | Definition (paraphrasing Evans's Reference) | When to reach for it | Origin |
|---|---|---|---|
| **Partnership** | Two contexts/teams succeed or fail together; they coordinate planning and joint-manage the integration so features and interfaces evolve in lockstep. | Two teams with mutual dependency and the communication bandwidth to keep synced. | **Added in the 2015 Reference** — not in the 2003 book. |
| **Shared Kernel** | Two teams agree to share a *subset* of the model (and its code/schema) as common ground; changes to it require consultation because a small change ripples across both. | Small shared core, high-trust colocated teams; keep the shared part *small*. | Evans (2003). |
| **Customer/Supplier** | An upstream ("supplier") and downstream ("customer") with a real co-dependency; the downstream's needs are a first-class item in the upstream's planning and backlog. | Upstream is willing and able to accommodate downstream's needs. | Evans (2003). |
| **Conformist** | Downstream *slavishly adheres* to the upstream model with no translation — trading its own model's fit for the upstream's for zero integration friction. | Upstream won't cooperate and its model is good-enough; you accept it to save the translation cost. | Evans (2003). |
| **Anticorruption Layer (ACL)** | An isolating translation layer the downstream builds so the upstream's model can *never leak into* its own; all cross-talk is translated at the seam. | Integrating a legacy or third-party system whose model you refuse to let infect yours. | Evans (2003). The single most cited strategic pattern. |
| **Open Host Service (OHS)** | The upstream publishes a *stable, documented, general-purpose* protocol/API as a set of services for *many* downstreams, rather than a bespoke integration per consumer. | You are the upstream serving several consumers; standardize instead of N one-offs. | Evans (2003). |
| **Published Language** | A well-documented **shared interchange format** (a schema/language — historically XML DTDs, today JSON Schema/Avro/Protobuf/OpenAPI) used as the common tongue for model-to-model translation, often paired with OHS. | Multiple parties need a stable contract to integrate against. | Evans (2003). |
| **Separate Ways** | Decide the two contexts have *no* meaningful integration and cut it entirely, accepting duplication, because integration costs more than it's worth. | Weak or no functional overlap; integration ROI is negative. | Evans (2003). |
| **Big Ball of Mud** | Not a target — a *diagnosis*: a sprawling area with no consistent boundaries or model, which you fence off (often behind an ACL) and stop trying to model cleanly. | Label the legacy morass honestly so you protect *new* contexts from it. | **NOT originally Evans** — coined by Brian Foote & Joseph Yoder (1997/1999); Evans adopted it into the context-map catalogue. |

**Why it matters in an interview.** This catalogue is the vocabulary that lets you talk about
*service integration and team coupling* precisely. "I'd put an anti-corruption layer in front of the
legacy billing system," "the payments team is upstream and we're a conformist to their API,"
"expose it as an open host service with a published JSON schema so the other three teams integrate
the same way" — each of these is a crisp, senior-level statement of a coupling decision. Interviewers
reward candidates who reason about *who depends on whom and how the seam is governed*, which is
exactly what a context map is.

**Dated vs. modern service-boundary practice.**
- The **patterns map cleanly onto microservices** and are arguably *more* relevant now than in 2003,
  because distributed systems make integration seams first-class. OHS + Published Language is
  essentially "a versioned, documented REST/gRPC API with a schema registry." ACL is the standard
  guidance for strangling a legacy system.
- What's **dated** is the *social framing*: Evans wrote in a world of separate teams integrating
  batch/RPC boundaries. Modern additions the 2003 catalogue predates: **asynchronous,
  event-driven integration** (event streams / pub-sub, event-carried state transfer) as a way to
  invert the upstream/downstream dependency; **API gateways / BFFs**; **schema registries and
  consumer-driven contract testing** as the operational form of Published Language; and **Team
  Topologies** (Skelton & Pais, 2019) which re-casts Evans's team relationships as
  collaboration/X-as-a-Service/facilitating interaction modes.
- **Shared Kernel** is the pattern modern practice most distrusts: a shared library/schema across
  services reintroduces exactly the coupling microservices exist to avoid, so it's now a
  smell-with-narrow-exceptions rather than a neutral option.

---

## 4. Subdomains: core / supporting / generic

**Definitions.**
- **Core subdomain** — the part that is *the* reason the business exists and its competitive
  differentiator; unique to this business and where the best people and modeling effort must go.
- **Supporting subdomain** — necessary for the core to function but not a differentiator; custom-built
  because no off-the-shelf option fits, but it doesn't warrant your best modeling investment.
- **Generic subdomain** — a solved problem common to many businesses (auth, notifications, billing
  tax tables); buy it, outsource it, or use a library — do **not** hand-craft it.

The *domain* is the whole problem space; a *subdomain* is a slice of it. Note the useful
distinction interviewers probe: subdomains live in the **problem space** (what the business does);
bounded contexts live in the **solution space** (how you carve the software). The mapping is *ideally*
one context per subdomain but is not guaranteed.

**Why it matters in an interview.** It is a **prioritization and build-vs-buy** framework. Asked to
design a large system, the senior move is to identify the *core* (invest, model carefully, keep
in-house, give it your strongest context boundaries) and explicitly *not* over-engineer the generic
parts ("I'd use a managed auth provider and an off-the-shelf notification service rather than build
them"). It tells the interviewer you spend complexity where it earns competitive advantage.

**Origin — flag this carefully.** Evans (2003) introduced **Core Domain** and **Generic Subdomain**
as part of Distillation (below). The explicit, symmetric **three-way "subdomain" taxonomy
(core / supporting / generic)** — including the term **"supporting subdomain"** — was crystallized
and popularized *later* by **Vaughn Vernon** (*Implementing Domain-Driven Design*, 2013; *DDD
Distilled*, 2016). So: core and generic are Evans's; the tidy trichotomy and "supporting subdomain"
as a named category are best attributed to Vernon's refinement. Treat "core/supporting/generic" as
*standard modern DDD* but not as literal 2003 Evans vocabulary.

---

## 5. Distillation (core-domain focus)

**Evans's definition (2003, Part IV, "Distillation" chapter).** Distillation is the process of
progressively *separating the Core Domain from the mass of supporting and generic material* so the
team's attention and best modeling go to what actually matters. The **Core Domain** is the distilled
essence — the model that delivers the differentiating value. Evans's supporting tools in the same
chapter: a **Domain Vision Statement** (a short written articulation of the core's value), a
**Highlighted Core** (flag the core inside the larger model), pulling reusable **Generic
Subdomains** out of the way, extracting **Cohesive Mechanisms**, and the **Segregated / Abstract
Core** (physically isolate and abstract the core so it stands clear).

**Why it matters in an interview.** Distillation is the *discipline behind* the subdomain
classification: it is the argument for **not** treating every part of the system as equally
important. In a design round it justifies statements like "I'd protect the pricing engine — that's
our core — behind its own bounded context and put my best design effort there, while everything
around it is off-the-shelf or thin CRUD." It's the answer to "where would you spend your
engineering budget?"

**Dated vs. modern.** The *idea* is undated and maps directly onto modern build-vs-buy and
"differentiating vs. commodity capability" reasoning (and onto Wardley mapping, which formalizes the
commodity/custom axis). What's dated is some of the *tactics*: Evans's Segregated/Abstract Core are
in-a-monolith code-organization moves; the modern equivalent is *architectural* — put the core in
its own service with its own team and lifecycle, buy the generic subdomains as SaaS. The strategic
intent is identical.

**Origin.** Originally Evans (2003). "Distillation," "Core Domain," "Generic Subdomain," "Domain
Vision Statement" are all his terms.

---

## Quick origin ledger (interview-flag summary)

- **Originally Evans (2003 blue book):** Ubiquitous Language, Bounded Context, Context Map,
  Shared Kernel, Customer/Supplier, Conformist, Anticorruption Layer, Open Host Service, Published
  Language, Separate Ways, Distillation, Core Domain, Generic Subdomain.
- **Added by Evans later (2015 *DDD Reference*):** the **Partnership** relationship pattern.
- **NOT originally Evans (adopted into the catalogue):** **Big Ball of Mud** — Brian Foote &
  Joseph Yoder, 1997/1999.
- **Refined/popularized after Evans:** the **core/supporting/generic subdomain trichotomy** and the
  term **"supporting subdomain"** — Vaughn Vernon (2013/2016). The **bounded-context-as-microservice**
  bridge and the "one context, possibly many services (never the reverse)" rule — Sam Newman.

---

## Sources

- Eric Evans, *Domain-Driven Design Reference: Definitions and Pattern Summaries*, March 2015 (free
  PDF, CC-licensed) — the authoritative pattern summaries.
  https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf
- Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software*, Addison-Wesley,
  2003 — Part IV "Strategic Design" (Context Mapping) and the Distillation chapter. Publisher sample:
  https://ptgmedia.pearsoncmg.com/images/9780321125217/samplepages/0321125215.pdf
- Martin Fowler, "BoundedContext" (bliki). https://martinfowler.com/bliki/BoundedContext.html
- Martin Fowler, "UbiquitousLanguage" (bliki). https://martinfowler.com/bliki/UbiquitousLanguage.html
- Sam Newman, *Building Microservices* — service boundaries and the bounded-context mapping, as
  cited and summarized in Microsoft Learn, "Identifying domain-model boundaries for each
  microservice" (.NET microservices architecture guidance):
  https://learn.microsoft.com/en-us/dotnet/architecture/microservices/architect-microservice-container-applications/identify-microservice-domain-model-boundaries
- Avanscoperta, "Context Mapping" (renders Evans's relationship-pattern catalogue):
  https://www.avanscoperta.it/en/context-mapping/
- Wikipedia, "Domain-driven design" (cross-check on pattern list and historical attribution):
  https://en.wikipedia.org/wiki/Domain-driven_design
- DDD Practitioners glossary, "Subdomain" (core/supporting/generic definitions):
  https://ddd-practitioners.com/home/glossary/subdomain/
- Brian Foote & Joseph Yoder, "Big Ball of Mud," PLoP 1997 / 1999 — origin of the Big Ball of Mud
  term Evans later folded into the context-map catalogue. http://www.laputan.org/mud/
- Vaughn Vernon, *Implementing Domain-Driven Design* (2013) and *Domain-Driven Design Distilled*
  (2016) — origin of the crystallized core/supporting/generic subdomain taxonomy. (Secondary
  cross-check: https://goodreads.com/book/show/15756865-implementing-domain-driven-design )
