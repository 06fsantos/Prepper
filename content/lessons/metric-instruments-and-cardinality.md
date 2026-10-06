---
id: 01M48WYW8NT8H9EX59F2YE0VZF
title: Metric instruments and cardinality
topic:
  - observability
prerequisites:
  - metrics-logs-and-the-golden-signals
  - opentelemetry-api-sdk-collector-otlp
---

Choosing a metric instrument is **a statement about how its numbers combine**, and adding a label
is **a promise about how many time series will exist**. Both are decided in code, once, and both
are expensive to get wrong later. In an interview, "we track average latency per user" is the vague
answer. The fluent one makes three claims:

- the instrument follows from two questions: **does it only go up**, and **can it be summed across
  instances**;
- every distinct combination of label values is **its own series**, so a label holds a bounded set
  (route, method, status) and **never a user id**;
- when a label does explode, the OTel SDK **folds the excess into one overflow series** at 2000 per
  metric, and nothing fails loudly.

What a metric is, and the Counter-plus-Histogram pair behind the golden signals, is
[[metrics-logs-and-the-golden-signals]]. How percentiles come out of a histogram, and why they
cannot be averaged, is [[why-percentiles-dont-aggregate]]. This Lesson is about everything else on
the instrument and its labels.

## Two questions pick the instrument

