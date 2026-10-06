# Author: Sampling traces: head, tail, and what you lose

Type: task
Status: resolved
Blocked by: 06

## Question

AFK, via `/author`. Write the Lesson `content/lessons/sampling-traces-head-tail-and-what-you-lose.md`, titled "Sampling traces: head, tail, and what you lose".

- **Owns**: head vs tail sampling, parent-based consistency via the sampled flag, tail sampling's trace-id affinity (load-balancing exporter tier) and buffer cost, adjusted count, never deriving SLIs from sampled spans, log lines that point at traces that don't exist, the cost of an unsampled `Activity`.
- **`topic`**: `observability`, `distributed-tracing`
- **`prerequisites`**: [[opentelemetry-api-sdk-collector-otlp]], [[trace-context-across-retries]]
- **Do not re-teach**: the `traceparent` sampled flag's format (link trace-context-across-retries); the business correlation id rationale (link tracing-a-flow-through-a-message-broker).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.

## Answer

Written: `content/lessons/sampling-traces-head-tail-and-what-you-lose.md`, with four quiz blocks (two
mcq, one cloze, one recall). `npm run validate`: 0 errors. The only warnings are the expected unwritten
links to `from-burn-rate-alert-to-the-log-line` and `what-telemetry-costs`, plus
`topic-without-cheat-sheet` on `observability`, which is deferred to the Cheat sheet ticket.

- **Terminology first**: "sampled" means *kept*. The OTel docs call "sampling out data" an incorrect
  statement. The Lesson also covers when *not* to sample (tens of traces/s, aggregate-only use).
- **Head**: decided at the root from the trace id (consistent sampling) and carried by the flag, with
  parent-based children following it. The spec forbids the sampled-but-not-recorded combination. **The
  SDK default `ParentBased(root=AlwaysOn)` keeps 100%.** MCQ: at 1% head, the paged payment failure is
  about 1% likely to have a trace, so you go to the correlation id (linked, not re-taught).
- **The public edge**: from W3C's denial-of-service section ("naively continues any trace with the
  sampled flag set"). Re-decide at a trust boundary with `remoteParentSampled`, and never re-decide
  inside it.
- **.NET cost, read from the SDK source** (`TracerProviderSdk.PropagateOrIgnoreData`): a dropped root
  or remote-parent span still gets a `PropagationData` activity "so the trace ID is preserved", while a
  dropped span under a local parent returns `null`. That is the mechanism behind "a log line points at
  a trace that does not exist". Also covered: under 100 ns vs about 1 µs, `IsAllDataRequested` =
  `IsRecording`, `Recorded` = sampled flag, and the OTel .NET troubleshooting trap where custom spans
  silently drop under an unrecorded ASP.NET Core activity.
- **Tail**: policies (errors / latency / probabilistic; a trace is kept if any policy votes for it,
  unless there is a `drop` policy), "MUST be received by the same collector instance", the two-tier
  shape with `load_balancing` `routing_key: traceID` (the exporter was renamed from `loadbalancing`, and
  the old name is a deprecated alias), and `decision_wait` 30s / `num_traces` 50000 / circular buffer /
  `sampling_trace_dropped_too_early` / late spans. It **saves backend cost, not egress**, and the flag
  no longer means "kept" (W3C: "deferred or delayed" means propagate the flag unchanged). MCQ: tail
  sampling behind round-robin fragments the traces.
- **Adjusted count**: a worked table (1M requests, 0.2% errors, keep all errors + 1% of the rest gives
  16.7% raw vs 0.2% weighted). Tail sampling records `th` in `tracestate` only behind an alpha feature
  gate that is off by default. **SLIs come from metrics.**
- **Version-bounded fact**: the spec deprecates `TraceIdRatioBased` in favour of a composable
  `ProbabilitySampler` (the old one is unchanged until at least 2027-01-01). OTel .NET core 1.19.1
  (2026-09-21) still ships only `TraceIdRatioBasedSampler`. Recorded 2026-10-06.
- **Code**: `Program.cs` with `ParentBasedSampler(new TraceIdRatioBasedSampler(0.05))` and the edge
  variant, a BCL-only `QuoteService` guarding an expensive tag on `IsAllDataRequested`, and a two-tier
  Collector YAML. **Cross-language**: the `OTEL_TRACES_SAMPLER` env vars and the shared default.
- **Exemplars and cost are only linked** (they are owned by 10 and 11).
- **The distributed-tracing cheat sheet** gained one sampling bullet and a link, because the Lesson is
  filed under that topic too. The `observability` sheet stays with 13.
- `RESOURCES.md`: OTel sampling concepts + SDK samplers + probability sampling, the tail sampling
  processor + load-balancing exporter, and the OTel .NET tracing customization doc + MS distributed
  tracing concepts.

Every quotation was re-read from the source in this session (from raw Markdown or source where
possible). One claim rests on the spec rather than each SDK's docs: that Java, Go, Python and Node
share the default sampler.
