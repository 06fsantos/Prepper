import type {
  QuartzComponent,
  QuartzComponentConstructor,
} from "../../../quartz/components/types.ts"

import { tokens } from "../tokens.ts"

/**
 * The token layer's delivery mechanism: a component that renders nothing and carries a
 * stylesheet.
 *
 * Quartz collects `Component.css` from the **configured component list** rather than from
 * what a given page rendered, emits each collected stylesheet into `@layer quartz-base`, and
 * links every one of them on every laid-out page -- the 404 included, whose `beforeBody` this
 * config clears. So a component that never renders still themes the site, and a `:root` block
 * in it still redefines Quartz's own nine by identical selector on source order, because the
 * base stylesheet is linked first.
 *
 * That mechanism is already load-bearing for `prepper/reading`'s measure. This is its second
 * consumer, and the single seam-1 test in `../tokens.test.ts` watches it: if an upstream merge
 * changes how component CSS is collected, every page falls back to undefined custom properties
 * at once and nothing else in the suite notices.
 *
 * It renders `null` rather than, say, a `<style>` element, because a token layer is not
 * content: there is no page it belongs to more than any other, and markup in `beforeBody`
 * would put it inside one note's header.
 */
const PrepperTokens: QuartzComponentConstructor = () => {
  const Tokens: QuartzComponent = () => null
  Tokens.css = `${tokens}\n${floatingSurfaces}\n${stillness}`
  return Tokens
}

/**
 * The only shadows in the build.
 *
 * Elevation is spent on surfaces that genuinely **float and occlude**, and hierarchy between
 * flat surfaces comes from the `surface-container-*` ladder instead. Quartz's link popover is
 * such a surface and belongs to no module of ours: when `enablePopovers` is on the build adds
 * its stylesheet *after* the component CSS has been collected, so it is baked into `index.css`
 * rather than emitted as a component sheet. That is what makes this override safe at equal
 * specificity -- `index.css` is always linked first, ahead of every component stylesheet --
 * and it is the reason the rule has to live here rather than in a module that owns the markup,
 * because no module does. The mobile topic drawer is the other floating surface, and it is
 * styled where it is built, in `prepper/topics`.
 *
 * Level 2 is Material's step for a surface that hovers over content without being modal.
 */
const floatingSurfaces = `
.popover > .popover-inner {
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  box-shadow: var(--md-sys-elevation-level2);
}
`

/**
 * A reader who asked for no motion gets none.
 *
 * **Disabled, not shortened.** The usual formulation of this block sets every duration to
 * `0.01ms`, which is a trick for keeping `transitionend` firing in scripts that wait on it;
 * nothing in this build waits on one, so there is no reason to leave a hundredth of a
 * millisecond of animation running rather than saying what is meant.
 *
 * It is the whole build's rule rather than ours alone, and it is `!important` for the same
 * reason: `prefers-reduced-motion` is a statement about the reader, not about which module
 * wrote a declaration. Quartz's base stylesheet fades links, popovers and callouts, and every
 * community plugin brings its own; a rule scoped to our own classes would leave a reader who
 * asked for stillness with most of the page still moving.
 *
 * It lives here, beside the token layer, because `prepper/tokens` is what published the
 * vocabulary that made motion possible in this build at all. `motion.test.ts` asserts it.
 */
const stillness = `
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
`

export { PrepperTokens }
