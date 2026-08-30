# Note map: incorporating `learning-csharp-concurrency`

Status: **phase 3 complete, ready-for-review.** Twenty-one notes on disk — eight Lessons, four
Terms, four cheat sheets, two References, one Problem, one Record — plus the `RESOURCES.md`
additions. `npm run validate` reports **no violations over 53 notes**: the six forward links
that were the authoring queue at the phase-2 gate are all resolved, and nothing is outstanding.
The incorporation is done; the workspace is not to be re-imported.

Source workspace: `../Playground/learning-csharp-concurrency/` — seven HTML lessons (~125KB),
two learning records, a `RESOURCES.md` of eight sources, a `LESSON_PLAN.md` and a
`SENIOR_ENGINEER_SUPPLEMENT.md`. Procedure:
[`docs/agents/incorporating-teaching-workspaces.md`](../../docs/agents/incorporating-teaching-workspaces.md).

Note contracts are **not** restated here. Every agent reads
[`.agents/skills/author/`](../../.agents/skills/author/SKILL.md) directly.

## Topics — four

| `topic` value              | Term file                                       | Title                     |
| -------------------------- | ----------------------------------------------- | ------------------------- |
| `async-await`              | `content/terms/async-await.md`                   | async/await               |
| `dotnet-threadpool`        | `content/terms/dotnet-threadpool.md`             | The .NET thread pool      |
| `concurrency-primitives`   | `content/terms/concurrency-primitives.md`        | Concurrency primitives    |
| `dotnet-memory-allocation` | `content/terms/dotnet-memory-allocation.md`      | Managed memory allocation |

The boundaries, stated once so no agent has to guess:

- `async-await` is **the async programming model** — what the compiler emits, what a suspension
  captures, what it costs, and how awaits compose. It is where a *single* logical operation lives,
  however many awaits it contains.
- `dotnet-threadpool` is **the machine underneath** — who runs a continuation, how many threads
  exist, and what happens when they are all busy. Nothing in it is about the shape of your code.
- `concurrency-primitives` is **choosing between mechanisms** — `Task.Run`, `Thread`, `Channel`,
  `lock`, `SemaphoreSlim`. It is the only topic whose notes answer "which one", not "how does one
  work".
- `dotnet-memory-allocation` is **the heap those allocations land on** — generations, survival,
  and how to read a number.

A five-topic split — pulling `task-composition` out of `async-await` — was considered and refused:
two Lessons and a night-before sheet for something nobody studies apart from the model it composes.
`async-await` carrying eight Lessons is the deliberate consequence, and it is one card on the entry
page rather than two thin ones.

`dotnet-memory-allocation` was *nearly* refused the other way — it holds **one** Lesson. It stays
because the workspace's `MISSION.md` names allocation fluency as a headline goal, and because the
heap is studied on its own terms: the generational model is not a fact about `await`. The cost of
that decision is that its cheat sheet rests on `author`'s habit rather than on any gate — the
validator's drift warning does not fire below two Lessons per topic — so it is the one sheet in
this run the build would not have complained about had it been wrong.

## The map — twenty-one notes

### Lessons (eight)

**One Lesson per source lesson.** The workspace's lessons are already scoped to one argument
each, and re-cutting them across their own section boundaries produced a map of sixteen notes
that argued the same material in different joints. That map is retired. A source lesson splits
only where it has a seam of its own *and* the split lands in a different topic — which happens
exactly twice, both inside source 0004.

| # | Filename | `topic` | `prerequisites` | Source | Phase |
| - | -------- | ------- | --------------- | ------ | ----- |
| 1 | `the-async-state-machine` | `async-await` | — | 0001 whole | **1 ✅** |
| 2 | `capturing-a-synchronization-context` | `async-await` | 1 | 0002 §§1–5, 7 | **1 ✅** |
| 3 | `valuetask-when-it-helps` | `async-await` | 1 | 0003 §§1–6 | **2 ✅** |
| 4 | `composing-tasks-whenall-and-whenany` | `async-await` | 1 | 0005 §§1–9 | **2 ✅** |
| 5 | `thread-pool-scheduling-and-starvation` | `dotnet-threadpool` | 1, 2 | 0004 §§1–5 + 0002 §6 | **2 ✅** |
| 6 | `worker-threads-and-io-completion` | `dotnet-threadpool` | 5 | 0004 §5-IOCP, §6 | **2 ✅** |
| 7 | `concurrency-primitives-compared` | `concurrency-primitives` | 1 | 0006 §§2–6, 10, 11 | **2 ✅** |
| 8 | `allocation-profiling-in-practice` | `dotnet-memory-allocation` | 1 | 0007 §§1–6, 8, 9 | **2 ✅** |

