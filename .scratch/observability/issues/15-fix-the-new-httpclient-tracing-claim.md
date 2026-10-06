# Fix the `new HttpClient()` tracing claim

Type: task
Status: resolved
Blocked by: —

## Question

AFK, via `/author`. A correctness fix to an existing note, which the map's Notes allow as its
own ticket. `content/lessons/trace-context-across-retries.md`, lines ~99–102, says outbound
correlation needs an `IHttpClientFactory` client, "rather than a standalone `new HttpClient()`
that no instrumentation ever saw", and calls that "one more argument for the factory".

That is wrong. Both the span and the header come from the **bottom handler**, which every
`HttpClient` has, whether the factory built it or not:

- **The span**: "SocketsHttpHandler and HttpClientHandler report the HTTP client request
  activity" (`System.Net.Http` source; `System.Net.Http.HttpRequestOut`) —
  [Built-in activities in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-builtin-activities).
  Activities are created only if a listener subscribes; OTel and Application Insights subscribe
  via `DiagnosticSource` — [Networking tracing](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/telemetry/tracing),
  [Dependency tracking](https://learn.microsoft.com/en-us/azure/azure-monitor/app/dependencies).
- **The header**: `SocketsHttpHandler.ActivityHeadersPropagator` "the propagator to use when
  propagating the distributed trace and context. Use `null` to disable propagation"; the default
  is `DistributedContextPropagator.Current` (.NET 6+) —
  [API reference](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.socketshttphandler.activityheaderspropagator).

What to do: delete the factory condition and the "one more argument" sentence; the factory's
real arguments (pooling, DNS rotation) are already in [[httpclient-connection-lifetime]]. Keep
the paragraph on registration order. Optionally state the true condition in one line: propagation
is on by default for any client and is turned off only by setting the propagator to `null`.
No quiz depends on the claim (checked). Check the `distributed-tracing` cheat sheet still agrees.
`npm run validate` passes.

## Answer

Fixed in `content/lessons/trace-context-across-retries.md`, in "Correlation you get for free, and
the two ways to lose it". The factory condition is replaced by its opposite: span and
`traceparent` both come from `SocketsHttpHandler`, so any `HttpClient` correlates, and the
propagator is the only off switch. Both Microsoft pages are cited inline. The factory's case is
pointed at [[httpclient-connection-lifetime]] as pooling, not tracing. The next paragraph now
opens "The condition that does bite is **registration order**", since there is no longer a first
condition. The `distributed-tracing` cheat sheet never carried the claim; nothing else changed.
`npm run validate`: 0 errors.

The section heading "…and the two ways to lose it" became "…and how to lose it": the factory
condition was one of the two, and the gRPC bug that remains throws rather than losing correlation.
No anchor in the vault pointed at the old heading.
