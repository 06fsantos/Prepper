import { readFileSync } from "node:fs"

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
  // The bar's one piece of behaviour, and it is a removal rather than a control: the graph
  // plugin's local panel comes out of the document so that what is left of its `.graph`
  // element in the bar is the button that opens the modal. See `prepper/topbar/graph.js` for
  // why CSS cannot do this part.
  Topbar.afterDOMLoaded = script("graph.js")
  return Topbar
}

/**
 * The browser half, read off disk rather than written here as a string.
 *
 * The same arrangement `prepper/sidebar` and `prepper/quiz` use: what is in the `.js` file is
 * what reaches the page, with no build step of ours between the two.
 */
function script(name: string): string {
  return readFileSync(new URL(name, new URL("../", import.meta.url)), "utf8")
}

/**
 * The bar, as a change to the header cell.
 *
 * ## The offset is one number, written once
 *
 * `--prepper-topbar-height` is declared in `:root` and then referred to by everything that
 * has to begin below the bar: the page's own top padding, the sticky rail's `top` and the height
 * it is allowed, the table of contents in the margin, and the scroll padding an in-page anchor
 * lands against. A literal
 * anywhere else would be a second copy of the bar's height, free to disagree with it, and
 * `prepper/testing/layout.test.ts` asserts that the value appears exactly once in the emitted
 * stylesheet.
 *
 * `scroll-padding-top` is not decoration. Every heading in a note is an anchor, and
 * `prepper/folding`'s `reveal.js` opens the folds a `#heading` lands in and lets the browser
 * scroll to it; without the padding it would scroll that heading to y=0, which is underneath
 * a bar that is nailed there.
 *
 * ## Why the rail is moved and not just the page
 *
 * Padding the body starts the *document* below the bar, but a sticky rail with `top: 0`
 * climbs back to the top of the **viewport** on scroll, which is behind the bar. So the rail
 * takes the bar's height as its `top` and loses it from its `height` -- above 800px, which is
 * where upstream makes it a sticky column at all; below that it is the drawer, which anchors
 * itself to the same token.
 *
 * There is one rail. The right one is retired (`prepper/reading`), and these rules used to
 * carry a second media band for it that did nothing but say so.
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
 * ## The graph control is the graph plugin's own button
 *
 * `@quartz-community/graph` is placed in the bar rather than in the right rail, and what the
 * bar wants out of it is the modal it already ships -- `80vw` by `80vh`, opened by its
 * `.global-graph-icon` and by Ctrl/Cmd-G -- rather than the 250px panel that used to sit at
 * the edge of every page. The plugin renders both inside one `.graph` element and has no
 * option for the modal alone, and it is a remote that is neither forked nor patched, so what
 * is left over is styled away from outside: the heading is dropped, the `.graph-outer` box
 * gives up its border, its height and its positioning, and the button comes out of the corner
 * it was absolutely placed in and becomes a plain icon control the size of the two beside it.
 *
 * These rules key on the **plugin's own class names** and not on anything a script adds,
 * because a stylesheet that waited for JavaScript would show a 250px panel wedged into a 4rem
 * bar until the script arrived. The one thing left for `prepper/topbar/graph.js` is taking
 * the local `.graph-container` out of the document, which CSS cannot do and which matters
 * because the plugin renders into every one it can find whether or not it is on screen.
 *
 * The modal needs nothing from us. Its own `z-index: 9999` sits inside the bar's stacking
 * context, so it resolves above the bar's 1000 and above the mobile drawer's 999 without a
 * number of ours; and it is `position: fixed` with no `transform`, `filter` or `contain` on
 * any ancestor, which is the same prohibition the search overlay already binds this module
 * to. Its blurred backdrop covers the bar, including the control that opened it, which is
 * what a modal should do.
 *
 * ## The keyboard
 *
 * Six controls sit here and five of them are icon-only, so the bar is where this app's
 * keyboard legibility is decided. Three rules do it, and all three have the **bar** as their
 * subject rather than any control in it, which is what makes them true of the next control
 * as well as of these six:
 *
 * - one `:focus-visible` outline, reaching every focusable thing in the bar;
 * - the search field's label and border, repainted off the token roles because the two names
 *   they arrived in resolve to 3.84:1 and 1.46:1 against the bar in light mode;
 * - and reader mode's fade, undone by `:focus-within` as well as by `:hover`.
 *
 * That last one is not a nicety. Fading the chrome to `opacity: 0` leaves every control in it
 * focusable and invisible, and a pointer has a gesture for bringing it back where a keyboard
 * has none -- so a reader tabbing across a page in reader mode would be moving focus through
 * six controls that are not on screen. `prepper/sidebar` does the same for the rail, which
 * upstream fades by the same rule and fills with links.
 *
 * What is **not** here is any rule that says a control's state in colour. The rail toggle
 * swaps its glyph (`prepper/sidebar`) and the theme switch swaps its icon (upstream's own
 * `display` rules), both on `display`; a tint would have been cheaper and would have said
 * nothing to a reader who cannot see the difference between two tints.
 *
 * ## Reader mode
 *
 * Upstream's reader mode fades the rails to nothing and brings them back on hover. The
 * bar joins them, on the same attribute and with the same gesture -- and with no transition
 * of its own: there is a motion vocabulary in the build now, and a bar that faded in and out
 * from under a reader's pointer is exactly what it is not for.
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
/* One ring, every control, and the bar is its subject rather than any one thing in it -- so a
   control that arrives in a new slot is focusable-visibly the day it arrives, with nothing to
   remember. :focus-visible rather than :focus, so a pointer press does not leave a ring
   behind it.

   outline rather than a border, a shadow or a background: it is drawn outside the border
   box, so nothing in the bar changes size or moves when focus lands on it, and it follows the
   rounded corners of whatever it lands on. The offset puts it on the bar's own surface, which
   is what its contrast is measured against -- primary on surface-container is 5.53:1 in
   light and 9.64:1 in dark, against the 3:1 a non-text indicator needs, and it clears 3:1
   against the hover surface underneath it as well. prepper/topbar/controls.test.ts computes
   both from the emitted tokens rather than taking this comment's word for it.

   And it does not ease. There is a motion vocabulary now and a ring is not what it is for: an
   indicator that arrives over 200ms is an indicator that is not there for the first 200ms of
   every keystroke, and a reader tabbing through six controls would be chasing it. */
