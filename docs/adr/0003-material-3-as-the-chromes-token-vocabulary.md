# Material 3 as the chrome's token vocabulary

Prepper's chrome is styled from a design token layer taken from Google's [Material 3](https://m3.material.io),
seeded from the slate blue the app already used, and the **reading surface is exempt**. Six modules
had been painting against Quartz's nine configured colour names, which name colours rather than
roles -- a module wanting a hairline and a module wanting a disabled label both reached for
`lightgray` and then diverged -- so the app was incoherent between its own components and read as
stock Quartz. Material supplies what was missing: a role vocabulary, a type scale, a shape scale,
and a discipline of deriving light and dark from one seed rather than hand-drawing both.

## The prose column is out of scope on the merits

This is the part a future reader will trip over: Material tokens throughout the chrome, and an
article column that ignores them entirely. It is not an unfinished migration.

Material 3 is a system for *surfaces you operate*, born on Android, whose atoms are components and
whose typography exists to build hierarchy in chrome. A document is a surface you *dwell in*,
whose typography exists to disappear. Concretely, three things Material does not have:

- **No measure, and no mechanism for one.** Its layout system goes window size class to pane count
  to margin, and a pane is expected to *fill* its share. There is no max-width or optimal-measure
  concept in its layout foundations. The 40-60 character figure often cited at it is **Material
  2's**, and it is advice about scaling cards.
- **No paragraph role above 16px.** `body-large` at 16/24 is the largest, its +0.5 tracking tuned
  for glanceable UI text, and there is nothing between it and `title-large` at 22 -- nothing shaped
  like article prose at 18-19px with generous leading.
- **No serif.** Both reference typefaces are Roboto. The one page that sounds relevant,
  `styles/typography/editorial-treatments`, is about hero display type as decoration.

So the ~38rem measure and Source Serif 4 are not a deviation from Material. Material has no
position on them. The boundary this ADR draws -- **Chrome** takes the tokens, the **Reading
surface** does not -- is a scope boundary, and both terms are defined in
[`CONTEXT.md`](../../CONTEXT.md).

## Consequences

- **The seed is the source of truth, and `quartz.config.yaml`'s palette is inert.** Its nine
  colours are redefined on every page as aliases onto the roles, and the block is commented as
  inert. Two files claiming to set the same colour, one silently losing, is worse than one file
  that says where the colour lives. Anyone "fixing" that block by pasting hexes back in is
  undoing this.

  Inert, not empty: the nine keep literal values because one consumer still reads them
  *outside* CSS. `@quartz-community/og-image` renders a social card with satori and passes
  `theme.colors[scheme].lightgray` straight into a style, which needs a real colour and fails
  the build on a `var()`. So the block is neutralised by being overridden rather than by being
  emptied, and what is left in it is the OG renderer's palette and nothing else.
- **The colour identity did not change when the architecture did.** The seed is `#284b63`, what the
  app already read as. Re-seeding is now a one-line change; had both moved at once, a disappointing
  result would not have been attributable to either.
- **Tonal-tint elevation is not adopted.** Hierarchy comes from the `surface-container-*` ladder,
  and shadow is reserved for surfaces that genuinely float and occlude. Material's tint-over-surface
  model is the path its own 2023 container roles superseded; it is not to be reintroduced as
  "the Material way".
- **Material's scale, none of Material's typefaces.** Both reference typefaces map to Schibsted
  Grotesk, already configured and served. Roboto would be a third webfont for no gain. The scale's
  tracking values are tuned to Roboto's metrics and are treated as advisory; its sizes,
  line-heights and weights are not.
- **~~No motion subsystem, deliberately.~~ Superseded by
  [ADR 0004](0004-a-persistent-top-bar-and-the-retired-right-column.md).** This ADR originally
  recorded that there was no motion subsystem and that its absence was a decision rather than an
  omission: nothing of ours animated, and a token vocabulary with no consumer invites someone to
  find one. ADR 0004 gave it a consumer -- the left rail collapses behind a control in the new
  top bar, and that collapse is eased -- so `prepper/tokens` now emits Material's full motion
  role set, computed wholesale like every other role set it holds.

  What has **not** changed is the half of the original reasoning that was load-bearing. The
  tempting case named above -- revealing a quiz answer, unsealing a solution -- is still
  refused, and now explicitly: **`<details>` never animates.** Not the Problem seal, not a
  heading fold, not a topic-tree fold. Those elements are shut by the HTML specification before
  a stylesheet loads, before a script runs, and inside the search preview pane that injects a
  result's real HTML and runs none of its scripts, and every one of those three properties is
  relied upon somewhere in this codebase. An eased `<details>` is a script-dependent seal
  wearing a costume. A test asserts that no emitted stylesheet puts a `transition` or
  `animation` on a `details` element or on anything inside one.
- **Three surfaces are outside the system and stay that way.** `prepper/search`'s CSS is vendored and
  pinned by the sha256 of the pristine original, and the pin exists so the diff from upstream stays
  legible. `prepper/report` is a whole self-contained HTML document rather than a page through
  Quartz's layout -- `renderPage` is `.tsx` and Node, which imports a local plugin, strips types but
  does not compile JSX -- so component CSS cannot reach it. It keeps six hexes hand-copied from the
  palette this decision neutralised, and they are now a stale copy of a source of truth that no
  longer exists. Accepted: the report is a build artifact the dev reads, not a surface the reader
  browses. `@quartz-community/og-image` is the third and the same shape: it composes an image
  rather than a page, so it reads the raw palette above by value. All three hold a copy of a
  palette they no longer control.
- **The token layer rides on a component, which is the same seam the measure rides on.** Quartz
  collects `Component.css` from the configured component list rather than from what a page
  rendered, and links it into `@layer quartz-base` after the base styles, so an identical `:root`
  selector wins on order. That is what lets our tokens redefine Quartz's own nine. An upstream
  change to how component CSS is collected takes the whole palette down at once, which is what the
  ticket's single seam-1 test watches for.
