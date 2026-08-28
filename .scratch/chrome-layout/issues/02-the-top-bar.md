# 02: The top bar

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The app's controls get a persistent place of their own, spanning the top of every page,
instead of being scattered down the left rail.

A new module, `prepper/topbar`, at Quartz's **`header` layout position** -- a real position this
repo does not currently use, rendered by `DefaultFrame.tsx` inside `<header>` and **outside the
`.popover-hint` the search preview clones**. That last fact is why the hazard which forced
`prepper/sidebar` into `left` rather than `beforeBody` does not apply here. Confirm it still
holds before relying on it.

`grid-header` is the centre column's top cell, not a full-width row -- Quartz's grid
(`quartz/styles/variables.scss`) has none -- so the bar is `position: fixed`, spans the
viewport, and publishes a `--prepper-topbar-height` token that page content consumes as a top
offset. No hard-coded number. Verify no ancestor of `.page-header` carries `transform`,
`filter` or `contain`, any of which would make `fixed` resolve against that ancestor rather
than the viewport.

Contents, left to right:

| Slot   | Holds                                     |
| ------ | ----------------------------------------- |
| Left   | Rail toggle slot, then the app name **Prepper** |
| Centre | Search                                    |
| Right  | Theme toggle, reader mode, graph slot     |

The rail toggle arrives in ticket 03 and the graph control in ticket 05; this ticket lays out
the bar so those land in a slot rather than forcing a re-layout.

**Move four components out of `left`** in `quartz.config.yaml`: `page-title`, `darkmode`,
`reader-mode`, `./prepper/search`. Retire the `toolbar` layout group with them. Each entry's
`Prepper:` comment explaining its old placement is now wrong -- rewrite it or delete it; do not
leave a comment that describes a placement the file no longer has.

**Reader mode hides the bar.** A control that hides the chrome while the chrome's most
prominent element stays on screen does not do what it says. This lives here rather than in its
own ticket because it is the same stylesheet. If hiding the bar proves genuinely unworkable,
**delete the reader-mode control** rather than ship it half-working, and record why in
`## Comments`.

## Do not

- Animate anything. Ticket 09 owns motion; an ad-hoc `transition` here contradicts ADR 0003
  without amending it.
- Touch the article's typography, `prepper/search`'s vendored CSS, or `prepper/report`.

## Acceptance criteria

- [ ] Seam 1: the bar is in the emitted markup on every laid-out page type, **including 404**
- [ ] The bar spans the viewport and no content renders underneath it at any supported width
- [ ] `--prepper-topbar-height` is the only thing page offset is expressed in
- [ ] `page-title`, `darkmode`, `reader-mode` and `prepper/search` render in the bar, not the rail;
      the `toolbar` group no longer exists in `quartz.config.yaml`
- [ ] No stale `Prepper:` comment describes the retired placement
- [ ] Reader mode hides the bar and the rail together -- or the control is gone
- [ ] Nothing in this ticket's CSS carries a `transition` or `animation`
- [ ] `npm test` and `npx tsc --noEmit` pass
