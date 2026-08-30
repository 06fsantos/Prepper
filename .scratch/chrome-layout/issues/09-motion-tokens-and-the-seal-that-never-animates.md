# 09: Motion tokens, and the seal that never animates

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
Blocked by: 03

## What to build

`prepper/tokens` gains the **full Material 3 motion role set** -- durations and easings, computed
wholesale from Google's tables, exactly as the module already treats colour, type and shape.
Picking a subset by hand would make the module inconsistent with its own stated method.

**Amend ADR 0003 and `prepper/tokens/tokens.ts`.** Both currently say, in as many words, that
there is no motion subsystem and that this is deliberate rather than unfinished. That is now
false. The amendment says what changed, why, and -- more importantly -- what did **not**. See
[ADR 0004](../../../docs/adr/0004-a-persistent-top-bar-and-the-retired-right-column.md).
Amend it; do not quietly contradict it.

**The prohibition, and it is the point of this ticket:**

> `<details>` never animates. Not the Problem seal, not a heading fold, not a topic-tree fold.
> The architecture rests on those being shut by the HTML specification before a stylesheet
> loads, before a script runs, and inside the search preview pane -- and every one of those three
> properties is load-bearing somewhere in this codebase. An eased `<details>` is a
> script-dependent seal wearing a costume.

**Assert it, do not merely write it down.** A test that no emitted stylesheet applies a
`transition` or `animation` to a `details` element or to anything inside one is what keeps the
prohibition true after the next person who has a good idea.

Apply motion to the **rail collapse**, and to nothing else unless it earns it. The collapse must
still not move the article column -- easing a jump is not fixing it, and ticket 03 owns the fix.

`prefers-reduced-motion: reduce` **disables** every animation. Not shortens: disables.

## Acceptance criteria

- [ ] The full Material 3 duration and easing role set is emitted, derived not hand-picked
- [ ] ADR 0003 is amended and `prepper/tokens/tokens.ts`'s "no motion subsystem" note is corrected
- [ ] Seam 1: no emitted stylesheet applies `transition` or `animation` to a `details` or to
      anything inside one
- [ ] Seam 1: a `prefers-reduced-motion: reduce` block disables every animation the build emits
- [ ] The rail collapse is eased and still does not move the article column by one pixel
- [ ] No animation is added anywhere else

## Comments

**The role set is derived, and the two halves are derived differently because Google's tables
are.** The sixteen durations are four families of a base and a step -- short 50/50, medium
250/50, long 450/50, extra-long 700/100 -- so the file states the arithmetic rather than sixteen
literals, exactly as the colours state the seed rather than nine hexes. The ten easings are a
table of control points, for the same reason the type scale is a table: four numbers per role,
lined up in columns, is how a curve set is read and how a wrong one is seen. Nothing was picked:
`legacy` is Material 2's curve and it is emitted because Google still publishes it, and
`emphasized` is the single bezier Google publishes as the *token* rather than the two-part spring
it specifies for authors who can express one.

**The consumer arrived with the vocabulary.** ADR 0003's original argument against motion was
that a token set with no consumer invites someone to find one, and that argument is untouched by
this ticket -- so the rail's fade landed in the same change. It is `opacity` over
`--md-sys-motion-duration-short4` on `--md-sys-motion-easing-standard`, with `display` carried
along as a discrete step (`display <dur> allow-discrete` inside the shorthand) so the rail is
still rendered while it fades out and still there to fade back in.

**Two things about that fade are load-bearing and neither is obvious.**

- **It is safe only because ticket 08 placed the centre column.** The rail keeps `display: flex`
  for the length of the fade and then stops being a grid item. Before `.center` was pinned to
  `grid-center`, the article auto-placed into the first free cell -- so an eased collapse would
  have held the article still for 200ms and *then* slid it into the rail's track. The old bug
  would have come back wearing the new feature. Nothing in `sidebar.test.ts`'s track-list
  reasoning could have seen it; the placement assertion is what covers it.
- **The hidden state and the closed drawer both set `opacity: 0`.** With `allow-discrete`, an
  element coming back from `display: none` transitions from the computed style it had *while*
  hidden. A closed state that was merely absent would be opaque, so the rail would fade out and
  then snap back in. `@starting-style` was not needed and was not used: the element is never
  newly inserted, only re-displayed.

**The prohibition is a real containment check, and its scope is honest.** `motion.test.ts` builds
two fixtures -- `problem-sections` for the seal and the rail's tree, `folded-headings` for a
note's own headings -- and reads every `<details>`, every `<summary>` and every element inside one
off the emitted pages, reducing each to a tag and a class list. Then, over **every** stylesheet
the build wrote (upstream's included, because upstream is a remote this repo merges rather than
edits), it asks of each rule that applies a non-`none` `transition` or `animation` whether its
subject could land on one of them. Two calibrations were forced by real output and both are
recorded in the file:

- **A universal subject is not a rule about a disclosure.** Upstream's
  `.callout.is-collapsed .callout-content>*` was the first thing the test caught, and it was a
  false positive: it is a rule about the children of a callout body, which no fold of ours is or
  holds. A subject with neither a tag nor a class is therefore not matched. The hole this leaves
  -- a literal `details > *` transition -- is covered for our own sheets by the second test.
