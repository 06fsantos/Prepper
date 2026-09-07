---
id: 01M1XVY0R12ZK7KK3ZZEH4CDP5
title: Consistency models — from strong to eventual, and why eventual is a choice
topic:
  - distributed-systems
prerequisites:
  - the-cap-theorem
---

A consistency model is the contract a distributed store makes about **when a write becomes
visible to a reader**. The senior framing — and the thing to lead with — is that eventual
consistency is not *broken* strong consistency, or strong consistency with the guarantees
switched off. It is a deliberate point on a spectrum, chosen because it buys availability and
low latency, and naming it as a choice rather than a defect is what separates a candidate who
has read past the buzzword from one who has only heard it.

[[the-cap-theorem|CAP]] tells you that under a partition you must give up either consistency or
availability, and [[pacelc|PACELC]] adds that even with no partition you trade latency against
consistency. Both of those hand you a *dial*. A consistency model is the label on a setting of
that dial — the precise promise the store keeps once you have decided how much freshness you
are willing to pay for.

## The three settings, defined precisely

Werner Vogels' [ACM article "Eventually Consistent"](https://www.allthingsdistributed.com/2007/12/eventually_consistent.html)
gives the definitions the rest of the field uses, and each is worth stating in his terms
because the loose versions mislead:

- **Strong consistency** — after an update completes, *any* subsequent access, by any client,
  returns the updated value. There is one authoritative answer and everyone sees it at once.
- **Weak consistency** — the system does not guarantee that subsequent accesses return the
  updated value; a number of conditions must be met first. The period before the update is
  guaranteed visible is the **inconsistency window**.
- **Eventual consistency** — a special case of weak consistency: if no new updates are made to
  an object, *eventually* — once the inconsistency window closes — all accesses return the last
  updated value. Given quiet, the replicas converge.

The move that makes eventual consistency sound like a bug is to imagine a reader stuck with a
stale value forever. That is not what it says: the guarantee is convergence in the absence of
new writes, and the inconsistency window in a healthy system is typically milliseconds. What you
have given up is *when*, not *whether*.

```quiz 01M1XVY0R21BFWRGHHJMW9SFAB
An eventually consistent store has just accepted a write. A client reads the same key a moment
later and gets the old value. Is the store violating its contract?

- [x] No — eventual consistency only promises convergence once writes stop, not immediate visibility
  > The stale read is inside the inconsistency window, which is exactly what the model permits.
    The promise is that if no further updates arrive, every replica *eventually* returns the last
    write. "When" is what was traded away, not "whether".
- [ ] Yes — an accepted write must be visible to the next read of that key
  > That is the promise of *strong* consistency, not eventual. Holding an eventually consistent
    store to the strong contract is the category error the whole model exists to name as a choice.
- [ ] No — but only because the two operations came from different clients
  > The client identity is irrelevant here; even the *same* client can read stale under plain
    eventual consistency. The client-centric variants exist precisely to add that missing promise.
- [ ] Yes — convergence must complete before the write is acknowledged
  > Waiting for full convergence before acknowledging is what strong consistency costs. Eventual
    consistency acknowledges early and converges in the background — that is the latency it buys.
```

## Between the two extremes: the client-centric variants

The gap between "every reader sees it instantly" and "everyone sees it eventually" is not empty.
Vogels lists several intermediate guarantees, and their value in an interview is that they let
you offer a *useful* promise without paying for full linearizability:

- **Read-your-writes consistency** — once a process has updated a value, it never afterward sees
  an older one. The classic case: you edit your profile and the very next page load must show
  the edit, even though another user's may lag.
- **Monotonic read consistency** — once a process has seen a value, later reads never return an
  earlier one. Time does not appear to run backwards for that reader; a refresh cannot un-show a
  comment you already saw.
- **Monotonic write consistency** — the system serialises writes from the same process in order.
  Without it, your own two updates can land out of order — a guarantee weak enough that a store
  lacking it is genuinely hard to program against.
- **Causal consistency** — if process A tells process B about an update, B's later reads reflect
  it and B's writes supersede A's. Reads that are causally related stay ordered; unrelated ones
  fall back to plain eventual.
- **Session consistency** — read-your-writes, but scoped to a single session. Inside the session
  you always see your own writes; the guarantee does not survive the session ending. This is the
  practical sweet spot a great many applications actually run on.

The reason these matter is that "eventual consistency" as a bare label hides which of them a
store offers, and the difference is the difference between an application you can reason about
and one you cannot.

