# Author: Metric instruments and cardinality

Type: task
Status: resolved
Blocked by: 06

## Question

AFK, via `/author`. Write the Lesson `content/lessons/metric-instruments-and-cardinality.md`, titled "Metric instruments and cardinality".

- **Owns**: Counter, UpDownCounter, Gauge, Histogram and the observable variants, additivity (what can be summed across instances), cardinality and why no user id goes in a label, the SDK's default 2000-series limit and `otel.metric.overflow`, pull vs push, delta vs cumulative temporality.
- **`topic`**: `observability`
- **`prerequisites`**: [[metrics-logs-and-the-golden-signals]], [[opentelemetry-api-sdk-collector-otlp]]
- **Do not re-teach**: what a metric is and the Counter + Histogram example (link golden-signals); percentile mechanics (leave for why-percentiles-dont-aggregate).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.

## Answer

Written: `content/lessons/metric-instruments-and-cardinality.md`, with four quiz blocks (two mcq, one
cloze, one recall). `npm run validate`: 0 errors. The only new warning is the expected unwritten link
to `why-percentiles-dont-aggregate`, and `topic-without-cheat-sheet` on `observability` stays until the
Cheat sheet ticket.

- **Instruments**: a table built on two questions, whether the value only goes up and whether it can be
  summed across instances. Additivity is grounded in the spec's Gauge/async-UpDownCounter examples and
  the data model's "Sums ... combine via addition" versus a gauge's "last sample value". The choice
  between observable and synchronous follows the spec's "pre-calculated value" rule. MCQ: total queue
  backlog across eight pods.
- **Cardinality**: series = product of label values, and a histogram multiplies it by its buckets.
  Worked example: 40 × 5 × 8 = 1,600 series, about 25k numbers with the default buckets. Backed by the
  Prometheus naming caution and Microsoft's "<1000, histograms 10-100× lower, else logs/databases".
  Per-customer questions go to logs and spans.
- **Overflow**: spec default 2000, `otel.metric.overflow=true`, and on by default in .NET since 1.10.0,
  framed as "the total stays right and the breakdown silently goes wrong". The limit is set per metric
  through `AddView(..., new MetricStreamConfiguration { CardinalityLimit = ... })`.
- **Code**: a `CheckoutMetrics` class (BCL only, `IMeterFactory`) with a Counter (bounded
  payment-method tag), an UpDownCounter for in-flight checkouts, an ObservableUpDownCounter for queue
  depth and an ObservableGauge for the oldest message's age, plus `Program.cs` with the view. It notes
  that `Gauge<T>` needs .NET 9, and covers the lazy-static and cheap-callback warnings.
- **Pull vs push**: the Prometheus Pushgateway pitfalls and its batch-job-only rule, with an MCQ on a
  four-minute nightly job. **Temporality**: the data model's definitions, cumulative's memory cost
  "proportional to cardinality", delta shifting it out of the process, and the SDK defaulting to
  cumulative.
- **Cross-language**: Prometheus's Counter/Gauge/Histogram/Summary. Its gauge covers both of OTel's
  UpDownCounter and Gauge, and Summary is deferred to the percentiles Lesson.
- **Not re-taught**: what a metric is (golden signals is linked), and percentile mechanics (only
  linked).
- `RESOURCES.md`: added the OTel metrics API/SDK/data model, MS Creating Metrics with the OTel .NET
  metrics README, and the Prometheus naming, metric-types and pushing pages.

Every quotation was re-fetched from its source in this session. None of the summarised wording from
the research note was carried over unchecked.
