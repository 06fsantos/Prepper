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

The reach-for-it signal: any open-ended "design X" prompt → run the four moves. Asked to open a
box → reach for the [[distributed-systems|theory]] under it. Data too big or too hot for one
machine → partition + replicate on a ring. Two valid-but-different designs → they made different,
defensible assumptions.

Full treatment: [[system-design-is-graded-on-process]].
