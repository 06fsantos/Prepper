---
id: 01M22XHVEWCFDSNE98E1C7VW6H
title: Content delivery networks
topic:
  - system-design
---

A content delivery network is a cache you place at the edge of the network — a worldwide mesh of
data centres, each holding a copy of your content close to the users near it — so that a read is
served from a machine a few milliseconds away instead of one across an ocean. It is one of the
[[system-design-building-blocks|building blocks]] a design round expects you to **select and
justify** rather than name, and like every one of them it is
[[system-design-is-graded-on-process|graded on the reasoning]]: "and then we put it behind a CDN"
earns nothing; saying what a CDN buys, what it costs, and how you keep its copies from going stale
is the signal. A CDN is a [[caching-and-ttls|cache]], so its whole trade-off is the cache's
trade-off — **freshness for speed** — moved to the one place no bigger in-datacenter cache can
reach.

## Why the edge beats the origin: latency you cannot buy back

The reason a CDN exists is a single rung of the [[back-of-envelope-estimation|latency ladder]] that
no amount of hardware improves: the **~150 ms cross-continent round trip**, bounded by the speed of
light. A database cache turns a slow disk-and-network read inside your datacenter into a memory
read — it attacks the *compute-and-fetch* cost. It does nothing about the *distance* between your
datacenter and a reader on another continent, who still pays that round trip on every request. A CDN
is the cache that attacks distance: it keeps copies of your content at "a worldwide network of data
centers called edge locations," and a request "is routed to the edge location that provides the
lowest latency," served from cache if present
([AWS CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)).
Move the data next to the reader and the physics stops being your problem.

That makes the reach-for-it signal precise: **cacheable content served to a geographically spread
audience** — "static and dynamic web content, such as .html, .css, .js, and image files"
([CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)).
The second thing a CDN buys, worth naming because it is easy to forget, is that it **offloads the
origin**: an edge tier that absorbs read traffic before it reaches your origin, so the origin sizes
for cache misses rather than for the whole world. What it does *not* fit is data
that must be exact on every read, or a stream that is uncacheably fresh by design — a
[[real-time-delivery|WebSocket or SSE feed]] is the job of being fresh, so there is nothing for an
edge to cache.

## Pull versus push: who puts the copy at the edge

There are two ways a copy gets to an edge location, and the distinction is worth having a word for.
A **pull** CDN is lazy: the edge holds nothing until the first reader asks for something, at which
point it misses, fetches the object from your origin once, caches it, and serves every later reader
near it from that copy. This is CloudFront's model — if the object is not at the edge, CloudFront
"retrieves it from an origin"
([CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)) —
and it is the common default: you point the CDN at your origin and change nothing about how you
publish. A **push** CDN is the opposite: you upload assets to the edge ahead of time, so they are
in place before the first request and never cost a reader a miss.

A caveat to keep you honest, because an interviewer may probe it: the **push/pull taxonomy itself is
general-industry framing, not a term CloudFront's own docs define.** The *pull* mechanism —
miss-then-fetch from origin — is first-party and precise; "push CDN" is the folklore-level name for
its opposite. So use the two words to reason with, but attribute the mechanism to the vendor and the
label to the industry. The practical read: pull is the low-effort default and its cost is a slow
*first* request per object per edge (the miss that fills the cache); push suits a smaller set of
assets you want warm everywhere from the first request, at the cost of a publish step that shoves
them out.

```quiz 01M22XHVEXYT353GM283DJ3N90
Your app serves images and static bundles to users worldwide, and you point a CDN at your origin
without changing how you publish. A user in Sydney is the first to request a particular image.
What happens, and what model is this?

- [x] The edge misses, fetches the image from origin once, caches it, and serves later Sydney users locally — the pull model
  > A pull CDN holds nothing until asked; the first reader pays a miss that fetches from origin and
    fills the edge, and everyone near them after that is served the cached copy. Pointing the CDN at
    your origin and changing nothing is exactly what makes it a pull setup.
- [ ] The image was uploaded to every edge ahead of time, so Sydney is served instantly — the push model
  > That is the push model, but it is not this setup: pushing means a deliberate publish step that
    uploads assets to the edge in advance, which you did not do by merely pointing the CDN at origin.
- [ ] Every request for the image is forwarded to origin, and the CDN only load-balances them — pull
  > That is not a CDN at all — forwarding every read to origin caches nothing and buys back none of
    the round trip. A pull CDN caches the object after the first miss.
- [ ] The edge refuses the request until an operator invalidates the old copy — push
  > Invalidation is about removing a *stale* copy, not about a first-ever request, and it is not the
    push model. The first read simply misses and fills the cache.
```

## The TTL is the freshness dial

A cached copy and the source can drift the moment they are separated, so every CDN entry lives at
the edge for a bounded time — a **TTL** — after which the next read misses through to origin and
repopulates. This is the same dial as any [[caching-and-ttls|cache TTL]], and it governs the CDN's
whole trade-off. CloudFront's default is concrete: "each file stays in an edge location for 24 hours
before it expires. The minimum expiration time is 0 seconds; there isn't a maximum"
([CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)).

Turning the dial trades the two things the CDN is balancing:

- **A long TTL** maximises the hit rate and origin offload — most reads are served at the edge, your
  origin sees little — but a viewer can see content that changed up to the TTL ago. A 24-hour TTL on
  a logo is free; a 24-hour TTL on a price is a bug.
- **A short TTL** keeps content fresh but pushes traffic back to origin as entries expire and reads
  miss through — which is spending back the very offload and latency the CDN was there to buy.

