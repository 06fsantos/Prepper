# 04: The rail is a drawer below 800px

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
Blocked by: 03

## What to build

On a phone, the top bar stays and the rail becomes an **overlay drawer** opened by the same
toggle.

Today, below 800px the left rail is the page's top strip unconditionally and the collapse
control is `display: none` -- so a phone reader gets the entire topic tree stacked above every
article and no way to dismiss it. The source document did not notice this; it is a defect, not
a matter of taste.

The toggle is rendered at **every** width. The drawer overlays the content rather than
reflowing it, and it uses the same `prepper-sidebar` state and the same `<head>` script as the
desktop collapse -- one mechanism, two presentations, not a second stateful control.

## Acceptance criteria

- [x] Below 800px the topic tree is not stacked above the article
- [x] The top bar's toggle is rendered and operable at every viewport width
- [x] The drawer opens over the content and dismisses; the article does not reflow when it opens
- [x] No second `localStorage` key and no second toggle script
- [x] No horizontal page scroll at any supported width
- [x] Nothing in this ticket's CSS carries a `transition` or `animation` (ticket 09 owns motion)

## Comments

**How the drawer works.** Below 800px the rail is off the page -- one unconditional
`display: none` on `.sidebar.left` inside `@media (max-width: 800px)`, which is what retires
Quartz's own mobile layout of the rail as a strip across the top of the page. The bar's
control, now rendered at every width, puts `data-prepper-sidebar="shown"` on `<html>`, and one
conditional rule turns the rail into a drawer: `position: fixed`, `top:
var(--prepper-topbar-height)`, `left: 0`, `bottom: 0`, `width: min(20rem, 85vw)`,
`box-sizing: border-box`, `z-index: 999`, `surface-container-low` with a hairline and
elevation level 1. Fixed rather than in the flow, so the article underneath is not
re-laid-out; bounded by `vw` with `border-box`, so nothing can scroll sideways; starting at the
bar's own height and under the bar's `z-index: 1000`, so the control that opened it is never
covered by it. There is **no scrim**: a dimmed sheet that cannot be tapped to close is a
control that looks like one and is not, and the toggle is on screen throughout. Nothing in the
CSS transitions or animates -- asserted by the existing "nothing in the collapse moves" test,
which now covers the drawer because it is in the same stylesheet.

**How one remembered key serves both presentations.** By giving the attribute **three** states
rather than two, so that each explicit value differs from the default at exactly one width:

| `data-prepper-sidebar` | >= 800px | < 800px |
| --- | --- | --- |
| absent | rail beside the article | no drawer |
| `hidden` | rail gone | no drawer |
| `shown` | rail beside the article | drawer over the article |

Three things follow, and all three are wanted.

*The closed drawer is the markup's default, not a script's.* The page ships with no attribute
at all, so a phone reader whose scripts never run gets an article with nothing over it, rather
than a drawer waiting for JavaScript to shut it. That is the same argument the Problem seal is
built on, pointed the other way.

*A remembered `shown` decays.* `remember.js` is **unchanged** -- it still applies only
`hidden` -- and `toggle.js`'s `wire()` does the same on every load and every SPA navigation. So
`shown` is written to storage like any other press but never applied from it: on a desktop that
is invisible (absent and `shown` are the same rail), and on a phone it is the drawer closing
itself behind a reader who has just followed a link out of it. A drawer that reopened over
every article the reader navigated to would be the top strip again, wearing a shadow. Note this
also means the reader who put the rail away on a desktop and then narrows the window meets no
drawer, which is the right answer for the same reason.

*The press needs to know the width.* "Flip the attribute" is not well defined from the absent
state -- a desktop press means `hidden`, a phone press means `shown` -- so the press is
expressed as "put the rail away if it is on the page, call it up if it is not", and
`presented()` asks `window.matchMedia("(min-width: 800px)")`. That is one breakpoint literal
duplicated between a script and a stylesheet. The alternatives were worse: `clientWidth` is a
measurement jsdom cannot take, and a CSS custom property read back through `getComputedStyle`
is a media query jsdom does not evaluate either. `aria-pressed` and the accessible name follow
`presented()`, so on a phone the control at rest says "Show the sidebar", which is what it
does.

