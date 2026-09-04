---
id: 01M1P5J8NBDMQBV4592JHZ4A9W
title: Garbage collection — cheat sheet
topic: garbage-collection
---

**The collector**: generational, mark-and-sweep, compacting, over the managed heap.

- **Your code allocates only in gen 0** (or the LOH). **Only the GC promotes** survivors: gen 0 →
  gen 1 → gen 2. You never move an object between generations.
- **Gen 0** is small and collected often and cheaply (mostly dead). **Gen 2** is a *full* collection —
  it also collects gen 0 and gen 1 — so it walks the whole heap and is expensive.
- **Compaction** slides survivors together, so the next allocation is a pointer bump. That is why
  managed allocation is fast.
- **Promotion of what should be short-lived is the anomaly** — a leak signal. Steady gen 0 traffic is
  healthy throughput. Do not read a high gen 0 count as a leak.

**Large Object Heap** — objects **≥ 85,000 bytes** (a movable default via `GCLOHThreshold`):

- Collected **only as part of gen 2**; informally "gen 3." **Not compacted by default** (copying large
  objects is expensive) → **fragmentation** → a *growing* heap with no real leak.
- The probe — *90 KB buffer per request*: lands on the LOH, freed only on gen 2, fragments under churn.
  Fix by **pooling** (`ArrayPool<T>`: rent, use, `Return` in a `finally`; `Rent` may return a larger
  array — track your own length), not by "allocate less."

**Dispose vs finalizers**:

- `IDisposable`/`using` = **deterministic** cleanup you trigger at a known point. Finalizer (`~T()`) =
  **non-deterministic**; the **GC** decides when, on a **dedicated finalizer thread** — you cannot
  order or force it.
- An object **with a finalizer survives an extra collection** (queued, promoted, then reclaimed later).
- **Dispose pattern**: `Dispose()` calls `GC.SuppressFinalize(this)` to cancel that penalty. The
  `Dispose(bool disposing)` overload exists because the **finalizer path (`false`) must not touch other
  managed objects** — they may already be collected. Prefer `SafeHandle` so you need no finalizer.

**`Span<T>` / `stackalloc`** — work over memory with no heap allocation:

- `Span<T>` is a **stack-only window** (a `ref struct`), not a copy. Confinement forbids: **class
  field, boxing, lambda capture.**
- `stackalloc` memory is on the stack: **not GC-tracked, no pinning needed**; keep it small and
  short-lived.
- **A `Span<T>` cannot cross an `await`** (a `ref struct` can't live in the heap-based state machine) →
  use **`Memory<T>`** on async paths, `.Span` at the point of sync use.

The reach-for-it signal: a `new` on a hot path, a per-request large buffer, an unmanaged handle, or a
parse/format loop that allocates. Ask *where does this live, and who frees it, and when?*

Full treatment: [[the-generational-heap]], [[the-large-object-heap]], [[dispose-and-finalizers]],
[[span-and-stackalloc]]. Reading GC numbers off a live process: [[allocation-profiling-in-practice]].
</content>
