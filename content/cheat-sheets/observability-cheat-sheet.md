---
id: 01M48YTP1JE3EPDPG4DT910WJV
title: Observability — cheat sheet
topic: observability
---

**The shape**

- **Metrics say something is wrong, traces say where, logs say what.** Alert on the cheap
  aggregate; drill into the expensive detail only once it has fired.
- **SLI** is the measure, **SLO** the target on it, **SLA** the contract with a consequence. The
  internal SLO is tighter than the SLA, never 100%; the gap is the **error budget**.
- **Golden signals**: latency (split by outcome, so a slow error can't hide in the average),
  traffic, errors, saturation (a leading indicator: latency climbs before the resource maxes out).
- **Alert on symptoms, not causes.** Page on an SLI threatening its SLO; CPU and replica lag go on
  the dashboard you open afterwards.

**OpenTelemetry**

- **Libraries depend on the API; the application owns the SDK.** In .NET the API *is* the BCL:
  `ActivitySource`, `Meter`, `ILogger`. They cost nothing until an app subscribes by name.
- **Resource** = who emitted (service, version, host), fixed at startup. **Attribute** = what one
  event was. **Semantic conventions** fix the names: `http.route` is the template, never the path.
- **Baggage** rides plain headers to every downstream call. No secrets, no PII.
- **OTLP** (gRPC 4317, HTTP 4318) ships all three signals to a **Collector**: receivers → processors
  → exporters, as agent, gateway, or both. Backend choice, redaction, sampling and filtering live
  there, changed without redeploying forty services.

**Logs**

- **Events, not sentences.** A constant message template (`[LoggerMessage]`), never `$"..."` —
  interpolation loses the fields and the group-by (CA2254).
- **Level policy**: Information is production; Debug per category on demand; a business refusal is
  Warning; Error means the operation failed. A log level is never the pager.
- **Trace id on every line** (the host's `ActivityTrackingOptions` puts it in the scope), plus a
  **business correlation id** via `BeginScope`, because traces are sampled and expire.
- **Never log** secrets, tokens, card data or PII; enforce it with **redaction by data
  classification**, not review. Sanitise CR/LF (log injection, CWE-117).
- **One canonical line per request**: one wide record, cheap to query.

**Metrics**

- **Instrument choice is two questions**: only goes up? (Counter vs UpDownCounter) and can it be
  summed across instances? (UpDownCounter yes, Gauge no). Observable form when the value already
  exists.
- **Series = product of label values** (× buckets for a histogram). Labels hold route, method,
  status — **never a user or order id**; those go on spans and logs.
- The OTel SDK caps each metric at **2000 series** and folds the rest into
  `otel.metric.overflow=true` — **silently**: the total stays right, the breakdown goes wrong.
- Prometheus **pulls**, OTLP **pushes**. Cumulative temporality costs process memory per series;
  delta moves that cost out.

**Percentiles**

- **Percentiles don't aggregate.** Averaging per-pod p99s is wrong, weighting them is still wrong,
  max is only an upper bound. **Merge the histograms, then compute.** A summary can't be merged.
- A histogram percentile is an **estimate within one bucket**: put a **boundary on every SLO
  threshold**.
- Durations in **seconds, as a `double`**. .NET's default boundaries are millisecond-shaped and put
  every sub-5 s request in one bucket — supply boundaries via `InstrumentAdvice` or a View.

**Sampling**

- **Head**: decided at the root from the trace id, carried by the `traceparent` flag; whole traces
  or nothing. Cheap, blind to errors. **Tail**: decided on the finished trace, keeps every error,
  needs every span routed to one Collector by trace id, buffers in memory.
- SDK default `ParentBased(root=AlwaysOn)` **keeps everything**. An unsampled root still has a trace
  id, so logs point at traces that don't exist.
- **SLIs come from metrics**, never from counting kept traces.

**From alert to cause**

- **Burn rate** = error rate ÷ budget rate. For 99.9% over 30 days:

  | Action | Long window | Short window | Burn rate | Budget spent |
  | ------ | ----------- | ------------ | --------- | ------------ |
  | Page   | 1 h         | 5 min        | 14.4      | 2%           |
  | Page   | 6 h         | 30 min       | 6         | 5%           |
  | Ticket | 3 d         | 6 h          | 1         | 10%          |

  The long window makes it significant; the short one stops it soon after the fix.
- **Name the join key at each step**: alert → histogram by `http.route` → **exemplar's trace id** →
  trace → logs by **trace id** → resource attributes (which version, which host).
- **.NET trap: exemplars are `AlwaysOff` by default**, against the spec's `TraceBased`, until
  `SetExemplarFilter(ExemplarFilterType.TraceBased)`.
- **What hides the cause**: sampling, series overflow, log level, a missing bucket edge.

**Cost**

- **Each signal has its own meter**: metrics by series, logs by volume, traces by sample rate;
  retention multiplies all three. Metrics follow labels, not traffic — which is why alerts live there.
- **Rollups add storage.** Recording rules and downsampling save money only once raw retention is
  cut, and that gives up zooming into old data.
- **Logs**: sample Information, **never Error or audit**; level follows outcome. In .NET,
  `AddTraceBasedSampler()` drops Errors from unsampled traces — use per-level rules instead.
- **Traces**: head sampling cuts egress, tail sampling cuts backend storage.

The reach-for-it signal: the last box is on the whiteboard and nobody has said how you'd know it's
broken. Say SLO, golden signals, burn-rate alert, then walk the chain to the log line.

Full treatment: [[metrics-logs-and-the-golden-signals]] for the vocabulary,
[[opentelemetry-api-sdk-collector-otlp]] for the plumbing, [[from-burn-rate-alert-to-the-log-line]]
for the drill that ties every signal together. Trace context itself is the
[[distributed-tracing-cheat-sheet]].
