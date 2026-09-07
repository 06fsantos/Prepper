---
id: 01M1XZBSYAREPHMK12KQGD9DM9
title: System-design building blocks
topic:
  - system-design
---

The components a design round expects you to **select and justify**, not recite. Each is a
decision with a named cost, so the entry for each is *what it is*, *the fork inside it*, and
*what you give up* — read it to defend a choice, not to implement one. The round is
[[system-design-is-graded-on-process|graded on process]]: naming a component earns nothing;
saying what you bought and what you paid is the signal.

Three of these sit on theory that has its own notes — reach through to
[[the-cap-theorem]], [[consistency-models]],
[[partitioning-replication-and-consistent-hashing]], [[caching-and-ttls]] and
[[idempotency-and-safe-retries]] rather than re-deriving them here.

## At a glance

| Block           | What it is                                     | The primary trade-off                            | Reach for it when                                   |
| --------------- | ---------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| Load balancer   | A tier that spreads traffic over healthy nodes | L4 speed/protocol-agnostic **vs** L7 content-awareness | You have more than one instance of a service   |
| Rate limiter    | A cap on request rate from a source            | Burst tolerance **vs** smooth output rate        | Protecting fair use or shedding overload/DoS        |
| Message queue   | Async middleware decoupling producer/consumer  | Delivery/ordering guarantees **vs** simplicity   | Work can be done later, or consumers scale separately |
| CDN             | Edge cache close to users                      | Freshness **vs** latency & origin offload (the TTL) | Cacheable content served to a spread-out audience |
| API style       | The contract shape between client and server   | Ubiquity **vs** efficiency **vs** client-shaped fetches | Choosing REST / gRPC / GraphQL for a new surface |

## Load balancing

The fork is the OSI layer. An **L4 (transport)** balancer works "at the fourth layer," picking a
target by a flow hash over IP/port and pinning each TCP connection to it for life — it never
reads the request
([AWS NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html)).
An **L7 (application)** balancer works "at the seventh layer" and routes on request content —
host header, URL path, method
([AWS ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)).

| Pick    | When                                                          | Because                                                  |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| **L4**  | Raw throughput, non-HTTP protocols (TCP/UDP/QUIC), static IPs | Forwards without decoding, so it is faster and protocol-blind |
| **L7**  | Path/host routing, header rules, per-request retries, TLS termination | Must terminate and parse the request to route on content |

**Algorithms** (NGINX names them verbatim): round robin (weighted-even), least connections (to
the server with fewest active), IP hash (sticky by client IP), and a generic hash with
`consistent` for ketama consistent hashing — the one that minimises reshuffling when the server
set changes ([NGINX](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)).

**Cost.** A tier you must make redundant (AWS spreads nodes across AZs and pulls a zone's IP
from DNS when it has no healthy target). **Health checks** are load-bearing and imperfect — a
recovered node needs a `slow_start` ramp or it is swamped the instant it returns
([NGINX](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)). The
senior trap is **session stickiness**: pinning a client to one backend breaks even distribution
and turns that backend's death into lost sessions — the real fix is a stateless service, so any
algorithm works.

## Rate limiting

Four algorithms, each a real primary implementation:

| Algorithm            | Behaviour                                                     | Buys you                        | Costs                              |
| -------------------- | ------------------------------------------------------------ | ------------------------------- | ---------------------------------- |
| **Token bucket**     | Tokens refill at `rate`; a request spends one; bucket cap = `burst` | Bounded burst tolerance   | Tune two knobs                     |
| **Leaky bucket**     | Requests leak out at a fixed rate; overflow discarded        | A smooth *output* rate          | No bursts through to a fragile downstream |
| **Fixed window**     | Count per fixed interval, reset each window                  | O(1), trivial memory            | Boundary problem — 2× at the seam  |
| **Sliding window**   | Weight previous + current window by elapsed time             | Smooths the boundary spike      | A second counter (log-based = exact but O(requests)) |

