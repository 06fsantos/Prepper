---
id: 01M1943TDYWXCY3JC164DWDEEC
title: HTTP resilience — cheat sheet
topic: http-resilience
---

**The standard handler's order, outermost to innermost** — and every position is forced:

`rate limiter → total timeout → retry → circuit breaker → per-attempt timeout`

- **Retry is outside the breaker.** Outside the retry, a breaker would see only the sequence's
  final outcome, so absorbed failures never reach its counters — and it could not short-circuit
  a sequence it had already admitted.
- **Total timeout outside the retry**, or the budget bounds one attempt instead of the
  operation. **Per-attempt timeout innermost**, or a slow attempt is never cut loose.
- **Rate limiter outermost** — work you are going to shed should be shed before it costs
  anything.

**What each pattern bets:**

- **Retry** bets the next call succeeds. Bounded attempts, exponential backoff, jitter, and
  only where it is safe.
- **Circuit breaker** bets it will not. Closed → Open → Half-Open; the half-open probe is the
  only way back.
- **Bulkhead** bets nothing — it decides *who else goes down*. A concurrency cap per
  dependency, so one slow API cannot starve the others.
- **Hedging** answers a different question: not *did it fail?* but *is it taking too long?*

**The traps:**

- **Retry is safe only where the operation is idempotent** — and idempotency is a promise of
  the server, not a property of the verb. `DisableForUnsafeHttpMethods()` on
  `options.Retry` turns retries off for `POST`, `PUT`, `PATCH`, `DELETE`, `CONNECT`.
- **There is no hedging counterpart to that.** The standard hedging handler offers no
  method-based exclusion at all, so keeping duplicate writes off the wire is a **routing
  decision** — the hedged client gets the read paths.
- **One breaker per dependency is not fine enough** when the dependency is sharded: one bad
  shard trips the breaker for the healthy ones.
- **Never stack resilience handlers.** One pipeline per client; retries nested inside retries
  multiply.
- Honour a `Retry-After` hint when the server sends one — it knows more than your backoff does.

Defaults (`Microsoft.Extensions.Http.Resilience` / Polly v8.7.0, verified 2026-08-27): retry 3
attempts / 2s base / exponential + jitter; breaker 10% failure ratio, 100 minimum throughput,
30s sampling, 5s break; rate limiter 1,000 permits, queue 0; total timeout 30s; per-attempt 10s.

Full treatment: [[composing-a-resilience-pipeline]], then
[[retry-versus-circuit-breaker]] and [[idempotency-and-safe-retries]].
