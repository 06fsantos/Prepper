# 10: The bar's controls, from the keyboard

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
Blocked by: 05

## What to build

The top bar is now where every control in the app lives, so it is audited as a whole once its
full set is in place -- rail toggle, app name, search, theme, reader mode, graph.

- Every **icon-only** control has an accessible name.
- Every control has a **visible keyboard focus** ring, meeting contrast against its own
  background -- not against the page's.
- The rail toggle is **fully keyboard-operable** and exposes its pressed state (`aria-pressed`).
  `prepper/sidebar`'s current control already does this; the point is not to lose it in the move.
- **No state is communicated by colour alone.** The rail toggle and the theme toggle each need an
  iconographic or textual cue for their current state.
- **Contrast holds in both themes.** The source document only inspected the dark one.

## Acceptance criteria

- [x] Seam 2: every control in the bar exposes an accessible name
- [x] Seam 2: every control is reachable and operable by keyboard, in DOM order
- [x] Seam 2: the rail toggle's `aria-pressed` tracks the rail's state
- [x] Focus is visibly indicated on every control, in light and dark
- [x] Contrast is verified for every control in **both** themes, including its focus ring
- [x] No control conveys its state by colour alone

## Resolution

**The audit is a module's test, not a checklist.** Six controls, five of them icon-only, three of
them a community plugin's markup -- the thing worth building was not six fixes but the one place
that keeps asking. `prepper/topbar/controls.test.ts` enumerates the bar's focusable elements
**off the emitted page** and asserts the set against the slot table, so a seventh control joins
the audit by taking a slot number rather than by anyone remembering to add it. Everything else in
the file is asserted about that enumeration.

Most of the six turned out already correct, which is worth stating because it is the answer to
"what did this ticket actually change": all six emit an accessible name, and all six are a native
`button` or `a` with no `tabindex`, no `disabled` and no `aria-hidden` on them -- which is what
makes the tab order the DOM order and the DOM order the slot order. Nothing had to be wrapped,
re-labelled or replaced, and the ticket's "the point is not to lose it in the move" is now a
test rather than a hope.

**Four things were actually wrong.**

- **No focus ring anywhere in the bar.** One rule now, `.page-header > header :focus-visible`,
  with the *bar* as its subject rather than any control in it -- `outline: 2px solid
  var(--md-sys-color-primary)` at `outline-offset: 2px`. `outline` rather than a border, a shadow
  or a background, so nothing in the bar changes size or moves when focus lands on it; and the
  offset puts the ring on the bar's own surface, which is what the ticket asks it to be measured
  against.
- **Search's ink.** Search is the only control upstream draws as a *field*, and it arrived
  painted in Quartz's old names -- its label in `--gray` and its border in `--lightgray`, which
  alias onto `outline` and `outline-variant` and evaluate to **3.84:1** and **1.46:1** against
  the bar in light mode. A label under the 4.5:1 text minimum and a boundary that is not there.
  Both are repainted from `prepper/topbar` (`on-surface-variant` and `outline`), from the bar
  rather than in `prepper/search`'s vendored sheet, which stays outside the token system by ADR
  0003. The ticket predicted this: the source document only ever inspected the dark theme, where
  both would have passed.
- **Reader mode fades the chrome and restores it on `:hover`.** A keyboard has no hover, so a
  reader in reader mode was tabbing through six controls and a whole topic tree that were on the
  page and not on screen. `:focus-within` now restores the bar (`prepper/topbar`) and the rail
  (`prepper/sidebar`), by the same rule that restores them for a pointer. This is the one defect
  the ticket did not name and the one a keyboard reader would have hit first.
- **The rail toggle reported its state only in words.** It gained a second glyph -- a cross while
  the rail is on the page, three lines while it is not -- swapped with `display`, which is the
  same mechanism the theme switch three slots along already uses (upstream's `dayIcon` /
  `nightIcon`). The swap keys on the control's own **`aria-pressed`** rather than on a class of
  ours, so the glyph a reader sees and the state a screen reader is told are one fact, written
  once by `toggle.js`, incapable of drifting apart. The known cost is unchanged in kind from the
  label's: on a phone with no JavaScript both the label and the glyph read the desktop default
  until `toggle.js` corrects them, which is before a reader can reach the control.

**Contrast is computed, in both schemes, from the emitted stylesheet.** Every rule in the bar
names a Material role, every role is derived from one seed, and Quartz's nine names are aliases
onto roles -- so the test resolves a declaration through its `var()` chain to a hex, per scheme,
and does the WCAG arithmetic. That is what makes a re-seed of `prepper/tokens` re-check the bar
rather than silently re-tint it. What it reports:

| control                | light  | dark   | needs |
| ---------------------- | ------ | ------ | ----- |
| rail toggle glyph      | 8.09:1 | 9.62:1 | 3:1   |
| the app's name         | 14.73  | 12.74  | 4.5:1 |
| search's label         | 8.09   | 9.62   | 4.5:1 |
| search's boundary      | 3.84   | 5.15   | 3:1   |
| theme switch icon      | 8.09   | 9.62   | 3:1   |
| reader mode icon       | 8.09   | 9.62   | 3:1   |
| graph icon             | 8.09   | 9.62   | 3:1   |
| the focus ring         | 5.53   | 9.64   | 3:1   |

