---
id: 01M1P5J8NA1A7N8QDN4EPYMM33
title: The generational heap
topic:
  - garbage-collection
prerequisites:
  - value-types-versus-reference-types
---

The CLR's collector is **generational, mark-and-sweep, and compacting**, and the single sentence an
interviewer wants first is about where your code stands in it: **your code allocates only in
generation 0 — the youngest region — and only the collector ever moves an object anywhere else.**
Promotion is not something a program does; it is what happens to the objects a program fails to let
die.

Three generations, and they are ages rather than places. A `new` reference-type object is born in
**gen 0**, the smallest region and the one collected most often. An object still reachable when gen 0
is swept is **promoted to gen 1**, a buffer between the short-lived and the long-lived. Survive a gen
1 collection and you are promoted again to **gen 2**, where objects that genuinely live a long time —
statics, caches, the application's durable state — end up. The
[fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)
page is the primary source for the whole model.

## Why the generations exist at all

The design bets on a fact that holds in almost all real programs: **most objects die young.** A
request handler allocates a pile of short-lived helpers, formats a response, and lets all of it go.
If most of what you allocate is garbage by the next collection, then collecting the youngest region
frequently and cheaply reclaims most of the garbage for most of the cost saved.

That is why a **gen 0 collection is cheap by construction**: it walks a small region that is mostly
dead, keeps the few survivors by promoting them, and is done. A **gen 2 collection is expensive**: it
is a *full* collection — collecting gen 2 also collects gen 1 and gen 0 — so it walks the entire
managed heap. The generations turn "collect everything, rarely" into "collect a little, often" for
the common case, and spend the big collection only when the cheap ones have not freed enough.

```quiz 01M1P5J8NA7D2PFG6RM736H72W
Your code runs `var b = new byte[64];` on a hot path. In which generation is that array first
allocated?

- [x] Gen 0, because user code only ever allocates into the youngest generation
  > A `new` object under the LOH threshold is born in gen 0; only the collector moves it onward.
- [ ] Gen 2, because it is on a hot path and will be allocated many times
  > Allocation frequency does not choose a generation. Everything small starts in gen 0.
- [ ] Whichever generation currently has free space for it
  > The collector does not place new objects by free space; new small objects go to gen 0.
- [ ] Gen 1, because gen 0 is reserved for boxed value types only
  > Gen 0 holds all new small reference-type allocations, boxed or not.
```

## Mark, sweep, compact — and what compaction buys

A collection has three moves. **Mark**: starting from the roots — statics, locals on the stack,
CPU registers — the collector walks every reference it can reach and marks those objects live.
Everything unmarked is unreachable, which is the runtime's definition of garbage; nothing about your
intentions enters into it. **Sweep**: the unmarked objects are reclaimed. **Compact**: the survivors
are slid together to close the gaps the dead ones left, and the references to them are updated.

Compaction is the part worth being able to explain, because it is why managed allocation is *fast*.
After compaction the free space is one contiguous block, so allocating the next object is little more
than bumping a pointer forward — no free-list search, no fragmentation to route around. You pay for
that at collection time, in the work of moving survivors, and you get it back on every allocation
afterwards. (The one region deliberately left **uncompacted** is the Large Object Heap, for reasons
[[the-large-object-heap]] takes up.)

```quiz 01M1P5J8NATDCVGMDDN0X14G5A cloze
The collector keeps an object because it is still {{reachable}} from a root, not because the program
still intends to use it. After sweeping the dead, it {{compacts}} the survivors together, which is
what lets the next allocation be little more than a {{pointer}} bump.
```

## Promotion is the anomaly worth watching

Because your code cannot promote anything, **promotion is a signal, not a choice.** An object that
reaches gen 2 is one that stayed reachable across at least two collections — and for something you
meant to be temporary, that means a reference outlived its purpose: a captured local trapped in a
long-lived closure, a cache with no eviction, a static list that only grows. Steady gen 0 traffic is
the healthy, designed cost of doing work; objects climbing into gen 1 and gen 2 that you expected to
die are the thing to chase. Reading those generation counts off a live process — and why the gen 0
rate is the *wrong* number to lead with — is the subject of [[allocation-profiling-in-practice]];
this lesson is the model those numbers are a view onto.

The interview framing to carry: gen 0 is a fact about **throughput**, gen 2 is a fact about
**retention**. Conflating them — "the gen 0 count is high, we have a leak" — is the mistake the model
lets you avoid.

```quiz 01M1P5J8NA2CP4PX9WAPX9MRND recall
An interviewer asks: "Why does a full gen-2 collection cost so much more than a gen-0 collection,
and why is that split a good idea rather than a limitation?"

> A gen-2 collection is a *full* collection: collecting gen 2 also collects gen 1 and gen 0, so it
> marks and sweeps the entire managed heap and compacts the survivors across all of it. A gen-0
> collection walks only the youngest, smallest region, which is mostly dead objects, so it reclaims
> most of the garbage for a fraction of the work.
>
> The split is a good idea because most objects die young. Collecting the youngest region often and
> cheaply reclaims the bulk of the garbage most of the time, and the expensive full collection is
> spent only when the cheap ones have not freed enough — turning "collect everything, rarely" into
> "collect a little, often" for the common case.
```

## In an interview

Lead with the ownership line — **user code allocates in gen 0, only the GC promotes** — because it is
the sentence that separates someone who has read about generations from someone who understands what
they are for. Then reach for the consequence the question is fishing for: cost (a full gen 2
collection walks everything), health (promotion of what should be temporary is the anomaly), or
placement (large objects skip this ladder, per [[the-large-object-heap]]). The myth to correct if it
comes up is the same one [[value-types-versus-reference-types]] retires — "value types never touch
the heap"; a value-type *field of a class* rides the heap inside that object and is collected with it.

Primary source worth reading in full:
[Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals).
</content>
