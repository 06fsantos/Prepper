/**
 * The fold an anchor lands in, opened.
 *
 * Every fold on a page ships closed, and a browser does not open a closed `<details>` to
 * reach an anchor inside it: a table-of-contents click, a heading permalink, or a wikilink
 * written with a `#heading` would otherwise scroll to a section that is not on screen. So
 * this opens the target's ancestors and scrolls to it -- the whole of the enhancement, and
 * an enhancement rather than a mechanism, because a page with none of this still folds,
 * still unfolds on click, and still shows every word the note contains.
 *
 * Nothing is remembered. Which folds a reader opened is not state this app keeps -- the next
 * visit to a note is the same outline the last one started from, which is the point.
 *
 * Listeners go on `window` and `document`, which survive an SPA navigation, so this runs
 * once. Quartz re-runs an inlined script on navigation all the same, hence the flag: a
 * second copy of these listeners would scroll the reader twice.
 */
;(() => {
  const marker = "__prepperFoldReveal"
  if (window[marker]) return
  window[marker] = true

  const opened = () => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return

    const target = document.getElementById(id)
    if (!target) return

    let fold = target.closest("details.prepper-fold")
    while (fold) {
      fold.open = true
      fold = fold.parentElement && fold.parentElement.closest("details.prepper-fold")
    }

    // The browser scrolled before the fold opened, if it scrolled at all, so the position
    // it settled on is the position of a section that was not yet on the page.
    target.scrollIntoView()
  }

  window.addEventListener("hashchange", opened)
  document.addEventListener("nav", opened)
  opened()
})()
