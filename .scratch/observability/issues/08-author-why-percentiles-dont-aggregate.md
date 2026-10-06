# Author: Why percentiles don't aggregate

Type: task
Status: open
Blocked by: 07

## Question

AFK, via `/author`. Write the Lesson `content/lessons/why-percentiles-dont-aggregate.md`, titled "Why percentiles don't aggregate".

- **Owns**: summary vs histogram, why averaging per-instance p99s is meaningless, merging buckets, bucket choice and the default-bucket trap in seconds, `InstrumentAdvice`, exponential histograms, durations in seconds as a double.
- **`topic`**: `observability`
- **`prerequisites`**: [[metric-instruments-and-cardinality]]
- **Do not re-teach**: instrument kinds and cardinality (link metric-instruments-and-cardinality); latency as a golden signal (link golden-signals).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.
