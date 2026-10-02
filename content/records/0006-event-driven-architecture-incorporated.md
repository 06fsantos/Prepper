---
id: 01M3YND3SHB2N088W959BY5W87
title: Event-driven architecture incorporated from the research note
date: 2026-10-02
topic:
  - event-driven-architecture
  - distributed-systems
  - distributed-tracing
---

The `event-driven-architecture` spec in `.scratch/` is complete. The research note
[[what-does-an-event-driven-architecture-interview-probe-beyond-the-broker]] is drawn into the
Library, stays where it is, and is not to be re-imported. The run produced:

- a new Term, [[event-driven-architecture]], nested under `distributed-systems`;
- five new Lessons: [[out-of-order-events-and-business-invariants]],
  [[loss-duplicates-and-replay-safe-consumers]], [[evolving-event-schemas]],
  [[tracing-a-flow-through-a-message-broker]] and [[events-as-public-contracts]];
- edits to four existing Lessons, which gained the topic: [[message-queues]],
  [[azure-service-bus-and-event-driven-soa]], [[event-sourcing-and-cqrs]] and [[domain-events]].
  The Service Bus Lesson also gained the half of the outbox it was missing, the
  passive-aggressive command, and a general "when not to go event-driven";
- ten recall quizzes, one for each interview question, each in the Lesson that owns the answer;
- [[event-driven-architecture-cheat-sheet]] and [[reading-order-for-event-driven-architecture]],
  the vault's thirteenth Plan.

About half the subject was already in the vault, spread across five Lessons. The run tied it
together rather than re-teaching it.

**The source that prompted this was used only as a question map, and the research corrected it.**
A Medium teaser listed the ten questions with one-line "indicative" answers. It is cited nowhere,
and every claim goes back to the source that owns it. Where the teaser and its sources disagreed,
the sources won. Four corrections are worth recording, because each is a place where the
confident one-liner is the wrong answer in the room:

- **Orchestration is a legitimate choice, not drift.** Richardson presents choreography and
  orchestration as peers. The smell is the orchestrator nobody wrote down.
- **"Reject stale events" loses data for delta events.** It is safe only when the event carries
  state, where the latest version wins.
- **The outbox does not deliver exactly-once.** It turns loss into duplication, so it always ships
  with an idempotent consumer.
- **"Distributed monolith" is an unsourced label.** No spec or original author owns it. The
  Lessons argue from the mechanisms (Young, Fowler) instead.

Four sources stay **unverified**, and each Lesson says so where it leans on one:

- *DDIA* ch. 11 was not reachable, so Kleppmann is cited from the OLEP paper and his own blog.
- Greg Young's book was read through a summarising fetcher, so his wording is paraphrase unless it
  came through verbatim.
- The OpenTelemetry messaging conventions are **Development** status, so the guidance to link
  rather than parent can still change.
- W3C Trace Context has no Kafka binding (issue #504 is open), so `traceparent` in a Kafka header
  is OTel practice, not a standard.

**There is no dev evidence yet**, as with 0004 and 0005. This was authored from a research note
with no dev-facing session, so no quiz has been answered and nothing raises the floor. The next
signal has to come from the dev answering the ten recall quizzes aloud. The cheat sheet is built
for that, and the Plan's practice checkpoint asks for it. The next Record in this cluster should be
the first one written from that evidence.
