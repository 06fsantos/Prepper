# Author the observability Cheat sheet and Term body

Type: task
Status: resolved
Blocked by: 04, 05, 06, 07, 08, 09, 10, 11, 12, 15

## Question

AFK, via `/author`. Write `content/cheat-sheets/observability-cheat-sheet.md` (`topic:
observability`, one value) distilling the seven new Lessons and golden-signals, in vocabulary
that agrees with the de-vendored distributed-tracing cheat sheet. Replace the placeholder body of
`content/terms/observability.md` with its final definition. `npm run validate` passes.

**Surfaced by [Author: From burn-rate alert to the log line](10-author-from-burn-rate-alert-to-the-log-line.md):**
the sheet needs the burn-rate table (14.4 over 1 h/5 min, 6 over 6 h/30 min, 1 over 3 d/6 h for 99.9%)
and the chain's join keys. It also needs the one .NET-specific trap: **exemplars are `AlwaysOff` by
default in .NET**, against the spec's `TraceBased`, until `SetExemplarFilter` is called.

**Surfaced by [Author: What telemetry costs](11-author-what-telemetry-costs.md):** two lines the sheet
should carry. First, rollups (recording rules, downsampling) **add** storage, and they save money only when
raw retention is cut. Second, in .NET, `AddTraceBasedSampler()` drops Error logs from unsampled traces, so
thin logs with level rules instead. The research note's "keep raw for days, rolled-up for months" is
right only in that second sense, so don't repeat it as a saving on its own.

## Answer

Written: `content/cheat-sheets/observability-cheat-sheet.md` (`topic: observability`, scalar) and the
final body of `content/terms/observability.md`. `npm run validate`: 0 errors (the one warning,
`build-vs-buy`, predates this).

The sheet is grouped by the seven Lessons' subjects (shape, OpenTelemetry, logs, metrics, percentiles,
sampling, alert-to-cause, cost) so each block is one Lesson's levers, not its summary. It carries the
three lines this ticket was told to: the burn-rate table with budget spent per row, the join key per
step of the chain, and **exemplars `AlwaysOff` in .NET**; rollups **add** storage and save only once raw
retention is cut; `AddTraceBasedSampler()` drops Errors from unsampled traces, so per-level rules. The
research note's "raw for days, rolled-up for months" is not repeated as a saving. Trace-context mechanics
(`traceparent` fields, retries, brokers, hedging) are left to the distributed-tracing sheet and linked,
not restated; vocabulary agrees with it (trace id, span, parent-based, head/tail, SLIs from metrics).

The Term stays an area Term with a short overview: the definition, the metrics/traces/logs join as the
craft, and the open-standards line that fixes the scope. No new tickets surfaced; the Plan ticket is now
unblocked.
