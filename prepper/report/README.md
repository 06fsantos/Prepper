# `prepper/report/` — the Vault report

**The build's other channel.** `prepper/validation` shouts: a violation is a defect, and
the failing kind stops a release. This one whispers — **nothing is wrong when the report
prints**. The two never share a line, nothing here is ever validated, and there is no
promotion path in either direction. A fact worth failing a build over is a rule; a fact
that is not is a line on this page; there is nothing in between.

It is a page at `/report`, emitted by **every** build and published **unlisted**, plus
**one terminal line** per build pointing at it.

## Why an emitter, and never a page in the corpus

A page generated _into_ the corpus — the `pageType` seam `prepper/home` uses, and the
obvious way to get Quartz's layout for free — is transformed like any note, so
`crawl-links` records every link on it. The report links to **every orphan it lists**. Each
orphan would gain an inbound link, the hygiene section would erase itself on the second
build, and nothing would print and no test would fail.

Emitters run after the last transform, so emitter output is outside `description` and
outside `crawl-links` **structurally** — the same category as `contentIndex.json` and the
404 page. That is a run, not an argument:
[ticket 02, mechanism 3](../../.scratch/prepper-build/issues/02-spike-the-unrun-mechanisms.md)
emitted a page linking to every note in a fixture, and the orphan it linked to was still an
orphan afterwards. `report.test.ts` asserts the same two facts about the real report, and
that a second build leaves its hygiene section unchanged.

The price of that decision is [`render.ts`](render.ts): the report carries its own markup and
its own stylesheet rather than borrowing the reading surface's. It is worth paying, and it
also suits the page — this is a working surface for one dev, not part of the app.

## Unlisted, and what makes it so

Published with the site rather than emitted only under `--serve`, because a report the
published site does not carry is a second mode of the build, and the mode nobody looks at
is the one that breaks. Nothing links to it, nothing indexes it — there is no
`contentIndex.json` entry for search to find, because emitter output never has one — and
the page says `noindex` for the crawlers that never asked.

With no `partialEmit`, Quartz runs `emit` on a watch rebuild too (`emitter.partialEmit ??
emitter.emit`, `quartz/build.ts`), so `npm run serve` refreshes the report exactly as
`npm run build` writes it. Same arrangement as `prepper/graph` and `prepper/validation`.

## Layout

```
report.ts    the computation: the ranked queue and the three hygiene lists, from one corpus
render.ts    the rendering: one self-contained HTML page
index.ts     the emitter, registered from quartz.config.yaml; gathers the corpus, prints the line
report.test.ts  what the page says, and what it is structurally outside, through seam 1
```

## What it reads, and from where

Everything is the build's own record, never a second reading of the vault:

| fact                    | where it comes from                                                          |
| ----------------------- | ---------------------------------------------------------------------------- |
| every typed edge        | `prepper/graph`, computed from the same `content[]` the site is emitted from |
| `draft: true`           | the frontmatter Quartz parsed                                                |
| a Term with no body     | the note's own file, after its frontmatter                                   |
| every attachment        | `ctx.allFiles` — the build's glob, `ignorePatterns` already applied          |
| an attachment reference | the **rendered trees**                                                       |

That last one is the only fact no index carries: `crawl-links` rewrites an `img`, `video`,
`audio` or `iframe` `src` without recording it, so an attachment that is only ever embedded
appears in no `links` list anywhere. The tree is where the build wrote its own resolution
down.

## The ranking, and the constant that is not there

Rows sort **typed, then total** — two comparisons, never one score. A `practices`
obligation outranks a passing mention because it is compared first, and nothing has to
decide by how much; the breakdown is printed beside every row, so the order is something a
reader can check rather than take. Ties fall back to the title, compared in a fixed locale
with a code-point tiebreak, so the same vault ranks the same way on every machine.

The breakdown is **navigation, not decoration**: an unwritten note has no page to click
through to, so each row lists the notes that lean on it and links to every one of them.

The long tail is **folded, never capped**. The first ten rows stand open and the rest go
behind a `<details>`, numbered on from where the open list stops; a queue short enough to
stand open is not folded at all. Everything the vault leans on is on the page.

A `draft: true` note's **body** links do not rank; its frontmatter links do. Drafting a
note does not un-commit a `practices` entry, and a draft's passing mentions are the
speculation the queue is meant to stay clear of. Hygiene reads the whole graph, drafts
included: calling a note unlinked because the only note linking it is half-written would be
a lie about the vault.
