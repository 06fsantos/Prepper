---
id: 01M19M3YPXQFQG5363MWEGRQW4
title: C# concurrency and allocation incorporated from the teaching workspace
date: 2026-08-30
topic:
  - async-await
  - dotnet-threadpool
  - concurrency-primitives
  - dotnet-memory-allocation
---

The `learning-csharp-concurrency` workspace in `../Playground/` is incorporated and done. Its
seven HTML lessons became eight Lessons, four Terms, four cheat sheets, two References and one
Problem; nothing was written back into it, and it is not to be re-imported. Where it overlapped
the httpclient set, the two were cross-linked rather than merged — [[worker-threads-and-io-completion]]
explains why an async [[httpclient]] call scales past the worker count, and neither set repeats
the other.

**The prior knowledge it recorded.** The workspace's own learning records name two things that
landed: the `ValueTask<T>` single-await contract with the struct-copying footgun behind it, and
the primitive-selection *framework* — that the choice between `async`/`await`, `Task.Run`,
`Thread`, `Channel<T>` and `lock` is a question about structure rather than about performance.
The second is the more useful signal, because it is what the whole set is organised around:
[[concurrency-primitives-compared]] teaches the five one at a time and
[[choosing-a-concurrency-primitive]] is the table for under pressure. Do not re-teach the
selection framing; do assume the mechanism underneath any one primitive still wants stating.

**Four claims were corrected, and the pattern in them is worth more than any of them.** The
workspace asserts mechanism confidently in exactly the places it stopped citing. It states —
emphatically, with a ❌/✅ code pair — that passing `FetchAsync(1), FetchAsync(2)` straight to
`WhenAll` runs them sequentially; arguments are evaluated before the call, so both are already
in flight, and the real trap in that shape is a deferred LINQ `Select` that has started nothing.
It recommends `.Wait()` to see all of a composed task's exceptions, which promotes a blocking
call to solve a problem `await` in a `try` plus `Exception.Flatten()` solves without one. It
says a `ValueTask` fast path "still allocated a `Task`", ignoring the builder's cache of
completed tasks. And it puts numbers on thread injection rates and per-request async
allocations that nothing behind it supports. [[composing-tasks-whenall-and-whenany]] and
[[valuetask-when-it-helps]] carry the corrected versions. The general lesson repeats the
httpclient run's, one level sharper: a teaching source is trustworthy exactly as far as its
citations reach, and a course's most confident sentences are often the ones furthest past them.

**Two things in this set go stale on their own schedule.** The thread pool's injection algorithm
is *undocumented* — Microsoft Learn's `ThreadPool` reference does not mention hill climbing at
all — so [[thread-pool-scheduling-and-starvation]] is written against `dotnet/runtime` on `main`
as read on **2026-08-30**, with no permalinked commit, and says so in its own body. Every
constant in it is a configurable default. The 85,000-byte Large Object Heap threshold in
[[allocation-profiling-in-practice]] is likewise a documented default, movable through
`GCLOHThreshold`. Neither is a contract, and neither became a quiz answer as a bare number
without that framing.

**What the incorporation did not establish.** Memory barriers, `volatile` and false sharing did
not cross: the workspace puts them out of scope and its own four sentences on them cite nothing.
That is a separate research run, not a gap in this one. `RESOURCES.md` also still records no
.NET practitioner community — the place real concurrency postmortems get written down — which is
the one live sourcing gap the set inherits.

Next, on this material: nothing more to author until the dev has attempted
[[bounded-concurrency-web-crawler]]. The whole set is theory with one practice note against it,
and the signals worth waiting for are narrow — whether they bound the pipeline structurally
rather than with a `Task.WhenAll` over the input, and whether they can say *why* running the
CPU-bound stage inline beats wrapping it in `Task.Run`. Getting the second one wrong is the
tell that the selection framework is memorised rather than understood.
