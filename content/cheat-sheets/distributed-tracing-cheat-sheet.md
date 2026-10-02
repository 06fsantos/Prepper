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
- Application Insights renders this as `operation_Id` (the trace) and `operation_ParentId` (the
  span). Grouping by `operation_Id` finds every attempt.
- **Two ways to silently lose correlation**, both registration-order bugs:
  - Application Insights registered **after** the resilience handler — telemetry disappears
    entirely on `Microsoft.ApplicationInsights` ≤ 2.22.0.
  - `Grpc.Net.ClientFactory` ≤ 2.63.0 throws when a resilience handler is added; fixed in
    2.64.0.
  Check your own package versions; both are version-bounded (recorded 2026-08-27).
- **Hedging is the open case.** Neither Microsoft nor Polly documents whether concurrent
  attempts come out as siblings under the calling span or nested under the first. Do not guess —
  send one hedged call with telemetry on and read the dependency timeline.
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
