---
id: 01M3YMWCK0KD7QDK0QTH69EW6H
title: Event-driven architecture
topic:
  - distributed-systems
---

Services that coordinate by publishing facts to a broker and reacting to each other's, rather than
calling one another and waiting for an answer. Picking the broker is the easy part. What a senior
interview goes on to probe is what that choice costs: order holds within a partition and nowhere
else, delivery is at-least-once so loss, duplicates and replay are three separate problems, an
event's schema is a public contract with several consumer versions live at once, and a flow that
no single program spells out has to be traced and debugged across every service it touches.

The defensible stance is a set of trade-offs rather than a pattern: when *not* to use events,
where an invariant is enforced when events arrive out of order, what the outbox closes and what it
leaves to the consumer, and how to keep a web of events from coupling services into a distributed
monolith. The mechanisms underneath — [[message-queues]], [[domain-events]],
[[event-sourcing-and-cqrs]] — are taught on their own; this is the subject that ties them together.
