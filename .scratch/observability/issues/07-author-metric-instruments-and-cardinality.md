# Author: Metric instruments and cardinality

Type: task
Status: open
Blocked by: 06

## Question

AFK, via `/author`. Write the Lesson `content/lessons/metric-instruments-and-cardinality.md`, titled "Metric instruments and cardinality".

- **Owns**: Counter, UpDownCounter, Gauge, Histogram and the observable variants, additivity (what can be summed across instances), cardinality and why no user id goes in a label, the SDK's default 2000-series limit and `otel.metric.overflow`, pull vs push, delta vs cumulative temporality.
- **`topic`**: `observability`
- **`prerequisites`**: [[metrics-logs-and-the-golden-signals]], [[opentelemetry-api-sdk-collector-otlp]]
- **Do not re-teach**: what a metric is and the Counter + Histogram example (link golden-signals); percentile mechanics (leave for why-percentiles-dont-aggregate).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.
