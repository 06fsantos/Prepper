---
id: 01M194VYXZ5GE317G9DMWDCF9X
title: HttpClient and resilience incorporated from the teaching workspace
date: 2026-08-30
topic:
  - httpclient
  - http-resilience
  - distributed-tracing
---

The `learning-httpclient-dotnet` workspace in `../Playground/` is incorporated and done. Its
ten HTML lessons became nine Lessons, three Terms, three cheat sheets, two References and one
Problem; nothing was written back into it, and it is not to be re-imported.

**The prior knowledge it recorded, which still holds.** The dev disclosed *gaps* in `HttpClient`
basics — lifetime, `IHttpClientFactory`, pooling — against an otherwise advanced footing in
distributed-systems reasoning. That asymmetry is why [[httpclient-connection-lifetime]] sits
under every other note in the set as a prerequisite, and why the pattern Lessons move fast. Do
not re-teach the distributed-systems framing; do assume the pooling internals need a sentence of
recap when they come up again.

**One misconception was corrected, and it was the workspace's own.** Its lessons contradicted
each other on whether .NET's standard hedging handler excludes unsafe HTTP methods, and the more
confident of the two named a real API — `DisableForUnsafeHttpMethods()` — for a job it does not
do. It is a *retry* extension; there is no hedging counterpart, and keeping duplicate writes off
the wire is a routing decision. [[hedging-against-tail-latency]] and
[[standard-resilience-handler-defaults]] both say so, and anything later touching hedging must
too. The general lesson is worth more than the specific one: a course written to teach states
mechanism confidently, and that confidence does not survive contact with the namespace reference.

**What the incorporation did not establish.** How a hedged attempt appears in a trace is still
open — W3C Trace Context assumes a linear parent-child chain and neither Microsoft nor Polly
documents which way parallel attempts propagate `traceparent`. [[tracing-hedged-attempts]] says
that plainly rather than guessing, and the gap is recorded in `RESOURCES.md`. It is answerable
only empirically, with telemetry on and one hedged call, so it is a thing to *do* rather than a
thing to author. Every version-pinned number in the set is pinned to
`Microsoft.Extensions.Http.Resilience` / Polly **v8.7.0** as verified on **2026-08-27**, and
those go stale on their own schedule.

Next, on this material: nothing more to author until the dev has attempted
[[payment-status-polling-client]], because the whole set is now theory with one practice note
against it. The signal worth waiting for is which of the four *rejections* in that Problem —
hedging, bulkheads, a custom pipeline, a blind retry on the charge — they can defend cold.
