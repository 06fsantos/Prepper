# Author: From burn-rate alert to the log line

Type: task
Status: open
Blocked by: 05, 08, 09

## Question

AFK, via `/author`. Write the Lesson `content/lessons/from-burn-rate-alert-to-the-log-line.md`, titled "From burn-rate alert to the log line".

- **Owns**: burn rate and multiwindow, multi-burn-rate alerting (14.4x/1h + 5m, 6x/6h, 1x/3d for 99.9%), exemplars and that they exist only for sampled spans, the debugging walk-through (alert → histogram bucket → exemplar → trace → logs by trace id → resource attributes) naming the join key at every step, and what would have hidden the cause (sampling, overflow, log level).
- **`topic`**: `observability`
- **`prerequisites`**: [[structured-logging-in-dotnet]], [[why-percentiles-dont-aggregate]], [[sampling-traces-head-tail-and-what-you-lose]]
- **Do not re-teach**: SLI/SLO/error budget and symptom alerting (build directly on golden-signals' "Alert on symptoms, not causes").

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.
