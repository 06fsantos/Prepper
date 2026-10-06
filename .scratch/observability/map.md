<!-- wayfinder:map -->

# Observability: a set of Lessons on the discipline, not the dashboards

## Destination

**New vault notes** on observability, authored via `/author` and passing `npm run validate`:
Lessons on the core subjects (structured logging, OpenTelemetry, metrics, and whatever the
research shows an interview probes), filed under a new top-level **`observability`** Term with
its Cheat sheet, quiz blocks in every Lesson, and a **`reading-order-for-observability`** Plan.
Vendors and backends (Grafana, Datadog, App Insights as a product) are not the subject.

**This effort carries into EXECUTION** (overriding "Plan, don't do"): authoring tickets write
real notes, not specs.

## Notes

- **Depth bar is interview fluency** (`content/MISSION.md`): enough to narrate the tradeoff in a
  design round and survive two follow-ups — plus one concrete code example per Lesson.
- **Tool line**: open standards and the OTel project are in scope (spec, OTLP, Collector,
  semantic conventions, W3C Trace Context); the Prometheus data model as a *concept* (pull vs
  push, counter/gauge/histogram), not as a product to operate; backends, vendors and UIs out.
- **Code is C# on the BCL APIs** — `ILogger`, `System.Diagnostics.Activity`, `Meter`, which are
  .NET's OTel API surface — with a short cross-language aside where the concept transfers.
  Serilog and other logging libraries are mentioned, not taught.
- **Topic shape**: `observability` is a **top-level** Term (sibling of `system-design`).
  `distributed-tracing` becomes a child of both `observability` and `http-and-resilience`.
  No child Terms: everything new files under `observability`, with one Cheat sheet.
- **Existing notes are linked, not rewritten**: [[metrics-logs-and-the-golden-signals]] and the
  three tracing Lessons stay; golden-signals is re-filed under `observability`. The tracing
  Lessons keep their App Insights framing (written for the Azure-flavoured Arch Re prep).
  A **correctness** fix to an existing note is allowed, as its own ticket.
- **Execution granularity**: one ticket per Lesson (one `/author` run each, parallelisable); the
  Cheat sheet, the Term's final body and the Plan come last, blocked on all of them.
- **Skills**: decision tickets call `grilling` + `domain-modeling`; authoring tickets call
  `author`; research tickets call `research`.

## Decisions so far

- [What does a senior interview probe on observability?](issues/01-what-does-an-observability-interview-probe.md): core = structured logs + trace-id correlation + no PII, instrument kinds + percentiles + no unbounded labels; depth = OTel API/SDK/Collector/OTLP/semconv, cardinality, histogram aggregation, head vs tail sampling, exemplars, cost, burn-rate alerts. Note at `content/research/what-does-a-senior-interview-probe-on-observability.md`.
- [Fix the Lesson list](issues/02-fix-the-lesson-list.md): seven Lessons under `observability` (structured logging, OpenTelemetry, metric instruments + cardinality, percentiles, sampling, burn-rate-to-log-line drill, cost), no child Terms, blocking follows `prerequisites`; capstone split into Cheat sheet + Term body, then the Plan.
- [Mint the observability Term and re-file existing notes](issues/03-mint-the-observability-term.md): `observability` Term exists, top-level, placeholder body; `distributed-tracing` and golden-signals now also file under it.

## Not yet specified

_Nothing: every patch graduated into tickets or was ruled out of scope._

## Out of scope

- Vendor and backend tooling (Grafana, Datadog, New Relic, App Insights as a product, Jaeger /
  Prometheus as things to operate) — ruled out by the destination.
- Revising the three existing tracing Lessons' App Insights framing — legitimate for the Azure
  prep they were written for.
- A system-design Problem ("instrument this checkout flow") — the burn-rate Lesson's walk-through
  already plays out the scenario; a Problem would be a separate `/import` effort.
