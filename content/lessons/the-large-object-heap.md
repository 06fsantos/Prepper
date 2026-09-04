---
id: 01M1P5J8NBEFM56QQ1VR4BZ0VA
title: The large object heap
topic:
  - garbage-collection
prerequisites:
  - the-generational-heap
---

There is a size at which an object stops taking the ordinary path through the heap. **An allocation
of 85,000 bytes or more goes on the Large Object Heap**, a separate region with different collection
and compaction rules — and the interview question that tests whether you know this is deliberately
concrete: *"you allocate a 90 KB buffer per request under load — what happens?"* The answer is a
small chain of consequences, and each link is a fact the LOH's design forces.

## What the LOH is, and why 85,000 bytes

The LOH exists because moving large objects is expensive. The ordinary generations are **compacted** —
survivors slid together so the next allocation is a pointer bump (see [[the-generational-heap]]) — and
that compaction copies every surviving object. Copying an 80-byte object is nothing; copying a
multi-megabyte array on every collection is a cost the runtime refuses to pay by default. So large
objects get their own heap that is **swept but not compacted**.

Two facts about that heap are the ones to state precisely, both from the
[Large Object Heap](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/large-object-heap)
docs:

- It is **collected only as part of a gen-2 collection.** The LOH is sometimes called "generation 3"
  informally, but physically it is reclaimed on the full, expensive collection — never on a cheap gen
  0 or gen 1 pass. A large object you drop is not freed until the next gen 2 happens.
- It is **not compacted by default.** When a large object is freed it leaves a hole, and the next
  large allocation is fitted into a hole big enough to hold it, from a free list. Holes that nothing
  fits into are wasted space — **fragmentation**.

The 85,000-byte threshold is a documented **default**, not a constant of the runtime; the
`GCLOHThreshold` configuration knob moves it. So it is the right number to carry into an interview and
the wrong number to assert about a process whose configuration you have not read —
[[allocation-profiling-in-practice]] makes the same point about the threshold as a movable default.

```quiz 01M1P5J8NB36NH22R52XZ1PKKB
A 90 KB buffer is allocated to serve a request, then goes out of scope when the request completes.
When is its memory actually reclaimed?

- [x] On the next gen-2 collection, because the LOH is collected only as part of gen 2
  > Large objects live on the LOH, which is swept with the full gen-2 collection, not on a gen-0 pass.
- [ ] On the next gen-0 collection, because it was allocated to serve one short request
  > Lifetime intent does not place it. At 90 KB it is on the LOH, reclaimed only with gen 2.
- [ ] Immediately when the request scope ends and the variable leaves scope
  > Reclamation is never immediate; it waits for a collection, and for the LOH that means gen 2.
- [ ] When the LOH runs out of room and triggers its own dedicated collection
  > There is no LOH-only collection; it is reclaimed as part of the gen-2 full collection.
```

## The fragmentation trap

Now run the per-request buffer forward. Each request allocates a ~90 KB array on the LOH; each one
survives until at least the next gen 2 collection, because that is the only thing that frees it. Under
load many are alive at once, and as they come and go they leave a heap of **holes of slightly
different sizes**. A new 90 KB request needs a hole at least 90 KB wide; the 88 KB gap left by a
finished request cannot take it and sits idle. The heap's committed size climbs even though the amount
of *live* data does not, because the collector will not slide the survivors together to close the
gaps.

That is the shape of an LOH problem: a **growing heap and rising gen 2 activity** with no true leak —
memory lost to fragmentation rather than to retention. (It is distinct from the flat-heap, high-gen-0
picture of a healthy busy service that [[allocation-profiling-in-practice]] describes; the LOH case
grows.) It is not fixed by allocating *less often* — it is fixed by not allocating large, short-lived
objects on the hot path at all.

```quiz 01M1P5J8NBTGN8K91N1E6TVT1Z cloze
The LOH is not {{compacted}} by default, because copying large objects on every collection would be
expensive. A freed large object therefore leaves a {{hole}}, and holes too small for the next large
allocation become wasted space — the failure mode called {{fragmentation}}.
```

## The fix: pool the buffer, do not re-allocate it

If the problem is churning large buffers, the fix is to **stop churning them** — allocate a buffer
once and reuse it, rather than allocating a fresh one per request. `ArrayPool<T>` is the runtime's
tool for exactly this: rent an array, use it, return it, and the same backing storage serves the next
request without a new LOH allocation.

```csharp
byte[] buffer = ArrayPool<byte>.Shared.Rent(90_000);
try
{
    // fill and use buffer[..90_000]; Rent may return a LARGER array, so
    // track the length you asked for rather than buffer.Length.
    Process(buffer.AsSpan(0, 90_000));
}
finally
{
    ArrayPool<byte>.Shared.Return(buffer);
}
```

Two details that separate a real answer from a slogan. `Rent` may hand back an array **larger** than
you asked for — the pool keeps arrays in size buckets — so the returned buffer's `.Length` is not the
size you requested; carry the requested length yourself, which is where a [[span-and-stackalloc|`Span<T>`]]
window over the used prefix earns its keep. And the `Return` belongs in a `finally`, because a rented
buffer not returned is worse than one never pooled — it is a leak *and* a defeated optimisation.

Pooling has a cost of its own: a pooled buffer lives as long as the pool, so you have traded
allocation churn for a durable memory footprint, and pooling a buffer that is neither large nor hot is
complexity for nothing. The technique earns its place specifically where the buffers are big enough to
hit the LOH and frequent enough to fragment it.

```quiz 01M1P5J8NBZ5J031SD9RB2EW44
Why does renting from `ArrayPool<T>` help the per-request 90 KB buffer, when it does not reduce the
size of any single buffer?

- [x] It reuses one backing array across requests, so no new LOH allocation happens per request
  > Removing the repeated large allocation is what stops the LOH churn and the fragmentation it causes.
- [ ] It allocates the buffer on the stack instead of the heap, avoiding the LOH
  > Pooled arrays are heap objects; the pool reuses them, it does not move them to the stack.
- [ ] It compacts the LOH after each return, closing the fragmentation holes
  > Returning a buffer does not compact the LOH; the point is to avoid creating the holes at all.
- [ ] It shrinks each buffer below the 85,000-byte threshold so it lands in gen 0
  > The pool does not resize your data; the buffer is still large and still on the LOH while rented.
```

## In an interview

Walk the chain out loud, because each link is a checkable fact: **85,000 bytes → the LOH → collected
only with gen 2 → not compacted → fragments under churn → pool it.** If pressed, note the threshold is
a movable default and that the LOH being "gen 3" is a nickname for a region physically collected as
part of gen 2. The tell that you understand it rather than recite it is naming *why* it is uncompacted
— copying large objects is the cost the runtime declines to pay — and reaching for `ArrayPool<T>`
rather than "allocate less."

Primary source worth reading in full:
[The Large Object Heap](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/large-object-heap).
</content>
