/**
 * The hint ladder's control -- the browser half of `## Hints`.
 *
 * A Problem's hints are written as an ordered list from nudge to near-answer, and reading
 * the whole ladder at once is reading the answer. This element hides the rungs and hands
 * the dev one control, so the nudge they take is the smallest one that unblocks them.
 *
 * ## Why hiding here is safe, when hiding the solution here would not be
 *
 * The seal on `## Solution` and `## Complexity` is a `<details>`, closed by the HTML
 * specification before any of this loads, precisely because a script that has not run
 * leaves a solution on screen. The ladder is the other way round: a script that has not
 * run leaves the *hints* on screen, which is what the vault says and what Obsidian shows.
 * So the build ships the ladder open and this takes it away -- progressive enhancement in
 * the direction where the degraded state is the harmless one. With JavaScript off, the dev
 * reads all three hints, which is exactly what they would have got had this ticket never
 * been written.
 *
 * ## Why a custom element
 *
 * Quartz navigates as an SPA: the body is morphed rather than reloaded, so a script that
 * wired up listeners on load would wire up the first Problem the dev opened and no other.
 * A custom element is upgraded by the browser whenever a matching tag enters the document,
 * whoever put it there -- an SPA navigation, or the search preview pane splicing in a
 * cloned page. Registration happens once; everything after is the browser's own bookkeeping.
 *
 * There is no build step of ours: this file is read at build time and handed to Quartz,
 * which minifies it and writes it out beside its own scripts. The `prepper-` prefix on the
 * tag name is the only thing that survives that intact, and it is what
 * `prepper/testing/browser.ts` picks Prepper's scripts out by when it runs an emitted page
 * in a DOM -- so every custom element of ours is named `prepper-something`, which the
 * custom-elements spec would have required a hyphen for anyway.
 */
;(() => {
  const tag = "prepper-hint-ladder"

  // An SPA navigation re-runs the inlined script, and `define` throws on a name it has
  // already seen. The elements already in the document stay upgraded either way.
  if (window.customElements.get(tag)) return

  class HintLadder extends HTMLElement {
    /** Whether the rungs have been hidden and the control built. Once per element. */
    #laddered = false

    connectedCallback() {
      if (this.#laddered) return

      // One rung per top-level list item: `data-hint` is on those and on nothing else, so
      // a nested bullet under hint two is revealed *with* hint two rather than after it.
      const rungs = Array.from(this.querySelectorAll("[data-hint]"))
      if (rungs.length === 0) return
      this.#laddered = true

      for (const rung of rungs) rung.hidden = true

      const control = document.createElement("button")
      control.type = "button"
      control.className = "problem-hint-control"
      control.textContent = "Show a hint"
      control.addEventListener("click", () => {
        // The first rung still hidden, always: revealing is strictly in authored order,
        // because the order is the whole meaning of a ladder.
        const next = rungs.findIndex((rung) => rung.hidden)
        if (next === -1) return

        rungs[next].hidden = false
        this.dataset.revealed = String(next + 1)

        if (next === rungs.length - 1) {
          control.disabled = true
          control.textContent = "That was the last hint"
        } else {
          control.textContent = "Next hint"
        }
      })

      this.dataset.revealed = "0"
      this.append(control)
    }
  }

  window.customElements.define(tag, HintLadder)
})()
