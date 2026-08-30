---
id: 01M194P8YWSVZAKKAKVRAX407J
title: Standard resilience handler defaults
topic:
  - httpclient
  - http-resilience
---

Every number `AddStandardResilienceHandler()` configures for you, in the order the strategies
nest.

> *Verified against `Microsoft.Extensions.Http.Resilience` / Polly **v8.7.0** on
> **2026-08-27**.* These are configuration defaults, not properties of the patterns, and they
> have moved between package versions before. Check them against the version in your own
> `.csproj` before quoting them in an interview or a design doc.

## The five strategies

Outermost first. One call descends the list on its way to the socket and climbs back up it on
the way out.

| # | Strategy | Default |
|---|---|---|
| 1 | Rate limiter | 1,000 concurrent permits, queue limit 0 |
| 2 | Total timeout | 30s across all attempts and the backoff between them |
| 3 | Retry | 3 attempts, 2s base delay, exponential backoff, jitter on |
| 4 | Circuit breaker | 10% failure ratio, 100 minimum throughput, 30s sampling window, 5s break |
| 5 | Per-attempt timeout | 10s |

Why each one sits where it does is [[composing-a-resilience-pipeline|the composition argument]],
and it is the part of this table that does not change with the package version.

## What counts as a failure

Retry and circuit breaker are configured against the same trigger conditions, so by default
anything that provokes a retry is also countable by the breaker:

| Trigger | Note |
|---|---|
| HTTP 5xx | Any status at or above 500 |
| HTTP 408 Request Timeout | |
| HTTP 429 Too Many Requests | Retried *and* counted against the breaker by default |
| `HttpRequestException` | Transport-level failure |
| `TimeoutRejectedException` | Polly's, thrown by the per-attempt timeout — **not** `System.TimeoutException` |

## The levers, and where they run out

| Want | Do |
|---|---|
| Stop retrying `POST`/`PUT`/`PATCH`/`DELETE`/`CONNECT` | `options.Retry.DisableForUnsafeHttpMethods()` |
| Keep `429` from tripping the breaker | A `ShouldHandle` predicate on the circuit-breaker options |
| Honour a server's `Retry-After` | A `DelayGenerator` on the retry options |
| Different attempt count, delay, ratio or timeout | Assign the corresponding strategy option; the order is unaffected |
| Hedging instead of sequential retry | A different handler — `AddStandardHedgingHandler()` |
| Reorder the strategies | Not available. Build the chain yourself with `AddResilienceHandler` |

The custom route replaces the whole pipeline rather than amending it: strategies nest in the
order you add them, first call outermost, and the `HttpRetryStrategyOptions` /
`HttpCircuitBreakerStrategyOptions` / `HttpTimeoutStrategyOptions` / `RateLimiterStrategyOptions`
types are the same ones the standard handler fills in. **Never register both** — see
[[composing-a-resilience-pipeline]] for what nesting two handlers does.

There is **no method-based exclusion for hedging**. `DisableForUnsafeHttpMethods()` is a retry
extension and has no hedging counterpart, so keeping duplicate writes off the wire is a routing
decision rather than a handler flag: [[hedging-against-tail-latency]].

## Three that cost people points

- **The breaker will not trip below 100 calls in the sampling window.** A failure *ratio* is
  meaningless on a handful of requests, so the minimum throughput gates it entirely. A breaker
  that never fires in staging and fires in production is usually this, not a misconfiguration.
- **`HttpClient.Timeout` is still there, and still 100 seconds.** It is a separate ceiling
  outside the whole pipeline. Set it below the 30s total timeout and it silently becomes the
  real budget — and it is the one limit here that fires without raising a strategy-shaped
  exception for a predicate to catch. Details in [[total-versus-per-attempt-timeouts]].
- **The rate limiter's queue length is zero.** Calls over the limit are rejected, not queued.
  Raising the permit limit without deciding what a rejection should do to the caller moves the
  failure rather than removing it.

Numbers and trigger conditions from
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience);
the members they are declared on are in the
[`Microsoft.Extensions.Http.Resilience` namespace reference](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.http.resilience).
Which handler to reach for in the first place is [[choosing-a-resilience-pattern]].
