---
id: 01M3AFVWYF2ZH8CTGK7XWMY9ZV
title: Strategic design — cheat sheet
topic: strategic-design
---

**Strategic DDD is boundaries and integration, not classes.** It gives a vendor-neutral answer to
the two hardest questions in a design round: *where do the service boundaries go?* and *how do they
talk without coupling?* Bounded contexts answer the first; the context map answers the second.

**The one move: draw the line where the language changes.** A [[ubiquitous-language|ubiquitous
language]] is consistent only inside a [[bounded-context|bounded context]] — so when one word means
two things, that is two contexts, not one model to reconcile. "Order" to the cart team and "order" to
fulfilment are different models of the same word; "user" to CRM and to billing likewise. Say it out
loud — *"these are two models of 'user'; each gets its own context"* — and you have justified a
service boundary from first principles rather than by gut.

- A bounded context owns its **model and its data** and defines **integration contracts** with its
  neighbours — almost word-for-word a well-designed service.
- Maps to a microservice, but **not one-to-one**: one context may span several services, never a
  service across two contexts. It is the *starting* granularity — split further only under
  scaling/team pressure (Newman, not Evans).
- Companion lens: **Conway's law** — the boundary tends to follow the team boundary.

**Subdomain triage — invest / build-thin / buy.** The problem-space cut that tells you where to spend
(core/supporting/generic is Vernon's tidy trichotomy; Evans had Core Domain and Generic Subdomain).
Full treatment: [[subdomains-and-distillation]].

- **Core** — the reason the business exists, its differentiator → **invest**: best people, in-house,
  its own context boundary.
- **Supporting** — needed but not a differentiator, no off-the-shelf fit → **build thin**, don't
  over-engineer.
- **Generic** — a solved problem (auth, notifications, tax tables) → **buy / SaaS / library**, never
  hand-craft.

Subdomains live in the **problem space** (what the business does); contexts in the **solution space**
(how you carve the software). Ideally one context per subdomain, not guaranteed. The senior move:
name the core and *explicitly refuse* to gold-plate the generic parts.

**The context map — name the relationship on every seam.** Say these under pressure; the full lookup
(definition × when × provenance) is [[context-mapping-patterns]], taught in [[context-mapping]]. The
axis is **upstream → downstream**: upstream's changes flow to downstream.

- **Partnership** — two teams succeed or fail together; plan and evolve interfaces in lockstep. *(2015
  addition, not the 2003 book.)*
- **Shared Kernel** — share a small subset of model + code; every change needs consultation. *(A smell
  in modern service practice — reintroduces the coupling microservices exist to avoid.)*
- **Customer/Supplier** — upstream accommodates downstream's needs as first-class backlog items.
- **Conformist** — downstream adopts the upstream model wholesale, no translation, to kill integration
  friction.
- **Anti-Corruption Layer (ACL)** — a translation layer so the upstream's model can never leak in;
  the standard move for a legacy or third-party system. *The most-cited strategic pattern.*
- **Open Host Service (OHS)** — upstream publishes one stable, general-purpose API for *many*
  consumers instead of N bespoke integrations.
- **Published Language** — a documented shared interchange schema (JSON Schema / Avro / Protobuf /
  OpenAPI) as the common tongue; often paired with OHS.
- **Separate Ways** — no meaningful integration; cut it and accept duplication when integration ROI is
  negative.
- **Big Ball of Mud** — a *diagnosis*, not a target: fence off the boundary-less morass (often behind
  an ACL) and stop modelling it. *(Foote & Yoder, 1997/99; Evans adopted it.)*

The reach-for-it signal: any question about *who depends on whom, and how the seam is governed.*

Full treatment: [[bounded-context]], [[context-mapping]], [[subdomains-and-distillation]],
[[ubiquitous-language]].
