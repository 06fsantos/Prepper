/**
 * The topic tree's folds: which items the reader has collapsed, and remembering the ones
 * they did.
 *
 * A fold is a `<details>` and it works with none of this -- the reader can open and shut every
 * item on the page with the scripts blocked, because that is what the element does. What this
 * file adds is the one thing HTML cannot do for itself: carrying a collapsed item across a
 * navigation. Without it a tree collapsed to the one topic being studied would spring back
 * open on the next click of a wikilink, which is the complaint the rail's own memory exists to
 * answer.
 *
 * ## What is kept, and why it is not a hole
 *
 * One key, `prepper-topic-folds`, holding the ids of the items that are **shut** -- so a
 * reader who has collapsed nothing has nothing stored, and clearing the key restores the tree
 * the build serves. It is the second key in the app and the same category as the first: which
 * furniture is in the way, never what the reader answered, opened or unsealed, all of which
 * are still written nowhere at all. `prepper/testing/browser.ts` permits it by name alongside
 * `prepper-sidebar` and records what lands in it, so this is asserted rather than assumed.
 *
 * ## Why the click is what is listened to, and not `toggle`
 *
 * `toggle` is the obvious event and the wrong one, twice over. It says the fold changed but
 * not who changed it -- and two things change a fold that are not the reader: applying the
 * remembered state on every page load, and clicking a topic's *name*, which is a link inside
 * the row that works the fold, so the browser follows it and toggles. Remembering that second
 * one would shut the topic the reader has just navigated into, for a reason they could not
 * name. A click on the row is the gesture itself, it covers the keyboard -- Enter and Space on
 * a `<summary>` are clicks -- and it can tell the two apart by asking what was clicked.
 *
 * The state is read back rather than predicted: flipping `open` is this event's default
 * action, so it has not happened yet when the listener runs, and a timeout is the wait for the
 * browser to do its half.
 */
;(() => {
  const key = "prepper-topic-folds"
  const bridge = "prepper-topic-folds-initial"

  const read = () => {
    try {
      const kept = window.localStorage.getItem(key)
      return new Set(kept ? kept.split(" ").filter(Boolean) : [])
    } catch {
      // Storage denied. Every item is open, which is the state the markup arrives in.
      return new Set()
    }
  }

  const write = (ids) => {
    const next = [...ids].sort()
    if (next.join(" ") === [...read()].sort().join(" ")) return
    try {
      if (next.length > 0) window.localStorage.setItem(key, next.join(" "))
      else window.localStorage.removeItem(key)
    } catch {
      // Storage denied. The fold still folds; it just forgets by the next page.
    }
  }

  const folds = () => document.querySelectorAll("details.prepper-topic-fold[data-fold]")

  const wire = () => {
    const shut = read()

    for (const fold of folds()) {
      const id = fold.dataset.fold

      // Assigned only when it differs. Setting `open` to what it already is still writes the
      // attribute, and a page that rewrote every item's state on every navigation would be
      // doing work to arrive where it started.
      const open = !shut.has(id)
      if (fold.open !== open) fold.open = open

      // An SPA navigation re-runs this script; on the first page it is a fresh document, on
      // every one after it may be the same elements.
      if (fold.dataset.prepperWired === "true") continue
      fold.dataset.prepperWired = "true"

      const row = fold.querySelector(":scope > summary")
      row?.addEventListener("click", (event) => {
        if (event.target.closest("a")) return

        window.setTimeout(() => {
          const ids = read()
          if (fold.open) ids.delete(id)
          else ids.add(id)
          write(ids)

          // The entry point renders the tree twice -- once as the page's body and once in the
          // rail beside it -- and they are one index, so an item shut in either is shut in
          // both. Everywhere else this loop finds only the fold that was just worked.
          for (const other of folds()) {
            if (other !== fold && other.dataset.fold === id) other.open = fold.open
          }
        }, 0)
      })
    }

    // The head script's stopgap, which held the shut items shut until the line above could say
    // so on the element itself. It has done its work the moment the first fold is set.
    document.getElementById(bridge)?.remove()
  }

  document.addEventListener("nav", wire)
  wire()
})()