**What was retired from `prepper/topics`.** The whole of its drawer: the `<input
id="prepper-sidebar-toggle">` (the id that shared its word with the bar control's class -- the
collision ticket 03 flagged), both `<label>`s, the scrim, the `.prepper-sidebar` /
`-switch` / `-open` / `-close` / `-panel` / `-scrim` classes, and the entire
`@media (max-width: 900px)` block with its off-canvas panel, `box-shadow`, and
`transition: transform .2s`. That transition was the last unowned motion in the build and it
left with the panel it belonged to; ticket 09 has nothing of `prepper/topics`' to reconcile.
The module now has **no breakpoint at all**, which is right: a tree of author-written names has
no narrow-window form that differs from its wide one. `Sidebar()` renders one wrapper,
`div.prepper-topic-rail`, holding the tree and the Cheat sheets list. No `prepper-sidebar`
string survives anywhere in `prepper/topics`, asserted.

**What that costs, and what pays for it.** The checkbox drawer opened without JavaScript and
this one does not. Recorded rather than glossed: the way into the library on a scriptless phone
is the app's name in the bar, which is a plain link to an entry page that *is* the topic index
rendered as content. Navigation that survives a failed script is that page's job, not a
drawer's.

**Two test-harness things worth knowing.**

*`openPage(..., { width })`.* jsdom does not implement `matchMedia` at all (not a stub that
returns false -- the property is absent), so `fillJsdomGaps` now fills it beside
`scrollIntoView`, answering only width conditions and leaving everything else true. It is not a
viewport this harness pretends to have: it is the one question the script puts to the window,
with the answer the test has stated. Default 1280px, so every existing seam-2 test still opens
on the desktop presentation.

*`sidebar.test.ts` now reads the stylesheets in link order.* It used to join every emitted
`.css` in `site.files` order, which is alphabetical -- and `index-*.css` sorts *after*
`component-*.css`, so upstream's base rules appeared last. That was harmless while every
assertion was about which rules exist, and it is not harmless now: the drawer's default beats
upstream's mobile `display: flex` on equal specificity by **coming later**, and asking "what
does the rail resolve to at 360px" of an out-of-order sheet answers with a coin toss. The
hrefs are read off the page instead, which is the authority on link order.

**Vacuity checked.** Removing the unconditional mobile hide reds "below 800px the rail is not
on the page until it is asked for" (and nothing else); restoring the old
`@media (max-width: 800px) { .prepper-sidebar-toggle { display: none } }` reds "the control is
rendered at every width"; the drawer rule's absence reds all three drawer tests. Then reverted.

**Tests.** `npm test`: 470/470 (baseline 458 + 12 -- `sidebar.test.ts` 14 -> 20,
`toggling.test.ts` 7 -> 12, `topics.test.ts` 12 -> 13, one drawer test replaced by two).
`npx tsc --noEmit` clean, `npx prettier --check` clean on everything touched.

**Docs updated.** `CLAUDE.md`'s "The hideable rail" section (its below-800px paragraph said the
opposite of the truth), `CONTEXT.md`'s **Rail** entry and its *Avoid* list (which forbade
"drawer" outright; the drawer is one of the rail's two presentations, not a name for it),
ADR 0004 gains "One rail, two presentations, one remembered word", `prepper/README.md`,
`quartz.config.yaml`'s two entry comments, and the module docs in `prepper/sidebar/index.ts`,
`prepper/sidebar/components/index.ts`, `prepper/sidebar/toggle.js`, `prepper/topics/index.ts`,
`prepper/topics/components/index.ts` and `prepper/testing/browser.ts`.

**For ticket 05.** Nothing here touches the right rail, the graph panel or the bar's layout;
`header`/40 is still free and the bar was not re-laid-out. Two things to inherit: the bar's
`z-index: 1000` and the drawer's 999 are now a two-step ladder, so a global-graph modal has to
come out **above both** (Quartz's own modal styles are worth checking rather than assumed); and
`prepper/testing/browser.ts` now supplies `matchMedia`, which any script the graph control
needs can rely on at seam 2.
