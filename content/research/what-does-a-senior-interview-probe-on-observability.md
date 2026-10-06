---
id: 01M48MPBXPTV8JX66PM8K51N7V
title: What does a senior interview probe on observability?
date: 2026-10-06
topic:
  - distributed-tracing
sources:
  - https://opentelemetry.io/docs/specs/otel/overview/
  - https://opentelemetry.io/docs/concepts/signals/traces/
  - https://opentelemetry.io/docs/concepts/signals/baggage/
  - https://opentelemetry.io/docs/concepts/context-propagation/
  - https://opentelemetry.io/docs/concepts/resources/
  - https://opentelemetry.io/docs/concepts/semantic-conventions/
  - https://opentelemetry.io/docs/concepts/sampling/
  - https://opentelemetry.io/docs/collector/
  - https://opentelemetry.io/docs/specs/otlp/
  - https://opentelemetry.io/docs/specs/otel/logs/
  - https://opentelemetry.io/docs/specs/otel/logs/data-model/
  - https://opentelemetry.io/docs/specs/otel/metrics/api/
  - https://opentelemetry.io/docs/specs/otel/metrics/sdk/
  - https://opentelemetry.io/docs/specs/otel/metrics/data-model/
  - https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/
  - https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
  - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
  - https://www.w3.org/TR/trace-context/
  - https://sre.google/sre-book/monitoring-distributed-systems/
  - https://sre.google/workbook/monitoring/
  - https://sre.google/workbook/alerting-on-slos/
  - https://prometheus.io/docs/practices/histograms/
  - https://prometheus.io/docs/practices/naming/
  - https://prometheus.io/docs/practices/pushing/
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - https://stripe.com/blog/canonical-log-lines
  - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel
  - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts
  - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
  - https://learn.microsoft.com/en-us/dotnet/core/extensions/logger-message-generator
  - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.activitytrackingoptions
---

This is a Workshop note: it exists so that authoring has somewhere to put an
investigation, and the reader never sees it.

## The question

What do senior software-engineering interviews -- system-design rounds chiefly, plus the "how
would you debug this in production?" follow-up -- ask about observability, and which concepts
separate a fluent answer from a vague one?

**Method and its limit.** No primary source publishes "the observability questions interviewers
ask". What *is* primary is the material a fluent answer is built from: the OpenTelemetry (OTel)
specification and docs, W3C Trace Context, Google's SRE book and workbook, the Prometheus
practices pages, OWASP, and Microsoft Learn for .NET. The **core vs depth** classification
below is therefore a judgement, made by one test: *is this something a design round cannot
avoid once a box is drawn* (core), or *something only a candidate who has operated a system at
volume would bring up unprompted* (depth)? Treat the classification as editorial; treat every
factual claim as owned by the source cited next to it.

## The shape of the probe

A design round reaches observability in one of three ways, and each has a fluent and a vague
answer.

1. **"How do you know it's healthy?"** -- after the last box. Vague: "add logging and
   monitoring, maybe Datadog." Fluent: golden signals as SLIs, an SLO on them, alert on symptoms
   (already covered -- see the gap table).
2. **"p99 latency doubled at 14:02 -- walk me through it."** -- the production-debug follow-up.
   Vague: "check the logs." Fluent: metric localises the window and the route, an **exemplar**
   or a trace query localises the hop, the log lines **joined on trace id** say what happened,
   and the **resource** attributes say which pod/version -- then name what would have hidden it
   (sampling dropped the trace, cardinality limits folded the label, logs were at INFO).
3. **"This costs too much / we're drowning in telemetry."** -- the cost follow-up. Vague: "keep
   less." Fluent: cardinality is the metrics bill, volume is the logs bill, sampling is the
   traces bill, and each has a named lever.

## 1. Structured logging

