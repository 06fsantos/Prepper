---
id: 01M22TXTG1TT21M3N5RKMCNGHZ
title: Availability and the nines
topic:
  - system-design
  - distributed-systems
prerequisites:
  - back-of-envelope-estimation
---

A design round that asks for "highly available" is asking for a number, and the number is not
a vendor's promise you look up — it is one you **compose** from the parts. Availability is
counted in *nines*: 99.9% is "three nines", and each nine you add is roughly a tenfold cut in
how long the system is allowed to be down. Where [[back-of-envelope-estimation]] sizes a
system's throughput and storage, this is the same arithmetic pointed at its *uptime* — the
other axis a senior candidate is expected to reason about out loud rather than assert. The move
being graded is identical: state the target, then derive whether the design can hit it.

The reason this is arithmetic and not a slogan is that a real request does not touch one
component. It crosses a load balancer, an app server, and a database, each with its own
availability, and the availability the user sees is what those numbers do when you combine
them. Two rules cover almost every case — components in **series multiply**, redundant
components in **parallel** compound the *other* way — and getting them the wrong way round is
the most common down-level answer there is.

## The nines, and what they cost

An availability figure is only legible once you turn it into downtime, because "99.9%" and
"99.99%" look almost the same and are a factor of ten apart in tolerated outage. The table
worth carrying:

| Availability      | Downtime per year | Downtime per month |
| ----------------- | ----------------- | ------------------ |
| 99% (two nines)   | ~3.65 days        | ~7.2 hours         |
| 99.9% (three)     | ~8.8 hours        | ~44 minutes        |
| 99.99% (four)     | ~53 minutes       | ~4.4 minutes       |
| 99.999% (five)    | ~5.3 minutes      | ~26 seconds        |

Two things fall out of it immediately. First, **five nines is a budget of seconds**, which is
less than a single process restart or a routine deploy — so "five nines" is a claim about
automated failover and zero-downtime releases, not about writing more careful code. Second,
each nine costs roughly an order of magnitude more effort and money than the last, which is why
the target is a *requirement to negotiate*, not a virtue to maximize: a "who's viewing this"
counter and a payments ledger do not get the same number, and picking the right one is the
senior signal. State it the way you state a scale assumption — out loud, so it can be
corrected.

## Series: a chain is below its weakest link

If a request must pass through several components and **every one has to be up** for the
request to succeed, the components are in *series*, and their availabilities multiply:

```
A = A₁ × A₂ × A₃ × …
```

Multiplying numbers below one always gives something smaller, so a series path is **less
available than any single component in it**. Three services at 99.9% each, chained, give
`0.999³ ≈ 0.997` — about 99.7%, which has *lost* most of a nine simply by being three hops
instead of one. (A useful shortcut: for high-availability components the downtimes roughly
add, so three services each down 0.1% of the time are collectively down about 0.3% — the same
99.7%.) This is why every dependency you add is a tax on availability, and why "just call one
more microservice" is never free.

```quiz 01M22TXTG3884VKFZNSHKTKZM3
A request must pass through three services in series, each independently 99.9% available. What
is the end-to-end availability of that path?

- [x] About 99.7% — the three availabilities multiply, dropping below any single hop
  > `0.999³ ≈ 0.997`. A series chain is always less available than its weakest link, because
    multiplying numbers below one shrinks them. Each dependency you add spends availability.
- [ ] Still 99.9% — a series chain is only as weak as its least-available link
  > "Weakest link" is the intuition for a *parallel* set, not a series one. In series every hop
    must be up at once, so the failures accumulate and the whole drops below every part.
- [ ] About 99.99% — chaining independent services adds a nine of headroom
  > Chaining in series *removes* availability. Adding a nine comes from redundancy in parallel,
    where the system survives as long as one copy is up — the opposite arrangement.
- [ ] It depends entirely on which hop happens to fail first
  > Order does not matter to the product: `A₁ × A₂ × A₃` is the same however you arrange it.
    The composition is a fixed number, not a race between the hops.
```

## Parallel: redundancy compounds nines

Redundancy is the arrangement that runs the other way. Put `n` copies of a component behind a
balancer so the system works as long as **at least one is up**, and the copies are in
*parallel*. Now it is the *unavailability* that multiplies — the system is down only when every
copy is down at once:

```
A = 1 − (1 − a)ⁿ
```

