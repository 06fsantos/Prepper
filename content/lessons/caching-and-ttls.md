---
id: 01M1XYDPX8DCTVY30CYK2XN3ZV
title: Caching and TTLs — trading freshness for speed
topic:
  - system-design
prerequisites:
  - system-design-is-graded-on-process
  - back-of-envelope-estimation
---

A cache is a small, fast copy of data kept close to whoever reads it, so that a repeated read
is served from memory in microseconds instead of being recomputed or fetched from a slow store
in milliseconds. In a design round it is the single most reached-for component, and the
temptation is to place it the moment scale comes up — "and then we add a cache" — as though it
were free. It is not. Every cache buys read speed with the same currency: **the data it serves
may be stale.** Lead with that trade-off, not with the box, and you are answering the way the
[[system-design-is-graded-on-process|round]] grades.

The reason caching works at all is the [[back-of-envelope-estimation|latency ladder]]: a read
from RAM is on the order of a hundred nanoseconds, a read that crosses to a database over the
network and hits its disk is on the order of milliseconds — four to five orders of magnitude
slower. So if the same value is asked for a thousand times between changes, serving it from
memory turns a thousand slow, contended database reads into one. That is where a cache's three
benefits come from, and they are worth naming in the exact language the trade-off lives in.

## What a cache actually buys you

- **Sub-millisecond reads.** The headline: a hit is served from memory, so the read latency
  drops by orders of magnitude versus recomputing it or fetching it from disk.
- **IOPS density — one cache absorbs the load of several databases.** A database has a hard
  ceiling on reads per second; a cache in front of it has a far higher one. Offloading the
  repeated reads means one cache node can stand in for several read replicas you would
  otherwise have had to provision, which is a *cost* argument as much as a latency one.
- **Hot-spot relief.** Real traffic is not uniform — a small set of keys (the trending post,
  the celebrity profile) takes a wildly disproportionate share of reads. Those hot keys are
  exactly the ones a cache serves best, so it flattens the spike that would otherwise fall on
  one database partition and take it down.

All three are read-side benefits, and that is the first thing to say about *when* a cache
helps: it pays off when reads dwarf writes and the same data is read repeatedly between
changes. A write-heavy workload, or one where every read is for a different key, gets little
from a cache and still pays its staleness cost. This is why the [[back-of-envelope-estimation|estimate]]
of the read/write ratio comes *before* the decision to cache, not after.

```quiz 01M1XYDPX91HA26Z80641X13RG
A candidate adds a cache in front of the database "to handle the scale." Which workload
actually gets the most out of it?

- [x] Reads far outnumber writes, and the same keys are read repeatedly
  > A cache pays off when a value is read many times between changes — the repeated reads
    become one backing-store read plus many memory hits. That is the read/write ratio the
    [[back-of-envelope-estimation|estimate]] should have surfaced first.
- [ ] Writes far outnumber reads, so the store is under write pressure
  > A cache is a read-side optimisation; it does nothing for write pressure and still has to
    be invalidated on every write. This workload wants sharding or a write buffer instead.
- [ ] Every read is for a different key that is never asked for again
  > With no repeated reads there are no hits to serve — the cache only adds a layer to miss
    through. Caching needs locality of reference to earn its place.
- [ ] The data changes on every read, so freshness must be exact
  > If exact freshness is required the cache cannot serve a stale copy, which is the one thing
    it is for. This workload should read the source of truth directly.
```

## Freshness is the price, and the TTL is how you set it

The moment a value is copied into a cache, the copy and the source of truth can drift: the
source changes, and until the cache learns about it, every hit serves the old value. The
window between "the data changed" and "the cache reflects it" is **staleness**, and a cache is
only ever correct-enough because you have decided how much staleness this data can tolerate.

The simplest and most common control is a **TTL — time to live**: a duration stamped on each
cached entry, after which it expires and the next read misses through to the source and
repopulates. A TTL is a blunt but honest instrument. It says, in effect, *this value may be up
to N seconds out of date, and I have decided that is acceptable.* Setting it is the whole
design decision:

- **A short TTL** means fresher data and more misses — more load falls through to the source,
  and you have bought freshness back with the very latency and IOPS the cache was meant to
  save. In the limit, a one-second TTL on data read once a second is no cache at all.
- **A long TTL** means fewer misses and staler data — cheap and fast, but readers may see a
  value that changed minutes ago. In the limit, an infinite TTL is a copy you have to
  invalidate by hand or never at all.

So the TTL is not a tuning knob you set to a default and forget; it is where you encode the
data's tolerance for being wrong. A stock price and an "about" page both get cached, and they
get opposite TTLs, for the same reason a payments ledger and a view counter get opposite
[[consistency-models|consistency models]] — the staleness a reader can live with is a property
of the *data*, not of the cache. Naming that tolerance out loud, per data type, is the senior
move; reaching for one global TTL is the down-level one.

