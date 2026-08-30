---
id: 01M193YW103W1G91FFE71HCDBZ
title: A resilience pipeline nests, and every position in it is forced
topic:
  - http-resilience
prerequisites:
  - httpclient-connection-lifetime
  - retry-versus-circuit-breaker
  - total-versus-per-attempt-timeouts
---

A resilience configuration reads like a list of features — a retry, a breaker, a couple of
timeouts, a concurrency cap — and that reading is what makes its order look like a style choice.
It is not a list. It is a set of **nested wrappers**: one call descends through every strategy on
its way to the socket and climbs back through every one of them on the way out, and each
strategy sees only what the strategies inside it hand up.

So the order is not a convention, and it is not "the order Microsoft happened to pick". Each
position is **forced** by two facts about the strategy that occupies it: what it needs to be
able to count, and what it needs to be able to cut short. Get those two questions right for a
strategy and its position falls out. The useful exercise — and the interview question hiding
inside this — is not *what is the order* but *what breaks if you swap those two*.

## Two directions of dependence

Everything below is an application of one pair of statements, which are worth having before the
examples rather than after them.

**A strategy can only react to what the strategies inside it surface.** A breaker counts
failures; something inside it has to have decided that a hanging call *is* a failure. A retry
re-issues a call; something inside it has to have finished the previous attempt.

**A strategy can only bound what the strategies inside it do.** A budget that cannot interrupt
the thing it is budgeting for is not a budget. A cap that sits inside the thing multiplying work
is counting the wrong unit.

Those pull in opposite directions along the same axis, and between them they sort every strategy
in the pipeline. Things that **multiply** work — a retry, a hedge — go *inside* the things that
bound work and *outside* the things that detect failure. Detectors go innermost, because
everything else is downstream of their verdict.

```quiz 01M193YW11PXR7YE6XSCGEGZR1 cloze
A resilience pipeline is nested rather than sequential, so a strategy can only react to what the
strategies {{inside}} it surface, and can only be bounded by the strategies {{outside}} it. In
.NET's standard handler the outermost strategy is the {{rate limiter}} and the innermost is the
{{per-attempt timeout}}.
```

