# Design the matching ladder

Type: grilling
Status: resolved
Blocked by: 05, 06, 10

## Question

Design the Matching context's scoring in detail — how a `Role` and the `CandidateProfile`
become a `Match`. The `Match` shape and the `Method` stages are fixed (ticket 04); this
decides the actual ladder.

Settle:

- The **rules stage**: how canonical `Technology` overlap, seniority, and location produce
  the deterministic baseline `Score`, and how `Preferences` hard-filters prune first.
- The **embedding stage**: what text is embedded (Role vs profile), the similarity metric,
  and how it combines with the rules score — using the provider chosen in ticket 10.
- The **LLM re-rank**: the top-N cutoff, the prompt, the structured `Score`+`Rationale`
  output, and the cost gate that keeps it off the long tail.
- What fills `Match.Breakdown` (the per-signal JSON) at each stage.

## Context

- Call `grilling` + `domain-modeling`; the `Matching ladder` term is seeded in `scanner/CONTEXT.md`.
- Blocked by the profile (05), the scaffold (06), and the provider research (10).
- Blocks ticket 12 (the build runs this ladder).

## Answer

**v1 is the rules rung only.** The owner scrolls the ranked shortlist and decides by hand,
so the `Score`'s job is to **rank and filter**, never to decide — which makes the LLM
re-rank (scoring the owner then redoes by eye) overkill. Embeddings and the LLM re-rank stay
**designed-but-deferred** rungs; the `Match` shape (ticket 04) already records them
(`Method.Embedding`/`Llm`, `Rationale`, nullable `Breakdown`, `Role.Embedding` BLOB), so
adding them later needs no migration. The trigger to graduate the **embedding** rung is
roles whose *prose* implies a fit their tags don't (an untagged "systematic trading platform
in C#"); the **LLM** rung only if manual triage stops scaling.

Consequences: no top-N cutoff and no cost gate (nothing expensive to gate) — rank **all**
post-filter survivors. `Method` is always `Rules` in v1. Zero API keys, zero network, fully
unit-testable.

**The ladder, settled:**

1. **Hard filter (fail-open, prune before scoring).** Prune only on a *confident* violation:
   seniority `known && ≤ Junior` (Junior/Intern), or a *confidently* non-UK location. **Kept:**
   `Seniority.Unknown`, `Mid`, and plainly-titled roles ("Software Engineer" is often a senior
   role by another name); unparseable locations; any remoteness (`remoteness: null`). A pruned
   role gets **no `Match` row**. — Note this splits the profile's `seniorityFloor: Senior`: the
   floor is now a **soft scoring target**, not the hard cut (which sits lower, at ≤ Junior).

2. **Input seam.** Matching stays sealed (`by id only`). The scan orchestrator (`Cli`/
   `Infrastructure`) loads `Role` + `CandidateProfile` + the owning company's industry tags and
   hands Matching read-only value records (`RoleView`/`ProfileView`); `Match` persists **ids
   only**. The ladder is thus unit-testable against plain value objects, and the industry signal
   crosses the JobScanning→Matching boundary without navigation.

3. **Rules formula — a deterministic 0–100, and (v1) the entire ranker:**
   - **Technology overlap (50)** — weighted overlap of `Role.Technologies` vs profile
     `technologies`, **primary** (`csharp`/`dotnet`/`sql-server`) weighed ~2× secondary.
   - **Seniority proximity (20)** — exact band full, decays with distance from the
     `seniorityFloor` target; `Unknown` → neutral mid, never zero.
   - **Industry (20)** — company tags ∩ profile `industries`; `hedge-fund`/`systematic-finance`
     above broad `financial-services`.
   - **Preferred-tech bonus (10)** — presence of `preferredTechnologies`.
   - **Weights are configuration, not constants** — with no LLM behind it this formula *is* the
     ranking, so it must be tunable against real scan output.

4. **`Rationale` + `Breakdown` without an LLM.** One computation yields both: `Breakdown` is the
   per-signal sub-scores as JSON; `Rationale` is its terse human-readable one-liner (e.g.
   *"Primary stack match (C#, .NET, SQL Server); Senior; systematic-finance (Man Group)."*),
   which is what makes the manual scroll fast. No extra dependency.

**Follow-on edits made on resolution:** `scanner/CONTEXT.md` (**Matching ladder** + **Preferences**
terms) and `cv/profile.yaml` (the `seniorityFloor` comment, which wrongly claimed the floor
pruned mid-and-below).
