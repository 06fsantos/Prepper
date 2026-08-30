---
id: 01M193RHBHTJ8TBFJMHA5V7GVW
title: Tracing hedged attempts
topic:
  - distributed-tracing
prerequisites:
  - httpclient-connection-lifetime
---

Most of what a resilience pipeline does to a trace is settled. A retry re-issues one logical
request after a delay, so its attempts sit in sequence under one trace id and the trace stays a
line. Hedging is the case that is not settled, and it is worth knowing that it is not settled,
because the confident answer is the one most likely to be wrong in an interview and in an
incident.

Hedging races requests: the client issues a second call while the first is still in flight and
takes whichever answer arrives first ([[hedging-against-tail-latency]] is the pattern itself and
why you would want it). So the logical request genuinely **forks**. Two calls are on the wire at
the same moment, doing the same work, and at most one of their answers will ever be used.

## What the header can and cannot say

[W3C Trace Context](https://www.w3.org/TR/trace-context/) is a **per-hop** format. A
`traceparent` carries a trace id for the whole chain and exactly one parent id — the span that
issued this particular call — and it has no field for anything else about the call's
relationship to its neighbours.

That is enough to express either shape a hedged pair could take:

- **Siblings.** Both attempts carry the same parent id, so the trace shows two children of the
  span that made the call.
- **Nested.** The second attempt is given the first attempt's span id as its parent, so the
  hedge hangs beneath the attempt it was racing.

Neither is illegal — a span having two children is ordinary, and the standard does not forbid
concurrency. The strain is subtler and it is a **modelling** problem rather than a protocol one:
whichever shape you get, nothing in the header marks either call as *a duplicate of the other*.
A reader of the resulting trace sees two dependency calls to the same endpoint, and cannot tell
from the trace data whether that is a hedge, an application-level fan-out, or a bug issuing the
call twice. The vocabulary that would distinguish them — "these are alternatives, and one of
them was abandoned" — is not in the four fields.

That is also why the two shapes are not equivalent in practice even though both are legal.
Sibling spans invite you to read the second call as extra work the service asked for; nested
spans invite you to read it as a consequence of the first. Latency arithmetic differs too:
summing children of a span double-counts a race, because the two attempts overlap in wall-clock
time rather than following one another.

```quiz 01M193RHBK9NFZE4QEHNZDDMF0
What actually makes a hedged call harder to read in a trace than a retried one?

- [x] Two overlapping calls with nothing marking them as one attempt
  > The header has no field saying "these are racing alternatives", so a reader cannot
  > distinguish a hedge from a genuine fan-out or a double-send.
- [ ] The W3C standard forbids parallel spans within one trace
  > It forbids nothing of the kind. A span having two concurrent children is ordinary.
- [ ] A hedged attempt cannot carry the `traceparent` header at all
  > It is an ordinary outbound HTTP request and carries whatever headers the pipeline sets.
- [ ] The trace id is regenerated for the second attempt in flight
  > The trace id names the logical request; nothing about racing changes what it names.
```

## The part nobody has written down

Which of those two shapes .NET's standard hedging handler produces is, as far as the
documentation goes, **unstated**. Microsoft Learn's
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
describes `AddStandardHedgingHandler()` as a resilience configuration and is silent on trace
propagation across parallel attempts; Polly's own documentation for the hedging strategy is
likewise about the strategy, not about headers. *Checked 2026-08-30 and still unresolved.*

The honest position is therefore: **do not know, and do not guess.** Both shapes are plausible
implementations. Both would pass a superficial "is telemetry arriving?" check. And which one you
have determines whether your dashboards double-count hedged latency, which is the kind of thing
that is discovered during an incident rather than before one.

This is a good answer to give out loud, incidentally. "The standard permits both shapes, the
handler does not document which it emits, and here is how I would find out" is a stronger answer
than a confident wrong one, and the follow-up is the interesting part.

## How to find out, for your own stack

The procedure is empirical, and it is short:

1. Configure a client with hedging and a delay low enough that a hedge reliably fires — for a
   test, well below the dependency's typical response time, which is precisely the misconfigured
   setting you would never ship.
2. Send a request through it with your tracing exporter enabled — Application Insights, or any
   OpenTelemetry backend that renders a span tree.
3. Pull up the trace and read the **dependency timeline**, not just the operation id. Three
   things to check: that both attempts appear at all; that they share the trace id; and what the
   parent of the second one is — the calling span, which means siblings, or the first attempt's
   span, which means nested.
4. Decide whether your queries are correct under the shape you actually got, especially anything
   that sums child durations.

If the answer is "one attempt is missing" or "the second is orphaned into its own trace", the
escape hatch is to stop relying on the handler for it and set the headers yourself: hedging
exposes an `ActionGenerator`, the callback that builds each parallel attempt's request, and a
`traceparent` written there is a `traceparent` you can account for. That is a workaround with a
real cost — you are now maintaining header propagation by hand, in one client, against a library
that may start doing it differently in the next release — so it is worth reaching for only after
step 3 has shown you actually need it.

```quiz 01M193RHBKE9RPR719BDW7A8P5 cloze
The two shapes a hedged pair's spans could take are {{siblings}}, where both attempts carry the
same parent id, and {{nested}}, where the second attempt's parent is the first attempt's span.
If the handler's own propagation turns out to be wrong for your backend, the place to inject
`traceparent` on each parallel attempt yourself is the hedging strategy's {{ActionGenerator}}.
```

## What this does not change

Two things stay true regardless of how the ambiguity resolves.

**Correlation itself is not at risk.** Whatever the parent-child shape, the trace id is a
property of the logical request, so hedged attempts belong to the same trace as everything else
the request touched. The open question is about *hierarchy and attribution*, not about losing the
calls entirely — and a service that cannot find hedged calls at all has a different problem,
usually a client the container never saw or telemetry registered after the resilience handler.

**Which requests get hedged is still yours to decide.** It would be convenient if the handler
excluded unsafe methods on its own, and it does not: keeping duplicate writes off the wire is a
routing decision — hedge the client the read paths go through — rather than a flag, for reasons
[[hedging-against-tail-latency]] sets out. That matters here because every hedged request is a
duplicate in the trace as well as on the wire, and a `POST` you did not intend to hedge is an
ambiguous span *and* a second charge.

```quiz 01M193RHBK8P29A232JYZQX620 recall
You are about to ship a service that hedges calls to a slow dependency, and you want to know how
hedged attempts will appear in your traces. Describe what you would do, and what you would look
for.

> Reproduce a hedge deliberately: configure the client with a hedging delay far below the
> dependency's normal response time so that essentially every call duplicates, and issue a
> request with tracing enabled.
>
> Then read the dependency timeline of the resulting trace rather than just checking that
> telemetry arrived. Confirm both attempts are present, confirm they share the trace id, and
> then look at the second attempt's parent — the calling span means the attempts were recorded
> as siblings, the first attempt's span means they were nested. Check any query that sums child
> durations, because overlapping attempts double-count under summation in a way sequential
> retries do not.
>
> If the attempts are missing or uncorrelated, set `traceparent` explicitly in the hedging
> strategy's `ActionGenerator`, accepting that this is propagation you now maintain by hand.
```

## What to take away

Hedging is the one place in a resilience pipeline where the trace model has a genuine hole, and
the hole is in the documentation rather than in the standard. The header can express either
shape; it cannot express that two calls are the same attempt raced; and the handler does not say
which shape it picks. So the answer for any given stack is measured, not looked up — which is a
five-minute experiment, and a great deal cheaper than finding out from a dashboard during an
outage.

Worth reading in full: the
[W3C Trace Context recommendation](https://www.w3.org/TR/trace-context/), for what the four
fields do and do not carry. Read it before deciding what a two-branch trace means, because most
of the confusion here is about what the format was ever asked to express.
