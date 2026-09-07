---
id: 01M1XXDYG65T6GNHMSTRV8Q4HT
title: The eight fallacies of distributed computing
topic:
  - distributed-systems
---

The eight fallacies are the assumptions a program written for one machine quietly carries into
a network, where every one of them is false. They are worth knowing not as trivia but as a
**checklist of failure modes**: a senior design conversation is largely the act of naming which
of these a component leans on and what it does when the assumption breaks. The list is not a
theorem like [[the-cap-theorem|CAP]] — it has no proof and no canonical paper. It is oral
history, attributed to L. Peter Deutsch and other engineers at Sun Microsystems through the
1990s, and its staying power is that the mistakes it names are exactly the ones still being made.
Lead with the correction, never the assumption: the value in an interview is showing you design
for the failure the fallacy hides.

The eight, in the order they are traditionally numbered:

1. **The network is reliable.**
2. **Latency is zero.**
3. **Bandwidth is infinite.**
4. **The network is secure.**
5. **Topology doesn't change.**
6. **There is one administrator.**
7. **Transport cost is zero.**
8. **The network is homogeneous.**

## The first three are the ones interviews turn on

The network is **not reliable**: packets are dropped, connections reset, and a request that
left may never produce a response you can trust arrived — or arrived *once*. The design answer
is to expect failure and retry, and the moment you retry you need
[[idempotency-and-safe-retries|idempotency]], because a retry of a request that actually
succeeded the first time must not perform the operation twice. "The network is unreliable, so I
retry; retries are only safe if the operation is idempotent" is one of the most reusable
sentences you can carry into a design round.

Latency is **not zero**: a call across a datacentre, let alone across the world, costs orders of
magnitude more than a call within a process, and the speed of light sets a floor no engineering
removes. This is why a chatty design that makes a hundred small round-trips loses to one that
makes a single batched call, and why [[back-of-envelope-estimation|reasoning about latency]] is
part of the job. Bandwidth is **not infinite**: it is finite and shared, so shipping a large
payload — or shipping it to many clients at once — saturates a link that latency alone would
have suggested was free. Latency and bandwidth are distinct limits and a design can be starved
by either: a tiny request that waits on a far-away hop is latency-bound; a huge response over a
fat but finite pipe is bandwidth-bound.

```quiz 01M1XXDYG6R68STHSFVZMHHP30
A service calls a remote API, the call times out, and your client automatically retries it.
Which fallacy did the retry itself just expose, and what makes the retry safe?

- [x] "The network is reliable" — and the retry is safe only if the operation is idempotent
  > The timeout is the network being unreliable, so retrying is the right instinct. But the
    first request may have succeeded before the timeout fired, so a blind retry can perform the
    operation twice. [[idempotency-and-safe-retries|Idempotency]] is what makes the second
    attempt a no-op rather than a duplicate.
- [ ] "Latency is zero" — and the retry is safe because the second call is faster
  > A timeout is about the call failing, not about it being slow, and a retry is not faster than
    the original. Retrying an operation that already ran is unsafe regardless of latency.
- [ ] "Bandwidth is infinite" — and the retry is safe because the payload is small
  > Payload size is a bandwidth concern, not what a timed-out retry risks. The hazard is
    performing the same operation twice, which small payloads do not prevent.
- [ ] "The network is secure" — and the retry is safe once the channel is encrypted
  > Encryption protects the request in transit; it does nothing about the request being applied
    twice. Security is a different fallacy from the duplicate-execution risk a retry creates.
```

## The next three are operational

The network is **not secure**: it is a shared, hostile medium, so authentication, encryption in
transit, and the assumption that any hop can be observed or tampered with are not optional
extras but the baseline. **Topology does change**: nodes are added and removed, services move,
IP addresses are reassigned, and a system that hard-codes an address or caches a route forever
breaks the first time the deployment shifts — which is why service discovery and DNS exist. And
there is rarely **one administrator**: a real system spans teams, cloud accounts, and
third-party services, so no single person can reason about or reboot the whole thing, and a
diagnosis that assumes total visibility will stall at the first boundary you do not own.

```quiz 01M1XXDYG7RRC2VE7YPX56G9E4 cloze
Because {{topology}} changes — nodes come and go and addresses are reassigned — a service must
resolve its dependencies through discovery or DNS rather than a hard-coded address. And because
there is rarely {{one administrator}}, no single person has end-to-end visibility, so a real
system spans teams and accounts nobody can reboot as a whole.
```

## The last two are about cost and uniformity

**Transport cost is not zero**: beyond latency and bandwidth, moving data has real costs in
money (cross-region egress charges), CPU (every message must be serialised on the way out and
deserialised on the way in), and infrastructure. A design that treats network calls as free
will be surprised by both the cloud bill and the serialisation overhead. And **the network is
not homogeneous**: it is built from many devices, protocols, and formats that do not agree, so
interoperability has to be designed in through standard, well-specified formats rather than
assumed — the reason a system settles on something like JSON or protobuf over the wire instead
of shipping a language's native objects.

The unifying lesson is that **a network is not a slower in-process call** — it is a different
thing with its own physics, and each fallacy is a place where treating it as the same fails.
The senior move is to make the failure explicit: name the assumption, say what breaks it, and
name the mechanism that copes.

```quiz 01M1XXDYG7QBA5M6XH1EBBGKG1 recall
An interviewer says: "You're calling a payments service over the network. Talk me through the
distributed-computing fallacies you'd design against." Give a focused answer — you don't need
all eight, but hit the ones that matter for this call.

> The one that dominates is **the network is not reliable**: the call can time out or fail
> after the payment was actually taken, so I retry on failure but make the charge
> [[idempotency-and-safe-retries|idempotent]] with an idempotency key, so a retry of a request
> that already succeeded is a no-op rather than a double charge. **Latency is not zero**, so I
> avoid a chatty back-and-forth and don't hold a user-facing request open on a slow downstream
> call — I'd consider making it asynchronous. **The network is not secure**, so the call is
> authenticated and encrypted in transit, since it carries payment data over a shared medium.
> And **transport cost is not zero** — cross-region calls cost money and serialisation CPU — so
> I'd keep the payment service close to its caller. The through-line is that every one of these
> is a network assumption that's false, and naming the failure and the mechanism that copes with
> it is the design.
```

## What to take away

The eight fallacies — reliable network, zero latency, infinite bandwidth, secure network, fixed
topology, one administrator, zero transport cost, homogeneous network — are the false
assumptions a single-machine mindset carries onto a network, and they are a checklist for a
design conversation rather than a theorem to recite. The first, *the network is reliable*, is
the one to have most sharply, because its correction chains straight into retries and
[[idempotency-and-safe-retries|idempotency]], and the failure it hides — a lost or duplicated
request — is the one interviews probe hardest. Lead with the correction, name the coping
mechanism, and you have turned a piece of folklore into evidence that you design for the failure
rather than hope it away.

There is no primary paper to read, so the best single treatment is
[Kevin Sookocheff's "Unpacking the eight fallacies of distributed computing"](https://sookocheff.com/post/distributed-systems/unpacking-the-eight-fallacies-of-distributed-computing/),
which takes each fallacy in turn and says concretely what it breaks and how modern systems cope.
