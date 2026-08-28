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
  Tokens.css = `${tokens}\n${floatingSurfaces}`
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

export { PrepperTokens }
