---
id: 01M1RCBYB3VVRMH8H7XWK1THG1
title: What do senior software engineer interviews test?
date: 2026-09-05
sources:
  - https://www.levels.fyi/blog/swe-level-framework.html
  - https://progression.fyi/about/
  - https://www.aboutamazon.com/about-us/leadership-principles
  - https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon
  - https://www.aboutamazon.com/news/workplace/recruiters-offer-their-best-tips-for-interviewing-at-amazon
  - https://raft.github.io/
  - https://raft.github.io/raft.pdf
  - https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf
  - https://ieeexplore.ieee.org/document/6127847/
  - https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
  - https://www.allthingsdistributed.com/2007/12/eventually_consistent.html
  - https://aws.amazon.com/caching/
  - https://docs.stripe.com/api/idempotent_requests
  - https://stripe.com/blog/idempotency
  - https://brenocon.com/dean_perf.html
  - https://sookocheff.com/post/distributed-systems/unpacking-the-eight-fallacies-of-distributed-computing/
---

This is a Workshop note: it exists so that authoring has somewhere to put an
investigation, and the reader never sees it.

## The question

What is a **senior** software engineer interview actually testing, and how does the senior
bar differ from mid/junior? Which concepts recur across the tracks a senior candidate is
graded on — system design, distributed-systems fundamentals, coding at senior altitude, and
behavioral/leadership — and what does the *level* "senior" mean as a scope claim rather than a
title? Below, every technical claim is chased to the source that owns it; where only a
secondary source exists it is marked as such.

## The short version

The senior interview inverts the junior one. A junior loop rewards *producing a correct
answer*; the senior loop rewards *navigating an under-specified problem* — stating
assumptions, naming trade-offs, and defending a decision under pushback. The same coding
prompt or design prompt is given at multiple levels and graded against different bars: a clean
implementation that passes for a mid-level candidate is a *down-level* signal from a senior
one. This is stated explicitly by the level frameworks below and is the single most useful
lens for the whole vault's senior content.

## Track 1 — What "senior" means as a level (scope, not title)

