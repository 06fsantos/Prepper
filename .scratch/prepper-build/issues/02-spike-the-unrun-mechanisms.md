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

**Status:** ready-for-agent

- [ ] A test demonstrates a wikilink written inside a quiz fence body resolving to a real link in emitted HTML
- [ ] A test demonstrates a non-media embed of a note with no page rendering as an empty placeholder rather than leaking content
- [ ] A test demonstrates that links in emitter output do not appear as edges in the link graph, and are absent from `contentIndex.json`
- [ ] Each of the three is written up with its outcome; any that fails carries an ADR amendment rather than an undocumented workaround
