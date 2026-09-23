# Where do the new notes attach in the vault?

Type: grilling
Status: resolved

## Question

The new notes must slot into a vault where **type is the directory** and every note is filed
under topics, with `prerequisites`/`topic` edges forming the graph. Decide the structural home
for the gap notes **before** authoring, so the graph stays coherent and the notes are reachable:

- Do event sourcing, CQRS, Cosmos DB, Service Bus, OAuth, and modernization attach to **existing
  topics** (e.g. `distributed-systems`, `databases`, `http-and-resilience`, `system-design`) or
  do any warrant a **new topic**?
- Does the **reinsurance domain** — which has no analog in a technical vault — get a topic of its
  own, and is a domain primer even a Lesson (vs a Reference)?
- Does the **AI/ML** material get a topic, and how does it relate to the R&D-mandate behavioural angle?
- What **note types** does each gap want (Lesson vs cheat-sheet vs Reference vs Term), given the
  fluency bar?
- Is there a single new **"Arch Re prep" Plan** that threads new + existing notes (ticket 11), and
  does that Plan need its own topic membership or ride existing ones?

Resolution: a decision on topic membership + note type per gap, enough that tickets 04–10 each
know exactly what file(s) they mint. Call `grilling` + `domain-modeling`.

## Answer

**Mechanics established:** a topic *is* a Term note. Nesting is a child Term carrying
`topic: <parent-slug>` (e.g. `hash-maps` → `data-structures-and-algorithms`; every DB sub-topic
carries `topic: databases`, and `databases` itself is a top-level Term with no `topic:`). A new
topic therefore means authoring a **new Term** plus the content note(s) filed under it. Single-note
topics are already normal in the vault (`trees`, `heaps`, `numeric-types`), so a thin new topic is
fine.

**Per-gap decision (type + topic):**

| Gap | Type | `topic:` field | New Term to mint |
| --- | --- | --- | --- |
| Event sourcing + CQRS (04) | Lesson | `system-design`, `distributed-systems` | — |
| Cosmos DB (05) | Lesson | `nosql-databases`, `distributed-systems` | **`nosql-databases`** (`topic: databases`) |
| Service Bus / messaging (06) | Lesson | `system-design`, `distributed-systems` | — |
| OAuth / OIDC / JWT (07) | Lesson | `authentication-and-authorization` | **`authentication-and-authorization`** (top-level) |
| Monolith → microservices (08) | Lesson | `system-design` | — |
| AI/ML in reinsurance (09) | Lesson | `applied-ai` | **`applied-ai`** (top-level) |
| Reinsurance domain (10) | **Reference** | `reinsurance` | **`reinsurance`** (top-level) |

**Net manifest:** 4 new Terms + 6 Lessons + 1 Reference + 1 Plan.

**Term minting is folded into the note ticket that needs it:** 05 mints `nosql-databases`, 07 mints
`authentication-and-authorization`, 09 mints `applied-ai`, 10 mints `reinsurance` — each authors its
parent Term alongside its content note (both via `/author`).

**Q2 changed from the recommendation:** a dedicated **`nosql-databases`** topic (child of `databases`)
rather than filing Cosmos directly under `databases`, to leave room for the topic to grow beyond one
store.

**Q4 changed from the recommendation:** the reinsurance primer is a **Reference** (distilled
fact/vocabulary sheet), not a Lesson — the domain is lookup-shaped vocabulary rather than a taught
tradeoff.

**Plan (11):** carries every touched topic in its `topic:` field (the four new Terms + the existing
topics it threads) so it surfaces in each topic card; **not `featured`** — the mission's own featured
Plan keeps the entry-page band's lead.

**No new topic for the Azure event-driven cluster** (Q1): the vault stays stack-agnostic; Azure is the
concrete instantiation *inside* each Lesson, and the patterns attach to `system-design` /
`distributed-systems`.
