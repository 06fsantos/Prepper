/**
 * The control: one button, one attribute on `<html>`, one key in storage -- and two
 * presentations of the same fact.
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
 * ## Three states, because one word has to read sensibly at two widths
 *
 * The attribute has three: **absent**, which is whatever the viewport's own default is --
 * the rail in place beside the article on a desktop, no rail at all on a phone; **`hidden`**,
 * the reader has put the rail away; and **`shown`**, the reader has called it up. Each
 * explicit value differs from absent at exactly one width, which is what lets one remembered
 * word mean the right thing at both. See `components/index.ts` for the stylesheet half.
 *
 * Two consequences fall out of that, and both are wanted. A press is not "flip the
 * attribute" but **"put the rail away if it is on the page, call it up if it is not"** --
 * which is why the width is asked for, and it is asked with `matchMedia` at the stylesheet's
 * own breakpoint rather than from a measurement, so the script and the CSS cannot disagree
 * about which presentation is on screen. And `wire()` applies **only `hidden`** from storage,
 * never `shown`: a remembered `shown` decays to absent on every load and every navigation,
 * which is identical to `shown` on a desktop and is the phone drawer closing itself behind a
 * reader who has just followed a link out of it. A drawer that reopened over every article
 * the reader navigated to would be the top strip this replaced, wearing a shadow.
 *
 * Writing happens on a click and nowhere else, to the one key
 * `prepper/testing/browser.ts` permits by name. Everything the reader *does* -- what they
 * answered, what they unfolded, what they unsealed -- is still written nowhere at all.
 */
;(() => {
  const key = "prepper-sidebar"
  const attribute = "data-prepper-sidebar"
  const root = document.documentElement

  const state = () => root.getAttribute(attribute)

  /**
   * Which presentation is on screen: a column beside the article, or a drawer over it.
   *
   * 800px is upstream's own breakpoint, the one the reading surface and the collapse rule are
   * both already written in. A browser with no `matchMedia` is read as the wide one, because
   * that is the presentation the markup itself ships in.
   */
  const wide = () =>
    typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 800px)").matches : true

  /** Whether the rail is on the page as things stand -- which is what a press reverses. */
  const presented = () => (wide() ? state() !== "hidden" : state() === "shown")

  const buttons = () => document.getElementsByClassName("prepper-sidebar-toggle")

  const label = (button) => {
    const away = !presented()
    const name = away ? "Show the sidebar" : "Hide the sidebar"
    button.setAttribute("aria-pressed", String(away))
    button.setAttribute("aria-label", name)
    button.setAttribute("title", name)
  }

  const apply = (value) => {
    if (value === null) root.removeAttribute(attribute)
    else root.setAttribute(attribute, value)

    for (const button of buttons()) label(button)
  }

  const remember = (value) => {
    try {
      window.localStorage.setItem(key, value)
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
    apply(remembered() === "hidden" ? "hidden" : null)

    for (const button of buttons()) {
      // An SPA navigation re-runs this script over a body that may still hold the button it
      // wired a moment ago.
      if (button.dataset.prepperWired === "true") continue
      button.dataset.prepperWired = "true"
      button.addEventListener("click", () => {
        const next = presented() ? "hidden" : "shown"
        apply(next)
        remember(next)
      })
    }
  }

  document.addEventListener("nav", wire)
  wire()
})()
