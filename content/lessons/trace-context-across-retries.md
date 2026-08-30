---
id: 01M193KFSAQ56AW7NZE2XMYPST
title: A retry is one trace with two attempts, not two traces
topic:
  - distributed-tracing
prerequisites:
  - httpclient-connection-lifetime
---

A resilience pipeline turns one logical call into several actual ones. A retry issues the same
request two or three times; a timeout abandons an attempt that is still in flight; a breaker
refuses one without sending it at all. When the call eventually fails, or takes five seconds,
the question you have to answer is *which of those attempts did what* — and no single service's
logs can tell you, because the attempts crossed a process boundary.

[[distributed-tracing|Distributed tracing]] answers it with two identifiers and one rule about
which of them changes. A **trace id** names the whole logical request and does not change. A
**span id** names one attempt within it. So a call that failed twice and succeeded on the third
is one trace holding three spans — not three unrelated errors in three places.

## `traceparent`: the whole format is four fields

[W3C Trace Context](https://www.w3.org/TR/trace-context/) is the standard that carries this
between processes, and it is refreshingly small: one header, four hyphen-separated fields.

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
             |  |                                |                |
       version  trace-id (16 bytes)     parent-id (8 bytes)   flags
```

- **version** — `00` is the only version defined.
- **trace-id** — 16 bytes of hex identifying the entire request chain. Globally unique, and
  **constant across every downstream call the chain produces**, however many services and
  however many attempts it takes.
- **parent-id** — 8 bytes of hex: the span id of the caller. When your service makes an
  outbound call, this is the span of the inbound request it is currently handling, which is
  what makes the receiving service's spans children of yours.
- **flags** — a bitmask; `01` means the request is sampled and should be recorded.

The names are worth knowing exactly, because the vendor-side names differ. Application Insights
stores the trace id as `operation_Id` and the parent id as `operation_ParentId`, per
[Azure Monitor's distributed trace data page](https://learn.microsoft.com/en-us/azure/azure-monitor/app/distributed-trace-data)
— so "group by operation id" in a portal query and "same trace-id" on the wire are the same act
under two vocabularies.

```quiz 01M193KFSBR8PA4XKA5E921K2H cloze
A `traceparent` header is four hyphen-separated fields: a version, a {{trace-id}} identifying the
whole request chain, a {{parent-id}} holding the calling span's id, and a flags byte where `01`
means sampled. In Application Insights the first of those two appears as {{operation_Id}}.
```

## Why the retry case is the easy one

A retry is **sequential recovery, not divergence**. The pipeline waits, then issues the same
request again, from the same point in your service's work. There is no fork in the logical
request, so the trace stays a line rather than becoming a tree: every attempt belongs to the
same trace id, and the chain that each attempt hands downstream is rooted the same way.

That is the whole reason retries are unremarkable to trace, and it is worth saying out loud in
an interview because the interesting cases are defined against it. *A retry is one logical
failure observed more than once.* Pull up the trace, and three failed attempts sit under one
identifier with their timings visible, so "the call took five seconds" resolves into "two
attempts timed out at two seconds each before the third answered".

What the trace does **not** settle for you is how each individual attempt is recorded — whether
your SDK emits a distinct dependency span per attempt or folds them together is a property of
the SDK version you are running, not of the header format. The grouping is guaranteed by the
standard; the granularity beneath it is worth verifying against your own telemetry before you
rely on it in an incident.

```quiz 01M193KFSBD1FW94PB1NKEYPAV recall
A downstream call fails, is retried twice, and succeeds on the third attempt. Why is this one
trace rather than three, and what does that buy you when you are investigating a slow request?

> The trace id names the logical request, not the attempt, and a retry does not start a new
> logical request — it re-issues the same one after a delay. So all three attempts carry the
> same trace id, and each is a span within it. A retry is sequential recovery, so the trace
> stays linear rather than branching.
>
> What it buys you is that total latency decomposes. Instead of "this call took five seconds",
> the trace shows the two failed attempts and their waits accounted for separately from the one
> that succeeded — which tells you whether to change the backoff, the per-attempt timeout, or
> the dependency.
```

Parallel attempts are the case this reasoning does not cover, because two requests in flight at
once are genuinely a fork and the linear-hierarchy assumption stops holding — that is
[[tracing-hedged-attempts]], and it is an open question rather than a settled one.

## Correlation you get for free, and the two ways to lose it

You do not thread a correlation id through your code by hand. Application Insights, registered
in an ASP.NET Core app, extracts `traceparent` from the inbound request (minting a trace id if
there was none), assigns the current request a span, and injects `traceparent` into outbound
`HttpClient` calls with that span as the parent id. Logs, exceptions and dependency records
then correlate under one operation id in the portal.

The condition is that the outbound call goes through a client the container knows about — an
[[httpclient-connection-lifetime|`IHttpClientFactory`-registered client]], typed or named,
rather than a standalone `new HttpClient()` that no instrumentation ever saw. That is one more
argument for the factory on top of the pooling ones.

The second condition is **registration order**, and it is the pitfall worth carrying into an
interview because the failure is silent:

```csharp
builder.Services
    .AddApplicationInsightsTelemetry()      // FIRST
    .AddHttpClient("PaymentApi")
    .AddStandardResilienceHandler();        // THEN
```

Register the resilience handler *before* Application Insights and telemetry can simply stop
arriving — not an exception, not a warning, just an empty dependency timeline on the traces you
most wanted. Nothing fails loudly, so the bug is found when someone goes looking for a trace
during an incident and there is nothing there.

The neighbouring known issue is the same shape: `Grpc.Net.ClientFactory` throws at runtime when
`AddStandardResilienceHandler` is applied to a gRPC client, because `ConfigureHttpClient` is
not supported there. The fix is a package upgrade rather than a configuration change.

Both are **version-bounded**, and a bound is the only useful form for this kind of claim. As
stated in the "Known issues" section of
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience):
the telemetry drop affects `Microsoft.ApplicationInsights` **≤ 2.22.0**, and the gRPC
incompatibility affects `Grpc.Net.ClientFactory` **≤ 2.63.0**, fixed in **2.64.0**. *Recorded
2026-08-27.* Check your own package versions before quoting either — an issue is a fact about a
release, and repeating it after it has been fixed is its own kind of wrong.

```quiz 01M193KFSB0W2PP07NJPSFGBNW
Resilience handlers are registered before Application Insights in a service's DI container, on
`Microsoft.ApplicationInsights` 2.22.0. What is the likely symptom?

- [x] Telemetry stops correlating, with nothing logged
  > It is a silent failure — traces are missing rather than an error being raised.
- [ ] Retry attempts are counted and issued twice
  > Registration order changes what observes the pipeline, not how often it retries.
- [ ] The resilience strategies never run at all
  > The handler is registered and active; only the telemetry around it is affected.
- [ ] Outbound calls stop re-resolving their DNS
  > Resolution is a pooled-handler concern and is untouched by either registration.
```

## What to take away

The rule is one sentence: **the trace id belongs to the logical request and the span id belongs
to the attempt**, so a retrying client produces one trace with several spans and never several
traces. Everything else follows — why retries are safe to trace, why grouping by operation id
finds all the attempts, and why parallel attempts are the case that needs its own answer.

Worth reading in full: the
[W3C Trace Context recommendation](https://www.w3.org/TR/trace-context/). It is short, it is the
thing every vendor's correlation model is a rendering of, and reading the header format once
means never having to guess which field is which again.