Token bucket is AWS API Gateway's model; leaky bucket is NGINX's `limit_req`; the sliding-window
counter is Cloudflare's "two numbers per counter" (≈0.003% wrongly limited, ≈6% rate error)
([AWS API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html),
[NGINX](https://blog.nginx.org/blog/rate-limiting-nginx),
[Cloudflare](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)).

**Where it sits.** Push it as far toward the edge as the counter can be shared — edge (per data
centre) → API gateway (per key/method) → per-service proxy. The closer to the client, the
cheaper the rejection.

**The response contract** is HTTP **429 Too Many Requests**, which MAY carry a `Retry-After`
([RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585)). Folklore trap: NGINX defaults to **503**,
overridable via `limit_req_status` — 429 is *correct*, not universal. A distributed limiter also
has a propagation lag, so a little excess slips through before the counter updates
([Cloudflare WAF](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/)).

## Message queues

Three shapes, and choosing between them is the whole question:

| Shape                    | Delivery model                          | Reach for it when                                         |
| ------------------------ | --------------------------------------- | --------------------------------------------------------- |
| **Classic queue** (RabbitMQ) | One message → competing consumers, dropped on ack | Task distribution: one job done once by one of N workers |
| **Log** (Kafka)          | Append-only, partitioned, *retained*    | Multiple consumers need the full stream; you need **replay**; partitioned ordering at throughput |
| **Pub/sub**              | Each message → *every* subscriber       | Event broadcast / fan-out                                 |

A log keeps events "as often as needed — unlike traditional messaging systems, events are not
deleted after consumption" ([Kafka](https://kafka.apache.org/intro)).

**Delivery semantics — the trade-off, and the biggest folklore trap.** Three guarantees:
**at-most-once** (may lose), **at-least-once** (may duplicate), **exactly-once**. The senior
correction: **exactly-once end-to-end is really "effectively once"** — at-least-once delivery
*plus* idempotent processing / dedup, never a wire guarantee. Both brokers say the application
must be idempotent: RabbitMQ requeues any unacked delivery and tells consumers to be
"implemented with idempotence in mind" ([RabbitMQ](https://www.rabbitmq.com/docs/confirms));
Kafka's exactly-once is producer-side dedup — a PID plus a per-partition sequence number the
broker uses to reject retried duplicates
([Kafka KIP-98](https://cwiki.apache.org/confluence/display/KAFKA/Idempotent+Producer)). This is
[[idempotency-and-safe-retries|the same idempotency]] that makes HTTP retries safe.

**Ordering is narrow.** Kafka orders events only *within a partition*, "not across a topic"
([Kafka](https://kafka.apache.org/intro)) — a global order means one partition, and no consumer
parallelism. **Cost:** a broker cluster to run (a new SPOF if you let it), eventual consistency
downstream, and **backpressure** — a queue filling faster than it drains grows unbounded, so
consumers pull at their own pace and producers must handle a full queue.

## CDN

A network of edge locations that caches content close to users; a request is routed to the
lowest-latency edge and served from cache, else fetched from origin
([AWS CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)).
That miss-then-fetch is the **pull** model (lazy fetch on first request); a **push** CDN is one
you upload to ahead of time. Reach for it for cacheable content served to a spread-out audience,
and as a shield that absorbs read traffic and volumetric attacks before they reach origin.

**The trade-off is [[caching-and-ttls|freshness vs speed]], governed by the TTL** — CloudFront
defaults to a 24-hour edge TTL (min 0s, no max). Long TTL → higher hit rate and origin offload,
but viewers see stale content for up to the TTL; short TTL → fresher, but more origin traffic.

**Invalidation is the hard part.** To change something before its TTL you either **invalidate**
or serve a **versioned filename** — AWS recommends versioning, because after an invalidation "the
user might continue to see the old version until it expires," versioning "is less expensive," and
invalidations are billed beyond the free tier
([CloudFront invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)).
Costs: staleness within the TTL, invalidation latency/complexity (you don't control downstream
caches), and a request/data-transfer bill.

## API design

Three defaults, each pinned to its owning source; the *fit* guidance is a synthesis, not one
vendor's claim.

| Style       | What it is                                                   | Reach for it when                                    | Costs                                        |
| ----------- | ----------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| **REST**    | Resource-oriented, stateless, uniform interface over HTTP ([Fielding](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)) | The ubiquitous public default — universal tooling, HTTP-cacheable | Over-/under-fetching; chatty round-trips     |
| **gRPC**    | Call a remote method "as if it were a local object"; Protobuf IDL over HTTP/2 ([gRPC](https://grpc.io/docs/what-is-grpc/introduction/)) | Low-latency **internal** service-to-service and streaming | Binary (not browser-native); schema/codegen build |
| **GraphQL** | "A response contains exactly what a client asks for," one request for related data ([GraphQL](https://graphql.org/learn/introduction/)) | Diverse clients need differently-shaped data from many resources | Server complexity; caching harder than REST; N+1 risk |

**Pagination.** **Offset** (`LIMIT/OFFSET`, page numbers) is simple but drifts and slows on deep
pages as rows shift. **Cursor / keyset** is the scalable default — Stripe's `starting_after` /
`ending_before` object-ID cursors ([Stripe](https://docs.stripe.com/api/pagination)), or an
opaque `page_token` that "must not be user-parseable" so the server keeps freedom
([AIP-158](https://google.aip.dev/158)).

**Versioning** keeps a contract stable as it evolves — URL path (`/v2`), header, or media type.

**Idempotency** (see [[idempotency-and-safe-retries]]) is what makes a retry safe: RFC 9110
defines an idempotent method as one where "the intended effect... of multiple identical requests
is the same as... a single such request" (GET, HEAD, PUT, DELETE)
([RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110)); for non-idempotent POSTs, pass an
**idempotency key** ([Stripe](https://docs.stripe.com/api/idempotent_requests)).
