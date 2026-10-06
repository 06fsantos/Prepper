# Author: What telemetry costs

Type: task
Status: resolved
Blocked by: 05, 07, 09

## Question

AFK, via `/author`. Write the Lesson `content/lessons/what-telemetry-costs.md`, titled "What telemetry costs".

- **Owns**: each signal's cost driver and its lever (metrics: series count; logs: volume; traces: sample rate), recording rules / downsampling, log-level policy and sampling INFO but never ERROR or audit, retention tiers (flagged as practice, not spec), the Collector as where cost policy is enforced.
- **`topic`**: `observability`
- **`prerequisites`**: [[structured-logging-in-dotnet]], [[metric-instruments-and-cardinality]], [[sampling-traces-head-tail-and-what-you-lose]]
- **Do not re-teach**: the mechanics of cardinality, sampling and log levels (link the Lessons that own them; this one is the synthesis an interviewer's "we're drowning in telemetry" asks for).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.

**Surfaced by [Author: Sampling traces](09-author-sampling-traces-head-tail-and-what-you-lose.md):**
tail sampling saves **backend** cost, not egress, because every service still exports every span. Head
sampling in front of it is the egress lever. Use this in the traces row rather than "tail-sample traces"
on its own.

## Answer

Written: `content/lessons/what-telemetry-costs.md` (topic `observability`; prerequisites the three named
Lessons). `npm run validate`: 0 errors. The only observability warning is the missing cheat sheet, which
is ticket 13's job.

- **One meter per signal**, as a table of what you pay for, the lever, and what the lever costs you.
  Metric cost follows labels, not traffic, which is why alerts live there.
- **Metrics**: the SRE book's resolution remedy (sample internally, aggregate externally). A view drops a
  label (`TagKeys`) or an instrument (`MetricStreamConfiguration.Drop`), but per the OTel .NET docs it
  does not redact exemplars. **Correction to the research note**: recording rules write *new* series, and
  Thanos says downsampling "doesn't save you any space". Rollups cut cost only once raw retention is cut,
  and the price is losing the zoom into old incidents.
- **Logs**: a worked volume table (1 TB/day, then 173 GB with one canonical line, then 18 GB sampled with
  failures kept). Microsoft's per-level sampling table. `AddRandomProbabilisticSampler` with an
  Information rule and a `Shop.Audit` category rule. Rule selection was checked against
  `LogSamplingRuleSelector`: the audit rule needs the *same* `logLevel` to beat the category-less rule
  regardless of order. The canonical line's level follows the outcome, because sampling is per record,
  not per request.
- **Trap**: `AddTraceBasedSampler()` is `Activity.Current?.Recorded ?? true` applied to every level, and
  only one sampler can be registered. So under head sampling it drops Error lines from unsampled traces.
- **Traces**: head sampling is the egress lever and tail sampling the backend lever (as surfaced by
  ticket 09).
- **Collector**: filter processor YAML (health-check spans, Debug logs; alpha, syntax from v0.146.0), the
  orphaned-telemetry warning, and the Collector's probabilistic sampler applying one percentage to every
  log record. So a level-aware rule belongs in the app, with the Collector enforcing the fleet floor.
- **Retention**: flagged as practice, not spec. Traces for days. Metrics for at least the workbook's
  "four-week rolling window". Logs tiered, with audit retention set by compliance.
- RESOURCES.md gained the .NET log sampling page, the filter and probabilistic sampler processors, and
  recording rules with the Thanos compactor.
