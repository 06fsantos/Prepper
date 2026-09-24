# Decision: topic decomposition and slugs

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Draw the precise boundary between the **two** DDD topics and name their `topic` slugs.

Decide:

- The **slug for each** — names that read both as a topic chip and as a Term title (candidates: `strategic-design` / `tactical-design`; or `bounded-contexts` / `domain-modeling`). Pick one pair and say why.
- A **one-sentence boundary statement** for each, in the style of the database note-map's boundaries ("X is the logical schema … nothing in it is about how rows are stored").
- Edge cases: where does the **anti-corruption layer** sit (it is both a context-map relationship *and* a tactical pattern)? Where do **domain events** sit? Assign each to exactly one topic and state the rule.
- Confirm each topic earns its own **card + cheat sheet** (the split's justification).

Informed by tickets 01 and 02. On resolution, graduate any newly-specifiable fog and record the boundary in the map's Decisions-so-far.

## Answer

Two topics, slugged `strategic-design` and `tactical-design` (Evans's own Part IV / Part II
seam; they name the *containers*, not their most famous members — `bounded-contexts` and
`domain-modeling` were rejected for naming a sub-concept and an ambiguity respectively). Each
reads as both a topic chip and a Term title.

**Boundary statements** (database note-map style — a claim plus a fence):

- **`strategic-design`** is **where the boundaries between models are drawn and how those models
  integrate** — bounded contexts, subdomains, ubiquitous language, and the context-map
  relationship catalogue. Nothing in it is about the objects *inside* a single model.
- **`tactical-design`** is **how a single model is built inside one boundary** — entities vs
  value objects, aggregates and their consistency rules, repositories, and domain events.
  Nothing in it is about *where* the boundary itself is drawn.

**The straddling-concept filing rule:** *strategic = relationships between models/boundaries;
tactical = the objects inside one model.* A concept appearing in both is filed by the question
it primarily answers and cross-linked from the other side, never taught twice.

- **Anti-Corruption Layer → `strategic-design`** (a context-map relationship pattern; its
  code realization is *mentioned* in the strategic note, given no tactical home).
- **Domain Events → `tactical-design`** (published from an aggregate; cross-context integration
  role cross-linked from strategic). Carry the post-2003 provenance flag.

**Cards + cheat sheets:** one each. Two interview moments → two night-before sheets (a strategic
sheet with the context-map catalogue as a lookup table + subdomain triage; a tactical sheet with
entity-vs-VO + the aggregate rules). No merged DDD sheet.
