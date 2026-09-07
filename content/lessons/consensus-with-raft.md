---
id: 01M1XWKBZFSJ5SG8R9CTA7QAZK
title: How a cluster agrees — consensus with Raft
topic:
  - distributed-systems
prerequisites:
  - the-cap-theorem
---

Consensus is the problem of getting a group of machines to **agree on a single value** — or,
more usefully, on an ordered *sequence* of values — even though some of them will crash and
the network between them will drop and delay messages. It is the mechanism sitting underneath
every system that claims strong [[consistency-models|consistency]]: the way a cluster keeps one
authoritative copy of the truth is by voting on every change before it counts. Raft is the
consensus algorithm to know by name, and the thing to lead with in an interview is *why it
exists*: not to be faster or stronger than the alternative, but to be **understandable** — which
is exactly the property that lets you narrate it at a whiteboard.

The algorithm comes from Diego Ongaro and John Ousterhout's 2014 paper,
[*In Search of an Understandable Consensus Algorithm*](https://raft.github.io/raft.pdf). Its
explicit design goal was to be teachable where Paxos, the classic consensus algorithm, is
notoriously not — and the authors are careful to state that Raft is **equivalent to Paxos in
fault-tolerance and performance**. So reaching for Raft is not a correctness compromise; it is
choosing the version of the same guarantees that a team can actually reason about and operate.

## What consensus buys, and the majority rule that makes it work

A single leader that never fails would need no consensus — it would just decide. Consensus is
the price of surviving the leader's failure without either stopping forever or splitting into
two clusters that each think they are in charge. Raft pays that price with **majority voting**:
nothing — electing a leader, committing a write — counts until *more than half* the nodes agree.

That single rule is where the famous fault-tolerance numbers come from. A cluster of `2f + 1`
nodes tolerates `f` failures, because as long as a majority survives, the failed minority can
never assemble a majority of its own to contradict them. Five nodes tolerate two failures;
three nodes tolerate one. It also explains why consensus clusters are **odd-sized**: a sixth
node does not raise the failure tolerance of a five-node cluster (both need three to form a
majority and both tolerate two losses), it just adds a machine that has to agree.

```quiz 01M1XWKBZHHE5YR3VT6DVHGD4X
A Raft cluster has five nodes. How many can fail at once while the cluster keeps making progress?

- [x] Two — a majority of three must survive to agree
  > Raft needs more than half to commit anything, so a five-node cluster needs three alive.
    That leaves two it can lose. In general `2f + 1` nodes tolerate `f` failures, which is why
    consensus clusters are sized odd.
- [ ] Four — only one node is needed to hold the data
  > One surviving node cannot form a majority of five, so it must stop rather than serve
    possibly-stale writes. A lone survivor deciding on its own is the split-brain that the
    majority rule exists to prevent.
- [ ] Three — a bare minority may still proceed
  > Three failures leave only two alive, and two is not a majority of five. That side must
    stall; letting a minority proceed is exactly what would let two halves diverge.
- [ ] Five — replication keeps every copy independently live
  > If every node fails there is nothing left to serve, and even before that, any group smaller
    than three cannot commit. Replication is not independence; progress needs a quorum.
```

## Raft decomposes the problem into three pieces

Paxos is hard to hold in your head because it addresses consensus as one dense whole. Raft's
central move is to **split it into three subproblems** you can learn and reason about
separately — this decomposition is itself the interview-worthy idea:

- **Leader election** — the cluster elects exactly one leader; all client requests go through
  it, and if it fails a new one is chosen.
- **Log replication** — the leader takes client commands, appends them to its own log, and
  replicates that log to the followers so every node ends up with the same sequence.
- **Safety** — the guarantees that make the above correct: at most one leader per term, and a
  committed entry is never lost or overwritten.

Underneath all three is the notion of a **term**: Raft divides time into numbered terms, each
beginning with an election. A term is a logical clock — every message carries its sender's term
number, a node always adopts a larger term it hears about, and a leader from an old term that
comes back after a partition immediately discovers it is stale and steps down. That is how Raft
avoids two leaders acting at once without any real clock.

```quiz 01M1XWKBZH3TFCSF1ZGGE64885 cloze
Raft breaks consensus into three parts: {{leader election}} chooses the single node that
handles requests, {{log replication}} copies the leader's ordered command log to the followers,
and {{safety}} guarantees a committed entry survives. Time is divided into numbered
{{terms}}, each starting with an election, which act as a logical clock so a stale leader
returning from a partition steps down instead of acting.
```

## Leader election runs on timeouts and votes

Every node is in one of three states: **follower**, **candidate**, or **leader**. A healthy
cluster has one leader and the rest followers, and the leader announces itself by sending
periodic empty **heartbeat** messages. A follower that hears nothing from a leader for a
randomised **election timeout** assumes the leader is gone: it increments the term, becomes a
candidate, votes for itself, and asks every other node for its vote. It becomes leader the
instant it collects votes from a majority.

Two rules keep this from descending into chaos. First, a node grants **at most one vote per
term**, so two candidates cannot both win a majority — at most one leader per term, guaranteed.
Second, the election timeout is **randomised** (typically 150–300 ms) rather than fixed, so
followers rarely time out together; the one that fires first usually wins before the others
start, which breaks the symmetry that would otherwise cause repeated split votes.

## Log replication and the commit rule

Once elected, the leader is the sole entry point for changes. A client command becomes a new
entry appended to the leader's log, and the leader sends that entry to the followers. Here is
the rule that defines correctness: an entry is **committed** only once the leader has
replicated it to a **majority** of the cluster. At that point the leader applies it to its
state machine, returns success to the client, and tells the followers they may apply it too.

Committing on a majority is what ties replication back to fault tolerance. Because any two
majorities of the same cluster must overlap on at least one node, a committed entry is
guaranteed to be present on at least one member of *any* future majority — so it can never be
lost to a leader change. This is the same overlap argument as the
[[consistency-models|quorum `W + R > N` formula]], applied to the write path of the log itself.

```quiz 01M1XWKBZHQA1BQ79NP4KQNZ7D
The leader has appended a client's command to its own log and sent it to the followers. When is
that entry safe to acknowledge as committed?

- [x] Once a majority of the cluster has stored it
  > Committing on a majority guarantees the entry sits on a node that every future majority
    must also include, so a leader change cannot lose it. Only then does the leader apply it and
    reply to the client.
- [ ] As soon as the leader has written it to its own log
  > A single copy on the leader is not durable — if that leader crashes before replicating, the
    entry can vanish and a new leader will never have seen it. One log is not consensus.
- [ ] Once every follower without exception has stored it
  > Waiting for all nodes would make the cluster stall whenever a single follower is slow or
    down, defeating the whole point of tolerating `f` failures. A majority, not unanimity, is
    the bar.
- [ ] After the next heartbeat interval has elapsed
  > Commitment is about replication reaching a majority, not about elapsed time. A heartbeat
    carries commit information but the clock alone commits nothing.
```

## Safety: a committed entry is final

The subtle part of Raft — the part the paper spends its safety section on — is making sure a
newly elected leader cannot erase a decision the previous one already committed. The mechanism
is an **election restriction**: a candidate can only win if its log is at least as up-to-date as
the majority that votes for it. Since a committed entry lives on a majority, and any winning
candidate must be as current as some node in every majority, the new leader is guaranteed to
already hold every committed entry. Combined with the rule that a leader only ever *appends* to
its log and never overwrites its own committed entries, this gives the property that matters:
**once an entry is committed, it appears in the logs of all future leaders**, so an agreed
decision is genuinely final.

This is also where Raft meets [[the-cap-theorem|CAP]] head-on. A consensus cluster is a **CP**
system by construction. When a partition splits it, only the side holding a majority can elect a
leader or commit anything; the minority side cannot assemble a quorum, so it *stops serving
writes* rather than risk a divergent decision. Raft chooses consistency and sacrifices
availability on the minority side — not as a tuning option but as the direct consequence of the
majority rule. That is why consensus is the machinery behind the CP choice the CAP Lesson
describes.

```quiz 01M1XWKBZHTZ0A0MVK7809YJHG recall
A five-node Raft cluster is split by a partition into a group of three and a group of two. The
old leader is in the two-node group. An interviewer asks what each side can do, and which of
CAP's guarantees Raft is honouring. Walk them through it.

> The **three-node side has a majority**, so it can elect a fresh leader (the old one is
> stranded on the minority side) and keep committing writes, because it can replicate each entry
> to a majority of the whole cluster. The **two-node side cannot form a majority of five**, so
> its leader — even though it is still running — can no longer commit anything: without a quorum
> it stops accepting writes and, discovering a higher term when the partition heals, steps down.
>
> In CAP's terms Raft is honouring **consistency over availability — it is CP**. It deliberately
> makes the minority unavailable for writes rather than let two sides commit conflicting
> decisions, which is the whole reason a consensus algorithm exists. When the partition heals,
> the stale side adopts the newer term and the winning side's log, and the cluster is one
> authoritative sequence again. The price, exactly as CAP predicts, is that clients on the
> minority side were refused service for the duration of the split.
```

## What to take away

Consensus is how a cluster agrees on one ordered log of changes despite crashes and a lossy
network, and Raft is the algorithm designed so you can actually explain it: equivalent to Paxos
in fault-tolerance and performance, but decomposed into **leader election**, **log
replication**, and **safety**. Everything rests on **majority voting** — a `2f + 1` cluster
tolerates `f` failures, a five-node cluster tolerates two — and on **terms** as a logical clock
that guarantees at most one leader at a time. An entry is committed once a majority stores it,
which makes it final because majorities overlap. And because only the majority side of a
partition can make progress, a consensus cluster is inherently **CP**: it is the concrete
machinery behind the consistency-over-availability choice, and the reason a strongly consistent
store stops serving rather than split its brain.

Worth reading in full: the [Raft paper](https://raft.github.io/raft.pdf) and the visualisations
at [raft.github.io](https://raft.github.io/) — the paper is unusually readable for its field
(that was the point), and the interactive animation of an election and a partition makes the
majority rule click in a way prose cannot.
