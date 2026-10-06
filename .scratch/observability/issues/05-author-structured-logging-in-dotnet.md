# Author: Structured logging in .NET

Type: task
Status: resolved
Blocked by: —

## Question

AFK, via `/author`. Write the Lesson `content/lessons/structured-logging-in-dotnet.md`, titled "Structured logging in .NET".

- **Owns**: text vs structured logs, message templates, level policy, `[LoggerMessage]`, trace id on every line (`ActivityTrackingOptions`), a business correlation id beside it, what never to log (PII, secrets) and redaction, log injection (CWE-117), the canonical log line, logs as the expensive signal at volume.
- **`topic`**: `observability`
- **`prerequisites`**: [[metrics-logs-and-the-golden-signals]], [[trace-context-across-retries]]
- **Do not re-teach**: the three kinds of telemetry (link golden-signals' "Three kinds of telemetry, three jobs"); `traceparent` and automatic propagation (link trace-context-across-retries).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.

## Answer

Authored 2026-10-06 via `/author`: `content/lessons/structured-logging-in-dotnet.md` (four quiz
blocks: two mcq, one cloze, one recall). `npm run validate`: 0 errors. The only new warnings are
unwritten links to three sibling Lessons (06, 10, 11), which are expected, and
`topic-without-cheat-sheet` on `observability`, which is deliberately deferred to the capstone
ticket (13) by this map's execution granularity.

- **Sources re-checked verbatim** before quoting: MS Learn (logging overview, source generation,
  `ActivityTrackingOptions`), OWASP Logging Cheat Sheet, Stripe canonical log lines, and the SRE
  workbook. The research note's summarised quotes held up.
- **A fact the research note did not have**: the generic host's default `ActivityTrackingOptions`
  is `SpanId | TraceId | ParentId` (from `dotnet/runtime` `HostingHostBuilderExtensions`). The ids
  ride in the logging *scope*, so the console shows them only with `IncludeScopes`, while the OTel
  provider stamps them from `Activity.Current` regardless. Lessons 06 and 10 can rely on this.
- **Placeholder matching differs by API**: the `Log*` extension methods match by position, while
  `[LoggerMessage]` matches by name. Taught as a trap.
- The business correlation id is shown through `BeginScope`. The *why* links to
  tracing-a-flow-through-a-message-broker rather than being re-taught.
- `RESOURCES.md` gained an **Observability** section (MS Learn logging pages,
  `ActivityTrackingOptions` + OTel .NET correlation, SRE workbook, Stripe).
