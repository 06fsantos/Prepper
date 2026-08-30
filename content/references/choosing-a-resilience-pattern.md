---
id: 01M194P8YYNN61JGJ3G40B9ZZV
title: Choosing a resilience pattern
topic:
  - http-resilience
---

Which pattern answers which failure, what each one costs, and when the standard handler stops
being the answer. The patterns are not alternatives to one another — a real pipeline runs
several — so read this as *what is this one for*, not *pick one*.

## By what you are looking at

| The symptom | Reach for | Because |
|---|---|---|
| Occasional 5xx, 408, 429 or dropped connection; the dependency is basically healthy | **Retry** | The next call probably succeeds |
| A sustained failure rate; the dependency is down or overloaded | **Circuit breaker** | The next call probably fails, and sending it costs you both |
| The dependency answers, but the p99 is far above the median | **Hedging** | The tail is usually one unlucky server, not the service |
| One slow dependency is taking the whole service down with it | **Bulkhead** | Nothing here makes it faster; the cap decides who else survives |
| Callers wait far longer than any number in the configuration | **Timeouts, both of them** | One number cannot bound an attempt and an operation |
| Retries are producing duplicate side effects | **Idempotency** first, then retry | Safety is a precondition of the pattern, not a tuning knob |

## What each one bets, and who pays

| Pattern | The bet | The cost | Full treatment |
|---|---|---|---|
| Retry | The next call succeeds | Extra load on something already failing; duplicate effects if unsafe | [[retry-versus-circuit-breaker]] |
| Circuit breaker | The next call fails | Requests refused that might have worked; needs volume to trip at all | [[retry-versus-circuit-breaker]] |
| Hedging | The *first* call is slow, not broken | Duplicate requests on the wire, paid by the dependency | [[hedging-against-tail-latency]] |
| Bulkhead | Nothing | Requests rejected at your own cap while the dependency is fine | [[bulkheads-and-blast-radius]] |
| Total timeout | The operation is no longer worth waiting for | Abandons attempts that might have succeeded — that is the point | [[total-versus-per-attempt-timeouts]] |
| Per-attempt timeout | This attempt is hung | A slow-but-alive dependency is turned into a failure | [[total-versus-per-attempt-timeouts]] |

Retry and circuit breaker are the pair worth being able to separate on demand: they make
**opposite bets about the same next call**, which is why they compose rather than compete, and
why the breaker goes inside the retry.

## Retry or hedge?

Both send the request more than once, and that is where the resemblance ends.

| | Retry | Hedging |
|---|---|---|
| Triggered by | A failure | Elapsed time |
| Attempts | Sequential — the previous one has ended | Concurrent — the first is still in flight |
| Answers | *Did it fail?* | *Is it taking too long?* |
| Helps with | Transient errors | The latency tail |
| Duplicate-write guard | `DisableForUnsafeHttpMethods()` on the retry options | **None.** Route reads to the hedged client |

That last row is the one to get right: the standard hedging handler offers no method-based
exclusion, so keeping duplicate writes off the wire is a routing decision. Either way the
underlying question is whether the operation is
[[idempotency-and-safe-retries|safe to send twice]], and the verb only tells you half of it.

## Standard handler or custom pipeline?

Start with `AddStandardResilienceHandler()`. Its five strategies are chained in the one order
that works, and the *shape* is the part hardest to reason back to from a bug report — harder
than any of the numbers, which are in [[standard-resilience-handler-defaults]].

| Situation | Standard is fine | Go custom |
|---|---|---|
| Defaults are the wrong numbers | ✅ Assign the options | |
| Do not retry unsafe methods | ✅ `DisableForUnsafeHttpMethods()` | |
| `429` must not trip the breaker | | A `ShouldHandle` predicate |
| Hedging instead of sequential retry | | `AddStandardHedgingHandler()` or a hedging strategy |
| A sharded dependency needs a breaker per shard | | Partition by the URL authority |
| You want a different strategy order | | The order is only yours in a custom pipeline |

**Whichever you pick, pick one.** Two resilience handlers on the same client nest rather than
combine: three retries inside three is nine attempts, and a retry ends up wrapping a breaker
wrapping a retry. Why the order is forced at all is [[composing-a-resilience-pipeline]].

## Two answers that are not patterns

- **Do nothing.** A dependency you call once, off the request path, with a caller that can
  simply see the error, does not need a pipeline. Resilience spends latency and load, and an
  unnecessary retry is load on someone else's service.
- **Fix the dependency.** A retry against a consistently failing service converts a fast
  failure into a slow one and adds traffic. Retry is for the transient; the circuit breaker
  exists precisely because the non-transient case has a different answer.

Pattern definitions and their tradeoffs from the Azure Architecture Center —
[Retry](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry),
[Circuit Breaker](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker),
[Bulkhead](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) — the hedging
argument from [The Tail at Scale](https://research.google/pubs/the-tail-at-scale/), and the .NET
mapping from
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience).
