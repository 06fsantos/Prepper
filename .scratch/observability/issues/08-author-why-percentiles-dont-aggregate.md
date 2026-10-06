# Author: Why percentiles don't aggregate

Type: task
Status: resolved
Blocked by: 07

## Question

AFK, via `/author`. Write the Lesson `content/lessons/why-percentiles-dont-aggregate.md`, titled "Why percentiles don't aggregate".

- **Owns**: summary vs histogram, why averaging per-instance p99s is meaningless, merging buckets, bucket choice and the default-bucket trap in seconds, `InstrumentAdvice`, exponential histograms, durations in seconds as a double.
- **`topic`**: `observability`
- **`prerequisites`**: [[metric-instruments-and-cardinality]]
- **Do not re-teach**: instrument kinds and cardinality (link metric-instruments-and-cardinality); latency as a golden signal (link golden-signals).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.

## Answer

Written: `content/lessons/why-percentiles-dont-aggregate.md`, with four quiz blocks (two mcq, one
cloze, one recall). `npm run validate`: 0 errors, and no new warnings (the link to
`from-burn-rate-alert-to-the-log-line` was already an unwritten target; `topic-without-cheat-sheet` on
`observability` stays until the Cheat sheet ticket).

- **Why averaging fails**: a worked two-pod example (A: 9,000 at ≤40 ms; B: 850 at 100 ms + 150 at 3 s).
  The true p99 is 3 s, the plain average 1.52 s, the traffic-weighted average 336 ms. The max of
  per-pod p99s is a valid **upper bound** and can be wildly loose. MCQ: a canary with 5 slow requests
  in 10,000 makes the max read 3 s against a true ~40 ms.
- **Summary vs histogram**: where the percentile is computed. Prometheus's "statistically nonsensical",
  "perfectly possible" and "Only if aggregation isn't needed", plus the OTel data model's Summary being
  "for compatibility" and "cannot always be merged". A merge table of the same two pods, and the mean
  being exact from sum ÷ count ("the average aggregates and the percentile does not").
- **Precision cost**: linear interpolation inside a bucket (≈3.3 s for the true 3 s), Prometheus's
  320 ms → 443 ms example, error "in the dimension of φ" vs "of the observed value". Rules: dense where
  answers live, and **a boundary on every SLO threshold** (Prometheus's Apdex "must have buckets present
  at the exact boundaries"). Buckets are upper-inclusive per the SDK spec.
- **Seconds and the default trap**: Microsoft's "prefer units of seconds ... double", semconv's `s`, the
  SDK default boundaries, and Microsoft's "would all fall into the `0` bucket". The fix is
  `InstrumentAdvice` (DiagnosticSource 9.0.0, honoured by OTel .NET 1.10.0) or a View, and **the View
  wins**. Also semconv's advised HTTP boundaries. MCQ: p50 2.5 s / p99 4.9 s while traces show <100 ms.
- **Exponential histograms**: `base = 2**(2**(-scale))`, relative error (scale 3 ≈ 9% per bucket), the
  SDK picking the scale (160 buckets, max scale 20 by default), exact downscaling on merge. Trade-off:
  no exact SLO edge, and the backend must store the format. Prometheus native histograms are the same
  idea and now its first recommendation.
- **Code**: a BCL-only `SearchMetrics` (`IMeterFactory`, `Histogram<double>` in `s`, `InstrumentAdvice`
  with a 0.3 edge, `Stopwatch.GetElapsedTime(...).TotalSeconds`, one bounded tag), plus `Program.cs`
  with a `Base2ExponentialBucketHistogramConfiguration` View and its trade-off stated.
- **Cross-language**: PromQL `histogram_quantile(0.99, sum by (le) (...))`, where `sum by (le)` is the
  merge, against averaging a summary's quantile series.
- **Not re-taught**: instrument kinds and cardinality, and latency as a golden signal (both linked).
- `RESOURCES.md`: added Prometheus "Histograms and summaries" and the OTel .NET customizing-the-SDK doc.

Every quotation was re-fetched from its source in this session (Prometheus histograms, MS Creating
Metrics, OTel metrics SDK and data model, HTTP metrics semconv, OTel .NET customizing-the-SDK). One
claim from general knowledge rather than a fetched source: that Prometheus native histograms are "the
same idea" as OTel exponential histograms.
