# Author: Structured logging in .NET

Type: task
Status: open
Blocked by: —

## Question

AFK, via `/author`. Write the Lesson `content/lessons/structured-logging-in-dotnet.md`, titled "Structured logging in .NET".

- **Owns**: text vs structured logs, message templates, level policy, `[LoggerMessage]`, trace id on every line (`ActivityTrackingOptions`), a business correlation id beside it, what never to log (PII, secrets) and redaction, log injection (CWE-117), the canonical log line, logs as the expensive signal at volume.
- **`topic`**: `observability`
- **`prerequisites`**: [[metrics-logs-and-the-golden-signals]], [[trace-context-across-retries]]
- **Do not re-teach**: the three kinds of telemetry (link golden-signals' "Three kinds of telemetry, three jobs"); `traceparent` and automatic propagation (link trace-context-across-retries).

Source: the research note `content/research/what-does-a-senior-interview-probe-on-observability.md`. One code example in C# on the BCL APIs, with a short cross-language aside where the concept transfers; quiz blocks; quote sources only after re-checking wording (the note flags summarised fetches). `npm run validate` passes.
