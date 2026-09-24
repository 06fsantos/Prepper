---
id: 01M3AEKNVGG0HT8FCZK5MPCECT
title: The context map, and how contexts integrate without coupling
topic:
  - strategic-design
prerequisites:
  - bounded-context
---

A context map is a single document — usually a diagram — that names every
[[bounded-context|bounded context]] in play and, for each pair that touches, the **relationship**
between them: which way the dependency runs, who holds the leverage, and which integration pattern
governs the seam. Its whole purpose is to make integration **explicit**. Left alone, the
connections between contexts accrete by accident — one team reads another's database here, a shared
table creeps in there — and nobody can say who depends on whom until a change breaks something two
contexts away. The map is where you write those relationships down on purpose, so a coupling is a
decision somebody made rather than a surprise somebody discovers.

The thing to hold onto is what kind of artifact this is. A context map is a **team-and-dependency
topology, not a class diagram.** It says nothing about the objects inside a context; it says
everything about how the contexts stand relative to each other. That is exactly why it is the most
interview-relevant artifact in strategic design: the design-round question "how do these services
talk to each other without coupling?" is answered by pointing at a seam and naming the relationship
that governs it.

## Upstream and downstream: the axis of power

Every relationship on the map turns on one axis: **upstream** and **downstream**. The upstream
context's changes flow *to* the downstream one; the downstream *depends on* the upstream. Power runs
with the flow — the upstream can change its model and its interface on its own schedule, and the
downstream has to cope. "Cope" is the operative word, because each pattern in the catalogue is a
different answer to the same question: **how does the downstream survive the upstream's changes?**

Naming the direction out loud is half the senior move. "The payments team is upstream of us" is not
a throwaway phrase — it says payments sets the contract, we absorb their changes, and any protection
against those changes is *our* job to build, not theirs to offer. Getting the arrow right is what
turns "these two services talk" into "this service depends on that one, and here is how it defends
itself."

```quiz 01M3AEKNVHJKMAVH0R3TX8YC5X cloze
On a context map, the {{upstream}} context's changes flow to the {{downstream}} one, which depends
on it. Every relationship pattern in the catalogue is a different answer to one question: how does
the {{downstream}} context cope with the upstream's changes?
```

## The Anti-Corruption Layer: refusing to let the upstream's model leak in

The single most-cited pattern on the map is the **Anti-Corruption Layer (ACL)**. It is what a
downstream context builds when it depends on an upstream — often a legacy system or a third party —
whose model it refuses to let infect its own. The ACL is an isolating translation layer at the seam:
every call out to the upstream and every response coming back is translated between the two models,
so the upstream's vocabulary, its awkward types, and its accidental assumptions **never cross the
boundary**. Inside the ACL you speak the foreign model; on your side of it you speak only your own.

The cost is real — you maintain a translation layer that does no business work of its own — and you
pay it deliberately, to buy one thing: your model stays clean. Reach for an ACL when the upstream's
model is one you cannot change and would not choose, and letting it leak inward would corrupt the
model you have carefully kept consistent inside your boundary. Skip it, and the legacy system's
quirks quietly become your domain's quirks.

An ACL is a context-map *decision* — you draw it on the map as a relationship — but it is **realised
in code as a translation layer** at the seam, whose mechanics belong to the tactical building blocks
rather than to this Lesson. You have also already met it in another guise: the translation shim a
[[monolith-to-microservices-modernization|monolith-to-services migration]] stands up around the old
system while it strangles it is the same pattern doing the same job.

```quiz 01M3AEKNVHTXFG82PDC7M894FY
A downstream context integrates with a legacy billing system whose data model is messy and cannot be
changed. Why put an Anti-Corruption Layer at the seam?

- [x] To translate at the boundary so the legacy model never leaks into your own
  > That is the ACL's whole job: it isolates your consistent model from a foreign one you cannot
    change, at the cost of a translation layer that does no business work itself.
- [ ] To speed up the legacy system by caching its responses at the boundary
  > An ACL is about model isolation, not performance; it may add a hop rather than remove one, and
    caching is a separate concern from translation.
- [ ] To let the legacy team adopt your model so both sides finally converge
  > The premise is that the upstream model cannot change; an ACL protects you *without* asking the
    upstream to converge on anything.
- [ ] To share a common schema both systems agree to evolve together
  > A shared schema is the opposite move — it couples the two models, which is exactly what the ACL
    is built to prevent. See [[context-mapping-patterns]].
```

## Open Host Service and Published Language: publish once, for many

The ACL is the downstream's defensive move. The upstream has a matching pair of its own for when it
serves not one consumer but several. An **Open Host Service (OHS)** is the decision to publish a
*stable, documented, general-purpose* interface — a protocol any downstream can integrate against —
instead of building a bespoke integration per consumer. When five teams need your data, five one-off
integrations is five things to change every time your model shifts; one open host service is one.

A **Published Language** is the companion: a well-documented, shared interchange format that both
sides translate to and from — historically an XML DTD, today a JSON Schema, an Avro or Protobuf
definition, an OpenAPI contract. It is the common tongue the OHS speaks. Together they are the
strategic-design name for something a modern engineer already builds: a versioned, documented
REST or gRPC API with a schema registry in front of it. Naming it as OHS + Published Language in a
design round signals that you are standardising the seam on purpose — "I'd expose it as an open host
service with a published schema so the other three teams integrate the same way" — rather than
letting each consumer negotiate its own private deal.

