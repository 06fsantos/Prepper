---
id: 01M192KR53MFGQQ02AEG7JXQNE
title: Retry versus circuit breaker
topic:
  - http-resilience
prerequisites:
  - httpclient-connection-lifetime
---

Retry and circuit breaking are the two patterns most often confused with each other, and the
reason is that they sit next to each other in every pipeline and react to the same failures.
They are not variations on a theme. They encode **opposite bets about what a failure means**,
and knowing which bet you are making is most of what makes a resilience configuration
defensible.

## The wrong instinct: retry until it works

Retrying looks like the obvious fix for a flaky call, and it is — as long as the failure is
transient. A bare retry loop *assumes* transience: a blip, a dropped packet, a pod that was
mid-restart.

When that assumption is wrong, retrying is actively harmful. If the dependency is down or
overloaded, every failed caller adds load to something already struggling, and every in-flight
attempt holds a thread and a connection while it waits. The pile-up is the mechanism by which
one slow dependency becomes an outage somewhere else entirely — the caller falls over first,
having spent all its capacity waiting on a service that was never going to answer. The
[Azure Architecture Center's circuit breaker page](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
opens on exactly this, and it is worth reading its "Context and problem" section before its
solution.

```quiz 01M192KR54WYCH7FH1VCDYY5NQ
A service retries every call three times against a dependency that is genuinely down. What is
the main damage?

- [x] The caller's own capacity is consumed waiting
  > Every attempt holds a thread and a connection, so the caller saturates before recovery.
- [ ] The failed responses are cached and reused
  > Nothing caches a failure here; each attempt is a fresh request over a fresh wait.
- [ ] The dependency's DNS records go stale
  > Staleness is a pooling concern, unrelated to how many times a call is reissued.
- [ ] The retries are silently downgraded to one
  > Nothing collapses them. All three are issued, and all three occupy the caller.
```

## Retry: bounded, backed off, and only where it is safe

The Retry pattern re-issues a failed call after a delay — exponential backoff with jitter, so
that a fleet of callers does not synchronise into a thundering herd on the same second. Two
constraints the guidance is strict about, and both come up in interviews:

**The operation has to be idempotent.** A `POST` that succeeded server-side but whose response
was lost looks identical, from the caller, to one that never landed. Retrying it can charge a
card twice. .NET's standard retry handler retries *every* method by default; excluding the
unsafe ones is an explicit call, `DisableForUnsafeHttpMethods()`, which drops `POST`, `PUT`,
`PATCH`, `DELETE` and `CONNECT` per
[RFC 7231's definition of a safe method](https://www.rfc-editor.org/rfc/rfc7231#section-4.2.1).
The deeper answer — how to make a `POST` retryable rather than merely excluded — is
[[idempotency-and-safe-retries|idempotency keys]].

**Retries must not stack across layers.** If a client library already retries three times and
its caller retries three times on top, you have nine attempts and multiplied delays, and
neither layer knows it. The rule is that the layer **closest to the dependency owns the retry
decision**, and everything above it fails fast.

## Circuit breaker: three states, and one that matters

The Circuit Breaker pattern flips the bet. After enough failures it stops calling the
dependency altogether for a while, failing immediately rather than letting callers queue behind
something dead. It has three states:

- **Closed** — requests pass through, failures are counted over a sampling window, and a
  threshold breach trips it Open.
- **Open** — every request fails immediately without reaching the dependency, while a break
  timer runs. On expiry the breaker moves to Half-Open.
- **Half-Open** — a limited number of trial requests are let through. Success returns it to
  Closed and resets the counters; **any single failure sends it straight back to Open and
  restarts the timer.**

Half-Open is the state worth understanding properly, because it is where the pattern's whole
value sits: it is a cheap, rate-limited probe rather than a resumption of traffic. And it is
the same move as expiring a pooled connection so DNS gets re-resolved — periodically re-test an
assumption about a dependency that nothing will notify you has stopped holding. The
[[httpclient-connection-lifetime|handler lifetime]] does it for addresses; the breaker does it
for reachability.

The one-line distinction to have ready: **retry bets the next attempt will succeed; the breaker
bets it will not, and protects the caller by refusing to make it.** That is also why they
compose rather than compete — retry a failing call a bounded number of times, and let the
breaker decide when even retrying has stopped being worth it.

## How .NET chains them

`AddStandardResilienceHandler()` registers five strategies in one call, outermost to innermost:

| Order | Strategy          | Default                                                        |
| ----- | ----------------- | -------------------------------------------------------------- |
| 1     | Rate limiter      | 1,000 concurrent permits, queue 0                              |
| 2     | Total timeout     | 30s across all attempts                                        |
| 3     | Retry             | 3 attempts, 2s base delay, exponential backoff with jitter     |
| 4     | Circuit breaker   | 10% failure ratio, 100 minimum throughput, 30s window, 5s break |
| 5     | Per-attempt timeout | 10s                                                           |

*Defaults verified against `Microsoft.Extensions.Http.Resilience` / Polly **v8.7.0** on
**2026-08-27**.* Check them against your own package version before quoting them; they are
configuration defaults, not guarantees of the pattern.

Both retry and breaker react to the same trigger conditions: HTTP 5xx, 408, 429,
`HttpRequestException`, and Polly's `TimeoutRejectedException`.

```csharp
builder.Services.AddHttpClient<PaymentStatusClient>(c =>
    c.BaseAddress = new Uri("https://payments.example.com"))
    .AddStandardResilienceHandler(options =>
    {
        options.Retry.DisableForUnsafeHttpMethods();
    });
```

The ordering is not arbitrary, and the reason the retry sits *outside* the breaker — and the
total timeout outside both — is [[composing-a-resilience-pipeline|the composition argument]].
That the two timeouts are separate numbers at all is
[[total-versus-per-attempt-timeouts|its own subject]].

```quiz 01M192KR54W1ZTB7ZV717YAE66 cloze
In `AddStandardResilienceHandler`'s pipeline the retry strategy sits {{outside}} the circuit
breaker, so each retried attempt passes through the breaker rather than around it. The
breaker's minimum throughput default exists because a failure *ratio* is meaningless on a
handful of calls: it will not trip at all until at least {{100}} calls have landed in the
sampling window.
```

That minimum-throughput number catches people out. A breaker configured at a 10% failure ratio
does nothing on a low-traffic endpoint, because the ratio is only evaluated once the window has
seen enough calls to make it mean something. A breaker that never trips in staging and trips in
production is usually this, not a misconfiguration.

## One breaker per dependency is not fine enough

A single breaker in front of a geo-sharded dependency merges error signals that should never
have been merged. Suppose a payment API is served from US-West, US-East and EU-Central, behind
one breaker. US-West has an outage. Enough of the total traffic fails to breach the ratio, the
breaker trips — and now EU-Central traffic is being rejected too, by your own code, while
EU-Central is perfectly healthy. A regional outage has been promoted to a global one.

The fix is a **breaker keyed by the shard**, usually the URL authority, so each host's failures
are counted against only itself:

```csharp
builder.Services
    .AddHttpClient("GeoShardedApi")
    .AddResilienceHandler("PerShardCircuitBreaker", pipeline =>
    {
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            FailureRatio = 0.1,
            // Partition state by URL authority so a US-West outage
            // cannot open the circuit for EU-Central.
        });
    });
```

This is the same instinct as [[bulkheads-and-blast-radius|a bulkhead]] applied to a failure
counter instead of a resource pool: the question in both cases is *what is the smallest unit
whose failure should be allowed to stop calls*, and the answer is almost never "everything
behind this client".

```quiz 01M192KR54JFZ64W053X10QXXE recall
A geo-sharded API is fronted by one circuit breaker configured at a 10% failure ratio. US-West
goes down; US-East and EU-Central are healthy. What happens, and what would you change?

> US-West's failures are counted into the same window as everyone else's. Once they push the
> combined ratio past 10% the breaker opens for the whole client, and requests to the two
> healthy regions are rejected by your own code without ever being sent. The regional outage
> has become a global one.
>
> The change is to partition the breaker's state per shard — keyed on the URL authority — so
> each host accumulates its own failure count and opens its own circuit. The counterpart
> question to ask is whether the shards also need separate connection pools and concurrency
> caps, which is a bulkhead rather than a breaker.
```

## Respecting a `Retry-After` hint

A `429 Too Many Requests` frequently carries a `Retry-After` header, and a dependency saying
"come back in 60 seconds" is the most reliable failure signal you will ever get: it is not
inferred, it is stated. Exponential backoff from a 2s base ignores it entirely and keeps
knocking.

Two things follow. The retry's delay generator should **honour the header when it is present**,
falling back to backoff when it is not. And when the stated delay is long — longer than the
break duration would have been — the breaker should **trip immediately** rather than waiting
for a failure ratio to accumulate. That is *accelerated circuit breaking*: the dependency has
told you it will keep failing, so there is nothing left for the ratio to discover.

```csharp
pipeline.AddRetry(new HttpRetryStrategyOptions
{
    MaxRetryAttempts = 3,
    DelayGenerator = args =>
    {
        var hinted = args.Outcome.Result?.Headers.RetryAfter?.Delta;
        return ValueTask.FromResult(
            hinted ?? TimeSpan.FromSeconds(Math.Pow(2, args.AttemptNumber)));
    },
});
```

The general principle is worth more than the code: **a resilience pipeline should prefer an
explicit signal from the dependency over its own inference.** The ratio, the window and the
backoff curve are all guesses about a system you cannot see inside. A `Retry-After` is not a
guess.

## What to take away

Say the bets out loud and the rest follows. Retry says *this will work if I wait a moment*, so
it needs bounded attempts, jittered backoff, and an operation it is safe to repeat. The breaker
says *this will not work for a while*, so it needs a window large enough to be meaningful, a
probe to find out when it is wrong, and a scope small enough that one shard's failure does not
speak for the rest.

Worth reading in full: the Azure Architecture Center's
[Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) and
[Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
pages as a pair — they are short, and they are deliberately written against each other. The
.NET-specific mapping is
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience).
