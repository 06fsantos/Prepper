---
id: 01M1XXN7JYC56CYE13X3PF98D5
title: System design — cheat sheet
topic: system-design
---

**The round grades process, not architecture.** The prompt is vague on purpose; there is no
answer key. You are scored on how you get to a design, not on matching a reference one. A clean
architecture with no reasoning is a *down-level* signal.

- **The interviewer pushes past every named component** — "what happens *inside* the queue / the
  load balancer / the replica?" That is the test, not a trick. Name a box only if you can open
  it. This is where the [[distributed-systems]] theory earns its keep in an applied round.
- **"No right architecture" is literal, not encouragement.** Every distributed design is a
  trade-off with no universal setting — it follows from [[the-cap-theorem|CAP]] and
  [[pacelc|PACELC]] being impossibility results. A payments ledger and a "who's viewing" counter
  get opposite designs from the same toolbox, both correct.

**The four moves of a strong answer** (in order, revisited as it grows):

1. **Clarify requirements first — before drawing anything.** Split *functional* (what it does)
   from *non-functional* (scale, latency, availability, consistency). State assumptions out loud
   — users, read/write ratio, data size. Guessing is fine; *stating so it can be corrected* is
   the signal.
2. **Estimate the scale.** A [[back-of-envelope-estimation|back-of-envelope]] pass answers one
   binary question — *one machine or many?* — so precision is wasted; reason from magnitude.
   Levers: day ≈ 10⁵ s, so *requests/day ÷ 10⁵ ≈ avg RPS*; size for **peak ≈ 2–3× avg**; bytes
   = things × bytes/thing × retention. Carry latency as **ratios** (memory ≪ network ≪ disk
   seek), never memorized nanoseconds — the absolutes are dated; the ~150 ms cross-continent
   round trip is the durable one, bounded by the speed of light.
3. **Decompose and justify each component.** As you place each [[system-design-building-blocks|building
   block]], say what it buys *and* costs. A box named without its trade-off is just a box.
4. **Make trade-offs explicit across four axes:** scalability, reliability, latency, operational
   complexity. Every choice improves some and costs others — say which.

**The through-line:** operate under ambiguity and defend a trade-off. **Lead with what you give
up**, then the component — never the reverse. State the workload's tolerance for staleness,
downtime, and latency *first*; it unlocks every component choice after it.

**Caching is the most-reached-for block — and never free.** A cache is a fast copy that trades
**freshness for speed**; lead with the trade-off, not the box.

