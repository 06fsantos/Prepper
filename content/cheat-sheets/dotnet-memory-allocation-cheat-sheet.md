---
id: 01M19K50PNHNFRH2BKADXEW57E
title: Managed memory allocation — cheat sheet
topic: dotnet-memory-allocation
---

**The one fact everything else hangs off:** objects are born in **gen 0**, and an object still
reachable when its generation is collected is **promoted** — gen 0 → gen 1 → gen 2. Gen 0 is cheap
because the region is small and mostly garbage. Gen 2 is expensive because collecting it means
walking everything. **Allocation volume is the cost of doing business; promotion is the anomaly.**

- **Large Object Heap** — an allocation at or above the threshold skips the generational segments,
  is collected rarely, and fragments. **85,000 bytes is the documented default, not a runtime
  constant**: `GCLOHThreshold` moves it. Say "default" out loud; it is the tell that you know why
  the number is there.
- **Workstation vs server GC** — server GC gives each core a heap and a collection thread, with
  larger budgets before a collection fires. Rarer, bigger collections: a throughput win and a
  tail-latency risk. ASP.NET Core templates turn it on (`ServerGarbageCollection`).
- **Background (concurrent) GC** does most of a gen 2 collection alongside the app threads instead
  of stopping them for all of it. Composes with either mode.

**Two tools, two questions. Getting this pairing right is most of the interview answer.**

- **Lab — BenchmarkDotNet.** One method, one hypothesis, isolated process, JIT warmed.
  `[MemoryDiagnoser]` adds gen 0/1/2 counts and the **Allocated** bytes-per-op column. **Release
  build, always** — Debug measures code nobody deploys.
- **Field — `dotnet-trace`.** Attaches to a live process over **EventPipe**, no debugger, no stop.
  `--profile gc-verbose` for collection events and allocation ticks; out comes a `.nettrace`.
  Read it in PerfView's **GCStats** (generation, pause, trigger per collection) or convert with
  `--format speedscope`.
- **Triage — `dotnet-counters monitor -p <pid>`.** The continuous view, before you know where to
  look. Watch `time-in-gc` (pause share — the latency number), `alloc-rate`, `gc-heap-size`
  (trend), the `gen-N-gc-count` family, and `threadpool-queue-length` for
  [[thread-pool-scheduling-and-starvation]], which is a scheduling fault, not a heap one.

**Production trace safety:** cost scales with **provider verbosity**, so use the least verbose
profile that answers the question, keep the window to seconds or low minutes, and sample a couple
of instances rather than the whole fleet.

**Reading numbers.** There is no universal good byte count — it is bytes per unit of work times
units of work, which is why `alloc-rate` beats any per-method figure. High gen 0 churn with a flat
heap is a healthy busy service. **Consistent survival into gen 1/gen 2 is the thing to chase**: a
closure capture, an unevicted cache, a static that only grows.

The reach-for-it signal: someone proposes converting a hot path to `ValueTask` to "reduce
allocations". Async machinery is rarely the dominant allocation in a real endpoint — serialisation,
string formatting and logging usually outweigh it — so that is a hypothesis to measure, not a fix
to apply. See [[valuetask-when-it-helps]].

Full treatment: [[allocation-profiling-in-practice]].
