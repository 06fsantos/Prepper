---
id: 01M1XY3TMNRRRWFTST6AYHFVMH
title: Back-of-envelope estimation — reason from latency ratios, not memorized numbers
topic:
  - system-design
prerequisites:
  - system-design-is-graded-on-process
---

Halfway through a design round you will need a number: how many requests per second, how much
storage a year, whether one database is enough or you have to partition. The estimate is not
the point — the *decision it unlocks* is. And the senior mistake is to reach for a memorized
table of latencies, recite "a disk seek is ten milliseconds", and get it wrong because the
table is a decade old. What travels instead is a **method** — round savagely, work in orders
of magnitude — and a handful of **ratios** that survive the hardware underneath them. This
Lesson is about carrying those, not a lookup table.

The move being graded is the same one the whole [[system-design-is-graded-on-process|round]]
grades: reasoning out loud from something defensible. An estimate you can derive on the
whiteboard in thirty seconds beats a figure you half-remember, because the interviewer can
follow the derivation and correct an input, whereas a recited number is either right or a
dead end.

## What the estimate is *for*

You do not estimate to be precise. You estimate to answer a **binary, architecture-shaping
question** — almost always one of:

- Does this fit on **one machine**, or must I partition / replicate / add servers?
- Is this workload **read-heavy or write-heavy**, and by how much?
- Is the bottleneck **CPU, memory, disk, or network**?

Each of those flips a design decision. "100 GB of profile data" fits on one disk, so profiles
do not need sharding *for size* (they might for throughput). "25,000 requests per second at
peak" does not fit on one app server, so you need a load balancer and a handful behind it.
The number itself is disposable; the fork in the road it reveals is the deliverable. This is
why precision is wasted effort — you are choosing between "one" and "many", and being off by
2× rarely moves that line.

```quiz 01M1XY3TMPYH9EZZX4BYJW86CY
Why does a back-of-envelope estimate in a design round not need to be precise?

- [x] It only has to decide between one machine and many, which 2× rarely changes
  > The estimate exists to flip an architecture decision — shard or not, one server or a
    fleet. Those thresholds are orders of magnitude apart, so being off by a factor of two
    almost never moves the answer. Speed and a defensible derivation beat precision.
- [ ] The interviewer is not actually checking the arithmetic at all
  > They are — a wildly wrong estimate is a real signal. The point is that the *target* is a
    magnitude, not a figure, so rough-but-derived beats precise-but-memorized.
- [ ] Modern hardware is fast enough that the numbers no longer matter
  > Hardware speed is exactly what makes the *absolute* numbers rot; the estimate still
    matters, which is why you carry ratios and a method rather than a stale table.
- [ ] Storage and bandwidth are so cheap that scale is no longer a constraint
  > Throughput, latency, and per-machine limits still bind hard at scale. The estimate is how
    you find which one binds first for this workload.
```

## The method: round savagely, work in powers of ten

The arithmetic has to happen in your head while you talk, so every input gets rounded to one
significant figure and a power of ten. A few conversions do most of the work:

- **A day is ~10⁵ seconds.** (86,400, rounded hard.) So *requests per day ÷ 10⁵ ≈ average
  requests per second.* A billion requests a day is ~10⁴ = 10,000 RPS average.
- **Peak is ~2–3× average.** Traffic is not flat; size for the peak, not the mean.
- **A year is ~3×10⁷ seconds**, and **~4×10² days**, which is what you multiply daily storage
  growth by for annual capacity.
- **Powers of two for data sizes:** 2¹⁰ ≈ 10³ (KB), 2²⁰ ≈ 10⁶ (MB), 2³⁰ ≈ 10⁹ (GB), 2⁴⁰ ≈
  10¹² (TB). Counting bytes is: *number of things × bytes per thing × how long you keep them.*

The discipline is to write each assumption down as you make it — "say 100 million daily users,
say 10 requests each" — so the interviewer can swap an input and watch the answer move. A
guessed input stated out loud is a strength; the same guess left silent is the thing that
sinks you when it turns out to be 100× off. This is the estimation cousin of stating
requirements first: **make the inputs correctable.**

```quiz 01M1XY3TMP3M8VP0WQRAHDRV1J cloze
To turn a daily request volume into an average rate, divide by about {{10^5}} seconds per day.
Size the system for the {{peak}}, which is roughly two to three times the average, not for the
mean. And write every {{assumption}} down as you make it, so the interviewer can correct an
input and watch the estimate move.
```

## The latency ladder — and why most of it is dated

The famous artefact here is Jeff Dean and Peter Norvig's "Numbers Everyone Should Know", a
short list of how long operations take, in nanoseconds. The list is genuinely useful for
building intuition about what is expensive — but it was written for mid-2000s hardware and
most of its absolute values have rotted. What you carry is the **shape**: each rung is roughly
an order of magnitude or two above the last.

| Operation                          | Rough time     | Relative to memory |
| ---------------------------------- | -------------- | ------------------ |
| L1 cache reference                 | ~0.5 ns        | ~200× faster       |
| Main memory reference              | ~100 ns        | 1× (the baseline)  |
| SSD random read                    | ~10–100 µs     | ~100–1000× slower  |
| Round trip, same datacenter        | ~0.5 ms        | ~5,000× slower     |
| Disk seek (spinning)               | ~10 ms         | ~100,000× slower   |
| Round trip, cross-continent        | ~150 ms        | ~1,000,000× slower |