The [OTel metrics API](https://opentelemetry.io/docs/specs/otel/metrics/api/) defines four kinds
of instrument, and three of them come in two forms. Every .NET `Meter` exposes the same set.

| Instrument    | Goes                  | Summed across instances?  | Typical use                        |
| ------------- | --------------------- | ------------------------- | ---------------------------------- |
| Counter       | up only               | yes                       | requests served, bytes sent        |
| UpDownCounter | up and down           | yes                       | requests in flight, queue depth    |
| Gauge         | anywhere              | **no**                    | CPU %, temperature, oldest-item age |
| Histogram     | n/a, a distribution   | yes, bucket by bucket     | durations, payload sizes           |

The spec's wording is the clearest statement of the additivity column. A Counter "supports
non-negative increments" and an UpDownCounter "supports increments and decrements". A Gauge records
"non-additive value(s)", and its example is the point: "it makes no sense to record the background
noise level value from multiple rooms and sum them up". The asynchronous UpDownCounter is the mirror
image: "it makes sense to report the heap size from multiple processes and sum them up, so we get the
total heap usage".

Additivity matters because a backend **combines series all the time**: when a dashboard shows a
service rather than a pod, when it rolls ten-second points into a minute, when you remove a label.
For a sum that combination is addition, and the
[data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) says so: "In OpenTelemetry
Sums always have an aggregate function where you can combine via addition." A gauge has no such
function, and "'last sample value' is used" instead. So queue depth recorded as an UpDownCounter
gives you the total backlog across eight pods. Recorded as a gauge, the same number is either one
pod's reading or a sum the backend was never told was meaningful.

Each instrument except Histogram also comes in an **observable** (asynchronous) form, where you hand
the SDK a callback and it reads the value at collection time instead of you reporting each change.
The choice between the two is about where the number already lives. The spec puts it this way for
the up-and-down case: if "the pre-calculated value is already available or fetching the snapshot of
the 'current value' is straightforward, use Asynchronous UpDownCounter instead." A queue that knows
its own `Count` wants a callback; requests in flight, which only exist as `+1` on entry and `-1` on
exit, want `Add`.

```quiz 01M48WYW8PTZZXYM407XJJJX6G
Eight pods each consume from a work queue, and each knows its local backlog as `queue.Count`. You
want one line on the dashboard: total backlog for the service. Which instrument records it?

- [x] An observable UpDownCounter, with a callback that returns `queue.Count`
  > Backlog is additive, so the eight series sum to the service total. The value already exists,
    so a callback read at collection time is simpler than calling `Add` on every enqueue.
- [ ] An observable Gauge, with a callback that returns `queue.Count`
  > A gauge declares the value non-additive. The backend then has no sum to combine the eight
    pods with, and usually keeps the last sample instead of the total.
- [ ] A Counter, incremented by one each time a message is enqueued
  > A counter can only go up, so it tracks messages ever enqueued. The backlog also falls as
    messages are consumed, and a counter cannot say so.
- [ ] A Histogram, recording `queue.Count` once on every enqueue
  > That gives the distribution of backlog sizes seen at enqueue time, sampled unevenly. It
    answers "how big did it get", not "how big is it now".
```

## Every label combination is a series

A metric is not one stream of numbers. It is one stream **per distinct set of label values**. The
[Prometheus naming guide](https://prometheus.io/docs/practices/naming/) puts it in one line: "every
unique combination of key-value label pairs represents a new time series, which can dramatically
increase the amount of data stored. Do not use labels to store dimensions with high cardinality
(many different label values), such as user IDs, email addresses, or other unbounded sets of values."

The count multiplies. `http.server.request.duration` with 40 routes, 5 methods and 8 status codes
is up to 40 × 5 × 8 = 1,600 series per instance, and a histogram stores a count for **every bucket**
of every one of them. OTel's default explicit buckets number fifteen boundaries, so it is closer to
25,000 numbers. Add a `user.id` label with a million users and the product is no longer a metric. It
is a database you are paying for by the series.
[Microsoft's guidance](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)
gives the rule of thumb in numbers: "likely less than 1000 combinations for one instrument is safe",
for histograms "safe limits could be 10-100 times lower", and "if you anticipate a large number of
unique tag combinations, then logs, transactional databases, or big data processing systems may be
more appropriate".

That last sentence is the interview answer to "can we see latency per customer?". **The metric
answers "how many and how fast", bounded. Per-customer questions go to logs or traces**, which are
indexed by event rather than pre-aggregated by label, and where a customer id costs one field on a
record rather than a new series. The same rule is why semantic conventions demand `http.route`
(`/orders/{id}`) and never the raw path: an order id in a label is a user id by another name.

```quiz 01M48WYW8PAWD76YVCQ52CWF7C cloze
Every unique combination of label values is a separate {{time series}}, so the count of series is the
{{product}} of each label's distinct values. A histogram multiplies that again by its number of
{{buckets}}, which is why its safe limit is lower. A dimension with an unbounded set of values, such as
a {{user id}}, belongs in {{logs or traces}} rather than in a metric label.
```

## What the SDK does when a label explodes

Cardinality is not only a bill. Each series is memory in the process that records it, so the OTel
SDK caps it. The [SDK spec](https://opentelemetry.io/docs/specs/otel/metrics/sdk/) sets "the default
value of 2000" series per metric, and defines what happens past it: measurements that cannot get a
series of their own are aggregated into "an overflow attribute set ... containing a single attribute
`otel.metric.overflow` having (boolean) value `true`". The
[.NET SDK](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/metrics/README.md)
has done this by default since 1.10.0: "Instead of dropping those measurements, the SDK aggregates
them into a synthetic metric point with a single attribute: `otel.metric.overflow=true`."

So the totals stay right and **the breakdown quietly goes wrong**. The first 2000 combinations keep
their labels, and everything after lands in one unlabelled bucket. Nothing throws and nothing logs.
The symptom is a dashboard where a growing share of traffic belongs to no route. That is worth
saying in an interview, because "it overflows silently" is the kind of thing only someone who has
seen it knows.

The limit is per metric, set through a view. Raising it is the wrong first move: the fix is a
bounded label, and the limit is the tripwire that tells you which label wasn't.

## Instruments in .NET

`System.Diagnostics.Metrics` is .NET's metrics API, so none of this references OpenTelemetry. In an
app with dependency injection the `Meter` comes from `IMeterFactory`; a synchronous `Gauge<T>` needs
.NET 9 or later, while the observable forms are older.

```csharp
public sealed class CheckoutMetrics
{
    private readonly Counter<long> _orders;
    private readonly UpDownCounter<long> _inFlight;

    public CheckoutMetrics(IMeterFactory meterFactory, IOrderQueue queue)
    {
        Meter meter = meterFactory.Create("Shop.Checkout");

        // Only goes up: a total, and a rate per second once the backend differentiates it.
        _orders = meter.CreateCounter<long>("shop.orders.placed", unit: "{order}");

        // Goes up and down, and is additive: summed across pods, it is the service's in-flight total.
        _inFlight = meter.CreateUpDownCounter<long>("shop.checkouts.active", unit: "{checkout}");

        // Additive, and the queue already knows the value: read it at collection time.
        meter.CreateObservableUpDownCounter("shop.queue.depth", () => queue.Count, unit: "{message}");

        // Not additive: the age of the oldest message is a max, and summing eight pods' ages is noise.
        meter.CreateObservableGauge("shop.queue.oldest_age",
            () => queue.OldestEnqueuedAt is { } t ? (DateTimeOffset.UtcNow - t).TotalSeconds : 0.0,
            unit: "s");
    }

    public IDisposable TrackCheckout()
    {
        _inFlight.Add(1);
        return new Decrement(_inFlight);
    }

    public void OrderPlaced(string paymentMethod) =>
        // Bounded: a handful of payment methods. Never the customer id or the order id.
        _orders.Add(1, new KeyValuePair<string, object?>("shop.payment.method", paymentMethod));

    private sealed class Decrement(UpDownCounter<long> counter) : IDisposable
    {
        public void Dispose() => counter.Add(-1);
    }
}
```

```csharp
// Program.cs: the SDK owns the limit. A tighter cap on a metric whose label set you know is small
// turns a future label mistake into an overflow series you can alert on, rather than a bill.
builder.Services.AddOpenTelemetry()
    .WithMetrics(m => m
        .AddMeter("Shop.Checkout")
        .AddView("shop.orders.placed", new MetricStreamConfiguration { CardinalityLimit = 50 }));
```

Two details in it are the ones an interviewer probes. The observable instruments are **not stored in
fields**: the meter holds them, and Microsoft warns that assigning one to a static is "error prone,
because C# static initialization is lazy and the variable is usually never referenced". And the
callbacks run on the collection thread, in sequence, so they must be cheap reads. A callback that
queries a database delays every other metric in the export.

## Pull or push, delta or cumulative

How the numbers leave the process is a second design choice, and it has two axes.

**Pull versus push.** Prometheus **pulls**: it scrapes an HTTP endpoint on each instance. That gives
it a health check for free, and its [own docs](https://prometheus.io/docs/practices/pushing/) list
what pushing through its Pushgateway gives up: it "becomes both a single point of failure and a
potential bottleneck", "you lose Prometheus's automatic instance health monitoring via the `up`
metric", and it "never forgets series pushed to it". Their conclusion: "the only valid use case for
the Pushgateway is for capturing the outcome of a service-level batch job", a job that is gone before
any scrape could reach it. OTLP is **push**: the SDK sends on a timer. A Collector can bridge the
two in either direction, so the choice is about who knows the list of targets, not about which
standard you picked.

**Cumulative versus delta temporality.** A cumulative point reports the total since a fixed start:
"Successive data points repeat the starting timestamp". A delta point reports only what happened
since the last one: "Successive data points advance the starting timestamp"
([data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)). Cumulative is robust,
because a lost export is filled in by the next total. Its cost is the cardinality point again:
"Cumulative data requires the sender to remember all previous measurements, an 'up-front' memory cost
proportional to cardinality". Delta "supports shifting the cost of cardinality outside of the
process". Prometheus is cumulative, several vendor backends prefer delta, and the SDK asks the
exporter. If the exporter does not say, "the Cumulative temporality SHOULD be used"
([SDK spec](https://opentelemetry.io/docs/specs/otel/metrics/sdk/)).

```quiz 01M48WYW8PP10A1BY2R41E994N
A nightly reconciliation job runs for four minutes and exits. Your platform scrapes every service
with Prometheus. How should the job report how many records it reconciled?

- [x] Push the final count to a Pushgateway as the job finishes
  > This is the one case Prometheus endorses: a service-level batch job that exits before any
    scrape could reach it. The gateway holds the result until the next scrape.
- [ ] Expose a `/metrics` endpoint and let Prometheus scrape it
  > A scrape every fifteen seconds or minute may never land inside a four-minute run, and after
    the process exits the endpoint is gone along with the count.
- [ ] Push every service's metrics through the Pushgateway for consistency
  > Then the gateway is a single point of failure for all of them, the `up` health signal is lost,
    and series from dead instances linger until someone deletes them.
- [ ] Log the count and let the dashboard parse it from the log line
  > That works, but it moves a number that should be a metric into the expensive signal, and an
    alert on it now waits on log ingestion delay.
```

## The same idea, elsewhere

The OTel instruments are identical in every language's OTel API. The vocabulary that differs is
Prometheus's. Its [client libraries](https://prometheus.io/docs/concepts/metric_types/) offer
Counter, Gauge, Histogram and **Summary**. A Prometheus gauge is "a single numerical value that can
arbitrarily go up and down", so it covers both OTel's UpDownCounter and OTel's Gauge, and the
additive-or-not distinction is left to whoever writes the query. A Summary computes quantiles inside
the process, which is exactly what cannot be combined across instances. OTel has no Summary
instrument, and [[why-percentiles-dont-aggregate]] is the reason. The cardinality rule is the same in
all of them, because it is a property of time-series storage, not of a library.

```quiz 01M48WYW8PNQAGDXCY7T6TVJAH recall
A product manager asks for a dashboard of "average checkout latency per customer, so we can see who's
having a bad time". Respond as you would in a design round: what do you build, what do you refuse,
and why?

> **Refuse the label, keep the question.** A customer id on a latency metric makes one series per
> customer (times every bucket, because latency is a histogram), which is unbounded. The OTel SDK
> would fold everything past 2000 series into an `otel.metric.overflow` bucket, and any backend would
> bill for the rest.
>
> **Build**: `http.server.request.duration` as a histogram in seconds, labelled with bounded values
> only (route, method, status), giving percentiles per route rather than an average. **For "who"**:
> put the customer id on the request's log line and span, then query them. That is the slow-request
> list filtered by customer, or a top-N computed from logs. If the PM really needs a per-segment
> view, use a bounded proxy such as plan tier or region.
```

## What to take away

Pick an instrument with two questions: **does it only go up** (Counter) or move both ways
(UpDownCounter), and **can it be summed across instances** (an UpDownCounter can, a Gauge cannot).
Use the **observable** form when the value already exists, and keep its callback cheap. **Every label
combination is a series**, histograms multiply that by their buckets, and so a label holds route,
method or status, **never a user or order id**. Those go on logs and spans. The OTel SDK caps each
metric at **2000** series and folds the rest into **`otel.metric.overflow=true`**, silently, so the
total stays right and the breakdown does not. Prometheus **pulls** and keeps the Pushgateway for batch
jobs. OTLP **pushes**. **Cumulative** temporality is robust but costs memory proportional to
cardinality, while **delta** moves that cost out of the process.

Worth reading in full: Microsoft Learn's
[Creating Metrics](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation).
It walks every instrument type in C#, gives the best-practice notes for choosing one, and contains the
plainest statement anywhere of what a customer id in a tag does to a metric.
