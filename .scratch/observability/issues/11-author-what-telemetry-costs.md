# Author: What telemetry costs

Type: task
Status: open
Blocked by: 05, 07, 09

## Question

AFK, via `/author`. Write the Lesson `content/lessons/what-telemetry-costs.md`, titled "What telemetry costs".

- **Owns**: each signal's cost driver and its lever (metrics: series count; logs: volume; traces: sample rate), recording rules / downsampling, log-level policy and sampling INFO but never ERROR or audit, retention tiers (flagged as practice, not spec), the Collector as where cost policy is enforced.
- **`topic`**: `observability`
- **`prerequisites`**: [[structured-logging-in-dotnet]], [[metric-instruments-and-cardinality]], [[sampling-traces-head-tail-and-what-you-lose]]
- **Do not re-teach**: the mechanics of cardinality, sampling and log levels (link the Lessons that own them; this one is the synthesis an interviewer's "we're drowning in telemetry" asks for).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.