.page-header > header :focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}
/* Search is the one control in the bar that upstream draws as a field rather than as an icon,
   and it arrived painted in Quartz's old names: its label in --gray and its border in
   --lightgray, which resolve onto outline and outline-variant and come out at 3.84:1 and
   1.46:1 against the bar in light mode -- a label under the 4.5:1 text minimum and a boundary
   all but invisible. Both are repainted here, from the bar rather than in prepper/search's
   vendored sheet, which stays outside the token system by ADR 0003. */
.page-header > header > .search > .search-button {
  border-color: var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-small);
}
.page-header > header > .search > .search-button > p {
  color: var(--md-sys-color-on-surface-variant);
}
/* Upstream keeps 6rem of air above the page and above each rail, which existed because
   nothing else did. The bar is that now, so what is left here is the gap *below* the bar --
   and the page's total top spacing comes out where it was before the bar arrived, rather
   than 6rem further down it. */
.page > #quartz-body .page-header {
  margin-top: 2rem;
}
.page > #quartz-body .sidebar.left {
  padding-top: 2rem;
}
@media all and (min-width: 800px) {
  .page > #quartz-body .sidebar.left {
    top: var(--prepper-topbar-height);
    height: calc(100vh - var(--prepper-topbar-height));
  }
}
/* The graph control: the plugin's own button, with the panel it was drawn in the corner of
   taken away around it. Every selector here is a child chain from the bar, so it outranks the
   plugin's own rules wherever the two disagree, whichever order the sheets are linked in. */
.page-header > header > .graph {
  display: flex;
  align-items: center;
}
.page-header > header > .graph > h3 {
  display: none;
}
.page-header > header > .graph > .graph-outer {
  position: static;
  height: auto;
  margin: 0;
  border: none;
  border-radius: 0;
  overflow: visible;
}
/* Belt and braces with graph.js, which removes this element outright: a reader whose
   scripts have not arrived gets a bar rather than a 250px box wedged into it. */
.page-header > header > .graph > .graph-outer > .graph-container {
  display: none;
}
.page-header > header > .graph > .graph-outer > .global-graph-icon {
  position: static;
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  margin: 0;
  padding: 0.4rem;
  opacity: 1;
  border-radius: var(--md-sys-shape-corner-full);
  color: var(--md-sys-color-on-surface-variant);
}
.page-header > header > .graph > .graph-outer > .global-graph-icon > svg {
  width: 20px;
  height: 20px;
}
.page-header > header > .graph > .graph-outer > .global-graph-icon:hover {
  color: var(--md-sys-color-on-surface);
  background-color: var(--md-sys-color-surface-container-high);
}
:root[reader-mode="on"] .page-header > header {
  opacity: 0;
}
:root[reader-mode="on"] .page-header > header:hover,
:root[reader-mode="on"] .page-header > header:focus-within {
  opacity: 1;
}
`

export { PrepperTopbar }
