---
id: 01M3YN0DT0R5TX2CW093SCCWGW
title: Evolving event schemas
topic:
  - event-driven-architecture
prerequisites:
  - zero-downtime-schema-changes
---

An event's schema has the same problem a database schema has during a rolling deploy, with two
differences that make it harder. The readers are not two versions of one application. They are
every consumer of the event, each owned by a different team and deployed on its own schedule. And
the data does not stay in one shape for long. A log keeps events written by every producer version
there has ever been, for as long as the topic retains them, and a consumer that replays reads all
of them.

So the defensible answer has four parts. Pick a **compatibility mode** and let a schema registry
enforce it, because the mode is what decides **who deploys first**. Use the **transitive** variant
for an event many teams consume, because the log outlives the previous version. Make only
**additive, optional** changes. And when the *meaning* changes rather than the shape, publish a
**new event type**, upcasting old events on read and never rewriting them. This Lesson takes each
part in turn.

## The database parallel, and the step you lose

[[zero-downtime-schema-changes]] solves the database version of this with **expand, migrate,
contract**. Add the new structure beside the old, move the code and the data across, then remove
the old structure once nothing needs it. At every moment the schema works for both live versions.

Events need the same property: at every moment, every live producer and every live consumer can
read what the others write. Expand still exists, as an additive change. Contract still exists, as
retiring an old field or event type once no consumer reads it. What changes is the middle step.
A database migration **backfills** the old rows into the new shape, and after that nobody reads
the old shape again. A log cannot be backfilled. Its events are immutable records of what
happened, the point [[domain-events]] makes, so the old shape stays in the log for as long as the
log does. The migrate step becomes a conversion done **on read**, every time an old event is read,
for as long as old events exist. That one difference is behind most of what follows.

## Backward or forward decides who deploys first

Confluent's [Schema Registry documentation](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
gives the vocabulary interviewers expect. Each mode is a rule the registry checks when a new
schema version is registered under a subject:

| Mode       | What the registry checks                                             | Upgrade first          |
| ---------- | -------------------------------------------------------------------- | ---------------------- |
| `BACKWARD` | "consumers using new schema can read data written with old schema"   | consumers              |
| `FORWARD`  | "consumers using old schema can read data written with new schema"   | producers              |
| `FULL`     | both                                                                 | either, independently  |

The upgrade order follows from the definition, and it is the part to say out loud. Under
`BACKWARD`, a new consumer can read old data, but nothing promises an old consumer can read new
data. So the docs say "Upgrade consumers before producers": once every consumer is on the new
schema, the producer can start writing it. `FORWARD` is the mirror. Old consumers can read new
data, so the producer goes first and consumers catch up when they can. `FULL` holds both ways,
and the docs' instruction is "Upgrade independently". The default mode is `BACKWARD`.

That is the same reasoning as the database case, where the expand step ships before the code that
needs it. The schema change and the deploy order are one decision, not two.

```quiz 01M3YN0DT2NVTR1Q4ZNN9MQ6JM
The `OrderPlaced` subject is registered in `BACKWARD` mode. A new version of its schema has just
passed the registry's check. Six consumer teams and one producer team now have to deploy. In what
order is that safe?

- [x] Every consumer upgrades first, and the producer after them
  > `BACKWARD` guarantees that a reader on the new schema can read data written with the old one.
    Consumers that upgrade first can read everything still being produced. Only once all of them
    have moved can the producer start writing the new shape.
- [ ] The producer upgrades first, and every consumer after it
  > That is the order for `FORWARD`, where old readers can read new data. `BACKWARD` makes no such
    promise, so a consumer still on the old schema may fail on the first new event.
- [ ] Each team upgrades whenever it likes, in any order at all
  > Only `FULL` (compatible in both directions) allows independent upgrades. `BACKWARD` checks one
    direction, so the order is not free.
- [ ] All seven teams upgrade together, in one coordinated release
  > That is a lockstep release, the thing a compatibility mode exists to avoid. Seven teams on
    seven schedules will not land a release at the same moment, and rolling one back breaks the rest.
```

## Transitive, because the log outlives the last version

Each mode has a `_TRANSITIVE` variant. The plain modes check a new schema against the **previous**
version only. The transitive modes check it against **every earlier** version.

For a request and its response, the previous version is often enough. For a log it is not,
because a consumer that replays a topic, or one that falls weeks behind, reads events written
under versions much older than the last one. Two changes that are each compatible with the
version before them can still add up to one that is not:

