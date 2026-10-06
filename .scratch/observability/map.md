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
- [De-vendor the distributed-tracing cheat sheet](issues/04-de-vendor-the-tracing-cheat-sheet.md): sheet restated in OTel terms (trace/span/parent span id); App Insights kept only as a named instance; the two registration bugs became one silent-loss hazard; the gRPC throw dropped to the Lesson.
- [Fix the `new HttpClient()` tracing claim](issues/15-fix-the-new-httpclient-tracing-claim.md): wrong claim removed from trace-context-across-retries; any `HttpClient` correlates via `SocketsHttpHandler`, so the factory's case is pooling, not tracing.
- [Author: Structured logging in .NET](issues/05-author-structured-logging-in-dotnet.md): Lesson written (templates, `[LoggerMessage]`, level policy, trace id via the host's default `ActivityTrackingOptions` in scopes, correlation id via `BeginScope`, OWASP never-log list + redaction, CWE-117, canonical log line, alert on metrics); validates clean.
- [Author: OpenTelemetry: API, SDK, Collector, OTLP](issues/06-author-opentelemetry-api-sdk-collector-otlp.md): Lesson written (API/SDK split with libraries on the API only, the BCL as .NET's API, baggage's leak risk, resource vs attribute, semconv `http.route`, BCL-only class + `Program.cs` wiring with `UseOtlpExporter`, OTLP 4317/4318, Collector pipelines and agent vs gateway); validates clean.
- [Author: Metric instruments and cardinality](issues/07-author-metric-instruments-and-cardinality.md): Lesson written (two-question instrument choice and additivity, series = product of labels × buckets, no user id, 2000 limit and silent `otel.metric.overflow`, `CardinalityLimit` view, `IMeterFactory` class with Counter/UpDownCounter/observable UpDownCounter/observable Gauge, pull vs push and Pushgateway, cumulative vs delta); validates clean.
- [Author: Why percentiles don't aggregate](issues/08-author-why-percentiles-dont-aggregate.md): Lesson written (two-pod worked example: average and weighted average of p99s both wrong, max only an upper bound; summary vs histogram and merge-then-compute; bucket as error bar and an edge on the SLO; seconds vs the ms-shaped default buckets, `InstrumentAdvice` vs View; exponential histograms); validates clean.
- [Author: Sampling traces: head, tail, and what you lose](issues/09-author-sampling-traces-head-tail-and-what-you-lose.md): Lesson written (sampled = kept; head by trace id + parent-based flag, SDK default keeps 100%; re-decide at the public edge; unsampled .NET root keeps its trace id so logs point at missing traces; tail = one Collector per trace via `load_balancing` `traceID`, buffer and early drops, saves backend not egress; adjusted count worked table, SLIs from metrics); distributed-tracing sheet gained a sampling bullet; validates clean.
- [Author: From burn-rate alert to the log line](issues/10-author-from-burn-rate-alert-to-the-log-line.md): Lesson written (burn rate as error rate ÷ budget rate, 14.4 = 2% of a 30-day budget per hour; workbook's multiwindow table and reset time; worked detection time; walk-through table naming the join key per step, logs surviving an unsampled trace; .NET exemplars `AlwaysOff` by default and `SetExemplarFilter(TraceBased)`; ASP.NET Core records duration inside the request span; what hides the cause); validates clean.
- [Author: What telemetry costs](issues/11-author-what-telemetry-costs.md): Lesson written (one meter per signal with its lever and what the lever costs; recording rules and downsampling *add* storage and cut cost only once raw retention is cut; log volume worked table, Information sampled and Error/audit never, canonical line's level follows outcome; .NET trace-based log sampler drops Errors from unsampled traces; head = egress, tail = backend; Collector filter processor; retention as practice); validates clean.
- [Fix the golden-signals duration unit](issues/12-fix-the-golden-signals-duration-unit.md): example now records `http.server.request.duration` in seconds as a `double` with the semconv HTTP boundaries as `InstrumentAdvice`, one clause linking [[why-percentiles-dont-aggregate]]; the `outcome` tag and `request.count` left as teaching devices; validates clean.
- [Author the observability Cheat sheet and Term body](issues/13-author-the-observability-cheat-sheet-and-term-body.md): sheet written in eight blocks (shape, OTel, logs, metrics, percentiles, sampling, alert-to-cause with the burn-rate table and join keys, cost), carrying the exemplar `AlwaysOff`, rollups-add-storage and trace-based-log-sampler traps; trace-context mechanics left to the tracing sheet; Term body final; validates clean.
- [Author the observability Plan](issues/14-author-the-observability-plan.md): `reading-order-for-observability` written over nine steps (golden signals → trace context → logs → OTel → instruments → percentiles → sampling → burn-rate drill → cost), with the broker and hedging tracing Lessons as side reads after sampling. One `.NET` step, an elsewhere table, a spoken incident rehearsal in place of a Problem, ends at the Cheat sheet. Not featured; validates clean.

## Not yet specified

_Nothing: every patch graduated into tickets or was ruled out of scope._

## Out of scope

- Vendor and backend tooling (Grafana, Datadog, New Relic, App Insights as a product, Jaeger /
  Prometheus as things to operate) — ruled out by the destination.
- Revising the three existing tracing Lessons' App Insights framing — legitimate for the Azure
  prep they were written for.
- A system-design Problem ("instrument this checkout flow") — the burn-rate Lesson's walk-through
  already plays out the scenario; a Problem would be a separate `/import` effort.
