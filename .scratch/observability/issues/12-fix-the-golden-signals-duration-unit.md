# Fix the golden-signals duration unit

Type: task
Status: open
Blocked by: —

## Question

AFK, via `/author`. [[metrics-logs-and-the-golden-signals]]'s `Meter` example records
`request.duration` with `unit: "ms"`. Change it to record **seconds as a `double`** under the
semconv name `http.server.request.duration` (Microsoft Learn and the OTel HTTP semconv, per
`content/research/what-does-a-senior-interview-probe-on-observability.md`). Touch the example and any prose
that names its unit, nothing else. `npm run validate` passes.
