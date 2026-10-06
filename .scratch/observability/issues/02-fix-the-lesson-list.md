# Fix the Lesson list

Type: grilling
Status: resolved
Blocked by: 01

## Question

Which Lessons does this effort write — title, one-paragraph scope, `prerequisites`, `topic` —
and do any subtopics (`opentelemetry`, `structured-logging`, `metrics`) earn a child Term and
Cheat sheet of their own, or does everything file under `observability`? Also: where the new
Lessons meet [[metrics-logs-and-the-golden-signals]] and the tracing Lessons without repeating
them. Resolving this graduates one authoring ticket per Lesson plus the capstone ticket.

## Comments

- 2026-10-06: unblocked. Input is the research note on `research/observability-interview-probes`
  (see the Answer on 01): its gap table is the candidate Lesson list. Decide also who fixes the
  golden-signals `Meter` example's `"ms"` → seconds (re-filing it under `observability` was 03;
  rewriting it is a separate call, since the map says existing notes are linked, not rewritten).

## Answer

Grilled with the dev, 2026-10-06.

- **Seven Lessons**, all under `observability`, one authoring ticket each (05–11). Each ticket
  carries the Lesson's scope, `topic`, `prerequisites` and a **do-not-re-teach** line naming the
  existing Lesson it links to rather than repeating:
  - Structured logging in .NET (prereqs: golden-signals, trace-context-across-retries)
  - OpenTelemetry: API, SDK, Collector, OTLP (trace-context-across-retries)
  - Metric instruments and cardinality (golden-signals, OpenTelemetry)
  - Why percentiles don't aggregate (Metric instruments)
  - Sampling traces: head, tail, and what you lose (OpenTelemetry, trace-context-across-retries;
    also filed under `distributed-tracing`)
  - From burn-rate alert to the log line (Structured logging, Percentiles, Sampling)
  - What telemetry costs (Structured logging, Metric instruments, Sampling): the cuttable one,
    kept because "we're drowning in telemetry" is a probe shape of its own.
- **No child Terms.** One Cheat sheet; a split would leave thin subtrees with redundant sheets.
- **The `"ms"` fix** is its own task ticket (12); correctness fixes to existing notes are allowed.
- **Blocking follows `prerequisites`**, because a missing `prerequisites` target is a validation
  error (a missing body link only warns).
- **Capstone is two tickets**: Cheat sheet + Term body (13, blocked on 04–12), then the Plan (14),
  which orders the whole subject, existing Lessons included.
- **The system-design Problem is out of scope**: the burn-rate Lesson's walk-through already
  plays out the scenario, and a Problem would be a separate `/import` effort.
