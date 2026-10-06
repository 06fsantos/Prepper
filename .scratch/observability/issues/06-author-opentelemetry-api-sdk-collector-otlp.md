# Author: OpenTelemetry: API, SDK, Collector, OTLP

Type: task
Status: open
Blocked by: —

## Question

AFK, via `/author`. Write the Lesson `content/lessons/opentelemetry-api-sdk-collector-otlp.md`, titled "OpenTelemetry: API, SDK, Collector, OTLP".

- **Owns**: the API/SDK split and why a library depends only on the API, the signals (logs/metrics/traces plus baggage) and baggage's leak risk, resource vs attribute, semantic conventions (`http.route`, not the raw path), the Collector (receivers/processors/exporters; agent vs gateway), OTLP (gRPC 4317 / HTTP 4318), the BCL as .NET's OTel API (`ILogger`, `Meter`, `ActivitySource`).
- **`topic`**: `observability`
- **`prerequisites`**: [[trace-context-across-retries]]
- **Do not re-teach**: W3C `traceparent` and context propagation mechanics (link trace-context-across-retries); span links (link tracing-a-flow-through-a-message-broker).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.
