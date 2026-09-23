# Matching: embedding / LLM provider & cost for CV→role scoring, from .NET

Research for ticket 10 (platform-architecture). Investigated 2026-09-15 against primary
sources: Anthropic's own embeddings guide and C# SDK docs, OpenAI's embeddings guide,
Voyage AI's docs and pricing page, the `sqlite-vec` project, and Microsoft Learn's
`Microsoft.Extensions.AI` and Semantic Kernel connector docs. Every non-obvious claim
carries the URL that owns it in the Sources section. Claude model ids and pricing are
taken from the repo's `claude-api` skill (cached 2026-06-24), as the repo requires.

This ticket **gathers facts**; it does not design the ladder (that is ticket 11). The
`Match` shape is fixed by ticket 04 — `Score` (0–100) + `Rationale` (text) + nullable
`Breakdown` (JSON) + `Method` (`Rules`|`Embedding`|`Llm`) — and this note prices the two
stages that populate it: the **embedding shortlist** and the **LLM re-rank of the top-N**.

**Assumptions stated up front** (the ticket left scale open):

- Single-user tool `[A]`. One `CandidateProfile` (C#/.NET primary, Python/Java secondary).
- One `scan` covers the ticket-07 curated list: **tens of companies, low hundreds of
  roles** (envelope math below uses **300 roles**, ~**1,000 tokens** of normalized text
  each, as a deliberately generous ceiling).
- The scanner is a .NET solution on the Generic Host (ticket 04), EF Core + SQLite. So a
  provider must be reachable from C# either through an official SDK, `Microsoft.Extensions.AI`,
  or plain HTTPS.
- Scan cadence is manual/occasional now, GitHub-Actions-daily at most. Cost is therefore
  a *per-scan* number, not a per-tenant one.

---

## Executive summary and recommendation

**At this scale the money is a rounding error; the real decisions are dependency surface
and where the vectors live.** A 300-role scan embeds ~300K tokens — pennies at every
provider, and **$0** in practice because both Voyage AI's free tier (200M tokens/mo) and a
local ONNX model cover it entirely. The LLM re-rank of a top-N shortlist is the only line
item that costs measurable cents, and even a Claude Opus re-rank of 30 roles lands **under
~$0.50 per scan**. So choose on engineering fit, not price.

**Recommendations:**

1. **Embedding shortlist — default to Voyage AI `voyage-3.5-lite` (1024-dim), with a local
   ONNX `all-MiniLM-L6-v2` (384-dim) embedder as the zero-dependency fallback.** Anthropic
   does not sell an embedding model and explicitly points to Voyage AI (§1). Voyage gives
   1024-dim vectors (truncatable to 256/512/2048), a code-specialised variant
   (`voyage-code-3`/`voyage-code-4`) that suits a C#/Python/Java corpus, and **200M free
   tokens/month** — this scan will never leave the free tier. Because the embedding stage is
   only a *recall filter* feeding an LLM re-rank, its quality bar is modest, which is what
   makes the **local ONNX option genuinely competitive**: `all-MiniLM-L6-v2` runs in-process
   on CPU via `Microsoft.ML.OnnxRuntime` with **no API key, no network, and $0** — a clean
   fit for a single-user offline tool that already values zero-ops (§1, §3). Pick Voyage for
   quality-at-zero-cost; pick local ONNX if "no third-party key in the scanner" is worth 384
   dimensions instead of 1024.

2. **LLM re-rank — Claude via the official `Anthropic` C# SDK, structured output for
   `{Score, Rationale}`.** Repo guidance is "prefer the latest, most capable Claude models",
   and at single-user volume the capable tier is affordable: default to **`claude-opus-5`**
   ($5/$25 per MTok); step down to **`claude-sonnet-5`** ($2/$10) or **`claude-haiku-4-5`**
   ($1/$5) if scan frequency ever climbs. Constrain the output to the `Match` fields with the
   Messages API's structured outputs (`output_config.format`) or a `strict: true` tool, and
   prompt-cache the CV + instructions so only the per-role text is uncached (§2). The SDK
   implements `Microsoft.Extensions.AI`'s `IChatClient`, so the same abstraction can front
   both the LLM and the embeddings if you want one seam (§3).

3. **Vector storage — store the raw `float[]` as a BLOB column on `Role` and compute cosine
   in-process; adopt `sqlite-vec` only if the corpus outgrows a brute-force scan.** SQLite has
   no native vector type (§4). At 300 × 1024-float vectors, a full cosine scan is microseconds
   and needs no native extension, no migration risk, and no preview dependency — it fits
   Separate Ways and zero-ops. `sqlite-vec` (vec0 virtual tables, cosine/L2) is the right
   escape hatch, reachable from .NET through the `CommunityToolkit.VectorData.SqliteVec`
   connector, but it is **pre-v1** and the connector is **preview** — cost you should not pay
   until brute force is measurably too slow (§4).

4. **Per-scan cost envelope: effectively $0 for embeddings, and ~$0.05–$0.50 for the LLM
   re-rank**, depending on Claude tier and top-N. Full math in §5.

**Strongest alternative to the embedding pick:** OpenAI `text-embedding-3-small` (1536-dim,
$0.02/MTok) — a well-worn default with a first-class .NET client, but no free tier and a
second vendor relationship for a stack that is otherwise Anthropic-shaped.

---

## 1. Embedding options callable from .NET

### Anthropic has no embedding model — it points to Voyage AI

Anthropic's own guide is explicit: *"Anthropic does not offer its own embedding model,"* and
it recommends **Voyage AI** as a provider *"that has a wide variety of options … encompassing
all of the preceding considerations,"* while advising you *"should assess a variety of
embeddings vendors."* So "an Anthropic embedding" is not on the table; the Anthropic-adjacent
choice is Voyage.

### Provider APIs — dimensions and cost

| Provider / model | Default dims | Other dims | Price /1M tokens | Free tier | Notes |
|---|---|---|---|---|---|
| **Voyage `voyage-3.5-lite`** | 1024 | 256/512/2048 | **$0.02** | 200M tok/mo | latency/cost-optimised, 32K context |
| **Voyage `voyage-3.5`** | 1024 | 256/512/2048 | $0.06 | 200M tok/mo | balanced quality |
| **Voyage `voyage-4-lite`** | 1024 | 256/512/2048 | $0.02 | 200M tok/mo | current gen, latest |
| **Voyage `voyage-4`** | 1024 | 256/512/2048 | $0.06 | 200M tok/mo | current gen, balanced |
| **Voyage `voyage-code-3`** | 1024 | 256/512/2048 | $0.12 (as `voyage-code-4`) | 200M tok/mo | **code-specialised** — fits a C#/Py/Java corpus |
| **OpenAI `text-embedding-3-small`** | 1536 | reducible via `dimensions` | **$0.02** ($0.01 batch) | none | MTEB 62.3% |
| **OpenAI `text-embedding-3-large`** | 3072 | reducible via `dimensions` | $0.13 ($0.065 batch) | none | MTEB 64.6% |
| **OpenAI `text-embedding-ada-002`** | 1536 | fixed | ~$0.10 | none | legacy, superseded by 3-small |

Voyage vectors are **L2-normalised**, so cosine similarity equals dot product — the ranking
math is a plain dot product (Voyage docs). Voyage also supports `int8`/`binary` quantization
(4×/32× storage reduction) and Matryoshka truncation, neither of which this scale needs.

### Local model via ONNX / Microsoft.ML — the $0, no-key option

A sentence-transformer can run **in-process on CPU** with no provider at all:

- **`all-MiniLM-L6-v2`**: 6-layer, **384-dim**, 256-token max sequence. Runs from C# via
  `Microsoft.ML.OnnxRuntime` (the `AllMiniLmL6V2Sharp` package wraps a BERT tokenizer + the
  ONNX model; .NET Standard 2.1).
- **`SmartComponents.LocalEmbeddings`** (a dotnet/ experimental package): depends on
  `Microsoft.ML.OnnxRuntime` (≥1.17), downloads its model at build (default `bge-micro-v2`,
  quantized to ~22.9 MiB), and computes an embedding *"in under a millisecond"* with semantic
  search over *"hundreds of thousands of candidates in single-digit milliseconds."* Both are
  **preview/experimental**.

Trade: 384 dims and lower absolute retrieval quality than a 1024-dim Voyage vector, in
exchange for zero cost, zero network, zero key, and full determinism. For a *shortlist filter*
in front of an LLM re-rank, that is an acceptable trade — the LLM stage does the precise work.

---

## 2. LLM re-rank options for the top-N

The re-rank reads the `CandidateProfile` and each shortlisted `Role` and emits the `Match`
fields. Two facts govern the pick: repo guidance ("prefer the latest, most capable Claude
models"), and single-user volume (cost is negligible, so the capable tier is affordable).

### Model and cost (Claude, per the `claude-api` skill, cached 2026-06-24)

| Model | id | Input /1M | Output /1M |
|---|---|---|---|
| **Claude Opus 5** | `claude-opus-5` | $5.00 | $25.00 |
| Claude Opus 4.8 | `claude-opus-4-8` | $5.00 | $25.00 |
| **Claude Sonnet 5** | `claude-sonnet-5` | $2.00 | $10.00 |
| **Claude Haiku 4.5** | `claude-haiku-4-5` | $1.00 | $5.00 |

Recommendation: **`claude-opus-5`** as the default re-ranker (repo's "most capable" rule, and
the per-scan cost stays under ~$0.50 — §5); **`claude-sonnet-5`** / **`claude-haiku-4-5`** as
the cost step-downs if daily scanning makes the Opus line item annoying. Use exact ids, no
date suffixes.

### Structured output for `Score` + `Rationale`

The Messages API constrains output two ways, both usable to force the `Match` shape:

- **Structured outputs** — `output_config: {format: {...}}` on `messages.create` (the
  `messages.parse()` helper validates the response against a schema). This is the recommended
  path and is the current API; the older top-level `output_format` is deprecated.
- **Strict tool use** — `strict: true` as a top-level field on a tool definition (schema needs
  `additionalProperties: false` + `required`); guarantees `tool_use.input` validates exactly.

Either yields a typed `{ "score": 0..100, "rationale": "…", "breakdown": {…} }` object that
maps straight onto `Match`. Note the ladder can also spend the LLM budget on Voyage's
**`rerank-2.5`** reranker instead of a chat model — cheaper and purpose-built — but it returns
a relevance score, **not** a `Rationale`, so it does not by itself satisfy the `Match` shape;
that is a ticket-11 design call, flagged here, not decided.

### Cost control levers (facts ticket 11 will use)

- **Prompt-cache the CV + instructions.** Render order is `tools → system → messages`; put the
  stable CV/instructions first behind a `cache_control` breakpoint and the volatile per-role
  text last. Cache reads are ~0.1× input cost; verify with `usage.cache_read_input_tokens`.
- **Batch several roles per call** rather than one call per role, to amortise the cached prefix
  and the output overhead.
- **Effort:** `output_config.effort` (`low`…`max`) trades thoroughness for tokens; a bounded
  re-rank of pre-filtered candidates does not need `max`.

---

## 3. The .NET client story

### Official Anthropic C# SDK

There **is** an official SDK: the **`Anthropic`** NuGet package (v10+; versions ≤3.x were the
community `tryAGI` SDK, now `tryAGI.Anthropic`). Targets **.NET Standard 2.0+**. Construct
`AnthropicClient client = new();` (reads `ANTHROPIC_API_KEY`), call `client.Messages.Create(params)`
or `.CreateStreaming(...)`, with typed exceptions, retries (2 by default), and pagination. Model
ids are exposed as e.g. `Model.ClaudeOpus5`. Platform variants ship as separate packages
(`Anthropic.Bedrock`, `Anthropic.Vertex`, `Anthropic.Foundry`, `Anthropic.Aws`).

Crucially it **implements `IChatClient`** from `Microsoft.Extensions.AI.Abstractions`:
`client.AsIChatClient("claude-opus-5").AsBuilder().UseFunctionInvocation().Build()`.

### Microsoft.Extensions.AI — the unifying abstraction

`Microsoft.Extensions.AI` provides `IChatClient` and `IEmbeddingGenerator<TInput,TEmbedding>`
as the core exchange types, plus DI/middleware for caching, telemetry (OpenTelemetry), and
function invocation. It lets the scanner code against **one embeddings interface** and swap the
concrete provider (Voyage over HTTP, OpenAI, or a local ONNX generator) without touching the
Matching context — exactly the seam DDD wants at a Customer/Supplier boundary. The abstractions
package is stable and GA; the `IImageGenerator` sibling is experimental (not needed here).

**Semantic Kernel** sits a layer above this and is available, but it is heavier than a
single-user `scan` warrants — `Microsoft.Extensions.AI` + the official SDK is the lighter,
more direct fit. Note SK if the eventual ASP.NET shell wants agent orchestration.

### Where embeddings persist

**SQLite has no native vector type**, so a `Role`'s vector is stored as one of:

1. **Raw `float[]` as a BLOB column on `Role`** (or a sidecar table keyed by `RoleId`), with
   cosine computed in C# over the shortlisted candidates. No extension, no native dependency,
   no preview package — brute force over hundreds of vectors is microseconds. **Recommended at
   this scale.** EF Core maps a `byte[]`/`float[]` with a value converter cleanly.
2. **`sqlite-vec`** — a loadable SQLite extension providing `vec0` virtual tables (float/int8/
   binary vectors, KNN queries). It is **pre-v1** ("expect breaking changes"). It has no
   first-party .NET binding, but the **`CommunityToolkit.VectorData.SqliteVec`** connector
   (used by Semantic Kernel's SQLite vector store, **Preview**) bundles it: vectors go in a
   `vec_<table>` virtual table with `distance_metric=cosine`, and it supports Cosine/Manhattan/
   Euclidean distance through the `Microsoft.Extensions.VectorData` abstraction. Adopt this only
   when the corpus grows past what a brute-force scan handles comfortably.

The sidecar-vs-column question (ticket wording) resolves to: **a column/sidecar of raw bytes is
enough now; a `vec0` virtual table is the growth path** — and either way the vector lives in the
one SQLite file, consistent with ADR 0006.

---

## 4. SQLite vector storage — the realistic options, compared

| Option | Native dep | Query | Stability | Fit for ~300 roles |
|---|---|---|---|---|
| **Raw BLOB + in-process cosine** | none | brute-force scan in C# | trivial, fully in your code | **Best.** μs-scale, no risk |
| **`sqlite-vec` via `CommunityToolkit.VectorData.SqliteVec`** | bundled native ext | `vec0` KNN, cosine/L2/L1 | ext **pre-v1**, connector **preview** | Overkill now; the escape hatch |
| **External vector DB** (pgvector, Qdrant, …) | separate service | ANN index | mature | Violates zero-ops / Separate Ways for a single-user tool |

The decision rule for ticket 11: brute force until a measured scan latency justifies an index.
At 300 vectors it never will; the option exists for when the curated list grows by an order of
magnitude.

---

## 5. Defensible cost envelope for one `scan`

Ceiling assumptions: **300 roles**, ~**1,000 tokens** of normalized text each (**300K tokens**
total); CV embedded once (~2K tokens); **top-30** roles re-ranked by the LLM; each re-rank
prompt ~**2,000 input tokens** (CV excerpt + role) and ~**200 output tokens** (`Score` +
`Rationale`). These are generous; real postings and shortlists are usually smaller.

### Stage 1 — embeddings (300K tokens)

| Provider | Rate | Nominal cost | Effective cost |
|---|---|---|---|
| Voyage `voyage-3.5-lite` / `voyage-4-lite` | $0.02/MTok | $0.006 | **$0** (200M free tokens/mo) |
| Voyage `voyage-3.5` / `voyage-4` | $0.06/MTok | $0.018 | **$0** (free tier) |
| OpenAI `text-embedding-3-small` | $0.02/MTok | **$0.006** | $0.006 |
| Local ONNX `all-MiniLM-L6-v2` | — | $0 | **$0** (CPU, in-process) |

Embeddings are free or sub-cent at this scale, whichever way you go.

### Stage 2 — LLM re-rank (top-30: ~60K input + ~6K output tokens)

| Model | Input cost | Output cost | Per-scan (no cache) | With CV prompt-cached |
|---|---|---|---|---|
| `claude-opus-5` ($5/$25) | $0.30 | $0.15 | **~$0.45** | ~$0.25–0.35 |
| `claude-sonnet-5` ($2/$10) | $0.12 | $0.06 | **~$0.18** | ~$0.10–0.14 |
| `claude-haiku-4-5` ($1/$5) | $0.06 | $0.03 | **~$0.09** | ~$0.05–0.07 |

### Total per scan

- **Opus-tier re-rank:** ~**$0.45–0.50** (embeddings free).
- **Sonnet-tier:** ~**$0.18**.
- **Haiku-tier:** ~**$0.09**.

Even a **daily** GitHub-Actions scan on the Opus tier is ~**$13–15/month**; on Sonnet ~$5/mo;
on Haiku ~$3/mo — and prompt-caching plus a smaller real top-N pull all of these down further.
**At single-user scale, provider cost does not constrain the design.** The bounded top-N is
what keeps it that way: it is the reason the LLM never sees all 300 roles.

---

## Sources

- https://platform.claude.com/docs/en/build-with-claude/embeddings — Anthropic's embeddings guide: *"Anthropic does not offer its own embedding model"*; recommends Voyage AI; the Voyage model table (voyage-4 / voyage-3.5 families, 1024-dim default with 256/512/2048 options, 32K context, `voyage-code-3` for code, `rerank-2.5` reranker); L2-normalised vectors (cosine == dot product); int8/binary quantization and Matryoshka truncation. Anchors §1, §2.
- https://docs.voyageai.com/docs/pricing — Voyage pricing and free tier: `voyage-4-lite`/`voyage-3.5-lite` $0.02/1M, `voyage-4`/`voyage-3.5` $0.06/1M, `voyage-4-large`/`voyage-code-4`/`voyage-context-4` $0.12/1M, all with **200M free tokens/month**; specialised (`voyage-code-2`/`finance-2`/`law-2`) $0.12/1M with 50M free; Batch API 33% discount; free credits don't apply to Batch. Anchors §1, §5.
- https://developers.openai.com/api/docs/guides/embeddings — OpenAI embeddings: `text-embedding-3-small` 1536-dim, `text-embedding-3-large` 3072-dim (both reducible via the `dimensions` parameter), `ada-002` 1536-dim fixed; MTEB 62.3% / 64.6%; billing per input token. Anchors §1.
- https://openai.com/api/pricing/ — OpenAI embedding rates: `text-embedding-3-small` **$0.02/1M** ($0.01 batch), `text-embedding-3-large` **$0.13/1M** ($0.065 batch); ada-002 ~$0.10/1M (legacy). (Pricing page returned 403 to the fetcher; figures corroborated across OpenAI's own announcement and multiple trackers as of Aug 2026 — see "What I could not verify".) Anchors §1, §5.
- https://github.com/asg017/sqlite-vec — `sqlite-vec`: loadable SQLite extension, `vec0` virtual tables (float/int8/binary), KNN queries; bindings for Python/Node/Ruby/Go/Rust (**no first-party .NET binding**); **pre-v1**, "expect breaking changes"; Mozilla Builders project. Anchors §3, §4.
- https://learn.microsoft.com/en-us/semantic-kernel/concepts/vector-store-connectors/out-of-the-box-connectors/sqlite-connector — Semantic Kernel SQLite vector store (**Preview**): NuGet `CommunityToolkit.VectorData.SqliteVec` (`--prerelease`); vectors in a `vec_<table>` virtual table with `distance_metric=cosine`; supported distances Cosine/Manhattan/Euclidean; `ReadOnlyMemory<float>`/`Embedding<float>`/`float[]` vector properties; `[VectorStoreVector(Dimensions:…, DistanceFunction=…)]`. Confirms the sqlite-vec-in-.NET path. Anchors §3, §4.
- https://learn.microsoft.com/en-us/dotnet/ai/microsoft-extensions-ai — `Microsoft.Extensions.AI`: `IChatClient` and `IEmbeddingGenerator<TInput,TEmbedding>` in `Microsoft.Extensions.AI.Abstractions`; DI/middleware (caching, OpenTelemetry, function invocation) in `Microsoft.Extensions.AI`; provider-agnostic seam; `IImageGenerator` experimental. Anchors §3.
- https://platform.claude.com/docs/en/api/sdks/csharp — official Anthropic **`Anthropic`** C# SDK (v10+; ≤3.x was community `tryAGI`, now `tryAGI.Anthropic`); .NET Standard 2.0+; `AnthropicClient` + `client.Messages.Create/CreateStreaming`; `Model.ClaudeOpus5`; typed exceptions, retries, pagination; **implements `IChatClient`** via `client.AsIChatClient("claude-opus-5")`; platform packages `Anthropic.Bedrock`/`.Vertex`/`.Foundry`/`.Aws`; repo https://github.com/anthropics/anthropic-sdk-csharp, package https://www.nuget.org/packages/Anthropic. Anchors §2, §3.
- https://www.nuget.org/packages/SmartComponents.LocalEmbeddings and https://github.com/dotnet/smartcomponents/blob/main/docs/local-embeddings.md — `SmartComponents.LocalEmbeddings` (experimental, dotnet/): depends on `Microsoft.ML.OnnxRuntime` (≥1.17); downloads a model at build (default `bge-micro-v2`, ~22.9 MiB quantized); embedding "under a millisecond", search over hundreds of thousands of candidates in single-digit ms; configurable ONNX model URL. Anchors §1, §3.
- https://github.com/ksanman/AllMiniLML6v2Sharp and https://huggingface.co/onnx-models/all-MiniLM-L6-v2-onnx — `all-MiniLM-L6-v2`: 6-layer, **384-dim**, 256-token max; `AllMiniLmL6V2Sharp` runs it from C# (BERT tokenizer + ONNX Runtime, .NET Standard 2.1). Anchors §1.
- Repo `claude-api` skill (Current Models table, cached 2026-06-24): `claude-opus-5` $5/$25, `claude-opus-4-8` $5/$25, `claude-sonnet-5` $2/$10, `claude-haiku-4-5` $1/$5 per MTok; structured outputs via `output_config.format` / `messages.parse()`; `strict: true` on tools; prompt caching (`cache_control`, render order tools→system→messages, `usage.cache_read_input_tokens`); `output_config.effort`. Anchors §2, §5. (Prices are Anthropic first-party API rates; Bedrock/Vertex differ.)

## What I could not verify / out of scope

1. **OpenAI's live per-token pricing from OpenAI's own page** — `openai.com/api/pricing/` and
   the announcement blog both returned 403 to the fetcher. The $0.02 (3-small) / $0.13
   (3-large) figures are consistent across OpenAI's own guide (pages-per-dollar), OpenAI's
   announcement, and independent trackers as of Aug 2026, but were not read off the pricing
   page directly. Re-confirm before hard-coding.
2. **Retrieval-quality delta between a 1024-dim Voyage vector and a 384-dim local MiniLM on
   *this* corpus** (job postings vs a tech CV). No benchmark run; the recommendation rests on
   the embedding stage being a recall filter, not the final ranker. A small spike over the
   ticket-07 list would settle it empirically — and belongs in ticket 11.
3. **Whether Voyage's `rerank-2.5` should replace or precede the Claude re-rank.** It is
   cheaper and purpose-built but returns a relevance score without a `Rationale`, so it cannot
   alone fill the `Match` shape. Which reranker the ladder uses, and in what order, is ticket
   11's design call.
4. **`Microsoft.Extensions.AI` embedding rate limits / batching semantics per provider**, and
   the exact EF Core value-converter for a `float[]` BLOB column — implementation details for
   the build ticket (12), not priced here.
5. **Token-count realism.** The 1,000-tokens-per-role and 2,000-token re-rank-prompt figures
   are estimates, not measured against normalized `Role` output (which does not exist yet). The
   envelope is a generous ceiling; actuals should come from a real scan via
   `messages.count_tokens` / `response.usage`.
