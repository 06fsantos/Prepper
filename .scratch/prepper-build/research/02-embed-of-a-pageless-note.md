# Mechanism 2 — embed resolution, run

Spike for [ticket 02](../issues/02-spike-the-unrun-mechanisms.md), item 2. The claim under test,
which is the one the [ADR 0002](../../../docs/adr/0002-quartz-as-the-build-pipeline.md) amendment
used to **withdraw** an accepted risk:

> Quartz resolves non-media embeds in the browser by fetching the target's *rendered page*. A
> Workshop note has no page, so the embed fetches nothing.

**Verdict: the outcome holds; the mechanism does not.** Embeds are resolved **at build time**,
not in the browser. The withdrawal of the risk survives, but on a precondition that the
implementation now has to honour on purpose — so this carries
[an ADR 0002 amendment](../../../docs/adr/0002-quartz-as-the-build-pipeline.md).

## What was run

Fixture [`embed-of-a-pageless-note/`](../../../prepper/testing/fixtures/embed-of-a-pageless-note),
built through seam 1 against the real config. One Lesson embedding two notes:

- **the control** — `![[hash-map]]`, a Term with a page, whose body carries the marker
  `sonarcanary`;
- **the subject** — `![[why-buckets-were-benchmarked-this-way]]`, a `draft: true` note carrying
  `pineapplecanary`. `draft: true` is the Workshop stand-in: `@quartz-community/remove-draft` is a
  **filter**, and filters run between the transform pipeline and the emitters, which is the same
  shape Prepper's own Library/Workshop split has to take.

Test: [`prepper/testing/mechanisms.test.ts`](../../../prepper/testing/mechanisms.test.ts).

## What came out

```html
<!-- the control: the target's rendered content, spliced into the emitting page's HTML -->
<blockquote class="transclude" data-url="hash-map" data-block data-embed-alias>
  <h1>Hash map</h1>
  <p>A keyed collection that hashes each key to a bucket. This sentence is the sonarcanary …</p>
  <a href="../terms/hash-map" class="internal internal-link transclude-src">Link to original</a>
</blockquote>

<!-- the subject: a placeholder carrying the target slug, and nothing else -->
<blockquote class="transclude" data-url="why-buckets-were-benchmarked-this-way" data-block data-embed-alias>
  <a href="../research/why-buckets-were-benchmarked-this-way" class="transclude-inner internal internal-link alias"
     data-slug="research/why-buckets-were-benchmarked-this-way">Transclude of why-buckets-were-benchmarked-this-way</a>
</blockquote>
```

`pineapplecanary` appears in **no** emitted file — not the page, not `contentIndex.json`, not
search. The boundary held.

But the control is the finding. The target's prose is **in the emitted HTML**, so resolution
happened during the build and no browser was involved. `quartz/components/renderPage.tsx`
(`renderTranscludes`) walks every `blockquote.transclude`, resolves `data-slug` against
`componentData.allFiles`, and splices `page.htmlAst` in; when the lookup misses, it leaves the
placeholder alone and moves on. There is no client-side transclusion script in v5 — the only
`fetch` in `quartz/components/scripts/` belongs to SPA navigation and popovers.

## Why the risk stays withdrawn, and what it now rests on

Not "the target has no page" — **"the target is not in the corpus the build renders from"**. In
Quartz today the two coincide, because the only route to losing a page is a `shouldPublish` filter,
which removes the note before rendering; a note that reached rendering but was denied a page later
would still be spliced into every embed of it.

So the load-bearing sentence for the implementation is: **Workshop notes must be excluded by a
filter.** An emitter that simply declines to write Workshop pages would leak Workshop prose onto
every Library page that embeds one, on the page and into search, with a green build. That is the
whole reason this test exists rather than an eyeball.

## Notes for ticket 06

- Implement the Library/Workshop split as a Quartz **filter** (`shouldPublish`). Nothing else
  gives the guarantee ADR 0002 books.
- The degraded affordance ticket 06 has to produce is `blockquote.transclude` with a single
  `a.transclude-inner` inside carrying `data-slug` and an href to a page that does not exist.
  That is the node to rewrite, and `data-url` on the blockquote carries the target as written.
- The plain wikilink to the same Workshop note renders as an ordinary resolved
  `a.internal.internal-link` — Quartz does not mark it in any way — so the Library→Workshop *link*
  warning has to come from our rules, not from a class Quartz already emits.
