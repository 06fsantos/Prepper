---
id: 01M192STZ5MBFZ7NF641198HWE
title: Total versus per-attempt timeouts
topic:
  - httpclient
  - http-resilience
prerequisites:
  - httpclient-connection-lifetime
---

A timeout looks like the simplest number in a networking stack: how long am I willing to wait?
It stops being simple the moment anything retries, because *the call* and *the operation* stop
being the same thing. From then on there are two questions — how long one attempt may hang, and
how long the caller may be kept waiting in total — and **no single number answers both.**

This is also the setting every other resilience pattern quietly depends on. A circuit breaker's
protection is only as good as how fast a failure is detected; a call that hangs for two minutes
inside a "protected" pipeline has held a thread and a connection for two minutes before the
breaker saw anything at all.

## `HttpClient.Timeout` is a blunt instrument

[[httpclient|`HttpClient`]] has one timeout property, it defaults to **100 seconds**, and it
applies to every request sent through that instance. There is no separate knob on it for "this
one attempt" versus "the whole operation" — the client does not know that anything above it is
retrying.

The obvious reaction is to turn it down, and there is a floor on how far. The
[`HttpClient.Timeout` remarks](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.timeout)
warn that DNS resolution alone can take up to 15 seconds, so a timeout set below that can fail
purely on name resolution, before a single byte of request work has happened. A client that
"times out under load" and turns out to have been failing at the resolver is a genuinely
confusing incident, because nothing in the error names DNS.

```quiz 01M192STZ62WBZB86K68DT9JMZ cloze
`HttpClient.Timeout` applies to every request through that client and defaults to
{{100 seconds}}. Setting it below roughly {{15}} seconds is risky on its own, because name
resolution alone can consume that long before any request work begins.
```

## Two numbers, two jobs

Once retries are in play, the two jobs pull in opposite directions.

**A per-attempt timeout bounds a single try.** Its job is to *fail fast into the machinery
around it*. Set it too high and a hung connection ties up a thread and a pooled connection for
the whole duration before the retry or the breaker gets a chance to react — which is exactly how
a long dependency timeout weakens a circuit breaker. The breaker is not broken; it is simply
being starved of the failure signals it counts.

**A total timeout bounds the whole operation, attempts included.** Its job is to protect the
*caller*. Without it, a request that keeps getting retried — each attempt finishing just inside
its own limit — can run far longer in aggregate than anything upstream expects. Three attempts
under a 10-second per-attempt limit, plus backoff between them, is a wait no per-attempt number
ever mentions.

Try to collapse them into one and you get whichever failure you did not choose: a number low
enough to fail fast is too low to allow a retry sequence to finish, and a number high enough to
cover the sequence lets one hung attempt consume all of it.

```quiz 01M192STZ605BG2QJ2NQWCENME
A per-attempt timeout is set far too high. What does that mainly delay?

- [x] The retry and breaker reacting to a failure
  > Nothing downstream sees a failure until the attempt gives up, so both strategies wait too.
- [ ] The pooled connection being recycled for DNS
  > Handler lifetime governs that, and it runs on its own schedule regardless of any timeout.
- [ ] The rate limiter releasing its concurrency permits
  > Permits are held for the call's duration, but that is the symptom rather than the delay.
- [ ] The response being deserialised by the caller
  > Deserialisation happens after a response arrives, and a hung attempt never produces one.
```

## What .NET actually configures

.NET's standard resilience handler sets both numbers, and their positions in the pipeline are
the argument made concrete: a **total timeout of 30 seconds** wraps the whole pipeline with the
retries inside it, and a **per-attempt timeout of 10 seconds** sits innermost, closest to the
request, bounding each individual try.

