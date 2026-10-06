# Fix the golden-signals duration unit

Type: task
Status: resolved
Blocked by: —

## Question

AFK, via `/author`. [[metrics-logs-and-the-golden-signals]]'s `Meter` example records
`request.duration` with `unit: "ms"`. Change it to record **seconds as a `double`** under the
semconv name `http.server.request.duration` (Microsoft Learn and the OTel HTTP semconv, per
`content/research/what-does-a-senior-interview-probe-on-observability.md`). Touch the example and any prose
that names its unit, nothing else. `npm run validate` passes.

**Surfaced by [Author: Why percentiles don't aggregate](08-author-why-percentiles-dont-aggregate.md):**
a `Histogram<double>` in seconds with no boundaries falls into the OTel SDK's millisecond-shaped
default buckets, which put every sub-five-second request in one bucket. That Lesson teaches this as a
trap. So the fixed example should also pass `advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = [...] }`
with the semconv HTTP boundaries (`0.005 … 10`), and link [[why-percentiles-dont-aggregate]] in one
clause. Otherwise the golden-signals note demonstrates the bug the other Lesson warns about. This is
the one extension to "touch the example ... nothing else".

## Answer

Done in [[metrics-logs-and-the-golden-signals]]. The `Meter` example now creates
`http.server.request.duration` with `unit: "s"` and records `elapsedSeconds` as a `double`. It also
passes `advice: new InstrumentAdvice<double>` with the semconv HTTP boundaries
`[0.005 … 10]`, the same list [[why-percentiles-dont-aggregate]] quotes. One sentence before the block
says why: seconds as Microsoft and semconv recommend, and the SDK's millisecond-shaped defaults that
would put every sub-five-second request in one bucket. That sentence links
[[why-percentiles-dont-aggregate]]. No other prose named the unit, and the quizzes, the counter
and the `outcome` tag are untouched. `npm run validate`: 0 errors. The two pre-existing warnings
are an unrelated unwritten link, plus `observability` having no cheat sheet, which is
[Author the observability Cheat sheet and Term body](13-author-the-observability-cheat-sheet-and-term-body.md).

Left alone, deliberately, under "nothing else": the example tags with a home-grown `outcome`
attribute and counts with `request.count`, where the semconv would use `error.type` /
`http.response.status_code` and read traffic off the histogram's own count. That is the example's
teaching device for "split latency by outcome", not a correctness bug, so it stays.
