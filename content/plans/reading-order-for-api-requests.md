---
id: 01M19PM0H1BN5MZA712Z2BEDGT
title: A reading order for API requests
topic:
  - httpclient
  - http-resilience
  - distributed-tracing
---

Everything the vault holds about calling another service over HTTP, in the order that makes each
note land — one client, then what to do when it fails, then how to see what happened. The vault
itself carries no reading order: `prerequisites` is a graph and there are no lesson numbers. This
is one path through that graph, not a second source of truth, so where a note disagrees with this
page the note wins.

Two passes, and they are not the same evening. The first is the mechanism and the patterns; the
second is instrumentation, and it only makes sense once there is a pipeline turning one logical
call into several.

## The order

| # | Read | Scope | Why here |
|---|---|---|---|
| 1 | [[httpclient-connection-lifetime]] | **.NET** | The handler owns the pool, not the client. Every other note on this page assumes it |
| 2 | [[total-versus-per-attempt-timeouts]] | Concept | The two clocks. Read before any pattern that retries, because retrying is what splits them |
| 3 | [[idempotency-and-safe-retries]] | Concept | Safety is a precondition of retrying, not a tuning knob. Read it *before* the retry note, not after |
| 4 | [[retry-versus-circuit-breaker]] | Concept | The pair that makes opposite bets about the same next call |
| 5 | [[bulkheads-and-blast-radius]] | Concept | The only pattern that buys nothing on a healthy day, and the only one that answers "what else stops working?" |
| 6 | [[hedging-against-tail-latency]] | Concept | The odd one out: the call did not fail, it is slow. Read last of the patterns, because it is the one that contradicts the retry instinct |
| 7 | [[composing-a-resilience-pipeline]] | **.NET** | Now that the strategies have names, the order they nest in is the part worth defending |
| 8 | [[trace-context-across-retries]] | Concept | Second pass. One logical call, several attempts, and a trace that has to say which did what |
| 9 | [[tracing-hedged-attempts]] | Concept | Last, deliberately: it needs both hedging and trace context, and its honest answer is "this is not settled" |

Steps 2–6 are five patterns and no order is forced between them beyond the two rules above —
timeouts before anything that retries, idempotency before retry. If time is short, 1 → 3 → 4 → 7
is the spine, and the other three are the notes that make an answer sound like experience.

## Look these up rather than reading them

Two References sit alongside the path and are not steps in it:

- [[choosing-a-resilience-pattern]] — symptom to pattern, and what each one bets. Open it at
  step 4 and keep it open through step 7.
- [[standard-resilience-handler-defaults]] — the numbers. **.NET-specific.** Worth one read at
  step 7 and lookups after that; the shape is harder to reconstruct than the values, which is why
  it is not the first thing on this list.

## Practice checkpoint

After step 7: [[payment-status-polling-client]]. It drills the retry/breaker split, both
timeouts, idempotency and the pipeline order in one design conversation, which is the form the
interview question actually takes. Doing it before step 7 works too — you will reach for the
ordering argument and notice it is missing, which is a good way to arrive at that note.

## The .NET-specific half, stated plainly

Three of the nine steps are about a runtime and not about HTTP:
[[httpclient-connection-lifetime]] is `SocketsHttpHandler`, `IHttpClientFactory` and
`PooledConnectionLifetime`; [[composing-a-resilience-pipeline]] is `Microsoft.Extensions.Http.Resilience`
over Polly; [[standard-resilience-handler-defaults]] is that package's option values. The topics
[[httpclient]] and [[http-resilience]] are scoped that way throughout the vault, because that is
the stack these notes were written against — not because the ideas are.

The transferable part is steps 2–6 plus the tracing pass. What moves, and what it lands in:

| The idea | Elsewhere it looks like |
|---|---|
| Handler owns the pool; reuse the client, recycle the connection | Go `http.Transport` and its idle-connection settings; Java `HttpClient`/OkHttp `ConnectionPool`; Node `undici` `Agent` keep-alive; Python `httpx.Client`/`requests.Session` |
| Retry, breaker, bulkhead, timeouts as composed strategies | Resilience4j or Failsafe on the JVM; `gobreaker` and hand-rolled middleware in Go; Envoy or a service mesh doing it off-process entirely |
| Total versus per-attempt clocks | Go `context.WithTimeout` around the operation and a `Client.Timeout` per call; anywhere else, the same two numbers under different names |
| Idempotency keys, safe verbs | Protocol-level. No runtime changes this one |
| Hedging | Rarely built in anywhere; usually the mesh's or a hand-written race |
| W3C `traceparent` propagation | OpenTelemetry in every one of those languages — the header on the wire is the same header |

If the interview is not a .NET interview, the honest framing is that the pattern reasoning is
portable and the configuration surface is not — and that off-process resilience in a mesh is a
real answer to the same problem, not a dodge.

## The night before

[[httpclient-cheat-sheet]], [[http-resilience-cheat-sheet]], [[distributed-tracing-cheat-sheet]].
Nothing on this page is a substitute for those; a reading order is for the fortnight before, and a
cheat sheet is for the morning of.
