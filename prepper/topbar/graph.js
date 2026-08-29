/**
 * The graph plugin's local panel, taken out of the document, so that what is left of it in
 * the bar is the control that opens the modal.
 *
 * `@quartz-community/graph` renders three things inside one `.graph` element: a heading, a
 * `.graph-outer` box holding a 250px `.graph-container` and the `.global-graph-icon` button,
 * and the `.global-graph-outer` modal the button opens. It offers no option for the modal
 * alone. Prepper wants the modal and the button and not the box -- the panel at the edge of
 * the page is the thing this ticket removes -- and the plugin is a remote that is neither
 * forked nor patched, so the shaping happens from outside it.
 *
 * Most of that shaping is CSS, in `prepper/topbar/components/index.ts`, and CSS is the right
 * tool because it applies before the first paint. This file exists for the one part CSS
 * cannot do. The plugin's client renders into **every `.graph-container` in the document**,
 * whether or not anything is drawing it: `display: none` would leave a Pixi application, a
 * d3 force simulation and a `requestAnimationFrame` loop running on every page for a canvas
 * nobody can see. Removing the element is what actually stops the work, and it is a smaller
 * intervention than the alternative, which would be to fork the plugin.
 *
 * `.global-graph-container` -- the modal's own canvas host -- is a different class and is
 * deliberately left alone. Nothing here touches the button, the modal, the plugin's
 * listeners or the Ctrl/Cmd-G shortcut.
 *
 * ## Why this always wins the race, and it is a race
 *
 * The plugin's own render is behind a `nav` listener that it registers **only after** its two
 * CDN libraries have loaded (`document.addEventListener("nav", …)` sits inside the callback
 * of the `Promise.all` that fetches d3 and Pixi). This script registers its listener at
 * module-evaluation time, which is unconditionally earlier, and listeners on one target fire
 * in registration order -- so on every navigation the container is gone before the plugin
 * looks for it. On the first load the same holds for a simpler reason: the sweep cannot run
 * until those libraries arrive, and this has run by then.
 *
 * It has to run on every navigation and not once: Quartz's SPA router morphs the whole
 * `<body>` against the fetched page, which puts the element back.
 *
 * Nothing is remembered and nothing is sent. The graph plugin's own `graph-visited` key is
 * its business and is untouched by this.
 */
;(() => {
  const strip = () => {
    for (const graph of Array.from(document.getElementsByClassName("graph"))) {
      for (const panel of Array.from(graph.getElementsByClassName("graph-container"))) {
        panel.remove()
      }
      // Not a guard and not a styling hook -- removing an element that is not there is
      // already idempotent, and the stylesheet keys on the plugin's own class names so that
      // a page whose scripts never run shows a control rather than a panel that flashes and
      // vanishes. It is a record that this ran, which seam 2 can ask a page for, and it is
      // the `prepper-` string by which `prepper/testing/browser.ts` recognises this file as
      // ours in the emitted bundle.
      graph.setAttribute("data-prepper-graph-control", "true")
    }
  }

  document.addEventListener("nav", strip)
  strip()
})()
