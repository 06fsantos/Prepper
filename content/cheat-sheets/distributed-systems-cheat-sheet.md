---
id: 01M1XVE1FVFME7X5B774Y7MQFZ
title: Distributed systems — cheat sheet
topic: distributed-systems
---

**CAP — what a partition forces.** Proven, not folklore: Brewer's conjecture (PODC 2000),
proved by Gilbert & Lynch (2002). Under a network **partition** you get consistency *or*
availability, not both.

- The words are narrow: **C** = linearizability (one up-to-date copy; reads see the latest write
  — *not* ACID's C). **A** = every non-failing node returns a non-error response. **P** = keeps
  working despite arbitrary message loss between nodes.
- "Pick two of three" is wrong — partitions are inevitable, so P is not a real choice. The
  decision is binary and happens *during* a partition:
  - **CP** — stay consistent, stop serving on the disconnected side (money, stock, uniqueness).
  - **AP** — stay available everywhere, let replicas diverge, reconcile later (feeds, counters).
- Fine print: absolute in the *asynchronous* model (no clocks); the *partially-synchronous* model
  (timeouts) still can't beat it but can offer weaker guarantees.

**PACELC — the clause CAP forgot.** CAP is silent when the network is healthy, and that is where
a system spends its life. **If Partition → A vs C; Else → Latency vs C.**

- The *else* branch exists because a strong-consistency read costs **coordination** (quorum
  round-trips, or routing through a leader) even with no fault — that latency is the price of
  freshness. Relax it and reads come from the nearest replica: faster, possibly stale.
- The two branches are **independent**, so a design's honest stance is a *pair*: **PA/EL**
  (Dynamo-style), **PC/EC** (quorum/leader, correctness-first), and the blends PA/EC and PC/EL.
- Two stores can share the same CAP "AP" label and differ sharply in the *else* branch — PACELC
  is how you make that tail-latency difference sayable.

**Consistency models — the label on the dial.** Not "strong vs broken"; a spectrum, and eventual
is a *choice* that buys availability and latency, not degraded strong consistency (Vogels).

- **Strong** — after a write completes, any client's next read sees it. One answer, seen at once.
- **Eventual** — if writes stop, replicas *converge* within an **inconsistency window** (usually
  ms). You gave up *when*, not *whether*.
- The useful middle (client-centric): **read-your-writes** (never see a value older than your own
  write — profile edits), **monotonic read** (time never runs backwards for a reader), **monotonic
  write** (your writes serialise in order), **causal** (related reads stay ordered), **session**
  (read-your-writes scoped to a session — the practical sweet spot).
- **The formula: N, W, R.** N replicas, W write-acks, R read-consults. **W + R > N** → read and
  write sets must overlap → strong (quorum) consistency. **W + R ≤ N** → they can miss → eventual.
  `W=N` durable/slow writes; `R=1` fast reads; `N=2,W=2,R=1` sync replication, `N=2,W=1,R=1` async.

**Consensus (Raft) — the machinery under the CP choice.** How a cluster agrees on one ordered log
of changes despite crashes and a lossy network. Raft = **Paxos-equivalent in fault-tolerance and
performance, decomposed to be understandable** (Ongaro & Ousterhout, 2014).

- Three parts: **leader election** (one leader handles all requests), **log replication** (leader
  appends, copies to followers), **safety** (a committed entry is final, never overwritten).
- Everything rests on **majority voting**: a `2f+1` cluster tolerates `f` failures — **5 nodes →
  2**, 3 → 1. Clusters are **odd-sized**; a lone minority must stall, never decide.
- An entry is **committed once a majority stores it** — final because any two majorities overlap
  (same argument as W+R>N). **Terms** = a logical clock: a stale leader back from a partition sees
  a higher term and steps down. At most one leader per term (one vote per node per term).
- **A consensus cluster is CP by construction**: under a partition only the majority side elects a
  leader and commits; the minority refuses writes. That is CP, made concrete.

**The eight fallacies — the false assumptions a single-machine mindset carries onto a network.**
A checklist of failure modes, not a theorem; oral history from Sun engineers. Lead with the
*correction*, never the assumption.

1. Network is reliable — **the one to have sharp**: it drops/duplicates, so retry → and retries
   are safe only if the operation is [[idempotency-and-safe-retries|idempotent]].
2. Latency is zero — remote ≫ local; batch, don't make 100 chatty round-trips.
3. Bandwidth is infinite — finite and shared; a big payload saturates a link latency called free.
4. Network is secure — hostile shared medium; authenticate + encrypt in transit by default.
5. Topology doesn't change — nodes/addresses move; resolve via discovery/DNS, never hard-code.
6. One administrator — spans teams/accounts nobody can reboot whole; no total visibility.
7. Transport cost is zero — egress $, plus serialise/deserialise CPU on every message.
8. Network is homogeneous — devices/formats disagree; interoperate via a standard wire format.

The through-line: a network is **not a slower local call**. Name the assumption, name what breaks
it, name the coping mechanism — that is the design answer.

The reach-for-it signal: any question with a partition, replicas, or "what if a node can't reach
the others" → CAP. A *healthy* system treated as trade-off-free, or two "AP" stores to tell apart
→ PACELC. "How consistent?" → name a **model** (session, read-your-writes, …), or do the W+R>N
arithmetic. "How do the nodes *agree* / elect a leader / stay one source of truth?" → **Raft +
majority**. Always name what a **stale answer costs** first, then let the framework pick.

Full treatment: [[the-cap-theorem]], [[pacelc]], [[consistency-models]], [[consensus-with-raft]],
and [[the-eight-fallacies-of-distributed-computing]].
