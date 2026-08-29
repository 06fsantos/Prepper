# 05: The graph opens on purpose

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
Blocked by: 01, 02

## What to build

The rail's graph panel is removed entirely, and the top bar's graph control opens the graph
deliberately, at size.

A 250px box at the edge of the page showing four nodes is the "large container for tiny
content" the source document objects to. The answer is not to enlarge the box.

Quartz's graph plugin **already ships a global-graph modal**, opened today from the panel's
expand icon (`.global-graph-icon`) and by Ctrl/Cmd-G. Promote that modal to the bar's graph
control. **Reuse it -- do not build a second one**, and do not fork the plugin: the vendoring
line in this repo is drawn at `prepper/search`, and core Quartz stays a remote.

The keyboard shortcut keeps working.

## Acceptance criteria

- [x] Seam 1: no `.graph` panel renders in `right` on any page
- [x] The bar's graph control opens Quartz's own global-graph modal
- [x] Ctrl/Cmd-G still opens it
- [x] No second modal implementation, and `@quartz-community/graph` is neither forked nor patched
- [x] The control has an accessible name (ticket 10 audits the set; do not ship it nameless here)

## Comments

**The seam. The plugin's client is document-wide, so the component just moves.**
`@quartz-community/graph`'s `afterDOMLoaded` script wires
`document.querySelectorAll(".global-graph-icon")` and collects
`document.querySelectorAll(".global-graph-outer")` -- both unscoped, neither reaching for
`.graph` or for a rail -- and its shortcut is `document.addEventListener("keydown", ...)`
matching `g` with Ctrl or Meta. Nothing in it knows or cares where the component was placed.
So the entry in `quartz.config.yaml` changes from `right`/10 to **`header`/40**, the slot
ticket 02 reserved, and the button the plugin already renders *is* the bar's graph control.
No second modal, no fork, no patch, no vendoring: the diff against `node_modules` and against
`quartz/` is empty. This was the first thing checked, because the ticket asked me to stop and
report if a fork were the only way; it was not close to being the only way.

**What is left over, and why it is shaped in two different places.** The component renders the
heading, a 250px local panel with the expand button in its corner, and the modal, all in one
`.graph`, with no option for the modal alone. So:

- The **heading and the box are CSS**, in `prepper/topbar/components/index.ts`: `h3` hidden,
  `.graph-outer` stripped of its border, height, margin and `position: relative`, and the
  button taken out of the corner it was absolutely placed in and given the same round icon
  treatment as the rail toggle beside it. Every selector is a child chain from
  `.page-header > header`, so it outranks the plugin's own rules whichever order the two
  sheets are linked in (they land in the same `@layer quartz-base`, so specificity decides).
  CSS rather than script because it applies before the first paint: a bar that showed a 250px
  panel until a script arrived would be worse than the panel.
- The **local `.graph-container` is removed from the document** by `prepper/topbar/graph.js`,
  which is the module's first and only script. This is not tidiness. The plugin's render sweep
  is `document.querySelectorAll(".graph-container")` and it does not ask whether anything is on
  screen, so `display: none` would have left a Pixi application, a d3 force simulation and a
  permanent `requestAnimationFrame` loop running on every page, drawing a canvas nobody can
  see. Removing the node is what actually stops the work, and it is a smaller intervention than
  the fork that is the only other way to stop it. The CSS rule hiding the container stays as
  well, for the reader whose scripts never arrive.

**The removal wins its race, and it is a race.** SPA navigation morphs the whole `<body>`
against the fetched page, which puts the container back, so the removal runs on every `nav`.
Which of the two `nav` listeners fires first therefore matters -- if the plugin's ran first it
would start an async render, and our removal (synchronous, in the same dispatch) would leave it
finishing into a **detached** node, which is worse than not removing at all. It cannot happen:
the plugin registers its `nav` listener *inside the `.then()` of the `Promise.all` that fetches
d3 and Pixi from a CDN*, and ours is registered at module-evaluation time. Same reason the
first load is safe -- the sweep cannot run before those libraries arrive, and this has run by
then. Confirmed in the emitted bundle: ours is `static/scripts/script-0-*.js`, the plugin's is
`script-3-*.js`, and both are pulled in by one `Promise.all` in the orchestrator, so import
order was never something to lean on anyway.

**Ctrl/Cmd-G still works, and how that was checked.** Not by a browser, which this repo has no
seam for. The handler is upstream's, on `document`, registered in the same pass that wires the
buttons, and it calls the same toggle the click does; it touches neither `.graph-container` nor
anything this ticket changed. What the toggle needs to find is `.global-graph-outer` and, inside
it, `.global-graph-container` -- a *different class* from the one removed, deliberately left
alone -- and both are asserted present, at seam 1 in the emitted markup and at seam 2 in the
page after our script has run. So the shortcut's inputs are checked; the shortcut itself is
upstream's code, unmodified, and testing it here would mean running Quartz's client, which is
the one thing seam 2 exists not to do.

**What is asserted where.**