```quiz 01M1XYDPX9J4XHZBG1BD2V2J68 cloze
A {{TTL}} is a duration stamped on a cached entry, after which it expires and the next read
repopulates it from the source. Shortening it makes the data {{fresher}} but causes more
misses — pushing load back onto the store the cache was meant to protect. The value you set it
to encodes the data's tolerance for {{staleness}}, which is a property of the data, not of the
cache.
```

That staleness window is the same idea the theory calls eventual consistency: a cached read is
a read that may lag the source by a bounded amount. So a cache is not an escape from the
[[the-cap-theorem|CAP]] trade-offs — it is a deliberate, everyday instance of them. Choosing to
serve a possibly-stale copy for speed is choosing availability and latency over strong
consistency, one key and one TTL at a time. Framing it that way in a round connects the applied
component back to the [[distributed-systems|theory]] under it, which is exactly the move the
[[system-design-is-graded-on-process|process]] is graded on.

## Where the cache sits — four places, same trade-off

"Add a cache" is under-specified until you say *where*, and the round expects you to know the
common placements. They are the same mechanism — a fast copy governed by a freshness policy —
at different points on the path from reader to source of truth:

- **Database / application cache.** An in-memory store (Redis, Memcached) between the app and
  the database, holding the results of expensive or repeated queries. The default meaning of
  "a cache" in a design, and where the read/write-ratio argument above applies most directly.
- **CDN / edge cache.** Copies of static or semi-static assets served from points of presence
  physically near the user, so the read never crosses a continent. This is the cache that
  attacks the one latency rung physics will not let you improve — the ~150 ms cross-continent
  round trip from the [[back-of-envelope-estimation|latency ladder]].
- **Session store.** A user's session state kept in a fast shared cache so any app server can
  serve any request — this is what lets the serving tier stay stateless and horizontally
  scalable, which is usually *why* the estimate said to put a load balancer in front of it.
- **API-response cache.** A whole response cached against its request, so an identical request
  is answered without re-running the handler at all — the coarsest grain, and the cheapest when
  it applies.

You do not need all four in one design, and naming them is not the point. The point is that
for each one the question the interviewer will ask is the same: *how stale can this be, and how
do you bound it?* Answer that per placement and the cache stops being a magic box and becomes a
defended decision.

```quiz 01M1XYDPX9K275NFTFMGS9FCEH recall
An interviewer says: "You've put a CDN in your design. Why that and not just a bigger database
cache, and what's the catch?" Give the senior answer.

> A database cache and a CDN attack different costs. A database cache cuts the time to *compute
> or fetch* a value — it turns a slow disk-and-network read into a memory read inside the
> datacenter. A CDN cuts the time to *move* the value to the user: it keeps copies at edge
> locations physically near them, so a reader in another region is served locally instead of
> paying the ~150 ms cross-continent round trip. That round trip is bounded by the speed of
> light, so no bigger database cache can buy it back — only moving the data closer can. So I'd
> reach for a CDN specifically for static or semi-static assets served to a geographically
> spread audience.
>
> The catch is the same as any cache: staleness. An edge copy can be out of date until it
> expires, so a CDN is right for things that tolerate a freshness window — images, scripts,
> rarely-changing pages — and wrong for data that must be exact on every read. I'd govern it
> with a TTL matched to how often the asset actually changes, and for the rare urgent update
> I'd rely on explicit invalidation rather than waiting out the TTL. It's the same
> freshness-versus-speed decision as every other cache, just made at the edge.
```

## What to take away

A cache trades freshness for speed, and that sentence is the whole component. It earns its
place when reads dwarf writes and the same keys are read repeatedly, buying sub-millisecond
reads, IOPS density, and hot-spot relief — all read-side wins that the read/write
[[back-of-envelope-estimation|estimate]] should justify *before* the box is drawn. The price is
staleness, and a TTL is how you set it: short for fresh-and-costly, long for stale-and-cheap,
chosen per data type from that data's tolerance for being wrong. That tolerance is an everyday
instance of the [[consistency-models|eventual-consistency]] trade-off, so a cache is not an
escape from [[the-cap-theorem|CAP]] but a small, deliberate application of it. Say where the
cache sits, say how stale it may be, and say how you bound it — and you have defended a
decision instead of naming a box.

Worth reading in full: AWS's ["What is caching?"](https://aws.amazon.com/caching/) — a concise,
vendor-neutral tour of the benefits (sub-millisecond reads, IOPS offload, hot-spot relief) and
the common placements (database, CDN, session, API), which is the exact vocabulary a design
round expects you to select from and justify.
