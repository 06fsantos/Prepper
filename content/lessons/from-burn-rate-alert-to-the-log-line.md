---
id: 01M48XXRWF1R85VYSRGG0AARTD
title: From burn-rate alert to the log line
topic:
  - observability
prerequisites:
  - structured-logging-in-dotnet
  - why-percentiles-dont-aggregate
  - sampling-traces-head-tail-and-what-you-lose
---

"p99 latency doubled at 14:02. Walk me through it." This is the production-debug follow-up, and the
vague answer is "I'd check the logs". The fluent answer is a chain of five hops, and **every hop is a
join on a named key**:

- a **burn-rate alert** says the error budget is going too fast, measured over two windows so it fires
  quickly and also stops quickly;
- the **histogram** behind the SLI says which route and which minute;
- an **exemplar** in the slow bucket hands you a **trace id**;
- the **trace** names the slow hop;
- the **logs filtered by that trace id** say why, and the **resource attributes** on them say which
  deployment.

Then say what would have broken the chain: an unsampled trace, exemplars switched off, a label folded
into overflow, or the reason logged below the production level.

## Burn rate: how fast the budget is going

An SLO leaves an error budget, the gap between the target and 100%, and alerting on symptoms means
paging when that budget is threatened ([[metrics-logs-and-the-golden-signals]] covers both). What
"threatened" means is the question. The Google SRE workbook's answer is the **burn rate**: "how fast,
relative to the SLO, the service consumes the error budget"
([Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)).

Take a 99.9% SLO over 30 days. The budget is 0.1% of requests. In the workbook's words, "a constant
0.1% error rate uses exactly all of the error budget: a burn rate of 1." A burn rate of 14.4 is an
error rate of 1.44%, and it spends the 30-day budget in 30 ÷ 14.4 ≈ 2 days. Read it the other way: an
hour at 14.4 spends 14.4 × 1 h ÷ 720 h = **2% of the month's budget**. That is the workbook's threshold
for waking someone.

The SLI does not have to be errors. For "99.9% of `POST /orders` requests finish within 250 ms", a bad
event is a slow request. It is counted exactly as the histogram's total minus its count at or below the
0.25 s boundary. That only works if a bucket edge sits on the threshold, which is why
[[why-percentiles-dont-aggregate]] puts one there. 0.25 s is one of the semconv HTTP boundaries, so here
it is already present.

```quiz 01M48XXRWG98DQ590CZN9CCJMD
A service has a 99.9% SLO over 30 days. Over the last hour, 1.44% of its requests were bad. What does
that mean for the error budget?

- [x] Burn rate 14.4: 2% of the budget gone, all of it in two days
  > 1.44% ÷ 0.1% is 14.4. One hour is 1/720 of the month, so 14.4 ÷ 720 is 2% of the budget, and at
    that pace it lasts 30 ÷ 14.4 ≈ 2 days. That is the workbook's fast-burn page.
- [ ] Burn rate 1.44: on track to spend about the whole month's budget
  > A burn rate is the error rate divided by the budget rate, 1.44% ÷ 0.1%, not the error rate
    itself. A burn rate of 1 would be a constant 0.1%.
- [ ] Burn rate 14.4: 14.4% of the budget gone in this one hour alone
  > The ratio is right but the arithmetic is not. An hour at burn rate 1 spends 1/720 of the budget, so
    an hour at 14.4 spends 14.4/720, which is 2%.
- [ ] Within SLO: the target allows up to 0.1% of the month to be bad
  > The SLO is measured over 30 days, but the budget is spent in real time. At this rate nothing is
    left in two days, which is why the alert looks at the rate and not the 30-day total.
```

## Multiwindow, multi-burn-rate

One threshold on one window is a bad pager. A short window fires on every blip. A long window is slow
to fire and slow to stop: the alert keeps firing for an hour after the fix, because the bad minutes are
still inside the hour. The workbook scores alert designs on **precision**, **recall**, **detection
time** and **reset time** ("how long alerts fire after an issue is resolved"). Its recommendation for a
99.9% SLO trades them off with three alerts, each confirmed by a window one-twelfth as long:

