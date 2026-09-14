---
id: 01M1YK1D783EAD7WRFPBD3MWVH
title: A reading order for the system-design round
topic:
  - system-design
  - distributed-systems
  - engineering-levels
---

Everything the vault holds for the 45-minute design round, in the order that makes each note land — what
the interviewer is actually grading, then the theorems that decide what a design can and cannot promise,
then the applied moves and building blocks that spend those theorems on a real prompt. The vault carries
no reading order of its own: `prerequisites` is a graph and there are no lesson numbers. This is one path
through that graph, and where a note disagrees with this page the note wins.

Two things are worth noticing before starting. **The frame comes first and is not about system design at
all** — it is [[what-senior-means-as-a-level]], because the same "design a URL shortener" prompt is handed
to a mid-level candidate and graded against a different bar, and the whole of the applied phase is written
to that bar. **And the theory is read before the craft, not after** — the CAP theorem and consistency
models are not advanced topics you graduate to; they are the vocabulary the applied Lessons reach back
into the moment a design has more than one copy of the data. Step 12 is unreadable without steps 2 and 4,
so they are read first.

The other thing to notice is what this path is *not*: **there is no .NET in it.** Every step is a concept,
and that is the reverse of the vault's database and concurrency reading orders, which are mostly about one
runtime. That is said plainly at the foot of this page rather than left as a surprise.

## The order

| #  | Read | Why here |
|----|------|----------|
| 1  | [[what-senior-means-as-a-level]] | The master lens. Design is graded on scope and ownership of ambiguity, not on the diagram — so this is read before anything about system design, and every note below assumes it. The vault records it as the prerequisite for the root of the applied phase (step 7) |
| 2  | [[the-cap-theorem]] | The root of the theory: under a partition you keep answering *or* you keep agreeing, never both. Read second because the three notes after it and the last applied note all record it as their prerequisite — it is the thing they are all a consequence of |
| 3  | [[pacelc]] | CAP's blind spot closed: even with a healthy network a replicated system trades latency against consistency all the time. Read straight after CAP because it is the same choice extended to the 99.9% of the time there is no partition, and it prerequisites CAP for exactly that reason |
| 4  | [[consistency-models]] | The spectrum from strong to eventual, and why eventual is a *choice* rather than broken strong consistency. Read after CAP (which it prerequisites) and before the applied phase, because step 10 reconciles replicas against this vocabulary and step 9 trades on it every time it names a stale read |
| 5  | [[consensus-with-raft]] | How a cluster keeps one authoritative copy: it votes. This is the mechanism under the *strong* end of step 4's spectrum, so it is read after consistency models — a leader election is only interesting once you know what strong consistency costs and why a system would still pay for it |
| 6  | [[the-eight-fallacies-of-distributed-computing]] | The checklist of assumptions a single-machine program carries into a network, every one of them false. Last in the theory run because it is not a theorem to prove but a lens to carry into the applied phase — naming which fallacy a component leans on is a large part of the design conversation itself |
| 7  | [[system-design-is-graded-on-process]] | The applied phase opens here, and it is the note that says there is no answer key: decompose the vague prompt, pin the requirements, name each trade-off. It prerequisites step 1 and is the prerequisite the vault records for steps 8 and 10 — everything applied hangs off it |
| 8  | [[back-of-envelope-estimation]] | The number that unlocks a decision — requests per second, storage a year, one database or several — reasoned from ratios and method rather than a decade-old latency table. Read after step 7 because an estimate is worthless until you know which decision it is being spent on |
| 9  | [[availability-and-the-nines]] | The estimation cousin of step 8, on the uptime axis: state a nines target, turn it into a downtime budget, then *derive* whether the design hits it — series multiplies, parallel compounds, and independence is the trap. Read straight after the throughput estimate because it is the same move, reason from a number, and it records step 8 as its prerequisite for that reason |
| 10 | [[caching-and-ttls]] | The single most reached-for component, and the discipline of leading with its cost — a cache buys read speed with staleness. It prerequisites steps 7 and 8 because "add a cache" is only a defensible move once you can estimate the read load it relieves and name the freshness you are trading |
| 11 | [[content-delivery-networks]] | The cache moved to the edge: the same freshness-for-speed trade as step 10, next to the reader, and the one block that beats the ~150 ms cross-continent round trip. Read straight after caching because it *is* caching at a different distance — the pull/push and invalidation-vs-versioning forks only land once the TTL trade does |
| 12 | [[partitioning-replication-and-consistent-hashing]] | The capstone of the theory: splitting data for capacity and copying it for survival, reconciled with the Dynamo blueprint. It is where the theory is finally spent — it prerequisites both CAP (step 2) and consistency models (step 4), and it is unreadable without them |
| 13 | [[choosing-a-datastore]] | Which of five data models to reach for, read as the *workload signal* that picks each rather than "SQL vs NoSQL". Placed by partitioning because the store you choose decides how it splits, and it records consistency models (step 4) as its prerequisite — the consistency need is one of the signals |
| 14 | [[load-balancing]] | The first of the building blocks (steps 14–17), the selection surface the round expects you to reach into and *justify* — each now a Lesson of its own, not a row to look up. L4 vs L7, the algorithm fork, and the session-stickiness trap whose real fix is a stateless service |
| 15 | [[rate-limiting]] | Token / leaky / fixed / sliding-window, the **429 + `Retry-After`** contract, and the honest admission that a distributed limiter counts approximately. One of the two blocks the worked Problems below drill directly |
| 16 | [[message-queues]] | Classic queue vs log vs pub/sub, "effectively once" in place of exactly-once, per-partition ordering and backpressure. Reaches back into [[idempotency-and-safe-retries|idempotency]] for the at-least-once default every broker leaves you to handle |
| 17 | [[api-design]] | REST / gRPC / GraphQL, cursor vs offset pagination, versioning, and idempotency keys. It records `http-resilience` as its prerequisite, because the idempotency-key contract here is the same one that makes a retry safe |
| 18 | [[real-time-delivery]] | How fresh data reaches an open client — polling / long-polling / SSE / WebSockets, one axis of pull vs push. The vocabulary the "design a news feed / chat" prompt turns on, and an applied move rather than a theorem |
| 19 | [[metrics-logs-and-the-golden-signals]] | Observability as the move *after* the last box: metrics / logs / traces, SLI→SLO→SLA, the four golden signals, and alert-on-symptoms. It reads last because it is how you show the design works, and you cannot instrument a design you have not yet drawn |