So the TTL is not a default you set once; it is where you encode this asset's tolerance for being
stale, set **per content type** from how often that content actually changes. Naming that tolerance
out loud — "images and bundles get a long TTL, the rendered homepage a short one" — is the senior
move; one global TTL across everything is the down-level tell.

```quiz 01M22XHVEX3AFT8V1B6CYMQMY2 cloze
Content sits at an edge location for a {{TTL}}, after which the next read misses through to origin
and repopulates it. CloudFront defaults this to {{24 hours}}. A long TTL maximises the hit rate and
origin offload at the cost of viewers seeing {{stale}} content for up to that long, so you set the
TTL per content type from how often that content actually changes.
```

## Invalidation versus versioned filenames: the key trade

The TTL answers "how long may this be stale by default," but the hard case is the *unplanned*
change: you shipped a bad stylesheet, or a price is wrong, and you need the edge to stop serving the
old copy **now**, before its TTL expires. There are two ways out, and knowing which one AWS itself
recommends is the mark of someone who has run a CDN rather than read about one.

The first is **invalidation**: you tell the CDN to drop an object, so that "the next time a viewer
requests the file, CloudFront returns to the origin to fetch the latest version"
([CloudFront invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)).
It works, but it is the costlier path: invalidations are billed beyond a small free tier, and — the
deeper problem — **you do not control the caches you do not own.** A downstream browser cache or corporate proxy holding the old copy will "continue
to see the old version until it expires from those caches," which no invalidation of *yours* can
reach.

The second is a **versioned filename**: instead of overwriting `app.css`, you publish `app.a1b2c3.css`
— a new URL, usually a content hash — and update the page to point at it. Because the URL is new,
there is no old cached copy of it anywhere to invalidate: the edge, and every downstream cache, misses
on a name they have never seen and fetches the new object once. **AWS explicitly recommends versioned
filenames over invalidation** — it is "less expensive," it takes effect immediately everywhere
including caches you do not own, and it lets you keep both versions around so a rollback is just
pointing the page back at the old URL
([CloudFront invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)).

The content-hashed URL is why you can set an aggressive, near-permanent TTL on your static assets and
still ship changes the instant you deploy: the assets never change *under a name*, so caching them
forever is safe, and a change is a new name rather than a mutation of an old one. That pairing —
immutable, long-TTL, versioned assets plus a short-TTL HTML document that references them — is the
standard production shape, and it turns invalidation from a routine tool into the rare escape hatch it
should be.

```quiz 01M22XHVEXKEEWVDN04JSKEFKF recall
An interviewer says: "You're serving a single-page app's static bundles through a CDN. You deploy a
fix and need users on the new version fast — but you also want a high cache hit rate. How do you set
the TTL, and how do you push the change out? What's the catch with the obvious alternative?" Give the
answer you'd say out loud.

> I'd reach for **versioned filenames** — content-hashed URLs like `app.a1b2c3.js` — and give those
> assets a **long, near-permanent TTL**. Because the hash changes whenever the content does, the URL
> is immutable: it is safe to cache forever at the edge and in every browser, which is exactly the
> high hit rate and origin offload I want. Shipping a change means publishing new filenames and
> updating the HTML that references them, so the next request is for a name nothing has cached and it
> misses through to origin once. To keep *that* fast I put the small HTML document on a short TTL, so
> the pointer to the new bundles is picked up quickly while the bundles themselves stay cached hard.
>
> The obvious alternative is **invalidation** — telling the CDN to drop the old object — and AWS
> itself recommends versioning over it. Invalidation is billed, and the real catch is that it only
> reaches caches I own: a user's browser or a corporate proxy holding the
> old copy keeps serving it until *its* TTL expires, which my invalidation can't touch. A new URL has
> no old copy anywhere to go stale, so versioning sidesteps that entirely — and it lets me roll back
> by just repointing at the previous filename. I'd keep invalidation as the rare escape hatch, not
> the routine tool.
```

## What to take away

A CDN is an edge cache, so it is the [[caching-and-ttls|freshness-for-speed]] trade-off moved to the
one place a datacenter cache cannot help: it kills the ~150 ms cross-continent round trip by serving
content from a location physically near the reader, and offloads read traffic from the origin.
Copies reach the edge two ways — **pull** (miss-then-fetch on first request, the low-effort
default) versus **push** (uploaded ahead of time) — with the caveat that the pull *mechanism* is
CloudFront's and the push/pull *labels* are general-industry framing. The **TTL is the freshness
dial**, set per content type: long for hit rate and offload, short for freshness, and a global
default is a down-level tell. The key trade for the unplanned change is **invalidation versus
versioned filenames**: invalidation is the billed path that cannot reach caches you do not own,
so AWS recommends **content-hashed URLs** instead — which also let you cache static assets forever and
ship a change as a new name. Whether a CDN fits a given design is engineering judgement; that the edge
buys latency and offload, and that versioning beats invalidation, is not — say it with the trade-off
leading and the box becomes an argument. The scan-grid companion is
[[system-design-building-blocks]], and CDNs sit beside the other blocks a round pulls from —
[[load-balancing]], [[rate-limiting]], [[message-queues]], and [[api-design]]; the offload they give
the origin is one input to the [[availability-and-the-nines|availability]] you can then promise.

Worth reading in full: AWS's
[CloudFront introduction](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)
and its companion page on
[invalidating files](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
— the first is the exact vocabulary of edge locations, the pull model, and the 24-hour TTL a design
round expects, and the second is AWS stating in its own words why a versioned filename beats an
invalidation.
</content>
