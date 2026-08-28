# 09: Motion tokens, and the seal that never animates

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
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
