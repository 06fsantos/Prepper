---
id: 01M48YY6B3E8VG8P894CRNT897
title: A reading order for observability
topic:
  - observability
  - distributed-tracing
---

Everything the vault holds on observability, in the order that makes each note land. It starts
with what the three signals are for, then covers how each one is emitted, then how it is shaped
and shrunk, and ends on the two questions a design round finishes with: how do you get from a
page to the cause, and what does all this cost? The vault carries no reading order of its own:
`prerequisites` is a graph and there are no lesson numbers. This is one path through that graph,
and where a note disagrees with this page the note wins.

Two things are worth noticing before starting. **The trace context comes before OpenTelemetry**:
[[trace-context-across-retries]] is step 2, not a tracing appendix. The trace id in its
`traceparent` header is the join key that the logs Lesson stamps on every line, that the sampling
Lesson decides on, and that the alert-to-cause walk-through follows from one signal to the next.
Every note after step 2 spends that field. **And the drill comes last but one.**
[[from-burn-rate-alert-to-the-log-line]] is where the logs, the histograms and the sampled traces
of the steps before it get used together. It is unarguable until each of them has been read on
its own terms, and it is the scenario an interviewer actually sets.

## The order

The **Scope** column marks the one step that is about a runtime rather than the subject
(`.NET`). Every `Concept` step also carries a C# example on the BCL APIs, and the closing section
says what those look like elsewhere.

| #   | Read                                            | Scope   | Why here |
| --- | ----------------------------------------------- | ------- | -------- |
| 1   | [[metrics-logs-and-the-golden-signals]]         | Concept | The frame: three signals, three jobs (metrics say *that*, traces say *where*, logs say *what*), the four golden signals, SLI vs SLO vs SLA, and alerting on symptoms rather than causes. Read first because every later step is one of those signals done properly |
| 2   | [[trace-context-across-retries]]                | Concept | The join key. `traceparent`'s four fields, the correlation the runtime gives you for free, and how to lose it. Read before anything that emits telemetry, because each of those steps either carries this id or is joined by it |
| 3   | [[structured-logging-in-dotnet]]                | .NET    | The logs signal done properly: the message template as the schema, a level policy, the trace id on every line via scopes, what must never reach a log, and the canonical log line. It prerequisites steps 1 and 2 |
| 4   | [[opentelemetry-api-sdk-collector-otlp]]        | Concept | The standard all three signals now travel on. The API vs SDK split (libraries call the API, the app chooses the SDK), resource vs attribute, the semantic conventions, OTLP and the Collector, which is where the backend choice lives. Read before the metric and sampling steps, because both are configured in the SDK or the Collector it introduces |
| 5   | [[metric-instruments-and-cardinality]]          | Concept | The metrics signal: two questions pick the instrument, every label combination is a series, and the SDK's cardinality limit drops what goes past it in silence. Read after step 4 because the limit and the view that changes it are SDK behaviour |
| 6   | [[why-percentiles-dont-aggregate]]              | Concept | Why forty pods' p99s are not a p99, and so why you export a histogram and merge before you compute. Read right after step 5 because a histogram is the instrument it chose, and the bucket is the error bar on every latency SLO after this |
| 7   | [[sampling-traces-head-tail-and-what-you-lose]] | Concept | The traces signal, shrunk: "sampled" means kept, head sampling decides at the root and carries the decision, tail sampling decides after the trace is complete at a Collector that has to see all of it. It prerequisites steps 2 and 4 |
| 8   | [[from-burn-rate-alert-to-the-log-line]]        | Concept | The drill. Burn rate and the multiwindow alert on the metric, then the walk-through naming the join key at every hop: alert, exemplar, trace, log line. It prerequisites steps 3, 6 and 7, which is why it is here |
| 9   | [[what-telemetry-costs]]                        | Concept | The bill: one meter per signal and the lever that cuts it, with what the lever costs in turn. Read last because each lever is a decision from an earlier step seen as a price, and "what does this cost?" is the follow-up that closes a design answer |

Steps 1–2 are the frame and the key, and a reader who already knows the golden signals and the
`traceparent` format can skim both. Steps 3–7 are **one signal at a time**: logs, then the
standard, then metrics and their aggregation, then traces and their sampling. Step 3 and steps
4–7 are independent of each other, and the logs Lesson can be read after the metrics pair just as
well. Steps 8–9 are the two answers the subject is examined on, the incident and the invoice, and
both need the signals in hand.

