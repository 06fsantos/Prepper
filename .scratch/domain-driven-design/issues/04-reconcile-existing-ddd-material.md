# Decision: reconcile with existing DDD material

Type: grilling
Status: resolved
Blocked by: 03

## Question

Reconcile the new DDD topic against DDD material already in the repo, and produce the note-map's **"What does not cross"** fence.

Read closely:

- `.scratch/platform-architecture/research/architecture-and-ddd.md` — Workshop research (~440 lines, Fowler/Newman-sourced, applied to the scanner). A **source input**, not rendered content.
- `content/lessons/monolith-to-microservices-modernization.md` — **rendered content** already teaching bounded-context decomposition.
- `content/cheat-sheets/system-design-cheat-sheet.md` and the `system-design` / `distributed-systems` Terms — for existing bounded-context mentions.

Decide:

- What the research note contributes to the strategic half (it may already answer part of it) vs what must be re-derived from ticket 01.
- Which strategic material the **monolith Lesson already teaches**, such that the DDD topic **cross-links rather than re-teaches** — the explicit fence.
- Whether any existing Term needs a new edge into the DDD topics.

Output: the "What does not cross" list for the spec. Record the fence in the map's Decisions-so-far on resolution.

## Answer

Read in full: `monolith-to-microservices-modernization.md` (rendered), `system-design-cheat-sheet.md`
(the monolith bullet, lines 208–229), the `system-design` and `distributed-systems` Terms, and the
Workshop research `platform-architecture/research/architecture-and-ddd.md`. What DDD material already
exists is **narrow, migration-framed, and load-bearing where it sits** — so reconciliation is mostly
a set of fences, not a merge.

### 1. What `architecture-and-ddd.md` contributes vs what re-derives from ticket 01

**It contributes nothing the strategic half needs, and it never crosses as content.** It is Workshop
research (never rendered) applied to the scanner, Fowler/Newman-sourced. Everything it asserts about
strategic DDD — Bounded Context (Fowler-anchored), the Context Map relationship catalogue (Separate
Ways, Customer/Supplier, Shared Kernel, ACL) — is **already in ticket 01's `strategic-design.md`,
sourced more authoritatively to Evans + the DDD Reference**, which the map's standing decision names
as the conceptual authority. Its one genuinely unique asset is a **worked context map for the scanner
domain** (Learning Content ↔ Job Scanning ↔ CV Profile ↔ Matching ↔ Identity, with typed edges). That
is at most an *optional illustration* a strategic Lesson could cite as "a context map from this repo's
own architecture" — never required, never transcribed. Treat it as a **corroborating secondary input**,
not a second source to fold in. Nothing re-derives from it; ticket 01 stands as the strategic sourcing.

### 2. The fence — what the monolith Lesson already teaches, so DDD cross-links rather than re-teaches

`monolith-to-microservices-modernization.md` (topic `system-design`) already teaches, with its own
quiz backing, three things that touch DDD **in a migration frame**:

- **Bounded context** — defined and clozed ("a boundary inside which a model and its language are
  consistent … `Customer` in billing is not `Customer` in shipping").
- **Anti-corruption layer** — defined and clozed, as a translation shim during strangler-fig
  coexistence so the legacy model doesn't leak into the new one.
- **Business-capability seams vs technical layers**, the shared database as the real coupling.

The fence (goes verbatim into the note-map's "What does not cross"):

1. **Strangler fig, modular monolith, MonolithFirst, and the distributed-systems tax do not cross.**
   They are the monolith Lesson's own subject — migration risk management — and belong to
   `system-design`, not to either DDD topic. The DDD Plan or design Problem may *reference* the Lesson;
   neither DDD topic re-tells the migration story.
2. **Bounded context is taught once, canonically, in the DDD strategic topic.** The monolith Lesson's
   inline definition stays as a just-enough gloss for its own argument and **cross-links** to the new
   DDD `bounded-context` note; it is not expanded there and the DDD note is not written to duplicate
   its migration example. Do not author a second full definition.
3. **The ACL's migration-coexistence framing does not cross into DDD.** DDD teaches ACL as a
   *context-map relationship pattern* (a downstream context protecting its model from an upstream one);
   the strangler-coexistence application (legacy-model leak, scaffolding removed after cutover) stays in
   the monolith Lesson, which cross-links to the DDD ACL note. Do not re-tell the legacy-leak story in
   the DDD note.
4. **The system-design cheat sheet's monolith bullet (208–229) stays put, under `system-design`.** It
   keeps its bounded-context/ACL mentions in the migration frame and only gains cross-links to the DDD
   notes. **No DDD content is added to that cheat sheet** — the DDD topics get their own cheat sheets
   (ticket 03: one per topic, no merged DDD sheet).
5. **`architecture-and-ddd.md` does not cross as content** (see §1). Not a second source to fold in.

### 3. Existing Terms / edges into the DDD topics

**No existing Term needs a new *outbound* edge for correctness.** Reconciliation surfaces exactly one
graph change, and it is *inbound* into the DDD topic: the monolith Lesson and the system-design cheat
sheet currently point "bounded contexts" at **`[[distributed-systems]]`**, which is a slightly wrong
target — a bounded context is a DDD strategic concept, not a distributed-systems theorem. Once the DDD
`bounded-context` note exists, those two links should be **re-pointed at it**. The exact form of that
edge (re-point vs. add; whether `system-design` becomes a prerequisite of `strategic-design`, or the
reverse) is **ticket 05's to finalize** (graph placement / prerequisites) — flagged here, not decided,
to keep the ticket boundary clean. It is an authoring-time edit recorded in the manifest (ticket 06),
consistent with "no vault notes are written by this map."

**Net:** the only rendered DDD material in the vault is the monolith Lesson's migration-framed mentions;
they are correct and load-bearing where they sit, so DDD **cross-links into them and re-teaches nothing**,
and the single reconciliation edge is re-pointing two "bounded context" links from `distributed-systems`
to the new DDD note (finalized by ticket 05).
