# Note map: authoring the senior-interview path

Status: **complete — all 17 items authored. Remaining: commit the diff, then write the closing Record (`content/records/0005-…`) per "When the queue is empty" below.** This is the authoring queue for the
research note
[`content/research/what-do-senior-software-engineer-interviews-test.md`](../../content/research/what-do-senior-software-engineer-interviews-test.md).
The vault already covers the coding fundamentals the mission asks for (C# types, DSA basics,
concurrency, databases). What the research note surfaces and the vault has **no coverage of**
is the rest of the senior loop: the seniority frame, system design, distributed-systems
theory, and the behavioral round. That is this queue.

## How to run this

Run **one item at a time, top to bottom.** Each item is a single `/author` invocation — you
never have to decide what is next, you take the first unchecked box.

```
"author the next item in the senior interview path"   →  the first [ ] below
```

After each run:

1. Paste the `/author …` command shown for the item.
2. Let `npm run validate` pass (the skill does this; unwritten-link *warnings* are fine and
   expected — they are later items in this queue filling the todo list).
3. Tick the box here, then read the diff and commit. The next item is the next unchecked box.

**What each item drags in is not a separate box.** A Lesson authors up to four notes in one
run — the Lesson, the **Term** for each topic it claims (minted as a stub if absent), and the
topic's **cheat sheet** (created with the first Lesson on a topic, rewritten by every Lesson
after). So the first Lesson under a new topic quietly creates the Term and the cheat sheet
too; you do not queue those separately. Reference and Plan items are their own single runs.

Contracts are not restated here — every run reads
[`.agents/skills/author/SKILL.md`](../../.agents/skills/author/SKILL.md) and the FORMAT docs
directly. Sources are already gathered in the research note; each item names the ones that own
its claims.

## The topics — five, in prerequisite order

Ordering matters because `prerequisites` can only point **backwards** and a `topic` must name
a Term that already exists. So the queue lays the framing and the theory down first, then the
applied design that links back to them.

| # | `topic` value           | What it is                                                                 |
| - | ----------------------- | ------------------------------------------------------------------------- |
| A | `engineering-levels`    | What "senior" means as a **scope claim**, not a title — the master lens.   |
| B | `distributed-systems`   | The **theorems and impossibility results** under any design: CAP, PACELC, consistency, consensus, the fallacies. Language-agnostic theory. |
| C | `system-design`         | The **interview craft and building blocks**: decompose a vague prompt, estimate, and select/justify components. Applied, and links back to B. |
| D | `coding-interviews`     | Why the *same* DSA problem is graded differently at senior altitude.       |
| E | `behavioral-interviews` | The leadership round — Amazon's LPs as the first-party rubric, and STAR.    |

Boundaries, stated once so no run has to guess:

- **B `distributed-systems` vs C `system-design`.** B is *why you cannot have everything and
  what each guarantee costs* — theorems, models, consensus. C is *how to run the 45-minute
  design conversation and which component to reach for* — decomposition, estimation, caching,
  sharding. When a design Lesson needs "under a partition you pick C or A", it **links to** the
  CAP Lesson rather than re-teaching it.
- **D `coding-interviews`** does **not** add DSA. The algorithms are already in the vault
  (`big-o-notation`, `hash-maps`, `stacks`, the Problems). D is the single meta-Lesson on the
  *graded signal* — narrate before coding, state trade-offs, enumerate edge cases, discuss
  tests, review others' code.
- **Idempotency is already authored** (`content/lessons/idempotency-and-safe-retries.md`, under
  `http-resilience`). The distributed-systems Lessons should **link `[[idempotency-and-safe-retries]]`**
  as the retry-safety mechanism, never re-author it.

---

## Phase A — the senior frame `engineering-levels`

