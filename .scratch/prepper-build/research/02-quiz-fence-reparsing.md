# Mechanism 1 — quiz fence re-parsing, run

Spike for [ticket 02](../issues/02-spike-the-unrun-mechanisms.md), item 1. The claim under test,
from [research 17](../../prepper/research/17-quiz-fence-under-quartz.md), which read it out of
source without executing it:

> `self.parse()` on a quiz fence body yields real `wikilink` mdast nodes that Quartz's downstream
> transforms then resolve into links.

**Verdict: holds, in full. No fallback, no ADR amendment.** Research 17's §2 was right about
every step, including the correction it made to the ticket's premise.

## What was run

A transformer of nine working lines at `order: 25`
([`prepper/testing/spikes/quiz-fence-reparse/`](../../../prepper/testing/spikes/quiz-fence-reparse/index.js)),
doing only what the mechanism needs: on a `code` node with `lang === "quiz"`, call
`processor.parse(node.value)` on the frozen processor, strip `position` from the subtree, and
splice it in as a custom node carrying `data.hName` / `data.hProperties`. No validation, no
question types, no infostring grammar — those are ticket 09's.

The fixture is [`quiz-fence-wikilink/`](../../../prepper/testing/fixtures/quiz-fence-wikilink):
one Lesson whose quiz fence holds an mcq task list, with a wikilink to `[[collision-handling]]`
inside one option's explanation blockquote and **nowhere else in the note**, so the edge cannot
arrive by another route. The test is
[`prepper/testing/mechanisms.test.ts`](../../../prepper/testing/mechanisms.test.ts).

The build reads a config that is the repo's real one plus the spike plugin — see
[`prepper/testing/spike-build.ts`](../../../prepper/testing/spike-build.ts) for why a spike gets
its own working directory rather than an entry in `quartz.config.yaml`.

## What came out

```html
<div class="quiz" data-quiz-id="01M0Z900000000000000000022" data-quiz-type="mcq">
  <p>A hash map lookup, average case, costs what?</p>
  <ul class="contains-task-list">
    <li class="task-list-item is-checked" data-task="x"><input type="checkbox" checked …/> Constant time, no scan
      <blockquote><p>The key hashes straight to its bucket.</p></blockquote>
    </li>
    <li class="task-list-item" data-task=" "><input type="checkbox" …/> Constant time, one scan
      <blockquote><p>Nothing is scanned unless buckets collide. See
        <a href="../terms/collision-handling" class="internal internal-link"
           data-slug="terms/collision-handling">collision-handling</a>.</p></blockquote>
    </li>
    …
```

and, in `contentIndex.json`:

```json
"lessons/hash-map-lookup-cost": { "links": ["terms/collision-handling", "terms/hash-map"] }
```

Five things are settled by that, each of which was previously a reading of source:

1. **The wikilink resolved.** `[[collision-handling]]` inside a fence body is a real
   `<a href>` with `data-slug`, indistinguishable from one in prose. So `self.parse()` on the
   frozen processor does carry the wikilink micromark extension, and OFM's order-30 transform does
   descend into an injected subtree.
2. **It is a graph edge.** `terms/collision-handling` is in the note's `links`, put there by
   `crawl-links` at order 60. "A link is a link wherever it is written" costs nothing to deliver.
3. **The body is Markdown, not a string.** GFM task lists parsed (`contains-task-list`,
   `is-checked`), blockquotes nested under their option, one `[x]` distinguishable from the two
   `[ ]`.
4. **The infostring survives to the element.** `data-quiz-id` / `data-quiz-type` are attributes on
   the emitted `div`, through `mdast-util-to-hast`'s unknown-node handler *and* `rehype-raw`'s
   parse5 round trip. Ticket 15's plugin can read the type back off hast.
5. **`position` stripping is enough.** `data-task` came out `"x"` and `" "` correctly — the
   fallback path in `remark-obsidian`'s task-char transform, which is what stripping `position`
   selects. Left in, those offsets index the whole file and the transform would slice the wrong
   twenty characters.

## Notes for ticket 09

- **Order 25 is free.** `@quartz-community/spacer` sits at `order: 25` in `quartz.config.yaml`
  and is a **component-only** plugin — its manifest is `"category": "component"` and its module
  exports a preact `Spacer` and nothing else, so it never enters the transformers array that
  `order` sequences. The spike ran at 25 alongside it and resolved wikilinks, which is the
  end-to-end proof: our transform did run before OFM at 30. (Even had it been a transformer,
  `sortByOrder` is a stable sort on equal keys, so the tie would have gone to config order.)
- **A local plugin's entry point is imported by Node at runtime**, not bundled by esbuild —
  `config-loader.ts` does `import(toFileUrl(entryPoint))`, and `getPluginEntryPoint` will happily
  return an `index.ts`. It loaded here because this machine runs Node 24, which strips types
  natively; the repo's `.node-version` pins **22.16.0**, where type stripping needs
  `--experimental-strip-types`. A `.ts` entry point that Node cannot load does not fail the
  build: `config-loader` catches it and prints `⚠ Could not load plugin … Skipping.`, and the
  fences then render as ordinary code blocks. The spike is `.js` for that reason; ticket 09
  should either ship `.js` or verify a `.ts` entry point on the pinned Node before relying on it.
- **Not covered here**, because they are ticket 09's acceptance criteria rather than this
  mechanism: the `~~~~quiz` outer fence, cloze and recall bodies, and every error case.
