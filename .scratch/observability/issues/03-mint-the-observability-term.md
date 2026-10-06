# Mint the observability Term and re-file existing notes

Type: task
Status: resolved
Blocked by: —

## Question

AFK, via `/author`. Create `content/terms/observability.md` (top-level: no `topic` parent,
a one-to-two-sentence placeholder body — the capstone ticket finalises it). Add `observability`
to `distributed-tracing`'s `topic` (keeping `http-and-resilience`) and to
[[metrics-logs-and-the-golden-signals]]'s `topic` (keeping `system-design`). `npm run validate`
passes. Unblocks every authoring ticket filing under `observability`.

## Answer

Done, AFK, 2026-10-06.

- `content/terms/observability.md` minted (`id 01M48MT6VFZ8KWEP2MYQGFFRG6`), top-level — no
  `topic` — with a two-sentence placeholder body the capstone ticket rewrites.
- `distributed-tracing` (Term) now files under `http-and-resilience` **and** `observability`.
- [[metrics-logs-and-the-golden-signals]] now files under `system-design`, `distributed-tracing`
  **and** `observability` (it already carried `distributed-tracing`; kept).
- `npm run validate`: 0 errors, 1 pre-existing warning (`build-vs-buy`, unrelated).

Every authoring ticket can now claim `topic: [observability]`.
