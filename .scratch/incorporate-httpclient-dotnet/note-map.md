# Note map: incorporating `learning-httpclient-dotnet`

Status: phase 3 complete, ready-for-review. All nineteen notes are on disk and
`npm run validate` reports no violations over 33 notes.

Source workspace: `../Playground/learning-httpclient-dotnet/` — ten HTML lessons (~127KB),
seven learning records, a `RESOURCES.md` of eleven sources. Procedure:
[`docs/agents/incorporating-teaching-workspaces.md`](../../docs/agents/incorporating-teaching-workspaces.md).

Note contracts are **not** restated here. Every agent reads
[`.agents/skills/author/`](../../.agents/skills/author/SKILL.md) directly.

## Topics — three

| `topic` value         | Term file                            | Title                |
| --------------------- | ------------------------------------ | -------------------- |
| `httpclient`          | `content/terms/httpclient.md`        | HttpClient           |
| `http-resilience`     | `content/terms/http-resilience.md`   | HTTP resilience      |
| `distributed-tracing` | `content/terms/distributed-tracing.md` | Distributed tracing |

A `retry` / `circuit-breaker` / `bulkhead` / `hedging` split was considered and refused: eight
cards on the entry page and eight night-before sheets, none of them worth reading alone, for
one subject the dev sits down to study as one subject.

`httpclient` is deliberately the mechanism topic (lifetime, pooling, handler ownership,
timeouts) and `http-resilience` the pattern topic (retry, breaker, bulkhead, hedging,
idempotency, composition). The boundary is *what the client does* versus *what you wrap around
the call*.

## The map — nineteen notes

### Lessons (nine)

| # | Filename | `topic` | `prerequisites` | Source | Phase |
| - | -------- | ------- | --------------- | ------ | ----- |
| 1 | `httpclient-connection-lifetime` | `httpclient` | — | 0001 | **1** |
| 2 | `retry-versus-circuit-breaker` | `http-resilience` | 1 | 0002 + 0010 shards, `Retry-After` | 2 |
| 3 | `total-versus-per-attempt-timeouts` | `httpclient`, `http-resilience` | 1 | 0003 | 2 |
| 4 | `hedging-against-tail-latency` | `http-resilience` | 1 | 0004 | 2 |
| 5 | `bulkheads-and-blast-radius` | `http-resilience` | 1 | 0005 + 0010 per-dependency section | 2 |
| 6 | `idempotency-and-safe-retries` | `http-resilience` | 1 | 0006 | 2 |
| 7 | `trace-context-across-retries` | `distributed-tracing` | 1 | 0007 (first half) + 0010 pitfalls | 2 |
| 8 | `tracing-hedged-attempts` | `distributed-tracing` | 1 | 0007 (second half) + 0010 problem 5 | 2 |
| 9 | `composing-a-resilience-pipeline` | `http-resilience` | 1, 2, 3 | 0008 | 2 |

**Prerequisites are root-plus-fan.** The lifetime Lesson sits under everything, because every
pattern is layered on a client whose pooling is already correct. The composition Lesson sits
under retry/breaker and timeouts, because it is about the order those two go in. Nothing else
earns an edge — topical adjacency is not a prerequisite, and the graph would become a mesh if
it were.

### References (two) — phase 3

| Filename | `topic` | Source |
| -------- | ------- | ------ |
| `standard-resilience-handler-defaults` | `httpclient`, `http-resilience` | defaults scattered through 0002 / 0003 / 0008 |
| `choosing-a-resilience-pattern` | `http-resilience` | 0010's pattern-synthesis section |

Both span topics, so no single topic agent owns them — hence phase 3.

`standard-resilience-handler-defaults` is the **version-pinned** note. It carries, in its own
body: *defaults verified against `Microsoft.Extensions.Http.Resilience` / Polly **v8.7.0** on
**2026-08-27***. Every number in it (retry 3 attempts / 2s base / exponential + jitter; breaker
10% failure ratio / 100 minimum throughput / 30s sampling / 5s break; rate limiter 1,000
concurrent permits, queue 0; total timeout 30s; per-attempt timeout 10s) comes from that
verification, recorded in the workspace's own learning record 0002. A table of numbers with a
link to docs that no longer say them is how a vault starts asserting something false.

### Problem (one) — phase 3, via `/import`

`content/problems/payment-status-polling-client` — `kind: system-design`, from source 0009.
`practices` points at Lessons 2, 3, 6 and 9. Written by `/import`, never by `/author`.

### Cheat sheets (three) — phase 2, one per topic agent

`httpclient-cheat-sheet`, `http-resilience-cheat-sheet`, `distributed-tracing-cheat-sheet`.

Deliberately **not** written in phase 1, even though `author` prefers writing a sheet with a
topic's first Lesson: a sheet written against one Lesson and rewritten twenty minutes later is
not the same as one derived from the finished topic. Each topic agent writes its own, once, at
the end of its run. Only one agent per topic ever touches a sheet, which is what makes
"rewrite, never append" an invariant inside one agent rather than a race between several.

