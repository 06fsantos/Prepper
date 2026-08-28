/**
 * The remembered rail, applied before the page is drawn.
 *
 * Quartz inlines a `beforeDOMLoaded` script into the `<head>`, so this runs while the body is
 * still being parsed: a reader who collapsed the rail last time never sees it appear and then
 * vanish. That is the entire reason this is a second file rather than four lines at the top of
 * `toggle.js`, which runs too late to prevent the flash it would be fixing.
 *
 * One key, one word, and a `catch`: a browser that refuses storage is a browser where the rail
 * starts shown, which is the state the markup is served in anyway.
 */
;(() => {
  try {
    if (window.localStorage.getItem("prepper-sidebar") === "hidden") {
      document.documentElement.setAttribute("data-prepper-sidebar", "hidden")
    }
  } catch {
    // Storage denied. Nothing to remember, and nothing to do about it.
  }
})()