where `a` is one copy's availability. Two app servers at 99% each give `1 − (0.01)² = 1 −
0.0001 = 99.99%` — two nines became four by adding one machine. This is the whole reason
[[partitioning-replication-and-consistent-hashing|replication]] exists in the data tier: a key
copied onto three machines survives any one of them dying, and the preference list is this
formula made concrete. Redundancy is how you *buy back* the nines that a series of dependencies
spent.

```quiz 01M22TXTG3Z4K6ZY87X5AGPXRG cloze
Components in series {{multiply}} their availabilities — a request that must cross all of them
is less available than the weakest one. Redundant copies in {{parallel}} do the opposite: with
n copies the system is down only when every one is down, so its availability is
{{1 − (1 − a)ⁿ}} and each copy adds nines.
```

## Composing an SLA — and the independence trap

Put the two rules together and you can derive the availability of a whole design before you
commit to it. Walk the request path, multiply the series components, and for any tier you have
made redundant, substitute `1 − (1 − a)ⁿ` for that tier before multiplying it in. The result
is the ceiling on the SLA you can honestly promise: **you cannot offer more availability than
the product of the dependencies you sit on**, unless you make them redundant. Leaning on a
managed service rated 99.9% and your own code at 99.9% caps you at roughly 99.8% — a fact worth
saying before the interviewer says it.

The trap is in the word *independent*. The parallel formula assumes copies fail for unrelated
reasons, and two servers in the same rack, on the same power feed, in the same availability
zone, or running the same just-shipped bug do **not** — one event takes them both down and the
redundancy buys nothing against it. This is the language of **failure domains**: a redundant
tier only earns its nines when its copies are spread across domains that fail separately, which
is the same instinct as [[bulkheads-and-blast-radius|blast radius]] pointed at uptime instead
of resource pools. Spreading replicas across zones is not paranoia; it is what makes the
arithmetic you just did true.

```quiz 01M22TXTG3X9STSVPBAPPHTA0C recall
You put two app servers behind a load balancer, each 99.9% available, and tell the interviewer
the pair is 99.9999% because `1 − (0.001)² ≈ 0.000001` downtime. Why is that number optimistic,
and what would make it real?

> The formula `1 − (1 − a)ⁿ` assumes the two failures are **independent**, and mine probably
> are not. If both servers sit in the same rack, share a power feed or top-of-rack switch, live
> in one availability zone, or receive the same bad deploy, a single event takes them both down
> — and against a correlated failure like that, the second server buys nothing. So 99.9999% is
> a ceiling I only approach as the failures become truly independent; the real number is
> dragged down by whatever the pair still shares.
>
> To make it real I'd spread the replicas across **failure domains** — different racks, ideally
> different availability zones — so no single event hits both, and stage deploys so a bad
> release cannot land on every copy at once. I'd also remember that redundant app servers don't
> help if they both depend on one database: that shared dependency is a *series* term no amount
> of parallel app tier removes, so it has to be made redundant on its own axis too.
```

One clarification worth keeping straight: this statistical "availability" — a percentage of
uptime over a window — is not the binary **A** of [[the-cap-theorem|CAP]], which is the formal
property that every request receives *some* non-error response. A system can be highly available
in the nines sense while making the CAP trade-off toward consistency, and vice versa; they share
a word and not much else. When an interviewer asks for an availability *number*, they mean the
nines.

## What to take away

Availability is composed, not quoted. Turn the target into a downtime budget first — three
nines is 44 minutes a month, five nines is seconds — so you know whether the ask is about
careful code or about automated failover. Then walk the request path: components in **series
multiply**, so every dependency is a tax and a chain sits below its weakest link; redundant
copies in **parallel** follow `1 − (1 − a)ⁿ`, so each independent copy adds nines and buys back
what the series spent. The SLA you can promise is the product of what you depend on, and the
one thing that quietly breaks the redundancy math is a **shared failure domain** — copies that
fail together were never really `n` copies. Say the target, derive the number, name the domains
you spread across, exactly as you would state a scale assumption and size for it.

Worth reading in full: Google's [Site Reliability Engineering](https://sre.google/sre-book/embracing-risk/)
book, the "Embracing Risk" chapter and its [availability table](https://sre.google/sre-book/availability-table/) —
the first-party source for the nines and for the error-budget framing that turns an availability
target into a number a team spends against.