The two splits, both in 0004:

- **§§1–5 (hill climbing, forced changes, thread timeout) stay together** as Lesson 5 — one
  argument about how the pool sizes itself, and the emergency path is only legible next to the
  gradual one.
- **§5-IOCP and §6 (work-stealing) become Lesson 6.** They are about *which* threads exist and
  how work reaches them, not about how many. The source numbers §5 twice, which is the seam
  showing.

0002 §6 (`.Result`/`.Wait()`: deadlock versus starvation) moves **out** of Lesson 2 and into
Lesson 5. It is where the source's own starvation argument lives (0004 §3), and Lesson 2 keeps
the deadlock as the context-capture story it is. Lesson 5 therefore carries two topics'
material and takes a cross-topic prerequisite, which is why Lesson 2 was written in phase 1.

**Prerequisites are root-plus-fan.** Lesson 1 sits under everything: every other note is
downstream of "a suspension is what allocates". Lesson 2 sits under Lesson 5, for the deadlock.
Lesson 6 sits under Lesson 5. Nothing else earns an edge — `concurrency-primitives-compared`
does not take a thread-pool prerequisite though its body links there, because "`Task.Run`
occupies a pool thread and `await` does not" follows from Lesson 1 alone, and topical adjacency
is not dependency.

### References (two) — phase 3 ✅

| Filename | `topic` | Source | Phase |
| -------- | ------- | ------ | ----- |
| `choosing-a-concurrency-primitive` | `concurrency-primitives`, `async-await` | 0006 §§1, 7, 9, 13 | **3 ✅** |
| `diagnosing-thread-pool-symptoms` | `dotnet-threadpool`, `async-await` | 0004 §7 + 0002 §6's diagnosis block | **3 ✅** |

**The rule that keeps a Reference from being a second copy of a Lesson:** a table the source
presents as something to *look up* becomes a Reference, and the Lesson that owns the surrounding
prose does **not** restate it. So 0006's at-a-glance table, decision tree, async-safety table and
quick reference are Reference-only, and Lesson 7 teaches the five primitives one at a time
without a comparison grid. Likewise 0004 §7's symptom table is Reference-only, and Lesson 5
teaches the mechanism that produces those symptoms without tabulating them.

Sections that read as prose stay in their Lesson even when they are lookup-flavoured: 0003 §3's
two decision lists are the argument of Lesson 3, and 0007 §§2–4's tool walkthroughs are the
argument of Lesson 8. Neither is extracted.

`choosing-a-concurrency-primitive` is the note the workspace exists to produce.

### Cheat sheets (four) — phase 2 ✅, one per topic agent

`async-await-cheat-sheet`, `dotnet-threadpool-cheat-sheet`,
`concurrency-primitives-cheat-sheet`, `dotnet-memory-allocation-cheat-sheet`.

Written **once, at the end of each agent's run**, never rewritten per Lesson. Same suspension of
`author/SKILL.md`'s per-Lesson habit the httpclient run used, for the same reason.

### Record (one) — phase 3 ✅

`content/records/0003-csharp-concurrency-incorporated.md` — `0002` is the httpclient
incorporation. Names the workspace, what the incorporation established, and what it did not.
Nothing was written back into `../Playground/`.

## What dissolves, and what does not cross at all

`SENIOR_ENGINEER_SUPPLEMENT.md` is **not a second source**. Its sections were already folded into
the lessons as the numbered "Senior Engineer Depth" H2s — verified heading by heading. Read the
lessons; do not read the supplement as additional material, or the same argument gets authored
twice.

Source 0006 is the one lesson that does not survive whole — it is a synthesis lesson whose spine
is a set of lookup tables, so it splits by note *type* rather than by argument:

| 0006 section | Goes to |
| ------------ | ------- |
| §§1, 7, 9, 13 — at-a-glance table, decision tree, async-safety table, quick reference | Reference `choosing-a-concurrency-primitive` |
| §§2–6 — the five primitives, one section each | Lesson 7, in the source's own order |
| §10 — `TaskCreationOptions.LongRunning` | Lesson 7 — an **extension** of §3: the "too long for a pooled thread" end of the same axis |
| §11 — `async void` | Lesson 7 — the source states it here and it belongs with the primitive it warns about |
| §8 — the crawler | The Problem — `bounded-concurrency-web-crawler`, `kind: system-design`. **3 ✅** |
| §12 — memory barriers, `volatile`, false sharing | **Does not cross.** `MISSION.md` puts it out of scope and the section says so itself; it is four sentences with no source behind it. Re-researching it is a different run |

