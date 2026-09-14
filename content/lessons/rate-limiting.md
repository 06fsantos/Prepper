---
id: 01M22WV21W1BGFW4XDHWWX72G1
title: Rate limiting
topic:
  - system-design
---

A rate limiter is the cap you put on how fast one source may make requests, rejecting or
delaying the excess. It is one of the [[system-design-building-blocks|building blocks]] a
design round expects you to **select and justify** rather than name, and like every one of them
it is [[system-design-is-graded-on-process|graded on the reasoning]]: saying "add a rate limiter"
earns nothing; naming the algorithm, defending what it buys against what it costs, saying where
it sits, and knowing how it answers a rejected client is the signal. This Lesson is the four
algorithms you choose between, the response you owe a throttled caller, and the one honesty a
distributed limiter forces on you.

## Four algorithms, three things they trade

There are four algorithms in common use, and each is a real primary implementation you can point
at. What separates them is a three-way trade between **burst tolerance**, **output smoothness**,
and **accuracy at the window boundary**.

**Token bucket.** A bucket refills with tokens at a steady `rate`, up to a maximum of `burst`;
each request spends one token, and a request with no token to spend is rejected. This is AWS API
Gateway's model, which "throttles requests... using the token bucket algorithm, where a token
counts for a request," with a steady-state `rate` and a `burst` that lets "a burst... allow
pre-defined overrun"
([AWS API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)).
The point of the two knobs is that a bucket sitting full lets a quiet client spend up to `burst`
requests at once — so it **tolerates bursts up to a bounded size** while still holding the
long-run average to `rate`. Reach for it when clients are legitimately bursty but bounded, and
you want to absorb a spike rather than punish it.

