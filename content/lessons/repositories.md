---
id: 01M3AF4XE1CTRVQ279DMKD51D3
title: Repositories and the collection illusion
topic:
  - tactical-design
prerequisites:
  - aggregates
---

Once you have an [[aggregates|aggregate]], you have to get one back — load it to run a command,
save it when the command is done, find the one that matches some question a domain expert would
ask. A **repository** is the pattern that does that job without letting the machinery of
persistence — tables, SQL, an ORM session, a document store — leak up into the model. It gives
the domain layer the **illusion of an in-memory collection** holding every aggregate of one
type: you `add` to it, you `remove` from it, and you query it by identity or by
domain-meaningful criteria, exactly as if the whole set were sitting in a `List` in memory. The
storage mechanism lives behind that collection-shaped interface and never in front of it. This
lesson's job is to make two claims sayable under pressure: a repository is a **collection
illusion, not a table-level DAO**, and there is **one repository per aggregate root** — never
one per entity.

## The collection illusion

Eric Evans states the pattern as a deliberate fiction: "For each type of aggregate that needs
global access, create a service that can provide the illusion of an in-memory collection of all
objects of that aggregate's root type… Provide methods to add and remove objects… Provide
methods that select objects based on criteria meaningful to domain experts"
([Evans, *DDD Reference*, "Repositories"](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)).
The word doing the work is **illusion**. The client does not write a query; it asks a
collection a question in the ubiquitous language — "find the order for this customer" — and the
repository is responsible for turning that into whatever the actual store needs, "delegating all
object storage and access to the repositories" so that "application logic [stays] focused on the
model." The payoff is a domain layer that is testable in isolation and free of ORM or SQL
leakage; the standing risk is that a repository which grows an open-ended pile of arbitrary
finder methods stops being a collection and quietly becomes a leaky pass-through to the database
again.

```quiz 01M3AF4XE2QCB2PJC02CWH50H3
What illusion is a repository designed to give the domain model?

- [x] An in-memory collection of all aggregates of one type, that you add to, remove from, and query
  > Right. Evans's phrasing is "the illusion of an in-memory collection of all objects of that aggregate's root type," accessed in domain terms so the model never sees the storage mechanism.
- [ ] A live object graph of every table in the database, navigable by following any foreign key
  > That is the leakage a repository exists to prevent: unconstrained navigation into stored data hands out interior objects and bypasses the aggregate root.
- [ ] A cache that keeps the most recently used rows resident so reads avoid a round trip
  > Caching is an infrastructure concern that may sit behind a repository, but it is not what the pattern models — the illusion is a collection, not a fast tier.
- [ ] A transaction log of every change, replayed to reconstruct the current state on demand
  > That describes event sourcing, a separate persistence strategy. A repository presents a collection of current aggregates, however they happen to be stored.
```

## One per aggregate root, not per entity

The single most tested point about repositories is their **granularity**: you get a repository
**per aggregate root**, and for nothing else. Evans is explicit — "provide repositories only for
aggregate roots that actually need direct access." This falls straight out of what an
[[aggregates|aggregate]] is *for*. The aggregate draws a consistency boundary and makes the root
the only door external code may knock on, so that the root can enforce the cluster's invariants.
A repository that fetched an *interior* entity directly would hand the caller an object from
inside the boundary while "blindsiding the aggregate root," and Evans warns this makes it
"impossible for these objects to enforce the rules of the domain model," degrading real entities
into "mere data containers." So the repository is retrieved and persisted at the same grain the
aggregate is loaded and saved at: **the whole aggregate, through its root, as one unit.** An
`Order` aggregate has an `OrderRepository`; its `LineItem`s do not get a `LineItemRepository`,
because a line item is never fetched, changed, or saved on its own — it is reached through the
`Order` that owns it.

This is also the concrete answer to a question the aggregate rules leave open. The rule to
[[aggregates|reference other aggregates by identity]] rather than by holding a pointer means an
aggregate carries a neighbour's **id**, not the neighbour itself. When you actually need that
neighbour, you resolve the id through *its* repository — in an application service, before you
invoke behaviour — rather than navigating a live object graph. Repositories are what make
reference-by-identity a workable rule instead of a nuisance.

