---
id: 01M3AEWMQPMDMYWMND8Y3GHBXN
title: Entities and value objects
topic:
  - tactical-design
---

The first modelling decision inside a single domain model is deceptively small: for each
concept, do you care that it is *the same one*, or only that it is *equal*? That single
question — **which equality does this thing need?** — sorts every object into one of two
kinds. A thing you must track as *the same one* over time, through changing attributes, is
an **entity**; a thing defined wholly *by its attributes*, interchangeable with any other
carrying the same values, is a **value object**. Eric Evans made this the opening move of
tactical modelling because getting it wrong quietly corrupts everything built on top —
including the [[aggregates]] whose boundary rests on it. This is the payload an interviewer
is listening for, and it fits in one sentence you can say under pressure.

## Identity is a thread through time

An **entity** is defined by a *continuous thread of identity* running through time and across
state changes, not by what it currently looks like. Evans: "When an object is distinguished by
its identity, rather than its attributes, make this primary to its definition in the model.
Keep the class definition simple and focused on life cycle continuity and identity"
([Evans, *DDD Reference*, "Entities"](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)).

The test is what happens to two of them with identical attributes. Two customers both named
"Jordan Lee," both at the same address, are still **two different customers** — because the
domain must be able to say *this one* placed the order and *that one* did not. The model, Evans
insists, "must define what it means to be the same thing." An entity therefore has a
**lifecycle**: it is created, it changes, it is archived, and through all of it the identity
holds even as every attribute turns over. Your name can change and your address can change and
you are still you; that persistence *is* the identity.

A common trap is to answer "identity" with "the database primary key." The surrogate key is a
mechanism, not the definition. Evans is explicit that an identifier "may come from the outside,
or… an arbitrary identifier created by and for the system, but it must correspond to the
identity distinctions in the model." The PK serves the identity; it does not supply it.

```quiz 01M3AEWMQQ2WNYW4NFQ6QT8G7F
Two `Customer` objects have identical names, addresses, and emails. Are they the same
customer?

- [x] Not necessarily — a customer is an entity, so identity is a separate thread from its attributes
  > Right: an entity is defined by continuity of identity, not by its current values. Two customers with matching attributes are still two customers, because the domain must track *the same one* over time even as its attributes change.
- [ ] Yes — objects with all attributes equal are by definition the same object
  > That is value-object equality, and a customer is not a value object. Attribute-for-attribute equality decides sameness only for a thing with no conceptual identity of its own.
- [ ] Yes, but only once they are saved and share a database primary key
  > The key is a mechanism that *serves* the identity, not what defines it. Identity is a modelling fact that holds before anything is persisted, and Evans warns against conflating the surrogate key with it.
- [ ] It cannot be decided without comparing their full change histories first
  > No comparison is needed: two separately created customers are two identities by construction, whatever their histories or current values happen to look like.
```

## A value object is nothing but its attributes

A **value object** has *no conceptual identity*. It describes or measures some characteristic,
and it is defined **wholly by its attributes** — so two value objects with the same attributes
are, for every purpose the domain cares about, the same value and freely interchangeable. Money,
a date range, a colour, an address-as-a-point-on-a-map: you do not ask *which* five-dollars this
is, only whether it *equals* five dollars.

Martin Fowler frames the whole entity/value split precisely here, as **equality**: "Objects
that are equal due to the value of their properties… are called value objects," as against
objects equal by identity — he calls this "the Evans Classification"
([Fowler, *ValueObject*](https://martinfowler.com/bliki/ValueObject.html)). That is the crisp
form of the question this lesson opened with. Entity: equal by identity. Value object: equal by
content.

```quiz 01M3AEWMQQYGCPCB0QM0KA422X cloze
Fowler frames the entity-versus-value-object split as a question of {{equality}}: an entity is
equal by its {{identity}}, while a value object is equal by its {{attributes}}.
```

## Make value objects immutable

Because a value object *is* its attributes, the standard advice is to make it **immutable**:
"if you need different values, you create a new object rather than modifying an existing one."
Evans says the same from the behaviour side — treat operations on a value object as
side-effect-free functions that do not depend on mutable state.

The interview-ready reason is **aliasing**. Fowler's canonical example is a mutable date shared
by two references: mutate it through one, and the other silently sees a value it never asked to
change. Because value objects are interchangeable, systems share and copy them freely, and a
mutable one turns that sharing into a source of spooky action at a distance. Immutability makes
them safe to share, safe to cache, and trivially safe to reason about. This is also where the
modern note lands: a value object maps naturally onto a **C# `record`** or a **Java `record`** —
value-based equality and immutability supplied by the language, which is exactly the pair a value
object wants (Fowler explicitly points to records as language support for the pattern). An
entity, by contrast, wants a stable identifier and mutable state, so a plain class fits it
better.

Identity, meanwhile, is not free: Evans warns that attaching it to everything "can hurt system
performance, add analytical work, and muddle the model by making all objects look the same." So
the default leans toward value objects — reach for an entity only when the domain genuinely must
track *the same thing* through time.

```quiz 01M3AEWMQQVEZ962RY8GT63QR4 recall
You are modelling a food-delivery domain. For each of `Order`, `Money`, and `DeliveryAddress`,
say whether it is an entity or a value object, and give the one-sentence reason.

> `Order` is an **entity**: the business must track *this specific order* through its lifecycle
> — placed, paid, dispatched, delivered — even as its contents and status change, so it needs an
> identity separate from its attributes. `Money` is a **value object**: $5 is $5, defined wholly
> by amount and currency, interchangeable and best made immutable; you never care *which* five
> dollars. `DeliveryAddress` is a **value object** in this domain: it is defined by its fields
> (street, city, postcode) and you only care whether two addresses are *equal*, not that it is
> *the same* address object — so it too is immutable, and a change of address means a new value,
> not a mutation. The deciding question each time is "which equality?": do I care that it is the
> same one, or only that it is equal?
```

## Why this comes first

The equality distinction is the ground floor of tactical modelling because the next pattern
stands directly on it. An [[aggregates|aggregate]] is a cluster of entities and value objects
with one **entity** chosen as its root — and "root" is an identity notion: external code holds a
reference to *that one thing* and reaches everything else through it. You cannot draw a
consistency boundary around a cluster until you can say which members are the same-thing-over-time
identities and which are interchangeable values. Sort the equality first, and the aggregate's
boundary, its [[repositories|repository]], and the [[domain-events|domain events]] it publishes
all have somewhere solid to rest.

The one primary source worth reading in full is
[Fowler's *ValueObject*](https://martinfowler.com/bliki/ValueObject.html): it is short, it names
the equality framing outright as "the Evans Classification," and it makes the immutability
argument with the aliasing example that makes it stick. For the entity side and the broader
tactical vocabulary, see the [[tactical-design]] topic.
