---
id: 01M1938DF3WJ9A6KTT2JN82JA2
title: A bulkhead does not make anything faster; it decides who else goes down
topic:
  - http-resilience
prerequisites:
  - httpclient-connection-lifetime
---

A ship's bulkheads do not stop it being holed. They stop one flooded compartment from
becoming a sunk ship. The software pattern makes exactly that trade: it will not make a slow
dependency fast, will not make a failing one succeed, and buys nothing at all on a healthy
day. What it buys is the answer to a question every other resilience pattern leaves open —
**when this dependency misbehaves, what else stops working?**

That question has a name worth using in an interview: **blast radius**. The scenario it
answers is a service whose payment calls are slow, that already retries correctly and already
breaks the circuit correctly, and whose *unrelated* calls are timing out anyway. Retry and the
breaker are both scoped to the failing dependency; the resource pool the caller draws from is
not.

## What actually gets exhausted

A request that is in flight and waiting is holding things. It occupies a slot in the
[[httpclient-connection-lifetime|connection pool]] for that host, and it occupies whatever
concurrency permit the pipeline in front of it handed out. Both are finite, and neither is
apportioned per dependency unless somebody apportioned it.

So a dependency that has gone from 50ms to 20s does not fail — that is the point, it is still
answering — and each of its callers simply stays in flight twenty times longer than it used
to. Concurrency in flight is arrival rate times duration, so a fortyfold rise in duration is a
fortyfold rise in what that one dependency is holding. Nothing warns you, because nothing has
gone wrong yet. Then the shared cap is reached, and calls to a dependency that is perfectly
healthy start queuing behind a dependency that is not.