- **"Or anything inside one" is asserted for our sheets only, and the boundary is stated rather
  than fudged.** Quartz's base stylesheet transitions `a`, `blockquote` and a heading's permalink
  anchor. A folded section nearly always holds a link, so the literal build-wide reading of that
  clause fails on upstream on day one, and the only way to satisfy it would be to kill link
  colour fades inside every fold -- which is not what the prohibition is for. An eased disclosure
  is the hazard; a link fading inside one is not.

**Reduced motion is `none !important`, build-wide, not `0.01ms`.** The customary formulation
keeps a hundredth of a millisecond of animation so that `transitionend` still fires for scripts
waiting on one; nothing in this build waits on one, so there is no reason not to say what is
meant. It is in `prepper/tokens/components/index.ts` beside `floatingSurfaces`, because
`prepper/tokens` published the vocabulary and because the preference is a statement about the
reader rather than about which module wrote a declaration.

**The backtick trap bit for the third ticket running.** A `` `allow-discrete` `` written inside a
CSS comment in `prepper/sidebar`'s styles template literal terminated the string; the module
failed to load, and `npx tsc --noEmit` and `npx prettier --check` were both clean while twelve
sidebar tests failed on missing markup rather than on missing CSS. `npm run build 2>&1 | grep -i
"failed to load"` is still the reliable check. **No backticks in a CSS comment**, ever.

**Three existing assertions moved, and one that was expected to did not.**

- `sidebar.test.ts`'s "nothing in the collapse moves" is now "the rail fades, and nothing about
  it moves": exactly one rule in that sheet transitions, its subject is `.sidebar.left`, what it
  interpolates is `opacity` then `display` and nothing else, and both the duration and the easing
  are `var(--md-sys-motion-*)` rather than numbers. A literal here would be the sixth module
  picking its own, which is the drift `prepper/tokens` exists to end.
- `reading.test.ts`'s footer test matched the string `.sidebar.left{display:none`. The collapsed
  rule now declares an `opacity` too and lightningcss reorders the pair, so it reads the rule
  through the scanner instead.
- `topics.test.ts`'s "no breakpoint left in it" was narrowed as ticket 08 predicted, to rules in
  the tree's sheet whose selector names a disclosure. It would in fact still have passed
  unchanged -- the fade went into `prepper/sidebar`'s sheet, not the tree's -- but a whole-sheet
  ban would have reddened on the next legitimate rule with a misleading message, and the
  build-wide claim now has a proper home in `motion.test.ts`.
- `tokens.test.ts`'s "no motion, easing or duration token is defined" is inverted into a probe
  for `--md-sys-motion-easing-standard`, and a second test states the *shape* of the role set --
  four named families of four ascending durations, ten easings, each a curve. Not the values: the
  file's own header argues that re-listing roles is a second, weaker copy of `tokens.ts`, and
  that argument survives.

**Nothing else animates.** The bar, the cards, the chips, the quiz, the seal and the folds are all
untouched, and no `transition` or `animation` was added outside `prepper/sidebar`'s one rule and
`prepper/tokens`' one disabling block.

**Tests.** `npm test`: **524/524** (baseline 519 + 5 -- `motion.test.ts` is new with 4,
`tokens.test.ts` 1 -> 2). `npx tsc --noEmit` clean, `npx prettier --check` clean on everything
touched, `npm run build` loads every plugin and emits every token, `npm run validate` reports no
violations in 14 notes.

**Docs updated.** ADR 0003's motion bullet (it already carried ticket 08's forward-looking
amendment; it now says what actually landed -- how the prohibition is asserted, the honest scope
of "anything inside one", the reduced-motion decision and the one consumer) and ADR 0004's motion
consequence (the fade, and the slid drawer that was refused); `CLAUDE.md` (the design-tokens
section gains the motion scale, the consumer and the prohibition; the hideable-rail section gains
the fade and why the centre column's placement is what makes it safe); `CONTEXT.md`'s **Chrome**
entry; `prepper/README.md`'s file tree; and the module docs in `prepper/tokens/tokens.ts`,
`prepper/tokens/components/index.ts` and `prepper/sidebar/components/index.ts`.

**For ticket 10 (the bar's controls, from the keyboard).** Motion is done and it is not in your
way, but three things touch you.

- **A focus ring is not motion.** Do not ease one in; an indicator that takes 200ms to appear is
  an indicator that is wrong for 200ms. If you want the ring to animate anyway, the vocabulary is
  there (`short2` is Material's band for a control's own state change) and `motion.test.ts` will
  let it through as long as the subject is not a disclosure -- but the default answer is no.
- **The rail's fade means the rail is still focusable for 200ms after it is dismissed.** It keeps
  `display: flex` for the length of the transition. If ticket 10 moves focus on collapse, or
  asserts that nothing in the rail is tabbable while it is hidden, that window is real and seam 2
  will not show it to you: jsdom applies no transition, so `toggle.js`'s attribute flip looks
  instantaneous there. Assert it off the stylesheet or leave it alone.
- **`prepper/sidebar`'s stylesheet now has an unconditional rule whose subject is
  `.sidebar.left`.** `sidebar.test.ts`'s `conditional()` filter ignores it, so the non-movement
  proof is unaffected, but a test of yours that counts rules in that sheet should know it is
  there.
