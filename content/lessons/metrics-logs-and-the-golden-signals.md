---
id: 01M22VP95H135R2N5ZB82H6AGK
title: Metrics, logs, and the golden signals
topic:
  - system-design
  - distributed-tracing
---

Once a design round has a system on the whiteboard, the next question is the one that separates
a candidate who has *run* systems from one who has only drawn them: **how do you know it is
healthy?** Observability is the answer, and it is an applied system-design move — the same
"state the target, then show the design meets it" discipline that
[[availability-and-the-nines|nines]] apply to uptime, pointed at whether the thing you just
designed is actually working. This Lesson is the picture the [[distributed-tracing|trace]] sits
inside: a trace correlates one request across services, but a trace alone does not tell you the
system is slow, or failing, or full. For that you need the whole telemetry stack and a way to
turn it into a promise.

## Three kinds of telemetry, three jobs

Observability data comes in three shapes, and reaching for the wrong one wastes an incident.

- **Metrics** are numbers aggregated over time — a request rate, an error count, a queue depth,
  a p99 latency. They are cheap to store and cheap to query, so they are what a dashboard and an
  alert are built on. A metric tells you *that* something is wrong: the error rate doubled at
  14:02.
- **Logs** are discrete, timestamped events, usually with structure — one line per request, per
  error, per state change. They are richer than a metric and far more expensive at volume, so
  they are what you read *after* a metric has pointed you at a window. A log tells you *what*
  happened: this request got a 500 because the downstream call timed out.
- **Traces** are one logical request stitched across every service and attempt it produced,
  which is [[distributed-tracing]]'s whole job. A trace tells you *where* the time or the failure
  went: of the five seconds, four were spent waiting on a dependency that
  [[trace-context-across-retries|retried twice]] before it answered.

The shorthand worth carrying into an interview: **metrics say something is wrong, traces say
where, logs say what.** They are complements, not substitutes, and a mature system emits all
three — but they are not equally cheap, so you alert on the cheap aggregate and drill into the
expensive detail only once it has fired.

```quiz 01M22VP95JHBGWNRV3474X0Q2B
A dashboard shows the error rate for a checkout service jumped at 14:02. You need to find out
*why* a specific failing request failed and which downstream call broke. Which telemetry type do
you reach for, and why not the others?

- [x] A trace, then its logs — to follow one request across services and read what each hop did
  > The metric already did its job (it flagged the window); a trace localises the failure to a
    hop and the logs on that hop say what it was. That is the metric→trace→log drill.
- [ ] More metrics — add a finer-grained counter for every downstream dependency
  > Metrics aggregate away the individual request, so they can tell you the rate rose but never
    which request failed or why. That is the question a trace and a log answer.
- [ ] The trace alone — a trace carries the full error message for every hop it crosses
  > A trace localises *where* the time or failure went, but the detailed reason lives in the
    log line on that span. Trace to find the hop, log to read what happened.
- [ ] Nothing more is needed — a metric spike is enough to file an incident against
  > A rate is a symptom, not a diagnosis. Paging on it is right; closing the incident from it
    alone means you never learned the cause.
```

## SLI, SLO, SLA: indicator, objective, agreement

"Highly available" and "fast" are not measurable until you say them as numbers, and there is a
precise three-word vocabulary for doing so. Google's SRE book defines the ladder in its
[Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) chapter, and
the distinction is a favourite because candidates blur the three.

- An **SLI** — service level *indicator* — is "a carefully defined quantitative measure of some
  aspect of the level of service." It is the *thing you measure*: request latency, error rate,
  throughput, availability. An SLI is a metric chosen because it reflects what a user actually
  experiences.
- An **SLO** — service level *objective* — is "a target value or range of values for a service
  level that is measured by an SLI." It is the *bar*: `99% of requests complete in under 100 ms`.
  SLI is the ruler; SLO is the line drawn on it.
- An **SLA** — service level *agreement* — is a contract with users that "includes consequences
  of meeting (or missing) the SLOs it contains." The consequence is the whole difference: refunds,
  credits, a breach clause. The SRE book's test is blunt — "if there is no explicit consequence,
  then you are almost certainly looking at an SLO." SLAs are business and legal artifacts, which
  is why the book notes SRE does not typically construct them.

Two relationships are the senior signal. First, **the internal SLO is tighter than the external
SLA**: you promise customers 99.9% but page yourselves at 99.95%, so you have runway to react
before you owe anyone a refund. Second, **the target is never 100%**. Perfect reliability is
impossible to guarantee and ruinously expensive to chase, and — exactly as with the
[[availability-and-the-nines|nines]] — every extra nine costs roughly an order of magnitude more.
The gap between your SLO and 100% is the **error budget**: the amount of failure you are allowed
to spend on shipping features, which is how the same number that governs reliability also governs
how fast a team is allowed to move.

```quiz 01M22VP95JMEGAJWM97G134HC8 cloze
The three-word ladder: an {{SLI}} is the quantitative thing you measure (request latency, error
rate), an {{SLO}} is the target drawn on that measure ("99% under 100 ms"), and an {{SLA}} adds a
{{consequence}} — a refund or credit — for missing it. The rule of thumb is to keep the internal
objective {{tighter}} than the externally promised agreement, and to never set the target at
{{100%}}, because the gap from the target to perfect is the error budget you spend on shipping.
```

## The four golden signals

You cannot instrument everything, and a wall of two hundred graphs is its own kind of blindness.
The SRE book's [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
chapter names the four that matter for any user-facing system — the **four golden signals** — and
the claim is that if you can measure only four things, measure these:

