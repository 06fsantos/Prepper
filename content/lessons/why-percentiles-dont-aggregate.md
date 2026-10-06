---
id: 01M48X890QZN7AYZA42GQ959AW
title: Why percentiles don't aggregate
topic:
  - observability
prerequisites:
  - metric-instruments-and-cardinality
---

A percentile is **a position in a sorted list**, and positions do not add. Forty pods each
reporting their own p99 give you forty numbers, and no arithmetic on those forty numbers gives
you the service's p99, because the list that number came from is gone. In an interview, "we
average the p99s across instances" is the vague answer. The fluent one makes three claims:

- you export **the distribution, not the percentile**: a histogram's bucket counts, which add
  across instances, and the percentile is computed **last**, after the merge;
- what that costs is **precision**: a percentile read from buckets is an estimate within one
  bucket, so the boundaries are a design decision, and one belongs **on the SLO threshold**;
- durations go in **seconds, as a double**, and the OTel SDK's default boundaries were drawn for
  milliseconds, so seconds recorded against them land in **one bucket**.

Why latency is a golden signal and why it is read as a percentile rather than an average is
[[metrics-logs-and-the-golden-signals]]. What a Histogram is next to the other instruments, and why
every label multiplies its buckets, is [[metric-instruments-and-cardinality]].

## Forty p99s are not a p99

Take two pods behind one load balancer over the same minute.

- **Pod A** serves 9,000 requests, all between 20 and 40 ms. Its p99 is **40 ms**.
- **Pod B** serves 1,000 requests: 850 at 100 ms and 150 that hit a cold cache and take **3 s**.
  Its p99 is **3 s**.

Pool all 10,000 requests and sort them. The slowest 150 are Pod B's three-second ones, which is
1.5% of the traffic, so the 99th percentile lands among them: the service's p99 is **3 s**.

Now try to recover that from what the two pods reported. The plain average of 40 ms and 3 s is
1.52 s, which halves it. Weighting by traffic, 0.9 × 40 ms + 0.1 × 3 s, gives 336 ms, which is
nine times too low and looks healthy. Neither is a rounding error. Both are the wrong kind of
operation. The p99 depends on **where the 99th-percentile request sits among all of them**, and
two summary numbers do not say how many requests sat near each one.

