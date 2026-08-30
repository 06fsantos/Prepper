---
id: 01M19M3YPXG7ZC1ZRXSC1ZN5YD
title: Bounded-concurrency web crawler
kind: system-design
difficulty: medium
topic:
  - concurrency-primitives
  - async-await
  - dotnet-threadpool
practices:
  - concurrency-primitives-compared
  - composing-tasks-whenall-and-whenany
  - thread-pool-scheduling-and-starvation
  - worker-threads-and-io-completion
---

## Prompt

Design the concurrency for a crawler that takes a large list of URLs, fetches each page over
HTTP, extracts data from the markup it gets back, and writes the result to a database. It must
not overwhelm the sites it is crawling, must not fall over when the list is a million URLs
rather than a hundred, and must not lose the fact that one page failed. Choose a primitive for
each stage and defend the choice — including the stages where the obvious primitive is the
wrong one.

## Constraints

- The URL list is large enough that it cannot be materialised as one batch of in-flight work.
- Fetching is network-bound; a page takes hundreds of milliseconds and occasionally seconds.
- Extraction is CPU-bound and takes low single-digit milliseconds per page.
- The database accepts concurrent writes, but not unboundedly — treat its connection pool as
  the limit.
- Politeness: no more than a fixed number of requests in flight against the target at once.
- A failed page must be visible at the end of the run, not swallowed.

## Hints

1. There are three stages and they run at three different speeds. What happens to the fastest
   one if you do not say anything about the mismatch?
2. Two of the stages want the same primitive for opposite reasons, and one of them wants a
   primitive that is normally the wrong answer for the kind of work it is doing. Sort the
   stages by *waiting* versus *working* before choosing anything.
3. The interesting failure is not a slow crawl. It is what the producer does when every
   consumer has already died.

## Solution

The whole design is a **pipeline of bounded stages connected by channels**, with each stage's
worker count as its own knob. Nothing in it blocks a thread, and the bound — not the number of
tasks — is what keeps it alive on a million URLs.

**Sort the stages first, because that is what picks each primitive.** Fetching is *waiting*:
the network is doing the work, so it is `async`/`await`, and its scale is bounded by politeness
rather than by hardware. Extraction is *working*: it is CPU-bound, so its scale is bounded by
cores. Writing is waiting again, bounded by what the database will take. Three stages, three
different limits — which is exactly why they cannot be one `Task.WhenAll` over the URL list.

**Why not `Task.WhenAll` over every URL.** It is the answer that looks concurrent and is not a
design: a million tasks in flight, a million HTTP requests aimed at one host, and a peak memory
footprint proportional to the input. The bound has to be structural. `Channel<T>` supplies it
in one move — a bounded channel *suspends the writer when the buffer is full*, so the stage in
front slows to the speed of the stage behind without anybody polling, sleeping or blocking.
That is [[concurrency-primitives-compared|backpressure as the contract between two stages]].

```csharp
public sealed class Crawler(HttpClient http, IPageStore store)
{
    public async Task<IReadOnlyList<CrawlFailure>> CrawlAsync(
        IAsyncEnumerable<string> urls,
        int fetchConcurrency,
        int parseConcurrency,
        int writeConcurrency,
        CancellationToken ct)
    {
        var pages = Channel.CreateBounded<Page>(
            new BoundedChannelOptions(fetchConcurrency * 2) { SingleWriter = false });
        var rows = Channel.CreateBounded<Row>(
            new BoundedChannelOptions(parseConcurrency * 2) { SingleWriter = false });

        var failures = new ConcurrentBag<CrawlFailure>();

        var fetchers = RunStage(fetchConcurrency, async () =>
        {
            await foreach (var url in urls.WithCancellation(ct))
            {
                try
                {
                    var html = await http.GetStringAsync(url, ct);
                    await pages.Writer.WriteAsync(new Page(url, html), ct);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    failures.Add(new CrawlFailure(url, ex));
                }
            }
        });

        var parsers = RunStage(parseConcurrency, async () =>
        {
            await foreach (var page in pages.Reader.ReadAllAsync(ct))
            {
                var row = Extract(page);            // CPU-bound, run inline — see below
                await rows.Writer.WriteAsync(row, ct);
            }
        });

        var writers = RunStage(writeConcurrency, async () =>
        {
            await foreach (var row in rows.Reader.ReadAllAsync(ct))
            {
                await store.InsertAsync(row, ct);   // bounded by the stage's own worker count
            }
        });

        await CompleteAfter(fetchers, pages.Writer);
        await CompleteAfter(parsers, rows.Writer);
        await Task.WhenAll(writers);

        return failures.ToArray();
    }

    private static Task[] RunStage(int workers, Func<Task> body) =>
        Enumerable.Range(0, workers).Select(_ => body()).ToArray();

    private static async Task CompleteAfter<T>(Task[] stage, ChannelWriter<T> writer)
    {
        try { await Task.WhenAll(stage); }
        finally { writer.Complete(); }
    }
}
```