Steps 1 and 7 are the frame and can be read as a pair on their own; together they *are* the answer to "how
is this round graded". Steps 2–6 are one sitting of theory and are the run most likely to be pushed on with
"what happens under a partition" or "is that strongly consistent". Steps 7–13 are the applied spine, and
8–13 are best read close together: they are the moves a real design applies in order — estimate throughput
and then uptime, relieve reads at the store and then at the edge, split the data and then pick what is being
split. Steps 14–17 are the **building blocks**, the components a prompt asks you to place and defend; read
them as a cluster and return to any one when a prompt reaches for it. Steps 18–19 are the two applied moves
that close a design out: how fresh data leaves the system, and how you prove it is healthy.

## The scan-grid companion

- [[system-design-building-blocks]] — the same five blocks steps 14–17 teach (load balancing, rate limiting,
  message queues, CDNs, API design), collapsed into one comparison table with the primary source pinned to
  each row. It is not a step in the path any more — the blocks are Lessons now — but it is the fastest way to
  re-scan the whole selection surface at once, so keep it for the night before rather than the fortnight.

## Practice checkpoint

Unlike the coding path, this round is a **spoken conversation, not a solved artifact** — but the vault now
carries two worked end-to-end walkthroughs to imitate before you improvise. After step 13, read
[[design-a-url-shortener]] and [[design-a-rate-limiter]]. They are not answer keys — there is no such thing
here — but the four moves run to completion on a real prompt: requirements pinned, scale estimated,
components placed with the trade-off named, and consistency spent out loud. They are wired into the path:
`design-a-rate-limiter` drills step 15 directly, and `design-a-url-shortener` spends steps 8, 10 and 12 on
one prompt.

Then close the book and run the *next* prompt aloud, timed to the full 45 minutes: take one step 7 names that
you have **not** just read — *design a news feed*, *design a chat system* — state the requirements and
assumptions first, size it with a back-of-envelope estimate, and only then draw components, naming the
trade-off each one buys and defending where you put consistency and where you gave it up. Re-run it at scale:
add the read load that forces a cache and a CDN, then the data volume that forces a partition. If you go
quiet, that is the [[what-senior-means-as-a-level|mission's]] named failure mode surfacing, and it is exactly
what the rehearsal is for.

## There is no .NET-specific half

Unlike the vault's database, concurrency and C#-fundamentals reading orders — which are mostly about one
runtime — **every step here is a concept and none of it is scoped to a language or a product.** The theorems
are the field's, the estimation method is arithmetic, and the applied moves are architecture. So the caveat
those other plans carry does not apply, and none of this needs to be re-learned for an interview in another
stack.

What the applied ideas look like in real named systems, so the theory has somewhere to land:

| The idea | Where you meet it in production |
|---|---|
| CAP / PACELC as a dial | DynamoDB and Cassandra expose it directly — tunable consistency per request (`ONE`, `QUORUM`, `ALL`); a spanner-class store (Google Spanner, CockroachDB) sits at the CP-and-low-latency corner by spending on synchronised clocks |
| Consistency models | DynamoDB offers eventually-consistent reads by default and strongly-consistent reads as an option; Cassandra's `LOCAL_QUORUM` is session-ish consistency chosen for latency; a single-leader SQL replica set is strong at the leader and eventual at the read replicas |
| Consensus (Raft/Paxos) | etcd and Consul are Raft; ZooKeeper is ZAB; Spanner and Chubby are Paxos. Any time a system has a "leader" it elected without a human, this is the machinery |
| Caching and TTLs | Redis and Memcached for the in-memory tier; a CDN (CloudFront, Fastly, Cloudflare) for the edge tier; HTTP `Cache-Control`/`max-age` for the response tier — the same freshness-for-speed trade at three distances from the reader |
| Partitioning + replication + consistent hashing | The Dynamo lineage (DynamoDB, Cassandra, Riak) is the textbook case; Kafka partitions a topic and replicates each partition; a sharded PostgreSQL or Vitess-fronted MySQL does the same split by hand |

The two claims that survive any stack: **under a partition you are choosing consistency or availability whether
you name it or not**, and **a cache and a replica both buy speed or survival with staleness** — so the design
answer is never "add the box", it is "add the box, and here is the freshness I am trading for it".

## The night before

[[engineering-levels-cheat-sheet]], [[distributed-systems-cheat-sheet]] and [[system-design-cheat-sheet]].
A reading order is for the fortnight before; a cheat sheet is for the morning of.