The [Prometheus docs](https://prometheus.io/docs/practices/histograms/) say it in one line:
"aggregating the precomputed quantiles from a summary rarely makes sense. In this particular case,
averaging the quantiles yields statistically nonsensical values."

There is one thing the per-pod p99s *do* tell you. The largest of them is an **upper bound**,
because at least 99% of every pod's requests sit at or under it, so at least 99% of all of them
do. It is a bound, though, not the answer, and it can be wildly loose.

```quiz 01M48X890RHMRVRCX43RNCHWPV
Pod A serves 9,950 requests, all under 40 ms. Pod B, a canary, serves 50 requests, and 5 of them
take 3 s, so its own p99 is 3 s. The dashboard shows the service p99 as the max of the per-pod
p99s. What does it show, and what is the true p99?

- [x] It shows 3 s; the true p99 is about 40 ms
  > Five slow requests out of 10,000 is 0.05% of traffic, far inside the fastest 99%. The max of
    per-pod p99s is a valid upper bound, and here it is 75 times too high.
- [ ] It shows 3 s; the true p99 is also 3 s
  > That holds only when the slow pod carries more than 1% of all traffic. The canary carries 0.5%,
    and only a tenth of that is slow.
- [ ] It shows 40 ms; the true p99 is about 3 s
  > The max takes the larger of 40 ms and 3 s, so it cannot show 40 ms. And 5 slow requests in
    10,000 are too few to reach the 99th percentile.
- [ ] It shows 1.5 s; the true p99 is about 3 s
  > 1.5 s is the plain average of the two p99s, not the max. Averaging is the operation the
    Prometheus docs call statistically nonsensical.
```

## Export the distribution, not the answer

There are two ways to ship latency out of a process, and they differ in **where the percentile is
computed**.

A **summary** computes it in the process. The instance keeps a sliding window of its own
observations and exports "p99 = 3 s". That is cheap to read and accurate for that instance, and it
is a dead end the moment you have two instances. Prometheus offers it as a client type. OpenTelemetry
has no Summary instrument at all, and its
[data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) keeps the point kind only
for importing other formats: it is "not recommended for new applications and exists for
compatibility with other formats", because it "cannot always be merged in a meaningful way".

A **histogram** exports what the percentile would have been computed *from*: a count of all
observations, their sum, and a count per bucket. Bucket counts are plain counters, so they add.
Merging forty pods is adding forty columns of numbers, and the percentile is read off the merged
column at query time. In the Prometheus docs' words: "Using histograms, the aggregation is perfectly
possible", and the rule they give is "Only if aggregation isn't needed, you can start thinking about
summaries."

Here is the two-pod example as histograms, on buckets in seconds:

| Bucket (s)    | Pod A | Pod B | Merged |
| ------------- | ----: | ----: | -----: |
| up to 0.05    | 9,000 |     0 |  9,000 |
| 0.05 to 0.1   |     0 |   850 |    850 |
| 0.1 to 2.5    |     0 |     0 |      0 |
| 2.5 to 5      |     0 |   150 |    150 |

Request number 9,900 in sorted order is past the first 9,850, so it is in the 2.5-to-5 bucket. The
merged p99 is **somewhere between 2.5 and 5 seconds**, and nothing about it depended on knowing
either pod's p99.

The count and the sum also give you the **mean exactly**: total sum over total count, merged the same
way. The average aggregates and the percentile does not, which is the whole asymmetry in one
sentence.

```quiz 01M48X890R6Y6C30AJF63BAZ2V cloze
A histogram exports a {{count}}, a {{sum}}, and a count for each {{bucket}}. Bucket counts from many
instances can simply be {{added}}, so the percentile is computed {{after the merge}}, at query time. A
summary instead computes the percentile {{inside the process}}, and those results cannot be combined.
```

## What a histogram costs: the bucket is the error bar

"Somewhere between 2.5 and 5 seconds" is the price. A backend reading a percentile out of a bucket
interpolates linearly inside it, which assumes the observations are spread evenly across the bucket.
Our 150 slow requests are all at 3 s, so request 9,900, which is the 50th of the 150, comes out at
2.5 + (50 ÷ 150) × 2.5 ≈ **3.3 s**. That is close here, but only because the bucket happened to be
narrow enough.

The Prometheus docs work through the case where it is not. A routing change adds 100 ms to every
request and puts the latency spike at 320 ms, where the histogram has a bucket from 300 to 450 ms:
"The 95th percentile is estimated to be 443ms, far away from the correct value close to 320ms." They
state the trade-off precisely. With a summary "you control the error in the dimension of φ", the
percentile rank. With a histogram "you control the error in the dimension of the observed value",
via the bucket layout.

That gives two rules for choosing boundaries:

- **Make buckets narrow where the answers you care about live.** For a web request that means many
  boundaries between about 5 ms and 1 s, and few above.
- **Put a boundary exactly on every SLO threshold.** "What fraction of requests finished within
  300 ms" is then a ratio of two bucket counts, which is exact. Without the boundary it is an
  interpolation. The Prometheus docs say the same thing about computing an Apdex score from classic
  buckets: "you _must_ have buckets present at the exact boundaries (giving you an accurate
  calculation in return)". This is the number an [[from-burn-rate-alert-to-the-log-line|SLO burn-rate
  alert]] is built on, so it should not be an estimate.

