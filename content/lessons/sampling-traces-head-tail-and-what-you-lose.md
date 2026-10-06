---
id: 01M48XKGE0GB36J2AJ3DWHHTWD
title: "Sampling traces: head, tail, and what you lose"
topic:
  - observability
  - distributed-tracing
prerequisites:
  - opentelemetry-api-sdk-collector-otlp
  - trace-context-across-retries
---

Keeping every trace is the most expensive thing an observability pipeline does, so almost everyone
samples. **Sampling is a decision about which traces will exist at all.** The interesting questions are
who makes that decision, when they make it, and what goes missing as a result. "We sample at 5%" is the
vague answer. The fluent one names three things:

- **head sampling** decides at the root, before anything has happened, and the `traceparent` sampled
  flag carries that decision downstream so every trace is kept whole or not at all;
- **tail sampling** decides after the trace is finished, so it can keep every error. The price is that
  every span of a trace must reach the same Collector, which holds them all in memory while it waits;
- **what you lose**: the request you were paged about may have no trace, a log line can carry a trace id
  that leads nowhere, and any rate computed from the traces that survived is wrong unless each one is
  weighted. Rates come from metrics, which are never sampled.

## "Sampled" means kept

The vocabulary is a trap worth avoiding out loud. The
[OTel sampling docs](https://opentelemetry.io/docs/concepts/sampling/) define a sampled trace as one
that "is processed and exported", and a not-sampled one as one that "is not processed or exported".
They also note that people get this backwards: saying you are "sampling out data" is, in the docs' words,
an incorrect statement. So "we sample 5%" means 5% is kept.

The same page states the case for sampling: "if the large majority of your requests are successful and
finish with acceptable latency and no errors, you do not need 100% of your traces". It is also clear
about when not to sample. If you produce "tens of small traces per second or lower", or only ever use
the data in aggregate, keep everything or pre-aggregate.

## Head sampling: decide at the root, carry the decision

"Head sampling is a sampling technique used to make a sampling decision as early as possible." The root
span's service decides, and the decision travels in the flags field of
[[trace-context-across-retries|`traceparent`]]. Every downstream service then has to agree with it.
Otherwise a kept trace would have holes in it wherever one service chose differently.

Two mechanisms keep that agreement:

- **Parent-based sampling.** A child honours its parent's flag. The
  [probability sampling spec](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)
  puts it as: "we expect the child's decision to match the parent's decision". The
  [SDK spec](https://opentelemetry.io/docs/specs/otel/trace/sdk/#built-in-samplers) makes it the
  default: "The default sampler is `ParentBased(root=AlwaysOn)`". So **an SDK left on its defaults
  samples everything**, and a root that is not told otherwise keeps 100%.
- **Deciding from the trace id.** A ratio sampler at the root does not roll a die. It compares the
  trace id against a threshold, so any service that applies the same ratio to the same trace reaches the
  same answer. The docs call this consistent, or deterministic, sampling: it "ensures that whole traces
  are sampled - no missing spans - at a consistent rate".

The spec forbids the one combination that would break this. A span marked sampled but not recorded
"could cause gaps in the distributed trace, and because of this the OpenTelemetry SDK MUST NOT allow
this combination."

Head sampling is cheap, simple and runs anywhere. Its limit is the one in its definition: "it is not
possible to make a sampling decision based on data in the entire trace." At the root, nobody yet knows
whether the request will fail. So **a 5% head sampler keeps 5% of the errors**, and each failed request
is 95% likely to have no trace at all.

There is one place where honouring the parent is wrong, and that is the public edge. The
[W3C recommendation](https://www.w3.org/TR/trace-context/#denial-of-service) warns that a service which
"naively continues any trace with the sampled flag set" lets an attacker "overwhelm an application with
tracing overhead" or "run up your tracing bill". At a trust boundary, decide again rather than inherit
the caller's choice. Inside the boundary, never re-decide, because a second decision is exactly how a
kept trace ends up with holes.

```quiz 01M48XKGE0KJQK9Q28ZWRSYFHW
Checkout runs head sampling at 1%, parent-based everywhere. A customer's payment failed at 14:02, and
support has its order id. What are the odds the failed request has a trace?

- [x] About 1%: the root decided before the failure happened
  > Head sampling chooses at the root, before the request has failed, so errors are kept at the same
    rate as everything else. Start from the order's correlation id in the logs instead.
- [ ] Nearly 100%: an error forces the sampled flag on
  > Nothing changes the flag after the fact. The root has already decided, and every downstream
    service honours that decision. Keeping errors needs tail sampling.
- [ ] About 1% per service, so the trace has gaps in it
  > Parent-based sampling exists to prevent exactly this. Every service follows the root, so a
    trace is kept whole or not at all.
- [ ] It depends on whether the Collector kept the spans
  > With head sampling the dropped spans were never exported. The Collector never received
    anything it could have kept.
```

The way back to that payment is the business **correlation id** carried beside the trace, which is
[[tracing-a-flow-through-a-message-broker]]'s answer to "traces are sampled and expire". This is the
case it was built for.

## What an unsampled span costs in .NET

Sampling saves export and storage, and in .NET it also saves most of the instrumentation cost.
[Microsoft's tracing concepts page](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts)
says a listener "can elect not to create the Activity at all, to create it with minimal information
necessary to propagate distributing tracing IDs, or to populate it with complete diagnostic
information." A full `Activity` is "created, populated, and transmitted in about a microsecond", and
sampling "can reduce the instrumentation cost to less than 100 nanoseconds for each Activity that isn't
recorded."

The OTel .NET SDK uses both of the cheap options, and which one it picks matters
([`TracerProviderSdk`](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry/Trace/TracerProviderSdk.cs)):

- When it drops a **root span, or a span whose parent is remote**, it still creates the `Activity`,
  with propagation data only. In the SDK source's words, this happens "so the trace ID is preserved even
  if no activity of the trace is recorded." Outbound calls therefore carry a `traceparent` with the flag
  at `00`, and downstream services follow the decision.
- When it drops a span with a **local** parent that was not sampled, it creates nothing, and
  `StartActivity` returns `null`.

```csharp
// Program.cs: one sampler per provider. Parent-based, 5% at the root.
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("checkout-api"))
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSource("Shop.Checkout")
        .SetSampler(new ParentBasedSampler(new TraceIdRatioBasedSampler(0.05))))
    .UseOtlpExporter();

// A public-facing edge re-decides a caller's "sampled" instead of inheriting it:
//   new ParentBasedSampler(
//       rootSampler: new TraceIdRatioBasedSampler(0.05),
//       remoteParentSampled: new TraceIdRatioBasedSampler(0.05))
```

```csharp
// BCL only. In 95% of requests this activity is null, and the code has to be cheap for that case.
public sealed class QuoteService(IPricingClient pricing)
{
    private static readonly ActivitySource Source = new("Shop.Checkout");

    public async Task<Quote> PriceAsync(Cart cart, CancellationToken ct)
    {
        using Activity? activity = Source.StartActivity("PriceCart");

        if (activity is { IsAllDataRequested: true })   // recorded: worth paying for the detail
            activity.SetTag("shop.cart.distinct_skus", cart.Lines.DistinctBy(l => l.Sku).Count());

        return await pricing.PriceAsync(cart, ct);
    }
}
```

Two .NET names map onto the spec. `IsAllDataRequested` is the spec's `IsRecording`: it tells you
whether paying for an expensive attribute is worth it. `Activity.Recorded` is the sampled flag. A plain
`activity?.SetTag(...)` already costs nothing when the activity is `null`. The guard is for work done
*before* the call, such as the `DistinctBy` here.

The parent-based default also has a silent trap. The
[OTel .NET docs](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md#troubleshooting-spans-dropped-due-to-an-unsampled-parent)
describe an app that registers its own source but not the ASP.NET Core instrumentation. ASP.NET Core
still creates a request activity, and because nobody samples it, it is not recorded. "The default
`ParentBased` sampler then drops the custom activity because its parent was not recorded." The symptom
is that your spans never appear, with no error anywhere. The fix is to add
`AddAspNetCoreInstrumentation()`.

## Tail sampling: decide after, keep what matters

"Tail sampling is where the decision to sample a trace takes place by considering all or most of the
spans within the trace." It runs in the Collector, so the services export every span (or every
head-sampled span), and the Collector applies policies once a trace has finished. With the
[tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md),
the usual shape is to keep every trace with an error, keep every trace slower than the SLO, and keep a
small percentage of the rest. A trace is kept when any policy votes to keep it, unless an explicit
`drop` policy says otherwise.

The price is in the processor's first paragraph: "All spans for a given trace MUST be received by the
same collector instance for effective sampling decisions." Spans from twelve services reach the gateway
over twelve connections. A round-robin load balancer in front of three Collectors gives each Collector a
third of each trace, so each one judges a fragment. An error span on Collector A cannot save the slow
spans sitting on Collector C. So the processor's docs prescribe **two tiers**: "one with the load
balancing exporter, and one with the tail sampling processor." The first tier routes by trace id. The
[load-balancing exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md)
defaults to that for traces, so "spans belonging to the same `traceID` ... will be sent to the same
backend".

```yaml
# Tier 1, stateless: route every span of a trace to the same tier-2 instance.
exporters:
  load_balancing:
    routing_key: traceID
    protocol:
      otlp: {}
    resolver:
      dns: { hostname: otelcol-sampler-headless.observability.svc.cluster.local }

# Tier 2, stateful: hold each trace, then decide.
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    policies:
      - { name: errors, type: status_code, status_code: { status_codes: [ERROR] } }
      - { name: slow,   type: latency,     latency: { threshold_ms: 2000 } }
      - { name: rest,   type: probabilistic, probabilistic: { sampling_percentage: 1 } }
```

Tier 2 **is a buffer**, and a buffer has the usual failure. The processor holds spans in memory for
`decision_wait` (default 30s) across up to `num_traces` traces (default 50000). It uses "a circular
buffer ... When a new trace arrives, the oldest trace is removed. This can cause a trace to be dropped
before it's sampled". When that happens, the metric `sampling_trace_dropped_too_early` rises. Spans that
arrive after the decision has left the buffer get a fresh decision, unless a decision cache is
configured. The OTel docs sum up tail sampling as "difficult to implement", "difficult to operate", with
components that "must be stateful systems that can accept and store a large amount of data". That is
the "has run this" signal an interviewer is listening for.

Two consequences follow from this:

- **Tail sampling saves on the backend, not on the wire.** Every span is still exported from every
  service. If the services themselves are the problem, put head sampling in front, which the docs
  describe as "protecting the telemetry pipeline from being overloaded".
- **The sampled flag no longer means "kept".** The services export everything, so the flag says
  "recorded upstream", and the real decision is made later. W3C anticipates this: a component that
  "deferred or delayed the decision" should propagate the flag unchanged.

```quiz 01M48XKGE01AGGP5WQ63445SB8
A team adds the tail sampling processor ("keep all errors") to their three gateway Collectors, which sit
behind a round-robin load balancer. What do they see?

- [x] Error traces arrive with spans missing from other hops
  > Each gateway sees about a third of each trace, so only the one holding the error span keeps
    its share. A first tier routing by trace id fixes it.
- [ ] Every error trace arrives complete, just slightly late
  > That needs one instance to see the whole trace. Round-robin splits a trace's spans across
    all three gateways, so no instance ever sees it whole.
- [ ] Error traces are kept three times, once per gateway
  > Each gateway can only keep the spans it received. You get fragments rather than copies,
    and no single fragment is a whole trace.
- [ ] No change: services still decide with the sampled flag
  > Tail sampling moves the decision into the Collector. The services export everything, and
    the policies run on whatever each gateway happens to receive.
```

## What you lose, and where to look instead

**A log line can point at a trace that does not exist.** The `Activity` created only to propagate the
trace id still has one, and the logging pipeline stamps it on every record, as
[[structured-logging-in-dotnet]] shows. So an ERROR log carries a trace id, you search for it in the
tracing backend, and nothing comes back. That is not a bug. It is the other 95%. Logs and metrics are
not sampled with the traces, so they cover every request and traces cover only some.

**Counts from sampled spans are wrong unless each one is weighted.** The weight is the **adjusted
count**, "the mathematical inverse (reciprocal) of the sampling probability", used "as an estimate of
the number of spans there would be without sampling". At 5%, each kept trace stands for 20.

Tail sampling makes this sharper, because its probability differs from one trace to the next. Take 1,000,000
requests with a 0.2% error rate, under "keep all errors, 1% of the rest":

| | Errors | Successes | Error rate |
| --- | --- | --- | --- |
| Real traffic | 2,000 | 998,000 | 0.2% |
| Traces kept | 2,000 (weight 1) | 9,980 (weight 100) | **16.7%** if counted raw |
| Kept, weighted | 2,000 | 998,000 | 0.2% |

Counting kept traces raw says one request in six fails. Weighting fixes it only if every trace records
the probability it was kept at. The tail sampling processor writes that into `tracestate` only behind
`processor.tailsamplingprocessor.usetracestate`, a feature gate that is "alpha, off by default".

So **the rule is: SLIs, rates and dashboards come from metrics.** A `Meter` instrument records every
request, and the trace sampler is never consulted for it. `http.server.request.duration` counts the 95%
that have no trace. Traces are for answering why, not how many.

The last loss is the jump from a metric to an example trace. Under the SDK's default filter, an **exemplar** is
only taken from a measurement recorded inside a sampled span, which is part of
[[from-burn-rate-alert-to-the-log-line]]. What sampling saves in money is weighed against the other
signals in [[what-telemetry-costs]].

```quiz 01M48XKGE0P7VV4VK3WD9DECE7 cloze
A head sampler keeping 2% of traces gives each kept trace an {{adjusted count}} of {{50}}. A tail
sampler that keeps every error makes the error rate counted from kept traces too {{high}}. So an
SLI is computed from {{metrics}}, which are not sampled.
```

## The same idea, elsewhere

Every OTel SDK implements the same samplers, and the spec's environment variables configure them
without code: `OTEL_TRACES_SAMPLER=parentbased_traceidratio` with `OTEL_TRACES_SAMPLER_ARG=0.05`. .NET
reads them from 1.8.0, and an explicit `SetSampler` overrides them. The default,
`ParentBased(root=AlwaysOn)`, is the same in Java, Go, Python and Node. One thing is moving: the spec
now marks `TraceIdRatioBased` as deprecated in favour of a composable `ProbabilitySampler`, and promises
the old one stays unchanged "until at least January 1, 2027". The .NET SDK (core 1.19.1) still ships
only `TraceIdRatioBasedSampler`. *Recorded 2026-10-06.* Check before quoting the class name.

```quiz 01M48XKGE07FCKMJQP6RT71HW6 recall
An interviewer asks: "Your tracing bill tripled. How would you sample, and what does it cost you?"
Answer in under a minute.

> **Head sampling** at the root with a parent-based ratio sampler. The decision comes from the trace id
> and rides the `traceparent` sampled flag, so traces stay whole. It is cheap, and in .NET an unsampled
> activity costs under 100 ns. But it is blind: at 5% it keeps 5% of errors. At the public edge, re-decide
> instead of trusting a caller's flag.
>
> If we need every error and slow trace, add **tail sampling** in the Collector: a load-balancing tier
> routing by trace id, then a tail-sampling tier holding traces for about 30 s. That is stateful and
> memory-bound, and it drops traces early when the buffer is undersized. Services still export
> everything, so it saves backend cost, not egress.
>
> **What we lose**: the paged request may have no trace, so we carry a business correlation id. Logs
> carry trace ids that lead nowhere. Rates computed from kept traces are wrong unless weighted by
> adjusted count. So SLIs come from metrics, which are unsampled.
```

## What to take away

**Head sampling** decides at the root from the trace id. The `traceparent` flag carries the decision,
and parent-based children follow it, so a trace is kept whole or not at all. It is cheap and blind to
errors. **Tail sampling** decides on the finished trace, so it can keep every error. It needs every span
of a trace routed to one Collector, which buffers them in memory and drops early when it is undersized.
It saves backend storage, not export. **The SDK default is `ParentBased(root=AlwaysOn)`, which keeps
everything.** An unsampled root keeps its trace id, so logs carry ids for traces that never existed.
Counting kept traces is wrong without the adjusted count, so **SLIs come from metrics**. At the public
edge, re-decide rather than trust a caller's sampled flag.

Worth reading in full: the OpenTelemetry [Sampling](https://opentelemetry.io/docs/concepts/sampling/)
concepts page. It is short. It covers when not to sample, head versus tail, and its three honest
downsides of tail sampling, and it is the vocabulary every vendor's sampling feature is a version of.