If time is short, **1 → 2 → 4 → 5 → 8** is the spine. The other four are what turn the answer
into one that sounds like experience: the level policy and the never-log list, the merge-before-
compute argument, the sampling trade, and the cost levers.

## Side reads, after step 7

Two tracing Lessons sit beside the path. They are not steps in it, because each one is about
tracing through a specific mechanism rather than about observability as a discipline. Both
prerequisite only step 2, and both read best once sampling has made "the trace is the thing most
likely to be missing" a familiar idea:

- [[tracing-a-flow-through-a-message-broker]] covers what goes on a message so an event-driven
  flow can be rebuilt afterwards: a trace context the consumer **links** to rather than parents
  under, and a business correlation id beside it. Read it if the design round is event-driven.
- [[tracing-hedged-attempts]] is the case the `traceparent` header cannot fully describe, and an
  honest "this is not settled". It assumes [[hedging-against-tail-latency]], the pattern itself,
  so read that first if hedging is new.

Both tracing Lessons and [[trace-context-across-retries]] keep the Application Insights framing
they were written with. The mechanism they teach is W3C Trace Context, and it is the same under
any backend.

## Practice checkpoint

There is no Problem for this subject yet, and observability in an interview is rarely a solved
artifact anyway. It is usually the second half of a design answer ("how would you know it is
broken?") or a scenario ("p99 just paged you, walk me through it"). So rehearse it aloud. After
step 8, take a service you have run and narrate the incident end to end. Name the SLI and the
SLO (step 1) and the burn rate that would page (step 8). Name the histogram behind the latency
number and why it was merged before the percentile was taken (step 6). Name the exemplar or trace
id that gets you from the graph to one request (steps 2 and 8), whether that trace was sampled
and what you look at if it was not (step 7), and the log line it lands on (step 3). Then answer
the follow-up: what does keeping all of that cost, and which lever would you pull first (step 9)?
If you go quiet at a hop, the walk-through in step 8 names the join key you were missing.

## The .NET-specific half, stated plainly

**One step is about a runtime and not about the subject**: [[structured-logging-in-dotnet]] is
`ILogger`, `[LoggerMessage]` and `BeginScope`. Its ideas (the template as schema, the trace id on
every line, the never-log list) are the field's, and it says so in its own "elsewhere" section.
The other eight are concepts with a .NET example. In .NET the OpenTelemetry **API** is the base
class library itself (`ActivitySource` for traces, `Meter` for metrics, `ILogger` for logs), and
the OpenTelemetry SDK plugs in underneath, so the code reads like plain BCL code. Everywhere else
you call the OpenTelemetry API package directly. What the idea looks like in other ecosystems:

| The idea                       | .NET                                                         | Elsewhere |
| ------------------------------ | ------------------------------------------------------------ | --------- |
| Structured log call            | `ILogger` with a message template, `[LoggerMessage]`         | Go: `log/slog`; Java: SLF4J, with the MDC playing the part of a scope; Python: `structlog`; Node: `pino` |
| Creating a span                | `ActivitySource.StartActivity`                               | The OpenTelemetry API's `Tracer` in Java, Go, Python and JavaScript |
| Recording a metric             | `System.Diagnostics.Metrics.Meter` and its instruments       | The OpenTelemetry API's `Meter`; or a Prometheus client library (`client_golang`, `prometheus_client` for Python) when the backend scrapes |
| Instrumentation without code   | OpenTelemetry .NET automatic instrumentation                 | Java: the OpenTelemetry Java agent; Python: `opentelemetry-instrument` |
| Collector, OTLP, Trace Context | The same in every language: they are protocols and a separate process, not a library | — |

The claim that survives any stack: **telemetry is only as useful as the key that joins it**. A
metric that pages, a trace that locates and a log line that explains are three different signals
held together by one trace id, and every cost lever in step 9 is a decision about which of the
three you are willing to lose.

## The night before

[[observability-cheat-sheet]] covers the whole path in eight blocks, from the signals' shape to
the cost levers, with the burn-rate table and the join keys in the alert-to-cause block. Read the
tracing mechanics in [[distributed-tracing-cheat-sheet]] beside it. A reading order is for the
fortnight before; a cheat sheet is for the morning of.