- **Buys:** sub-ms reads, IOPS density (one cache absorbs several DB replicas' read load),
  hot-spot relief. All **read-side** — it pays off only when reads dwarf writes and the same
  keys repeat. The read/write [[back-of-envelope-estimation|estimate]] justifies it *before* it
  is drawn; a write-heavy or all-unique-key workload gets nothing and still pays the price.
- **Price:** staleness. A [[caching-and-ttls|TTL]] sets it — short = fresher + more misses
  (load falls back on the store), long = staler + cheaper. Set it **per data type**, from that
  data's tolerance for being wrong; one global TTL is a down-level tell.
- **It is not an escape from [[the-cap-theorem|CAP]]** — a stale cached read is an everyday
  [[consistency-models|eventual-consistency]] choice: availability and latency over strong
  consistency, one key at a time.
- **Say where it sits:** database/app cache, CDN/edge (the only thing that beats the physics-bound
  ~150 ms cross-continent round trip — move data closer), session store (keeps the serving tier
  stateless), API-response cache. Each answers the same question: *how stale can this be, and how
  do you bound it?*

**CDN: the cache at the edge — same freshness-for-speed trade, moved next to the reader.** The one
block that beats the ~150 ms cross-continent round trip (speed-of-light bound), by serving content
from an edge location near the user; also a shield that absorbs read traffic and attacks before
origin. Reach for it: cacheable content (`.html/.css/.js`, images) to a spread-out audience. Lead
with the trade, then the box. [[content-delivery-networks|Full treatment]]; CloudFront owns the words.

- **Pull vs push.** *Pull* = miss-then-fetch: the edge holds nothing until the first reader, then
  fetches from origin once and caches (CloudFront's model, the low-effort default — first request
  per edge pays the miss). *Push* = you upload assets ahead of time. The pull *mechanism* is
  first-party; the push/pull *labels* are general-industry framing, not CloudFront's own term.
- **TTL is the freshness dial.** Content sits at the edge for a TTL, then the next read misses to
  origin. CloudFront default **24 h** (min 0s, no max). Long → higher hit rate + origin offload but
  staler; short → fresher but more origin traffic. Set it **per content type**; one global TTL is a
  down-level tell.
- **Invalidation vs versioned filenames — the key trade.** To change something before its TTL:
  *invalidate* (edge refetches on next request) — slow to propagate, billed, and **can't reach
  caches you don't own** (a downstream browser/proxy serves the old copy until *its* TTL). Or serve a
  *versioned filename* (`app.a1b2c3.js`, content hash) — a new URL nothing has cached, effective
  everywhere immediately. **AWS recommends versioning over invalidation.** Pairing: long-TTL immutable
  versioned assets + a short-TTL HTML doc pointing at them; invalidation is the rare escape hatch.

**Load balancing: four defensible choices, not a box.** The block that turns "add a machine"
into horizontal scale and a dead box into a non-event — and a single point of failure itself
unless run redundant across zones. Lead with the fork, then the cost. [[load-balancing|Full
treatment]]; AWS ELB and NGINX own the words.

- **Layer (the first fork) — L4 vs L7.** L4 forwards connections by a flow hash over IP/port
  and never reads the request: fast, protocol-blind (TCP/UDP/QUIC), pins a connection to a
  target for life. L7 terminates and parses the request (usually TLS too) to route on **content**
  — path, host header, method. Content routing is the *whole* reason to pay L7's cost.
- **Algorithm.** *Round robin* by default (identical servers, uniform requests; weights for
  uneven boxes). *Least connections* when request **durations vary** — round robin counts
  requests, not work. *IP / consistent hash* only when you deliberately want stickiness to a
  per-key cache; [[partitioning-replication-and-consistent-hashing|ketama]] minimises reshuffle
  on a membership change.
- **The stickiness trap (the senior tell).** A sticky session pins a client to one backend so it
  can keep state in memory. It **breaks even distribution** (the balancer can't steer by load)
  and **turns a server's death into lost sessions**. The fix is not a smarter pin — make the
  service **stateless**, session in a shared [[caching-and-ttls|store]], so any server takes any
  request. A [[real-time-delivery|WebSocket]] is the named exception (one long-lived connection).
- **Health + slow-start.** Routes "only to healthy targets" — only as good as the readiness
  endpoint you own. A recovered box at full weight instantly is swamped into cold caches and
  **flaps**; `slow_start` ramps its weight from 0. Routing cousin of spreading
  [[bulkheads-and-blast-radius|blast radius]].

**Rate limiting: a coarse cap against abuse and overload — pick the algorithm by what it trades.**
Four algorithms trading burst tolerance vs output smoothness vs boundary accuracy; lead with the
trade, then the box. [[rate-limiting|Full treatment]]; AWS, NGINX, Cloudflare and the RFCs own the
words.

- **Token bucket** — refill at `rate`, cap `burst`; a request spends a token. Bounds the *input
  burst* (a full bucket absorbs a spike) while holding the average. AWS API Gateway's model. Reach
  for it for bursty-but-bounded clients.
- **Leaky bucket** — drains at a fixed rate, overflow dropped. Bounds the *output rate* (smooth), to
  shield a fragile downstream. NGINX `limit_req`. The token/leaky fork = tolerate-the-burst vs
  smooth-the-output.
- **Fixed window** — count per interval, reset each window. `O(1)`, one integer; the **boundary
  problem** lets a client run 2× the rate across the seam.
- **Sliding window** — weight previous window by overlap (two numbers/counter). Fixes the seam
  spike; ~0.003% wrongly limited, ~6% rate error. Exact (log-based) costs `O(requests)` memory —
  the fourth trade is **accuracy vs memory**.
- **Response contract:** **429 Too Many Requests** + `Retry-After` (RFC 6585). Trap: NGINX defaults
  to **503**, override `limit_req_status` — 429 is *correct*, not universal. Client only auto-retries
  a 429 on [[idempotency-and-safe-retries|idempotent methods]].
- **Where it sits:** as far toward the edge as the counter can be shared — edge → gateway (per key)
  → per-service [[load-balancing|proxy]]; closest-to-client rejection is cheapest.
- **The honesty:** a distributed limiter **counts approximately** — per-node counters reconcile with
  a few seconds' lag, so excess slips through. Exact means a synchronous shared counter on the hot
  path (a bottleneck). It's a coarse control, not an exact quota — say so.

**Message queues: async middleware — pick the shape, then defend delivery and ordering.** Decouples
producer from consumer in time. Three shapes, and naming which is the first move. Lead with the
guarantee you give up, not the box. [[message-queues|Full treatment]]; Kafka and RabbitMQ own the words.

- **The three shapes.** *Classic queue* (RabbitMQ): one message → competing consumers, dropped on
  ack — task distribution, one job done once by one of N workers, scale by adding workers. *Log*
  (Kafka): append-only, partitioned, **retained** — many consumers each read the full stream, and you
  can **replay** history. *Pub/sub*: each message → *every* subscriber (fan-out). The queue-vs-log
  tell is *what happens after a read* — a queue forgets, a log keeps.
- **"Exactly once" is the folklore trap.** No wire-level exactly-once exists. Three guarantees:
  at-most-once (may lose), **at-least-once** (may duplicate — the default), exactly-once. Real
  exactly-once is **"effectively once"** = at-least-once **+ dedup**. Kafka's is *producer-side*
  dedup (PID + per-partition sequence number rejects retried appends); it does nothing for a consumer
  that crashes after the work and before the offset commit. So design for at-least-once and make the
  consumer [[idempotency-and-safe-retries|idempotent]] (key off a stable message id → duplicate is a
  no-op). Both brokers say the app must be idempotent.
- **Ordering is narrow.** A log orders events only **within a partition, not across a topic**. Order
  per entity → route by a **partition key**. A global total order → a **single partition** → **no
  consumer parallelism**. Need order only per key.
- **Backpressure — the buffer is finite.** Producers outrunning consumers grow the backlog unbounded.
  Consumers **pull at their own pace** (Kafka's throttle; alert on **lag**); a classic queue bounds
  and blocks/rejects/dead-letters producers. Decide what gives when consumers fall behind — never
  assume infinite buffer. Standing costs: a broker cluster to run (a new SPOF if you let it) and
  eventual consistency downstream.

**Event-driven integration: async SOA is queue theory plus four patterns you must name.** Once
several services share a bus, the design turns on integration patterns, not the broker.
[[azure-service-bus-and-event-driven-soa|Full treatment]] (Azure-concrete); Microsoft Learn owns the words.

- **Broker vs log (the service pick).** A *broker* (Azure **Service Bus**, RabbitMQ) carries
  high-value **messages** with a publisher↔consumer contract and forgets each on completion —
  order processing, workflows. A *log* (**Event Hubs**, Kafka) is a retained, partitioned **event
  stream** you can **replay** — telemetry, analytics. Pick by whether anyone re-reads history. Inside a
  broker: **queue** = competing-consumer point-to-point; **topic/subscription** = filtered pub/sub fan-out.
- **At-least-once is the floor, made concrete.** Peek-lock delivery = lock→complete with a **redelivery
  window** on a crash between doing the work and acking → at-least-once. Close it with **dedup on a
  stable message id** + an [[idempotency-and-safe-retries|idempotent]] consumer (the "effectively once"
  of [[message-queues]]). A **dead-letter queue** drains poison messages; **sessions / partition keys**
  give per-entity FIFO without one global queue.
- **The outbox pattern — the load-bearing one.** The **dual-write problem**: you can't atomically
  write a DB *and* publish to a broker, so a crash between them loses the event (or publishes one whose
  row never committed). Fix: write the event to an **outbox** row in the [[transactions-and-acid|same
  transaction]] as the state change; a relay reads the outbox and publishes (at-least-once → dedup +
  idempotent consumer absorb the duplicate). Reordering the two writes never makes them atomic.
- **Saga for cross-service consistency.** No 2PC across microservices — model a business transaction as
  a sequence of **local transactions**, each committing in one service and emitting an event/command;
  failure runs **compensating transactions** (no cross-service rollback). *Choreography* (services react
  to events, no controller — simple, but cyclic-dependency risk) vs *orchestration* (a central
  orchestrator — complex workflows, clear, but a SPOF). **Command** = *do this* (addressed, coupling);
  **event** = *this happened* (fan-out, decoupled) — prefer events.
- **The trade vs synchronous REST:** buys temporal decoupling, load leveling, and
  [[bulkheads-and-blast-radius|failure isolation]] (a dead downstream is a growing queue, not a blocked
  call chain); costs **eventual consistency**, a broker to run as a new SPOF, and the dual-write/ordering/
  duplicate problems a REST call never has. Name both sides.

**Event sourcing + CQRS: store the changes, not the state — and split reads from writes.** Two
separate patterns taught as one; a per-sub-domain choice, never a top-level architecture.
[[event-sourcing-and-cqrs|Full treatment]]; Microsoft Learn and Fowler own the words.

- **Event sourcing.** Persist an **append-only, immutable stream of events** per entity as the
  source of truth; derive current state by **replaying** the stream (*rehydration*). **Materialized
  views** (projections) serve queries; **snapshots** shortcut long replays (an optimization, not a
  new source of truth). Buys an **audit trail** + contention-free append-only writes; costs ad-hoc
  querying and easy edits.
- **CQRS.** Separate the **write model** (*commands* = business intent + validation) from the
  **read model** (*queries* = DTOs, no domain logic). One store = clarity, no consistency cost;
  **separate stores** = independent read/write scaling but now a
  [[azure-service-bus-and-event-driven-soa#The dual-write problem, and why the outbox pattern exists|dual-write]]
  synced via **outbox + [[idempotency-and-safe-retries|idempotent]] consumer**.
- **They pair** because the event store is a natural write model and projections a natural read
  model — so you can **replay history to rebuild any view** (or a new one). Distinct, though: CQRS
  needs no events, event sourcing needs no CQRS.
- **The bill:** [[consistency-models|eventual consistency]] on the read side ([[pacelc|PACELC]]
  else-latency), **no SQL over events**, immutable history (correct with a **compensating event**,
  evolve schema with **upcasters**), and **idempotent** handlers because replay is at-least-once —
  a replay that isn't a no-op fires side effects twice.
- **Reach for it** where the history *is* the requirement — a payment ledger, order pipeline, or a
  reinsurance treaty book; **walk away** for plain CRUD, prototypes, or views that must be
  real-time consistent. Scope it to the sub-domain, keep [[transactions-and-acid|CRUD]] elsewhere.

**Modernizing a monolith: a risk-management problem — strangle, don't rewrite.** The "go
microservices" prompt is really a *migration* prompt: change the shape while the business keeps
running. Lead with the risk you're managing. [[monolith-to-microservices-modernization|Full
treatment]]; Fowler and Sam Newman own the words.

- **No big-bang rewrite.** The monolith is a *moving target* — the business keeps changing it, so a
  rewrite ships **zero value until one risky flag-day cutover** and can't be validated cheaply first.
- **Strangler fig** = grow the new system around the old. A **routing facade** (proxy / gateway) in
  front of the monolith sends each capability's traffic to a new service as it's ready; extract one
  capability, flip the router, verify, delete the dead path, repeat. Every step **small, shippable,
  reversible** (route back to the monolith, which is still there) — and the router is where you
  **measure** old vs new.
- **Cut along [[bounded-context|bounded contexts]]** (business capability, not technical layers).
  The real coupling is the **shared database** — each service must own its data (hardest, riskiest
  part); an **anti-corruption layer** translates between the two models while they coexist so the
  legacy model doesn't leak. Sequence by **business value** — move what's changing/blocking first.
- **The tax, and the exit.** Every split turns a method call into a network hop → the whole
  [[the-eight-fallacies-of-distributed-computing|eight fallacies]] + lost strong consistency (sagas +
  [[idempotency-and-safe-retries|idempotent]] handlers instead of a join). So **don't split what
  doesn't need it**: a **modular monolith** (clean module boundaries, one deployable) is a valid
  destination. Fowler's **MonolithFirst** — you don't know the boundaries until the domain teaches
  them. Independent deployability is the prize; distribution is the price, paid only where earned.

**API design: the contract shape is a choice with a cost — four decisions, not "expose a REST API."**
Four forks, each defended by its axis. Lead with what you optimised. [[api-design|Full treatment]];
Fielding, gRPC, GraphQL, Stripe and AIP own the words.

- **Style — three axes, pick one.** *REST* buys **ubiquity** (universal tooling, HTTP caching free,
  human-readable) — the public default; costs over-/under-fetching and chatty round-trips. *gRPC*
  buys **efficiency** (binary Protobuf over HTTP/2, streaming) — the **internal** service-to-service
  pick; costs a schema/codegen step and is not browser-native. *GraphQL* buys **client-shaped
  fetches** (a response is exactly what the client asked for) — diverse clients, differently-shaped
  data; costs server complexity, harder caching, N+1 risk. No style gets all three; the head-to-head
  *fit* is engineering judgement, the definitions are first-party.
- **Pagination — cursor beats offset at scale.** *Offset* (`LIMIT/OFFSET`, page numbers) **drifts**
  (an insert/delete shifts every later page) and **slows on deep pages** (walks and discards skipped
  rows). *Cursor/keyset* pages relative to an **opaque token** (Stripe's `starting_after` object id;
  AIP-158's user-unparseable `page_token`) — an indexed seek, stable under edits. Give up: random
  access (no jump-to-page-50). Offset only earns its keep for numbered-page UIs.
- **Versioning — additive is free, breaking takes a version.** New optional field / new endpoint =
  backwards-compatible, no new version. Remove / rename / change meaning = breaking, take a new
  version (URL path `/v2`, header, or media type). Run both at once, migrate clients, retire the
  empty one. The discipline is deciding which kind of change you are shipping *before* you ship it.
- **Idempotency keys — make a `POST` safe to retry.** `GET/PUT/DELETE` are idempotent; `POST` is
  not, and is where the duplicate hurts most (a double charge). Client mints one key **per logical
  operation** (`Idempotency-Key` header), server stores key→first-result and replays it on a repeat.
  Two traps: mint it *inside* the retry loop (fresh key per attempt = plain duplicate) or reuse one
  key across two real charges (second swallowed). It is the API's own contract — nothing in HTTP or
  the resilience library does it for you. This is [[idempotency-and-safe-retries|the same idempotency]]
  that makes a retry safe at all.

**Real-time delivery: how fresh data reaches an open client — one axis, pull vs push.** The
"design a news feed / chat" prompt turns on this. Polling is **pull** (pays in wasted requests +
latency); SSE and WebSockets are **push** (pay in a held-open connection per client — state the
app tier would rather not carry). Pick the least machinery for the traffic's *direction* and
*frequency*, then lead with the cost.

- **Short polling** — ask on a timer. Simplest, no protocol; wasteful (mostly-empty answers) and
  laggy (worst case = the interval). Rare updates, seconds of staleness OK.
- **Long polling** — server holds the request open until there is news, then the client re-asks.
  Push's latency over pull's compatibility; costs a parked request per client, plus reconnect churn.
- **SSE** (`text/event-stream`, browser `EventSource`, auto-reconnect) — **one-way** server→client
  over a kept-open HTTP response. The right size for a feed / notifications; no return channel.
- **WebSocket** (`Upgrade` off HTTP, RFC 6455) — **full-duplex**, either side sends anytime. Chat,
  games, collaboration. Heaviest to operate: sticky [[load-balancing|routing]], you build reconnect
  + missed-message recovery, N open sockets to size for.
- Direction (1-way vs 2-way) and pull-vs-push cost are **structural**; *which* fits a given feed is
  engineering judgement. Behind the last hop sits fan-out (a [[message-queues|queue]]); none of these
  streams is CDN-cacheable — being uncacheably fresh is the job. Full treatment: [[real-time-delivery]].

**Choosing the datastore: read the workload, not "SQL vs NoSQL."** No default store; five data
models, each built for one workload shape and paying for it elsewhere. Signals that decide it:
access pattern, query shape, consistency need, scale/write pattern, how connected the data is.
[[choosing-a-datastore|Full fork]]; DDIA is the book.

- **Relational** — ad-hoc queries, joins, many-to-many, [[transactions-and-acid|ACID]]. The safe
  pick when access patterns are *unknown or changing* (the optimizer plans any query at run time).
  Give up: easy horizontal scale.
- **Document** — a self-contained aggregate read whole by id, schema that moves. Give up: joins /
  many-to-many.
- **Key-value** — point lookup by key at extreme scale (session, cache). Give up: any non-key query.
- **Wide-column** — one *fixed* query at huge write throughput, denormalized. Give up: flexibility.
- **Graph** — when traversing the relationships *is* the query. Give up: bulk scans, easy sharding.
- **Consistency, honestly:** "SQL strong / NoSQL eventual" is a starting heuristic modern *tunable*
  stores have blurred — reach for [[pacelc|PACELC]] (what under a partition, what when healthy), not
  "pick two." Which store fits is *engineering judgement*; the graded thing is the defence.

**Scaling the data: partition for capacity, replicate for survival.** Two different moves — keep
them separate. [[partitioning-replication-and-consistent-hashing|Dynamo]] is the blueprint (under
Cassandra, Riak, DynamoDB) and the concrete face of the [[the-cap-theorem|AP]] choice.

- **Partition (shard)** to spread data over machines — capacity + throughput. **Never `hash(key)
  % N`:** changing `N` remaps almost every key. **Consistent hashing** puts keys and machines on
  a ring; a join/leave moves only that node's ~`1/N` share. **Virtual nodes** even out the arcs.
- **Replicate** each key onto the next `N` machines clockwise (the *preference list*, `N ≈ 3`) so
  a dead machine loses nothing.
- **Under failure, stay writable and let replicas diverge (AP)**, then reconcile by **versioning
  + application merge** (Dynamo merges carts — never lock, that kills the availability you built for).
- **Quorum dial — the one line of arithmetic:** `W` acks per write, `R` replicas per read;
  **`W + R > N` ⇒ a read sees the latest write** (the sets overlap). `≤ N` trades that for speed
  and availability. High `W`/low `R` = read-cheap; the [[back-of-envelope-estimation|estimate]]
  says which way to lean.

**Availability is composed, not quoted — count in nines.** The
[[availability-and-the-nines|uptime axis]] is the estimation cousin of the throughput one: state
the target, then *derive* whether the design hits it. Turn nines into a downtime budget first —
**99.9% ≈ 44 min/month, 99.99% ≈ 4 min, 99.999% ≈ 26 s** — so you know if the ask is careful code
or automated failover. Each nine costs ~10× more; the target is a requirement to negotiate, not a
virtue to max.

- **Series multiply — every dependency is a tax.** A request crossing components that must *all*
  be up has availability `A₁ × A₂ × …`, always **below the weakest link**. Three hops at 99.9% →
  ~99.7%. Your SLA ceiling is the product of what you depend on.
- **Parallel compounds — redundancy buys nines back.** `n` copies where *one* suffices →
  `1 − (1 − a)ⁿ`. Two servers at 99% → 99.99%. This is why
  [[partitioning-replication-and-consistent-hashing|replication]] exists; the preference list is
  this formula.
- **The trap is independence.** Parallel only earns its nines if copies fail separately — same
  rack, AZ, power feed, or a shared bad deploy is one **failure domain**, and the redundancy buys
  nothing against it. Spread across domains ([[bulkheads-and-blast-radius|blast radius]], for
  uptime). A shared downstream DB is a *series* term no parallel app tier removes.
- **Not the same as CAP's A.** This is a % of uptime; [[the-cap-theorem|CAP]] availability is the
  binary "every request gets a response." They share a word. When asked for a *number*, they mean
  the nines.

**Observability is how you show the design works — the move after the last box.** State it as
process, not tooling: measure, promise, page.

- **Three telemetry types, three jobs:** *metrics* (cheap aggregates — say something is wrong),
  *traces* (one request across services — say where), *logs* (discrete events — say what). Alert
  on the metric, drill into the trace, read the log. [[distributed-tracing|Tracing]] is the
  correlation half; this is the picture it sits in.
- **SLI → SLO → SLA:** an *indicator* is the measure (latency, error rate); an *objective* is the
  target on it ("99% under 100 ms"); an *agreement* adds a **consequence** (a refund) — no
  consequence means it is only an SLO. Keep the internal objective **tighter** than the promised
  agreement, and **never target 100%**: the gap to perfect is the **error budget** you spend on
  shipping. Same order-of-magnitude-per-nine economics as the [[availability-and-the-nines|nines]].
- **The four golden signals** — the four things to measure when you cannot measure everything:
  **latency** (split success from failure — a slow error hides in a blended average), **traffic**
  (demand), **errors** (explicit, implicit, or by policy), **saturation** (how full the tightest
  resource is; a *leading* indicator — latency rises before the resource maxes out).
- **Alert on symptoms, not causes** — page on golden signals / SLO breaches, because those fire
  only when a user is actually affected; leave CPU, replica lag, cache-hit ratio on a dashboard you
  open *after* the page. Same instinct as spreading redundancy across
  [[bulkheads-and-blast-radius|failure domains]]: defend the effect, not an enumerated trigger list.

Full treatment: [[metrics-logs-and-the-golden-signals]].

The reach-for-it signal: any open-ended "design X" prompt → run the four moves. Asked to open a
box → reach for the [[distributed-systems|theory]] under it. Data too big or too hot for one
machine → partition + replicate on a ring. "How do you know it's healthy?" → golden signals paged
against SLOs. Two valid-but-different designs → they made different, defensible assumptions.

Full treatment: [[system-design-is-graded-on-process]].