*Defaults verified against `Microsoft.Extensions.Http.Resilience` / Polly **v8.7.0** on
**2026-08-27**.* They are configuration defaults rather than properties of the pattern, so check
them against your own package version before quoting them. The rest of the handler's defaults —
the retry, breaker and rate-limiter numbers, and the order the five strategies chain in — are in
[[retry-versus-circuit-breaker#How .NET chains them|the standard handler's table]] and in
[[standard-resilience-handler-defaults]].

Two consequences of that layering are worth having ready. The total timeout is outside the
retry, so it can cut a retry sequence off mid-flight — that is its purpose, not a bug. And the
per-attempt timeout being innermost is what makes a hung call *become a failure* that the retry
and the breaker can both count. The whole reason
[[composing-a-resilience-pipeline|the order matters]] is that a strategy can only react to what
the strategies inside it surface.

Note also what this does to `HttpClient.Timeout`. If the pipeline is doing the bounding, the
client's own 100-second default should be well clear of the numbers above rather than competing
with them — a client timeout tighter than the total timeout silently becomes the real ceiling,
and it is the one number that raises no strategy-shaped exception when it fires.

## The naming trap that costs you the retry

Polly's timeout strategy throws `TimeoutRejectedException` — **not** the BCL's
`TimeoutException`. That distinction has teeth the moment you write a custom pipeline with a
`ShouldHandle` predicate on the retry: a predicate that checks for `TimeoutException` matches
nothing, and every timeout skips your retry logic in silence. There is no error, no warning, and
no failed request that looks any different from one you decided not to retry.

The [.NET resilience guidance](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
flags this on custom handlers specifically, because the standard handler already wires the
strategies together correctly. It is only when you assemble them yourself that the decision
becomes yours to make explicitly:

```csharp
httpClientBuilder.AddResilienceHandler("CustomPipeline", builder =>
{
    builder.AddRetry(new HttpRetryStrategyOptions
    {
        MaxRetryAttempts = 5,
        UseJitter = true,
        // ShouldHandle must decide about TimeoutRejectedException explicitly —
        // checking for TimeoutException alone matches nothing Polly throws.
    });
    builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
    {
        SamplingDuration = TimeSpan.FromSeconds(10),
        FailureRatio = 0.2,
        MinimumThroughput = 3,
    });
    builder.AddTimeout(TimeSpan.FromSeconds(5));
});
```

```quiz 01M192STZ6SPTQ9NJAAA8C4N45
Polly's timeout strategy signals an elapsed timeout by throwing which type?

- [x] `TimeoutRejectedException`, Polly's own type
  > A retry predicate that only checks the BCL type will not match it, and will not retry.
- [ ] `System.TimeoutException`, the BCL type
  > The similar name is the trap. Polly defines its own and does not throw this one.
- [ ] `HttpRequestException`, the transport type
  > That covers transport-level failures. A timeout is the strategy giving up, not the socket.
- [ ] `OperationCanceledException`, the cancellation type
  > Cancellation surfaces this, but the strategy raises its own rejection rather than reusing it.
```

```quiz 01M192STZ657NTZWR9GBAWBB0E recall
An interviewer asks: "what timeout would you set on this call?" Why is any single number a weak
answer, and what is the strong one?

> A single number has to serve two jobs that pull apart as soon as anything retries. One
> bounds a single attempt, and its job is to fail fast so that the retry and the circuit breaker
> get a failure to react to instead of waiting on a hung connection. The other bounds the whole
> operation including every attempt and the backoff between them, and its job is to cap the
> worst-case wait for whoever called you. A number low enough to do the first is too low to let
> a retry sequence finish; one high enough to do the second lets a single hung attempt spend all
> of it.
>
> So the answer is two numbers with reasons: a per-attempt timeout short enough that a stalled
> call fails quickly into the retry and breaker logic, and a total timeout sized to what the
> caller upstream can tolerate. Naming what each one protects — the pipeline's ability to react,
> and the caller's patience — is the part that shows you understand why there are two.
```

## What to take away

Say what each timeout protects and the numbers stop being arbitrary. **Per-attempt protects the
pipeline's ability to react; total protects the caller.** Everything else follows: why the
per-attempt one goes innermost, why the total one wraps the retries rather than sitting beside
them, why `HttpClient.Timeout` is the wrong place to express either, and why "what timeout would
you set?" is a question with two answers.

Worth reading in full:
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience),
which carries both the standard handler's defaults and the custom-handler warning about the
exception type. The
[`HttpClient.Timeout` remarks](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.timeout)
are two paragraphs and cover the 100-second default and the DNS floor.
