# Author: From burn-rate alert to the log line

Type: task
Status: resolved
Blocked by: 05, 08, 09

## Question

AFK, via `/author`. Write the Lesson `content/lessons/from-burn-rate-alert-to-the-log-line.md`, titled "From burn-rate alert to the log line".

- **Owns**: burn rate and multiwindow, multi-burn-rate alerting (14.4x/1h + 5m, 6x/6h, 1x/3d for 99.9%), exemplars and that they exist only for sampled spans, the debugging walk-through (alert → histogram bucket → exemplar → trace → logs by trace id → resource attributes) naming the join key at every step, and what would have hidden the cause (sampling, overflow, log level).
- **`topic`**: `observability`
- **`prerequisites`**: [[structured-logging-in-dotnet]], [[why-percentiles-dont-aggregate]], [[sampling-traces-head-tail-and-what-you-lose]]
- **Do not re-teach**: SLI/SLO/error budget and symptom alerting (build directly on golden-signals' "Alert on symptoms, not causes").

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.

**Surfaced by [Author: Sampling traces](09-author-sampling-traces-head-tail-and-what-you-lose.md):** in
.NET, a dropped root or remote-parent span still gets a propagation-only `Activity`, so logs carry the
trace id of an unsampled request. In the walk-through, "logs filtered by trace id" therefore works even
when the trace itself is gone. Say so at that step rather than re-teaching the mechanism.

## Answer

Written: `content/lessons/from-burn-rate-alert-to-the-log-line.md` (`topic: observability`, the three
prerequisites as specified, four quiz blocks). `npm run validate`: 0 errors.

- **Burn rate** from the SRE workbook, with the arithmetic (1.44% ÷ 0.1% = 14.4; 14.4/720 = 2% of the
  month's budget, all of it in about two days), and a latency SLI counted exactly off the 0.25 s
  semconv bucket edge.
- **Multiwindow, multi-burn-rate**: the workbook's table (re-checked verbatim: 14.4 over 1 h/5 min, 6 over
  6 h/30 min, ticket at 1 over 3 d/6 h), the four scores, reset time as the reason for the short window, a
  worked detection-time example (4% slow from 14:02 → page at about 14:23), and the low-traffic caveat.
- **Walk-through** as a table, with the join key named at every step. The trace id appears three times.
  The step-5 note from the sampling ticket is in: logs keep the trace id of an unsampled request.
- **Code**: `Program.cs` with `SetExemplarFilter(ExemplarFilterType.TraceBased)`. New fact, verified
  against the OTel .NET docs: **.NET defaults exemplars to `AlwaysOff`**, departing from the spec's
  `TraceBased`. Also verified in `dotnet/aspnetcore` source: hosting records `http.server.request.duration`
  before stopping the request activity, so its exemplars carry the request's trace. A tag a View drops
  stays on exemplars as a filtered tag, so a View alone does not redact.
- **What hides the cause**: no exemplar (sampling, or the .NET default), no trace (head sampling; logs
  survive), the route folded into `otel.metric.overflow`, the reason logged below production level, no
  bucket edge at the SLO threshold.
- `RESOURCES.md`: added *SRE workbook: Alerting on SLOs*; extended the *OTel .NET: customizing the
  metrics SDK* entry with its Exemplars section.
