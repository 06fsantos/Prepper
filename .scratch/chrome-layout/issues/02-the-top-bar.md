# 02: The top bar

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
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

- [x] Seam 1: the bar is in the emitted markup on every laid-out page type, **including 404**
- [x] The bar spans the viewport and no content renders underneath it at any supported width
- [x] `--prepper-topbar-height` is the only thing page offset is expressed in
- [x] `page-title`, `darkmode`, `reader-mode` and `prepper/search` render in the bar, not the rail;
      the `toolbar` group no longer exists in `quartz.config.yaml`
- [x] No stale `Prepper:` comment describes the retired placement
- [x] Reader mode hides the bar and the rail together -- or the control is gone
- [x] Nothing in this ticket's CSS carries a `transition` or `animation`
- [x] `npm test` and `npx tsc --noEmit` pass

## Comments

**The `header` position renders outside `.popover-hint`: confirmed.**
`quartz/components/frames/DefaultFrame.tsx` renders `<div class="page-header">` holding
`<Header>{header}</Header>` and then, as a **sibling**, `<div class="popover-hint">{beforeBody}</div>`.
The bar is therefore never inside a hint. Confirmed on the consumer side too: the vendored
search client fetches a result and takes `i.getElementsByClassName("popover-hint")` and nothing
else (`prepper/search/vendor/search.inline.js`), and `quartz/components/scripts/popover.inline.ts`
does the same. `prepper/testing/layout.test.ts` asserts no `header` inside any `.popover-hint`,
so the fact is checked rather than remembered.

**`transform` / `filter` / `contain` on ancestors of `.page-header`: none, and the real hazard
is one level lower.** The ancestors are `.center`, `#quartz-body`, `.page`, `body`, `html`, and
none of them carries `transform`, `filter`, `backdrop-filter`, `perspective`, `will-change` or
`contain` in `quartz/styles/*.scss`, in `quartz/components/styles/*.scss`, or in any of our
component CSS. The only three occurrences anywhere near the layout are
`quartz/components/styles/popover.scss`'s `will-change: transform` (on `.popover` itself,
absolutely positioned inside the article) and `contain: layout` + `backdrop-filter: blur(4px)`
in `prepper/search/vendor/search.css` -- both on `.search > .search-container`, the fixed
element itself.

That last one is the hazard that actually matters, and it points **down** rather than up: the
search overlay is a `position: fixed` element nested *inside* the bar. So the prohibition binds
this module going forward -- a frosted `backdrop-filter` on the bar, or `left: 50%` +
`translateX(-50%)` to centre the search field exactly, would each make the bar (or `.search`) a
containing block for that overlay and turn the search modal into a 4rem-tall strip inside the
bar. Hence a solid `surface-container` and `margin-inline: auto`. Both are written down in
`prepper/topbar/index.ts` and `components/index.ts`.

**404 needed a frame override, not just a layout one.** The acceptance criterion "the bar is in
the emitted markup on every laid-out page type, **including 404**" could not be met by moving
components: upstream's own 404 page type declares `frame: "minimal"`
(`quartz/plugins/pageTypes/404.ts`), and `MinimalFrame` renders the body and the footer and no
header and no rails at all. So `layout.byPageType["404"]` now carries `template: default`, and
`afterBody: []` joins the positions it already cleared so that 404 comes out as the bar plus the
message and nothing else. Two things worth knowing: the `positions` clears that were already
there had been doing **nothing** under the minimal frame, and `template` -- honoured by the
loader and documented on `PageTypeLayoutOverride` in `quartz/plugins/loader/types.ts` -- is
**absent from upstream's `quartz-plugins.schema.json`**, whose `byPageType` entries are
`additionalProperties: false`. An editor using the schema will flag that line. It is upstream's
gap; the field works.

**Reader mode hides the bar; the control stays.** It fades with the two rails, on upstream's own
`:root[reader-mode="on"]` attribute and with upstream's own hover-to-restore, so there is one
gesture rather than two that nearly agree. No transition of ours rides with it (ticket 09). One
inherited quirk, unchanged by this ticket: with reader mode on, opening search while the pointer
is not over the bar draws the overlay at `opacity: 0` -- exactly as it already did when search
lived in the left rail, which reader mode has always faded. `opacity` was chosen over
`visibility`/`display` deliberately: it makes a stacking context but **not** a containing block,
so it cannot break the fixed overlay the way `transform` or `filter` would.

**The slot mechanism for tickets 03 and 05.** There are no slot elements, and deliberately.
`header` is a flat array whose components become the children of one `<header>`, so a component
placed there is a sibling of the others and can never wrap them; and a Quartz `group:` renders
an anonymous `<div class="flex-component">` with no name a stylesheet can address, which is why
the `toolbar` group is retired rather than re-pointed. The slots are therefore **priorities**,
split by one CSS rule: `.search` takes `margin-inline: auto`, so everything ordered before it is
pushed to the left edge and everything after it to the right.

| Priority | Control | Status |
| --- | --- | --- |
| 5 | rail toggle | reserved, ticket 03 |
| 10 | `page-title` (the app's name) | placed |
| 20 | `./prepper/search` -- the centre **and the split** | placed |
| 30 | `darkmode` | placed |
| 35 | `reader-mode` | placed |
| 40 | graph | reserved, ticket 05 |

Ticket 03 moves `./prepper/sidebar` from `left`/5 to `header`/5 and gets the left slot; ticket
05 adds its graph control at `header`/40 and gets the right. Neither needs a re-layout.
`layout.test.ts` asserts the resolved order, so a control that silently changes sides fails.

**`prepper/topbar` renders `null`.** The bar *is* Quartz's `<header>`; this module is the
stylesheet that makes it one, delivered on a component the way `prepper/tokens`' token layer is
-- Quartz collects `Component.css` from the configured component list rather than from what a
page rendered, so the bar is styled on 404 and on a folder index too. The selector
`.page-header > header` is the module's whole contract with upstream, and it is asserted rather
than assumed.

**The name is explicit.** `./prepper/topbar` would be the plugin named `topbar`, one PascalCase
step from `Topbar` in the flat global component registry -- the shape of ticket 01's bug. Nothing
registers `Topbar` today (checked across `node_modules/@quartz-community/*`), and the entry has a
`layout:` block so it never reaches the `defaultPosition` fallback pass at all; the object source
form with `name: prepper-topbar` is taken anyway, because the cost is one line and the failure
mode is silent.

**Top spacing.** Upstream keeps `$topSpacing: 6rem` above `.page-header` and inside each rail,
which existed because nothing else did. With `body` padded by the bar's height, leaving it would
have put every page 10rem down the window. The bar now *is* the top spacing and what is left is
the gap below it (2rem), so a page's total top spacing is what it was before the bar existed.

**Not done here, on purpose.** The rail still collapses to a gutter with its own control inside
it (ticket 03), the mobile rail is still a strip above the article (ticket 04), and there is no
graph control (ticket 05). Nothing in this ticket animates.

**Tests.** `npm test`: 447/447 (baseline 435 + 12 new in `prepper/testing/layout.test.ts`).
`npx tsc --noEmit` clean.
