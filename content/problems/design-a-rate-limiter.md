---
id: 01M2G9F2TB02R2VRYA0RDK6PMF
title: Design a rate limiter
kind: system-design
difficulty: medium
topic:
  - system-design
practices:
  - system-design-is-graded-on-process
  - rate-limiting
source:
  - https://leetcode.com/problems/design-hit-counter/
---

## Prompt

Design a service that caps how often a client may call an API — say, no more than N requests
per client per window — and rejects the excess. Work out where the limiter sits, which
algorithm decides whether a request is allowed, what the service returns when it refuses, and
how the limit is enforced *consistently* when the requests are spread across many servers; then
defend the accuracy-versus-cost trade-off your algorithm makes.

## Constraints

- Limits are per identity (API key, user id, or IP) and often layered — a per-second burst
  cap and a per-hour total, enforced together.
- The check is on the hot path of *every* request, so it must add near-zero latency and must
  fail in a defined direction when the limiter itself is unavailable.
- The service is horizontally scaled: a client's requests land on any of many app servers, so
  a purely in-process counter does not see the client's whole traffic.
- Rejection must be a clear, standard contract the caller can act on — not a dropped
  connection.

## Solution

A rate limiter looks like a counter with an `if`, and the whole interview is in the two
questions that counter hides: *which* counting algorithm, and *where* the count lives once one
server is not enough. Run [[system-design-is-graded-on-process|the process]] — clarify,
estimate, decompose, name the trade-off — and both fall out. The teaching Lesson behind this is
[[rate-limiting]]; the walkthrough here is that theory placed into a designed system.

### Clarify the contract first

The functional requirement is "allow up to N per window per client, reject the rest", but the
non-functional half is the design: the check runs on every request, so its own latency and
availability are first-class. Two decisions belong in the opening minutes because they shape
everything:

- **The rejection contract.** A refused request returns **HTTP 429 Too Many Requests** with a
  **`Retry-After`** header telling the caller when to come back, and ideally
  `X-RateLimit-Remaining`/`X-RateLimit-Reset` so a well-behaved client can self-pace. Dropping
  the connection instead turns a polite "slow down" into an outage the caller cannot reason
  about.
- **Fail-open or fail-closed.** If the limiter's datastore is unreachable, do you allow traffic
  through (fail open — protects the user experience, risks the backend it was guarding) or block
  it (fail closed — protects the backend, becomes an outage)? State which and why. For a
  public API guarding a fragile backend, fail *closed* on the critical limits; for a
  convenience throttle, fail *open*. Saying this unprompted is a senior signal.

### The algorithm is the real question

Four standard choices, each buying accuracy with memory or smoothness with complexity:

1. **Fixed window.** One counter per client per clock window (e.g. per minute); increment,
   compare to N, reset at the boundary. Trivial and cheap — one integer — but it allows a
   **double burst at the boundary**: N requests at 11:00:59 and N more at 11:01:00 is 2N in two
   seconds, all "within limit".
2. **Sliding window log.** Store the timestamp of every request and count those inside the
   trailing window. Exact, but the memory is `O(requests)` per client — you keep every
   timestamp — which does not survive high volume.
3. **Sliding window counter.** Approximate the sliding window by weighting the previous fixed
   window's count by how much of it still overlaps the trailing window. Smooths the boundary
   burst of fixed-window at the cost of a small, bounded approximation, and it is still `O(1)`
   memory — usually the right default.
4. **Token bucket.** A bucket holds up to `capacity` tokens and refills at a steady rate; each
   request spends one, and a request with no token to spend is rejected. This is the one to
   reach for when you want to **allow bursts up to the bucket size while capping the sustained
   rate** — the mental model most APIs actually want, and it is two numbers per client (token
   count and last-refill timestamp), computed lazily.