**Leaky bucket.** Requests pour into a bucket that drains at a fixed rate; overflow is discarded.
Because the bucket drains at a constant rate no matter how fast it fills, the *output* is smooth —
this is NGINX's `limit_req`, which "uses the 'leaky bucket algorithm'... to deal with burstiness"
([NGINX](https://blog.nginx.org/blog/rate-limiting-nginx)). The difference from a token bucket is
the direction of the guarantee: a token bucket bounds the *input burst*, a leaky bucket bounds the
*output rate*. Reach for it when the thing downstream is fragile and must never see a spike —
you would rather refuse to emit faster than the leak rate than let a burst through.

**Fixed-window counter.** Count requests per fixed interval — a minute, say — and reset the count
when the window rolls over. It is `O(1)` and needs almost no memory: one integer per source. The
cost is the **boundary problem**: a client can fire a full quota in the last second of one window
and another full quota in the first second of the next, briefly running at **twice** the intended
rate across that seam.

**Sliding-window counter.** This fixes the boundary problem cheaply by weighting the previous
window's count by how much of it still overlaps the current one. Cloudflare's version blends the
two windows by elapsed time — `42 × (60-15)/60 + 18 = 49.5` — which "smoothes the traffic spike
issue that the fixed window method has" using only "two numbers per counter," and they measure it
at "0.003% of requests wrongly allowed or rate limited" and a "6% average difference between real
rate and the approximate rate"
([Cloudflare](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)). It is an
*approximation* — a log-based sliding window that stores every timestamp is exact, but it costs
`O(requests)` memory instead of two integers. So the fourth trade is **accuracy against memory**:
you accept ~6% rate error to keep the counter down to two numbers.

```quiz 01M22WV21XE2R9B8H8QRV3BECF
A client sends nothing for a minute, then needs to fire 20 requests back-to-back for a legitimate
batch job. You want to allow that spike but still hold its long-run average down. Which algorithm
fits, and why?

- [x] Token bucket, because a full bucket lets it spend a bounded burst at once while the refill rate caps the average
  > The bucket fills to `burst` while the client is quiet, so those saved tokens absorb the spike;
    the steady `rate` still bounds the long-run average. Tolerating a bounded burst is exactly what
    the two knobs buy you.
- [ ] Leaky bucket, because draining at a fixed rate is what lets the 20 requests through together
  > A leaky bucket does the opposite — it smooths the *output* to the leak rate, so the batch would
    be metered out one drain-interval at a time rather than allowed to spike. That protects a
    fragile downstream, not a bursty client.
- [ ] Fixed-window counter, because resetting the count each minute clears room for the whole batch
  > The reset is the boundary problem, not a feature: it would also let a client double the rate
    across the seam. It says nothing about tolerating a deliberate burst within a window.
- [ ] Sliding-window counter, because weighting the previous window smooths the batch spike through
  > The sliding window's job is to *stop* the boundary spike and hold a smooth rate — it would meter
    the burst down, not wave it through. Its trade is accuracy against memory, not burst tolerance.
```

## The response contract: 429, and the 503 trap

A rejected request needs an answer the client can act on, and the correct one is an application-
level HTTP status. The contract is **429 Too Many Requests**, which "MAY include a Retry-After
header indicating how long to wait before making a new request"
([RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585)). The `Retry-After` is the useful half: it
turns "no" into "not yet, try again in *N* seconds," which is what lets a well-behaved client back
off instead of hammering. AWS API Gateway returns exactly this 429.

Here is the folklore trap, and interviewers who have run a limiter know it: **NGINX's `limit_req`
rejects with 503 by default**, not 429, though the `limit_req_status` directive lets you override
that default status ([NGINX](https://blog.nginx.org/blog/rate-limiting-nginx)) — so you would set
`limit_req_status 429;` to emit the correct code. So 429 is the *correct* status the RFC
defines for rate limiting, but it is not what every limiter emits out of the box. Do not conflate
them: a 503 says "service unavailable" generically, while 429 says specifically "you are over your
limit," and a client can only special-case the backoff if you send the specific one. Naming both —
"429 is right, and I'd set `limit_req_status` because NGINX defaults to 503" — is the senior tell.

In an ASP.NET service the response is a few lines; the load-bearing part is emitting `Retry-After`
so the caller need not guess:

```csharp
// The caller has exceeded its allowance for this window.
// Retry-After: seconds until a token is available again — the client backs off on this,
// rather than retrying blindly and deepening the overload.
ctx.Response.Headers.Append("Retry-After", retryAfterSeconds.ToString());
return Results.Json(
    new { error = "rate_limited", message = "Too many requests." },
    statusCode: StatusCodes.Status429TooManyRequests);
```

The client's side of this contract is the mirror image, and it is [[idempotency-and-safe-retries|
the same safe-retry discipline]] that governs any retry: honour the `Retry-After`, and only retry
automatically on a method that is safe to repeat. A 429 on a `GET` is trivially retryable; a 429 on
a non-idempotent `POST` needs an idempotency key before a retry is safe — RFC 9110 defines an
idempotent method as one where "the intended effect on the server of multiple identical requests is
the same as the effect for a single such request"
([RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110)). The limiter and the retry policy are
two ends of one conversation.

```quiz 01M22WV21XMJFKGP79MSYQ49Z0 cloze
The correct status for a rate-limited request is HTTP {{429}}, which per RFC 6585 MAY carry a
{{Retry-After}} header telling the client how long to wait. The folklore trap is that NGINX's
`limit_req` rejects with {{503}} by default unless you override `limit_req_status`.
```

## Where it sits, and why a distributed limiter counts approximately

Placement is a spectrum, and the rule is: **push the limiter as far toward the edge as the counter
can still be shared.** At the **edge** (Cloudflare, per data centre) it sheds volumetric abuse
before it touches your infrastructure at all. At the **API gateway** it caps per API key, per
method, per account. At a **per-service reverse proxy** ([[load-balancing|NGINX in front of a
service]]) it protects one service's own capacity. The closer to the client the rejection happens,
the cheaper it is — a request refused at the edge never consumed a socket, a thread, or a database
query on your origin.

But there is a cost the edge placement makes unavoidable, and naming it is the mark of someone who
has run one: **a limiter spread across many nodes counts approximately.** Each node has its own
view of the counter, and they reconcile with a lag — Cloudflare's own docs warn of "a delay of up
to a few seconds between detecting a request and updating rate counters," so "excess requests could
still reach the origin before... a mitigation action"
([Cloudflare WAF](https://developers.cloudflare.com/waf/rate-limiting-rules/)). The
choice underneath is the familiar one: you could make every node read and write one shared counter
synchronously and be exact, but that shared counter is now a coordination point on the hot path —
latency and a bottleneck. So distributed limiters lean the other way, count locally, and accept
that a little excess slips through during the propagation window. A rate limit is a **coarse
control against abuse and overload, not an exact quota** — if you need an exact count you pay for it
in coordination, and in a design round you say so rather than pretending the number is precise.

```quiz 01M22WV21XFCWCDPHRQ1S3WAMQ recall
An interviewer says: "You're putting a rate limiter in front of a public API running across many
edge nodes. Defend it — which algorithm, where does it sit, what do you send a throttled client,
and what's the catch you'd call out?" Give the answer you'd say out loud.

> I'd default to a **token bucket** per API key — a steady `rate` for the long-run average and a
> `burst` so a legitimately bursty client can spike without being punished, which is AWS API
> Gateway's model. If the thing I'm protecting downstream were fragile and couldn't take spikes at
> all, I'd switch to a **leaky bucket** to smooth the output rate instead.
>
> I'd put it **as far toward the edge as the counter can be shared** — at the edge for volumetric
> abuse, at the gateway per key and method — because the closer to the client the rejection is, the
> cheaper it is: a request refused at the edge never spent a socket or a query on my origin.
>
> A throttled client gets **429 Too Many Requests** with a **`Retry-After`** header so it backs off
> instead of hammering — and I'd note that some limiters, NGINX for one, default to 503, so I'd set
> the status explicitly. On the client side I only auto-retry the 429 on idempotent methods.
>
> The catch I'd call out unprompted: a limiter spread across nodes **counts approximately**. Each
> node's counter reconciles with a lag of up to a few seconds, so a little excess slips through
> before the count catches up. Making it exact means a shared synchronous counter on the hot path —
> a coordination bottleneck — so I treat the limit as a coarse control against overload, not an
> exact quota, and say so.
```

## What to take away

A rate limiter is a choice with a named cost, not a box. **Algorithm:** token bucket for bounded
burst tolerance (two knobs — `rate` and `burst`), leaky bucket for a smooth output rate that shields
a fragile downstream, fixed window for `O(1)` cheapness at the price of a boundary spike that
doubles the rate at the seam, sliding window to fix that spike with two numbers and ~6% error.
**Response:** 429 Too Many Requests with a `Retry-After`, and know that NGINX defaults to 503 —
429 is correct, not universal. **Placement:** as far toward the edge as the counter can be shared,
because a rejection is cheapest closest to the client. **Honesty:** a distributed limiter counts
approximately, because the alternative is a synchronous shared counter on the hot path. Lead with
what each choice gives up, and the box becomes an argument. The scan-grid companion is
[[system-design-building-blocks]], and rate limiting sits beside the other blocks a round pulls
from — [[load-balancing]], [[message-queues]], [[content-delivery-networks]], and
[[api-design]].

Worth reading in full: the
[Cloudflare "Counting things" post](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)
— it derives the sliding-window counter from the fixed-window boundary problem with the exact
arithmetic and the measured error, so you leave understanding *why* two integers approximate a
sliding window rather than just that they do.
