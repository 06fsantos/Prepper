---
id: 01M1YMYXZ0RJ57R5WQ35Z80ZK5
title: Learning Path
topic:
  - engineering-levels
  - coding-interviews
  - system-design
  - distributed-systems
  - behavioral-interviews
---

The one path across the six reading orders, from the fundamentals through the four rounds of the
loop — zero to hired, in the order the legs come. Everything below is a link to a reading order that
already exists and stands on its own; this page only says which comes first and why, and hands you off
to each in turn. The vault carries no reading order of its own: `prerequisites` is a graph and there are
no lesson numbers. This is one path through that graph, and where a note disagrees with this page the
note wins.

The shape is **base then rounds**. The senior loop is a coding screen, two coding rounds, a
system-design round, and behaviourals folded in — but recall on the fundamentals comes before any of
them, because a round is where the fundamentals are *spent*, not where they are learned. So the first
half of this path earns the base the loop rehearses on, and the second half rehearses each stage of the
loop against it. The one thing this page will not do is number your readiness or track your progress —
there is nowhere to keep it, and a checklist would imply the app knows something about you that it never
records.

## Read first — the frame

[[what-senior-means-as-a-level]] — the master lens, pulled to the very top so the whole journey inherits
it once. It is the note the system-design and behavioural reading orders each already open with, and it
is here for the same reason they do: "senior" is a claim about **scope and ownership of ambiguity**, not
about how much you know. Everything below is either the fundamentals that make the claim defensible or a
round where it is proved. This is the one place this page links a Lesson directly rather than a reading
order — it earns the exception by being the lens every leg inherits.

## The base — earn the fundamentals recall is built on

1. [[reading-order-for-csharp-fundamentals]] — the language the whole loop is conducted in: where a value
   lives and what an assignment copies, how equality is decided, what a lambda captures, and why a LINQ
   query does nothing until you iterate it. Read first because every other leg assumes you can read and
   reason about the code the rounds are conducted in.
2. [[reading-order-for-concurrency]] — what the runtime does with more than one thing at once: `async`
   over threads, the state machine `await` compiles to, and the ways parallel work corrupts shared state.
   Read after the language because concurrency is the language under load, and a coding round will ask you
   to reason about both at once.
3. [[reading-order-for-databases]] — the relational model, indexing, transactions, and the cost of a
   query. Read last in the base because it is where the fundamentals meet the system: a design round
   leans on knowing what an index buys and what a transaction promises, and a coding round increasingly
   asks it too.

## The rounds — rehearse each stage of the loop

4. [[reading-order-for-the-coding-round]] — big-O and the data-structures-and-algorithms core, the Problem
   bank, and the Lesson on what a coding round is actually grading, sequenced into how the screen and the
   two on-sites are passed. **This reading order is not written yet.** The link renders as a marked,
   unclickable affordance today and goes live the day that Plan is authored, with no edit to this page —
   which is the whole reason this note delegates rather than flattening the six orders into one table.
5. [[reading-order-for-the-system-design-round]] — the 45-minute design conversation and the distributed-
   systems theory under it: CAP and PACELC, consistency models, consensus, and the applied moves that
   spend them on a real prompt. Its companion is [[reading-order-for-api-requests]] — HTTP resilience
   (retries, circuit breakers, timeouts, bulkheads) is design vocabulary a senior *narrates* inside this
   round, a side leg off it rather than a stage of its own, so read it alongside the design order rather
   than after it.
6. [[reading-order-for-the-behavioral-round]] — the leadership round, where the seniority claim the whole
   path opened with is evidenced directly: scope owned, ambiguity absorbed, conflict navigated. Last
   because it is the round that asks you to *prove*, out loud, the thing the frame Lesson defined and the
   five legs before it made defensible.

## The one gap, named

There is no coding-round reading order **yet** — leg 4 is the only unwritten link on this page, and it is
left visible on purpose rather than hidden, so the gap is a thing you are told about rather than a dead
link you trip over. Its ingredients already live in the vault (the big-O and DSA Terms, the Problem bank,
[[the-senior-coding-signal]]); what is missing is the note that sequences them. The day it is authored,
leg 4 lights up here on its own.