## Conformist and Separate Ways: the two cheap ends

Not every seam is worth an ACL or an OHS. Two patterns are the low-effort ends of the spectrum, and
knowing when they are *right* is as senior as knowing the elaborate patterns.

**Conformist** is total surrender of your model to the upstream's. The downstream adopts the upstream
model wholesale, with **no translation layer** — the exact opposite of an ACL. You give up the fit
of your own model in exchange for zero integration friction, and it is the right call when the
upstream will not accommodate you *and* its model is good enough to live inside. An ACL you can't
afford, or don't need, becomes a Conformist.

**Separate Ways** is the decision that two contexts have no meaningful integration at all, so you cut
it — accept the duplication, and let each side solve its slice independently. It is right when the
functional overlap is weak and integration would cost more than it saves. The senior signal here is
restraint: not every pair of contexts on the map needs a line between them, and drawing one anyway is
how you buy coupling you had no use for.

## The full catalogue, and where the vocabulary earns its keep

Those four — ACL, Open Host Service with Published Language, Conformist, Separate Ways — are the
headline relationships, taught here in prose because they carry the reasoning. The complete
catalogue is a lookup table you reach for rather than read through: nine patterns, each with a
definition, a when-to-reach-for-it, and its provenance, in [[context-mapping-patterns]]. Two
provenance notes are worth carrying so the subject does not read twenty years stale. Eight of the
patterns are Evans's from the 2003 book; **Partnership** was added later, in his 2015 *DDD
Reference*, and **Big Ball of Mud** is not Evans's at all — it is Brian Foote and Joseph Yoder's
[1997/99 diagnosis](http://www.laputan.org/mud/) that Evans folded into the catalogue as a name for
the legacy morass you fence off rather than model.

One pattern in that table deserves a modern caution the 2003 framing does not give it. **Shared
Kernel** — two contexts agreeing to share a slice of model, code, or schema as common ground — reads
as a neutral option in Evans, but across service boundaries it is the pattern modern practice most
distrusts: a shared library or schema between services reintroduces exactly the coupling that
splitting into services was meant to remove. Treat it as a narrow-exception pattern for small,
high-trust, colocated teams, not a default.

The reason to hold all of this is that a context map is what lets you talk about integration and team
coupling *precisely*, which is what a design round rewards. "The payments team is upstream and we're
a conformist to their API," "I'd put an anti-corruption layer in front of the legacy billing
system," "expose it as an open host service with a published schema so the other three teams
integrate the same way" — each is a crisp statement of a coupling decision, and each names who
depends on whom and how the seam is governed.

```quiz 01M3AEKNVHA435NAYK143639N4 recall
In a design round you have drawn three bounded contexts: a modern Orders context you own, a crufty
legacy Billing system you must call, and a Catalogue context that four other teams also consume. For
each seam, name a context-map relationship and justify it in one sentence.

> Orders → Billing: an **Anti-Corruption Layer**. Billing is upstream and its model is legacy and
> unchangeable, so Orders builds a translation layer at the seam to keep Billing's model from leaking
> into its own — you pay for a translation shim to protect a clean model.
>
> Catalogue → its four consumers: an **Open Host Service with a Published Language**. Catalogue is
> upstream to several downstreams, so instead of four bespoke integrations it publishes one stable,
> documented interface against a shared schema (JSON Schema / OpenAPI / Protobuf), and every consumer
> integrates the same way.
>
> The senior signal is naming the *direction* on each seam — who is upstream, who copes — and
> matching the pattern to the politics and the cost, not reaching for the most elaborate pattern
> everywhere. If Billing's model were good enough and Orders had no leverage, a **Conformist**
> relationship (adopt Billing's model wholesale, no translation) would be the cheaper right answer;
> if two contexts had no real overlap, **Separate Ways** — cut the integration and accept the
> duplication — would beat drawing a line you don't need.
```

## What to take away

A context map names every bounded context and the relationship on every seam between them, so
integration is an explicit decision rather than an accident that accretes. Every relationship turns
on the **upstream/downstream** axis — the upstream's changes flow to the downstream, which must cope
— and each pattern is a different way of coping. The four that carry the reasoning: an
**Anti-Corruption Layer** is the downstream translating at the seam so a foreign model never leaks in
(realised in code as a translation layer); an **Open Host Service** with a **Published Language** is
the upstream publishing one stable, documented, schema-backed interface for many consumers instead of
a bespoke integration each; **Conformist** is adopting the upstream's model wholesale with no
translation; and **Separate Ways** is deciding there is no integration worth having and cutting it.
The full nine-pattern catalogue, with provenance, is [[context-mapping-patterns]] — reach for it as a
lookup, not a read.

Worth reading in full: Avanscoperta's
["Context Mapping"](https://www.avanscoperta.it/en/context-mapping/) — a compact, well-diagrammed
rendering of Evans's whole relationship catalogue that shows the upstream/downstream arrows on real
seams.