- [x] **1. Lesson — What "senior" means: scope, not title.** The mid→senior line as a scope /
      autonomy / impact claim; "senior" adds leadership, ownership of ambiguity, and end-to-end
      delivery; broad org-wide impact is *Staff+*, above senior. This is the master lens every
      other note leads with, so it is authored first and later Lessons take it as a prerequisite.
      *Drags in:* Term `engineering-levels` + its cheat sheet.
      *Sources:* levels.fyi SWE framework, progression.fyi.
      ```
      /author lesson What "senior" means as a level — scope, autonomy, and impact, not a title (topic: engineering-levels)
      ```

## Phase B — distributed-systems fundamentals `distributed-systems`

- [x] **2. Lesson — The CAP theorem.** Under a partition you guarantee at most two of
      Consistency, Availability, Partition-tolerance; Brewer's conjecture, proved by Gilbert &
      Lynch. The root of the topic — authored first so the rest can prerequisite it.
      *Drags in:* Term `distributed-systems` + its cheat sheet.
      *Sources:* Gilbert & Lynch (MIT).
      ```
      /author lesson The CAP theorem — under a partition you choose consistency or availability (topic: distributed-systems)
      ```
- [x] **3. Lesson — PACELC: the trade-off CAP leaves out.** Else (no partition) a system still
      trades Latency vs Consistency. `prerequisites: [the-cap-theorem]`.
      *Sources:* Abadi, IEEE Computer 2012.
      ```
      /author lesson PACELC — even without a partition, latency versus consistency (topic: distributed-systems)
      ```
- [x] **4. Lesson — Consistency models and eventual consistency.** The spectrum strong →
      session → eventual, framed as a principled trade-off, not degraded strong consistency.
      `prerequisites: [the-cap-theorem]`.
      *Sources:* Vogels, "Eventually Consistent".
      ```
      /author lesson Consistency models — from strong to eventual, and why eventual is a choice (topic: distributed-systems)
      ```
- [x] **5. Lesson — Consensus with Raft.** Leader election, log replication, safety; a 5-node
      cluster tolerates 2 failures; equivalent to Paxos but understandable.
      *Sources:* raft.github.io, Ongaro & Ousterhout (raft.pdf).
      ```
      /author lesson How a cluster agrees — consensus with Raft (topic: distributed-systems)
      ```
- [x] **6. Lesson — The eight fallacies of distributed computing.** The naive assumptions
      (network reliable, latency zero, …) and what each one breaks. Link
      `[[idempotency-and-safe-retries]]` as the answer to "the network is *not* reliable".
      *Sources:* Sookocheff compilation (secondary — no canonical primary paper; attribute to
      the Sun engineers as oral history).
      ```
      /author lesson The eight fallacies of distributed computing (topic: distributed-systems)
      ```

## Phase C — system design `system-design`

- [x] **7. Lesson — The design interview is graded on process, not architecture.** Decompose a
      vague prompt into components; surface requirements/constraints/assumptions early; make the
      trade-off analysis explicit (scalability, reliability, latency, operational complexity).
      The root of the topic. `prerequisites: [what-senior-means…]`.
      *Drags in:* Term `system-design` + its cheat sheet.
      *Sources:* research note Track 2 (shape well-established; specifics secondary).
      ```
      /author lesson System design is graded on process — decomposition and trade-offs, not one right architecture (topic: system-design)
      ```
