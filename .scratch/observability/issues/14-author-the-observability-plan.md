# Author the observability Plan

Type: task
Status: resolved
Blocked by: 13

## Question

AFK, via `/author`. Write `content/plans/reading-order-for-observability.md` ordering the
**whole subject**, not only the new Lessons: golden-signals first, trace-context-across-retries
before the OpenTelemetry and sampling Lessons, the broker and hedging Lessons as side reads after
sampling, the seven new Lessons in prerequisite order, ending at the observability Cheat sheet.
Like every Plan, it says `prerequisites` is the only ordering claim and the note wins where they
disagree. Not `featured`. `npm run validate` passes.

## Answer

Written: `content/plans/reading-order-for-observability.md`, filed under `observability` and
`distributed-tracing`, not `featured`. It disclaims sequence in its opening (one path through
`prerequisites`, and the note wins where they disagree).

- **Order** (nine steps, every step's prerequisites earlier in the table): golden signals →
  trace-context-across-retries → structured logging → OpenTelemetry → metric instruments →
  percentiles → sampling → burn-rate drill → cost. Spine if short on time: 1 → 2 → 4 → 5 → 8.
- **Side reads after sampling**, not steps: the broker and hedged-attempts tracing Lessons, with
  [[hedging-against-tail-latency]] named as the hedged one's assumption.
- **Scope**: one `.NET` step (structured logging); the other eight are `Concept` with C# examples.
  The closing section explains the BCL-as-OTel-API point and gives an elsewhere table (log call,
  span, metric, zero-code instrumentation, Collector/OTLP).
- **Practice checkpoint**: there is no Problem yet (ruled out of scope on the map), so it is a spoken
  incident rehearsal after step 8 that names every join key.
- **Night before**: the observability Cheat sheet, with the distributed-tracing sheet beside it.

`npm run validate`: 0 errors. The one warning, `build-vs-buy`, was already there and is unrelated.
