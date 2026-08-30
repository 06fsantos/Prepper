---
id: 01M192ZP7FPS3QEKS49335MAA9
title: Hedging spends bandwidth to buy back the latency tail
topic:
  - http-resilience
prerequisites:
  - httpclient-connection-lifetime
---

Most resilience patterns are answers to *did the call fail?* Hedging is the answer to a
different question: **the call did not fail, it is just taking far too long.** When a request
passes some threshold with no response, hedging issues a second one and takes whichever answer
arrives first. It is the only common pattern that spends resources on a call that is still
perfectly healthy.

## The tail is usually one unlucky server

At p50 a distributed system looks fine. The interesting number is p99, and it is rarely caused
by anything systemic: it is one server that hit a GC pause, missed a cache, or landed behind
some network jitter. Nothing is broken. One request out of a hundred simply drew the short
straw, and the caller is blocked waiting on it.

That framing is the whole basis of the pattern, and it comes from Dean and Barroso's
[The Tail at Scale](https://research.google/pubs/the-tail-at-scale/) — which is the one thing
to go and read in full here, because the reasoning generalises far past HTTP. If the slowness
is a property of *this attempt* rather than of the dependency, then a second attempt is
statistically unlikely to be unlucky in the same way, and racing the two costs you one extra
request and saves you the tail.

```
t=0ms    issue request #1
t=100ms  #1 still pending, so issue request #2
t=105ms  #2 answers, return it, stop waiting on #1
```

The 100ms is a **hedging delay**, and it is the pattern's one real tuning knob. Below it,
nothing happens and hedging costs nothing at all; above it, every call in the tail becomes two
calls.

```quiz 01M192ZP7G932G6BTSQSF0R2PE
What condition causes a hedging strategy to issue a second request?

- [x] The first request is still pending past a delay
  > That is the whole trigger: elapsed time with no response, not any kind of outcome.
- [ ] The first request came back with a 5xx status
  > That is a failure, and it is what retry reacts to. A hedge is issued before any answer.
- [ ] The circuit breaker for the endpoint has opened
  > An open breaker rejects calls immediately; there is nothing left running to race against.
- [ ] The connection pool for the client is exhausted
  > Pool pressure is what hedging costs you, never the signal that starts it.
```

## Hedging and retry make opposite assumptions

They look similar — both end up sending the request more than once — and they are triggered by
things that could hardly be more different.

**Retry reacts to an outcome.** Something came back, or the attempt died, and the strategy bets
that the next one will do better. **Hedging reacts to the absence of an outcome.** Nothing came
back yet, and the strategy bets that the first attempt is an outlier rather than a preview.

The practical consequence is that hedging is useless against a dependency that is actually
failing. If a call returns a 500, so will the duplicate; you have doubled the load on something
already struggling and learned nothing. Persistent failure is
[[retry-versus-circuit-breaker|retry and circuit-breaker territory]], and it should be fixed
there first. Hedging is the last optimisation you apply to a call that *mostly succeeds* and
occasionally drags — not a way to paper over one that does not.

The two do compose, and the breaker is what makes the composition safe: it rejects an
obviously-dead endpoint fast, so a hedged duplicate is not sent down a path already known to be
useless.

## Duplicate requests are the price, and someone pays it

A hedge is a real request. The server does the work twice, the network carries it twice, and
your own [[httpclient-connection-lifetime|pooled connections]] are occupied twice. Three
consequences follow, and each one is a place a hedging configuration goes wrong.

**Set the delay too low and you double your traffic.** If the delay is 10ms and typical
responses land at 50ms, essentially every call issues a duplicate. What you were trying to
shave off the tail you have instead added to the load on the dependency — and a dependency
under twice the load has a *worse* tail, which is the failure mode eating its own premise. The
delay only buys anything if the great majority of calls finish before it elapses, which makes
it a number derived from your own observed latency distribution rather than a default anyone
can hand you.

**The extra concurrency has to fit.** Hedging raises in-flight request count on exactly the
dependency that is already slow, so it interacts directly with whatever concurrency caps and
[[bulkheads-and-blast-radius|resource isolation]] you have in front of it. A hedge that has to
queue for a permit before it can be issued is not racing anything.

**The operation has to be safe to issue twice.** A `GET` or `HEAD` is by definition, per
[RFC 7231's safe methods](https://www.rfc-editor.org/rfc/rfc7231#section-4.2.1). Charging a
card is not, and a duplicate there is a second charge. Bulk uploads and expensive computations
are technically safe and still bad candidates, because doubling the cost of an expensive call
is not a trade you want made automatically on the p99.

That last one is worth being precise about in .NET, because it is where the standard handler
will not save you, and where the obvious escape hatch does not exist.
**`AddStandardHedgingHandler()` does not exclude unsafe HTTP methods on your behalf, and there
is no option that makes it.** `DisableForUnsafeHttpMethods()` is an extension on
`HttpRetryStrategyOptions`: it turns off *retries* for `POST`, `PUT`, `PATCH`, `DELETE` and
`CONNECT` — the methods RFC 7231 marks unsafe — and the hedging options have no counterpart.
The one predicate the package exposes for hedging, `HttpClientHedgingResiliencePredicates`,
decides what counts as a transient failure and says nothing about methods.

So keeping duplicate writes off the wire is a **routing decision, not a flag**: hedge the client
the read paths go through, and send writes through a client that does not hedge. Reach past the
problem only when the server genuinely deduplicates, which is the argument
[[idempotency-and-safe-retries|idempotency keys]] exist to make.

```quiz 01M192ZP7GNVA8BK8V31X8JY3H cloze
.NET's standard hedging handler will hedge any request you send through it.
`DisableForUnsafeHttpMethods()` does not help, because it is an extension on
{{HttpRetryStrategyOptions}} and therefore governs {{retries}} rather than hedging — the
hedging options have no counterpart to it. *API surface checked against the
`Microsoft.Extensions.Http.Resilience` reference, **2026-08-30**.*
```

## Where it sits in a pipeline

Hedging is its own handler rather than a strategy inside the standard resilience one, and the
standard handler's own defaults — retry, breaker, rate limiter and the two timeouts — are laid
out in [[retry-versus-circuit-breaker]] rather than repeated here.

One interaction is worth carrying, though: a hedged call is several attempts running at once,
so it is exactly the case that makes a single timeout number incoherent. A per-attempt timeout
bounds each racer and a total timeout bounds the race, and collapsing them into one gives you
neither — the reasoning is [[total-versus-per-attempt-timeouts|its own subject]], and hedging
is the sharpest illustration of it. What a hedged attempt does to a trace is another
([[tracing-hedged-attempts]]).

```quiz 01M192ZP7GMNJDN0KNXXKCQMV2 recall
A service sets a hedging delay of 10ms against a dependency whose responses typically arrive
in about 50ms. Describe what this does to the system, and how you would choose the delay
instead.

> Almost no call finishes inside 10ms, so almost every call issues a duplicate and the
> dependency sees roughly twice the traffic. The extra load lengthens its queues, which makes
> its latency distribution worse — so the setting degrades the very tail it was added to
> improve, while consuming a second connection and a second server-side unit of work per call.
>
> The delay has to sit high enough in the observed latency distribution that ordinary calls
> complete before it fires, so that only the genuine outliers are duplicated. That makes it a
> number measured from this dependency's own percentiles, and one that has to be re-checked
> when its performance changes — not a constant copied from a sample. The sanity check is the
> ratio of hedged requests to total requests: if it is not small, the delay is wrong.
```

## What to take away

Hedging answers latency, not availability, and it pays for the answer in duplicate work. So it
is worth reaching for when three things hold at once: the tail actually matters to whoever is
waiting, the call is safe to issue twice, and bandwidth is cheaper to you than milliseconds. If
any of the three fails — especially the second — the pattern is not merely unhelpful, it is a
way to turn a slow dependency into an overloaded one.

The .NET mechanics are in
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience),
but the argument is in [The Tail at Scale](https://research.google/pubs/the-tail-at-scale/),
and it is the one to read.