The most authoritative artifact is a company's **progression framework** (a.k.a. competency
matrix / career ladder), an internal document describing role expectations and how to grow
between them ([progression.fyi/about](https://progression.fyi/about/)). Title labels vary
between companies; the *scope/autonomy/impact* language is the portable part.

The [levels.fyi standardized SWE framework](https://www.levels.fyi/blog/swe-level-framework.html)
draws the mid→senior line clearly:

- **Mid-level** ("Software Engineer"): works on projects *autonomously*; develops and maintains
  *low-to-moderately-complex* components; impact is *meaningful but stays within the team*.
- **Senior**: develops and *owns* moderate-to-complex components; can *lead a small team or
  spearhead a project*; delivers *small projects end-to-end*; and — the defining addition —
  demonstrates *leadership*: mentoring, technical guidance, and design/review of others' work.

The differentiator is not raw coding skill but the **addition of leadership, ownership of
ambiguity, and end-to-end delivery**. Impact widens from "my tasks" to "my team." (Note this
framework places broad org-wide impact at *Staff+*, above senior — a useful boundary so the
vault does not oversell what "senior" requires.)

## Track 2 — System design (the biggest senior differentiator)

System design is where the level gap is most visible: the prompts are deliberately open-ended
and conversational, and the grading is on *process*, not a single right architecture.
Google's own loop, for example, now includes a code-review round (find defects in a few
hundred lines of flawed code) and interviewers routinely *push past* any managed service a
candidate names to test whether they understand what happens *inside* a component rather than
treating it as a black box. The core rubric is problem decomposition (turn a vague problem
into components, surface requirements/constraints/assumptions early) and explicit trade-off
analysis across scalability, reliability, latency, and operational complexity. (Google's
public interview-prep guidance is thin and mostly links out; the process description here is
corroborated by multiple interview-prep write-ups rather than a single first-party rubric page
— treat the *specifics* as **secondary**, the *shape* as well-established.)

The recurring building blocks, each with its owning source:

- **Caching** — a high-speed layer storing a transient subset of data so future requests are
  served faster, typically from RAM; benefits are sub-millisecond reads, IOPS density (one
  cache can replace several DB instances), and hot-spot relief. Freshness is governed by
  **TTLs**. Use cases: database caching, CDN/edge, session store, API-response caching.
  ([AWS: What is caching](https://aws.amazon.com/caching/)).
- **Back-of-envelope estimation** — the senior expectation is to reason from latency orders of
  magnitude, not memorized figures. The canonical reference is Jeff Dean / Peter Norvig's
  "Numbers Everyone Should Know" (L1 ≈ 0.5 ns, main memory ≈ 100 ns, disk seek ≈ 10 ms; a
  single disk seek costs ~40,000 L1 references)
  ([brenocon mirror of Dean's slides](https://brenocon.com/dean_perf.html), **secondary**;
  the numbers are dated — NVMe has collapsed the memory-to-disk gap by orders of magnitude —
  so the *ratios and method* are what to carry, not the absolute values).
- **SQL vs NoSQL / database choice, sharding, replication, consistent hashing** — the
  foundational primary source is the **Dynamo paper**: partition + replicate via *consistent
  hashing*, reconcile with *object versioning* (vector clocks), maintain consistency with a
  *quorum-like* technique, and deliberately *sacrifice consistency under failure* for an
  always-on experience
  ([Dynamo, SOSP 2007](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)).
  It is the blueprint under Cassandra, Riak, and Cosmos DB.
- **API design, idempotency, rate limiting, load balancing, message queues, CDNs** — see the
  idempotency entry under Track 3; the rest are patterns the design rubric expects a candidate
  to *select and justify* rather than recite.

## Track 3 — Distributed-systems fundamentals under the design

These are the theory questions that separate a candidate who *pattern-matches* designs from
one who *reasons* about them.

- **CAP theorem** — Brewer's PODC 2000 conjecture, *proved* by Gilbert & Lynch (2002): a
  distributed system cannot simultaneously guarantee Consistency, Availability, and
  Partition-tolerance; under a partition you choose C or A. They proved a strong result for
  asynchronous networks and a weaker one for partially-synchronous networks
  ([Gilbert & Lynch, MIT](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf)).
- **PACELC** — Abadi's refinement: CAP only covers the partition case. *Else* (no partition),
  a system still trades **Latency vs Consistency**. So: **P**artition → **A**/**C**;
  **E**lse → **L**/**C**. This is the more complete senior framing
  ([Abadi, IEEE Computer 2012](https://ieeexplore.ieee.org/document/6127847/)).
- **Consistency models & eventual consistency** — Werner Vogels frames eventual consistency
  not as *degraded* strong consistency but as a principled trade-off of immediate global
  agreement for availability and latency, and walks the spectrum from strong → session →
  eventual ([Vogels, "Eventually Consistent"](https://www.allthingsdistributed.com/2007/12/eventually_consistent.html)).
- **Consensus (Raft / Paxos)** — Raft is a consensus algorithm designed to be *understandable*,
  "equivalent to Paxos in fault-tolerance and performance," decomposed into **leader election**,
  **log replication**, and **safety** (an agreed decision is final). A 5-node cluster tolerates
  2 failures ([raft.github.io](https://raft.github.io/); paper: Ongaro & Ousterhout, "In
  Search of an Understandable Consensus Algorithm," USENIX ATC 2014,
  [raft.pdf](https://raft.github.io/raft.pdf)).
- **Idempotency** — the property that makes retries safe: repeating a request must not perform
  the operation twice. Stripe's design is the canonical reference: pass an idempotency key
  (a V4 UUID / high-entropy string); the server saves the first response for that key and
  replays it on any retry, including 5xx; keys can be pruned after ~24h; only network/server
  errors should be retried, not validation errors or card declines
  ([Stripe API: idempotent requests](https://docs.stripe.com/api/idempotent_requests);
  [Stripe blog: designing robust APIs with idempotency](https://stripe.com/blog/idempotency)).
- **Fallacies of distributed computing** — the eight naive assumptions: (1) the network is
  reliable, (2) latency is zero, (3) bandwidth is infinite, (4) the network is secure,
  (5) topology doesn't change, (6) there is one administrator, (7) transport cost is zero,
  (8) the network is homogeneous. Origin is oral history (Deutsch, Gosling, Joy/Lyon at Sun,
  early-to-late 1990s); there is no single canonical primary paper, so cite a **secondary**
  compilation ([Sookocheff, "Unpacking the eight fallacies"](https://sookocheff.com/post/distributed-systems/unpacking-the-eight-fallacies-of-distributed-computing/)).

## Track 4 — Coding / DSA at senior altitude

The DSA problems are often the *same* as at junior level; what is graded differs. The senior
signal is: communicating the approach before coding, articulating time/space trade-offs,
enumerating edge cases unprompted, discussing how you'd *test* it, and writing clean,
maintainable code over a clever one-liner. Google's loop making a *code-review* round part of
the process is the clearest institutional expression of this shift from "can you solve it" to
"can you reason about and improve code others wrote" (see Track 2 sourcing caveat — this is
**secondary** for the specifics).

## Track 5 — Behavioral / leadership (heavily weighted at senior)

The best-documented **first-party** rubric here is **Amazon's**.

- **The 16 Leadership Principles** are the explicit evaluation framework: Customer Obsession,
  Ownership, Invent and Simplify, Are Right A Lot, Learn and Be Curious, Hire and Develop the
  Best, Insist on the Highest Standards, Think Big, Bias for Action, Frugality, Earn Trust,
  Dive Deep, Have Backbone; Disagree and Commit, Deliver Results, Strive to be Earth's Best
  Employer, and Success and Scale Bring Broad Responsibility
  ([aboutamazon: Leadership Principles](https://www.aboutamazon.com/about-us/leadership-principles)).
- **The STAR method** (Situation, Task, Action, Result) is Amazon's recommended structure for
  behavioral answers, populated with examples that map to the Leadership Principles
  ([amazon.jobs: interviewing at Amazon](https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon)).
- Amazon's own recruiters add concrete senior-relevant guidance
  ([aboutamazon recruiter tips](https://www.aboutamazon.com/news/workplace/recruiters-offer-their-best-tips-for-interviewing-at-amazon)):
  say **"I," not "we"** ("interviewing is an opportunity to sell yourself"); **quantify
  results** ("we want to know the numbers... how you delivered tangible results"); and prepare
  *specific stories* rather than memorizing the principles.

The senior weighting reflects Track 1: mentorship, driving projects through ambiguity,
handling conflict (Have Backbone; Disagree and Commit), and scope of impact are exactly the
scope-claims that define the level, so the behavioral round is where a candidate proves the
ladder language is true of them.

## The through-line for the vault

Every track above resolves to the same senior signal: **operating under ambiguity and
defending trade-offs**. CAP/PACELC are trade-offs; caching TTLs are a freshness-vs-speed
trade-off; idempotency is a correctness-vs-retry-safety mechanism; STAR + "say I" is proving
you *drove* a decision. Junior interviews ask for the right answer; senior interviews ask why
you chose it and what you gave up. Any senior-track content should lead with the trade-off,
not the definition.

## Dead ends / caveats

- **No single first-party "senior interview rubric" page exists** for Google/Meta. Their
  public pages link out and stay vague; the detailed process descriptions circulate through
  interview-prep firms (secondary). Amazon's Leadership Principles + STAR are the exception —
  genuinely first-party and worth citing directly.
- **Jeff Dean's latency numbers are dated.** Cite the *method and ratios*, never the absolute
  figures, in interview prose.
- The **fallacies of distributed computing** have no canonical primary paper — attribute to
  the Sun engineers as oral history and cite a secondary compilation.