```quiz 01M1XVY0R2AQNSMQPQXVVYWWWW cloze
Eventual consistency promises only that replicas converge once writes stop. The intermediate
model that guarantees a process never sees a value older than one it already wrote is
{{read-your-writes}} consistency; scoping that same promise to the lifetime of one session gives
{{session}} consistency. The model that stops a reader from ever seeing time run backwards — a
later read returning an earlier value — is {{monotonic read}} consistency.
```

## The dial in one formula: N, W, and R

The intermediate guarantees are not magic; a quorum store buys them with three numbers, and
Vogels' N/W/R notation is the compact way to reason about the trade-off in an interview:

- **N** — how many replicas hold a copy of the data.
- **W** — how many replicas must acknowledge a write before it is considered complete.
- **R** — how many replicas a read consults.

The one inequality to carry is **W + R > N**. When the write set and the read set are that large,
they are forced to overlap on at least one replica, so every read touches a node that saw the
latest write — that overlap *is* strong consistency (quorum consistency). When **W + R ≤ N** the
sets can miss each other entirely, a read may reach only replicas that never saw the write, and
you are back to weak/eventual consistency.

The knobs then express intent directly. Setting **W = N** makes writes maximally durable and
consistent but slow, because every replica must ack. Setting **R = 1** makes reads as fast as
possible by consulting a single replica. A common primary-backup setup is **N = 2, W = 2, R = 1**
(synchronous replication — both replicas ack the write, either can serve a read); its lazy cousin
is **N = 2, W = 1, R = 1** (asynchronous replication — the write returns after one ack and the
second replica catches up, opening an inconsistency window). The formula turns a vague "how
consistent is it?" into arithmetic you can do at the whiteboard.

```quiz 01M1XVY0R2Y5KPZE2VYH9P25FJ recall
An interviewer draws a store with three replicas of every key (N = 3) and says writes wait for
two acknowledgements (W = 2). They ask: how many replicas must a read consult to guarantee it
never returns stale data, and what have you given up if you instead read from one?

> I need **W + R > N**, so with N = 3 and W = 2 I need R > 1 — that is **R = 2**. With W = 2 and
> R = 2 the write set and the read set must overlap on at least one of the three replicas, and
> that shared replica is guaranteed to have seen the latest write, so the read is strongly
> consistent (quorum consistency).
>
> If I read from one replica instead (**R = 1**), then W + R = 3 = N, the sets no longer have to
> overlap, and the read can land on the single replica that has not yet received the write. I have
> traded that guarantee for lower read latency and higher availability — I now get *eventual*
> consistency, and whether that is acceptable depends entirely on what a stale read costs this
> workload. That cost, not the arithmetic, is the actual design decision; the formula just tells me
> which setting I am buying.
```

## Choosing a model is the same product decision CAP forces

Because these models are settings on the CAP/PACELC dial, choosing among them is the same act as
choosing CP or AP: you start from **what a stale answer costs the business**, not from a
preference for strength. A banking ledger wants strong consistency and will pay the latency and
the reduced availability for it — an overdraft that a stale read allowed is a real loss. A social
feed, a view counter, a DNS record: eventual consistency is not a compromise there, it is the
*correct* engineering choice, because immediate global agreement would cost availability and
latency the workload has no use for.

The senior answer, then, is never "eventual consistency is weaker so avoid it." It is: name the
staleness tolerance of the data, pick the weakest model that still satisfies it, and say which
one by name — session consistency for a user editing their own content, read-your-writes for a
profile page, eventual with monotonic reads for a feed. The retry safety that lets a store
reconcile divergent writes without applying them twice is a separate property,
[[idempotency-and-safe-retries|idempotency]], and it is what makes an eventually consistent
system safe to build on.

## What to take away

Consistency is a *contract about when a write is visible*, and it runs on a spectrum: strong
(everyone sees it at once), the client-centric middle (read-your-writes, monotonic read/write,
causal, session), and eventual (replicas converge once writes stop, within an inconsistency
window). Eventual consistency is a deliberate purchase of availability and latency, never
degraded strong consistency. A quorum store sets the point on that spectrum with three numbers —
N replicas, W write acks, R read consults — where **W + R > N** forces the overlap that makes
reads strong and **W + R ≤ N** admits staleness. Pick the model from what a stale answer costs,
and say its name.

Worth reading in full: Werner Vogels'
["Eventually Consistent"](https://www.allthingsdistributed.com/2007/12/eventually_consistent.html)
— short, written by the engineer who ran Amazon's storage, and the source of both the vocabulary
and the N/W/R formula every later treatment borrows.
