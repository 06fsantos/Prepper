import { readFileSync } from "node:fs"

import { h } from "preact"

import type {
  QuartzComponent,
  QuartzComponentConstructor,
} from "../../../quartz/components/types.ts"

/**
 * The control, and the rules that collapse the rail behind it.
 *
 * It is a plain `<button>` inside the rail itself, and a **direct child** of it rather than a
 * member of the toolbar group the search and theme controls sit in. That placement is
 * load-bearing twice over: the collapse rule hides the rail's other children by selector, so
 * the control has to be one of them to survive it, and `beforeBody` -- where a component with
 * nothing to say usually goes -- is inside the `.popover-hint` that Quartz's search preview
 * clones, which would put a second copy of this button over the top of the page.
 *
 * The state is an attribute on `<html>`, written by `remember.js` before the body is parsed
 * and by `toggle.js` on every click. Nothing here renders it: a component that emitted the
 * hidden state into the markup would bake one reader's preference into a page that is served
 * to every reader from a CDN.
 */
const PrepperSidebarToggle: QuartzComponentConstructor = () => {
  const Toggle: QuartzComponent = () =>
    h(
      "button",
      {
        type: "button",
        class: "prepper-sidebar-toggle",
        // The page is served hidden to nobody, so the accessible name and the pressed state
        // start where the markup starts. `toggle.js` corrects both the moment it has read
        // the remembered value, which is before the reader can reach the control.
        "aria-pressed": "false",
        "aria-label": "Hide the sidebar",
        title: "Hide the sidebar",
      },
      [icon()],
    )

  Toggle.css = styles
  Toggle.beforeDOMLoaded = script("remember.js")
  Toggle.afterDOMLoaded = script("toggle.js")
  return Toggle
}

/**
 * Three lines: the gesture every reader already knows means *the menu goes away, and comes
 * back*.
 *
 * It was a panel-and-column diagram, which described the rail accurately and asked the reader
 * to work out what pressing it would do. The hamburger says nothing about the rail and is
 * understood on sight, which is the trade a navigation control should take.
 *
 * `aria-hidden`, because the button already says what it does in words -- an icon that
 * repeated the label to a screen reader would say it twice.
 */
function icon() {
  return h(
    "svg",
    {
      class: "prepper-sidebar-toggle-icon",
      viewBox: "0 0 24 24",
      width: "20",
      height: "20",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linecap": "round",
      "aria-hidden": "true",
    },
    [
      h("line", { x1: "4", y1: "7", x2: "20", y2: "7" }),
      h("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
      h("line", { x1: "4", y1: "17", x2: "20", y2: "17" }),
    ],
  )
}

/**
 * The browser halves, read off disk rather than written here as strings.
 *
 * The same arrangement `prepper/quiz` and `prepper/problems` use: what is in the `.js` file
 * is what reaches the page, and there is no build step of ours between the two. Quartz
 * minifies them into `static/`, where the `prepper-` in the class name and the storage key is
 * what survives -- and what `prepper/testing/browser.ts` picks our scripts out by.
 */
function script(name: string): string {
  return readFileSync(new URL(name, new URL("../", import.meta.url)), "utf8")
}

/**
 * The collapse, as a change of grid.
 *
 * `prepper/reading` sets the three columns -- a rail that absorbs the remainder, the ~38rem
 * measure, a rail -- and this restates them with the left one reduced to a gutter wide enough
 * for the control, plus `justify-content: center`, so what is left of the layout sits in the
 * middle of the window instead of being pushed against the right rail. The breakpoints are
 * the same two upstream declares and the reading surface already mirrors; a rule written at a
 * third breakpoint would be a second layout rather than an override of the one.
 *
 * The rail's other children are hidden by selector rather than the rail itself, because
 * `display: none` on an ancestor takes the control down with everything else and leaves the
 * reader with a collapsed sidebar and no way back.
 */
const styles = `
.prepper-sidebar-toggle {
  align-self: flex-start;
  display: flex;
  align-items: center;
  padding: 0.4rem;
  margin: 0 0 0.2rem -0.4rem;
  background: none;
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
}
/* A round target under the pointer, the way the rail's own rows take a rounded one. The
   negative margin above puts the glyph back on the rail's left edge, so growing the target
   does not shift the icon out of line with the names below it. */
.prepper-sidebar-toggle:hover {
  color: var(--md-sys-color-on-surface);
  background-color: var(--md-sys-color-surface-container-high);
}
@media all and (min-width: 800px) {
  :root[data-prepper-sidebar="hidden"] .sidebar.left > *:not(.prepper-sidebar-toggle) {
    display: none;
  }
  :root[data-prepper-sidebar="hidden"] .sidebar.left {
    padding-left: 0.9rem;
    padding-right: 0.9rem;
  }
}
@media all and (min-width: 1200px) {
  :root[data-prepper-sidebar="hidden"] .page > #quartz-body {
    grid-template-columns:
      var(--prepper-rail-collapsed)
      min(
        var(--prepper-measure),
        calc(100% - var(--prepper-rail-collapsed) - var(--prepper-sidebar) - 10px)
      )
      var(--prepper-sidebar);
    justify-content: center;
  }
}
@media all and (min-width: 800px) and (max-width: 1200px) {
  :root[data-prepper-sidebar="hidden"] .page > #quartz-body {
    grid-template-columns:
      var(--prepper-rail-collapsed)
      min(var(--prepper-measure), calc(100% - var(--prepper-rail-collapsed) - 5px));
    justify-content: center;
  }
}
@media all and (max-width: 800px) {
  .prepper-sidebar-toggle { display: none; }
}
`

export { PrepperSidebarToggle }
