# Author: Sampling traces: head, tail, and what you lose

Type: task
Status: open
Blocked by: 06

## Question

AFK, via `/author`. Write the Lesson `content/lessons/sampling-traces-head-tail-and-what-you-lose.md`, titled "Sampling traces: head, tail, and what you lose".

- **Owns**: head vs tail sampling, parent-based consistency via the sampled flag, tail sampling's trace-id affinity (load-balancing exporter tier) and buffer cost, adjusted count, never deriving SLIs from sampled spans, log lines that point at traces that don't exist, the cost of an unsampled `Activity`.
- **`topic`**: `observability`, `distributed-tracing`
- **`prerequisites`**: [[opentelemetry-api-sdk-collector-otlp]], [[trace-context-across-retries]]
- **Do not re-teach**: the `traceparent` sampled flag's format (link trace-context-across-retries); the business correlation id rationale (link tracing-a-flow-through-a-message-broker).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.