Two thresholds, each argued rather than picked: 4.5:1 is AA for text, 3:1 is AA for a non-text
indicator. Only search's boundary needs the lower one. The ring is checked against the hover
surface as well as the resting one, because a reader whose pointer rests on the control they
have just tabbed to sees it against `surface-container-high` (5.23 / 8.50).

**Three things the resolution had to get right to be true rather than green.**

- **`ink()` had to respect specificity, not source order.** The first version took the *last*
  rule mentioning a control, which answered the bar's own background with the app title's
  `transparent` (`#0000`) and put every ratio in the light scheme under 3:1. Selectors are now
  matched against the **end** of a selector -- so `on` names the element the declaration lands on
  rather than an ancestor on the way to it -- and candidates are ranked by a packed specificity
  count. That matters in real CSS too: `prepper/search`'s vendored sheet is linked *after*
  `prepper/topbar`'s, so the repaint wins by specificity and by nothing else.
- **The seams were split honestly.** jsdom implements no sequential focus navigation and does not
  synthesise the click a native button fires on Enter, so `keyboard.test.ts` claims neither. What
  it does claim is what only a DOM can say: focus lands on all six and each becomes
  `document.activeElement`; a `mousedown` on the rail toggle does **nothing** and a `click` moves
  the rail, which is the whole of "operable by keyboard" for a button -- `click` is the event a
  key press makes, and a handler on `mousedown` would be a pointer-only control that looks
  identical in every screenshot; and both glyphs stay in the document across a press, so the
  stylesheet's swap has something to swap to.
- **The audit's boundary is stated in the test, not implied by what it happened to reach.** It
  stops at the bar. The search *overlay* is a DOM descendant -- `.search-container` nests inside
  `.search` -- but it is `display: none` until opened, so nothing in it is in the tab order at
  rest, and it is `prepper/search`'s vendored sheet, which the spec puts out of scope. Two known
  weaknesses in it are written into ADR 0004 rather than quietly excluded: that sheet removes the
  search field's own focus outline, and a result card indicates the arrow-key cursor with a
  background colour alone. Neither is reachable without opening the modal, and both are one
  ticket's work in `prepper/search`.

**On the handoff's three notes.**

1. **The ring does not ease.** No transition on it, and the test asserts the absence -- an
   indicator that arrives over 200ms is an indicator that is not there for the first frames of
   every keystroke, and a reader tabbing across six controls would be chasing it.
2. **The rail's 200ms focusable window is real, and is left alone.** `allow-discrete` keeps the
   rail rendered while its opacity runs down, so its links stay in the tab order for
   `short4` after a dismissal. Judged out of scope and recorded in ADR 0004's consequences rather
   than fixed: 200ms is shorter than any press a reader can aim, and both ways out -- dropping the
   discrete flip, or hiding the rail with `visibility` -- either reinstate the jump ticket 03
   abolished or abolish the fade ticket 09 added. The *permanent* version of the same defect,
   reader mode's `opacity: 0`, is the one that was fixed.
3. **`sidebar.test.ts` was unaffected**, as predicted. The sheet now carries a second
   unconditional rule with `.sidebar.left` as its subject and a `display` swap whose subject is
   `.prepper-sidebar-toggle-icon`; `conditional()` ignores the first and the second is not the
   control, so "one rule hides the rail" and "the control is rendered at every width" both still
   read the rules they were written about.

**The backtick trap bit for the fourth ticket running** -- twelve of them, in two files, inside
CSS comments in `styles` template literals. This time it failed loudly (`npx tsc --noEmit`
reported a parse error rather than a clean run), because the comments happened to contain a
quote as well. That is luck, not a fix. **No backticks in a CSS comment**, ever.

**Nothing new is remembered and nothing is sent.** `screen.recorded` is empty after focusing all
six controls and working one, and `screen.remembered` still holds the one word.

**Tests.** `npm test`: **537/537** (baseline 524 + 13 -- `controls.test.ts` 9,
`keyboard.test.ts` 4). `npx tsc --noEmit` clean; `npx prettier --check` clean on everything
touched; `npm run build` loads every plugin, with no "failed to load" in its output; `npm run
validate` reports no violations in 14 notes.

**Docs updated.** ADR 0004 gains a section ("One bar means one place to settle the keyboard") and
a consequence (the rail's fade window); `CLAUDE.md`'s top-bar section gains the keyboard
paragraph and its hideable-rail section the two glyphs; `CONTEXT.md`'s **Top bar** entry;
`prepper/README.md`'s file tree; and the module docs in `prepper/topbar/index.ts`,
`prepper/topbar/components/index.ts` and `prepper/sidebar/components/index.ts`.

**The effort is finished.** Ten tickets, all resolved. Nothing is left open that this ticket
found except the two search-overlay items above, which are `prepper/search`'s and are recorded in
ADR 0004.
