---
id: 01M19K50PKQMVVSMX6H1D8Q478
title: Measuring allocation with BenchmarkDotNet and dotnet-trace
topic:
  - dotnet-memory-allocation
prerequisites:
  - the-async-state-machine
---

"I believe `Task.Run` allocates more" is a weaker sentence than "I measured it, and here is the
byte count". Two tools close that gap, and they answer different questions:

- **BenchmarkDotNet** answers *how many bytes does this specific method allocate, averaged over
  thousands of iterations?* That is a **lab** measurement: one method, one hypothesis, an isolated
  process.
- **`dotnet-trace`** answers *what is this running process actually doing?* That is a **field**
  observation: no hypothesis yet, and a symptom instead.

Neither substitutes for the other. The lab number defends a design choice; the field trace
diagnoses a production symptom. Both report on the same thing underneath, which is where to start.

## The heap both tools report on

.NET's collector is **generational**. Per
[Microsoft Learn's *Fundamentals of garbage collection*](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals),
a new object is allocated in **generation 0**, the smallest and cheapest region to collect. An
object that is still reachable when its generation is swept is **promoted**: gen 0 survivors
become gen 1, gen 1 survivors become gen 2. Gen 2 is the oldest generation and the most expensive
to collect, because collecting it means walking everything.

That ladder is the whole reason gen 0 allocation is the number both tools put in front of you. The
objects concurrent code produces are overwhelmingly short-lived — a task per request, one heap
object per suspension of an `async` method (see [[the-async-state-machine]] for why it is one and
when it happens at all). They are born in gen 0 and, if the code is behaving, they die there.
More gen 0 traffic means more frequent collections, each of them individually cheap.

Large allocations do not take that path. Above a size threshold, an allocation goes to the **Large
Object Heap**, which is collected far less often and is prone to fragmentation because it is not
compacted by default.

**That threshold is a documented default and not a constant of the runtime.** The fundamentals
page above gives it as **85,000 bytes**, and the same runtime exposes a `GCLOHThreshold`
configuration knob that moves it. Read on **2026-08-30**. So it is the right number to carry into
an interview and the wrong number to assert about a process whose configuration you have not seen.

```quiz 01M19K50PNCBKK9HCW0GMH3MF8 cloze
An object that is still reachable when its generation is collected is {{promoted}} to the next
one, so allocations that survive to gen {{2}} are the expensive ones. An allocation at or above
{{85,000}} bytes goes to the Large Object Heap instead — a documented **default**, movable through
the `GCLOHThreshold` setting, rather than a fixed property of the runtime.
```

## BenchmarkDotNet: the lab measurement

[BenchmarkDotNet](https://benchmarkdotnet.org/) is the standard micro-benchmarking library for
.NET. It runs the method under test many times in an isolated process, warms up the JIT, and
reports a statistically treated result rather than a single stopwatch reading.

The reason that matters is the trap it replaces. Wrapping a call in a `Stopwatch` measures one
execution of a method that may not have been jitted yet, on a thread that may have been descheduled,
in a window that may or may not have contained a collection. The number comes out, it looks like a
measurement, and it is noise with a unit attached.

Allocation reporting is opt-in. The `[MemoryDiagnoser]` attribute is what adds it, and it gives
you gen 0/1/2 collection counts and an **Allocated** column of bytes per operation:

```csharp
[MemoryDiagnoser]
public class AllocationBenchmarks
{
    private static readonly int[] Data = [1, 2, 3, 4, 5];

    [Benchmark(Baseline = true)]
    public async Task<int> TaskCompletedSynchronously()
        => await SumAsTaskAsync(Data);

    [Benchmark]
    public async Task<int> ValueTaskCompletedSynchronously()
        => await SumAsValueTaskAsync(Data);

    [Benchmark]
    public async Task<int> TaskRunForTrivialWork()
        => await Task.Run(() => Sum(Data));
}
```

Three claims are on trial there at once, and each is a claim someone will otherwise defend from
memory:

- that a synchronously-completing `Task<int>` still generally costs a `Task` object;
- that [[valuetask-when-it-helps|`ValueTask<int>`]] removes that cost on the synchronous path, and
  only on that path;
- that `Task.Run` around trivial work buys a queued work item and a task, and no parallelism worth
  having — see [[concurrency-primitives-compared]].

Write the benchmark so it can falsify all three, and then read the Allocated column rather than
predicting it. A benchmark you already know the answer to is a demonstration, not a measurement,
and the interesting runs are the ones that come out the wrong way round.

One requirement is not optional: **run it in Release.** BenchmarkDotNet's own guidance is that a
Debug build is not a thing worth measuring — the JIT optimisations that a real deployment gets are
exactly the ones that change what the code allocates — and the tool objects loudly when you try.

## `dotnet-trace`: the field observation

[`dotnet-trace`](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-trace) is a
cross-platform CLI tool that attaches to an **already-running** .NET process and collects an
**EventPipe** trace. There is no debugger involved and the process is not stopped to do it.

Where BenchmarkDotNet isolates one method, this observes whatever the process is doing: every
collection, every thread-pool adjustment, every JIT event. It is what you reach for when a service
is "slow" or "using too much memory" and you do not yet have a method to point at.

```sh
# Install once, as a global tool
dotnet tool install --global dotnet-trace

# Find the process
dotnet-trace ps

# Collect with the GC-focused provider profile
dotnet-trace collect --process-id <pid> --profile gc-verbose
```

The output is a `.nettrace` file. A **profile** is a named bundle of providers and keywords; the
`gc-verbose` one is the GC-focused bundle, and it is what gets you collection events and
allocation ticks on a timeline — enough to see when gen 0 collections happened and roughly how much
was allocated between them. The tool documents its own profile list, and that list is the thing to
check rather than a remembered set of provider names: which events a given profile enables is a
property of the version you have installed.

```quiz 01M19K50PNHMVN6W2HGRMT16ZT
A code review asks whether one specific hot-path method should return `ValueTask<T>` instead of
`Task<T>`. Which tool answers that directly?

- [x] BenchmarkDotNet, because it isolates the one method and reports its bytes
  > You have a specific method and a specific hypothesis, which is exactly the lab case.
- [ ] `dotnet-trace`, because it observes what the real process actually does
  > A whole-process trace can tell you the method is hot; it is not shaped to A/B two signatures.
- [ ] Neither, because per-call allocation can be reasoned about but not measured
  > `[MemoryDiagnoser]` reports allocated bytes per operation. It is measurable, so measure it.
- [ ] Either one, because both report allocation from the same runtime counters
  > Both watch the GC, but one isolates a method and the other samples a live workload.
```

## `dotnet-counters`: the live triage view

A trace is a captured window: you decide to look, you collect for a while, you open the file
afterwards. `dotnet-counters monitor -p <pid>` is the continuous view instead — numbers updating
on screen while the incident is happening — which makes it the first thing to open when you are
triaging rather than investigating.

```sh
dotnet-counters monitor -p <pid> --counters System.Runtime
```

The counters worth having on screen, and what each one is telling you:

| Counter | Reads as |
| --- | --- |
| `threadpool-thread-count` | how many workers the pool currently has |
| `threadpool-queue-length` | work waiting with nobody running it — the starvation signal |
| `gen-0-gc-count`, `gen-1-gc-count`, `gen-2-gc-count` | how often each generation is being collected |
| `gc-heap-size` | the growth trend, over minutes rather than seconds |
| `time-in-gc` | the share of time spent paused, which is the latency story |
| `alloc-rate` | bytes per second — the "how bad is it" number |

A rising `threadpool-queue-length` alongside a thread count that is climbing slowly is the shape
described in [[thread-pool-scheduling-and-starvation]]: work is arriving faster than the pool is
willing to grow to meet it. That is a scheduling problem wearing a latency symptom, and it is not
fixed by allocating less. [[diagnosing-thread-pool-symptoms]] is where that side of the diagnosis
belongs.

Two honesty notes about this section. Counter names are the tool's surface and they are versioned
like any other surface, so confirm them against `dotnet-counters list` on the runtime in front of
you rather than from memory. And the *practice* here — counters first for triage, a trace second
once you know where to look — is how practitioners work, not something a specification promises.

## Server GC, workstation GC, and background collection

There is not one collector, there are configurations of one, and the choice changes the numbers
you are reading.

**Workstation GC** is tuned for a single application sharing a machine with a user: fewer heaps,
lower latency per collection. **Server GC** gives each core its own heap and its own collection
thread, with correspondingly larger allocation budgets before a collection triggers. It is aimed
at throughput on a machine dedicated to the workload, and it is the mode ASP.NET Core's project
templates enable by default, through the `ServerGarbageCollection` MSBuild property.

The trade is not "server GC is faster". More heap and a larger budget means each collection has
more to do when it comes, so the collections are rarer and individually bigger — which is a
throughput win and a tail-latency risk at the same time. **Background (concurrent) GC** exists to
blunt that: it performs most of a gen 2 collection concurrently with the application threads
rather than stopping them for the whole of it, and it composes with either mode.

The fundamentals page covers all three, and it is the one to read in full if you only read one
thing here.

```quiz 01M19K50PNDC3NSJYZ3XGTRBBJ recall
An interviewer says: "Our web API has unpredictable GC pauses under load. What would you check
first?" Give the reasoning, not just the tool names — in particular, why the gen 0 allocation rate
is the wrong number to lead with.

> Start with the configuration, because it changes what every subsequent number means: confirm
> which GC mode the process is actually running. A throughput-oriented server-GC configuration
> collects less often and does more per collection, which is the shape that produces occasional
> long pauses rather than steady short ones, and background collection is what softens the gen 2
> case.
>
> Then look at *pause* rather than *volume*. `time-in-gc` is the share of wall-clock time the
> process is paused, which is the number that maps onto the latency symptom being reported. Gen 0
> collections are cheap by construction — a small region, mostly garbage — so a high gen 0 count
> or a high allocation rate can sit underneath a perfectly healthy service. The pauses that get
> noticed come from gen 2 and the Large Object Heap, so it is the gen 2 count, and allocations
> surviving far enough to cause it, that you correlate against the incident.
>
> Only once that says *where*, capture a trace to find out *what* — a whole-process trace over a
> short window, read for which collections happened and what triggered them.
```

## Reading a captured trace

A `.nettrace` file is not a report; something has to render it.

On Windows, PerfView opens the file directly, and its **GCStats** view is the one that pays for the
learning curve: a row per collection, with its generation, its pause duration, and what triggered
it — an exceeded allocation budget, or a collection somebody induced. Cross-platform, `dotnet-trace
convert --format speedscope` turns the trace into a flame graph that a browser can open.

If the service emits its own `EventSource` events around suspect code paths, they land in the same
trace on the same timeline, and correlating a business event against a collection spike is
considerably more convincing than eyeballing two graphs side by side. That workflow is practitioner
convention rather than documented behaviour; the conversion command is the part the tool's own
documentation covers.

## Running a trace against production

`dotnet-trace` is safe to point at a live process in a way a debugger is not — EventPipe attaches
without stopping the process — but "does not stop the process" is not the same as "free".

Its cost scales with **how verbose the enabled providers are**. A GC-verbose profile against a
process that is allocating hard is emitting an event stream proportional to that allocation, and
that stream costs CPU to produce and disk to write. Three habits follow, and all three are about
not paying more than the question is worth:

- Use the **least verbose profile that can answer the question**. Reach for `gc-verbose` because
  you want allocation ticks, not by default.
- Keep the **window short** — seconds to low minutes. You are sampling a behaviour, not recording
  a shift.
- **Sample instances, not traffic.** Trace one or two hosts out of the fleet rather than attaching
  everywhere; a symptom that is real will be visible in a subset, and one that is only visible
  across all of production is not one a trace was going to isolate anyway.

## What "good" looks like

There is **no universal good allocation number**, and being asked for one is usually a sign the
question is underspecified. A given per-call byte count is fine at ten calls a second and ruinous
at fifty thousand; the number that matters is bytes per unit of work multiplied by units of work,
which is why `alloc-rate` is a more useful thing to watch than any per-method figure.

What does generalise is the *shape* of a problem:

- **Short-lived allocations collected in gen 0** are the normal, designed cost of running
  asynchronous code. Gen 0 collections scan a small region that is mostly garbage. A high gen 0
  count on its own is a fact about throughput, not a defect.
- **Allocations that consistently survive into gen 1 or gen 2** are the signal worth chasing.
  Something is holding a reference longer than the code implies: a captured variable in a
  long-lived closure, a cache with no eviction, a static collection that only ever grows. Promotion
  is the anomaly, because it means an object designed to be temporary was not.
- **Allocations at or above the LOH threshold** land on a heap that is collected rarely and
  fragments. These are uncommon in concurrency code specifically, but a buffer read in one shot
  will do it, and staying under the threshold — by pooling or by chunking — is a real technique
  rather than a micro-optimisation.

And the thing to disbelieve first, including when it is your own hypothesis: **async machinery is
rarely the dominant allocation in a realistic endpoint.** Serialisation buffers, string formatting,
and logging on a hot path routinely outweigh it. So a proposed `ValueTask` conversion is a
hypothesis, and [[valuetask-when-it-helps]] is explicit that it is one you justify with a
measurement rather than a preference. Measure first; the profile decides whether the conversion is
the fix or a change that makes the code harder to hold and the graph identical.

```quiz 01M19K50PNEKFJ3FWPGDRKFD9N
A trace shows a high gen 0 collection count and a high allocation rate, with gen 2 collections
rare and the heap size flat over an hour. What does that most likely indicate?

- [ ] A leak, because the allocation rate is high and something is clearly accumulating
  > A flat heap over an hour is the opposite of accumulation. Nothing is being retained.
- [x] A busy service whose objects are dying in gen 0, which is the designed case
  > High churn plus flat heap plus rare gen 2 is short-lived garbage behaving exactly as intended.
- [ ] Large Object Heap fragmentation, which is why gen 2 is collected so seldom
  > LOH pressure shows up as a growing heap and gen 2 work, not as a flat one.
- [ ] Thread-pool starvation, since allocation pressure is what delays worker injection
  > Starvation is read off queue length and thread count; it is a scheduling fact, not a heap one.
```

## What to take away

Two tools, two questions. **A hypothesis about one method goes to BenchmarkDotNet with
`[MemoryDiagnoser]`, in Release**; a symptom in a running process goes to `dotnet-counters` for
triage and `dotnet-trace` for a short, deliberately narrow window. The generational model is what
makes both readable: gen 0 traffic is the cost of doing business, **promotion is the anomaly**, and
the LOH threshold is a default worth knowing and worth checking.

Worth reading in full:
[Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals).
Every column either tool prints is a view onto what that page describes, and reading it once makes
the difference between reporting numbers and interpreting them.
