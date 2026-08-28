import type {
  QuartzComponent,
  QuartzComponentConstructor,
} from "../../../quartz/components/types.ts"

/**
 * A component that renders nothing and carries the bar.
 *
 * The same delivery `prepper/tokens` uses, and for the same reason: Quartz collects
 * `Component.css` from the configured component list rather than from what a page rendered,
 * so a stylesheet on a null component lands on every laid-out page -- 404 and the generated
 * folder index included -- without a second emitter to get itself linked.
 *
 * There is nothing for it to render. `header` is a flat array whose components become the
 * children of one `<header>`; a component placed there is a sibling of the app's name and of
 * search, never their wrapper. See `prepper/topbar/index.ts` for the whole argument.
 */
const PrepperTopbar: QuartzComponentConstructor = () => {
  const Topbar: QuartzComponent = () => null
  Topbar.css = styles
  return Topbar
}

/**
 * The bar, as a change to the header cell.
 *
 * ## The offset is one number, written once
 *
 * `--prepper-topbar-height` is declared in `:root` and then referred to by everything that
 * has to begin below the bar: the page's own top padding, the sticky rails' `top` and the
 * height they are allowed, and the scroll padding an in-page anchor lands against. A literal
 * anywhere else would be a second copy of the bar's height, free to disagree with it, and
 * `prepper/testing/layout.test.ts` asserts that the value appears exactly once in the emitted
 * stylesheet.
 *
 * `scroll-padding-top` is not decoration. Every heading in a note is an anchor, and
 * `prepper/folding`'s `reveal.js` opens the folds a `#heading` lands in and lets the browser
 * scroll to it; without the padding it would scroll that heading to y=0, which is underneath
 * a bar that is nailed there.
 *
 * ## Why the rails are moved and not just the page
 *
 * Padding the body starts the *document* below the bar, but a sticky rail with `top: 0`
 * climbs back to the top of the **viewport** on scroll, which is behind the bar. So the two
 * rails take the bar's height as their `top` and lose it from their `height`. The rules are
 * split across upstream's own 800px and 1200px breakpoints because upstream unsets the
 * height of each rail at the width where it stops being a sticky column: the right rail
 * below 1200px, the left rail below 800px. Setting a height there would put it back.
 *
 * ## The three slots
 *
 * One rule makes them: search takes `margin-inline: auto`, so everything ordered before it is
 * pushed to the left edge and everything after it to the right. `left: 50%` with a
 * `translateX(-50%)` would centre the field exactly -- and would also make the bar's `.search`
 * a containing block for the `position: fixed` search overlay nested inside it, which would
 * stop being a modal over the page and become a 4rem-tall strip inside the bar. The centring
 * is approximate; the modal works.
 *
 * The same reasoning rules out a frosted `backdrop-filter` on the bar itself, which would do
 * it from one level higher up. Hierarchy comes from `surface-container` and a hairline
 * instead, which is what ADR 0003 says a flat surface gets: shadow is spent where something
 * floats and occludes, and the bar occludes nothing until the page scrolls under it.
 *
 * `z-index: 1000` is one above the popover's 999. The bar has to paint over the article that
 * scrolls beneath it, and because the search overlay is a fixed element *inside* the bar's
 * stacking context, the number the bar takes is also the number the overlay ends up with in
 * the root: below 1000 a link popover left open behind the modal would paint over it.
 *
 * ## Reader mode
 *
 * Upstream's reader mode fades the two rails to nothing and brings them back on hover. The
 * bar joins them, on the same attribute and with the same gesture -- and with no transition
 * of its own, because motion is `prepper/tokens`' vocabulary and it does not have one yet.
 * `opacity` is the right tool here and is safe: unlike `transform` and `filter`, it makes a
 * stacking context without making a containing block, so the search overlay still resolves
 * against the viewport.
 */
const styles = `
:root {
  --prepper-topbar-height: 4rem;
}
html {
  scroll-padding-top: var(--prepper-topbar-height);
}
body {
  padding-top: var(--prepper-topbar-height);
}
.page > #quartz-body .page-header > header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-sizing: border-box;
  height: var(--prepper-topbar-height);
  margin: 0;
  padding: 0 1.25rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
}
/* Every control keeps its own size; only search is allowed to give ground, because it is the
   one thing in the bar with slack in it. */
.page-header > header > * {
  flex: 0 0 auto;
}
.page-header > header > .search {
  flex: 0 1 auto;
  margin-inline: auto;
}
.page-header > header > .page-title {
  margin: 0;
  font-family: var(--md-sys-typescale-title-medium-font);
  font-size: var(--md-sys-typescale-title-medium-size);
  line-height: var(--md-sys-typescale-title-medium-line-height);
  font-weight: var(--md-sys-typescale-title-medium-weight);
  letter-spacing: var(--md-sys-typescale-title-medium-tracking);
}
.page-header > header > .page-title > a {
  color: var(--md-sys-color-on-surface);
  background-color: transparent;
}
/* Upstream keeps 6rem of air above the page and above each rail, which existed because
   nothing else did. The bar is that now, so what is left here is the gap *below* the bar --
   and the page's total top spacing comes out where it was before the bar arrived, rather
   than 6rem further down it. */
.page > #quartz-body .page-header {
  margin-top: 2rem;
}
.page > #quartz-body .sidebar {
  padding-top: 2rem;
}
@media all and (min-width: 1200px) {
  .page > #quartz-body .sidebar {
    top: var(--prepper-topbar-height);
    height: calc(100vh - var(--prepper-topbar-height));
  }
}
@media all and (min-width: 800px) and (max-width: 1200px) {
  .page > #quartz-body .sidebar.left {
    top: var(--prepper-topbar-height);
    height: calc(100vh - var(--prepper-topbar-height));
  }
}
:root[reader-mode="on"] .page-header > header {
  opacity: 0;
}
:root[reader-mode="on"] .page-header > header:hover {
  opacity: 1;
}
`

export { PrepperTopbar }