Source 0002 §4 ("a common misconception") is a **restatement** of §2, not an extension — dedupe it
into Lesson 2's own argument rather than giving it a section.

## The two version-pinned notes

The procedure's first exception applies to two notes, and the second is the sharper hazard.

**Lesson 5, `thread-pool-scheduling-and-starvation`.** Its source is `dotnet/runtime` **on `main`** —
`PortableThreadPool.HillClimbing.cs` and friends. Every constant it names (wave period 4 samples,
gain exponent 2.0, the `AppContext` switch names, `System.Threading.ThreadPool.HillClimbing.Disable`)
is a default in a file that changes under a URL that does not. The note's body must carry, in its
own words: *read from `dotnet/runtime` `main` on <date the agent reads it>*, and must say that these
are configurable defaults rather than guarantees. A permalinked commit SHA in the citation is better
than `main` and the agent should use one.

**Lesson 8, `allocation-profiling-in-practice`.** The 85,000-byte LOH threshold is a
documented default that is itself configurable (`GCLOHThreshold`). State it as a default with its
source and date.

## Claims to soften or drop — the procedure's second exception

The workspace states mechanism confidently, and several of its numbers have nothing behind them.
None of these may become a quiz answer.

**This table is a floor, not a ceiling.** It is what reading the workspace whole turned up; an
agent reading two source lessons closely will find more, and should act on its own finds with the
same authority. The `async-await` agent found three that are not here — see the rows marked *found
in phase 2*, added after the fact so the record is accurate rather than because the table was ever
going to be complete.

| Claim | Where | What to do |
| ----- | ----- | ---------- |
| "adds ~1–2 threads/sec after the 500ms-ish starvation delay" | 0004 §7 | **Drop the numbers.** Keep "injection is gradual and the gate thread's reaction is not instant", which the source code does support |
| "a small thread pool (often 2–4× CPU core count for I/O-bound work)" | 0006 §2 | **Drop.** Uncited, and wrong as a general claim |
| "low hundreds of bytes to a few KB per request" ballpark table | 0007 §7 | **Soften to its point**: async machinery is rarely the dominant allocation in a real endpoint, so measure before converting to `ValueTask`. Drop the numbers |
| "The `WhenAll` task itself is allocated once and cached" | 0005 §2 | **Drop.** Garbled and unsupported by the cited page |
| "sequential awaits avoid one layer of indirection via `WhenAll`'s aggregation" | 0005 §5 | **Soften.** The supportable point is that `WhenAll` changes *where* allocation happens, not how much |
| "a state machine ... often stack-allocated if there are no awaits after the first suspension" | 0006 §2 | **Drop.** Lesson 1 states this correctly; 0006's restatement is wrong |
| Toub's 5M-allocations / 145MB vs ~1000 / ~109KB benchmark | 0001 §3 | **Attribute, do not assert.** These are Toub's measurements of his benchmark, not a current fact about the reader's runtime. "Toub's post measures ..." is the sentence |
| "passing `FetchAsync(1), FetchAsync(2)` straight to `WhenAll` makes them execute sequentially" | 0005 §6 | *Found in phase 2.* **Wrong, and stated emphatically with a ❌/✅ code pair.** Arguments are evaluated before the call, so both are already in flight. The real trap in that shape is a deferred LINQ `Select`, which has started nothing until `WhenAll` enumerates it |
| "call `.Wait()` to see all the exceptions" | 0005 §4 | *Found in phase 2.* **Do not promote a blocking call.** The non-blocking equivalent is the same fact: keep the composed task, `await` it in a `try`, then read `all.Exception.Flatten().InnerExceptions` |
| "the fast path still allocated a `Task`" | 0003 §1 | *Found in phase 2.* **Overstated.** The builder caches completed tasks for a small set of values (`true`/`false`, small ints, `null`), so "generally allocates one" with the cache named is the honest sentence |

## Cross-links to what is already in the vault

`MISSION.md` says to cross-link the httpclient workspace rather than repeat it, and that vault
material now exists. Body links only — no `topic` or `prerequisites` edge crosses between the two
workspaces:

- Lesson 6 (`worker-threads-and-io-completion`) is why an async `HttpClient` call scales past the
  worker count → link `[[httpclient]]`.
- Lesson 4 (`composing-tasks-whenall-and-whenany`) on bounding large fan-out → link `[[bulkheads-and-blast-radius]]`.
- Lesson 5 (`thread-pool-scheduling-and-starvation`) → link `[[httpclient-connection-lifetime]]`
  only if the argument actually needs it; adjacency is not a reason.