### Record (one) — phase 3

`content/records/0002-<slug>` — names the workspace, what the incorporation established, and
what it did not. This is what marks the workspace done; nothing is ever written back into
`../Playground/`.

## What dissolves

Source 0010, "Advanced considerations", is a grab-bag and does not become a note. Each section
folds into the Lesson whose argument it extends:

| 0010 section | Goes into |
| ------------ | --------- |
| Sharded dependencies, per-shard breaker | Lesson 2 |
| Accelerated circuit breaking, `Retry-After` | Lesson 2 |
| Per-dependency bulkheads | Lesson 5 |
| App Insights registration order; gRPC client-factory pitfall | Lesson 7 |
| Hedging and correlation context (the open gap) | Lesson 8 — **restatement, not extension**: Problem 5 is 0007's second half in five lines and adds no fact. Dedupe; take only its framing that the hole is in the documentation |
| Pattern synthesis | Reference `choosing-a-resilience-pattern` |

## Ownership in phase 2 — the one ambiguity, settled

Lesson 3, `total-versus-per-attempt-timeouts`, carries **two** topics, so two agents would
otherwise both claim it. It is owned by the **`http-resilience` agent**: its argument is why
one flat timeout cannot serve a pipeline that retries.

The `httpclient` agent does not write it and does not wait for it. Its cheat sheet may link
`[[total-versus-per-attempt-timeouts]]` regardless — a body wikilink to an unwritten note is a
warning, not an error, and by the end of phase 2 it resolves. `topic` and `prerequisites` are
the fields that would have been an error, and neither of them is involved.

Agent assignment:

| Agent | Writes |
| ----- | ------ |
| `httpclient` | `httpclient-cheat-sheet` only — Lesson 1 landed in phase 1, Lesson 3 belongs to the other agent |
| `http-resilience` | Lessons 2, 3, 4, 5, 6, 9 + `http-resilience-cheat-sheet` |
| `distributed-tracing` | Lessons 7, 8 + `distributed-tracing-cheat-sheet` |

**Calibration slice:** run the `http-resilience` agent alone first, and correct
`incorporating-teaching-workspaces.md` against what it got wrong before forking the other two.
It is the slice that exercises both risky mechanics — a cheat sheet rewritten rather than
appended across six Lessons, and sequential prose (0002's "callback to lesson 0001") cut into a
prerequisite edge.

The `httpclient` agent's job is small enough that it could be folded into phase 3 instead.
Keeping it as an agent keeps "one topic, one owner, one sheet" true without exception.

## Open items for the dev

1. **The source contradicts itself on hedging and unsafe HTTP methods — SETTLED 2026-08-30.**
   Lesson 0004 says .NET's standard hedging handler *auto-excludes*
   `POST`/`PUT`/`PATCH`/`DELETE`/`CONNECT`; lesson 0006 and the workspace's `RESOURCES.md` say
   it does not, and that `DisableForUnsafeHttpMethods()` is the lever.

   **Both are wrong**, and the second is the more dangerous because it names a real API. Checked
   against the `Microsoft.Extensions.Http.Resilience` namespace reference:
   `DisableForUnsafeHttpMethods()` lives on `HttpRetryStrategyOptionsExtensions` — the only
   `DisableFor*` extensions class in the namespace — so it governs **retries**. There is no
   `HttpHedgingStrategyOptionsExtensions`, and the sole hedging predicate class,
   `HttpClientHedgingResiliencePredicates`, exposes only `IsTransient`. The standard hedging
   handler hedges whatever is sent through it and offers no method-based exclusion.

   What the vault states: keeping duplicate writes off the wire is a **routing decision** — the
   hedged client gets the read paths — not a handler flag. `hedging-against-tail-latency` says
   this; any later note touching it must too. The root `RESOURCES.md` gap entry is struck and the
   namespace reference added as a source.

2. **`/author reference` takes a research note, and there is none here.** `REFERENCE-FORMAT.md`
   makes a Reference the output of promoting a `content/research/` note. The incorporation
   procedure assigns References to phase 3 with the workspace lessons as their input instead.
   Followed as written; flagging that the two documents differ on what a Reference's input is.

3. **`docs/agents/incorporating-teaching-workspaces.md` is currently untracked.** It should be
   committed with the phase-1 diff, since it is the procedure this run is executing.

## Sibling material, not incorporated

`../Playground/CopilotContext/research/httpclient-best-practices.md` and
`.../httpclient-distributed-systems-patterns.md` are cited by the workspace lessons. They stay
put; their two source URLs are already among the eleven going into `RESOURCES.md`.
`MISSION.md`, `NOTES.md` and `learning-records/` stay in the workspace. `learning-records/` is
read for the phase-3 Record and never imported.
