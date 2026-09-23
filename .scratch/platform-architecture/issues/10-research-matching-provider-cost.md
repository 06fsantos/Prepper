# Research: embedding/LLM provider & cost for CV→role matching

Type: research
Status: resolved
Blocked by: 04


## Question

The matching ladder is rules → embeddings → LLM re-rank of the top-N. The `Match` shape is
fixed (ticket 04); this ticket gathers the provider/cost facts the ladder design (ticket 11)
waits on — the architecture research flagged model choice and cost as un-priced.

Surface:

- **Embedding options** callable from .NET (provider APIs — OpenAI/Anthropic/Voyage/etc. —
  vs a local model via ONNX/`Microsoft.ML`), their dimensions, and cost per 1k roles.
- **LLM re-rank options** for the top-N (which model, structured-output support for a
  `Score`+`Rationale`, cost per role).
- The **.NET client story** (official SDK / `Microsoft.Extensions.AI` / Semantic Kernel) and
  where embeddings persist (a `Role` vector column in SQLite vs a sidecar).
- A defensible **cost envelope** for one `scan` over the ticket-07 list at single-user scale.

## Context

- AFK research ticket: resolve by calling the Skill tool with `research`; capture findings
  as a Markdown file under `research/`, link it here, fire on a throwaway branch.
- Prefer the latest, most capable Claude models where an LLM is used (per repo guidance).
- Blocked only by ticket 04 (needs the `Role`/`CandidateProfile`/`Match` shapes) — takeable now.
- Blocks ticket 11 (ladder design picks the provider from these facts).

## Answer

AFK research complete. Full findings: [matching-provider-cost.md](../research/matching-provider-cost.md).

- **Embeddings**: Voyage AI `voyage-3.5-lite` (1024-dim; 200M free tokens/month → **$0** at
  this scale). Anthropic sells no embedding model and points to Voyage. Zero-dependency
  fallback: local ONNX `all-MiniLM-L6-v2` (384-dim, in-process via `Microsoft.ML.OnnxRuntime`),
  defensible because the embedding stage is only a recall filter ahead of the LLM.
- **LLM re-rank**: Claude via the official `Anthropic` C# SDK (implements `IChatClient`),
  default `claude-opus-5` (repo "most capable" guidance), `claude-sonnet-5`/`claude-haiku-4-5`
  as step-downs; `{Score, Rationale}` via structured outputs or a `strict:true` tool.
- **SQLite vectors**: no native vector type — store the raw `float[]` as a BLOB on `Role`,
  compute cosine in-process (μs at hundreds of vectors); adopt `sqlite-vec` only if the corpus
  outgrows a brute-force scan.
- **Per-scan cost envelope**: embeddings ≈ $0; LLM re-rank ≈ $0.09 (Haiku) to ~$0.45–0.50
  (Opus) for a top-30 shortlist. Cost does not constrain the design at single-user scale.

Two flagged unknowns (in the doc): OpenAI's live pricing page 403'd (figures corroborated via
its guide + trackers); and the retrieval-quality delta between Voyage-1024 and local-384 on
this specific corpus is unmeasured. Neither blocks ticket 11.