The [Azure Architecture Center's Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
page opens on this exact cascade, and it is the one thing to go and read in full here: it is
short, it is written about resources rather than about HTTP, and it is where the "issues and
considerations" section that makes the pattern hard to apply well actually lives.

```quiz 01M1938DF4MR1F2SHJY309CPFB
A service calls a payment API, an email API and an analytics API through one shared pool of
connections and permits. Payment slows to twenty seconds a call. What breaks first?

- [x] Email and analytics calls, which have nothing left to draw on
  > The slow dependency holds the shared capacity, and its healthy neighbours wait for it.
- [ ] Payment calls, which begin failing once the pool empties
  > Payment calls are still succeeding. That is precisely why nothing has raised an alarm.
- [ ] The circuit breaker, which trips on the elevated latency figures
  > A breaker counts failures, and slow successful responses are not failures to count.
- [ ] The connection pool, which drops its idle connections early
  > Idle connections are not the pressure here; every connection in the pool is busy.
```

## The pattern is a cap you place deliberately

A bulkhead partitions a resource into pools with a boundary between them, one per dependency
or per concern, so that the worst a compartment can do is fill itself. If payment work is
capped at some number of concurrent calls, that is the most it can ever hold, and everything
else keeps the remainder no matter how badly payment behaves.

Two resources are worth partitioning, and they are not the same partition.

**Concurrency.** A limit on how many calls to one dependency may be in flight at once, with
excess either queued briefly or rejected outright. This is the pool people mean by "bulkhead",
and the important half of its behaviour is what happens when it is full: the caller finds out
*immediately* rather than joining a queue and discovering twenty seconds later that it should
not have bothered. That is the pattern doing its job — a fast local rejection is a far better
outcome for the caller than a slow remote one, because it is over quickly and it costs nothing
downstream.

**Connections.** `SocketsHttpHandler.MaxConnectionsPerServer` caps how many connections a
handler will open to one host, and registering a client per dependency gives each its own
handler and therefore its own ceiling. This is a coarser instrument than a concurrency cap and
it is worth knowing the ceiling is configurable rather than assuming it is not.

In the .NET resilience packages the concurrency cap is a **rate limiter strategy** in the
pipeline. The standard handler already puts one there — its defaults, along with the rest of
the pipeline's, are in [[retry-versus-circuit-breaker]] rather than repeated here — and the
number it defaults to is the thing to notice:

```quiz 01M1938DF4628BR8PQ7GEEWSM9 cloze
`AddStandardResilienceHandler` opens its pipeline with a rate limiter whose default permits
{{1,000}} concurrent calls with a queue limit of {{0}}. A default that high is not isolation
in any useful sense — it is a runaway guard — so getting a bulkhead out of it means setting
the permit count from what that dependency should actually be allowed to hold. *Defaults
verified against `Microsoft.Extensions.Http.Resilience` / Polly **v8.7.0** on **2026-08-27**.*
```

The isolation comes from **registering a client per dependency** and giving each its own
limiter, so that each one's ceiling is its own:

```csharp
builder.Services.AddHttpClient("PaymentApi")
    .AddResilienceHandler("payment", pipeline =>
    {
        pipeline.AddRateLimiter(new RateLimiterStrategyOptions
        {
            // The most payment work this service will ever hold at once.
            PermitLimit = 100,
        });
    });

builder.Services.AddHttpClient("EmailApi")
    .AddResilienceHandler("email", pipeline =>
    {
        pipeline.AddRateLimiter(new RateLimiterStrategyOptions { PermitLimit = 50 });
    });
```

Payment can now exhaust its hundred permits and email still has fifty. The two numbers are the
whole design: they are a statement about how much of this service's capacity each dependency
is worth, which is a product judgement wearing a configuration value's clothes.

```quiz 01M1938DF408XYZ41Y1AEDCTMQ
A dependency's concurrency limit is full and so is the short queue behind it. What should the
next call to that dependency do?

- [x] Fail straight away, without contacting the dependency
  > Local rejection is cheap, immediate, and adds nothing to a dependency already saturated.
- [ ] Wait until one of the in-flight calls releases a permit
  > That reintroduces the unbounded waiting the cap was put there to prevent.
- [ ] Retry a few times, in case a permit frees up shortly
  > Retrying a rejection spends the caller's capacity on a queue it was just refused.
- [ ] Bypass the limit, since the call has already been made
  > A cap that yields under pressure is a cap that is absent exactly when it mattered.
```

## Where the cap sits relative to everything else

The pipeline's order decides which strategy sees a call first, and the concurrency cap belongs
**outside** retry, the breaker and the timeouts — the first thing on the way out, not the last.
The reason is that all three of those *multiply* work. A retry turns one call into up to four,
[[hedging-against-tail-latency|a hedge]] turns one into two, and a call sitting on a
per-attempt timeout is holding its resources for the whole of that timeout. If the cap is
inside them, it is counting attempts after the pipeline has already decided to make them, and
the resource ceiling it was supposed to enforce has been multiplied by the retry count behind
its back.

Placing it outermost also makes the rejection cheap in the way the previous section wanted: a
call that is over the limit is refused before a connection, a timer or a breaker is involved
at all. The standard handler's own ordering follows this, and the fuller argument about why
each strategy sits where it does is [[composing-a-resilience-pipeline|its own subject]] —
as is the reason the pipeline needs
[[total-versus-per-attempt-timeouts|two separate timeout numbers]] for the cap to be reasoning
about a bounded duration in the first place.

```quiz 01M1938DF4W6X8HR9TAG607ZEF recall
Argue for putting a per-dependency concurrency cap outside the retry and circuit-breaker
strategies rather than inside them, and say what a bulkhead still cannot do for you.

> Retry and hedging both turn one logical call into several physical ones, and a timeout keeps
> a call holding its resources for the full duration of the timeout. A cap placed inside those
> strategies counts attempts rather than calls, so the real concurrency ceiling becomes the
> configured limit times the attempt count — the isolation is silently weaker than the number
> says. Placed outermost, the cap governs the whole pipeline's resource usage, and a call over
> the limit is rejected before a connection, a timer or a breaker is engaged, which makes the
> rejection cheap as well as correct.
>
> What it cannot do is help the dependency. Nothing about a bulkhead makes payment faster or
> more available; payment calls still fail or hang, and now some of them are rejected locally
> as well. The pattern only decides who else is affected — it converts an outage that spreads
> into one that stays put, and that is the entire benefit.
```

## Drawing the boundary in the wrong place

Two failure modes, and they pull in opposite directions.

**Too coarse and it is not a bulkhead.** One cap across a client that talks to several
dependencies restores the shared pool the pattern was meant to break up.

**Too fine and it stops being one.** If a single logical dependency is spread over several
hosts — a payment API served from three regions — a cap per hostname does not contain a
regional slowdown the way it looks like it should. Calls that would have gone to the sick
shard are not confined to its pool, and the healthy shards' pools are still capacity belonging
to the same logical dependency. The Azure pattern's "issues and considerations" section is
explicit that a bulkhead should be drawn around the **logical service boundary**, so that the
question the cap answers is "how much of this service's capacity is payment worth" — a
question about one payment service, not three hostnames.

That is worth holding next to the sharded-dependency advice for circuit breakers, which points
the other way: a breaker should be partitioned **per shard**, because merging shards' failures
into one counter lets a regional outage open the circuit globally. The two are not in conflict
once you notice they are answering different questions.
[[retry-versus-circuit-breaker|A breaker's state is an inference about health]], and health is
per host, so the finer partition is the accurate one. A bulkhead's limit is a budget, and the
budget belongs to the service you are buying from, however many machines it happens to run on.

## What to take away

The bulkhead is the pattern that treats your own service as the thing worth protecting. Retry
and the breaker are both reasoning about the dependency; the cap is reasoning about the caller,
and the sentence that carries it is that **a resource shared across dependencies is a channel
along which one dependency's problems reach the others.**

So the questions to ask are: what resource is shared, what is the smallest boundary it can be
partitioned along without splitting a single logical dependency, what should happen to a call
that arrives at a full compartment, and — because this is the number people leave at whatever
it was — is the limit actually smaller than the whole pool.
