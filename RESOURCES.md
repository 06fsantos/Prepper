# Prepper Resources

The curated set of trusted sources the authoring skills draw on. **Author-side only:** this
file lives at the repo root, outside `content/`, because no source ever becomes a note.
Citations are written into notes as inline external links; this file is where the sources
themselves are kept and judged.

## Knowledge

- [Book: _Introduction to Algorithms_ (CLRS), 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/)
  The reference for correctness and complexity arguments. Use for: anything where a
  hand-wave about a bound needs to become a proof.
- [Book: _Designing Data-Intensive Applications_ by Martin Kleppmann](https://dataintensive.net/)
  Use for: system-design vocabulary — replication, partitioning, consistency, the actual
  tradeoffs rather than the diagram.
- [.NET API reference](https://learn.microsoft.com/en-us/dotnet/api/)
  Primary source for what a BCL collection actually guarantees. Use for: complexity and
  ordering claims about C# types, which is the interview language for this vault.
- [The NeetCode problem list](https://neetcode.io/practice)
  The problem canon. Use for: what to import, and as the on-list gate the `import` skill
  checks against — widening past it invalidates the acquisition method.

### HttpClient and HTTP resilience in .NET

Adopted from the `learning-httpclient-dotnet` teaching workspace. Every source below was the
primary the workspace's lessons were written against.

- [.NET: HttpClient guidelines for networking](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines)
  Primary source for pooled-connection ownership, DNS staleness, and the two recommended
  lifetime-management strategies. Use for: why an `HttpClient` is configured the way it is.
- [ASP.NET Core: IHttpClientFactory and HttpClient](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests)
  Primary source for factory consumption patterns, handler pooling and lifetime, delegating
  handlers, and logging categories. Use for: `HttpClient` inside a DI container.
- [.NET: Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
  Primary source for `Microsoft.Extensions.Http.Resilience` — the standard resilience handler
  and its defaults, the standard hedging handler, and custom Polly pipelines. Use for: what
  the code actually looks like.
- [.NET API docs: HttpClient.Timeout](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.timeout)
  Primary source for the 100-second default and the caveat that DNS resolution alone can take
  15 seconds. Use for: defending a timeout number rather than asserting one.
- [Azure Architecture Center: Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)
  Use for: retry strategy selection, the idempotency precondition, why retries must not be
  stacked across call layers, and `Retry-After` hints.
- [Azure Architecture Center: Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
  Use for: the Closed/Open/Half-Open state machine, how a breaker differs from a retry, and the
  sharded-dependency pitfall.
- [Azure Architecture Center: Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
  Use for: isolating resource pools per dependency so one slow call cannot starve the rest.
- [RFC 7231 §4.2 — Safe and Idempotent Methods](https://www.rfc-editor.org/rfc/rfc7231#section-4.2)
  The definition everything else defers to. Use for: which HTTP methods are safe to retry, and
  why "unsafe" is a specification term rather than a judgement call.
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
  The standard for propagating trace context over HTTP. Use for: the `traceparent` format, and
  the linear parent-child assumption that parallel attempts strain.
- [Azure Monitor: Distributed trace data](https://learn.microsoft.com/en-us/azure/azure-monitor/app/distributed-trace-data)
  How Application Insights correlates telemetry through `operation_Id` and `operation_ParentId`.
  Use for: what automatic correlation does and does not do for you.
- [Google: The Tail at Scale (Dean & Barroso, 2013)](https://research.google/pubs/the-tail-at-scale/)
  The paper hedging comes from. Use for: why a p99 tail is usually one unlucky server rather
  than a systemic problem.
- [.NET API reference: Microsoft.Extensions.Http.Resilience namespace](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.http.resilience)
  The member list, and the arbiter when the prose docs and a secondary source disagree about
  what an API offers. Use for: settling whether a lever exists at all — it is what established
  that `DisableForUnsafeHttpMethods()` is a *retry* extension with no hedging counterpart.

### C# concurrency and allocation in .NET

Adopted from the `learning-csharp-concurrency` teaching workspace. Every source below was the
primary its lessons were written against.

- [How Async/Await Really Works in C# — Stephen Toub](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/)
  Primary source for the compiler-generated state machine, why a suspension is the moment of
  allocation, and the `AsyncStateMachineBox` that makes it one allocation on modern .NET. Use
  for: anything about *why* `async`/`await` allocates what it allocates. Its benchmark numbers
  are measurements of its own benchmark — attribute them, never assert them as current.
- [ConfigureAwait FAQ — Stephen Toub](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
  Primary source for what a suspension captures, what `ConfigureAwait(false)` does and does not
  change, and the classic sync-over-async deadlock. Use for: precise rules rather than the
  folklore that surrounds them.
- [Understanding the Whys, Whats, and Whens of ValueTask — Stephen Toub](https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/)
  Primary source for the single-await-only contract, `IValueTaskSource<T>`, and when a
  `ValueTask` actually saves an allocation. Use for: defending a return type rather than
  preferring one.
- [Asynchronous programming (C# docs) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/)
  The TAP model: composition with `Task.WhenAll`/`WhenAny` and how exceptions flow through
  composed tasks. Use for: what the language and library guarantee about composition.
- [dotnet/runtime: PortableThreadPool.HillClimbing.cs](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/PortableThreadPool.HillClimbing.cs)
  The worker-thread injection algorithm itself, with `PortableThreadPool.cs`,
  `PortableThreadPool.GateThread.cs` and `PortableThreadPool.WorkerThread.cs` for how starvation
  and thread timeout force a change. Use for: the thread pool's sizing behaviour — but see the
  gap below, because this is implementation on a moving branch and not a documented contract.
- [Fundamentals of garbage collection — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)
  Generations 0/1/2, the Large Object Heap and its 85,000-byte default, ephemeral segments, and
  what triggers a collection. Use for: why a Gen 0 allocation is cheap and a survivor is not.
- [BenchmarkDotNet documentation](https://benchmarkdotnet.org/)
  `[MemoryDiagnoser]` and what it reports. Use for: the lab half of an allocation claim — one
  method, one hypothesis, a byte count instead of a belief.
- [dotnet-trace — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-trace)
  EventPipe collection from a live process: GC, thread-pool and JIT events. Use for: the field
  half — a running process with a symptom and no hypothesis yet.

## Wisdom (Communities)

- [r/cscareerquestions interview experiences](https://reddit.com/r/cscareerquestions)
  Low signal-to-noise, occasionally the only place a company's actual loop is described.
  Use for: calibrating what a given company asks, never for technique.
- [Hacker News threads on hiring](https://news.ycombinator.com/)
  Use for: dissent — the arguments against the format, which are worth having heard before
  being asked to perform in it.

## Gaps

- **Behavioural interviewing.** No source here is trusted on it. Behavioural Problems are
  hand-authored against the template in `PROBLEM-FORMAT.md` partly for this reason.
- **System-design rubrics.** Plenty of material on the systems; almost none on what a
  forty-five-minute answer is graded against.
- **Hedging and trace context.** W3C Trace Context assumes a linear parent-child hierarchy;
  parallel hedged attempts do not fit it, and neither Microsoft Learn nor Polly documents which
  way `AddStandardHedgingHandler()` propagates `traceparent`. Unresolved by the workspace that
  raised it. The honest answer in a Lesson is that this has to be verified empirically.
- **.NET practitioner communities.** None adopted. `r/dotnet` and `r/ExperiencedDevs` are the
  obvious candidates for real-world failure postmortems, and neither has been judged yet.
- **The thread pool's sizing algorithm is undocumented.** Microsoft Learn's `ThreadPool` API
  reference describes behaviour at a high level and does not document hill climbing at all, so
  the only source is `dotnet/runtime` itself — implementation on a branch that moves, reached
  through a URL that does not. Every constant taken from it is a default rather than a contract,
  and a note citing it must say when it was read.
