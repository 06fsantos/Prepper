# DDD tactical (building-block) design — research findings

Scope: the tactical building blocks — Entity vs Value Object, Aggregate + Aggregate Root, Repository, Domain Event, and the Anti-Corruption Layer as a tactical pattern. Factories, Specifications, and Modules are deliberately out of scope. Evans's *Domain-Driven Design* (2003/2004 "blue book," Part II) was not available on this machine; his primary wording here is read from the free **2015 DDD Reference** PDF (the Creative Commons pattern summaries Evans and Fowler released, which distil the same Part II patterns), corroborated by Fowler's bliki and Vernon's *Effective Aggregate Design* essays. Where a claim is newer than 2003 it is flagged.

---

## Entity vs Value Object

**Definition.**
- An **Entity** is an object defined by a *thread of identity and continuity* running through time and across representations, not by its attributes. Evans: "When an object is distinguished by its identity, rather than its attributes, make this primary to its definition in the model. Keep the class definition simple and focused on life cycle continuity and identity." Two entities with identical attributes are still distinct; "The model must define what it means to be the same thing." (aka Reference Objects) [Evans 2015 Reference, "Entities"]
- A **Value Object** has *no conceptual identity*; it describes or computes a characteristic of a thing. Evans: "When you care only about the attributes and logic of an element of the model, classify it as a value object… Treat the value object as immutable. Make all operations Side-effect-free Functions that don't depend on any mutable state. Don't give a value object any identity." [Evans 2015 Reference, "Value Objects"]
- Fowler frames the split as **equality**: "Objects that are equal due to the value of their properties… are called value objects" — equal by content, versus reference/entity objects that are equal by identity. He calls this "the Evans Classification." [Fowler, *ValueObject*]

**Tradeoff (interview-relevant).**
- The design lever is **which equality you need**. Give something an identity (make it an entity) only when the domain must track *the same thing over time* despite changing attributes; identity carries real cost — Evans notes attaching identity to everything "can hurt system performance, add analytical work, and muddle the model by making all objects look the same."
- **Value objects should be immutable**, and the interview reason is aliasing: Fowler's canonical example is a mutable date shared by two references, where mutating one silently corrupts the other. Immutability means "if you need different values, you create a new object rather than modifying an existing one," which also makes value objects safe to share and side-effect-free. Evans's "side-effect-free function" phrasing is the same point from the behaviour side.
- Common interview trap: identity-by-database-PK vs identity-by-domain. Evans is explicit that the identifier "may come from the outside, or… an arbitrary identifier created by and for the system, but it must correspond to the identity distinctions in the model" — the surrogate key is a mechanism, not the definition.

**Provenance.** Core to Evans 2003 Part II and essentially unchanged in the 2015 Reference. Fowler's *ValueObject* is a later (bliki) restatement that adds the crisp "equality by attributes" framing and the immutability/aliasing argument; Fowler credits Evans for the term and points to Vernon as "probably the best in-depth discussion of value objects from a DDD perspective." [Evans 2015 Reference; Fowler, *ValueObject*]

---

## Aggregate + Aggregate Root

**Definition.**
- An **Aggregate** is a cluster of associated entities and value objects treated as a single unit for data changes, with a boundary and a single **Aggregate Root** entity. Evans: "Cluster the entities and value objects into aggregates and define boundaries around each. Choose one entity to be the root of each aggregate, and allow external objects to hold references to the root only (references to internal members passed out for use within a single operation only). Define properties and invariants for the aggregate as a whole and give enforcement responsibility to the root." [Evans 2015 Reference, "Aggregates"]
- The root guards the boundary. Fowler: "Any references from outside the aggregate should only go to the aggregate root. The root can thus ensure the integrity of the aggregate as a whole." He adds that aggregates are the unit of storage transfer — "you request to load or save whole aggregates. Transactions should not cross aggregate boundaries." [Fowler, *DDD_Aggregate*]

