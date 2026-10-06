---
id: 01M48Y963VMG7VD96EZ9R1MGC3
title: What telemetry costs
topic:
  - observability
prerequisites:
  - structured-logging-in-dotnet
  - metric-instruments-and-cardinality
  - sampling-traces-head-tail-and-what-you-lose
---

"We're drowning in telemetry" is a cost question, and "keep less" is the vague answer to it. **Each signal
has its own meter, and each meter has its own lever**, so the fluent answer is a short table rather than a
slogan:

- **metrics** are billed by **series count** (labels, buckets, resolution), and the lever is a bounded
  label set;
- **logs** are billed by **volume**, which grows with every request, line and field, and the lever is a
  level policy plus sampling that **never touches Error or audit lines**;
- **traces** are billed by **sample rate**. Head sampling is the lever on egress, and tail sampling the
  lever on the backend;
- **retention** multiplies all three, and the **Collector** is where the policy can change without a
  redeploy.

Every lever also costs something, and a senior answer names that cost along with the saving. The mechanics
belong to other Lessons: series and the overflow bucket to [[metric-instruments-and-cardinality]], levels
and the canonical log line to [[structured-logging-in-dotnet]], and head versus tail to
[[sampling-traces-head-tail-and-what-you-lose]]. This Lesson is about how they combine.

## Three signals, three meters

| Signal  | What you pay for                       | The lever                                         | What the lever costs you                           |
| ------- | -------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Metrics | Series: labels × buckets × instances   | Bounded labels; drop a label or instrument        | The breakdown you didn't keep                      |
| Logs    | Bytes ingested, indexed, retained      | Narrative to Debug; sample Information            | Counting from logs; one request's whole story      |
| Traces  | Spans exported and stored              | Head sampling (egress), tail sampling (backend)   | The paged request may have no trace                |

The table explains why **alerting belongs on metrics**. A metric's cost is set by its labels, not by
traffic: a counter costs the same at ten requests a second as at ten thousand. Log and trace volume grows
with traffic, so they get more expensive as the system gets busier, which is when you can least afford
to lose them.

## Metrics: series, resolution, and rollups that add storage

