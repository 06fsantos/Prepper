---
id: 01M1XZ0CGZZM99EKBCM64H7ZBX
title: Which building blocks does a system-design round expect you to select and justify?
date: 2026-09-07
sources:
  - https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
  - https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html
  - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html
  - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html
  - https://blog.nginx.org/blog/rate-limiting-nginx
  - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
  - https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
  - https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/
  - https://www.rfc-editor.org/rfc/rfc6585
  - https://www.rfc-editor.org/rfc/rfc9110
  - https://kafka.apache.org/intro
  - https://cwiki.apache.org/confluence/display/KAFKA/Idempotent+Producer
  - https://www.rabbitmq.com/docs/confirms
  - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html
  - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html
  - https://grpc.io/docs/what-is-grpc/introduction/
  - https://graphql.org/learn/introduction/
  - https://google.aip.dev/158
  - https://docs.stripe.com/api/pagination
  - https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
  - https://docs.stripe.com/api/idempotent_requests
---

This is a Workshop note: it exists so that authoring has somewhere to put an
investigation, and the reader never sees it.

## The question

What are the five system-design "building blocks" — load balancing, rate limiting, message
queues, CDNs, API design — that a senior interview expects a candidate to **select and
justify** rather than merely name? For each: (a) what it is, (b) when to reach for it, (c) the
**primary** trade-off it makes, and (d) what it costs / how it fails. This is selection-guide
altitude — enough to defend a choice in 45 minutes, not an implementation manual. Every claim
that could be wrong is chased to the source that owns it; the book *Designing Data-Intensive
Applications* (Kleppmann, O'Reilly 2017), hereafter **DDIA**, is cited as a book because it is
one, and any comparison with no canonical primary is marked **secondary**.

## The short version

None of these five is a fact to recite; each is a **decision with a named cost**. The senior
signal is to say what you are buying and what you are giving up: an L7 load balancer buys
content routing and costs a decoded, terminated connection; a token bucket buys burst
tolerance and a leaky bucket buys a smooth output rate; a log (Kafka) buys replay and a
classic queue (RabbitMQ) buys competing-consumer parallelism; a CDN buys latency and origin
offload and costs you the invalidation problem; REST/gRPC/GraphQL each optimise a different
axis (ubiquity / efficiency / client-shaped fetches). The recurring primary-source correction
to interview folklore: **"exactly-once" is not a delivery guarantee you turn on** — it is
at-least-once delivery plus producer-side dedup, and both Kafka and RabbitMQ say the
application must be idempotent.

## Load balancing

**(a) What it is.** A tier that "automatically distributes your incoming traffic across
multiple targets... in one or more Availability Zones" and "routes traffic only to the healthy
targets" ([AWS ELB](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html)).
The first architectural fork is the OSI layer it works at. An **L4 (transport)** balancer
"functions at the fourth layer of the Open Systems Interconnection (OSI) model," selecting a
target "using a flow hash algorithm based on the protocol, source IP address, source port,
destination IP address, destination port" and pinning "each individual TCP connection... to a
single target for the life of the connection"
([AWS NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html)) —
it never reads the request. An **L7 (application)** balancer "functions at the application
layer, the seventh layer" and can "route requests to different target groups based on the
content of the application traffic" — host header, URL path, HTTP method
([AWS ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)).

**(b) When to reach for it.** Any time you have more than one instance of a stateless service:
it is the mechanism that turns "add a box" into horizontal scale and turns a dead box into a
non-event. Reach for **L4** when you need raw throughput ("millions of requests per second"),
non-HTTP protocols (TCP/UDP/QUIC), or static IPs; reach for **L7** when routing decisions
depend on request content — path-based microservice routing, host-based multi-tenancy, header
rules ([AWS ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)).
The common algorithms: **round robin** ("requests are distributed evenly across the servers,
with server weights taken into consideration"), **least connections** ("a request is sent to
the server with the least number of active connections"), **IP hash** ("determined from the
client IP address"), and a **generic hash** with an optional `consistent` parameter that
enables "ketama consistent-hash load balancing" — the choice that minimises reshuffling when
the server set changes
([NGINX](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)).

**(c) The primary trade-off.** L4 vs L7 is **speed and protocol-agnosticism vs
content-awareness**. L4 forwards packets/connections without decoding them, so it is faster and
works for anything over TCP/UDP but cannot route on a URL; L7 must terminate and parse the
request (and typically terminate TLS) to route on content, which is exactly what lets it do
path routing, header inspection, and per-request retries.

**(d) Cost / failure modes.** It is a tier you must run and make redundant — a naive single LB
is a single point of failure, which is why AWS spreads nodes across Availability Zones and
"remove[s] the IP address for the corresponding subnet from DNS" when a zone has no healthy
target ([AWS NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html)).
**Health checks** are load-bearing and imperfect: NGINX marks a server down only after
`max_fails` failures within `fail_timeout` (passive), and a recovered server needs `slow_start`
to "gradually recover its weight from 0 to its nominal value" or it gets swamped the instant it
returns ([NGINX](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)).
The classic senior trap is **session stickiness**: IP-hash or sticky sessions pin a client to
one backend, which breaks even distribution and turns that backend's death into lost sessions —
the real fix is to make the service stateless so any algorithm works.

## Rate limiting

**(a) What it is.** A control that caps the request rate from a source, rejecting or delaying
excess. The four algorithms map cleanly onto real primary implementations. **Leaky bucket**:
NGINX's `limit_req` "uses the 'leaky bucket algorithm'... to deal with burstiness" — requests
are water poured into a bucket that leaks at a fixed rate; overflow is discarded, so the
*output* rate is smoothed ([NGINX](https://blog.nginx.org/blog/rate-limiting-nginx)). **Token
bucket**: AWS API Gateway "throttles requests... using the token bucket algorithm, where a
token counts for a request," with a steady-state `rate` (tokens added per second) and a `burst`
(bucket capacity) so "a burst can allow pre-defined overrun"
([AWS API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)).
**Fixed vs sliding window**: Cloudflare lets you pick, with a `period` of 10–3600s
([Cloudflare WAF](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/)); their
**sliding-window counter** blends the previous and current fixed window weighted by elapsed
time — e.g. `42 × (60-15)/60 + 18 = 49.5` — which "smoothes the traffic spike issue that the
fixed window method has" using only "two numbers per counter," measured at "0.003% of requests
wrongly allowed or rate limited" and "6% average difference between real rate and the
approximate rate" ([Cloudflare](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)).

**(b) When to reach for it, and where it sits.** To protect fair use and to shed overload/DoS
before it reaches expensive tiers. Placement is a spectrum, each with a primary example: at the
**edge** (Cloudflare, per-data-center), at the **API gateway** (API Gateway, per-account /
per-method / per-key), or at a **per-service reverse proxy** (NGINX). Push it as far toward the
edge as the counter can be shared: the closer to the client, the cheaper the rejection.

**(c) The primary trade-off.** **Burst tolerance vs smoothing.** Token bucket *permits* bursts
up to the bucket size (good for bursty-but-bounded clients); leaky bucket *refuses* to emit
faster than the leak rate (good for protecting a fragile downstream). Fixed window is O(1) and
cheap but has the **boundary problem** — a client can fire a full quota at the end of one window
and another at the start of the next, briefly doubling the rate; sliding window fixes this at
the cost of tracking a second counter (log-based sliding is exact but O(requests) memory)
([Cloudflare](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)).

**(d) Cost / failure modes.** Accuracy costs memory and coordination: an exact sliding-log is
expensive, an approximation drifts (~6%), and a distributed limiter has "a delay of up to a few
seconds between detecting a request and updating rate counters," so "excess requests could still
reach the origin before... a mitigation action"
([Cloudflare WAF](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/)). The
standard **response contract** is HTTP **429 Too Many Requests**, which "MAY include a
Retry-After header indicating how long to wait before making a new request"
([RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585)); AWS returns exactly this
([API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)).
Folklore note: NGINX's own default rejection code is **503**, overridable via
`limit_req_status` — 429 is the *correct* code, not the universal default
([NGINX](https://blog.nginx.org/blog/rate-limiting-nginx)).

## Message queues

**(a) What it is.** Asynchronous middleware that lets a producer hand off work without waiting
for the consumer, decoupling them in time. Three shapes, and choosing between them is the whole
question. A **classic queue** (RabbitMQ/AMQP) fans one message out to *competing consumers* and
drops it once acked. A **log** (Kafka) is an append-only, partitioned, *retained* sequence:
"events in a topic can be read as often as needed — unlike traditional messaging systems, events
are not deleted after consumption," retained "for as long as you want"
([Kafka](https://kafka.apache.org/intro)). **Pub/sub** delivers each message to *every*
subscriber rather than to one consumer of a group.

**(b) When to reach for each.** Reach for a **queue** for task distribution — one job done once
by one of N workers, scaled by adding workers (competing consumers). Reach for a **log** when
multiple independent consumers each need the full stream, when you need to **replay** history
(reprocess, backfill, recover a bad deploy), or when you need partitioned ordering at high
throughput — Kafka's decoupling is "a key design element to achieve the high scalability"
([Kafka](https://kafka.apache.org/intro)). Reach for **pub/sub** for event broadcast /
fan-out.

**(c) The primary trade-off — delivery semantics and ordering.** The three delivery guarantees
are **at-most-once** (fire and forget; may lose messages), **at-least-once** (retry until acked;
may duplicate), and **exactly-once** (DDIA, Ch. 8–9). The senior correction to folklore:
**exactly-once end-to-end is really "effectively once"** — you get at-least-once delivery plus
*idempotent* processing / dedup, not a magic wire guarantee (DDIA, Ch. 11, "exactly-once
execution"). Both primary brokers say so. RabbitMQ: "consumers must be prepared to handle
redeliveries and otherwise be implemented with idempotence in mind," and any unacked delivery
"is automatically requeued" on channel/connection loss — at-least-once, duplicates possible
([RabbitMQ](https://www.rabbitmq.com/docs/confirms)). Kafka's exactly-once is producer-side
**dedup**: the idempotent producer assigns "a unique id (PID)" and a per-partition sequence
number, and the broker "will accept the message iff H(P) < S" — rejecting any retried duplicate
at or below the high-water mark
([Kafka KIP-98 / Idempotent Producer](https://cwiki.apache.org/confluence/display/KAFKA/Idempotent+Producer)).
**Ordering** is likewise narrow: Kafka guarantees only that "any consumer of a given
topic-partition will always read that partition's events in exactly the same order as they were
written" ([Kafka](https://kafka.apache.org/intro)) — order holds *within a partition*, not
across a topic, so a global order means one partition (and no consumer parallelism).

**(d) Cost / failure modes.** You buy decoupling and elasticity and pay in **operational
weight** (a broker cluster to run, monitor, and keep from becoming the new SPOF) and **eventual
consistency** — the reader now sees the world after a lag, so downstream state is temporarily
stale (DDIA, Ch. 11). **Backpressure** is the other cost: a queue that fills faster than it
drains grows unbounded, so consumers must pull at their own pace (Kafka's consumer-pull model
is the natural throttle) and producers must handle a full/slow queue rather than assuming
infinite buffer.

## CDN

**(a) What it is.** A "worldwide network of data centers called edge locations" that caches your
content close to users; a request "is routed to the edge location that provides the lowest
latency," served from cache if present, otherwise CloudFront "retrieves it from an origin"
([AWS CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)).
That miss-then-fetch behaviour is the **pull** model (the CDN lazily pulls from origin on first
request); a **push** CDN, by contrast, is one you upload assets to ahead of time. CloudFront is
a pull CDN; the push/pull taxonomy itself is general (see caveats).

**(b) When to reach for it.** Static and cacheable content served to a geographically spread
audience — "static and dynamic web content, such as .html, .css, .js, and image files"
([CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)).
Also as a shield: an edge tier that absorbs read traffic and volumetric attacks before they
reach your origin.

**(c) The primary trade-off — freshness vs latency/offload, governed by TTL.** Content lives at
the edge for a **TTL**: "By default, each file stays in an edge location for 24 hours before it
expires. The minimum expiration time is 0 seconds; there isn't a maximum"
([CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)).
A long TTL maximises hit rate and origin offload but means viewers can see stale content for up
to the TTL; a short TTL keeps content fresh but pushes traffic back to origin.

**(d) Cost / failure modes — invalidation is the hard part.** To change something before its
TTL expires you either **invalidate** ("the next time a viewer requests the file, CloudFront
returns to the origin to fetch the latest version") or serve a **versioned filename**. AWS
explicitly recommends versioning over invalidation, because with invalidation "the user might
continue to see the old version until it expires from those caches," versioning "is less
expensive," and invalidations are billed beyond the free tier
([CloudFront invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)).
So the real costs are **staleness within the TTL window**, **invalidation complexity/latency**
(you don't control third-party caches downstream), and a **request/data-transfer cost model**.
This is the same freshness-vs-speed trade-off as any cache TTL, just at the edge.

## API design

Keep this at "which default fits" altitude; the three-way comparison has no single canonical
primary (see caveats), so each option is pinned to its own owning source and the *fit* claims
are marked where they rest on secondary framing.

**REST** — a resource-oriented style over HTTP with a "uniform interface" and stateless
interactions, defined in Fielding's dissertation
([Fielding, Ch. 5](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)).
**Reach for it** as the ubiquitous default: universal tooling, cacheable over HTTP, human-
readable; the cost is over-/under-fetching and chatty round-trips for related data.

**gRPC** — "a client application can directly call a method on a server application on a
different machine as if it were a local object," using **Protocol Buffers** as its IDL and
message format, over HTTP/2, with contract-first `.proto` service definitions and polyglot
codegen ([gRPC](https://grpc.io/docs/what-is-grpc/introduction/)). **Reach for it** for
low-latency, high-throughput **internal service-to-service** calls and streaming; the cost is
binary payloads (not browser-native, harder to debug by eye) and a schema/codegen build step.

**GraphQL** — "a query language for your API" where "a GraphQL response contains exactly what a
client asks for and no more," letting clients "fetch lots of related data in one request,
instead of making several roundtrips as one would need in a classic REST architecture," over a
strongly typed schema ([GraphQL](https://graphql.org/learn/introduction/)). **Reach for it**
when diverse clients need differently-shaped data from many resources and you want to kill
over-/under-fetching; the cost is server-side complexity, caching that is harder than
HTTP-native REST, and query-cost/N+1 risks.

**Pagination.** Two idioms. **Offset** (`LIMIT/OFFSET`, page numbers) is simple but drifts and
slows on deep pages as rows shift under you. **Cursor / keyset** is the scalable default:
Stripe's list APIs "use cursor-based pagination through the `starting_after` and `ending_before`
parameters," each "an object ID that defines your place in the list"
([Stripe](https://docs.stripe.com/api/pagination)); Google's AIP-158 uses an opaque
`page_token` / `next_page_token`, and "page tokens provided by APIs must be opaque (but
URL-safe) strings, and must not be user-parseable" so the server keeps implementation freedom
([AIP-158](https://google.aip.dev/158)).

**Versioning** keeps a contract stable as it evolves — URL path (`/v2`), header, or media type;
AIP and Stripe both run explicit versioned surfaces
([Stripe v2 note](https://docs.stripe.com/api/pagination), [AIP-158](https://google.aip.dev/158)).

**Idempotency for safe retries** (pointer only — covered deeply elsewhere in this vault):
RFC 9110 defines an idempotent method as one where "the intended effect on the server of
multiple identical requests is the same as the effect for a single such request" (GET, HEAD,
PUT, DELETE), which is precisely what lets a client safely retry after a connection failure
([RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110)); for non-idempotent POSTs, the
pattern is an **idempotency key** ([Stripe](https://docs.stripe.com/api/idempotent_requests)).

## Dead ends / caveats

- **The REST vs gRPC vs GraphQL "when each fits" comparison has no single canonical primary.**
  Each technology's own docs describe *itself* (Fielding for REST, grpc.io for gRPC, graphql.org
  for GraphQL) and are cited as primary for definitions; the head-to-head *fit* guidance
  (internal vs external, latency vs ubiquity) is synthesised from those primaries and is
  **secondary** as a comparison. No vendor owns the cross-comparison.
- **Push vs pull CDN as a taxonomy is secondary.** CloudFront's *pull* behaviour (fetch from
  origin on miss) is stated first-party; the "push CDN" category as its named opposite is a
  general-industry framing, not a term CloudFront's docs define. The mechanism is primary; the
  two-word taxonomy is folklore-level.
- **Kafka's exactly-once mechanism is pinned to Apache wiki (KIP-98 / Idempotent Producer), not
  the main docs page.** The main single-page Kafka docs render as a JS navigation shell to the
  fetcher, so the "Message Delivery Semantics" section could not be quoted directly; the
  PID + sequence-number dedup claim comes from `cwiki.apache.org`, which is first-party Apache.
  The at-most/at-least/exactly-once framing and "effectively once" are carried by **DDIA**
  (cited as the book).
- **Cloudflare's sliding-window numbers come from their engineering blog**, which is first-party
  Cloudflare but a blog; the WAF docs confirm you can select fixed vs sliding and expose the
  `period`, but the accuracy figures (0.003%, 6%) live only in the blog post.
- **"Exactly-once" is the single biggest folklore trap** and worth stating plainly in the
  selection table: no message broker gives true once-only *delivery*; you get at-least-once plus
  idempotent processing. Both RabbitMQ and Kafka say the application must be idempotent — this
  is a primary-source fact, not an opinion.
