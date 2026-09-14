---
id: 01M2G9F2TANVZ5B0BTBMZCYJTF
title: Design a URL shortener
kind: system-design
difficulty: medium
topic:
  - system-design
  - distributed-systems
practices:
  - system-design-is-graded-on-process
  - back-of-envelope-estimation
  - caching-and-ttls
  - partitioning-replication-and-consistent-hashing
source:
  - https://leetcode.com/problems/design-tinyurl/
---

## Prompt

Design a service that turns a long URL into a short one — `https://acme.co/abc123` — and, when
someone visits the short link, sends them on to the original. Two operations: create a short
link for a given URL, and resolve a short link back to its target. Work out the API, how the
short code is generated, where the mapping is stored, and how the read path stays fast as the
service grows; then defend where you spent consistency and where you did not.

## Constraints

- Assume public consumer scale: on the order of 100M new links a day, read-heavy at roughly a
  100:1 read-to-write ratio (people click links far more than they mint them).
- Short codes should be as short as they can be — the whole point is brevity — and hard to
  enumerate, so links are not trivially guessable.
- A resolve is a redirect and must be fast: single-digit milliseconds at the edge.
- Links are effectively immutable and rarely deleted; optional custom aliases and expiry are
  a plausible follow-on rather than a core requirement.

## Solution

The value of this problem is that it looks trivial — it is a hash map behind two endpoints —
and everything interesting is in the numbers you derive and the one or two places you decide
what to give up. The round grades [[system-design-is-graded-on-process|the process, not the
diagram]], so the walkthrough below is the four moves run in order: clarify, estimate,
decompose, and name each trade-off out loud.

### Clarify, then size it

Pin the prompt down before drawing. Functional: create-short-for-long, and resolve-short-to-long.
Non-functional is where the design actually lives — read-heavy, latency-critical on the read
path, extremely high availability (a dead link is a broken promise on someone else's page), and
**consistency that can be relaxed on reads but not on the uniqueness of a code**.

Now the [[back-of-envelope-estimation|back-of-envelope pass]], because it decides the rest.
100M writes/day is about 1,200 writes/sec; at 100:1 that is ~120K reads/sec, and you size the
read path for the peak, call it a few hundred thousand per second. Storage: 100M/day × 365 ×
~500 bytes per record ≈ 18 TB/year — small enough that the data fits comfortably in a
partitioned store, and the read volume, not the size, is the pressure. Keyspace: at 100M/day
you mint ~36 billion links in a year. Base62 (`[A-Za-z0-9]`) gives 62^7 ≈ 3.5 trillion codes at
**7 characters**, so a 7-char code buys years of headroom; that single arithmetic step is the
whole argument for the code length.

### The one real decision: how the code is generated

This is where the interviewer will push, and the three candidate approaches trade different
things:

1. **Hash the URL (e.g. take the first N chars of a SHA of the long URL).** Deterministic and
   stateless, but hashes collide, and now every write is a read-then-maybe-retry to detect the
   collision — and the same URL from two callers either dedupes (a feature) or has to be salted
   (back to collisions). Simple to say, awkward to operate.
2. **A global auto-increment counter, Base62-encoded.** No collisions by construction — the
   counter *is* uniqueness — and the code is as short as the count demands. The cost is that a
   single global counter is a coordination point, and sequential codes are trivially
   enumerable.
3. **A pre-allocated key range per server (a "key generation service").** Each app server
   reserves a block of the counter's space — say a million ids — from a central allocator and
   hands them out locally, refilling when it runs low. Uniqueness is preserved because the
   ranges never overlap, the central allocator is hit once per million writes instead of once
   per write, and a server crash merely wastes an unused block, which the keyspace can afford.

Take approach 3, and say why in trade-off terms: it keeps the collision-free property of the
counter while removing the counter from the hot path, at the cost of some operational
complexity and non-contiguous ids — and non-contiguous is a *feature* here, since it makes codes
harder to enumerate. If enumeration resistance matters more, Base62-encode the id through a
keyed permutation so adjacent ids do not produce adjacent codes.

```csharp
public sealed class Base62
{
    private const string Alphabet =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    public static string Encode(long id)
    {
        if (id == 0) return "0";
        var sb = new StringBuilder();
        while (id > 0)
        {
            sb.Insert(0, Alphabet[(int)(id % 62)]);
            id /= 62;
        }
        return sb.ToString();
    }
}
```

### Decompose the rest, naming the trade-off on each box

- **Storage.** A key-value or wide-column store keyed on the short code — the access pattern is
  a point lookup by code, which is exactly what these are built for, and the data
  [[partitioning-replication-and-consistent-hashing|partitions cleanly on the code]] because
  the code is a high-cardinality, uniformly-distributed key. A relational store works at this
  size too; the point-lookup, no-join workload just does not need one.
- **The read path is a cache.** At a 100:1 ratio and a Zipfian click distribution — a few links
  go viral, most are cold — [[caching-and-ttls|a cache]] in front of the store absorbs the vast
  majority of reads. Cache the code→URL mapping; because links are immutable, the entry is safe
  to keep for a long TTL and there is almost no invalidation problem — the one case that writing
  a mapping never *changes* one buys you. This is the axis to state out loud: you are trading a
  little memory for a large latency and load win, and the immutability is what makes the trade
  nearly free.
- **A [[content-delivery-networks|CDN]] / edge** can serve the redirect itself for hot links,
  pushing the p99 down to the network round-trip.
- **Read replicas** behind the cache handle the misses; the write path goes to the primary.

### Where consistency is spent — say this unprompted

The uniqueness of a code is the **one invariant that cannot be eventually consistent**: two
long URLs must never resolve from the same code. Approach 3 gives that for free, because
disjoint id ranges make collisions structurally impossible rather than something you detect
after the fact. Everything *else* on the read side is happily
[[consistency-models|eventually consistent]] — a replica or a cache that is a few seconds behind
on a newly-created link is invisible to the person who just made it in the common case, and if
"resolve immediately after create" must always work, route a just-created code's first reads to
the primary or write-through the cache on create.

This is the [[pacelc|PACELC]] reasoning made concrete: there is no partition most of the time,
so you are trading latency against consistency in the normal case (E/L) — and for redirects you
take latency every time, because a link that is a moment stale costs nothing and a slow redirect
costs a page load. A design that reached for strong consistency on the read path here would be
paying for a guarantee the workload never asked for.

## Complexity

Resolve is an `O(1)` point lookup — a cache hit at the edge, or a single indexed read on a
miss — which is what lets the read path scale horizontally: add cache and replica capacity and
throughput rises with it, because no read coordinates with any other. Create is `O(1)`
amortised: a local id from the pre-allocated block, one write to the store, and a central
allocator touched only once per block (once per ~million writes), so write throughput is not
gated on a global counter. Storage grows linearly with links minted, ~18 TB/year on the figures
above, which partitions across nodes on the code without hotspots because the code is uniformly
distributed.

## Follow-ups

- Add **custom aliases** (`acme.co/my-brand`). What breaks about the pre-allocated counter, and
  how do you keep uniqueness when the code is now caller-supplied?
- Add **expiry**. Where does the deletion happen, what does a resolve of an expired code return,
  and how do you reclaim keyspace without breaking the collision-free guarantee?
- The interviewer wants **click analytics** per link. Does counting clicks on the hot read path
  change your storage or consistency choices, and how would you keep the redirect fast while
  still counting?
- One link goes viral and is 90% of your traffic for an hour. Walk through what saturates first
  and what absorbs it.