Series count is the bill, and [[metric-instruments-and-cardinality]] covers how labels multiply it. The
second factor is **resolution**. The
[SRE book](https://sre.google/sre-book/monitoring-distributed-systems/) warns that per-second
measurements "may be very expensive to collect, store, and analyze". Its remedy is a histogram by
another name, reducing costs "by performing internal sampling on the server, then configuring an external
system to collect and aggregate that distribution over time or across servers." Record into buckets in the process, and
export the buckets once a minute.

The levers that look like savings are the ones to be careful with:

- **A recording rule adds series.** Prometheus
  [defines it](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) as a way to
  "precompute frequently needed or computationally expensive expressions and save their result as a new
  set of time series." It makes dashboards fast. It saves storage only when the raw series it summarises
  are then dropped or kept for less time.
- **Downsampling adds storage too.** Thanos, which downsamples Prometheus data to 5-minute and 1-hour
  resolution, says so plainly: "downsampling doesn't save you **any** space", because it keeps the
  rolled-up blocks *beside* the raw ones. "The goal of downsampling is to provide an opportunity to get
  fast results for range queries of big time intervals like months or years"
  ([Thanos compactor](https://thanos.io/tip/components/compact.md/)). The money comes from deleting raw
  data sooner, and the price is that you can no longer zoom into an old incident.

The cheapest series is the one never emitted. In .NET a **view** drops it in the process, before it is
exported:

```csharp
// Keep only the payment method on this counter; any other label recorded on it is dropped.
.AddView("shop.orders.placed", new MetricStreamConfiguration { TagKeys = ["shop.payment.method"] })
// Drop an instrument that nobody reads.
.AddView("shop.cache.evictions", MetricStreamConfiguration.Drop)
```

The [OTel .NET docs](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/metrics/customizing-the-sdk/README.md)
add one caveat: a dropped attribute "does **not**" leave the exemplars recorded for that instrument. So
a view reduces cost, but it does not redact anything.

```quiz 01M48Y963VRSJAJ1DEH0VRC9T2
Metric storage is over budget. A colleague proposes recording rules that roll every latency histogram up
to per-service totals, plus 1-hour downsampling, keeping everything for the current 13 months. What does
the bill do?

- [x] It grows: the rollups are stored beside the raw data
  > A recording rule writes new series and downsampling adds blocks next to the raw ones. Storage only
    falls when raw retention is cut, which also gives up zooming into old incidents.
- [ ] It falls: summaries replace the raw series they cover
  > Neither mechanism deletes anything. Prometheus calls a recording rule's output "a new set of time
    series", and Thanos says downsampling saves no space.
- [ ] It falls, but per-route latency is lost for good
  > That loss would only happen if the raw series were deleted, and the plan keeps them. It keeps
    everything and adds the rollups on top.
- [ ] It stays flat: the rules only change query speed
  > Query speed is the real gain, but storing the results is not free. The new series and blocks are
    stored in addition to the old ones.
```

## Logs: volume, and the lines sampling may never touch

A log's cost scales with traffic. Take some illustrative numbers: 2,000 requests a second, each writing
six Information lines of about 1 KB.

| Policy                                                 | Throughput | Per day  |
| ------------------------------------------------------ | ---------- | -------- |
| Six Information lines per request                      | 12 MB/s    | ~1 TB    |
| One canonical line; the other five moved to Debug      | 2 MB/s     | ~173 GB  |
| Canonical line sampled at 10%; 0.5% failures all kept  | 0.21 MB/s  | ~18 GB   |

The first cut is free. [[structured-logging-in-dotnet|The canonical log line]] carries everything the
narrative lines said, as fields on one record. The second cut is **sampling**, and Microsoft's
[log sampling guide](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/log-sampling) gives
the policy as a table: Trace and Debug, don't sample, "because normally you disable these logs in
production"; Information, "Do apply sampling"; Warning, "Consider applying sampling"; Error and Critical,
"Don't apply sampling". It frames the trade honestly: sampling "is designed to reduce storage costs, with
a trade-off of slightly increased CPU usage."

Two kinds of line are never sampled. **Errors** are few and are exactly what someone will search for.
**Audit lines** (who changed what, who approved a payment) are records with a compliance purpose, and a
10% audit trail is not an audit trail. The code below gives them their own category so that a rule can
protect them:

```csharp
// Program.cs. Sampling is in Microsoft.Extensions.Telemetry (dotnet/extensions), not the BCL.
builder.Logging.AddRandomProbabilisticSampler(o =>
{
    // Information and below: keep 10%. Warning, Error and Critical match no rule, so all are kept.
    o.Rules.Add(new RandomProbabilisticSamplerFilterRule(probability: 0.10, logLevel: LogLevel.Information));

    // Audit lines: same level, but a matching category beats a rule with none, so keep 100%.
    o.Rules.Add(new RandomProbabilisticSamplerFilterRule(
        probability: 1.0, categoryName: "Shop.Audit", logLevel: LogLevel.Information));
});
```

```csharp
// The canonical line takes its level from the outcome, so a failed request's line is never sampled away.
public sealed partial class CanonicalLogLine(ILogger<CanonicalLogLine> logger)
{
    public void Write(HttpContext ctx, TimeSpan elapsed) =>
        RequestCompleted(logger, ctx.Response.StatusCode >= 500 ? LogLevel.Error : LogLevel.Information,
            ctx.Request.Method, (ctx.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText,
            ctx.Response.StatusCode, elapsed.TotalSeconds);

    [LoggerMessage(Message = "{Method} {Route} completed {StatusCode} in {DurationSeconds}s")]
    private static partial void RequestCompleted(
        ILogger logger, LogLevel level, string method, string? route, int statusCode, double durationSeconds);
}
```

The second class addresses the trap in sampling by level. The sampler decides **per record, not per
request**, so a failing request's Information line has the same 90% chance of being dropped as any other.
Raising the level when the request fails ties the line's chance of being kept to its outcome. Two costs
remain:

- **You can no longer count from logs.** Ten percent of the lines means a tenth of the count. That is
  one more reason the number lives in a counter, as [[metrics-logs-and-the-golden-signals]] already
  argues.
- **A request's story arrives incomplete.** One request's lines may be partly kept. What survives in
  full is the Error line and the trace id it carries.

The same package also offers `AddTraceBasedSampler()`, which keeps a log only when its trace was sampled.
That sounds like a tidy way to keep logs and traces consistent, but the source shows the catch. The whole
sampler is one expression, `Activity.Current?.Recorded ?? true`, and it is applied to **every level**.
Only one sampler can be registered at a time ("the last one is used"), so a level rule cannot sit beside
it.

```quiz 01M48Y963VS1ZXHDASE83M13W0
Traces are head-sampled at 5%. To keep logs and traces consistent, a team switches the logging pipeline
to `AddTraceBasedSampler()`. A payment fails inside one of the unsampled 95% of requests. What happens to
its Error log line?

- [x] It is dropped, because its trace was not recorded
  > The sampler returns `Activity.Current?.Recorded`, whatever the level. The unsampled root still
    has an activity, so the answer is false and the Error line is dropped with the trace.
- [ ] It is kept, because Error lines are never sampled
  > That holds for the probabilistic sampler's level rules. The trace-based sampler has no level
    rule, and only one sampler can be registered at a time.
- [ ] It is kept, with a trace id pointing at no trace
  > That is what happens without this sampler: logs normally outlive the trace decision. This
    sampler ties the two decisions together, in both directions.
- [ ] It is kept, because no activity exists to consult
  > In .NET the SDK still creates a propagation-only activity for an unsampled root. Only code
    outside any activity falls through to `?? true` and is kept.
```

## Traces: two levers, two different bills

The traces row splits in two, and the split is the part interviewers listen for. **Tail sampling saves
on the backend, not on the wire**: every service still exports every span, and the Collector chooses
which traces to keep. If the problem is egress, or the cost of the Collector tier itself, the lever is
**head sampling in front of it**. A common answer runs both: head sampling at a rate that protects the
pipeline, then tail sampling that keeps every error and slow trace from what arrives. What that combination
loses is covered in [[sampling-traces-head-tail-and-what-you-lose]].

## The Collector: where cost policy changes without a redeploy

An application sets its own floor: its levels, views and sampler. Fleet-wide policy belongs in the
Collector, which the [OTel docs](https://opentelemetry.io/docs/collector/) say can take on "retries,
batching, encryption or even sensitive data filtering". Policy there changes once for every service,
whatever language it is written in, and nothing has to be rebuilt.

The [filter processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md)
drops telemetry that matches a condition: "If **any** condition is met, the telemetry is dropped." The
classic target is health-check traffic, which can be a large share of all spans and is never what anyone
is debugging:

```yaml
processors:
  filter/noise:
    error_mode: ignore
    trace_conditions:
      - span.attributes["url.path"] == "/healthz"      # probes: a root span per check, all day
    log_conditions:
      - log.severity_number < SEVERITY_NUMBER_INFO      # Debug left on in prod by mistake

service:
  pipelines:
    traces: { receivers: [otlp], processors: [filter/noise, batch], exporters: [otlp] }
    logs:   { receivers: [otlp], processors: [filter/noise, batch], exporters: [otlp] }
```

Two caveats worth saying aloud. The processor's README carries a standard warning: "Dropping a span may
lead to orphaned logs if the log references the dropped span". So filter roots that nothing hangs off.
And the Collector's
[probabilistic sampler](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md)
does sample logs, by trace id by default, but it applies **one percentage to every record**. Per-record
priorities exist, but only through an attribute the application must set. A rule like "sample Information,
never Error" is easiest to keep in the application, where the level is known, and that also saves the
egress. The Collector then enforces the fleet-wide floor. Where each decision lives follows the same logic
as head versus tail sampling.

The filter processor is marked **alpha**, and the condition syntax above is documented from Collector
v0.146.0. *Recorded 2026-10-06.*

## Retention: the multiplier

Retention multiplies every row of the table, and it is set per signal by what each signal is for. The
figures below are **common practice, not a standard**: no spec prescribes them, so present them as a
starting point.

- **Traces: days.** They exist to debug an incident while it is still fresh, and the correlation id in
  the logs is what outlives them.
- **Metrics: at least the SLO window.** The
  [SRE workbook](https://sre.google/workbook/implementing-slos/) has "found a four-week rolling window to
  be a good general-purpose interval", so the SLI's series must live at least that long, and capacity
  planning wants months. This is where shorter raw retention plus longer rollups saves real money.
- **Logs: tiered.** Recent logs stay in fast, indexed storage, and older ones move to cheap cold storage.
  **Audit logs are retained as long as a regulator says**, and that figure comes from compliance, not
  engineering.

```quiz 01M48Y963VMGM2X1NDE7T64TFJ cloze
Metric cost scales with {{series count}}, log cost with {{volume}}, and trace cost with the
{{sample rate}}. Log sampling may thin Information but never {{Error}} or audit lines. Tail sampling cuts
the {{backend}} bill but not egress. Fleet-wide policy that changes without a redeploy lives in the
{{Collector}}.
```

## The same idea, elsewhere

Nothing here is specific to .NET. The Collector's processors work the same on telemetry from any
language, which is a reason to put shared policy there. Recording rules, downsampling and the "rollups
are stored beside raw data" catch are properties of time-series storage, so they hold in any backend that
offers them. What varies is in-process log sampling. Every mainstream logging framework filters by level,
but level-aware probabilistic sampling is a library feature, so check whether yours has it before you
promise it in an interview.

```quiz 01M48Y963VK9X5X7Q61F9G9ANS recall
An interviewer says: "Our observability bill doubled this year and leadership wants it halved. Where do you
look, and what do you refuse to cut?" Answer in under two minutes.

> **Split the bill by signal, because each has its own meter.** Metrics: find the series count per metric
> and the label driving it. Bound or drop it with a view, and let the SDK's overflow series show which one
> blew up. Logs: move the narrative lines to Debug behind one canonical line per request, then sample
> Information at around 10%. Traces: head-sample to protect egress, and tail-sample in the Collector to
> keep every error and slow trace.
>
> **Retention second**: traces for days, metrics at least the four-week SLO window with old raw data
> deleted sooner, logs tiered hot to cold. Rollups and recording rules only save money once raw retention
> shrinks; on their own they add storage.
>
> **Refuse to cut**: Error and audit lines (never sampled; audit retention is a compliance number), the
> SLI metrics (alerts and the budget are computed from them, and they cost the same at any traffic), and
> the trace id and correlation id on every remaining log line, which is what makes the thinned signals
> still join up. Put the policy in the Collector so it changes without a redeploy.
```

## What to take away

**Each signal has its own meter**: metrics by series, logs by volume, traces by the sample rate.
Retention multiplies all three. Metrics are the cheap signal at scale, because their cost follows labels
rather than traffic, which is why alerts and SLIs live there. **Recording rules and downsampling add
storage**. They save money only when raw retention is cut, and that gives up zooming into old data.
**Logs**: one canonical line per request, Information sampled, **Error and audit never**. Level follows
outcome, so a failed request's line survives a per-record sampler. In .NET, the trace-based log sampler
drops Error lines from unsampled traces, so prefer level rules. **Traces**: head sampling is the egress
lever, tail sampling the backend lever. **The Collector** applies fleet-wide policy with a filter
processor, without a redeploy. Retention figures are practice, not spec, apart from audit, which is set by
compliance.

Worth reading in full: Microsoft Learn's
[Log sampling in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/log-sampling). It
is short, it gives the per-level policy as a table, and it explains how rules are chosen, which you need
before trusting an audit rule to win.
