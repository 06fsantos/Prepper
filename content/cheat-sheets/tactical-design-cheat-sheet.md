---
id: 01M3AFXYZX5QFGM7E3HBN588BW
title: Tactical design — cheat sheet
topic: tactical-design
---

**Tactical DDD is the objects inside one boundary, not the boundaries themselves.** It is the
code/design round's vocabulary: how a single model is built once strategic design has drawn the line.

**Entity vs value object — the one question: which equality do you need?** An **entity** is equal by
**identity** — a thread of continuity through time; two entities with identical attributes are still
distinct, and the domain tracks *the same thing* as its attributes change. A **value object** is equal
by its **attributes** — no identity, it just describes a characteristic ("this money", "this date
range"). Fowler calls the split "the Evans Classification".

- Reach for an entity only when the domain must track one thing over time — identity carries real cost
  (performance, analysis, every object starts to look the same). Everything else is a value object.
- **Value objects should be immutable.** The reason to say out loud is *aliasing*: a mutable value
  shared by two references means mutating one silently corrupts the other. Need a different value → make
  a new object. (Same point from the behaviour side: side-effect-free.)
- Trap: identity-by-database-PK. The surrogate key is a mechanism; identity is a *domain* distinction.

Full treatment: [[entities-and-value-objects]].

**The four aggregate rules (Vernon, *Effective Aggregate Design*, 2011).** An aggregate is a cluster
with a single **root**; outside references point to the root only, which enforces the invariants. It is
a **transactional consistency boundary** — a consistency-scope decision, not object-graph modelling.

1. **Design them small** — big aggregates mean lock contention, load cost, poor scaling.
2. **One aggregate per transaction** — modifying two in one transaction is the signal to use a domain
   event instead. "How many aggregates does this write touch?" → one.
3. **Reference other aggregates by identity**, not by object pointer — keeps them small, loads fast,
   works across a distributed model. Resolve the id via a repository before invoking behaviour.
4. **Eventual consistency outside the boundary** — inside is atomic; across boundaries, publish an
   event and let subscribers catch up in their own transactions. (Needs [[consistency-models]].)

The rules are **Vernon's** sharp codification — Evans's original is terser ("apply consistency rules
synchronously within a boundary, asynchronously across"). Full treatment: [[aggregates]].

**Repository = the collection illusion for one aggregate root.** It fronts persistence with a
domain-facing interface — "find the order for this customer" — so the domain layer stays free of
ORM/SQL leakage and testable.

- **One per aggregate root, not per table/entity.** A repository for an interior entity blindsides the
  root and re-creates the hazard aggregates exist to prevent.
- It is a *collection illusion*, not a DAO-per-table — confusing the two is the common tell. When
  finder methods proliferate for views, the pressure-release valve is CQRS, not more finders.

Full treatment: [[repositories]].

**Domain event = "something happened that domain experts care about"** *(post-2003 — Evans added it in
the 2015 Reference; **not** an original blue-book building block, so don't list it among the
originals).* Named in the **past tense**, **immutable** (a record of the past, usually with a timestamp
and the entities involved), and **published from an aggregate**.

- It makes the *cause* of a state change first-class instead of buried in procedural code or a
  meaning-less audit trail.
- It is the mechanism behind rule 2 + rule 4: an aggregate's command method publishes an event,
  async subscribers update other aggregates. Buys decoupling and auditability; costs
  eventual-consistency reasoning, ordering, idempotency, and schema evolution.

Full treatment: [[domain-events]].

The reach-for-it signal: any question about *how one model is built inside a boundary* — what is an
entity vs a value, what holds an invariant, how it is fetched, what it publishes.