- **v2** drops an optional `discount` field. Removing an optional field passes every mode.
- **v3** adds `discount` back as an optional field, but as a string. Compared with v2, which has
  no `discount` at all, this is just a new optional field, and it passes too.
- A v3 consumer replaying the topic reaches a v1 event, which carries `discount` as a number, and
  fails to read it.

`BACKWARD` accepted both steps. `BACKWARD_TRANSITIVE` would have rejected v3, because it checks v3
against v1 as well. For an event that many teams consume from a long-retained log,
**`FULL_TRANSITIVE`** is the defensible choice: any consumer can read any event ever written, and
nobody has to coordinate a deploy order. It is also the most restrictive mode, which is the point.
A widely consumed event *should* be hard to change.

```quiz 01M3YN0DT252520KPFW2CJKX1J cloze
In Confluent's terms, `BACKWARD` means a consumer on the {{new}} schema can read data written with
the {{old}} one, so {{consumers}} upgrade first. The plain modes check a new version only against
the {{previous}} one; the `_TRANSITIVE` variants check it against {{every earlier version}}, which
is what a long-retained log needs.
```

## Additive and optional is the only change that is free

The same documentation states which field changes each mode allows, and they make sense once you
picture the reader:

- **Adding or removing an optional field** is allowed under all three modes. A reader that expects
  the field and does not find it uses the default. A reader that finds a field it does not know
  ignores it.
- **Adding a required field** is forward-compatible only. An old reader ignores the new field, so
  `FORWARD` holds. A new reader given an old event has no value and no default, so `BACKWARD`
  fails.
- **Removing a required field** is backward-compatible only. A new reader ignores the field old
  events still carry, but an old reader given a new event is missing something it requires.

