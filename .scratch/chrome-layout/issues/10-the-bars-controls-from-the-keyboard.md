# 10: The bar's controls, from the keyboard

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
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

- [ ] Seam 2: every control in the bar exposes an accessible name
- [ ] Seam 2: every control is reachable and operable by keyboard, in DOM order
- [ ] Seam 2: the rail toggle's `aria-pressed` tracks the rail's state
- [ ] Focus is visibly indicated on every control, in light and dark
- [ ] Contrast is verified for every control in **both** themes, including its focus ring
- [ ] No control conveys its state by colour alone