**The consistency-boundary rules (Vernon's *Effective Aggregate Design*).**
- **Model true invariants in one consistency boundary.** "An invariant is a business rule that must always be consistent… Thus, aggregate is synonymous with transactional consistency boundary." Everything inside the boundary must be transactionally consistent when the transaction commits; consistency of everything outside is irrelevant to that aggregate. [Vernon, EAD Part I]
- **One aggregate per transaction.** "A properly designed bounded context modifies only one aggregate instance per transaction in all cases… Limiting the modification of one aggregate instance per transaction may sound overly strict. However, it is a rule of thumb and should be the goal in most cases." Referencing several aggregates in one request "does not give license to cause modification on two or more of them." [Vernon, EAD Part I & II]
- **Design small aggregates.** Large clusters "limit performance and scalability" (locking contention, memory, GC). Prefer small aggregates guarding only the true invariants. [Vernon, EAD Part I]
- **Reference other aggregates by identity, not by object reference.** "Prefer references to external aggregates only by their globally unique identity, not by holding a direct object reference (or 'pointer')." Benefits: aggregates stay small (no eager loading of neighbours), the model loads faster and uses less memory, and identity references "allow distributed domain models to have associations from afar." To navigate, look dependencies up via a repository/domain service in an application service *before* invoking aggregate behaviour, rather than holding a pointer. [Vernon, EAD Part II]
- **Eventual consistency outside the boundary.** "If executing a command on one aggregate instance requires that additional business rules execute on one or more other aggregates, use eventual consistency." Practically, an aggregate command method publishes a **domain event** delivered to asynchronous subscribers that update the other aggregates in their own transactions. [Vernon, EAD Part II]

**Tradeoff (interview-relevant).**
- The whole pattern is a **transactional/consistency-scope decision**, not an object-graph-modelling one: Vernon — "aggregates are chiefly about consistency boundaries and not driven by a desire to design object graphs." You draw the boundary around the invariants that *must* hold atomically; everything else is deliberately pushed out to eventual consistency.
- **Small aggregate + reference-by-id + eventual consistency vs large aggregate + immediate consistency.** Large aggregates buy you simple, immediate consistency across more objects at the cost of lock contention, load cost, and poor scalability/distribution; small aggregates scale and distribute well but force you to accept delay between aggregates and to reason about eventual-consistency windows (Vernon: ask domain experts what delay they tolerate — "seconds, minutes, hours, or even days").
- Classic interview answer: "how many aggregates does this transaction touch?" — the right answer is one; multiple-aggregate writes are the signal to introduce a domain event and eventual consistency.

**Provenance.** Aggregate/Aggregate Root and the transaction-boundary idea are Evans 2003 Part II — Vernon explicitly quotes the blue book (DDD p128): "Any rule that spans AGGREGATES will not be expected to be up-to-date at all times. Through event processing, batch processing, or other update mechanisms, other dependencies can be resolved within some specific time." Evans's original framing is present but terse (his Reference says "Within an aggregate boundary, apply consistency rules synchronously. Across boundaries, handle updates asynchronously"). The **sharp, memorable modern rules** — model true invariants / design small aggregates / reference by identity / one aggregate per transaction / eventual consistency outside the boundary — are **Vernon's** codification in *Effective Aggregate Design* (2011), the source most interviewers expect. Fowler's *DDD_Aggregate* is a compact later gloss. [Evans 2015 Reference; Vernon EAD I–II; Fowler, *DDD_Aggregate*]

---

## Repository

**Definition.** A Repository gives *collection-like access* to aggregate roots, hiding persistence behind a domain-facing interface. Evans: "For each type of aggregate that needs global access, create a service that can provide the illusion of an in-memory collection of all objects of that aggregate's root type… Provide methods to add and remove objects… Provide methods that select objects based on criteria meaningful to domain experts… Provide repositories only for aggregate roots that actually need direct access. Keep application logic focused on the model, delegating all object storage and access to the repositories." [Evans 2015 Reference, "Repositories"]

**Tradeoff (interview-relevant).**
- A repository **separates the domain model from persistence technology** — the client works in ubiquitous-language terms ("find the order for this customer") and "the actual storage and query technology" is encapsulated. The payoff is a domain layer that stays testable and free of ORM/SQL leakage; the cost is an abstraction that can become a leaky pass-through if it grows arbitrary query methods.
- **One repository per aggregate root, not per table/entity.** Evans is explicit: repositories exist "only for aggregate roots." Exposing a repository for an interior entity re-creates exactly the hazard Aggregate exists to prevent — Evans warns that unconstrained queries that "instantiate a few specific objects from the interior of an aggregate, blindsiding the aggregate root" make it "impossible for these objects to enforce the rules of the domain model," degrading entities into "mere data containers."
- Interview framing: Repository is *collection illusion*, not DAO-per-table. Confusing it with a generic DAO is a common tell. Distinguish from the strategic query escape hatch — Vernon notes that when repository/query overhead hurts view rendering, CQRS is the pressure-release valve, not more finder methods on the aggregate repository.

**Provenance.** Evans 2003 Part II; unchanged in the 2015 Reference. Vernon elaborates the aggregate-root-only discipline and its interaction with reference-by-identity (use a repository to resolve a referenced aggregate id before invoking behaviour). [Evans 2015 Reference; Vernon EAD II]

---

## Domain Event

**IMPORTANT — provenance flag:** Domain Event is **NOT in the 2003/2004 blue book.** In the 2015 DDD Reference it is explicitly marked with an asterisk, and the legend reads: **"* New term introduced since the 2004 book."** Evans added it (along with a few others such as Partnership and Big Ball of Mud) after publication. Any claim that Domain Events are one of the "original" Evans building blocks is wrong. [Evans 2015 Reference, "Domain Events *" and legend]

**Definition.** "Something happened that domain experts care about." Evans: "Model information about activity in the domain as a series of discrete events. Represent each event as a domain object… A domain event is a full-fledged part of the domain model, a representation of something that happened in the domain." Domain events "are ordinarily immutable, as they are a record of something in the past," and "typically contain a timestamp for the time the event occurred and the identity of entities involved in the event." Evans distinguishes them from *system events* (activity inside the software itself). [Evans 2015 Reference, "Domain Events"]

**Tradeoff (interview-relevant).**
- Domain events make **causes of state change explicit and first-class** instead of leaving them buried in procedural code or non-domain audit trails. Evans's motivation: an entity tracks its state but "if you need to know the actual causes of the state changes, this is typically not explicit"; audit trails and change histories lose the *meaning* of the change.
- They are the practical mechanism for the aggregate rules above: in a distributed/multi-aggregate system where "state… cannot be kept completely consistent at all times," events let you "keep the aggregates internally consistent… while making other changes asynchronously." Vernon operationalises this — an aggregate command method **publishes a domain event** consumed by asynchronous subscribers that update other aggregates in separate transactions (the concrete realisation of "one aggregate per transaction + eventual consistency").
- The tradeoff: events buy decoupling, auditability, and cross-aggregate/cross-context integration, at the cost of eventual-consistency reasoning, delivery/ordering concerns ("multiple updates arriving out of order"), and event-schema evolution. Evans notes an event's identity can be derived from its properties so duplicate deliveries "can be recognized as the same" — i.e. idempotency is a design concern.

**Provenance.** **Post-2003, added by Evans in the 2015 Reference** (flagged there as new since 2004). Vernon's *Implementing Domain-Driven Design* and the *Effective Aggregate Design* essays give the fuller treatment (publishing events from aggregates, event-driven eventual consistency, integration across bounded contexts). [Evans 2015 Reference; Vernon EAD II / *Implementing DDD*]

---

## Anti-Corruption Layer (as a tactical pattern)

**Definition.** An isolating **translation layer** a downstream context builds so it can consume a foreign/upstream/legacy system *in terms of its own model*, without letting the foreign model leak in. Evans: "As a downstream client, create an isolating layer to provide your system with functionality of the upstream system in terms of your own domain model. This layer talks to the other system through its existing interface, requiring little or no modification to the other system. Internally, the layer translates in one or both directions as necessary between the two models." [Evans 2015 Reference, "Anticorruption Layer"]

**Tradeoff (interview-relevant).**
- The ACL **protects model integrity** at a boundary. Evans's warning: "A large interface with an upstream system can eventually overwhelm the intent of the downstream model altogether, causing it to be modified to resemble the other system's model in an ad hoc fashion" — legacy models "are usually weak (if not big balls of mud)." The ACL is the defensive alternative to *Conformist* (just adopt the upstream model).
- Cost vs benefit: an ACL is real code to build and maintain (adapters, translators, its own tests) and adds latency/indirection; you pay it to keep a clean model insulated from a messy or volatile foreign one. Skip it (conform) when the upstream model is good and stable and control/communication are adequate; build it when integration is "very valuable or even required" but conforming would corrupt you.
- Interview framing: name the ACL as a **boundary/translation** pattern and distinguish it from a plain adapter — it translates *between two domain models*, not just two wire formats, and the translation direction can be one-way or two-way.

**Strategic-vs-tactical overlap (note explicitly).** In Evans's book the Anticorruption Layer lives in Part IV (Strategic Design), as one of the **context-mapping** relationship patterns between bounded contexts (alongside Conformist, Open-Host Service, Shared Kernel, Customer/Supplier). So it is primarily a *strategic/integration* pattern describing a relationship on a context map. It earns a place in a "tactical" discussion because it is realised *in code* as a concrete translation layer inside the downstream context — the implementation is tactical even though the decision to build one is a context-map decision. The 2015 Reference places it among the context-map patterns and immediately follows it with Open-host Service, confirming the strategic home. [Evans 2015 Reference, "Anticorruption Layer" / "Open-host Service"]

**Provenance.** Evans 2003 (Part IV, Strategic Design); unchanged in the 2015 Reference. Not a Vernon-originated rule, though Vernon (*Implementing DDD*) covers it at length as an integration pattern. [Evans 2015 Reference]

---

## Sources

- **Eric Evans, *Domain-Driven Design Reference* (2015-03, Creative Commons pattern summaries)** — https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf — primary Evans wording for Entities, Value Objects, Aggregates, Repositories, Domain Events, and Anticorruption Layer; the definitive provenance flag that Domain Events (and other starred terms) are "New term introduced since the 2004 book."
- **Vaughn Vernon, *Effective Aggregate Design* Part I — "Modeling a Single Aggregate"** — https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf — the "model true invariants in a consistency boundary," "aggregate = transactional consistency boundary," "one aggregate per transaction," and "design small aggregates" rules.
- **Vaughn Vernon, *Effective Aggregate Design* Part II — "Making Aggregates Work Together"** — https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_2.pdf — "reference other aggregates by identity" and "use eventual consistency outside the boundary" rules; the event-publishing mechanism for cross-aggregate updates; and Vernon's quote of Evans blue book p128 ("any rule that spans AGGREGATES will not be expected to be up-to-date at all times") anchoring eventual consistency to Evans's original framing.
- **Vaughn Vernon, *Effective Aggregate Design* (series landing / *Implementing DDD*)** — https://www.dddcommunity.org/library/vernon_2011/ — series index (Part III covers discovery); background for Vernon as the modern primary source on aggregate rules and domain events.
- **Martin Fowler, *ValueObject* (bliki)** — https://martinfowler.com/bliki/ValueObject.html — equality-by-attributes framing ("the Evans Classification"), the immutability/aliasing argument, and attribution to Evans/Vernon.
- **Martin Fowler, *DDD_Aggregate* (bliki)** — https://martinfowler.com/bliki/DDD_Aggregate.html — compact aggregate/aggregate-root definition, "references from outside only to the root," and "transactions should not cross aggregate boundaries."