Keep every `[[...]]` on one line. A wikilink wrapped across a line break is not a link and nothing
warns.

## Ownership in phase 2

| Agent | Writes |
| ----- | ------ |
| `async-await` | Lessons 3, 4 + `async-await-cheat-sheet` |
| `dotnet-threadpool` | Lessons 5, 6 + `dotnet-threadpool-cheat-sheet` |
| `concurrency-primitives` | Lesson 7 (**including 0006 §11, `async void`, handed over from `async-await`**) + `concurrency-primitives-cheat-sheet` |
| `dotnet-memory-allocation` | Lesson 8 + `dotnet-memory-allocation-cheat-sheet` |

**One ambiguity, settled.** Lesson 5, `thread-pool-scheduling-and-starvation`, takes 0002 §6 from a
source lesson the `async-await` agent otherwise owns, and takes Lesson 2 as a cross-topic
prerequisite. It is owned by the **`dotnet-threadpool` agent**: the deadlock is the hook, but the
argument is that blocking a pool thread costs you the pool. The `async-await` agent neither writes
it nor waits for it, and may link it from its cheat sheet regardless — a body wikilink to an
unwritten note is a warning, not an error, and it resolves by the end of phase 2.

`async-await` also gives up 0006 §11 (`async void`) to the `concurrency-primitives` agent, for the
same reason in the other direction: the source states it where the primitive it warns about is
introduced.

**The general rule behind both, learned the second time it came up:** *anything about blocking on a
task belongs to `dotnet-threadpool`, wherever in the sources it appears.* 0002 §6 is the obvious
case and the map settled it in advance; 0005 §4's `.Wait()` recommendation is the same collision
inside a source lesson `async-await` otherwise owns entirely. Other agents route around such
material rather than teaching it, and link to it if they need it.

**Calibration slice:** run the `async-await` agent alone first and correct
`incorporating-teaching-workspaces.md` against what it gets wrong before forking the other three.
It is the slice that exercises the risky mechanics — a cheat sheet written last rather than after
each Lesson, a source lesson whose prose is one long callback chain ("Lessons 0001–0003 established
..."), a source lesson that gives a section away to another agent, and the drop-these-claims table.

Because the calibration slice runs alone, it works **in the main tree**. Worktrees isolate agents
from each other and there is nothing to isolate it from; the three that fan out afterwards get one
each.

## Phase 1's deliverables

1. This map. ✅
2. Four Terms — `async-await`, `dotnet-threadpool`, `concurrency-primitives`,
   `dotnet-memory-allocation`. Bodies are a sentence or two — the Term page's real content is
   the generated index, per `TERM-FORMAT.md`.
3. `RESOURCES.md` — a new `### C# concurrency and allocation in .NET` subsection carrying the
   workspace's eight sources, plus its one live gap (no community sourced for real-world
   concurrency debugging wisdom) under **Gaps**.
4. Lessons 1 and 2 — the two notes that are prerequisites of Lessons in *other* topics
   (1 for all three, 2 for Lesson 11).

All four are done. Then stop. The dev reviews.

## Open items for the dev

1. **The httpclient incorporation is still uncommitted.** Nineteen notes plus
   `docs/agents/incorporating-teaching-workspaces.md` are untracked on `main` at the phase-3 review
   gate. This run adds to the same working tree; committing that diff first would keep the two
   incorporations reviewable apart.
2. **Lesson 5's source is a moving URL.** See "The two version-pinned notes". If a permalinked SHA
   cannot be had, the note should say plainly that it describes an implementation detail and not a
   contract.
3. **`dotnet-concurrency-playground` is referenced by source 0007** as the home of a runnable
   `AllocationBenchmarks.cs`. It is a sibling workspace, not vault material; Lesson 8 describes
   what to measure and does not link out to a path the reader does not have.

## Sibling material, not incorporated

`../Playground/CopilotContext/research/concurrency-lesson-plan-topics.md` is cited by the
workspace's `LESSON_PLAN.md` as the research that resolved its two sourcing gaps. It stays put; the
two sources it produced (the `dotnet/runtime` files and MS Learn's GC fundamentals) are already
among the eight going into `RESOURCES.md`. `MISSION.md`, `NOTES.md`, `LESSON_PLAN.md`,
`SENIOR_ENGINEER_SUPPLEMENT.md` and `learning-records/` stay in the workspace.
`learning-records/` is read for the phase-3 Record and never imported.