Three things to take from it, in decreasing order of durability:

1. **The cross-continent round trip is physics, not hardware.** Light in fibre crosses the
   Atlantic in ~40 ms one way at best; ~150 ms round-trip is the real figure with routing
   overhead, and no vendor will ever "fix" it — the speed of light is fixed. So while the
   memory and disk numbers drift, *this* rung is durable, and it is the one that most often
   dominates a user-facing design. A chatty protocol that makes ten sequential cross-region
   round trips has spent 1.5 seconds on the wire alone, and no amount of faster hardware buys
   it back. Batch, parallelize, or move the data closer.
2. **Memory is dramatically faster than the network, which is faster than a disk seek.** This
   ordering has held for decades and is why [[caching-and-ttls|caching]] in RAM works, why a
   query that avoids a disk seek is worth chasing, and why staying inside one datacenter beats
   crossing regions. The *ratios* here are the intuition; the exact nanoseconds are not.
3. **The absolutes are stale — say so.** NVMe SSDs have collapsed the memory-to-storage gap
   that the original slides drew as vast, and spinning-disk seeks matter less every year. If
   you quote a number, flag it as "order-of-magnitude, and the hardware has moved" — which is
   itself a senior signal, because it shows you know the map is not the territory.

This is the same lens as [[big-o-notation-basics|asymptotic complexity]], one level down:
Big-O tells you how cost *grows* with input, and the latency ladder tells you the *constant
factors* between the places data can live. A design round needs both — an O(n) algorithm that
does its n work across cross-continent round trips is slower than an O(n log n) one that stays
in memory.

```quiz 01M1XY3TMPA5B7X70A95JFM98F recall
An interviewer says: "Jeff Dean's numbers say a disk seek is 10 ms and main memory is 100 ns.
Those slides are from 2009 — are they still worth knowing?" Give the senior answer.

> Yes, but for the *ratios and the method*, not the absolute values. Most of the absolutes
> have rotted: NVMe storage has collapsed the memory-to-disk gap that the original list drew
> as enormous, so quoting "10 ms for a disk seek" as a current fact would be wrong. What
> survives is the ordering and the rough spacing — memory is far faster than the network,
> which is far faster than a spinning-disk seek — because that shape drives real decisions
> like whether to cache in RAM or whether a query that avoids disk is worth chasing.
>
> The one rung that is *not* dated is the cross-continent round trip, ~150 ms, because it is
> bounded by the speed of light rather than by hardware — no vendor will ever improve it. So
> in a user-facing design that is usually the number that dominates: a protocol making ten
> sequential trans-Atlantic round trips has burned 1.5 seconds on the wire that no faster CPU
> buys back, which tells me to batch or parallelize or move the data closer. I'd carry the
> ladder as intuition, quote any absolute as "order-of-magnitude, and the hardware has moved",
> and lean on the physics-bound rung when it applies.
```

## A worked pass, start to finish

"Design a service serving user profiles for 100 million daily active users." Two estimates,
each flipping a decision:

**Throughput.** Say each user triggers ~10 profile reads a day → 10⁹ reads/day. Divide by 10⁵
s/day → ~10⁴ = 10,000 reads/sec average. Peak ~2–3× → **~25,000 RPS**. A single app server
handles low thousands of simple requests/sec, so 25,000 RPS *does not fit on one machine* →
load balancer plus a handful of stateless app servers. Decision made, in four lines of
arithmetic.

**Storage.** Say a profile is ~1 KB → 100 M × 1 KB = 10⁸ × 10³ = **10¹¹ bytes = 100 GB.** That
*fits on one disk* comfortably → profile data does not need sharding for *size*. (It may still
want a replica for read throughput and availability — a different axis, decided by the
throughput number above, not this one.)

Notice the two estimates point at different components: throughput says "scale the serving
tier", storage says "one node holds the data". That divergence is the actual output — it tells
you the profile store is a **read-throughput** problem, not a **capacity** problem, and steers
you toward replication and [[caching-and-ttls|caching]] rather than partitioning. An estimate
that did not change any decision was not worth doing.

## What to take away

You estimate to make one architecture decision, not to be right to two significant figures.
Round every input to one figure and a power of ten, remember that a day is ~10⁵ seconds and
peak is ~2–3× average, and state each assumption out loud so it can be corrected. Carry the
latency ladder as *ratios* — memory ≪ network ≪ disk seek — not as memorized nanoseconds,
because the absolutes have aged and the interviewer knows it; the one rung that is fixed is the
speed-of-light round trip across continents, and it is usually the one that bites. Then say
which decision the number just made, because that sentence is the whole reason you did the
arithmetic.

Worth reading in full: Jeff Dean and Peter Norvig's
["Numbers Everyone Should Know"](https://brenocon.com/dean_perf.html) (a secondary mirror of
the original slides) — read it for the *shape* of the ladder, and pair it with Colin Scott's
interactive "latency numbers" visualisation to see how the values have shifted across hardware
generations. The lesson of both is the same: keep the ratios, drop the absolutes.
