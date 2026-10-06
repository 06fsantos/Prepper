# What does a senior interview probe on observability?

Type: research
Status: resolved
Blocked by: —

## Question

What do senior software-engineering interviews (design rounds chiefly, plus "how would you debug
this in production" follow-ups) actually ask about observability, and which concepts separate a
fluent answer from a vague one? Cover at least: structured logging (vs text logs, log levels,
correlation, what not to log), OpenTelemetry (API vs SDK, signals, the Collector, OTLP,
semantic conventions, context propagation), metrics (instrument types, cardinality, histograms
and percentiles), sampling (head vs tail), cost, and how logs/metrics/traces correlate. Say which
are most frequently probed and which are depth signals.

Primary sources only (OTel spec and docs, W3C, Google SRE book, vendor-neutral engineering
writing). Vendor products are out of scope except to name what a concept is called in them.
Note what the vault already covers: [[metrics-logs-and-the-golden-signals]] (three telemetry
kinds, SLI/SLO/SLA, golden signals, symptom alerting) and the `distributed-tracing` Lessons
(trace context, retries, hedging, brokers).

Output: a Research note in `content/research/`, named after the question.

## Comments

- 2026-10-06: research subagent dispatched; findings land on branch
  `research/observability-interview-probes` as a note in `content/research/`.
- 2026-10-06: findings committed as `31da249` on `research/observability-interview-probes`.

## Answer

Research note: `content/research/what-does-a-senior-interview-probe-on-observability.md` on
branch `research/observability-interview-probes` (commit `31da249`, fast-forwarded onto `main` 2026-10-06).

Gist (the core/depth split is editorial, since no primary source measures interview frequency):

- **Core**: structured logs over text, a trace id on every line plus a business correlation id,
  no PII or secrets in logs; counter/gauge/histogram, percentiles over averages, no user id as a
  label; "we sample traces for cost"; context propagation; "put the trace id in the logs".
- **Depth**: OTel API vs SDK, Collector (agent/gateway), OTLP, resources, semconv (`http.route`
  not the raw path); baggage leakage; cardinality limits and overflow; percentiles don't
  aggregate (histogram vs summary), bucket choice, exponential histograms; pull vs push;
  head vs tail sampling and tail's trace-id-affinity cost; exemplars (only for sampled spans);
  per-signal cost levers; multiwindow burn-rate alerting; canonical log lines.
- **Gaps in the vault**: nearly all of the above. Covered already: telemetry kinds, SLI/SLO,
  golden signals, symptom alerting, `traceparent`, propagation, hedging, broker links.
- **Correction to carry**: golden-signals' `Meter` example records duration in `"ms"`; OTel
  semconv and Microsoft say seconds as a double.