The five strategies .NET's standard handler chains, and the number each one is configured with,
are in [[retry-versus-circuit-breaker#How .NET chains them|the standard handler's table]] and in
[[standard-resilience-handler-defaults]]. What follows is why each of them is where it is.

## Retry outside the breaker, not the other way round

This is the swap most people get wrong, and they get it wrong in the direction that sounds more
protective: surely the circuit breaker — the strategy whose entire job is to stop calls — should
be the outer one, so that it can refuse the whole operation?

Put it there and it stops being able to do its job, for two separate reasons.

**It would see one outcome per operation instead of one per attempt.** A breaker outside the
retry only ever observes what the retry hands up, which is the *final* result of the sequence. A
dependency that fails two attempts out of three and succeeds on the third reports success. The
breaker's window fills with successes while the dependency is visibly sick, and it never trips —
the failures that would have tripped it were absorbed by the strategy above. The breaker's
counters have to be fed at the granularity at which the dependency was actually contacted, and
that granularity is the attempt.

**It could not stop a retry sequence it had already admitted.** Once an outer breaker lets a call
through, the retry inside it runs to completion regardless of what the dependency does in the
meantime. With the breaker inside, every attempt passes through it individually, so the moment it
opens, the remaining attempts of the sequence *currently in flight* fail immediately without
reaching the wire. That is where the pattern earns most of its value: the retry's backoff is
precisely the interval during which the breaker gets to change its mind, and it can only act on
that if the attempts come back through it.

There is a pleasing symmetry in the outcome. The retry is outer, so it decides *whether to keep
going*; the breaker is inner, so it decides *whether this attempt is worth sending*. That is the
same division the two patterns' [[retry-versus-circuit-breaker|opposite bets]] describe, arranged
in space.

```quiz 01M193YW11KEKJCEV9FETKBQNQ
Placing the circuit breaker *outside* the retry rather than inside it costs the breaker what,
specifically?

- [x] It sees final outcomes, not individual attempts
  > A sequence that fails twice and succeeds once reports success, so its window never fills.
- [ ] It sees individual attempts, not final outcomes
  > That is the inner position, and it is the one that gives the breaker what it needs.
- [ ] It counts each retried attempt as a separate error
  > Counting attempts is correct and wanted. That is the argument for the inner position.
- [ ] It can no longer short-circuit a call at all
  > It still refuses calls; what it loses is the evidence for deciding when to start.
```

## The total timeout outside the retry

A total timeout's job is to cap what the caller waits for, attempts and backoff included. That
job is only doable from outside the thing generating the attempts.

Move it inside the retry and it does not become a worse total timeout — it becomes a
**per-attempt timeout with a misleading name.** The strategy would be entered afresh on every
attempt, so its clock would restart every time, and the aggregate wait would be the attempt
count times the timeout plus all the backoff between them: unbounded from the caller's point of
view, and larger than any number written in the configuration. The reason the two numbers are
[[total-versus-per-attempt-timeouts|separate at all]] is exactly this, and the position is the
argument made structural.

The consequence people flinch at is the right one to defend: from outside, the total timeout can
kill a retry sequence *mid-flight*, abandoning attempts that might have succeeded. That is what
it is for. A caller that has been waiting thirty seconds has already lost, and finishing the
third attempt buys nothing except a slower failure.

```quiz 01M193YW1117JZ3DSHK01T5QND recall
Someone moves the total timeout to sit inside the retry strategy, reasoning that this way each
attempt gets a clean budget. Describe what they have actually built.

> A per-attempt timeout, under the wrong name — and now there is no total timeout at all. Being
> inside the retry means the strategy is entered once per attempt, so its clock restarts on each
> one. Nothing in the pipeline is measuring the operation as a whole any more.
>
> The worst case is the part that does not appear anywhere in the configuration: the caller can
> wait the attempt count multiplied by the timeout, plus every backoff delay between attempts.
> A "30-second timeout" on three attempts with backoff is a wait well past ninety seconds, and
> nothing raises so much as a warning about it.
>
> The property that was lost is the ability to interrupt. A total timeout has to be able to
> abandon a retry sequence part-way through, because the caller's patience is a budget for the
> whole operation and not for each of its parts, and only a strategy wrapping the retry can spend
> it that way.
```

## The per-attempt timeout innermost

The per-attempt timeout is the strategy that manufactures the failure signal everything above it
consumes. A dependency that accepts a connection and then simply never answers produces no error
of its own; the timeout is what converts that silence into a failure with a type and a stack.

Put anything between it and the request and that strategy is now waiting on a call it has no way
of ending. A breaker placed inside the per-attempt timeout would sit watching a hang, counting
nothing, until the transport itself gave up — and the transport's own limit is
[[total-versus-per-attempt-timeouts|`HttpClient.Timeout`]], which defaults to 100 seconds. The
breaker is not broken in that arrangement. It is starved.

Two things follow from the same position, and it is worth keeping them apart. Innermost is what
makes the timeout *produce* failures for the counters above it. Being inside the retry is what
makes it bound *each attempt* rather than the operation — a timeout outside the retry, whatever
you called it, would be a second total timeout.

## The rate limiter outermost

The concurrency cap is the one strategy whose unit is the **call** rather than the attempt.
Everything between it and the socket multiplies work: a retry turns one call into several, a
hedge turns one into two, and a call sitting on its per-attempt timeout is holding a connection
and a thread for the whole of that duration. A cap placed anywhere inside those strategies is
counting attempts, so the real ceiling becomes the configured limit times the attempt count —
[[bulkheads-and-blast-radius|weaker than the number says]], and silently so.

Outermost also makes rejection cheap, which is the only way rejection helps: a call over the
limit is refused before a connection, a timer or a breaker has been engaged on its behalf.

One consequence is worth knowing rather than defending, because it only bites in a pipeline you
built yourself. With the limiter outside the total timeout, time spent *queueing for a permit* is
not charged against the operation's budget — the clock starts once the call is admitted. The
standard handler's queue length is zero, so there is no wait to charge and the question does not
arise; give a custom limiter a queue and it does.

## When the order becomes yours

`AddStandardResilienceHandler()` is the whole argument above, pre-assembled, and the reason to
start there is not that the numbers are right for you — they very likely are not — but that the
*shape* is right and it is the part that is hardest to reason back to from a bug report.

Reach for `AddResilienceHandler` when your requirements diverge from the defaults rather than
from the order: a `ShouldHandle` predicate that keeps `429` from tripping the breaker, timeouts
sized to a caller you know something about, hedging in place of sequential retry. In a custom
handler the strategies nest in **the order you add them**, first call outermost, so the ordering
that the standard handler had settled for you becomes a decision you are now making on every
line. Which of the two to reach for, per situation, is
[[choosing-a-resilience-pattern|its own selection question]].

```csharp
builder.Services
    .AddHttpClient("ShardedApi", c => c.BaseAddress = new Uri("https://sharded.example.com/"))
    .AddResilienceHandler("ShardedApiResilience", pipeline =>
    {
        // Added first, so outermost. The cap counts calls, before anything multiplies them.
        pipeline.AddRateLimiter(new RateLimiterStrategyOptions { PermitLimit = 500 });

        // Total budget: outside the retry, so it can cut a sequence off mid-flight.
        pipeline.AddTimeout(TimeSpan.FromSeconds(45));

        pipeline.AddRetry(new HttpRetryStrategyOptions { MaxRetryAttempts = 3, UseJitter = true });

        // Inside the retry, so every attempt is counted and can be refused individually.
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions { FailureRatio = 0.2 });

        // Innermost: turns a hang into a failure the two strategies above can see.
        pipeline.AddTimeout(TimeSpan.FromSeconds(15));
    });
```

Note that nothing in that pipeline declares a timeout to be "total" or "per-attempt". There is no
such flag, and there does not need to be one: **the two timeouts differ only in where they sit**,
and that is the cleanest possible demonstration of the whole argument.

Hedging is a separate handler rather than a strategy inside this one, but it sorts by the same
rule if you build it in: it multiplies work, so it belongs inside the budget and the cap and
outside the detectors, in the class the retry occupies. What it does to
[[tracing-hedged-attempts|a trace]] is a different and less settled matter.

*Everything concrete here — the five strategies, their order and their defaults — is verified
against `Microsoft.Extensions.Http.Resilience` / Polly **v8.7.0** on **2026-08-27**.* The
ordering is a property of the pipeline; the numbers are configuration defaults, so check them
against your own package version before quoting them.

## One pipeline per client, never two

The composition failure that actually happens in production is not a wrong order. It is two
resilience handlers on the same client, usually because one was added in a shared extension
method and the other by whoever was configuring that dependency. The .NET resilience guidance
warns against it explicitly.

The damage is that the pipelines nest, so everything multiplies rather than combines. Three
retries inside three retries is nine attempts and a compound backoff neither configuration
mentions; two total timeouts are two clocks over different spans; and there is now a retry
wrapping a breaker wrapping a retry, which is exactly the arrangement the second section of this
note argues is broken. This is the same rule that says
[[retry-versus-circuit-breaker|retries must not stack across call layers]], applied one level
down — and it is worth checking for first, because a resilience bug whose cause is a duplicate
registration looks identical to one caused by bad tuning.

```quiz 01M193YW115Q90P4WPC69TV93Q
Two resilience handlers end up registered on the same `HttpClient`. What is the most likely
result?

- [x] The pipelines nest, so every strategy multiplies
  > Three retries inside three is nine attempts, and a retry now wraps a breaker wraps a retry.
- [ ] The second registration replaces the first
  > Nothing deduplicates them; both handlers are in the chain and both run on every call.
- [ ] The second registration is quietly discarded
  > It is not ignored. Its strategies are added, which is precisely what causes the damage.
- [ ] The protection is doubled, which is wasteful
  > Doubling a strategy is not doubled protection; the caps and budgets stop meaning anything.
```

## What to take away

Do not memorise five names in a row. Memorise the two sentences that generate them: **a strategy
can only react to what is inside it, and can only bound what is inside it.** Then place anything.
Detectors innermost, because everything downstream needs their verdict. Multipliers next, inside
the budgets that have to be able to interrupt them and outside the counters that have to see
every attempt. Caps and budgets outermost, because they are the only ones measuring the call
rather than the attempt.

The version of this worth saying in an interview is the swap, not the list: *the breaker goes
inside the retry, because outside it only ever sees the outcome the retry chose to hand up.*

Worth reading in full:
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience).
It carries the standard handler's ordering and defaults, the custom-handler API, and the warning
about layering handlers, and it is short enough to read end to end in one sitting.