| Severity | Long window | Short window | Burn rate | Budget consumed |
| --- | --- | --- | --- | --- |
| Page | 1 hour | 5 minutes | 14.4 | 2% |
| Page | 6 hours | 30 minutes | 6 | 5% |
| Ticket | 3 days | 6 hours | 1 | 10% |

An alert fires only when **both** of its windows exceed the burn rate. The long window says the problem
is big enough to matter, and the short window says it is still happening. The workbook's example shows
the gain: the 1-hour alert "exhibits a better reset time by ceasing to fire five minutes later, rather
than one hour later."

Detection time is the cost, and it is worth being able to work out. Suppose `POST /orders` normally
has 0.05% slow requests and jumps to 4% at 14:02. The hourly ratio crosses 1.44% once
(0.05% × (60 − t) + 4% × t) ÷ 60 > 1.44%, which is at t ≈ 21 minutes. The page arrives at about 14:23,
when 2% of the budget has gone. A bigger fire crosses sooner. A small, slow one is caught by the 6-hour
alert or the 3-day ticket.

One honest limit: at low traffic every ratio is noisy. The workbook's example is "if a system receives 10
requests per hour, then a single failed request results in an hourly error rate of 10%". Burn-rate
alerting needs enough events for a percentage to mean something.

```quiz 01M48XXRWGD8Q27WK53E1X53Q3 cloze
For a 99.9% SLO, the workbook pages at burn rate {{14.4}} over {{1 hour}}, confirmed by a {{5-minute}}
window. That is {{2%}} of the 30-day budget. The short window is {{1/12}} of the long one, and it exists
to improve {{reset time}}: the alert stops soon after the problem does.
```

## The walk-through, one join key at a time

The page fires at 14:23. Each step below names what you read, what it gives you, and the key that gets
you to the next step.

| Step | What you read | What it gives you | Join key to the next step |
| --- | --- | --- | --- |
| 1. Alert | the burn rate over 1 h and 5 min | which SLI, since when | metric name, time window |
| 2. Histogram | `http.server.request.duration` by `http.route` | which route, which minute, which bucket | route, bucket, timestamp |
| 3. Exemplar | one real measurement in the slow bucket | one slow request | **trace id**, span id |
| 4. Trace | that request's spans | the slow hop | **trace id** |
| 5. Logs | records where `TraceId` matches | why the hop was slow | resource on the record |
| 6. Resource | `service.version`, `service.instance.id` | which deployment | — |

**Step 2: the histogram localises.** The SLI is one number, and the histogram behind it can be split.
Broken down by `http.route`, the slow-bucket counts have risen on `POST /orders` and nowhere else, from
14:02. Merging buckets across pods is what makes this exact, which is the subject of
[[why-percentiles-dont-aggregate]].