So the only changes that pass `FULL` are additive and optional. This is the event version of the
rule in [[api-design#Versioning keeps the contract stable while it changes|API versioning]]: a new
optional field needs no new version, and removing, renaming, or changing the meaning of something
does. A rename in particular is a remove plus an add, so a reader on either side of it loses the
value.

## A change of meaning is a new event

A registry checks **shape**. It cannot check **meaning**, and the hardest schema changes are the
ones where the shape stays compatible and the meaning moves.

Greg Young's free chapters on event versioning give the rule. In
[Basic type based versioning](https://leanpub.com/read/esversioning/leanpub-auto-basic-type-based-versioning):
"A new version of an event must be convertible from the old version of the event. If not, it is
not a new version of the event but rather a new event." The test is whether you can write the
conversion. If v2 can be computed from v1, it is a new version of the same event. If it cannot,
because v2 records a fact that v1 never captured, then it is a different event and needs a new
type.

Here is an example. An `AddressChanged` event has been published both when a customer moves and
when support fixes a typo. The business now needs to tell the two apart, because a move changes
the tax region and a typo fix does not. There is no way to convert an old `AddressChanged` into
"moved" or "corrected", because the old event never recorded which one it was. So this is not v2
of `AddressChanged`. It is two new events, `CustomerRelocated` and `AddressCorrected`, and
consumers keep handling the old `AddressChanged` events already in the log as what they are.

Moving consumers onto the new types is
[parallel change](https://martinfowler.com/bliki/ParallelChange.html) again. For a while the producer has to
serve both the consumers that know the new types and the ones that do not. The old type is
retired, which is the contract step, only once no consumer depends on it. The events already in
the log keep their old type.

Young also describes an alternative to explicit versions, in
[Weak schema](https://leanpub.com/read/esversioning/leanpub-auto-weak-schema). In paraphrase:
fields are matched by name, so a field present in both the data and the type takes its value, a
field only in the data is ignored, and a field only on the type gets a default. It is the same
"optional, ignore what you don't know" behaviour as the registry rules above, and it has the same
cost, in his words: "you are no longer allowed to rename something".

At the envelope level, [CloudEvents](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
has a `dataschema` attribute that identifies the schema the payload follows, and it expects a
different URI when the schema changes incompatibly. That is a way to tell a consumer, before it
parses anything, that the shape is not the one it knows.

```quiz 01M3YN0DT2XBFBM72M26SSWF3X
`AddressChanged` has been published for years for both house moves and typo fixes. The business
now needs to treat the two differently, because only a move changes the customer's tax region.
What is the right change?

- [x] Add two new event types, and keep handling old `AddressChanged` as it is
  > The old events never recorded which kind of change they were, so no conversion exists. By
    Young's rule that makes these new events, not new versions. History stays as it was written.
- [ ] Add an optional `reason` field to `AddressChanged` for new events to set
  > This passes every compatibility mode, and that is the trap. Old consumers ignore `reason` and
    go on treating every correction as a move. The meaning changed and the registry could not see it.
- [ ] Rewrite the stored `AddressChanged` events into the two new event types
  > Even if you were willing to rewrite history, you could not do this one: nothing in an old event
    says which type it should become. And an edited log is no longer a record of what happened.
- [ ] Publish `AddressChanged` v2 and upcast every old event into it on read
  > An upcaster is a conversion, and there is no conversion here, because the information is not in
    the old event. Young's rule applies: if it is not convertible, it is a new event.
```

## Upcast on read, never rewrite

When a new version *is* convertible, the old events still have to be read. The answer is to
convert them as they are read, not to change what is stored. Young describes upcasting as passing
old events "through some converters that move it forward in terms of version", so the domain code
only ever sees the latest version. Each converter is small, takes one version to the next, and runs
every time an old event is read. This is the migrate step from the database case, moved from a
one-off backfill to a function on the read path. The
[[event-sourcing-and-cqrs#The bill: eventual consistency, querying, and versioning|event sourcing bill]]
lists upcasters for the same reason.

Why not just rewrite the stored events into the new shape once, the way a database backfill does?
Because the stored events are a record of what was actually said, and other things were built on
them. Young's chapter
[Why can't I update an event?](https://leanpub.com/read/esversioning/leanpub-auto-why-cant-i-update-an-event)
puts the cost bluntly: allowing one edit makes your data "definitely maybe immutable. Also known as
mutable". His example is in paraphrase: edit a username event after the welcome email has gone
out, and a projection rebuilt from the log no longer matches what the customer received. Rewriting
also has nowhere to stop in an event-driven system. Every consumer that already read the old event
acted on it, and many of them keep their own copy. Replaying a log safely has its own rules, such as
applying the logic that was in force when the event happened, and those are
[[loss-duplicates-and-replay-safe-consumers]].

> Young's book is quoted here from its free chapters on Leanpub, which were read through a
> summarising tool. The quotations are the passages that came through word for word, and
> everything else attributed to him is paraphrase. Check the wording against the chapter before
> quoting him in turn.

```quiz 01M3YN0DT23CN0YSRP2HX6E9WC recall
An interviewer asks: "Your `OrderPlaced` event is consumed by six teams who deploy on their own
schedules, and the topic keeps events for years. How do you evolve its schema without breaking
anyone?"

> I'd register the schema and let the registry enforce a compatibility mode, because the mode
> decides who deploys first. Under `BACKWARD`, new readers can read old data, so consumers upgrade
> before the producer. Under `FORWARD` it is the other way round. Under `FULL` nobody has to
> coordinate. For an event six teams consume I'd choose `FULL_TRANSITIVE`. The plain modes check
> only against the previous version, and that is not enough when a consumer replaying the topic can
> reach events from any version ever written. In practice that means additive, optional changes
> only: a new field with a default. A required field or a rename breaks one side. If the meaning
> changes rather than the shape, so that an old event cannot be converted to the new one, it is not
> a new version but a new event type, and old consumers keep the old type until it is retired. Old
> events that can be converted are upcast on read, never rewritten in the log, because the log is a
> record of what happened and other teams have already acted on it. It is expand and contract, as
> for a database schema, except that the migrate step can never be a backfill. It has to be a
> conversion done on every read. The trap is treating all of this as one idea called "compatible".
> The precise points are that backward versus forward sets the deploy order, and that
> non-transitive checks are too weak for a long-lived log.
```

## What to take away

An event's schema is read by every consumer, each on its own deploy schedule, and by any replay of
a log that keeps every version ever written. A **compatibility mode** in a schema registry turns
that into a rule the registry can check. **`BACKWARD` means consumers deploy first, `FORWARD` means
producers deploy first, and `FULL` means neither has to wait.** Use the **transitive** variant
where the log is long-lived, because the plain modes only check against the previous version.
Make **additive, optional** changes. Treat a change of **meaning**, one you cannot write a
conversion for, as a **new event type**, because the registry checks shape and cannot see meaning.
And convert old events **on read** rather than rewriting the log. It is expand and contract, with
the migrate step turned into a conversion that never finishes. That an event is a public contract
in the first place, owned by one domain and reviewed like an API, is
[[events-as-public-contracts]].

Worth reading in full: Confluent's page on
[schema evolution and compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html).
It has the full compatibility table, what each mode allows field by field, and the upgrade order
for each mode.