1. **Latency** — the time to service a request. The load-bearing subtlety: **measure the latency
   of successful and failed requests separately.** A fast error (a quick HTTP 500) can otherwise
   flatter your latency graph, and a *slow* error — a request grinding for seconds before it
   fails — is worse than a fast one and hides inside a blended average.
2. **Traffic** — a measure of demand on the system, in a metric that fits it: requests per second
   for a web service, I/O rate for a stream, transactions per second for a store.
3. **Errors** — the rate of requests that fail, whether explicitly (an HTTP 500), implicitly (an
   HTTP 200 carrying the wrong content), or by policy (a request that took longer than your SLO
   allows is, for these purposes, an error).
4. **Saturation** — how "full" the service is, measured against its most constrained resource
   (CPU, memory, a connection pool, a queue). Systems usually degrade *before* they hit 100%, so
   saturation should be watched and acted on *before* it is reached, and **rising latency is often
   the first warning that saturation is coming** — the queue is filling before the resource is
   technically exhausted.

The subtlety in latency is the one to instrument deliberately, because most naive metrics blend
the two outcomes. In .NET you would keep them apart with a tag on a
[`Histogram`](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation),
so "p99 latency" can be sliced by outcome rather than averaged across it:

```csharp
using System.Diagnostics.Metrics;

var meter = new Meter("Checkout");
Histogram<double> latency = meter.CreateHistogram<double>("request.duration", unit: "ms");
Counter<long> requests = meter.CreateCounter<long>("request.count");

// on each request, record the elapsed time tagged with the outcome
void Record(double elapsedMs, bool ok)
{
    var outcome = new KeyValuePair<string, object?>("outcome", ok ? "success" : "error");
    latency.Record(elapsedMs, outcome);   // slow errors no longer hide in the average
    requests.Add(1, outcome);             // traffic and errors fall out of the same tag
}
```

Note how three of the four signals come out of two instruments: the histogram is latency, the
counter split by `outcome` is both traffic (the total) and errors (the `error` slice). Saturation
is the one you usually read from the runtime or the host — thread-pool queue depth, connection-pool
waits — rather than from the request path.

```quiz 01M22VP95JDXWM3GBETJY8R1H4 recall
Name the four golden signals, and explain why latency has to be split by request outcome and why
saturation is described as a *leading* indicator.

> The four are **latency, traffic, errors, and saturation**. Latency is time-to-serve, traffic is
> demand (e.g. requests/second), errors is the rate of failed requests, and saturation is how full
> the most constrained resource is.
>
> Latency is split into successful and failed requests because a fast error can drag the average
> *down* and flatter the graph, while a slow error — seconds of grinding before a failure — is the
> more dangerous case and disappears inside a blended number. You want p99 of successes and p99 of
> errors as separate lines.
>
> Saturation is a leading indicator because systems degrade before they hit 100% of a resource:
> the queue fills and latency climbs while there is still nominal headroom, so rising latency is
> often the first warning that saturation is coming, ahead of any resource actually maxing out.
```

## Alert on symptoms, not causes

The last move is what to *page* a human about, and the SRE book's rule is to alert on **symptoms,
not causes** — on the golden signals and the SLOs they roll up to, not on every internal condition
that might one day contribute to one. The reason is discipline: a symptom alert only fires when
something is *actually affecting users*, so it earns the interruption. Cause-based alerts — "CPU on
box 7 is at 85%", "a replica fell behind" — fire constantly on conditions the system rode straight
through, and a pager that cries wolf is one nobody reads at 3 a.m.

The practical shape: alert when an SLI threatens an SLO (error rate above budget, p99 latency past
the objective, availability trending toward the SLA), and leave the cause metrics — CPU, memory,
replica lag, [[caching-and-ttls|cache]] hit ratio — on a dashboard you open *after* a symptom alert
has already woken you. The causes are for diagnosis; the symptoms are for paging. A retry storm or a
degraded dependency will show up as elevated latency and errors anyway — the symptoms catch the
problem however it arrives, whereas a cause alert only catches the one cause someone thought to
write a rule for. This is the alerting counterpart to why redundancy is spread across
[[bulkheads-and-blast-radius|failure domains]]: you defend against the *effect* on the user, not
against an enumerated list of triggers.

## What to take away

Observability is how you show the system you designed is healthy, and it has three layers and one
vocabulary. **Metrics say something is wrong, traces say where, logs say what** — alert on the
cheap aggregate, drill into the expensive detail. The **SLI/SLO/SLA** ladder turns "fast" and
"available" into a measured indicator, a target on it, and a contract with a consequence; keep the
internal objective tighter than the promised agreement, never target 100%, and treat the gap as an
error budget. Watch the **four golden signals** — latency (split by outcome), traffic, errors,
saturation (a leading indicator) — because they are the four things worth measuring when you cannot
measure everything. And **alert on symptoms, not causes**, so the pager only fires when a user is
actually affected. Say all of this in a design round the moment you have placed the last box: it is
the difference between a system that is drawn and a system that is operable.

Worth reading in full: Google's [Site Reliability Engineering](https://sre.google/sre-book/monitoring-distributed-systems/)
book — the "Monitoring Distributed Systems" chapter for the golden signals and symptom-based
alerting, and its [Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
chapter for the SLI/SLO/SLA distinction and the error budget. It is the first-party source for all
four, and it is written by the people who page themselves against these numbers.