**The fetch stage is bounded by `fetchConcurrency` tasks, not by a semaphore around an
unbounded loop.** Both bound the requests in flight; the difference is what happens to memory.
A `SemaphoreSlim` gate lets you create every task up front and have them queue on the gate, so
the bound is on *requests* while the *tasks* are unbounded. Running a fixed number of workers
that each pull from the URL source bounds both. Politeness per host is a separate knob, and on
a real crawler it belongs in a rate limiter on the `HttpClient` pipeline rather than in the
crawler's own loop.

**Extraction runs inline on the consumer, and that is the counter-intuitive part.** The
instinct is `await Task.Run(() => Extract(page))` because the work is CPU-bound — but the
consumer is *already on a thread-pool thread*, so `Task.Run` only takes the same work item,
allocates a task for it, and puts it back on the same pool's queue. `Task.Run` earns its place
when the calling thread is one you must not occupy — a UI thread — or when you want several
CPU items running at once from a single caller. Here the parallelism is already expressed, as
`parseConcurrency` workers, and the right number is roughly the core count. A few milliseconds
of CPU per item on a pool thread is what pool threads are for.

**The database stage is `SemaphoreSlim`-shaped, not `lock`-shaped — and its bound is not 1.**
`lock` is out on a technicality that is really a design fact: it is thread-affine and you
cannot `await` inside one, so it cannot survive the write it is meant to protect.
`SemaphoreSlim` is the async-capable substitute, and here it is expressed as the stage's worker
count, which is the same bound with less machinery. Serialising to one writer, as the obvious
version does, throws away the database's own concurrency and makes the slowest stage slower
still; the bound belongs at whatever the connection pool will sustain. If the store supports
it, batching rows is worth more than any of this.

**Nothing anywhere blocks.** No `.Result`, no `.Wait()`, no `Thread.Sleep`, and no `Task.Run`
around a synchronous HTTP call. Every stage suspends when it has nothing to do, which is what
lets a few dozen workers keep tens of thousands of requests moving —
[[worker-threads-and-io-completion|the completions do not need a worker each while in flight]].
The failure mode of getting this wrong is not slowness but a
[[thread-pool-scheduling-and-starvation|latency cliff]]: a worker blocked on a fetch is a worker
that cannot run a continuation, and the pool refills gradually enough that the whole pipeline
stalls under load and recovers slowly.

**Shutdown is where this design is actually tested.** Each channel is completed exactly once,
in a `finally`, after its producing stage has finished — that is what ends the `await foreach`
downstream and lets the run terminate. And the ordering matters: awaiting the fetch stage
before starting the parse stage would deadlock the moment the page channel filled, because
nothing would be draining it. The symmetric hazard is the one the hint points at — if every
parser dies, the fetchers block forever on a full channel — which is why a real version passes
a `CancellationTokenSource` that each stage trips on an unhandled failure, and why the
per-URL `try` keeps ordinary fetch failures out of that path entirely.

**Failures are collected, not thrown.** One dead link must not end a million-URL crawl, so a
fetch failure is recorded against its URL and the worker moves on. What is left for
`Task.WhenAll` is genuine stage failure, and `WhenAll` surfacing only the first exception
through `await` is the trap worth knowing about here — the rest are on the task's own
`AggregateException`, which is [[composing-tasks-whenall-and-whenany|the composition detail]]
this design leans on twice.

## Follow-ups

- The crawl has to be resumable after a crash. What changes — and which of these stages was
  quietly assuming the URL list was replayable?
- Politeness is per host rather than global: at most two requests in flight to any one domain,
  with the crawl still saturating its overall budget. Where does that go, and what does it do
  to the fetch stage's bound?
- Extraction turns out to be 200ms of CPU per page, not two. What breaks, and does the answer
  involve `TaskCreationOptions.LongRunning`?
- The crawler must discover new URLs from the pages it fetches, feeding them back to the front
  of the pipeline. What does a cycle in a bounded pipeline do, and how do you stop it deadlocking?
