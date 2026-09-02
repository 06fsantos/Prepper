---
id: 01M19PM0H3Q5EF1C9N6B1MQ6NA
title: A reading order for concurrency
topic:
  - async-await
  - concurrency-primitives
  - dotnet-threadpool
  - dotnet-memory-allocation
---

Everything the vault holds about doing more than one thing at a time, in the order that makes each
note land — what `await` compiles to, then where a continuation runs, then who runs it, then what
it costs. The vault carries no reading order of its own: `prerequisites` is a graph and there are
no lesson numbers. This is one path through that graph, and where a note disagrees with this page
the note wins.

The shape worth noticing before starting: **every note below is downstream of one**. The state
machine is the root, and each later note is a different question about the same suspension —
where does it resume, who runs it, what did it allocate.

## The order

| # | Read | Scope | Why here |
|---|---|---|---|
| 1 | [[the-async-state-machine]] | **.NET** | What the compiler actually emits. Everything else on this page is a consequence, and it is the prerequisite the vault records for nearly all of them |
| 2 | [[capturing-a-synchronization-context]] | **.NET** | Where a continuation resumes. Read second: it is the fact that makes the deadlock story make sense, and `ConfigureAwait(false)` unreadable without it |
| 3 | [[composing-tasks-whenall-and-whenany]] | **.NET** | One suspension becomes several overlapping ones. The first note where concurrency is a thing you arrange rather than a thing that happens |
| 4 | [[concurrency-primitives-compared]] | Mostly concept | The map: five primitives, five different structural questions. Read after 3, so "why not `Task.Run` for I/O" has somewhere to land |
| 5 | [[thread-pool-scheduling-and-starvation]] | **.NET** | Who runs the continuation, and what happens when there are not enough of them. The vault names 1 and 2 as its prerequisites |
| 6 | [[worker-threads-and-io-completion]] | **.NET** | Two pools, local queues, work stealing. Why thousands of concurrent calls need nothing like thousands of threads |
| 7 | [[valuetask-when-it-helps]] | **.NET** | Second pass, cost rather than correctness. Read only once 1–3 are solid: it is an optimisation on a machine you have to already understand |
| 8 | [[allocation-profiling-in-practice]] | **.NET** | Last, and it is a tooling note: how to stop believing 7 and start measuring it |

Steps 1–3 are one sitting. Steps 5–6 are the second, and they are the pair most likely to be
asked about under the words "we had a latency cliff". Steps 7–8 are optional for a first pass and
are what separate a candidate who has read about allocation from one who has counted bytes.

## Look these up rather than reading them

- [[choosing-a-concurrency-primitive]] — which of the five a given problem wants, side by side.
  Open it at step 4 and leave it open.
- [[diagnosing-thread-pool-symptoms]] — symptom to cause to counter. **.NET-specific**, and the
  companion to step 5 rather than a step of its own. Its last row is the misdiagnosis worth
  knowing: a starved pool and a thrashing heap present identically.

## Practice checkpoint

After step 6: [[bounded-concurrency-web-crawler]]. It is the one exercise that makes you pick a
primitive, bound the fan-out, and then defend the choice against the pool's behaviour — steps 4,
5 and 6 in a single conversation.

## The .NET-specific half, stated plainly

Almost all of it. Seven of the eight steps are about the CLR, and that is a scoping decision this
vault made, not a claim that concurrency is a .NET subject. The state machine is Roslyn's rewrite;
`SynchronizationContext` is a .NET type with no counterpart in most runtimes; the thread pool's
hill climbing, its local queues and its I/O completion pool are implementation detail of one
runtime — detail the notes flag as implementation rather than contract.

What actually transfers, and to what:

| The idea | Elsewhere it looks like |
|---|---|
| `async` rewrites a method into a resumable state machine | Same rewrite in JS, Python, Rust and C++ coroutines. Rust's futures are the closest sibling — poll-driven and lazy, where a `Task` is already running |
| Which thread resumes the continuation | JS has one loop and no question to ask; Python asyncio has an event loop per thread; Go has no continuation at all — a goroutine blocks and the scheduler moves on. `ConfigureAwait` is a question only .NET's design forces |
| Don't block a pool thread on I/O | Universal, and the same cliff. Java's virtual threads (Loom) and Go's runtime dissolve it by making the block cheap instead |
| Fan-out, fan-in, first-one-wins | `Promise.all`/`race`, `asyncio.gather`/`wait`, `errgroup` in Go, `CompletableFuture.allOf` on the JVM. Cancellation and error aggregation differ everywhere and are the interesting half |
| Channels and bounded queues | Go's channels are the reference; `Channel<T>` is deliberately close to them |
| Allocation per suspension | Anywhere with a GC. `ValueTask` is .NET's answer; JVM and Go pay for it differently |

The two claims that survive any stack: **concurrency comes from starting work, not from
composing it**, and **never block a thread that might be needed to complete the thing you are
waiting on**. If the interview is not a .NET interview, those two plus the fan-out patterns are
the parts to carry; everything about pools and contexts is scoped and should be said to be.

## The night before

[[async-await-cheat-sheet]], [[concurrency-primitives-cheat-sheet]],
[[dotnet-threadpool-cheat-sheet]], and [[dotnet-memory-allocation-cheat-sheet]] if step 7 is in
scope. A reading order is for the fortnight before; a cheat sheet is for the morning of.