**Facts.**
- The SRE workbook prefers "structured logs that enable rich query and aggregation tools as
  opposed to plain-text logs", and still recommends *metrics*-based alerting even when the
  signal is available in logs; logs are for root cause: "We tend to use logs to find the root
  cause of an issue, as the information we need is often not available as a metric"
  ([SRE workbook, Monitoring](https://sre.google/workbook/monitoring/)). It also notes logs
  carry "some inherent delay between when an event occurs and when it is visible".
- OTel's log data model has twelve top-level fields -- `Timestamp`, `ObservedTimestamp`,
  `TraceId`, `SpanId`, `TraceFlags`, `SeverityText`, `SeverityNumber`, `Body`, `Resource`,
  `InstrumentationScope`, `Attributes`, `EventName` -- and normalises levels onto
  `SeverityNumber` ranges: TRACE 1-4, DEBUG 5-8, INFO 9-12, WARN 13-16, ERROR 17-20,
  FATAL 21-24 ([OTel logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)).
- OTel deliberately has **no new logging API for application code**: it "embrace[s] existing
  logging solutions" and bridges them with appenders; correlation comes from "including TraceId
  and SpanId in the LogRecords" plus the shared resource
  ([OTel logs overview](https://opentelemetry.io/docs/specs/otel/logs/)).
- **What not to log.** OWASP lists data that "should usually not be recorded directly in the
  logs": session identification values, access tokens, authentication passwords, database
  connection strings, encryption keys and other primary secrets, payment card data, and
  "sensitive personal data and some forms of personally identifiable information (PII)". It
  also names **log injection** (CWE-117): sanitise CR, LF and delimiter characters in event
  data ([OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)).
- **The canonical log line** -- "one long log line at the end that pulls all its key telemetry
  into one place" per request -- is cheap to query because "the logging system doesn't need to
  piece together multiple log lines at query time" ([Stripe](https://stripe.com/blog/canonical-log-lines)).

**Fluent vs vague.** Vague: "we log errors." Fluent: key/value events with a stable message
template, a level policy (INFO in prod, DEBUG switchable at runtime), the **trace id on every
line** so logs join to traces, a separate **business correlation id** for flows that outlive a
trace, a redaction policy for PII and secrets, and an honest statement that **logs are the
expensive signal at volume** so you alert on metrics and read logs after.

**Classification.** Structured-vs-text, correlation ids, and "don't log PII/secrets" are
**core**. Canonical log lines (one wide event per request), log injection, and severity
normalisation across languages are **depth**.

## 2. OpenTelemetry

**Facts.**
- **API vs SDK.** The API is "the cross-cutting public interfaces used for instrumentation",
  imported by libraries and app code; the SDK is "the implementation of the API ... installed and
  managed by the application owner". The split exists to "separate the portion of each signal
  which must be imported as cross-cutting concerns from the portions which can be managed
  independently" ([OTel overview](https://opentelemetry.io/docs/specs/otel/overview/)). The
  consequence worth saying aloud: **a library depends only on the API**, and with no SDK
  installed its instrumentation is a no-op -- the application owner decides where (and whether)
  telemetry goes.
- **Signals.** The overview calls "tracing, metrics, and baggage" "three separate signals"; logs
  are a further signal ([overview](https://opentelemetry.io/docs/specs/otel/overview/),
  [logs](https://opentelemetry.io/docs/specs/otel/logs/)). Note the trap: the colloquial "three
  pillars" are logs/metrics/traces (Microsoft Learn uses that phrase,
  [observability-with-otel](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)),
  while the spec's own list includes baggage.
- **Context propagation.** "All of OpenTelemetry cross-cutting concerns ... share an underlying
  `Context` mechanism" ([overview](https://opentelemetry.io/docs/specs/otel/overview/));
  propagation "serializes or deserializes the context object", and the default propagator uses
  W3C TraceContext headers ([context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)).
- **Baggage** propagates name/value pairs "for indexing observability events in one service
  with attributes provided by a prior service" ([overview](https://opentelemetry.io/docs/specs/otel/overview/)).
  It is "unassociated with attributes on spans, metrics, or logs without explicitly adding
  them", and it leaks: "automatic instrumentation includes Baggage in most of your service's
  network requests", it is visible in HTTP headers, and there are "no built-in integrity checks"
  ([baggage](https://opentelemetry.io/docs/concepts/signals/baggage/)). W3C Trace Context
  similarly says vendors "MUST NOT use `traceparent` and `tracestate` fields for any personally
  identifiable or otherwise sensitive information" ([W3C](https://www.w3.org/TR/trace-context/)).
- **Resource** "captures information about the entity for which telemetry is recorded"
  ([overview](https://opentelemetry.io/docs/specs/otel/overview/)) -- `service.name`, pod,
  namespace, deployment -- so latency can be narrowed "to a specific container, pod, or
  Kubernetes deployment" ([resources](https://opentelemetry.io/docs/concepts/resources/)).
- **Semantic conventions** are "common names for different kinds of operations and data"
  ([semconv](https://opentelemetry.io/docs/concepts/semantic-conventions/)). Concrete example:
  `http.server.request.duration` is a **Histogram in seconds** with attributes
  `http.request.method`, `http.response.status_code`, `error.type`, and `http.route`, which
  "MUST be low-cardinality" -- "the URI path can NOT substitute it"
  ([HTTP metrics semconv](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)).
- **Span model.** Five span kinds (Client, Server, Internal, Producer, Consumer); status
  `Unset` (default, means success), `Error`, `Ok` (explicitly marked by the developer); links
  "associate one span with one or more spans, implying a causal relationship"
  ([traces](https://opentelemetry.io/docs/concepts/signals/traces/)).
- **Collector** is a "vendor-agnostic way to receive, process and export telemetry data",
  built from receivers, processors and exporters; it lets a service "offload data quickly" while
  the Collector handles "retries, batching, encryption or even sensitive data filtering", and it
  deploys as an agent or a gateway ([Collector](https://opentelemetry.io/docs/collector/)).
- **OTLP** "describes the encoding, transport, and delivery mechanism of telemetry data"
  between sources, collectors and backends; over gRPC (default port **4317**) or HTTP (default
  **4318**), as binary protobuf or JSON ([OTLP spec](https://opentelemetry.io/docs/specs/otlp/)).

**Fluent vs vague.** Vague: "we use OpenTelemetry for tracing." Fluent: libraries take the API,
the app wires the SDK; the app exports OTLP to a local Collector, which batches, redacts, samples
and fans out -- so swapping backends is a Collector config change, not a redeploy of every
service; context rides W3C headers; resource attributes say who emitted it; semconv names make
dashboards portable across languages.

**Classification.** Context propagation, "vendor-neutral standard", and the three signals are
**core**. API/SDK split, the Collector as a pipeline (and the agent/gateway shape), OTLP,
semantic conventions (and `http.route` vs raw path), resource vs attribute, and baggage's
leakage risk are **depth** -- the first two are the most common "has actually set it up" tells.

## 3. Metrics

**Facts.**
- **Instruments.** Counter ("non-negative increments"), UpDownCounter ("increments and
  decrements" -- active requests, queue size), Histogram ("arbitrary values that are likely to
  be statistically meaningful" -- durations, payload sizes), Gauge ("non-additive value(s)"),
  plus asynchronous (callback) Counter, UpDownCounter and Gauge
  ([OTel metrics API](https://opentelemetry.io/docs/specs/otel/metrics/api/)). The
  additive/non-additive distinction is the one to say: you can sum an UpDownCounter across
  instances (total queue depth); summing a gauge like temperature is meaningless.
- **Cardinality.** "Every unique combination of key-value label pairs represents a new time
  series ... Do not use labels to store dimensions with high cardinality ... such as user IDs,
  email addresses, or other unbounded sets of values"
  ([Prometheus naming](https://prometheus.io/docs/practices/naming/)). Microsoft gives numbers:
  "likely less than 1000 combinations for one instrument is safe", histograms "10-100 times
  lower", and if you need unbounded dimensions, "logs, transactional databases, or big data
  processing systems may be more appropriate"
  ([.NET metrics](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)).
  The OTel SDK enforces a **default cardinality limit of 2000** per metric and folds the excess
  into an overflow series tagged `otel.metric.overflow=true`
  ([OTel metrics SDK](https://opentelemetry.io/docs/specs/otel/metrics/sdk/)).
- **Histograms vs summaries.** A summary computes quantiles "within the instrumented program";
  a histogram exposes bucket counts and quantiles are computed server-side. "Averaging the
  quantiles yields statistically nonsensical values"; with histograms "the aggregation is
  perfectly possible". Rule: use histograms if you need aggregation; "Only if aggregation isn't
  needed, you can start thinking about summaries"
  ([Prometheus histograms](https://prometheus.io/docs/practices/histograms/)). The SRE book
  makes the same point from the other side: bucket request counts by latency "rather than actual
  latencies" to see the tail ([SRE ch. 6](https://sre.google/sre-book/monitoring-distributed-systems/)).
  OTel also defines an **exponential histogram** -- buckets on a base of 2^(2^-scale), a
  compressed representation with no hand-picked boundaries
  ([metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)).
- **Bucket choice matters.** OTel's default explicit buckets are
  `[0, 5, 10, 25, ... 10000]`, so "sub-second request durations would all fall into the `0`
  bucket" if recorded in seconds; .NET 9's `InstrumentAdvice` lets an instrument suggest
  boundaries ([.NET metrics](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)).
- **Temporality.** Cumulative points repeat the start time; delta points advance it
  ([metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)).
  Prometheus is cumulative and pull-based; several vendor backends prefer delta.
- **Pull vs push.** Prometheus scrapes. Its docs say "the only valid use case for the
  Pushgateway is for capturing the outcome of a service-level batch job", and list the costs of
  pushing: a single point of failure, losing "automatic instance health monitoring via the `up`
  metric", and a gateway that "never forgets series pushed to it"
  ([Prometheus pushing](https://prometheus.io/docs/practices/pushing/)). OTLP is push; the
  Collector can sit in either model.

**Fluent vs vague.** Vague: "track average latency per user." Fluent: a histogram per route in
seconds, tagged with method/status/route (bounded), never user id; p99 computed from merged
buckets, never by averaging per-instance p99s; per-user questions answered from logs or traces.

**Classification.** Counter/gauge/histogram, percentiles over averages, and "don't put user id
on a metric" are **core**. Why percentiles don't aggregate (summary vs histogram), bucket choice
and exponential histograms, the UpDownCounter/Gauge additivity distinction, cardinality limits
and overflow, delta vs cumulative, and pull-vs-push trade-offs are **depth**.

## 4. Sampling

**Facts.**
- **Head sampling** decides "as early as possible": easy, efficient, but "it is not possible to
  make a sampling decision based on data in the entire trace". **Tail sampling** decides "by
  considering all or most of the spans within the trace"; it is "difficult to implement",
  "difficult to operate", and often vendor-specific ([OTel sampling](https://opentelemetry.io/docs/concepts/sampling/)).
- Tail sampling is **stateful**: "All spans for a given trace MUST be received by the same
  collector instance", achieved with a first collector tier running the load-balancing exporter
  (routing by trace id) and a second running the tail-sampling processor; traces are buffered
  (`num_traces`, default 50000) and evicted if the buffer is too small for traffic
  ([tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)).
- **Parent-based** sampling means "the child's decision [matches] the parent's decision", carried
  by the sampled flag in `traceparent`; **adjusted count** is "the mathematical inverse ... of the
  sampling probability", which is how span-derived counts are extrapolated
  ([probability sampling](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)).
- In .NET, an unsampled Activity costs "less than 100 nanoseconds", and a listener can choose to
  create only enough of an Activity "to propagate distributing tracing IDs"
  ([.NET tracing concepts](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts)).

**Consequences a fluent answer names.** (a) With head sampling at 1%, the one failing request
you're paged about is 99% likely to have no trace -- which is why the vault's broker lesson
carries a business correlation id. (b) Never compute rates or SLIs from sampled spans unless you
weight by adjusted count; compute them from metrics, which are unsampled. (c) Tail sampling
("keep all errors and slow traces, 1% of the rest") fixes (a) at the cost of a stateful,
trace-id-routed collector tier and buffering memory. (d) Logs and metrics still carry the trace
id of unsampled requests, so a log line can point at a trace that does not exist.

**Classification.** "We sample traces because of cost" is **core**. Head vs tail, parent-based
consistency, the trace-id-affinity requirement for tail sampling, and "don't derive SLIs from
sampled data" are **depth** -- tail sampling's operational cost is one of the strongest
"has run this" signals.

## 5. Correlating the signals; exemplars

**Facts.**
- An **exemplar** "is a recorded value that associates OpenTelemetry context to a metric event"
  -- trace id, span id, timestamp, value ([metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)).
  The SDK's default `ExemplarFilter` is `TraceBased`: only measurements recorded inside a
  **sampled** span are eligible ([metrics SDK](https://opentelemetry.io/docs/specs/otel/metrics/sdk/)).
- OTel defines correlation along three axes: time, execution context (trace/span id on log
  records), and resource origin ([OTel logs](https://opentelemetry.io/docs/specs/otel/logs/)).

**The fluent drill.** Alert fires on an SLO burn rate -> histogram for `http.route` shows the p99
bucket moved -> click an **exemplar** in that bucket to land on a real slow trace -> the trace
names the slow hop -> **logs filtered by that trace id** say why -> **resource attributes** say
it is only pods on version N. Each arrow is a join key, and the candidate who can name the join
key at each step (exemplar trace id, log trace id, `service.version`) is the fluent one. In
vendor UIs: Grafana calls the metric->trace jump "exemplars"; Datadog calls the same idea
"trace-metric correlation".

**Classification.** "Put the trace id in the logs" is **core**. Exemplars, and the fact that
they only exist for sampled spans, are **depth**.

## 6. Cost and retention

**Facts.** Each signal has its own cost driver: metric cost scales with **series count**
(cardinality, above); log cost with **volume**, and the SRE workbook frames logs as the
granular, delayed, root-cause signal and metrics as the near-real-time one
([SRE workbook](https://sre.google/workbook/monitoring/)); trace cost with **sampling rate**.
The SRE book on resolution: high resolution need not mean high cost -- sample internally and
"configure an external system to collect and aggregate that distribution over time or across
servers" ([SRE ch. 6](https://sre.google/sre-book/monitoring-distributed-systems/)). The
Collector is where cost policy is enforced: filtering, redaction, batching, sampling
([Collector](https://opentelemetry.io/docs/collector/)).

**The levers a fluent answer lists.** Drop or bound high-cardinality attributes; recording rules
/ downsampling for long-term metrics (keep raw for days, rolled-up for months); log-level policy
plus sampling of INFO/DEBUG but never of ERROR or audit logs; tail-sample traces; short trace
retention (days) because traces are for incidents, longer metric retention because SLOs are
computed over 28-30 day windows; tiered/cold storage for logs with compliance retention.
*Source note:* specific retention numbers are practice, not spec -- no primary source above
prescribes them.

**Classification.** **Depth** throughout, but a senior candidate is expected to raise cost
unprompted once they've proposed "log everything".

## 7. Alerting depth (beyond what the vault has)

The SRE workbook defines **burn rate** as "how fast, relative to the SLO, the service consumes
the error budget", and recommends **multiwindow, multi-burn-rate** alerts: for a 99.9% SLO, page
on 2% of budget in 1 hour (14.4x burn) confirmed by a 5-minute window, page on 5% in 6 hours (6x),
ticket on 10% in 3 days (1x) ([alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)).
**Depth.** It is the natural next question after "alert on symptoms".

## How .NET exposes it

.NET is unusual: the runtime ships the instrumentation APIs, so "OTel doesn't need to provide
APIs for library authors"; the OTel .NET SDK *collects* from them
([observability-with-otel](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)).

| Signal  | .NET instrumentation API                                         | OTel term  |
| ------- | ---------------------------------------------------------------- | ---------- |
| Logs    | `Microsoft.Extensions.Logging.ILogger<T>`                        | Logs API   |
| Metrics | `System.Diagnostics.Metrics.Meter` (via `IMeterFactory` in DI)   | Meter      |
| Traces  | `System.Diagnostics.ActivitySource` / `Activity`                 | Tracer / Span |

- **Source-generated logging.** `[LoggerMessage]` on a `partial` method generates the
  implementation at compile time; it "eliminates boxing, temporary allocations, and copies",
  preserves message-template structure, supports a dynamic level, and warns on misuse; redaction
  plugs in via `Microsoft.Extensions.Compliance.Redaction` and data-classification attributes
  ([source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logger-message-generator)).
- **Logs-to-traces join.** `ActivityTrackingOptions` (`TraceId`, `SpanId`, `ParentId`,
  `TraceFlags`, `TraceState`, `Tags`, `Baggage`) chooses which trace-context parts are
  included in logging scopes ([API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.activitytrackingoptions)).
- **Activity = span.** .NET "adopted the term 'Activity' many years ago, before the name 'Span'
  was well established"; W3C TraceContext is the default id format since .NET 5; ASP.NET Core and
  `HttpClient` propagate it with "no special coding"
  ([tracing concepts](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts)).
  Tags = OTel attributes.
- **Meter.** Counter, UpDownCounter, Gauge, Histogram and Observable* variants; "for timing
  things, Histogram is usually preferred"; record time in **seconds** as a double; follow OTel
  dotted names; `TagList` avoids allocations past three tags; `MetricCollector<T>` tests metrics
  ([.NET metrics](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)).

**Cross-language equivalents** (named, not separately sourced):
- **Java:** SLF4J/Logback (MDC for ids) for logs; OTel Java API (`Tracer`, `Meter`) or Micrometer for metrics; the OTel Java agent for auto-instrumentation.
- **Go:** `log/slog` for structured logs; `go.opentelemetry.io/otel` `Tracer`/`Meter`; context carried explicitly in `context.Context`.
- **Python:** `logging` (or structlog); `opentelemetry-api` `trace`/`metrics`; `opentelemetry-instrument` for auto-instrumentation.
- **Node/TypeScript:** pino/winston; `@opentelemetry/api`; context via `AsyncLocalStorage`.
- **Prometheus client libraries** (any language): Counter/Gauge/Histogram/Summary -- the source of the "summary" type OTel does not have as an instrument.

## Already covered vs gap

| Concept | Where the vault has it | Status |
| --- | --- | --- |
| Three telemetry kinds and when to use each | `metrics-logs-and-the-golden-signals` | Covered |
| SLI / SLO / SLA, error budget | same | Covered |
| Four golden signals, latency split by outcome | same (with a `Meter` example) | Covered |
| Symptom-based alerting | same | Covered |
| `traceparent` format, sampled flag | `trace-context-across-retries` | Covered |
| Automatic context propagation in ASP.NET Core / `HttpClient` | `trace-context-across-retries` | Covered |
| One parent only; parallel attempts | `tracing-hedged-attempts` | Covered |
| Context in message headers, span links, producer/consumer | `tracing-a-flow-through-a-message-broker` | Covered |
| Business correlation id beside trace context; "traces are sampled and expire" | `tracing-a-flow-through-a-message-broker` | Covered (as a caveat) |
| Structured logging, levels, message templates, `[LoggerMessage]` | -- | **Gap** |
| What not to log (PII, secrets), log injection, redaction | -- | **Gap** |
| Log volume/cost; canonical log line / wide event | -- | **Gap** |
| Trace id in logs (`ActivityTrackingOptions`) / logs-traces join | mentioned only via App Insights `operation_Id` | **Partial** |
| OTel API vs SDK, Collector, OTLP, resources, semantic conventions | -- | **Gap** |
| Baggage (and its leak risk) | -- | **Gap** |
| Instrument kinds beyond Counter/Histogram; additivity | golden-signals shows Counter + Histogram only | **Partial** |
| Cardinality explosions and limits | -- | **Gap** (the single most-probed metrics gotcha) |
| Histograms vs summaries; percentiles don't aggregate; buckets | -- | **Gap** |
| Pull vs push | -- | **Gap** |
| Head vs tail sampling and consequences | sampled flag only | **Gap** |
| Exemplars | -- | **Gap** |
| Cost and retention | -- | **Gap** |
| Burn-rate / multiwindow alerting | -- | **Gap** |

**One correction to carry into authoring.** The golden-signals Lesson's `Meter` example records
`request.duration` with `unit: "ms"`. Microsoft recommends "prefer units of seconds recorded as
a floating point or double value", and the OTel semantic convention `http.server.request.duration`
is in seconds ([.NET metrics](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation),
[HTTP semconv](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)). Not wrong
per se, but a depth-signal interviewer would notice; worth fixing when the observability Lessons
are written.

## Unverified, or where the sources disagree

- **No source measures interview frequency.** The core/depth split is editorial, by the test
  stated in "The question".
- **"Three signals."** The OTel overview lists "tracing, metrics, and baggage" as three signals,
  while OTel docs elsewhere, and Microsoft Learn, speak of logs/metrics/traces. Both usages are
  live; say "logs, metrics, traces -- plus baggage as the context that rides with them" and you
  are right under either.
- **The tail-sampling statement** that all spans must reach one collector comes from the
  collector-contrib processor README, not the OTel concepts page (which says only that tail
  samplers are stateful).
- **Several pages were read through a summarising fetcher** (OTel concepts, Prometheus, OWASP,
  SRE pages); quotations were requested verbatim, but re-check exact wording before quoting it in
  a Lesson. The Microsoft Learn pages were read in full.
- **Retention figures** (days for traces, months for metrics) are common practice, not
  prescribed by any source above.
- **Cross-language equivalents** are named from general knowledge, not fetched.
