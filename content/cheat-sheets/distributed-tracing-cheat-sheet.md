---
id: 01M1943TDYSQT5DXH1SJZCGJT7
title: Distributed tracing — cheat sheet
topic: distributed-tracing
---

- **The trace id belongs to the logical request; the span id belongs to the attempt.** Every
  other rule here follows from that one sentence.
- So a **retrying client produces one trace with several spans**, never several traces.
- `traceparent` is one header, four hyphen-separated fields:
  `version-traceid-parentid-flags` — e.g. `00-<16 bytes>-<8 bytes>-01`.
  - **trace-id** is constant across the whole chain, however many services and attempts.
  - **parent-id** is the caller's span id, which is what makes the callee's spans your children.
  - **flags**: `01` means sampled.
- In OTel terms a **span** carries a trace id, its own span id and its parent's span id; the
  root span has no parent. Every backend shows the same three ids under its own names
  (Application Insights: `operation_Id` for the trace, `operation_ParentId` for the parent).
  **Group by trace id** to find every attempt.
- **Registration order can lose correlation silently**: wire the tracing instrumentation in
  after the HTTP pipeline it should observe and the outbound spans can simply stop arriving —
  no exception, no warning, a hole in the trace found mid-incident. Instance: Application Insights registered **after** the
  resilience handler drops the telemetry on `Microsoft.ApplicationInsights` ≤ 2.22.0 (recorded
  2026-08-27; check your version). Wire instrumentation first.
- **Hedging is the open case.** Neither Microsoft nor Polly documents whether concurrent
  attempts come out as siblings under the calling span or nested under the first. Do not guess —
  send one hedged call with tracing on and read the span tree.
- **Through a broker, the context rides on the message and consumers link, not parent.** A
  producer attaches a creation context to each message's headers; the consumer's Process span
  **links** to it, because a batch has many producers and a span has one parent. Carry a
  business **correlation id** beside it, since traces are sampled and expire. Caveats: the OTel
  messaging conventions are Development status, and `traceparent` in a Kafka header is OTel
  practice, not a W3C standard (no Kafka binding; issue #504 is open).

The header can say *who called whom*. It cannot say *these two calls are the same attempt,
raced* — that is a modelling gap, not a violation of the standard.

Full treatment: [[trace-context-across-retries]], [[tracing-hedged-attempts]] for what is still
unresolved, and [[tracing-a-flow-through-a-message-broker]] for event-driven flows.