Recommend **token bucket** for the burst-friendly case and **sliding-window counter** for a
strict smoothed cap, and name the axis: fixed-window is cheapest and least accurate; the log is
exact and unaffordable; the middle two buy accuracy back at `O(1)` memory. Compute the refill
lazily — do not run a timer per client — deriving the current token count from the elapsed time
since the last request.

```csharp
public sealed class TokenBucket
{
    private readonly double _capacity;
    private readonly double _refillPerSecond;
    private double _tokens;
    private long _lastRefillTicks;

    public TokenBucket(double capacity, double refillPerSecond)
    {
        _capacity = capacity;
        _refillPerSecond = refillPerSecond;
        _tokens = capacity;
        _lastRefillTicks = DateTime.UtcNow.Ticks;
    }

    // Refill is computed from elapsed time, not a background timer.
    public bool TryConsume()
    {
        var now = DateTime.UtcNow.Ticks;
        var elapsedSeconds = (now - _lastRefillTicks) / (double)TimeSpan.TicksPerSecond;
        _tokens = Math.Min(_capacity, _tokens + elapsedSeconds * _refillPerSecond);
        _lastRefillTicks = now;

        if (_tokens < 1) return false;
        _tokens -= 1;
        return true;
    }
}
```

### Where the count lives — the distributed half

The snippet above is correct for one process. The moment the client's requests are spread
across many app servers, a per-process bucket only sees a fraction of the traffic, so N servers
each admitting N requests admits `N × limit`. The counter has to be **shared**, and that is the
part the interviewer is really testing:

- **A central in-memory store (Redis is the canonical answer).** The counter or bucket lives in
  one fast, shared place, and each app server does an atomic check-and-decrement against it. The
  atomicity matters — a naive read-then-write races under concurrency and admits over the limit —
  so the update is a single atomic operation (an `INCR` with an expiry for fixed-window, or a
  small server-side Lua script for token-bucket so the read, refill, and decrement are one
  round-trip and cannot interleave).
- **The trade-off to name:** this adds one network hop to every request. You keep it near-zero
  by co-locating the store, and you decide the failure direction (the fail-open/closed choice
  above) precisely because this dependency is now on the hot path.
- **Sharding.** Partition the counters by client key so no single Redis node is a bottleneck —
  the same [[partitioning-replication-and-consistent-hashing|key-based partitioning]] the rest
  of the system uses.

An **approximate-but-cheap** alternative worth offering: let each server enforce `limit / server
count` locally with no shared state, accepting that the global cap is loose and drifts as
servers come and go. It removes the network hop entirely and is fine for a coarse throttle;
it is wrong for a hard billing or abuse limit. Presenting both and picking based on how exact
the limit must be is the move that scores.

### Where it sits

Put the limiter at the **edge — the API gateway or a middleware in front of the services** —
so rejected traffic never reaches the application, and so one limiter protects every service
behind it. A limiter deep inside a service has already paid for the request it is trying to
refuse.

## Complexity

Each decision is `O(1)` time and `O(1)` memory per client for fixed-window, sliding-window
counter, and token bucket — two numbers and some arithmetic — which is what lets the check ride
the hot path; the sliding-window *log* is the exception at `O(requests)` memory, and that cost
is exactly why it loses to the counter approximation at scale. In the distributed design the
per-request cost is one atomic round-trip to the shared store, kept small by co-location and
bounded by sharding the counters across nodes on the client key, so total throughput scales
with the store's shard count rather than being pinned to a single counter.

## Follow-ups

- Enforce a **per-second burst limit and a per-hour total at the same time**. Does each need its
  own algorithm, and what does the 429's `Retry-After` say when two limits disagree?
- The shared Redis node goes down. Walk through fail-open versus fail-closed for a payments API
  versus a search box, and what each costs.
- A single abusive client is hammering one shard. What happens to the *other* clients on that
  shard, and how do you keep one hot key from degrading its neighbours?
- The limit needs to be **per-endpoint and per-plan** (free vs paid), configurable without a
  deploy. Where does that configuration live and how does the hot path read it cheaply?
