---
id: 01M3AF07N7CPBZMATN6TMGPR4N
title: Aggregates and the consistency boundary
topic:
  - tactical-design
prerequisites:
  - entities-and-value-objects
  - consistency-models
---

Inside a single domain model, some objects belong together so tightly that changing one
without the others would leave the model in a state the business calls impossible. An
**aggregate** is the pattern that names that cluster and draws a line around it: a group of
[[entities-and-value-objects|entities and value objects]] treated as **one unit for data
changes**, with a single entity — the **aggregate root** — as the *only* door external code
is allowed to knock on. The line it draws is a **consistency boundary**, and that is the
whole payload: the invariants inside the boundary are enforced **transactionally**, all at
once, so the aggregate is never seen half-changed. Everything an interviewer wants to hear
about aggregates falls out of that one idea, and this lesson's job is to make the boundary,
and the four rules that keep it small, something you can say under pressure.

## The root guards a boundary

Eric Evans states the pattern as a clustering-and-enforcement rule: "Cluster the entities and
value objects into aggregates and define boundaries around each. Choose one entity to be the
root of each aggregate, and allow external objects to hold references to the root only…
Define properties and invariants for the aggregate as a whole and give enforcement
responsibility to the root"
([Evans, *DDD Reference*, "Aggregates"](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)).
Two things are load-bearing there. First, **only the root is addressable** from outside:
references to interior members may be handed out for use inside a single operation, but no
outside object holds a lasting pointer to them, so the root can never be bypassed. Second,
**the root enforces the invariants** — the business rules that must always hold for the
cluster as a whole. Martin Fowler puts the payoff plainly: "Any references from outside the
aggregate should only go to the aggregate root. The root can thus ensure the integrity of the
aggregate as a whole"
([Fowler, *DDD_Aggregate*](https://martinfowler.com/bliki/DDD_Aggregate.html)).

The word to hold onto is **consistency boundary**. An `Order` with its `LineItem`s is the
canonical example: "the order total never exceeds the customer's credit limit" is an invariant
over the *whole* cluster, so adding a line item has to go through the `Order` root, which
checks the rule before it lets the change stand. The aggregate is exactly the scope inside
which such a rule is kept true at every commit. Vernon's sharpest framing is that this is a
**transactional** guarantee: "aggregate is synonymous with transactional consistency
boundary" — everything inside must be consistent when the transaction commits, and the
consistency of everything *outside* is, for that transaction, deliberately not this
aggregate's problem
([Vernon, *Effective Aggregate Design* Part I](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf)).

```quiz 01M3AF07N8J6VR0ETWNWA9DQKG
An aggregate boundary is best understood as a boundary of what?

- [x] Transactional consistency — the invariants inside it are enforced together, atomically, at every commit
  > Right. Vernon calls the aggregate "synonymous with transactional consistency boundary": you draw it around the rules that must hold atomically, and the root enforces them so the cluster is never committed half-changed.
- [ ] Object ownership — it collects every object the root created during its whole lifetime
  > Lifetime or creation ownership is not the criterion. The boundary is drawn around true invariants that must stay consistent together, not around whatever the root happened to make.
- [ ] Network deployment — it marks which objects must live inside one physical service
  > Deployment is a separate, later concern. An aggregate is a modelling boundary about consistency; it constrains transactions, not where code is hosted.
- [ ] Database tables — it maps one-to-one onto the rows a single table can store
  > Storage layout does not define it. One aggregate may span several tables and one table may hold several; the boundary is about which invariants commit together.
```

## Vernon's four rules

The definition tells you what an aggregate *is*; it does not tell you how big to make one, and
that is where beginners go wrong — they draw a huge object graph, call it an aggregate, and
inherit lock contention and slow loads. The **four rules** that most interviewers now expect
are Vaughn Vernon's codification in *Effective Aggregate Design* (2011). A note on provenance
worth keeping straight: these crisp rules are **Vernon's**, not Evans's wording. Evans's own
2003 framing is terser — "within an aggregate boundary, apply consistency rules synchronously;
across boundaries, handle updates asynchronously" — and Vernon quotes the blue book's line that
"any rule that spans aggregates will not be expected to be up-to-date at all times." Teach the
four rules, because they are what gets asked; just do not put Vernon's four-rule phrasing in
Evans's mouth.

**Rule 1 — keep aggregates small.** Prefer a boundary around only the invariants that truly
must hold together. A large cluster "limits performance and scalability" — more objects locked
per transaction, more loaded into memory, more garbage to collect — so the default is small,
and you grow the boundary only when a real invariant forces you to
([Vernon, EAD Part I](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf)).

**Rule 2 — one aggregate per transaction.** A well-designed transaction "modifies only one
aggregate instance." You may *read* several, but a single command should change exactly one.
Vernon calls it a rule of thumb rather than a law, but treats it as the goal in almost all
cases: if a use case seems to need two aggregates changed atomically, that is the signal your
boundaries are drawn wrong — or that the second change belongs in its own transaction, reached
by the fourth rule
([Vernon, EAD Part II](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_2.pdf)).

**Rule 3 — reference other aggregates by identity, not by object reference.** An aggregate
that needs another does not hold a pointer to it; it holds the other's **globally unique id**.
This is what keeps aggregates small: no neighbour is eagerly dragged into memory, the model
loads faster, and — because an id is just a value — associations can even cross a process
boundary. When you actually need the referenced aggregate, you look it up through its
[[repositories|repository]] *before* invoking behaviour, rather than navigating a live
reference graph.

```quiz 01M3AF07N805RNBRAA7MDRXK6B cloze
Vernon's first three aggregate rules: keep aggregates {{small}}, modify only {{one}} aggregate
instance per transaction, and reference other aggregates by their {{identity}} rather than by
holding a direct object reference.
```

**Rule 4 — update other aggregates with eventual consistency.** This is the rule the other
three set up, and the one that needs the most care. If executing a command on one aggregate
requires that *other* aggregates also change, you do **not** reach across the boundary and
change them in the same transaction — that would break rules 1 and 2 at once. Instead the
change propagates **asynchronously**: the aggregate publishes a [[domain-events|domain event]]
saying what happened, and subscribers update the other aggregates later, each in its own
transaction.

That "later" is precisely the subject of [[consistency-models]], and the reason it is a
prerequisite for this lesson rather than a passing mention. Choosing eventual consistency
across an aggregate boundary is the *same decision*, at the scale of one model, that a
distributed store makes about when a write becomes visible: you are trading immediate,
strongly-consistent agreement between the two aggregates for availability, smaller
transactions, and scalability — and, exactly as [[consistency-models]] argues, that is a
**deliberate choice on a spectrum, not a defect**. The senior move is to say so out loud and
then ask the domain expert the question Vernon poses: how stale is tolerable here — seconds,
minutes, hours, days? The answer tells you whether the boundary you drew is the right one.

```quiz 01M3AF07N86Z0ZPYPMZ8CWX4V1 recall
A single command must place an order *and* decrement warehouse stock, and `Order` and
`StockItem` are separate aggregates. Why not just change both in one transaction, and what do
you do instead?

> Changing both in one transaction breaks two of Vernon's rules at once: it modifies two
> aggregate instances in a single transaction (rule 2), and it forces the boundaries to be
> large enough to lock both together (rule 1), which is where contention and slow loads come
> from. Instead you change **one** aggregate transactionally — place the order — and have it
> **publish a [[domain-events|domain event]]** (`OrderPlaced`) that an asynchronous subscriber
> handles to decrement stock in its *own* later transaction. The two aggregates are then only
> **eventually consistent**, and per [[consistency-models]] that is a chosen trade — you accept
> a staleness window (which you size by asking the domain expert what delay is tolerable) in
> return for small aggregates, short transactions, and a model that scales and can distribute.
> If the business truly cannot tolerate any window — the two facts must be atomically true
> together — that is the signal they belong in *one* aggregate after all, and the boundary was
> drawn in the wrong place.
```

## What rests on the boundary

Two later patterns stand directly on the aggregate, and it is worth knowing where they plug in
even though neither is taught here. A [[repositories|repository]] exists **per aggregate root**
— it fetches and persists a whole aggregate as one unit, giving the illusion of an in-memory
collection of roots, which is the concrete answer to "how do I load the thing rule 3 told me
to reference by id?" And a [[domain-events|domain event]] is what an aggregate **publishes**
from inside its boundary to let the world — other aggregates, other [[bounded-context|bounded
contexts]] — react without being reached into synchronously, which is the mechanism rule 4
runs on. Draw the consistency boundary well and both of those have somewhere solid to attach;
draw it badly and no repository or event pattern will rescue a model that locks half the
database on every write.

The one primary source worth reading in full is Vernon's two-part
[*Effective Aggregate Design*](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf)
— [Part I](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf)
builds the consistency boundary and the "small aggregates" case, and
[Part II](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_2.pdf)
gives reference-by-identity and eventual consistency with worked examples. It is where the four
rules come from, and it reads them onto real code rather than slogans. For the surrounding
tactical vocabulary, see the [[tactical-design]] topic.
