import { readFileSync } from "node:fs"

import { h } from "preact"

import type {
  QuartzComponent,
  QuartzComponentConstructor,
} from "../../../quartz/components/types.ts"

/**
 * The control, and the one rule that hides the rail behind it.
 *
 * It is a plain `<button>` in the **top bar**, at the far left of it, and it is no longer
 * inside the thing it hides. It used to be a direct child of the rail, and that was
 * load-bearing while the collapse worked by hiding the rail's children one at a time and
 * sparing this one; the note is gone because the constraint is. The rail is hidden whole now,
 * so a control anywhere inside it would go down with it and there would be no way back.
 *
 * One placement is still ruled out, for an unrelated reason: `beforeBody` -- where a
 * component with nothing much to say usually goes -- sits inside the `.popover-hint` that
 * Quartz's search preview clones out of a fetched page, which would splice a second copy of
 * this button over the top of the page the reader is on. `header` is a **sibling** of the
 * hint rather than a descendant, which is why the bar is allowed to hold it.
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
        // start where the markup starts -- which is the wide presentation, the one the
        // stylesheet's own default is. `toggle.js` corrects both the moment it has read the
        // remembered value and the viewport's width, which is before the reader can reach
        // the control; on a phone that means "Show the sidebar", because down there the
        // rail is a drawer and the drawer starts closed.
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
 * Two presentations of one rail, and the three-valued attribute that picks between them.
 *
 * Above 800px the rail is a column beside the article and the collapse is one declaration --
 * `display: none` on `.sidebar.left`, and nothing else. Not `width: 0`, which leaves a box
 * with padding and a scrollbar in it; not a rule per child, which is what this used to be and
 * which only existed because the way back was one of those children.
 *
 * What is deliberately *not* here is any rule that touches the grid. `prepper/reading`
 * declares `grid-template-columns` on `.page > #quartz-body` once per viewport band, and
 * neither state re-declares any of them: the rail's track stays `minmax(320px, 1fr)`
 * whether or not a rail is drawn in it, so the centre column resolves against exactly the
 * same track list in both states and the article cannot move. The old collapse restated the
 * three columns with the left one reduced to a gutter, plus `justify-content: center`, and
 * that -- not any transition -- is what made the prose jump sideways. `sidebar.test.ts`
 * asserts the absence at 360px, 1280px, 1600px and 1920px, because an absence is exactly the
 * kind of thing a later edit restores without noticing.
 *
 * ## Below 800px the rail is a drawer, and it starts closed
 *
 * Quartz lays the left rail out below its own 800px breakpoint as a **strip across the top of
 * the page**, which put the entire topic tree above every article a phone reader opened, with
 * no way to dismiss it. So below 800px the rail is not in the flow at all until it is asked
 * for: `display: none` unconditionally, and a drawer `position: fixed` over the article when
 * the attribute says the reader called it up.
 *
 * The default is the closed one, and it is stated as the **absence** of the attribute rather
 * than as a value -- so a page whose scripts have not run, or will never run, is a page with
 * no drawer open over its article rather than one waiting for JavaScript to shut it. That is
 * the same argument the Problem seal is built on, in the opposite direction.
 *
 * Hence the three states `toggle.js` writes: absent is each width's own default (a rail
 * beside the article, no drawer over it), `hidden` differs from absent only above 800px, and
 * `shown` differs from absent only below it. One remembered word, two presentations, and no
 * width at which it reads as nonsense.
 *
 * The drawer begins at `--prepper-topbar-height` rather than at the top of the viewport,
 * because the way out of it is the same control that opened it and that control is in the
 * bar; and it sits under the bar's `z-index: 1000` for the same reason. There is no scrim: a
 * dimmed sheet that cannot be tapped to close is a control that looks like one and is not,
 * and the toggle is on screen throughout.
 *
 * Nothing here animates -- not the collapse, not the drawer. Motion is `prepper/tokens`'
 * vocabulary and its own ticket, and a drawer that slid would be a rail whose state a reader
 * can catch mid-flight.
 */
const styles = `
.prepper-sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  background: none;
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
}
/* A round target under the pointer, the way the bar's other icon controls take one. */
.prepper-sidebar-toggle:hover {
  color: var(--md-sys-color-on-surface);
  background-color: var(--md-sys-color-surface-container-high);
}
@media all and (min-width: 800px) {
  :root[data-prepper-sidebar="hidden"] .page > #quartz-body .sidebar.left {
    display: none;
  }
}
@media all and (max-width: 800px) {
  /* Not a strip above the article: the rail is off the page until it is asked for, and it is
     off the page in the markup's own default state rather than by a script's intervention. */
  .page > #quartz-body .sidebar.left {
    display: none;
  }
  /* The drawer. Fixed, so the article underneath it is not re-laid-out when it opens, and
     bounded by the viewport rather than by a fixed width, so nothing can scroll sideways. */
  :root[data-prepper-sidebar="shown"] .page > #quartz-body .sidebar.left {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1.2rem;
    position: fixed;
    top: var(--prepper-topbar-height);
    bottom: 0;
    left: 0;
    z-index: 999;
    box-sizing: border-box;
    width: min(20rem, 85vw);
    padding: 1rem;
    overflow-y: auto;
    background-color: var(--md-sys-color-surface-container-low);
    border-right: 1px solid var(--md-sys-color-outline-variant);
    box-shadow: var(--md-sys-elevation-level1);
  }
}
`

export { PrepperSidebarToggle }
