# Author: OpenTelemetry: API, SDK, Collector, OTLP

Type: task
Status: resolved
Blocked by: —

## Question

AFK, via `/author`. Write the Lesson `content/lessons/opentelemetry-api-sdk-collector-otlp.md`, titled "OpenTelemetry: API, SDK, Collector, OTLP".

- **Owns**: the API/SDK split and why a library depends only on the API, the signals (logs/metrics/traces plus baggage) and baggage's leak risk, resource vs attribute, semantic conventions (`http.route`, not the raw path), the Collector (receivers/processors/exporters; agent vs gateway), OTLP (gRPC 4317 / HTTP 4318), the BCL as .NET's OTel API (`ILogger`, `Meter`, `ActivitySource`).
- **`topic`**: `observability`
- **`prerequisites`**: [[trace-context-across-retries]]
- **Do not re-teach**: W3C `traceparent` and context propagation mechanics (link trace-context-across-retries); span links (link tracing-a-flow-through-a-message-broker).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.

## Answer

Authored 2026-10-06 via `/author`: `content/lessons/opentelemetry-api-sdk-collector-otlp.md` (four
quiz blocks: two mcq, one cloze, one recall). `npm run validate`: 0 errors. The only new warnings are
unwritten links to sibling Lessons 07 (`metric-instruments-and-cardinality`) and 09
(`sampling-traces-head-tail-and-what-you-lose`), which are expected. `topic-without-cheat-sheet` on
`observability` now counts three Lessons and is still deferred to the capstone (13).

- **Sources re-checked verbatim** before quoting: the OTel spec overview, library guidelines,
  baggage, resources, Collector (index, architecture, agent and gateway deploy pages), OTLP spec,
  HTTP metrics semconv; MS Learn (observability-with-otel, the OTLP + Aspire Dashboard example,
  tracing instrumentation walkthrough); the OTel .NET OTLP exporter README and the
  getting-started-aspnetcore `Program.cs`.
- **Corrections to the research note**: (a) the no-op claim is sourced from the **library
  guidelines**, not the overview, which says nothing about it; (b) on `http.server.request.duration`,
  `http.route` and `http.response.status_code` are **conditionally required**, while the required ones
  are `http.request.method` and `url.scheme`. The semconv quote is "should have low-cardinality and
  the URI path can NOT substitute it" (it is in the `MUST NOT be populated when…` sentence); (c) the
  Collector docs path for deployment is now `/docs/collector/deploy/`, not `/deployment/`.
- **Facts later Lessons can rely on**: `UseOtlpExporter()` (OpenTelemetry.Extensions.Hosting) registers
  OTLP for all three signals, defaults to gRPC `localhost:4317`, can be called only once, and **cannot
  be combined** with per-signal `AddOtlpExporter`. `WithLogging()` exists on the `OpenTelemetryBuilder`
  (the OTel .NET ASP.NET Core sample uses it), though the Hosting README does not list it. The gateway
  docs state the two-tier load-balancing-exporter shape for tail sampling (useful to 09).
- **Code example**: a BCL-only `CheckoutService` (`ActivitySource`, `Meter`, `activity?.SetTag`)
  beside a `Program.cs` that is the only OTel-aware file. The cross-language aside covers API package
  names and how context is carried.
- `RESOURCES.md` **Observability** gained the OTel spec overview + library guidelines, the Collector
  docs, and the MS Learn OTLP example + exporter README.
