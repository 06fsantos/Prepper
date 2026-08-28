/**
 * The control: one button, one attribute on `<html>`, one key in storage.
 *
 * The state lives on the attribute rather than in a variable here, because `remember.js` set
 * it in the `<head>` before this file existed and an SPA navigation re-runs this one: a
 * variable would start at "shown" on the second page, and the first click would put the rail
 * back where it already was.
 *
 * It reads the key too, once, when it wires the control. That is not a second opinion -- it
 * is the same key `remember.js` reads, so the two cannot disagree -- but the fallback for the
 * reader whose head script never ran, and the only reading of the preference that a test can
 * watch: Quartz bundles `beforeDOMLoaded` scripts into one file with its own, and
 * `prepper/testing/browser.ts` will not run Quartz's client to reach ours.
 *
 * Writing happens on a click and nowhere else, to the one key
 * `prepper/testing/browser.ts` permits by name. Everything the reader *does* -- what they
 * answered, what they unfolded, what they unsealed -- is still written nowhere at all.
 */
;(() => {
  const key = "prepper-sidebar"
  const attribute = "data-prepper-sidebar"
  const root = document.documentElement

  const hidden = () => root.getAttribute(attribute) === "hidden"

  const buttons = () => document.getElementsByClassName("prepper-sidebar-toggle")

  const label = (button) => {
    const name = hidden() ? "Show the sidebar" : "Hide the sidebar"
    button.setAttribute("aria-pressed", String(hidden()))
    button.setAttribute("aria-label", name)
    button.setAttribute("title", name)
  }

  const show = (state) => {
    if (state === "hidden") root.setAttribute(attribute, "hidden")
    else root.removeAttribute(attribute)

    for (const button of buttons()) label(button)
  }

  const remember = (state) => {
    try {
      window.localStorage.setItem(key, state)
    } catch {
      // Storage denied. The rail still collapses; it just forgets by the next page.
    }
  }

  const remembered = () => {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }

  const wire = () => {
    show(remembered() === "hidden" ? "hidden" : "shown")

    for (const button of buttons()) {
      // An SPA navigation re-runs this script over a body that may still hold the button it
      // wired a moment ago.
      if (button.dataset.prepperWired === "true") continue
      button.dataset.prepperWired = "true"
      button.addEventListener("click", () => {
        const state = hidden() ? "shown" : "hidden"
        show(state)
        remember(state)
      })
    }
  }

  document.addEventListener("nav", wire)
  wire()
})()
