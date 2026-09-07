---
id: 01M1XXN7JXFNBJCR35EG29R6RV
title: System design is graded on process — decomposition and trade-offs, not one right architecture
topic:
  - system-design
prerequisites:
  - what-senior-means-as-a-level
---

The single most useful thing to know about the system-design round is that there is **no
answer key**. The prompt is deliberately vague — "design a URL shortener", "design a news
feed" — and the interviewer is not checking your diagram against a reference architecture they
have in mind. They are watching *how you get to one*: whether you pin down the problem before
building, whether you name the trade-off each component buys and costs, and whether you defend
a decision when pushed. A clean, plausible architecture delivered without that reasoning is a
[[what-senior-means-as-a-level|down-level]] signal — it shows you can draw boxes, not that you
can own an under-specified problem, which is the scope the level actually claims.

This reframes what you are optimising for in the room. You are not racing to the "correct"
design; you are demonstrating a *process* that would produce a good design for any prompt. So
the process is the thing to rehearse until it is automatic, because it is the thing being
graded.

## The interviewer pushes past the black box on purpose

A recurring pattern makes the "process, not architecture" point concrete: when you name a
managed service — "I'd put a load balancer here", "I'd use a queue" — a good interviewer
**pushes past it**, asking what happens *inside* that component. That is not a gotcha. It is
the test separating a candidate who pattern-matches a diagram from one who understands the
machinery, and it is why the [[distributed-systems]] theory matters even in an applied round.
Naming a database replica is worth little if you cannot say what happens to it under
[[the-cap-theorem|a partition]]; reaching for a cache is worth little if you cannot say what
goes stale and for how long.

The defence is not to avoid naming components — you must, to make progress — but to name them
knowing you may be asked to open the box, and to signal the trade-off as you place each one.

```quiz 01M1XXN7JYFEH1J1XDWGC6P2YZ
In a system-design round you say "I'd put the writes behind a message queue." The interviewer
asks, "what happens inside the queue if a consumer crashes mid-message?" What is this?

- [x] The core test — whether you understand a component or just name it
  > Pushing past a named service is the standard way the round checks for real understanding
    over pattern-matching. Naming the box is the start of the conversation, not the end; be
    ready to open every box you place.
- [ ] A trick to rattle you before the real design questions
  > It is not a distraction from the design — it *is* the design being graded. The point is to
    see whether you can reason about the machinery, which is the senior signal.
- [ ] A hint that a queue was the wrong tool to reach for
  > The choice may be fine; the interviewer is probing depth, not correcting you. Defending the
    choice on its trade-offs is exactly the response they want.
- [ ] A sign you should redesign to avoid the queue entirely
  > Retreating from a sound choice under a clarifying question is the wrong move. Explain how it
    behaves under failure and why the trade-off still holds.
```

## The process, in four moves

There is no fixed script, but a senior answer almost always makes these four moves, roughly in
order and revisited as the design grows:

1. **Clarify the requirements before drawing anything.** Separate *functional* requirements
   (what it must do) from *non-functional* ones (how fast, how available, how consistent, how
   much scale), and state your assumptions out loud — expected users, read/write ratio, data
   size. This is where you pin down a vague prompt into something buildable, and doing it first
   is itself a large part of the signal. Guessing the numbers is fine; **stating** them so the
   interviewer can correct you is the point.
2. **Estimate the scale.** A rough [[back-of-envelope-estimation|back-of-envelope]] pass —
   requests per second, storage growth, bandwidth — is what tells you whether one database is
   enough or whether you need to partition, and it grounds every later decision in a number
   rather than a vibe. You are not asked for precision; you are asked to reason from magnitude.
3. **Decompose into components and justify each.** Sketch the pieces — clients, load balancer,
   services, data stores, [[caching-and-ttls|caches]], queues — and as you place each one, say
   what it buys and what it costs. A [[system-design-building-blocks|building block]] named
   without its trade-off is a box; named *with* it, it is a decision.
4. **Make the trade-offs explicit across four axes.** Scalability, reliability, latency, and
   operational complexity are the standard frame. Every non-trivial choice improves some and
   costs others — a cache cuts latency and adds a staleness and invalidation problem; a
   read-replica adds availability and a consistency lag. Saying the axis out loud is what turns
   a preference into an engineering argument.

The through-line under all four is the same one the whole senior loop tests: **operating under
ambiguity and defending a trade-off.** Lead with what you are giving up, not with the component
you are reaching for.

```quiz 01M1XXN7JY5V8V9RTGT50XJS6J cloze
The system-design round grades {{process}} over one correct architecture. The four moves of a
strong answer are: clarify {{requirements}} (functional and non-functional) and state
assumptions; {{estimate}} the scale to ground decisions in numbers; decompose into components
and justify each; and make the {{trade-offs}} explicit across scalability, reliability, latency,
and operational complexity.
```

## Why "no right architecture" is literally true

It is tempting to treat "there's no one right answer" as interview-coach encouragement. It is
stronger than that — it follows from the theory. The [[distributed-systems]] results are
*impossibility* statements: under a partition [[the-cap-theorem|you cannot have]] both
consistency and availability, and even in a healthy network [[pacelc|you trade]] latency
against consistency. So any design is a *choice* about what to sacrifice, and the right choice
depends entirely on what a stale or unavailable answer costs *this* workload. A payments ledger
and a "who's viewing this" counter get opposite designs from the same toolbox, correctly. An
interviewer who scored on a fixed architecture would be scoring against a theorem that says no
fixed architecture is universally right.

That is why the trade-off, not the diagram, is the unit of credit — and why stating the
workload's tolerance for staleness, downtime, and latency *first* is the move that unlocks
every component choice after it.

```quiz 01M1XXN7JYVAEA9ZRPR7FJ8312 recall
An interviewer gives you "design a system for storing and serving user profile photos" and, ten
minutes in, asks: "your friend gave a completely different design and also passed — how can you
both be right?" How do you answer in a way that shows the senior signal?

> We can both be right because the round grades the *reasoning*, not a single reference
> architecture — and that is not a platitude, it follows from the fact that every distributed
> design is a trade-off with no universally correct setting. My design and theirs each made a
> defensible choice about what to give up for this workload; if we surfaced our requirements and
> assumptions and justified each component against scalability, reliability, latency, and
> operational complexity, we both demonstrated the thing being measured.
>
> Concretely: photo storage is read-heavy, the objects are large and immutable once uploaded,
> and a photo being a few seconds stale on one device harms nobody — so I'd lean availability
> and cache aggressively behind a CDN, accepting eventual consistency on metadata. If my friend
> optimised instead for, say, tighter delete-propagation (a privacy requirement I didn't
> assume), they'd correctly trade some of that latency away. Same toolbox, different assumptions
> stated out loud, both defensible. The failure mode isn't picking the "wrong" design — it's
> picking any design without saying what it costs.
```

## What to take away

The system-design round is a test of process, not recall of a canonical architecture. Clarify
the requirements and state your assumptions before you draw; estimate the scale so decisions
rest on magnitude; decompose into components and justify each one against scalability,
reliability, latency, and operational complexity; and be ready for the interviewer to open any
box you name. The reason there is no answer key is not soft — it is that the underlying theory
makes every design a deliberate trade-off, so the trade-off you can *defend* is the thing worth
points. Lead with what you give up.

Worth reading in full: Martin Kleppmann's
[*Designing Data-Intensive Applications*](https://dataintensive.net/) — not for one design but
for the vocabulary of replication, partitioning, and consistency trade-offs that lets you name
what each component costs instead of merely placing it.
