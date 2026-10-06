---
id: 01M48W2B80GPYRJJ342R5BSGYP
title: "OpenTelemetry: API, SDK, Collector, OTLP"
topic:
  - observability
prerequisites:
  - trace-context-across-retries
---

OpenTelemetry is **a pipeline with three seams**, not a tracing library. Code records telemetry
against an **API**. The application owner installs an **SDK** that decides what is kept. The SDK ships
it over **OTLP**, usually to a **Collector** that batches, redacts and samples before it fans out to a
backend. In an interview, "we use OpenTelemetry for tracing" is the vague answer. The fluent one says
where each seam is and what moving it costs:

- libraries take the **API** only, and the app wires the **SDK**;
- the app exports **OTLP** to a **Collector**, so changing backend is a Collector config change and not
  a redeploy of every service;
- **resource** attributes say who emitted the data, and **semantic conventions** say what it is called;
- **baggage** rides along with the trace context, and anything in it leaves the building.

Trace context itself, meaning `traceparent` and how it crosses a process boundary, is
[[trace-context-across-retries]]. This Lesson is about everything around it.

## The API is what you call, the SDK is what decides

The specification splits every signal in two. "API packages consist of the cross-cutting public
interfaces used for instrumentation", and "the SDK is the implementation of the API provided by the
OpenTelemetry project" ([OTel overview](https://opentelemetry.io/docs/specs/otel/overview/)). The reason
is dependency direction. The
[library guidelines](https://opentelemetry.io/docs/specs/otel/library-guidelines/) say it directly:
"Libraries, frameworks, and applications that want to be instrumented with OpenTelemetry take a
dependency only on the API packages." Only the application takes the SDK, and so only the
application decides.

That has a consequence worth saying aloud. With no SDK installed, the API is a valid, minimal
implementation: "no telemetry data will be collected", and the app "will still build and run without
failing". A library can therefore instrument itself at no cost to the apps that don't care, and it
never forces a vendor on the apps that do.

**.NET is the unusual case.** The runtime already ships the instrumentation APIs, so, as
[Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)
puts it, "OTel doesn't need to provide APIs for library authors to use". The OTel API for .NET is the
BCL:

| Signal  | What .NET code calls                                    | OTel's name for it |
| ------- | ------------------------------------------------------- | ------------------ |
| Logs    | `ILogger<T>`                                            | Logs API           |
| Metrics | `System.Diagnostics.Metrics.Meter`                      | Meter              |
| Traces  | `System.Diagnostics.ActivitySource` and `Activity`      | Tracer and Span    |

The OTel .NET packages are the SDK. A library references nothing from OpenTelemetry at all. The no-op
behaviour is visible in the API: `ActivitySource.StartActivity` returns `null` when no listener is
interested, which Microsoft describes as "a performance optimization so that the code pattern can still
be used in functions that are called frequently"
([tracing instrumentation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)).
That is why every `SetTag` call is written `activity?.SetTag(...)`.

```quiz 01M48W2B81SV3NT82G613BJPG1
You maintain an internal NuGet package that wraps the payments gateway, used by twelve services.
You want its calls to appear in traces. What should the package reference?

- [x] Only the BCL: an `ActivitySource` from `System.Diagnostics`
  > That is .NET's tracing API. Each service's own SDK decides whether to listen to your source,
    with `AddSource`. With no listener, `StartActivity` returns `null` and the cost is almost nothing.
- [ ] The OpenTelemetry SDK, so the spans are exported for you
  > Then a library is choosing exporters and sampling for twelve apps it does not own. The SDK
    belongs to the application, and a library depends on the API only.
- [ ] The OTLP exporter, so every service sends to one place
  > Where telemetry goes is the app's decision, and it usually goes to a Collector. A library
    that exports by itself cannot be redirected or switched off.
- [ ] Nothing: wrap calls in `ILogger` scopes for each service
  > A log scope is not a span. It has no duration, no parent and no span id, so the trace would
    show a gap where the gateway call was.
```

## Signals, and the one that leaks

The specification uses the word **signal** for each kind of telemetry, and its own example is "tracing,
metrics, and baggage are three separate signals". Logs are a fourth. The colloquial "three pillars" are
logs, metrics and traces, and Microsoft Learn uses that phrase. Both usages are live, so the safe answer
is: logs, metrics and traces, plus baggage as context that rides with them.

All of them share one in-process **context**, which is how a metric or a log record knows the active
span. Across processes the context travels in W3C headers, which is
[[trace-context-across-retries|the `traceparent` mechanism]].

**Baggage** is the part of that context you write yourself: name/value pairs "intended for indexing
observability events in one service with attributes provided by a prior service in the same
transaction" ([overview](https://opentelemetry.io/docs/specs/otel/overview/)). It is easy to misuse in
two ways. First, it does nothing on its own. It "is unassociated with attributes on spans, metrics, or
logs without explicitly adding them". Second, it leaks. The
[baggage docs](https://opentelemetry.io/docs/concepts/signals/baggage/) warn that "automatic
instrumentation includes Baggage in most of your service's network requests", including calls to third
parties. They also note that it is "sent in HTTP headers, making it visible to anyone inspecting your
network traffic", and that there are "no built-in integrity checks to ensure that Baggage items are
yours". So a customer email put in baggage at the edge is now sent to every downstream API. A
`tenant.id` read from baggage is a value any caller could have set.

## Resource versus attribute, and the names everyone agrees on

Two kinds of key/value data are attached to telemetry, and they answer different questions.

- A **resource** says **who emitted it**. It "captures information about the entity for which
  telemetry is recorded": `service.name`, `service.version`, host, pod, deployment. It is set once,
  when the provider is built, and "this association cannot be changed later". Every span and metric
  from that provider carries it ([resources](https://opentelemetry.io/docs/concepts/resources/)).
  This is what lets you narrow a latency spike "to a specific container, pod, or Kubernetes
  deployment", or to version N.
- An **attribute** says **what this one event was**: `http.request.method`, `http.route`, a status
  code. It varies per span, per measurement and per log record.

**Semantic conventions** are the agreed names for both, so a dashboard built on a Go service works on
a C# one. The standard example is the HTTP server duration metric
([HTTP metrics semconv](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)):
`http.server.request.duration`, a **histogram in seconds**, with attributes including
`http.request.method`, `http.response.status_code` and `http.route`. The convention is strict about
the last one. The route is `/orders/{id}`, and it "should have low-cardinality and the URI path can NOT
substitute it". Put the raw path `/orders/8812` there and every order id becomes its own time series,
which is the problem [[metric-instruments-and-cardinality]] covers. ASP.NET Core's built-in
instrumentation already emits this metric with these names, which is the practical payoff of
conventions: you did not have to choose them.

```quiz 01M48W2B817ET4JFTZ5BD8EN44 cloze
`service.name` and `service.version` are {{resource}} attributes: set once when the provider is built,
and carried by everything it emits. `http.route` is an {{attribute}} of each request. On
`http.server.request.duration`, a {{histogram}} measured in {{seconds}}, it must hold the route
template, because the raw {{URI path}} is high-cardinality.
```

## Wiring it in .NET

The split shows clearly in code. The instrumented class uses only the BCL, while `Program.cs` is the
one place that knows OpenTelemetry exists:

```csharp
// Checkout code: BCL only. This could live in a library with no OpenTelemetry reference.
public sealed class CheckoutService(IPaymentGateway gateway)
{
    public static readonly ActivitySource Source = new("Shop.Checkout", "1.0.0");
    private static readonly Meter Meter = new("Shop.Checkout", "1.0.0");
    private static readonly Counter<long> Orders = Meter.CreateCounter<long>("shop.orders.placed");

    public async Task PlaceAsync(Order order, CancellationToken ct)
    {
        using Activity? activity = Source.StartActivity("PlaceOrder");   // null if nobody listens
        activity?.SetTag("shop.order.item_count", order.Items.Count);   // attribute: this event

        await gateway.ChargeAsync(order.Id, order.Total, ct);
        Orders.Add(1, new KeyValuePair<string, object?>("shop.payment.method", order.PaymentMethod));
    }
}
```

```csharp
// Program.cs: the SDK. Only the application decides what is collected and where it goes.
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("checkout-api", serviceVersion: "2.4.1"))   // who
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()       // inbound requests
        .AddHttpClientInstrumentation()       // outbound calls
        .AddSource("Shop.Checkout"))          // our ActivitySource, by name
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()       // includes http.server.request.duration
        .AddMeter("Shop.Checkout"))
    .WithLogging()                            // ILogger records, stamped with trace and span ids
    .UseOtlpExporter();                       // all three signals, OTLP, to OTEL_EXPORTER_OTLP_ENDPOINT
```

Three things to notice. **Nothing is collected by name unless it is asked for**: drop the `AddSource`
line and the checkout spans silently disappear, which is the API's no-op working as designed. The
**endpoint is configuration**. `UseOtlpExporter` reads `OTEL_EXPORTER_OTLP_ENDPOINT` and defaults to
gRPC on `localhost:4317`
([OTLP exporter README](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.OpenTelemetryProtocol/README.md)).
It registers export for every signal at once, and it cannot be combined with the per-signal
`AddOtlpExporter` calls. Finally, **the log side needs nothing extra**: the OTel logging provider takes
trace and span ids from `Activity.Current`, as [[structured-logging-in-dotnet]] shows.

## OTLP and the Collector: where the backend choice lives

**OTLP** is the wire format. The spec describes it as "the encoding, transport, and delivery mechanism
of telemetry data between telemetry sources, intermediate nodes such as collectors and telemetry
backends" ([OTLP spec](https://opentelemetry.io/docs/specs/otlp/)). It runs over gRPC on port **4317**
or over HTTP on port **4318**. The HTTP variant carries protobuf "encoded either in binary format or in
JSON format". OTLP is push: the SDK sends.

The **Collector** is a "vendor-agnostic way to receive, process and export telemetry data"
([Collector](https://opentelemetry.io/docs/collector/)). It is configured as **pipelines**, "a path that
data follows in the Collector: from reception, to processing (or modification), and finally to export"
([architecture](https://opentelemetry.io/docs/collector/architecture/)):

- **receivers** listen for data, usually OTLP on 4317 and 4318;
- **processors** run in sequence: batching, dropping attributes, redacting, sampling;
- **exporters** send to one or more backends, in OTLP or a vendor's own format.

Why put a process between the app and the backend? Because it moves policy out of the code. In the
docs' words, it "allows your service to offload data quickly and the collector can take care of
additional handling like retries, batching, encryption or even sensitive data filtering". Swapping
vendors, sending to two backends during a migration, or stripping a PII attribute every service
accidentally emits are all Collector config changes. None of them redeploys a service.

It is deployed in two shapes, and they combine:

- An **agent** runs "alongside the application or on the same host, such as a sidecar or DaemonSet"
  ([agent](https://opentelemetry.io/docs/collector/deploy/agent/)). It is simple and the app's
  export is a local hop, but each agent is configured on its own.
- A **gateway** is "one or more Collector instances running as a standalone service", usually one
  endpoint "per cluster, per data center, or per region"
  ([gateway](https://opentelemetry.io/docs/collector/deploy/gateway/)). It brings "centrally managed
  credentials" and "centralized policy management". The costs, as the docs list them, are "one more
  thing to maintain and that can fail", added latency, and higher resource use.

The gateway is also where **tail sampling** has to live, behind a tier that routes every span of a
trace to the same instance. That is [[sampling-traces-head-tail-and-what-you-lose]].

```quiz 01M48W2B81CDFG90ZK4MFB79X3
Forty services export OTLP to a gateway Collector, which exports to vendor A. The company is moving to
vendor B and wants both fed for a month. What has to change?

- [x] The gateway's config: add an exporter for B to each pipeline
  > A pipeline can fan out to several exporters. The services keep sending OTLP to the same
    endpoint and never learn that a second backend exists.
- [ ] Every service's SDK setup: add a second exporter beside OTLP
  > That would work, but it is forty deploys, and it is what the Collector exists to avoid.
    Backend choice belongs in one config, not in every app.
- [ ] Nothing: OTLP is a standard, so vendor B reads the same stream
  > OTLP is a protocol, not a shared stream. Something still has to send the data to B, and
    that something is an exporter.
- [ ] The resource attributes, so each backend can tell its data apart
  > A resource says which service emitted the data, not where it goes. Both backends receive
    the same resource.
```

## The same idea, elsewhere

The API/SDK split is the same in every language. Only .NET puts the API in the runtime. In Java, Go,
Python and Node, a library imports the OTel API package (`io.opentelemetry.api`,
`go.opentelemetry.io/otel`, `opentelemetry-api`, `@opentelemetry/api`), and the application adds the
SDK and exporter. Context propagation is what differs most: Go passes it explicitly as a
`context.Context` argument, Node keeps it in `AsyncLocalStorage`, and .NET keeps it in
`Activity.Current`, which flows with the async call chain. OTLP, the Collector, resources and
semantic conventions are identical everywhere. That is the point of them.

```quiz 01M48W2B81JGKN6C8N7X97PWRA recall
An interviewer says: "You've drawn twelve services. How do you get telemetry out of them, and what
happens when we change monitoring vendor?" Give the answer in under a minute, naming each layer.

> **Instrument against the API.** In .NET that is the BCL (`ILogger`, `Meter`, `ActivitySource`), and
> shared libraries reference nothing else, so they are free when nobody listens. **Each service wires
> the SDK once**: a resource (`service.name`, `service.version`), ASP.NET Core and `HttpClient`
> instrumentation, our own sources and meters, and an OTLP exporter. Names follow **semantic
> conventions**, such as `http.route`, never the raw path, so dashboards work across languages.
> Context propagates in W3C `traceparent` headers. Keep **baggage** free of PII, because it is sent
> downstream in plain headers.
>
> **Export OTLP to a Collector**, as an agent per node and/or a gateway per cluster. It batches,
> retries, redacts and samples, then exports. **Changing vendor is a Collector exporter change**,
> and for a migration you add a second exporter and feed both. No service is redeployed.
```

## What to take away

**Libraries depend on the API, and applications own the SDK.** In .NET the API is the BCL, so a
library's `ActivitySource` and `Meter` cost nothing until an app listens, by name. A **resource** says
who emitted the data and is fixed at startup. An **attribute** says what one event was. **Semantic
conventions** fix the names, and `http.route` is the route template and never the path. **Baggage**
travels to every downstream call in plain headers, so never put secrets or PII in it. **OTLP** (gRPC
4317, HTTP 4318) carries everything to a **Collector**, a pipeline of receivers, processors and
exporters, deployed as an agent, a gateway, or both. Backend choice, redaction and sampling live there,
not in forty services.

Worth reading in full: Microsoft Learn's
[Use OpenTelemetry with OTLP and the Aspire Dashboard](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-otlp-example).
It wires all three signals in a small ASP.NET Core app and shows them arriving over OTLP. Swap its
dashboard for a Collector and it becomes the production shape.
