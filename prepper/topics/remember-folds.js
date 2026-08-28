/**
 * The collapsed items, applied before the tree is drawn.
 *
 * Quartz inlines a `beforeDOMLoaded` script into the `<head>`, so this runs while the body is
 * still being parsed. Without it a reader who collapsed nine topics would watch all nine
 * unfold and fold again on every page they open, which is the flash `prepper/sidebar` splits
 * its own script in two to avoid.
 *
 * It cannot set `open` on elements that do not exist yet, so it does the one thing available
 * from the head: a stylesheet, naming the items by the same `data-fold` id the memory holds.
 * `folds.js` sets the real attribute the moment the body is there and takes this back out --
 * so what is left on the page is the element's own state, and nothing here outlives the load.
 *
 * `!important` because this has to beat the component stylesheet whichever order the two land
 * in, and a rule that exists for one paint is the one place that is cheaper than a specificity
 * game nobody would find again.
 *
 * The ids are filtered to the characters a slug is made of before they are written into a
 * selector: what comes back is a string out of the reader's own browser, and a string that
 * reaches a stylesheet unread is a habit rather than an incident waiting to happen.
 */
;(() => {
  try {
    const kept = window.localStorage.getItem("prepper-topic-folds")
    if (!kept) return

    const ids = kept.split(" ").filter((id) => /^[a-z0-9/-]+$/i.test(id))
    if (ids.length === 0) return

    const style = document.createElement("style")
    style.id = "prepper-topic-folds-initial"
    style.textContent = ids
      .map(
        (id) =>
          `.prepper-topic-fold[data-fold="${id}"] > :not(summary) { display: none !important; }
.prepper-topic-fold[data-fold="${id}"] > summary .prepper-topic-fold-chevron { transform: none !important; }`,
      )
      .join("\n")
    document.head.append(style)
  } catch {
    // Storage denied. Nothing to remember, and nothing to do about it.
  }
})()
