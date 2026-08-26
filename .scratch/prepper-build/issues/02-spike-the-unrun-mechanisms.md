# 02: Spike the three cited-but-never-run mechanisms

**What to build:** Evidence, not features. Three decisions in the spec rest on mechanisms that
were cited from documentation and source but never actually run. The spec is explicit that these
are the **first** work, not the last, because one of them falls back into an ADR if it fails.

1. **Quiz fence re-parsing.** `self.parse()` on a quiz fence body yields real `wikilink` mdast
   nodes that Quartz's downstream transforms then resolve into links. This is load-bearing: a
   failure here falls back into [ADR 0002](../../../docs/adr/0002-quartz-as-the-build-pipeline.md),
   because the whole "Quartz's parser, Quartz's transforms" design of the order-25 plugin rests
   on it.
2. **Client-side embed resolution.** Quartz resolves non-media embeds in the browser by fetching
   the target's *rendered page*. This is what makes the Workshop boundary airtight rather than
   merely policed — a Workshop note has no page, so the embed fetches nothing. It is the
   mechanism the ADR 0002 amendment used to *withdraw* an accepted risk, so if it is wrong the
   risk comes back.
3. **The report's structural exclusion.** Emitter output never passes through `description` or
   `crawl-links`. This one fails **quietly**: if the report's own links became graph edges, the
   report would link to every orphan it lists, each would gain an inbound link, and the hygiene
   section would erase itself on the second build.

Each finding lands as a passing test plus a written note. A mechanism that does not hold gets an
ADR amendment, not a workaround invented on the spot.

**Blocked by:** 01

**Status:** resolved

- [x] A test demonstrates a wikilink written inside a quiz fence body resolving to a real link in emitted HTML
- [x] A test demonstrates a non-media embed of a note with no page rendering as an empty placeholder rather than leaking content
- [x] A test demonstrates that links in emitter output do not appear as edges in the link graph, and are absent from `contentIndex.json`
- [x] Each of the three is written up with its outcome; any that fails carries an ADR amendment rather than an undocumented workaround

## Answer

All three were run through a real `quartz build`. The tests are
[`prepper/testing/mechanisms.test.ts`](../../../prepper/testing/mechanisms.test.ts) and the
write-ups are in [`../research/`](../research/), one per mechanism.

**1. Quiz fence re-parsing — holds, in full.** A nine-line spike transformer at `order: 25`
calling `processor.parse(node.value)` on the frozen processor produced a subtree that
Quartz's own transforms then treated as ordinary content: the wikilink written inside an
option's explanation came out as `<a href="../terms/collision-handling" data-slug=…>` and
as an edge in that note's `contentIndex.json` `links`. The task list, the nested
blockquotes, `data-quiz-id` / `data-quiz-type` through `rehype-raw`, and `data-task` after
stripping `position` all came out as
[research 17](../../prepper/research/17-quiz-fence-under-quartz.md) predicted. No fallback
and no ADR change; ticket 09's design stands.

**2. Client-side embed resolution — the outcome holds, the mechanism does not.** Quartz v5
resolves non-media embeds **at build time** (`renderPage`'s `renderTranscludes` splices the
target's rendered subtree out of the corpus), not by fetching a rendered page in the
browser. The embed of a note that has no page still leaks nothing — empty placeholder, and
the target's marker word appears in no emitted file — but only because the note was
**filtered out of the corpus**, not because it lacked a page. The control proves it: an
embed of a note that *is* in the corpus has its prose in the emitted HTML. That is
[an amendment to ADR 0002](../../../docs/adr/0002-quartz-as-the-build-pipeline.md), and the
precondition it hands to ticket 06 is now in `CONTEXT.md`'s **Workshop** entry: exclude
Workshop notes with a Quartz **filter**, never with an emitter that declines to write them.

**3. The report's structural exclusion — holds.** A spike emitter that writes a page
linking to *every* note in the corpus contributed nothing: no `contentIndex.json` entry, no
`links` entry anywhere, no text in any note's search content, and the orphan it linked to
is still an orphan. Emitters run after the last transform, so the exclusion is structural.
Ticket 14's "emitter output, never a virtual `content/` file" constraint is safe.

**Two things later tickets inherit.**
`@quartz-community/spacer` at `order: 25` is inert in that slot: its manifest declares
`category: component`, it exports only a preact component, and it therefore never enters
the transformer array `order` sequences — the spike ran at 25 beside it and resolved
wikilinks, which is the end-to-end proof (ticket 09). And a spike that needs a plugin the
shipped config does not have goes through
[`prepper/testing/spike-build.ts`](../../../prepper/testing/spike-build.ts), which builds
in a throwaway working directory holding the real config plus the extra entries — so no
spike code ever lands in `quartz.config.yaml`.
