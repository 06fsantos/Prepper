---
id: 01M1XVQASZNE1V66ZBR30H5VVH
title: PACELC — even without a partition, latency versus consistency
topic:
  - distributed-systems
prerequisites:
  - the-cap-theorem
---

PACELC is the observation that a distributed system is making a trade-off *all the time*, not
only during the rare network split that [[the-cap-theorem|CAP]] describes. CAP's blind spot is
that it says nothing when the network is healthy — yet a replicated system, every millisecond of
its normal life, is still choosing between answering fast from the nearest copy and answering
correctly after checking with the others. PACELC names that everyday choice, and leading with it
is what signals you have thought past the acronym everyone can recite.

The rule reads as a sentence, which is the easiest way to carry it: **if there is a Partition
(P), trade Availability (A) against Consistency (C); Else (E), trade Latency (L) against
Consistency (C).** Daniel Abadi introduced it in
[a 2012 IEEE Computer article](https://ieeexplore.ieee.org/document/6127847/), precisely because
CAP on its own leaves the impression that a system with no active partition is free of
trade-offs, when in fact its steady-state latency is governed by exactly the same tension.

## The "else" branch is the one that matters day to day

Partitions are real but rare. The *else* clause is where a system spends essentially all of its
time, and it exists because consistency is not free even when every node can reach every other.
To guarantee that a read sees the latest write, a system has to coordinate — wait for a write to
reach a quorum of replicas, or route every read through a leader — and coordination costs
round-trips, which is latency. Relax the guarantee and let a read come from whichever replica is
nearest, and it returns sooner but may be stale. That is the L-versus-C dial, and it is being
turned on healthy hardware, under no fault at all.

This reframes eventual consistency. A system does not accept staleness only as damage control
during a partition; many systems choose it in the *else* branch as well, deliberately, to keep
reads fast globally. The staleness is bought, and what it buys is latency.

```quiz 01M1XVQAT0GME9VC2X22S85BHA recall
A read-heavy service runs with no partition and every node reachable. Its architects still chose
to serve reads from the nearest replica rather than confirm each read against a quorum. In
PACELC's vocabulary, what did they trade, and why does CAP alone not describe it?

> They traded **consistency for latency** — the **EL** half of PACELC (Else, Latency over
> Consistency). Confirming every read against a quorum would add round-trips, so serving from the
> nearest replica returns sooner at the risk of returning a slightly stale value.
>
> CAP cannot describe this because CAP only speaks about the moment of a partition; with the
> network healthy it imposes no trade-off at all. Yet the system is plainly still making one on
> every read, and that steady-state latency-versus-consistency choice is exactly the gap Abadi
> added the *else* clause to fill.
```

## The two branches are independent, so there are four classifications

The trap is to assume a system's partition-time stance predicts its everyday stance. It does not:
the P branch and the E branch are set separately, which gives four labels. Abadi writes them by
naming each branch's pick — the partition choice, then the else choice:

- **PA/EL** — available under partition, low-latency otherwise. Both branches favour speed and
  availability over strong consistency. Dynamo-style stores ([[the-cap-theorem|the AP lineage]])
  live here.
- **PC/EC** — consistent under partition, consistent otherwise. Both branches pay for
  correctness. A system built on strict quorums or a single leader that refuses to serve stale
  data sits here.
- **PA/EC** — stays available during a partition, but when healthy it insists on consistency and
  pays the latency. A deliberate, less common blend.
- **PC/EL** — refuses to serve on the minority side of a partition, yet serves fast, possibly
  stale reads when healthy. Also a real, deliberate blend.

The value of the four-way grid in an interview is that it forces you to say a design's stance
*twice* — once for the fault case and once for the common case — instead of collapsing a system
to a single "CP or AP" label that describes only the rare branch.

```quiz 01M1XVQAT0N4J6D6AHXDXY3PB9 cloze
PACELC extends CAP with a second clause: if there is a {{partition}}, trade availability against
consistency, {{else}} trade {{latency}} against consistency. The second clause is the one that
governs a system's {{steady-state}} behaviour, because a partition is rare and the everyday cost
of a strong-consistency guarantee is the {{coordination}} (extra round-trips) it takes to keep
every read current.
```

## Why this is the more complete senior framing

CAP answers "what breaks under a partition?" PACELC answers that *and* "what does this system
cost me the rest of the time?" — which is the question an interviewer is usually circling when
they ask why you would pick one datastore over another. Two stores can both be "AP" under CAP and
still differ sharply: one might confirm reads against a quorum when healthy (EC) and the other
serve the nearest replica (EL), a difference in tail latency that never shows up in the CAP
label. Reaching for PACELC is how you make that difference sayable.

It does not replace CAP; it contains it. The P branch *is* CAP, restated, and everything the CAP
Lesson establishes — that partition tolerance is forced on you by physics, that the choice is
about what a stale answer costs — still holds. PACELC adds the branch CAP is silent on.

```quiz 01M1XVQAT09RC080JYM3NZWVXG recall
An interviewer says: "You've told me your datastore is AP — available under a partition. I still
haven't heard enough to choose it. What else do I need to know?" Answer in PACELC's terms.

> You need the *else* branch — how it behaves when the network is healthy, which is nearly all of
> the time. "AP" only fixes the partition stance; PACELC's second clause asks whether, with no
> fault, the store trades latency for consistency (**EC** — confirm each read against a quorum or
> a leader, paying round-trips for freshness) or consistency for latency (**EL** — serve the
> nearest replica, fast but possibly stale).
>
> That distinction is the whole reason to prefer one store over another: two systems can share
> the same "AP" label and still differ enormously in steady-state read latency and staleness. So
> the full stance I'd want stated is a pair, like **PA/EL** or **PA/EC** — the partition choice
> and the everyday choice — because collapsing a design to a single CAP letter hides the branch
> it actually lives in.
```

## What to take away

PACELC is CAP plus the clause CAP forgot: **if Partition, Availability vs Consistency; Else,
Latency vs Consistency.** The *else* branch is where a system spends its life, and it exists
because keeping reads current costs coordination round-trips whether or not anything has failed.
Because the two branches are set independently, a design's honest stance is a *pair* — PA/EL,
PC/EC, and the two blends — and stating both halves is a sharper senior answer than any single
CAP letter. Reach for PACELC the moment a conversation treats a healthy system as trade-off-free,
or the moment two "AP" stores need telling apart.

Worth reading in full:
[Abadi's 2012 IEEE Computer article](https://ieeexplore.ieee.org/document/6127847/), which
introduces the formulation and works through where real systems land in the four-way grid.