- [x] **8. Lesson — Back-of-envelope estimation.** Reason from latency *ratios and method*, not
      memorized figures (Dean's numbers are dated — carry the ratios, drop the absolutes).
      *Sources:* Dean/Norvig "Numbers Everyone Should Know" (secondary mirror).
      ```
      /author lesson Back-of-envelope estimation — reason from latency ratios, not memorized numbers (topic: system-design)
      ```
- [x] **9. Lesson — Caching and the freshness trade-off.** A high-speed subset in RAM: sub-ms
      reads, IOPS density, hot-spot relief; freshness governed by TTLs; DB / CDN / session /
      API-response uses. Lead with the freshness-vs-speed trade-off.
      *Sources:* AWS "What is caching".
      ```
      /author lesson Caching and TTLs — trading freshness for speed (topic: system-design)
      ```
- [x] **10. Lesson — Partitioning, replication, and consistent hashing.** The Dynamo blueprint:
      consistent hashing to partition + replicate, object versioning to reconcile, quorums,
      and sacrificing consistency under failure for availability. Link back to
      `[[the-cap-theorem]]` and `[[consistency-models…]]`.
      `prerequisites: [the-cap-theorem, consistency-models…]`.
      *Sources:* Dynamo paper (SOSP 2007).
      ```
      /author lesson Partitioning, replication, and consistent hashing — the Dynamo blueprint (topic: system-design)
      ```
- [x] **11. Reference — System-design building blocks.** The lookup surface the rubric expects
      you to *select and justify*: load balancing, rate limiting, message queues, CDNs, API
      design. A comparison/selection table, not a Lesson — looked up repeatedly.
      *Sources:* research note Track 2/3.
      ```
      /author reference System-design building blocks — load balancing, rate limiting, queues, CDNs (topic: system-design)
      ```

## Phase D — coding at senior altitude `coding-interviews`

- [x] **12. Lesson — The senior coding signal.** Same DSA, different bar: communicate the
      approach before coding, articulate time/space trade-offs, enumerate edge cases unprompted,
      discuss how you'd test it, prefer maintainable over clever — and the code-review round as
      the institutional form of this shift. Link the existing DSA notes
      (`[[big-o-notation]]`, `[[hash-maps]]`). `prerequisites: [what-senior-means…]`.
      *Drags in:* Term `coding-interviews` + its cheat sheet.
      *Sources:* research note Track 4 (secondary for specifics).
      ```
      /author lesson The senior coding signal — narrate, trade-off, edge-case, and test, not just solve (topic: coding-interviews)
      ```

## Phase E — the behavioral round `behavioral-interviews`

- [x] **13. Lesson — The behavioral round proves the ladder.** Amazon's 16 Leadership Principles
      as the explicit rubric; the senior weighting (mentorship, ambiguity, Have Backbone /
      Disagree and Commit) mirrors the scope claims of Phase A; recruiter guidance — say **"I,"
      not "we"**, and **quantify results**. `prerequisites: [what-senior-means…]`.
      *Drags in:* Term `behavioral-interviews` + its cheat sheet.
      *Sources:* aboutamazon Leadership Principles, aboutamazon recruiter tips.
      ```
      /author lesson The behavioral round proves the ladder — leadership principles, say "I", quantify (topic: behavioral-interviews)
      ```
- [x] **14. Lesson — The STAR method.** Situation, Task, Action, Result as the structure for a
      behavioral answer, each story mapped to a Leadership Principle. Prepare specific stories,
      don't memorize the principles.
      *Sources:* amazon.jobs "interviewing at Amazon".
      ```
      /author lesson The STAR method — structuring a behavioral answer (topic: behavioral-interviews)
      ```
- [x] **15. Reference — Amazon's 16 Leadership Principles.** The list itself, one line each — a
      lookup you scan, not prose you compress.
      *Sources:* aboutamazon Leadership Principles.
      ```
      /author reference Amazon's 16 Leadership Principles (topic: behavioral-interviews)
      ```

## Phase F — the reading orders (author LAST)

A Plan orders **notes that already exist**, so these run only after the Lessons above are on
disk. Each is one `/author plan` run.

- [x] **16. Plan — reading order for the system-design round.** A path through Phases B and C:
      the frame, then the theorems, then the applied building blocks.
      ```
      /author plan reading order for the system-design round (topics: system-design, distributed-systems, engineering-levels)
      ```
- [x] **17. Plan — reading order for the behavioral round.** Phase A → the LP rubric → STAR →
      the LP reference.
      ```
      /author plan reading order for the behavioral round (topics: behavioral-interviews, engineering-levels)
      ```

---

## When the queue is empty

Every box ticked, `npm run validate` clean, and the diff committed — write a Record
(`content/records/0005-…`) capturing that the senior-interview path landed, the way the four
`incorporate-*` efforts each closed with a Record. Then this file is done and the research
note has been fully drawn into the Library.
