---
id: 01M194SYJM59NPVSKTH39KYMVS
title: Payment status polling client
kind: system-design
difficulty: medium
topic:
  - http-resilience
  - httpclient
practices:
  - retry-versus-circuit-breaker
  - total-versus-per-attempt-timeouts
  - idempotency-and-safe-retries
  - composing-a-resilience-pipeline
---

## Prompt

Your service sits in front of a third-party payment API. A user submits a payment, your
service charges the card through that API, and the user is then sent to a status page whose
front end polls your `/status` endpoint every few seconds; each poll asks the payment API for
the current state of the transaction. The provider is imperfect in four specific ways, and you
are given numbers for all four. Design the outbound HTTP configuration for that `/status`
call, and be ready to defend every element of it — including the ones you decided not to use.
Then say what changes for the charge call, which is not a read.

## Constraints

- About **2%** of requests fail transiently — a network hiccup, or the provider's own load
  balancer retrying internally.
- About **0.1%** return **429** when traffic spikes.
- Roughly **once an hour** the API is down for **30 seconds** of internal maintenance.
- Latency: **p50 100ms, p99 800ms**, occasionally 2–3 seconds.
- `/status` is a `GET`. The charge is a `POST` against the same provider.
- The poll is on a page the user is watching, but it is not the critical path — the charge
  already happened.

## Hints

1. Four failure numbers are given, and they are not all the same *kind* of failure. Sort them
   before choosing anything: which are one-off, which are sustained, and which are latency
   rather than failure at all?
2. Two of the patterns you know are worth naming and then **rejecting**, with the reason. The
   scenario's numbers are what make the rejection defensible rather than lazy.
3. The last part of the prompt is a different problem from the first, and the difference is
   not the HTTP method.

## Solution

The whole answer is one `AddStandardResilienceHandler()` on a named client, plus a deliberate
decision not to reach for two of the patterns, plus a separate client for the charge. The
interest is entirely in the defence, so take the failures one at a time.

**The 2% transient failures are a retry.** They are exactly what the pattern is for: a call
that failed for a reason that is unlikely to still hold a second later. `/status` is a `GET`,
so retrying is safe — and that safety is a fact about this endpoint, not about the verb, which
is the distinction [[idempotency-and-safe-retries]] turns on. Exponential backoff with jitter,
because every user's status page is polling on its own timer and a fixed delay would
resynchronise them into a thundering herd against an API that has just recovered.

**The hourly 30-second outage is a circuit breaker.** Retry alone would spend those 30 seconds
issuing attempts that cannot succeed, from every poller at once. The breaker converts that into
a fast, cheap failure the page can render as *temporarily unavailable*, and the half-open probe
is what lets service resume without anyone polling for it. The cost is real and worth saying
out loud: while the breaker is open, status calls that *would* have succeeded are refused too.
That trade is good here because the alternative is every request thread parked on a timeout.
Retry and breaker make [[retry-versus-circuit-breaker|opposite bets about the same next call]],
which is why both belong in one pipeline rather than one replacing the other.

**The p99 is not hedging.** This is the choice worth defending hardest, because 800ms looks
like the tail-latency case. It is not, for two reasons that come straight from the numbers.
Hedging doubles load on a provider that already rate-limits at 0.1%, so it converts a latency
problem into a 429 problem. And the poll is not on the critical path — the charge is already
committed, and a status page that refreshes 800ms late costs the user nothing. Name the
pattern, then decline it: *if the requirement became a sub-200ms p99, I would look at caching
the status on our side for a few seconds before I looked at [[hedging-against-tail-latency|hedging]],
because the polls are highly repetitive and the cache spends nothing downstream.*

**Bulkheads, likewise, are not yet earned.** There is one external dependency in this design.
A bulkhead's job is to decide [[bulkheads-and-blast-radius|who else goes down]], and there is
no *else*. The standard handler's rate limiter is already a ceiling on our own concurrency.
Say what would change the answer: a second and third dependency on the same request path.

**Two timeouts, and the defaults happen to fit.** A per-attempt timeout of 10s against a p99 of
800ms is more than an order of magnitude of headroom — deliberately, because it should fire on
*broken*, not on *slow*. The 30s total timeout covers three attempts and their backoff. That
these are two numbers rather than one is [[total-versus-per-attempt-timeouts|the whole point]]:
a single value cannot bound an attempt and an operation at once. The edge worth raising
unprompted is the browser's own timeout at the other end of the poll — our budget should expire
inside theirs, so the failure is one we shaped rather than a hang they gave up on.

```csharp
builder.Services
    .AddHttpClient("PaymentApiStatus", c =>
        c.BaseAddress = new Uri("https://api.payment-provider.com/"))
    .AddStandardResilienceHandler(options =>
    {
        // 429 means "slow down", not "you are broken". Let the retry back off;
        // do not let it fill the breaker's window and cut us off entirely.
        options.CircuitBreaker.ShouldHandle = args => ValueTask.FromResult(
            args.Outcome.Result is { StatusCode: >= HttpStatusCode.InternalServerError });

        // p99 is 800ms; the default 2s base delay stalls a watched page for
        // 5-10s across three attempts. Tighten it and keep the jitter.
        options.Retry.Delay = TimeSpan.FromSeconds(1);
    });
```

Everything else is left at its default, and the reason is the ordering rather than the numbers:
the standard handler chains rate limiter, total timeout, retry, breaker and per-attempt timeout
in the one arrangement that works, and reproducing that by hand to change two values would be
[[composing-a-resilience-pipeline|taking on the part that is hardest to get right]] in order to
adjust the part that is easiest. The defaults themselves are in
[[standard-resilience-handler-defaults]].

**The charge is a different client, and this is where the answer is won or lost.** A `POST`
that succeeds at the provider and fails on the way back is indistinguishable, from here, from
one that never landed — so a blind retry is a second charge. There are two moves and they are
not equivalent:

```csharp
builder.Services
    .AddHttpClient("PaymentApiCharge", c =>
        c.BaseAddress = new Uri("https://api.payment-provider.com/"))
    .AddStandardResilienceHandler(options =>
    {
        options.Retry.DisableForUnsafeHttpMethods();
    });
```

`DisableForUnsafeHttpMethods()` is the safe default and it is a **retreat**: it buys safety by
giving up recovery, so a transient blip on the charge now surfaces to the user as a failed
payment. The better answer, where the provider supports it, is an `Idempotency-Key` header on
the charge — a key you generate per payment intent, so the provider recognises the repeat and
returns the original result instead of charging again. That turns the `POST` into something
genuinely retryable and lets you put the retry back. Say both, in that order, and say which one
you would ship first.

Two things not to forget in the telling: register Application Insights **before** the
resilience handler, or the retries produce telemetry that is hard to correlate
([[trace-context-across-retries]]); and never add a second resilience handler to either client,
because the pipelines nest rather than combine.

## Follow-ups

- The provider starts returning 429 during every traffic peak. Does your breaker trip, and
  should it?
- Every poll takes 1.5 seconds for a day. Nothing is failing. What, if anything, do you change?
- Three retries with backoff can delay a status update by several seconds on a page the user is
  staring at. Is that acceptable, and what would you trade to shorten it?
- A second and a third external dependency arrive on the same request path. What is the first
  thing you add?
