# 17: Material tokens for the chrome

**What to build:** A design token layer, taken from Google's Material 3, that the **chrome**
consumes and the **reading surface** does not. Six modules currently paint against Quartz's nine
colour names, and those nine name colours rather than roles -- `lightgray` is reached for by a
module wanting a hairline and by a module wanting a disabled label, and the two diverge the
moment anything is rethemed. That is the incoherence this ticket removes, and the reason the app
still reads as stock Quartz.

The prose column is **out of scope on the merits, not by omission**. Material 3's layout system
goes window-size-class to pane count to margin, and a pane is expected to *fill* its share: there
is no measure, no max-width, and no mechanism for one anywhere in its layout foundations. Its
largest paragraph role is `body-large` at 16px/24 with tracking tuned for glanceable UI text, and
its reference typeface layer is Roboto twice over, with no serif. Material has nothing to say
about an article and a great deal to say about everything around one. See
[ADR 0003](../../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md).

**New module `prepper/tokens`**, delivered the way `prepper/reading` delivers its styles: a
component that renders `null` and carries `.css`. Quartz collects `Component.css` from the
configured component list rather than from what a page rendered, so the tokens land on every
laid-out page including 404 -- and a component stylesheet is emitted into the same
`@layer quartz-base` as the base styles and linked *after* them, which is what lets a `:root`
block here redefine Quartz's own nine by identical selector on source order. That mechanism is
already load-bearing for the measure; this is its second consumer.

**The seed is `#284b63`**, the slate blue the app already reads as. The colour identity does not
change in this ticket -- what changes is that every role is derived from one source rather than
hand-picked nine times, which is what makes a later re-seed a one-line change instead of a
redesign.

**Subsystems adopted, and the one refused:**

- **Colour**: the full `--md-sys-color-*` role set, light and dark derived from the seed rather
  than hand-drawn. Quartz's nine become derived aliases; the palette block in
  `quartz.config.yaml` is neutralised and commented as inert, because two files claiming to set
  the same colour with one silently losing is worse than one file saying where the colour lives.
- **Elevation**: the `surface-container-*` ladder for hierarchy, and shadow **only** for surfaces
  that genuinely float and occlude -- popovers here, and the search modal whenever ticket 13 is
  reopened. Tonal-tint elevation is not adopted: Google's own docs treat it as the path the 2023
  container roles superseded.
- **Typography**: the 15-role scale, with **both** Material reference typefaces mapped to
  Schibsted Grotesk. No Roboto -- it would be a third webfont for nothing, and the grotesque
  already configured slots into `plain` without complaint. The scale's *tracking* values are tuned
  to Roboto's metrics and are advisory here; sizes, line-heights and weights are not.
- **Shape**: the seven-step corner scale (`0 / 4 / 8 / 12 / 16 / 28 / full`), with each element
  moved to its conventional step. The topic chip goes 16px to 8px, which is a visible change and
  the intended one -- "which of seven steps" is a decidable question where "what looks right here"
  is how six modules drifted apart in the first place.
- **Motion**: **none**, and stated rather than merely absent. Nothing of ours animates, and the
  one place motion would tempt -- revealing a quiz answer, unsealing a solution -- is where the
  architecture is emphatic that the browser's own default does the work and the seal is markup
  rather than a script. A token vocabulary with no consumer is an invitation to find one.

**Restyled, as one unit:** `prepper/topics`, `prepper/edges`, `prepper/reading`'s chips, and
`prepper/home`. One unit because `home` renders `TopicTree` imported from `topics`, so they cannot
drift apart even deliberately.

**Left alone:** `prepper/search`, whose CSS is vendored and pinned by the sha256 of the pristine
original -- the pin exists so the diff from upstream stays legible, and this ticket does not spend
it. And `prepper/report`, which is a whole self-contained HTML document rather than a page through
Quartz's layout, so component CSS cannot reach it at all.

**Accepted, and to be written into the module docs rather than left silent:**
`prepper/report/render.ts` hard-codes six hexes copied by hand from the palette this ticket
neutralises. They stay, and they become a stale copy of a source of truth that no longer exists.
The report is a build artifact the dev reads, not a surface the reader browses, and buying it
back costs a coupling this ticket declines to pay.

**Testing:** one seam-1 assertion, and deliberately only one. Build a fixture vault and assert
that an emitted page links the tokens stylesheet and that the stylesheet defines the role tokens.
It tests **delivery, never appearance**: the failure it guards is an upstream merge changing how
`Component.css` is collected, after which every page falls back to undefined custom properties and
nothing else in the suite notices. There is no rule set here for a test to make a second, weaker
copy of, so nothing else is asserted.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `prepper/tokens` defines the M3 system token layer at `:root`, in light and dark, derived from seed `#284b63`
- [x] Quartz's nine colour names resolve to token aliases, and the palette block in `quartz.config.yaml` is neutralised with a comment saying where colour now lives
- [x] `prepper/topics`, `prepper/edges`, `prepper/reading` and `prepper/home` paint with `--md-sys-*` and carry no raw hex
- [x] Surface hierarchy comes from the `surface-container-*` ladder; shadow appears only on a floating, occluding surface
- [x] Chrome type is set from the 15-role scale, on Schibsted Grotesk, with no Roboto anywhere in the build
- [x] Corner radii are the seven-step shape scale, and the topic chip is 8px
- [x] No motion, easing, or duration token is defined
- [x] The prose column is untouched: measure, serif, line-height and blockquote asides are byte-identical
- [x] `prepper/search`'s vendored CSS and its hash pin are unchanged
- [x] A seam-1 test asserts an emitted page links the tokens stylesheet and that it defines the role tokens
