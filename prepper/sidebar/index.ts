/**
 * The left rail, hideable -- and the one preference this app remembers.
 *
 * The rail holds the topic tree: what the reader needs while they are choosing what to read,
 * and not while they are reading it. (Search and the theme controls used to be here too;
 * they are in `prepper/topbar` now, where they stay put whatever the rail is doing.) So a
 * single control collapses the rail to a gutter: the prose keeps its measure, the page
 * recentres round it, and the button stays exactly where it was, because the way back has to
 * be in the place the way out was.
 *
 * ## What is hidden, and what is not
 *
 * The left rail only. The right rail carries the table of contents, the graph and the
 * backlinks -- things a reader consults *while* reading -- which is a different moment.
 * Reader mode is the gesture that takes *everything* away at once: it fades both rails and
 * the top bar with them, on hover-to-restore, and that is deliberately not this control.
 *
 * Below 800px the rail is not a column at all: Quartz lays it out as a strip across the top
 * of the page, under the top bar, and `prepper/topics` puts the topic tree behind a drawer
 * there. There is nothing to reclaim, so the control is not rendered and none of the collapse
 * rules apply.
 *
 * ## Why it is remembered, when nothing else is
 *
 * Everything about the reader's *work* is unrecorded, deliberately and testably: answering a
 * quiz block, opening a seal, taking a hint and unfolding a heading are all told to nobody
 * and written nowhere, which is what lets `prepper/testing/browser.ts` tripwire storage and
 * assert `screen.recorded` empty on every screen. This is not that. It is a fact about a
 * window -- whether the furniture is in the way -- and a reader who hid the rail and got it
 * back on the next click of a wikilink would simply hide it again on every page. So one key,
 * `prepper-sidebar`, holding one word, in `localStorage`; the harness permits that key by
 * name and records what was written to it in `screen.remembered`, so the carve-out is
 * asserted rather than assumed, and everything else still trips.
 *
 * Storage that throws -- a locked-down browser, a private window -- is caught and the rail
 * simply starts shown.
 *
 * ## Why there are two scripts
 *
 * `remember.js` runs `beforeDOMLoaded`, which Quartz inlines in the `<head>`: it reads the
 * key and stamps the attribute before the body is parsed, so a reader who hid the rail never
 * sees it flash on screen. `toggle.js` runs afterwards and wires the control. Splitting them
 * is the whole of the no-flash behaviour, and it is why the state lives on `<html>` rather
 * than on anything inside the page.
 */
export const manifest = {
  name: "prepper-sidebar",
  displayName: "Prepper sidebar toggle",
  description: "Collapses the left rail to a gutter, and remembers that it was collapsed.",
  version: "1.0.0",
  category: "component",
  components: {
    PrepperSidebarToggle: {
      displayName: "Prepper sidebar toggle",
      defaultPosition: "left",
      defaultPriority: 5,
    },
  },
}
