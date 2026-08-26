# Mechanism 3 — the report's structural exclusion, run

Spike for [ticket 02](../issues/02-spike-the-unrun-mechanisms.md), item 3. The claim under test,
which is [ticket 14](../issues/14-vault-report.md)'s load-bearing implementation constraint:

> Emitter output never passes through `description` or `crawl-links`.

**Verdict: holds. No amendment.** A page written by an emitter contributes no edges to the link
graph and does not appear in `contentIndex.json`.

This is the one that fails **quietly**. Were it false, the report would link to every orphan it
lists, each orphan would gain an inbound link, the hygiene section would erase itself on the
second build — and nothing would be printed, nothing would exit non-zero, and no other test would
notice. That is why it is asserted rather than eyeballed.

## What was run

An emitter of a dozen working lines
([`prepper/testing/spikes/emitter-page-links/`](../../../prepper/testing/spikes/emitter-page-links/index.js))
that writes one HTML page, `spike-report.html`, containing a link to **every** note in the corpus.
Linking to everything is deliberate: it is the exact shape that would erase the hygiene section if
the mechanism did not hold.

The fixture is
[`emitter-output-and-the-graph/`](../../../prepper/testing/fixtures/emitter-output-and-the-graph):
a Lesson, the Term it is about, and `terms/orphaned-term` — a note **nothing in the vault links
to**, so "still an orphan after the report linked to it" is a fact a test can state. Test:
[`prepper/testing/mechanisms.test.ts`](../../../prepper/testing/mechanisms.test.ts).

## What came out

The page is emitted, and it does link to the orphan:

```html
<ul>
<li><a href="./lessons/queue-amortisation">lessons/queue-amortisation</a></li>
<li><a href="./terms/amortisation">terms/amortisation</a></li>
<li><a href="./terms/orphaned-term">terms/orphaned-term</a></li>
</ul>
```

And `contentIndex.json` is untouched by it:

- **no `spike-report` entry.** The index holds exactly the three notes plus Quartz's own generated
  folder and tag indexes.
- **no entry's `links` mentions it.** `crawl-links` collects `file.data.links` from parsed content
  files, and an emitter's output was never a content file.
- **`terms/orphaned-term` has no inbound links.** Which is the fact the hygiene section reports.
- **no entry's `content` carries the report's text.** `description` flattens the hast tree of a
  parsed file into `file.data.text`; emitter output has no vfile to flatten.

The reason is structural, and worth stating in the shape that predicts the failure: Quartz's
pipeline is `parse content → transform → filter → emit`. Transformers (`crawl-links` at order 60,
`description` at 70) run over the **parsed corpus**, and every emitter runs *after* all of it,
downstream of the last transform, with the corpus as read-only input. There is no path back.

## Notes for ticket 14

- **The constraint is real and it is the whole game.** Emit the report as a page from an emitter.
  Generating it as a virtual file in `content/` and letting it through the transform pipeline —
  the tempting shortcut, since it would get the layout and the styling for free — is what the
  spike rules out.
- **An emitter writing a bare file is enough**, but the report will want Quartz's chrome. The
  emitters that render pages do it through `renderPage`; taking that route keeps the exclusion,
  because the exclusion comes from *when* an emitter runs, not from how plain its output is.
- `contentIndex.json` is also what search reads, so the report staying out of it means the report
  is not searchable. That is consistent with "the report is not a note" and with ticket 13.
- Two of ticket 14's acceptance criteria are already covered by the mechanism test in the shape
  the spike gave them — "`/report` contributes no edges to the link graph and does not appear in
  `contentIndex.json`", and the half of "building twice leaves the hygiene section unchanged" that
  is about self-reference rather than about ordering.