*Seam 1* (`prepper/testing/layout.test.ts`, 21 -> 24 tests). Exactly one `.graph` on every page
type -- home, Lesson, Term, Problem, folder index, 404 -- which is ticket 01's tripwire kept
alive rather than deleted: the two pages that used to be 0 are now 1, because they clear
`right` and not `header`, and the count is still the thing that catches a fallback placing a
second copy. Then the new facts: the surviving `.graph` is `.page-header > header > .graph`;
**no `.graph` anywhere inside a `.sidebar`, on any page type**, which is the acceptance
criterion stated as the absence a later edit would restore without noticing; the bar carries
one `.global-graph-icon` and one `.global-graph-outer`, which is the markup the whole reuse
depends on and which would fail silently if either stopped being emitted; and the control has a
non-empty accessible name. The bar's slot order test gains `graph` at the end.

*Seam 2* (`prepper/topbar/graph.test.ts`, new, 7 tests). The removal, which is behaviour and
not markup: the page as built carries one `.graph .graph-container` (asserted with
`scripts: false`, so the next assertion cannot pass vacuously), and the page a reader gets
carries none. Plus: the button, the modal and the modal's own `.global-graph-container` all
survive; the graph is nowhere near a rail; and `recorded` and `remembered` are both empty, so
shaping the bar keeps nothing and tells nobody.

*Not asserted anywhere, stated plainly.* **The opening itself.** The click handler, the
Ctrl/Cmd-G shortcut and the `active` class that shows the modal are all upstream's script, and
`prepper/testing/browser.ts` runs Prepper's scripts only, found by the `prepper-` marker. So no
test in this repo presses the control and watches the modal open. That is the correct boundary
-- code that ran there would be code we had forked -- and it is written at the top of
`graph.test.ts` rather than left for someone to discover.

**Things worth knowing.**

- **The modal needed no z-index of ours.** Ticket 04 flagged the 1000/999 ladder. Upstream's
  `.global-graph-outer` is `z-index: 9999`, and because it is now a descendant of the bar it
  sits *inside* the bar's stacking context -- so it resolves above the bar's own 1000 and above
  the drawer's 999 without a number from us. It is `position: fixed` and nothing on the way up
  carries `transform`, `filter`, `contain` or friends, which is the prohibition
  `prepper/topbar` was already bound by for the search overlay. Its blurred backdrop covers the
  bar, including the control that opened it, which is what a modal should do.
- **The graph is now on 404 and on folder indexes.** Those page types clear `right`, not
  `header`. It is a control on a page that has a bar, next to search, which is consistent; the
  test data that used to say "0 panels" for them now says "1 graph" and the reason is recorded
  in the file.
- **The accessible name is upstream's**, `aria-label="Global Graph"`. It is a real name and the
  ticket's bar is cleared, but it is the only control in the bar not named in Prepper's own
  voice, and changing it would mean a script writing over another plugin's markup for cosmetics.
  Flagged for **ticket 10**, which audits the set: if it wants "Open the graph", that is a
  deliberate one-line addition to `graph.js`, not an oversight here.
- **The plugin writes a `graph-visited` key to `localStorage`.** Pre-existing, upstream's, and
  untouched by this ticket -- but it means the "two keys and no more" claim in `CLAUDE.md` is
  about *Prepper's* storage rather than the page's, and `prepper/testing/browser.ts` never sees
  it because it never runs that script. Not this ticket's to fix; recorded so the next person
  reading the claim is not surprised by it.
- **One inherited quirk, unchanged:** with reader mode on, the bar is `opacity: 0` until
  hovered, and the modal is inside the bar -- so opening the graph from the keyboard in reader
  mode draws it invisibly. Exactly the same shape as the search-overlay quirk ticket 02
  recorded, from the same rule, and it wants the same fix if either is ever worth fixing.
- **A backtick in a CSS comment** was written and caught by `prettier --check` before it could
  silently kill the module's whole stylesheet. The warning in the brief is real.

**Tests.** `npm test`: 480/480 (baseline 470 + 10 -- `layout.test.ts` 21 -> 24, `graph.test.ts`
7 new). `npx tsc --noEmit` clean. `npx prettier --check` clean on everything touched. A full
`npm run build` of the real vault confirms the emitted stylesheet carries every new rule (so
no backtick ate it), one `class="graph"` per page, in the header, none in a sidebar.

**Docs updated.** `CLAUDE.md`'s "The top bar" gains the graph-control paragraph and its
"hideable rail" section no longer says the right rail carries a graph; ADR 0004 gains "The
graph control is the plugin's own button, moved"; `prepper/README.md`'s tree lists the two new
files and its layout-collision note no longer says "in the rail"; `quartz.config.yaml`'s graph
entry carries the whole argument; `prepper/topbar/index.ts` (the slot table), and
`prepper/sidebar/index.ts` (which listed the graph among the right rail's contents) follow.
`CONTEXT.md` already described the bar as carrying a graph control and needed no change.

**For ticket 06.** The right rail now holds exactly two things -- upstream's table of contents
and `prepper/edges`' backlinks panel -- and `layout.test.ts` has a test named "no graph renders
in either rail, on any page" that will keep it that way. Nothing here touched `right`, the
grid, or `prepper/reading`. Two things to inherit: `layout.byPageType` already clears `right`
for 404, folder and tag pages, so retiring the column means those `positions: right: []`
entries become redundant rather than wrong; and the bar's height token
`--prepper-topbar-height` is what a sticky margin element must offset against -- there is a
test asserting the literal `4rem` appears exactly once in the bar's stylesheet, so a sticky ToC
must say `var(--prepper-topbar-height)` and not restate it.