Bucket boundaries in OTel are "exclusive of their lower boundary and inclusive of their upper bound"
([SDK spec](https://opentelemetry.io/docs/specs/otel/metrics/sdk/)), so a request at exactly 300 ms
counts as within the 300 ms target.

## Seconds, and the default-bucket trap

Microsoft's [metrics guidance](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)
is unambiguous: "When recording measurements of time, prefer units of seconds recorded as a floating
point or double value." The OTel semantic convention agrees: `http.server.request.duration` is a
Histogram with unit `s`.

The trap is that the OTel SDK's default boundaries are
`[ 0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000 ]`, a layout that only
makes sense for milliseconds. Record seconds against it and, as Microsoft puts it, "sub-second request
durations would all fall into the `0` bucket", meaning every request under five seconds is one count in
one bucket. The p99 is then "somewhere between 0 and 5 seconds". Interpolated, the p50 reads about
2.5 s and the p99 just under 5 s, whatever the requests actually took.

Switching the unit to milliseconds to fit the defaults is the wrong fix. It breaks the convention every
dashboard and every other service follows. The right fix is to supply boundaries, and there are two
places to do it:

- **The instrument advises.** `InstrumentAdvice<T>`, added in version 9.0.0 of
  `System.Diagnostics.DiagnosticSource`, lets the code that creates the histogram recommend its own
  boundaries, and the OTel .NET SDK honours it from 1.10.0. This is the right place for a library,
  because the author knows what the instrument measures. The semantic conventions publish the advice
  for HTTP durations: `[ 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10 ]`.
- **The app overrides with a View.** The SDK's `AddView` replaces the aggregation for a named
  instrument, and per the
  [OTel .NET docs](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/metrics/customizing-the-sdk/README.md),
  "When both the View API and Advice API are used, the View API takes precedence."

```quiz 01M48X890RK2532TAP8CVVS176
A new service records `shop.search.duration` in seconds with no advice and no View, exported through the
OTel SDK. The dashboard says p50 ≈ 2.5 s and p99 ≈ 4.9 s, yet every trace you open finished in under
100 ms. What is the most likely cause?

- [x] Default buckets in milliseconds put every request in one 0-to-5 bucket
  > Every observation is one count in the 0-to-5 bucket. Linear interpolation then spreads them evenly
    across it, so the p50 reads mid-bucket and the p99 near its top, regardless of the real values.
- [ ] The traces are sampled, so the slow requests never reach the trace store
  > Sampling can hide slow traces, but it cannot make a p50 of 2.5 s. Half of all requests would have to
    be that slow, and you would find them in any sample.
- [ ] Averaging per-pod p99s inflated the number shown on the dashboard
  > Averaging p99s gives a wrong p99, but it cannot move the p50 up to 2.5 s when every request is fast.
    Both numbers wrong in the same pattern points at the buckets.
- [ ] The duration was recorded in milliseconds against the `s` unit
  > Milliseconds would read as 80 s for an 80 ms request, far above both numbers. The values are
    plausible seconds; they are just smeared across one bucket.
```

## Exponential histograms: no boundaries to choose

Choosing boundaries well needs you to know the distribution in advance, which is the thing you are
trying to measure. OpenTelemetry's other histogram removes the choice. In an **exponential histogram**,
boundaries "are located at integer powers of the `base`", where `base = 2**(2**(-scale))`
([data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)). Each bucket is a fixed
percentage wider than the one below it, so the error is **relative**: a few percent of the value at
5 ms and the same few percent at 5 s. At scale 3 the base is 2^(1/8), about 1.09, so a bucket spans
about 9% of the values in it.

The SDK picks the scale. It "SHOULD adjust the histogram scale as necessary to maintain the best
resolution possible, within the constraint of maximum size"
([SDK spec](https://opentelemetry.io/docs/specs/otel/metrics/sdk/)), with defaults of 160 buckets and a
maximum scale of 20. And merging still works across instances that chose different scales, because
"Buckets of an exponential Histogram with a given scale map exactly into buckets of exponential
Histograms with lesser scales", so the finer one is downscaled "without introducing error".

The trade-off is the SLO boundary. An exponential histogram has no bucket edge exactly at 300 ms, so
"fraction within 300 ms" becomes an estimate again, though a tight one. It also needs a backend that
stores the format. Prometheus's native histograms are the same idea, and the Prometheus docs now
recommend them first: "If you have access to native histograms, use them with a resolution that matches
your accuracy requirements."

## In .NET

The instrument, with advice in seconds and a boundary on the SLO threshold:

```csharp
public sealed class SearchMetrics
{
    private readonly Histogram<double> _duration;

    public SearchMetrics(IMeterFactory meterFactory)
    {
        Meter meter = meterFactory.Create("Shop.Search");

        _duration = meter.CreateHistogram<double>(
            "shop.search.duration",
            unit: "s",
            description: "Time to answer a search query",
            // Narrow where searches actually land, sparse above a second, and an edge exactly on the
            // 300 ms SLO so "fraction within target" is a ratio of counts rather than an estimate.
            advice: new InstrumentAdvice<double>
            {
                HistogramBucketBoundaries = [0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2.5, 5]
            });
    }

    public async Task<T> Time<T>(string index, Func<Task<T>> query)
    {
        long start = Stopwatch.GetTimestamp();
        try
        {
            return await query();
        }
        finally
        {
            // Seconds, as a double. Never milliseconds to suit someone's default buckets.
            _duration.Record(
                Stopwatch.GetElapsedTime(start).TotalSeconds,
                new KeyValuePair<string, object?>("shop.search.index", index));
        }
    }
}
```

```csharp
// Program.cs: the app can override the advice. A View wins over advice when both are set. This one
// trades the exact 300 ms edge for relative error everywhere, so use it only if the backend stores
// exponential histograms and the SLO alert can live with an estimate.
builder.Services.AddOpenTelemetry()
    .WithMetrics(m => m
        .AddMeter("Shop.Search")
        .AddView("shop.search.duration", new Base2ExponentialBucketHistogramConfiguration()));
```

Two things in it get probed. The histogram records **raw durations and never a percentile**: any
code that computes a p99 in the process and records *that* has rebuilt a summary. And every label
multiplies the bucket count, so ten boundaries is eleven counts per series. That is why the label
here is a handful of index names and not the query text.

## The same idea, elsewhere

The operation is the same in every stack: **sum the buckets, then take the quantile**. In PromQL it is
visible in the query itself, as `histogram_quantile(0.99, sum by (le) (rate(..._bucket[5m])))`. The
`sum by (le)` adds every instance's bucket counts per boundary (`le`, "less than or equal"), and only
then does `histogram_quantile` interpolate. The wrong query averages a summary's `quantile="0.99"`
series instead, and it returns a number with no meaning just as readily. The OTel specification
defines the same Histogram instrument, the same advisory boundaries parameter and the same two
aggregations for every language, so only the spelling of `InstrumentAdvice` is .NET's.

```quiz 01M48X890R67X25SXHQYM0KW4A recall
In a design round: "Our checkout service runs on 40 pods. Each one reports its p99 latency. How do we
put the service's p99 on the dashboard and alert when it breaches 300 ms?" Answer, and name what you
would change.

> **Change what the pods report.** Forty p99s cannot be combined: averaging them is meaningless and
> weighting them by traffic is still wrong, because the service's p99 depends on where the slow requests
> sit across all pods. The max is only an upper bound. Each pod should export a **histogram** of
> durations in **seconds**, meaning a count, a sum and per-bucket counts, with **no percentile** computed
> in the process.
>
> **Merge, then compute.** The backend sums bucket counts across pods per boundary and reads the p99 from
> the merged histogram. That reading is an estimate within one bucket, so boundaries are dense where
> checkouts land and **one sits exactly at 300 ms**, which makes "fraction within 300 ms" an exact ratio
> for the SLO alert. Supply the boundaries with `InstrumentAdvice` or a View, because the OTel defaults
> are millisecond-shaped and would put every sub-five-second request in one bucket. An exponential
> histogram removes the choice if the backend supports it, at the cost of the exact SLO edge.
```

## What to take away

**A percentile does not aggregate.** Averaging per-instance p99s is meaningless, weighting them is
still wrong, and the max is only an upper bound. **Export the distribution**: a histogram's count,
sum and bucket counts add across instances, the percentile is computed **after the merge**, and the
mean is exact from sum over count. A summary computes quantiles in-process and cannot be merged, so
OTel keeps it only for compatibility. The histogram's price is that **a percentile is an estimate
within one bucket**: make buckets dense where the answers live and **put a boundary on every SLO
threshold**. Record durations in **seconds, as a double**. The OTel default boundaries
(`0, 5, 10 … 10000`) are millisecond-shaped and put every sub-five-second request in one bucket, so
supply boundaries via **`InstrumentAdvice`** (library) or a **View** (app, which wins). **Exponential
histograms** pick their own buckets with bounded relative error and still merge exactly, at the cost of
the exact SLO edge.

Worth reading in full: Prometheus's
[Histograms and summaries](https://prometheus.io/docs/practices/histograms/). It is the clearest account
anywhere of where a quantile is computed, what each choice does to the error, and why the 95th
percentile came out as 443 ms when the truth was 320.
