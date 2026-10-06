---
id: 01M48SV7WHZ3D2M5DJ3211WMMB
title: Structured logging in .NET
topic:
  - observability
prerequisites:
  - metrics-logs-and-the-golden-signals
  - trace-context-across-retries
---

A log line is a **record, not a sentence**. Written as text, it can only be searched for words; written as
named fields, it can be filtered, grouped and joined to the trace it came from. In an interview, "we log
errors" is the vague answer. The fluent one names five things:

- a stable **message template**;
- a **level policy**;
- the **trace id on every line**, with a business correlation id beside it;
- a list of what is **never** logged;
- the admission that logs are the **expensive** signal.

Logs are the "what happened" layer of the [[metrics-logs-and-the-golden-signals#Three kinds of telemetry, three jobs|three kinds of telemetry]].
This Lesson is about writing them so they can answer that question.

Google's SRE workbook takes the same line. It talks about "structured logs that enable rich query and
aggregation tools as opposed to plain-text logs", and says what logs are for: "We tend to use logs to find
the root cause of an issue, as the information we need is often not available as a metric"
([SRE workbook, Monitoring](https://sre.google/workbook/monitoring/)).

## The message template is the schema

`ILogger` takes a **message template** and its arguments separately:

```csharp
logger.LogInformation("Reading value for {Id}", id);
```

The provider receives the template, the argument and the rendered text, so it can store `Id` as a
field. The [.NET logging docs](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging) give the
payoff: a query "can find all logs within a particular `RunTime` range without having to parse the time
out of the text message". The template itself is useful too. Every occurrence of one event shares it, so
"how often did this happen?" is a group-by on the template and not a regex.

String interpolation breaks both properties, and it compiles without complaint:

```csharp
logger.LogInformation($"Reading value for {id}");   // one unique string per id, no Id field
```

Now every message is a different string, the `Id` field does not exist, and the formatting runs even when
the level is switched off. The docs say plainly that "use of string interpolation can cause performance
issues". Analyzer
[CA2254](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2254),
"Template should be a static expression", flags it.

There is one trap in the extension methods: placeholders are matched by **position, not name**. The docs
warn that "the names aren't used to align the arguments to the placeholders". Get the order wrong and
`{OrderId}` holds a customer id with no error raised.

```quiz 01M48SV7WHZ9MNHM10JS94G5D4
A handler logs `logger.LogWarning($"Payment {paymentId} declined: {reason}")`. In production, what
has this cost you compared with a message template?

- [x] There is no field to filter by, and no shared template to count by
  > The provider receives one finished string, so `paymentId` and `reason` are not stored as fields,
    and each payment makes the message unique. "How many declines per reason?" turns into text parsing.
- [ ] The values are dropped from the log record before it is written
  > The values are in the text. They are just not separate fields, which is the problem. Text can
    be read but not grouped or filtered on without parsing it.
- [ ] The record is rejected by any provider that writes JSON output
  > A JSON formatter writes the interpolated string as the message. Nothing fails, which is why
    analyzer CA2254 exists to catch it.
- [ ] It logs at Information, because a level needs a template to apply
  > The level comes from `LogWarning` and is unaffected. What is lost is the structure, plus the
    formatting cost when Warning is switched off.
```

## `[LoggerMessage]`: the template, checked at compile time

The production form is **source-generated logging**. You put `[LoggerMessage]` on a `partial` method,
and the generator writes the body at compile time. According to
[Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/logger-message-generator), it
"eliminates boxing, temporary allocations, and copies to the maximum extent possible". Unlike the extension
methods, it matches placeholders to parameters **by name**, and it warns at compile time when they
disagree. One method per event also keeps each event's name, level and template in one place:

```csharp
public sealed partial class CheckoutHandler(ILogger<CheckoutHandler> logger, IPaymentGateway gateway)
{
    public async Task<Receipt> HandleAsync(Order order, CancellationToken ct)
    {
        // The business correlation id: every line inside this scope carries it.
        using var scope = logger.BeginScope(new Dictionary<string, object> { ["OrderId"] = order.Id });

        try
        {
            Receipt receipt = await gateway.ChargeAsync(order.Id, order.Total, ct);
            ChargeSucceeded(order.Total, receipt.PaymentId);
            return receipt;
        }
        catch (PaymentDeclinedException ex)
        {
            ChargeDeclined(ex, ex.ReasonCode);   // expected business outcome: Warning, not Error
            throw;
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Charged {Amount} as payment {PaymentId}")]
    private partial void ChargeSucceeded(decimal amount, string paymentId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Charge declined with {ReasonCode}")]
    private partial void ChargeDeclined(Exception ex, string reasonCode);
}
```

Since .NET 9, the generator can take the logger from a primary-constructor parameter, as above. The
`Exception` parameter gets special treatment: it travels as the record's exception and is never put in the
template. None of this touches the trace. The trace id arrives on its own, which is the next section.

## A level policy, not a level per mood

Levels are a **cost and noise control**, so they need a policy. The
[docs' own guidance](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging#log-level) is close
to the one worth defending:

- **Trace and Debug** are off in production. Trace messages "might contain sensitive app data" and
  "should not be enabled in production". You turn Debug on for one **category** while investigating, by
  changing configuration. A file-based configuration source reloads by default, so this needs no
  redeploy.
- **Information** follows the normal flow of the app. It is the production default, and it is the level
  whose volume you actually pay for.
- **Warning** is for something abnormal that did not fail the operation. A declined card is a Warning:
  the code worked, and the customer was told no.
- **Error** means the current operation failed and could not be handled. **Critical** means the app
  needs someone now. The docs say both levels "should produce few log messages". If they do not, the
  levels are being used wrong.

The level is not an alerting mechanism. An Error log is evidence, read **after** a metric has fired. The
next sections cover what each record should carry.

## The trace id on every line, and a correlation id beside it

A log line that cannot be joined to its trace is a dead end in an incident. The join key is the trace id.
[[trace-context-across-retries|`traceparent`]] already carries it into the process, and `Activity.Current`
holds it for the request.

In .NET you get the join without writing anything. The generic host, which sits under every
`WebApplication`, configures logging with
[`ActivityTrackingOptions`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.activitytrackingoptions)
set to `SpanId | TraceId | ParentId`. That is
[the host's default](https://github.com/dotnet/runtime/blob/main/src/libraries/Microsoft.Extensions.Hosting/src/HostingHostBuilderExtensions.cs).
The enum's own description says what it does: these are the "trace context parts [that] should be
included with the logging scopes". So the ids ride in the **scope**. How you see them depends on the
sink:

- A sink that renders scopes shows them. The console provider does this only with `IncludeScopes`
  switched on.
- The OpenTelemetry logging provider does not depend on scopes. It
  [populates `TraceId`, `SpanId` and `TraceFlags` "from the active activity"](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/logs/correlation/README.md),
  "if any".

That "if any" is the condition to remember: a line logged on a background thread with no ambient
`Activity` has no trace id.

The trace id is not enough on its own, because a trace is the thing most likely to be missing. Traces
are sampled, so the one request you were paged about may have none. Traces also expire within days, while
"what happened to order 8812?" gets asked weeks later. So add a **business correlation id**, the order id
in the example, through `BeginScope`. Every line inside the scope carries it. The full argument, including
how a correlation id differs from a message id, is in [[tracing-a-flow-through-a-message-broker]]. Here
the point is the logging mechanics: the scope is how the id gets onto lines you did not write it into.

```quiz 01M48SV7WHXDAZNF4H6ZHC906A cloze
The .NET generic host sets `ActivityTrackingOptions` to {{SpanId}}, {{TraceId}} and {{ParentId}} by default,
which puts the ids into the logging {{scope}}. So the console provider shows them only with
{{IncludeScopes}} enabled, while the OpenTelemetry provider stamps them from {{Activity.Current}}. A business
correlation id is added with {{BeginScope}}, because traces are sampled and expire.
```

## What never reaches a log, and what a log line can be made to say

Logs get copied, shipped, indexed and read by people who would never be given database access. That makes
them the easiest place to leak data. The
[OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
lists what should not be recorded directly:

- session identification values and access tokens;
- authentication passwords;
- database connection strings, encryption keys and other primary secrets;
- bank account or payment card holder data;
- "sensitive personal data and some forms of personally identifiable information".

OWASP's alternatives are to remove, mask, sanitise, hash or encrypt the data. Hashing still lets you
correlate a user's events without recording who the user is.

In .NET, the redaction policy can be **declared once rather than remembered at every call site**:

1. Mark a log parameter with a **data-classification** attribute.
2. Call `EnableRedaction()` on the logging builder.
3. Register a redactor for each classification, using
   [`Microsoft.Extensions.Compliance.Redaction`](https://learn.microsoft.com/en-us/dotnet/core/extensions/logger-message-generator#redacting-sensitive-information-in-logs).

Redactors are the components that "transform sensitive data (for example, by erasing, masking, or hashing
it)". This is the best answer to "how do you stop PII in logs?", because review alone fails the first time
someone logs a whole DTO.

The other half is **log injection**, [CWE-117](https://cwe.mitre.org/data/definitions/117.html). If
user-controlled text containing a carriage return or line feed is written into a plain-text log, it can
start a new, forged line, such as a fake `login succeeded for admin` entry. OWASP's rule is to sanitise
"carriage return (CR), line feed (LF) and delimiter characters" in event data. Structured output is
partial protection: JSON escapes a newline inside a value, so the forgery stays inside its field. The same
value can still reach a plain-text sink or a dashboard that renders it raw, though, so sanitising remains
the rule.

```quiz 01M48SV7WHK3K7DW3ZZ4ACPNRD recall
An interviewer asks: "What do you make sure never ends up in your logs, and how do you enforce it rather
than hope?" Then: "What is log injection, and does structured logging solve it?"

> **Never logged:** secrets (passwords, access tokens, session ids, connection strings, keys), payment card
> data, and PII. These follow OWASP's list. Hash an identifier if you still need to correlate on it.
> **Enforcement** is structural: classify the sensitive parameters and enable redaction in the logging
> pipeline (`Microsoft.Extensions.Compliance.Redaction` in .NET), so a careless call is redacted rather
> than leaked. Keep Trace off in production, since it may carry sensitive data.
>
> **Log injection** (CWE-117) means writing user-controlled input containing CR/LF or delimiters into a
> log, so it forges extra entries or breaks parsing. Structured output **reduces** the risk, because a
> JSON value escapes the newline. It does not **remove** it, since the value can still reach a text
> sink or be displayed raw. So sanitise CR, LF and delimiters anyway.
```

## One wide line per request, and why logs are the expensive signal

Scattered lines force the query to rebuild a request from fragments. Stripe's answer is the **canonical
log line**: "one long log line at the end that includes many of their key characteristics". That means
method, route, status, duration, caller and counts, all as fields on one record. Their reason is cost:
"because the underlying logging system doesn't need to piece together multiple log lines at query time
they're also cheap for computers to retrieve and aggregate"
([Stripe](https://stripe.com/blog/canonical-log-lines)). In ASP.NET Core this is one piece of middleware:
collect fields on the way in, then emit one Information record in a `finally` on the way out. Many teams
keep the canonical line at Information and move the narrative lines to Debug.

Even so, logs remain the **expensive signal at volume**. Their cost scales with every request, every line
and every field. The SRE workbook adds that there is "some inherent delay between when an event occurs and
when it is visible in logs". Both facts lead to the same rule: **alert on metrics, read logs after**. A
metric has already compressed a million requests into one number. A log has to be stored a million times
to say the same thing. How you control that bill (level policy, sampling Information but never Error or
audit lines, retention) is [[what-telemetry-costs]]. Following an alert from the metric down to these
lines is [[from-burn-rate-alert-to-the-log-line]].

```quiz 01M48SV7WH9GWJQM3M7XDWYQX5
Checkout should page someone when more than 1% of payments fail over five minutes. Every failure already
writes a structured Warning with `ReasonCode`. What should the alert be built on?

- [x] A failure counter, with the Warning logs read once it fires
  > A counter costs the same at any traffic level and is visible within seconds. The logs are what you
    read afterwards, filtered by trace id or reason, to find out why.
- [ ] A log query counting the Warning lines in each window
  > It works, but it pays log volume and indexing delay for something a counter does better. Logs are
    for the root cause, not the trigger.
- [ ] The canonical log line, aggregated across every request
  > It is cheap to query for an investigation, but it is still log storage per request, and the
    workbook warns that logs arrive with a delay.
- [ ] An Error log per failure, so the log level triggers paging
  > A declined payment did not fail the app, so it is a Warning. A page should come from the
    symptom metric, not from a log level.
```

## The same idea, elsewhere

The concepts carry over to other languages, and only the API names change. Go's standard `log/slog` takes
key/value pairs (`slog.Info("charged", "amount", amt)`). Java's SLF4J puts per-request ids in the
**MDC**, which plays the part of a logging scope. Python has `structlog`, and Node has `pino`. In every
case the OpenTelemetry approach is the same: keep the language's own logging library, and add trace and
span ids to each record from the active context. OpenTelemetry deliberately ships **no logging API of its
own for application code**, which is covered in [[opentelemetry-api-sdk-collector-otlp]].

## What to take away

**Write events, not sentences.** Use a constant message template, preferably through `[LoggerMessage]`,
so every field is queryable and every event is countable. Keep a **level policy**: Information in
production, Debug per category when you need it, Warning for business refusals, Error only when the
operation failed. Let the host put the **trace id** on every line, and add a **business correlation id**
through a scope for when the trace has been sampled away or has expired. **Redact by classification**,
sanitise CR and LF, and never log secrets or PII. Emit one **canonical line** per request. Finally, say
the cost out loud: logs are the expensive, delayed signal, so alert on metrics and use logs to find the
cause.

Worth reading in full: Microsoft Learn's
[Compile-time logging source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logger-message-generator).
It covers templates, the generator's constraints, dynamic levels and redaction on one page, with the JSON
each one produces.
