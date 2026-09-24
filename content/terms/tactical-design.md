---
id: 01M3AE86YS008697GKNB49CZR3
title: Tactical design
---

The half of Domain-Driven Design that is about the objects *inside* one model rather than the
relationships between models: how a single model is built inside one boundary. Its vocabulary is
the [[entities-and-value-objects|entity versus value object]] distinction that turns on which
equality the domain needs, the [[aggregates|aggregate]] that draws a consistency boundary around
the invariants that must hold atomically, the [[repositories|repository]] that fronts an aggregate
root with a collection-like illusion, and the [[domain-events|domain event]] an aggregate publishes
when something happens that experts care about. This is the topic the code/design round reaches
for: it turns "model these objects" into defensible answers about identity, transactional scope,
and where consistency is allowed to be eventual.

It is the counterpart of [[strategic-design]], which is about the relationships between models —
where a boundary goes and how boundaries integrate. Two provenance flags run through this topic
and are worth carrying so it does not read twenty years old: the domain event is a *post-2003*
addition, marked in Evans's 2015 *DDD Reference* as new since the 2004 book, so it is never one of
the original building blocks; and the sharp, memorable aggregate rules — small aggregates, one per
transaction, reference by identity, eventual consistency outside the boundary — are Vaughn Vernon's
codification in *Effective Aggregate Design* (2011), not Evans's own terser wording.