**Step 3: an exemplar is the jump from aggregate to example.** The OTel metrics data model defines an
exemplar as "a recorded value that associates OpenTelemetry context to a metric event": the value, its
timestamp, and the trace and span id that were current when it was recorded
([data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)). For an explicit-bucket
histogram, the SDK keeps **at most one exemplar per bucket**
([metrics SDK](https://opentelemetry.io/docs/specs/otel/metrics/sdk/)). So a 2.8 s exemplar in the
2.5–5 s bucket is a real request that was that slow, and the trace id on it is the key. Backends draw
exemplars as points on the latency chart that link to a trace. That UI is the vendor's; the data is OTel's.

**Step 4: the trace localises the hop.** Of 2.8 s, 2.6 s is one `HttpClient` span to the payment
gateway, and most of it is before the request is even sent.

**Step 5: the logs say why.** Filter the logs on that trace id and the payment client's lines say it
waited 2.4 s for a pooled connection. The logs carry the trace id because the host puts it on every line,
as [[structured-logging-in-dotnet]] shows. This step works **even when the trace itself was never kept**.
In .NET, a root span that the sampler drops still gets an `Activity` carrying only the propagation data,
so its trace id is preserved, as [[sampling-traces-head-tail-and-what-you-lose]] explains. A request
with no trace still has logs you can find by its trace id.

**Step 6: the resource says where.** Every span and log record carries the same **resource**, set once
when the SDK starts: `service.name`, `service.version`, the instance. The slow lines all come from
`service.version` 2.5.0, which shipped at 14:00 with a smaller connection-pool limit. The response is
to roll back, and only then debug.

Notice that the trace id is the key three times (exemplar → trace → logs). That is why "put the trace
id in the logs" is the core answer, and everything else in the chain builds on it.

## The code: exemplars are off in .NET until you turn them on

The OTel spec says the default `ExemplarFilter` "SHOULD be `TraceBased`": only "measurements ...
recorded in the context of a sampled parent span" are eligible
([metrics SDK](https://opentelemetry.io/docs/specs/otel/metrics/sdk/)). **The .NET SDK departs from
this on purpose.** Exemplars are "off by default (`ExemplarFilterType.AlwaysOff`)", because "there is a
performance cost associated with Exemplars so OpenTelemetry .NET has taken a more conservative stance"
([OTel .NET: customizing the metrics SDK](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/metrics/customizing-the-sdk/README.md#exemplars)).
So in .NET, step 3 does not exist until someone adds one line:

```csharp
// Program.cs. The same wiring as any OTel service, plus the one line that makes step 3 possible.
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("checkout-api", serviceVersion: "2.5.0"))   // step 6
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation())
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()                      // http.server.request.duration
        .SetExemplarFilter(ExemplarFilterType.TraceBased))   // off by default in .NET
    .WithLogging()                                           // TraceId on every record: step 5
    .UseOtlpExporter();
```

There is no exemplar API to call. The SDK takes exemplars from ordinary `Meter` recordings, provided a
sampled `Activity` is current when the value is recorded. ASP.NET Core arranges this on purpose for its
own duration metric. Its hosting code stops the request activity only after recording the metric:
"This order means the activity is ongoing while the metric is recorded and libraries like OTEL can
capture the activity as a metric exemplar"
([HostingApplicationDiagnostics.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Hosting/Hosting/src/Internal/HostingApplicationDiagnostics.cs)).
Your own `Histogram.Record` gets the same benefit if it runs inside the span it measures, and none if it
runs after `using var activity` has ended. `SetExemplarFilter` arrived in 1.9.0, and
`OTEL_METRICS_EXEMPLAR_FILTER=trace_based` sets it without code.

Two caveats. First, the exporter and the backend both have to carry exemplars. OTLP does, but a
backend has to store them and link them to a trace store. Second, an attribute a View drops from the
metric is **kept on its exemplars** as a "filtered tag". So if the View exists to redact something,
exemplars put it back, and the .NET docs say the View "alone is **not** sufficient when Exemplars are
enabled".

```quiz 01M48XXRWGVQTPTBKRBF40XWDG
A .NET service exports traces and metrics over OTLP, and its traces are kept at 100%. The latency chart
shows no exemplars at all, on any bucket. What is the most likely cause?

- [x] The .NET SDK leaves the exemplar filter on AlwaysOff by default
  > .NET deliberately departs from the spec's TraceBased default. No measurement is eligible until
    `SetExemplarFilter(ExemplarFilterType.TraceBased)` or `OTEL_METRICS_EXEMPLAR_FILTER` turns it on.
- [ ] Head sampling dropped the spans that the exemplars would point at
  > Traces are kept at 100% here, so every span is sampled. Sampling thins exemplars out. It does
    not remove all of them while traces are still being kept.
- [ ] The histogram needs a separate exemplar API call on each Record
  > There is no exemplar API. The SDK takes them from ordinary `Meter` recordings made while a sampled
    `Activity` is current.
- [ ] The cardinality limit folded every bucket into the overflow series
  > Overflow folds attribute sets past the limit into one series. That series still has buckets, and
    those buckets can still hold exemplars.
```

## What would have hidden the cause

The interviewer's second follow-up is usually "and what if that didn't work?". Each step has a
specific way to fail:

- **No exemplar on the slow bucket.** Under `TraceBased`, only measurements inside a sampled span are
  eligible. At 1% head sampling and low traffic, the slow bucket can go a whole collection interval
  without one. Without exemplars, query traces by route and time window instead. And if the default
  filter was never changed, there are no exemplars in .NET at all.
- **No trace for the request.** Head sampling chose before the request was slow, so the trace may not
  exist. The logs still carry its trace id, so step 5 survives. A business correlation id in a scope
  gets you the order's other requests.
- **The route folded into overflow.** If someone added an unbounded tag to the same histogram, then once
  past 2000 attribute sets the SDK folds new series into `otel.metric.overflow=true`
  ([[metric-instruments-and-cardinality]]). The burn-rate alert still fires on the total, but step 2
  cannot say which route.
- **The reason was logged below the production level.** If the pool-wait line was `Debug` and
  production runs at `Information`, step 5 returns the request's lines without the one that explains
  it. A canonical log line per request at `Information`, with the pool wait as a field, is the fix.
- **No bucket edge on the SLI threshold.** The bad-event count becomes an interpolation, so the burn
  rate itself is an estimate.

```quiz 01M48XXRWGMKEKH7P3VY0A9CBN recall
"p99 on checkout doubled at 14:02 and the pager went off. Walk me through it, and name the key that
gets you from each step to the next." Answer in under two minutes, then say what could have hidden it.

> **Alert**: a multiwindow burn-rate alert (14.4 over 1 h, confirmed over 5 min, which is 2% of a
> 99.9% budget) says the budget is burning and is still burning. **Histogram**: split
> `http.server.request.duration` by `http.route`: the slow buckets rose on `POST /orders` from 14:02.
> **Exemplar** in the slow bucket gives a real request's **trace id**. **Trace**: the time is in the
> payment-gateway call, waiting for a connection. **Logs filtered by trace id** say it waited 2.4 s for
> a pooled connection. **Resource attributes** say every such line is from `service.version` 2.5.0,
> which shipped at 14:00. Roll back.
>
> **What could have hidden it**: no exemplar (in .NET they are AlwaysOff until `SetExemplarFilter`, and
> under TraceBased only sampled spans qualify); no trace (head sampling), although the logs still carry
> the trace id; the route folded into `otel.metric.overflow`; the reason logged at Debug in an
> Information-level production; no bucket edge at the SLO threshold.
```

## The same idea, elsewhere

The chain and its keys come from OTel, not from .NET. The spec defines `OTEL_METRICS_EXEMPLAR_FILTER`
for every SDK, with a default of `trace_based`, so the .NET default is the exception to check for. The
alert itself usually lives in the metrics backend rather than in code. The workbook writes its
single-window version in PromQL as `job:slo_errors_per_request:ratio_rate1h{job="myjob"} > (14.4*0.001)`. The
multiwindow form joins that with `and` to the same expression over `ratio_rate5m`.

## What to take away

**Burn rate** is the error rate divided by the budget rate. For a 99.9% SLO, 14.4 for an hour spends
2% of the month's budget. Page on **both** a long and a short window (14.4 over 1 h/5 min, 6 over 6 h/30
min, ticket at 1 over 3 d/6 h), so the alert is significant, still true, and stops soon after the fix.
Then walk the chain and name the key at each step: **alert → histogram by route → exemplar's trace id
→ trace → logs by trace id → resource attributes**. In .NET, exemplars are **off by default**:
`SetExemplarFilter(ExemplarFilterType.TraceBased)` turns them on. Logs keep the trace id even for an
unsampled request. Finish by saying what would hide the cause: sampling, overflow, log level, and
bucket edges.

Worth reading in full: the Google SRE workbook's
[Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/). It builds the multiwindow,
multi-burn-rate alert in six iterations, scoring each on precision, recall, detection time and reset
time. That scoring is how to defend whichever alert you propose in an interview.