```quiz 01M3AF4XE2NPC8KPYZYF0JJJ1B cloze
A repository is provided per aggregate {{root}}, never per {{entity}}, because it loads and
saves the whole aggregate as one unit through the root; exposing one for an interior member
would let callers reach inside the {{consistency}} boundary and bypass the root's invariants.
```

## The domain names the interface; infrastructure implements it

The reason a repository can hide the store is **which side owns the contract**. The interface —
`OrderRepository`, with `add`, `remove`, and the finders domain experts would name — belongs to
the **domain layer**. The class that actually talks to Postgres, or to an ORM session, or to a
document database lives in the **infrastructure layer** and *implements* that interface. The
dependency therefore points inward: infrastructure depends on the domain's contract, and the
domain depends on nothing below it. That inversion is the whole trick. It is why the domain model
stays testable — a unit test hands it a fake or in-memory implementation of the same interface —
and why swapping the persistence technology touches the infrastructure class and not one line of
the model. The client "works in [ubiquitous-language] terms" while "the actual storage and query
technology" is encapsulated on the far side of the interface.

If you write .NET, this is the pattern that Entity Framework Core's `DbContext` and `DbSet<T>`
already embody: a `DbSet<T>` presents a type's rows as a queryable in-memory-looking collection
you `Add` to and `Remove` from, and `DbContext.SaveChanges` commits them as a unit of work. That
is a fair, interview-current way to place the concept — many teams treat a `DbContext` (or a thin
repository over it) as the repository for an aggregate — though it is worth knowing the live
debate that some argue an ORM's session *is already* a repository-and-unit-of-work, so wrapping it
in a second hand-written repository can be redundant. The DDD point survives either way: the
domain speaks to a collection-shaped, domain-named interface, and the persistence mechanism sits
behind it.

Two things a repository is deliberately **not**. It is not a **DAO per table** — confusing the
two is the common tell, because a DAO mirrors storage layout while a repository mirrors the model.
And it is not where you solve read-heavy reporting: when finder methods and query overhead start
to hurt view rendering, the pressure-release valve is a separate read model (CQRS), not an
ever-growing list of bespoke queries bolted onto the aggregate's repository. Fetching an aggregate
is one concern; **creating** one is another again — assembling a brand-new aggregate that satisfies
its invariants from the start is a separate responsibility from storing and retrieving existing
ones, and it is out of scope here.

```quiz 01M3AF4XE2K0ZV8GZ61QNC1VVF recall
Where does a repository's interface live, where does its implementation live, and what does that
split buy you?

> The **interface** belongs to the **domain layer** — it is named in the ubiquitous language
> (`OrderRepository` with `add`, `remove`, and domain-meaningful finders) and knows nothing about
> storage. The **implementation** lives in the **infrastructure layer** and is the class that
> actually talks to the database, ORM, or document store. The dependency is inverted: infrastructure
> depends on the domain's contract, and the domain depends on nothing beneath it. That buys two
> things — the domain model stays **testable in isolation**, because a test can supply a fake or
> in-memory implementation of the same interface, and the **persistence technology can be swapped**
> by changing the infrastructure class without touching the model. It is the same inversion that
> ORMs sit behind — for example EF Core's `DbContext`/`DbSet<T>` present persistence as a collection
> the model treats as in-memory — keeping SQL and mapping concerns out of the domain entirely.
```

## Where it sits in the tactical toolkit

A repository is one of the two patterns that stand directly on the [[aggregates|aggregate]]: it
is **how you fetch and store** one, the mirror of the [[domain-events|domain event]] that an
aggregate **publishes**. Get the aggregate boundary right and the repository has an obvious grain
to work at — one per root, the whole cluster in and out as a unit; get the boundary wrong and no
repository can rescue a model that loads half the database on every read. For the surrounding
tactical vocabulary — [[entities-and-value-objects|entities and value objects]], the aggregate
itself, and the events it emits — see the [[tactical-design]] topic.

The one primary source worth reading in full is Evans's own one-page summary of the pattern in
the free [*DDD Reference*](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
("Repositories"), read alongside Vaughn Vernon's
[*Effective Aggregate Design* Part II](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_2.pdf),
which shows the repository doing its real job — resolving an aggregate referenced by identity
before behaviour runs — inside worked code rather than as a slogan.
