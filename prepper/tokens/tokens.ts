/**
 * The design token layer the **chrome** is painted from: Material 3, seeded once.
 *
 * Six modules used to paint against Quartz's nine configured colour names, and those nine
 * name *colours* rather than *roles* -- a module wanting a hairline and a module wanting a
 * disabled label both reached for `lightgray`, and the two diverge the moment anything is
 * rethemed. This file is the vocabulary that replaces them:
 * [ADR 0003](../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md).
 *
 * Four of Material's subsystems are adopted -- colour, elevation, typography, shape -- and
 * one is refused. **There is no motion subsystem here, deliberately.** Nothing of ours
 * animates on purpose, and the one place motion would tempt (revealing a quiz answer,
 * unsealing a solution) is exactly where the architecture insists the seal is markup and
 * the browser's own default does the work. A token vocabulary with no consumer is an
 * invitation to find one.
 *
 * ## The reading surface is not a consumer
 *
 * Material is a system for surfaces you *operate*; an article is a surface you *dwell in*.
 * Material has no measure and no mechanism for one, no paragraph role above 16px, and no
 * serif. So `prepper/reading`'s prose rules -- the ~38rem measure, the serif, the leading,
 * the blockquote aside -- take nothing from here, and that is a scope boundary rather than
 * an unfinished migration. Only its topic chips, which are chrome, are painted from these
 * tokens.
 *
 * ## Why the colours are computed rather than typed
 *
 * The seed is the source of truth. Every role is derived from it by Google's own
 * `material-color-utilities`, which is what makes a re-seed the one-line change it is
 * advertised as; nine hand-picked hexes could only be re-picked by hand, and a "derived"
 * palette that was actually pasted would drift from the seed the first time anyone edited
 * one value.
 *
 * **`@material/material-color-utilities` is held at `^0.3.0` on purpose.** 0.4.0 ships
 * extensionless relative imports in its own ESM (`from '../dynamiccolor/dynamic_scheme'`),
 * which Node's resolver refuses, so importing it fails the build outright. Bump it only after
 * checking that this file still imports.
 */
import {
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities"

/**
 * The one colour this app is derived from: the slate blue it already read as.
 *
 * Changing this line re-themes the whole chrome, light and dark, and nothing else has to
 * change with it. That is the entire point of the file.
 */
export const seed = "#284b63"

/**
 * The Material 3 colour roles, as `MaterialDynamicColors` names them.
 *
 * The full role set and nothing else: the five `*PaletteKeyColor`s the library also exposes
 * are inputs to the derivation rather than roles a component may paint with, so they are
 * not published as tokens.
 */
const colorRoles = [
  "background",
  "onBackground",
  "surface",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "inverseSurface",
  "inverseOnSurface",
  "outline",
  "outlineVariant",
  "shadow",
  "scrim",
  "surfaceTint",
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "inversePrimary",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "primaryFixed",
  "primaryFixedDim",
  "onPrimaryFixed",
  "onPrimaryFixedVariant",
  "secondaryFixed",
  "secondaryFixedDim",
  "onSecondaryFixed",
  "onSecondaryFixedVariant",
  "tertiaryFixed",
  "tertiaryFixedDim",
  "onTertiaryFixed",
  "onTertiaryFixedVariant",
] as const satisfies readonly (keyof typeof MaterialDynamicColors)[]

/** `surfaceContainerLow` -> `surface-container-low`. */
function kebab(role: string): string {
  return role.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

/** Every `--md-sys-color-*` role, resolved against the seed for one of the two schemes. */
function colorTokens(dark: boolean): string[] {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), dark, 0)
  return colorRoles.map(
    (role) =>
      `--md-sys-color-${kebab(role)}: ${hexFromArgb(MaterialDynamicColors[role].getArgb(scheme))};`,
  )
}

/**
 * Quartz's nine colour names, resolved onto roles.
 *
 * These are the *whole* remaining meaning of the `theme.colors` block in
 * `quartz.config.yaml`, which is why that block is neutralised and commented as inert: two
 * files claiming to set the same colour, with one silently losing, is worse than one file
 * that says where colour lives.
 *
 * Quartz's five neutrals are a ladder from page to ink, so they map onto Material's neutral
 * ladder in order. Two of them earn a note:
 *
 * - `--lightgray` is the name whose overloading started all this: the base stylesheet reaches
 *   for it as a hairline seven times -- `hr`, table rows, the footnote rule, a checkbox, a code
 *   block and its title, and `prepper/reading`'s aside bar -- and as the inline-code background
 *   once. It resolves to `outline-variant`, the hairline reading, because that is the majority
 *   and because it is the reading that survives the scheme flip: a container tone is a plausible
 *   match for the old value in light and is *fainter* than it was in dark, which would quietly
 *   thin every rule on the page for a reader who uses dark mode. The inline-code chip comes out
 *   a shade stronger than it was, in both schemes, and that is the price.
 * - `--highlight` is the tinted pill behind an internal link, and `--textHighlight` is
 *   `==marked==` text. Material has no translucent roles, so each takes the opaque container
 *   nearest what it meant: a low surface tint, and a container in a different hue.
 * - `--tertiary` has one consumer where colour carries **meaning** rather than decoration:
 *   `prepper/quiz` outlines the correct option with it and the wrongly chosen one with
 *   `--secondary`. Under the old palette that pair was green against navy; derived from this
 *   seed it is Material's tertiary against its primary, which is a lilac against a blue. Still
 *   two clearly different colours, and no longer the green a reader reads as "right" -- stated
 *   here because a quiz marker is the last place a colour should change without anyone saying
 *   so. Material's role set has no success role to reach for instead; giving one to the quiz is
 *   a decision about the quiz, not about this vocabulary.
 *
 * Emitted into **both** the light and the dark block. Quartz writes its own dark values at
 * `:root[saved-theme="dark"]`, which outranks a bare `:root` on specificity however late it
 * is linked, so an alias stated only once would win in light mode and lose in dark.
 */
const quartzAliases = [
  "--light: var(--md-sys-color-surface);",
  "--lightgray: var(--md-sys-color-outline-variant);",
  "--gray: var(--md-sys-color-outline);",
  "--darkgray: var(--md-sys-color-on-surface-variant);",
  "--dark: var(--md-sys-color-on-surface);",
  "--secondary: var(--md-sys-color-primary);",
  "--tertiary: var(--md-sys-color-tertiary);",
  "--highlight: var(--md-sys-color-surface-container);",
  "--textHighlight: var(--md-sys-color-tertiary-container);",
]

/**
 * Material's two reference typefaces, both mapped to the grotesque already configured.
 *
 * Material's own reference layer is Roboto twice over. Serving it would be a third webfont
 * for nothing: `--headerFont` is Schibsted Grotesk, it is already fetched on every page, and
 * a grotesque is what both reference slots are for. Naming `--headerFont` rather than
 * restating the family is what keeps `quartz.config.yaml` the one place the chrome's
 * typeface is chosen.
 */
const typefaces = [
  "--md-ref-typeface-brand: var(--headerFont);",
  "--md-ref-typeface-plain: var(--headerFont);",
]

interface TypescaleRole {
  /** The role name, kebab-cased as the token spells it. */
  name: string
  /** Which reference typeface the role is set in. */
  typeface: "brand" | "plain"
  /** px, as Material states them; emitted in rem. */
  size: number
  /** px, as Material states them; emitted in rem. */
  lineHeight: number
  weight: number
  /**
   * px of letter-spacing, as Material states them; emitted in rem.
   *
   * **Advisory.** Material's tracking values are tuned to Roboto's metrics, and nothing here
   * is set in Roboto. The sizes, line heights and weights are not advisory.
   */
  tracking: number
}

/**
 * Material 3's fifteen type roles, at their reference values.
 *
 * Left as a table rather than let the formatter fan each row over seven lines: fifteen roles
 * whose five numbers line up in columns is how the scale is read, and how a wrong one is seen.
 */
// prettier-ignore
const typescale: TypescaleRole[] = [
  { name: "display-large",   typeface: "brand", size: 57, lineHeight: 64, weight: 400, tracking: -0.25 },
  { name: "display-medium",  typeface: "brand", size: 45, lineHeight: 52, weight: 400, tracking: 0 },
  { name: "display-small",   typeface: "brand", size: 36, lineHeight: 44, weight: 400, tracking: 0 },
  { name: "headline-large",  typeface: "brand", size: 32, lineHeight: 40, weight: 400, tracking: 0 },
  { name: "headline-medium", typeface: "brand", size: 28, lineHeight: 36, weight: 400, tracking: 0 },
  { name: "headline-small",  typeface: "brand", size: 24, lineHeight: 32, weight: 400, tracking: 0 },
  { name: "title-large",     typeface: "brand", size: 22, lineHeight: 28, weight: 400, tracking: 0 },
  { name: "title-medium",    typeface: "plain", size: 16, lineHeight: 24, weight: 500, tracking: 0.15 },
  { name: "title-small",     typeface: "plain", size: 14, lineHeight: 20, weight: 500, tracking: 0.1 },
  { name: "body-large",      typeface: "plain", size: 16, lineHeight: 24, weight: 400, tracking: 0.5 },
  { name: "body-medium",     typeface: "plain", size: 14, lineHeight: 20, weight: 400, tracking: 0.25 },
  { name: "body-small",      typeface: "plain", size: 12, lineHeight: 16, weight: 400, tracking: 0.4 },
  { name: "label-large",     typeface: "plain", size: 14, lineHeight: 20, weight: 500, tracking: 0.1 },
  { name: "label-medium",    typeface: "plain", size: 12, lineHeight: 16, weight: 500, tracking: 0.5 },
  { name: "label-small",     typeface: "plain", size: 11, lineHeight: 16, weight: 500, tracking: 0.5 },
]

/** px -> rem, so a role scales with the reader's own root size rather than pinning to 16. */
function rem(px: number): string {
  return `${Number((px / 16).toFixed(5))}rem`
}

function typescaleTokens(): string[] {
  return typescale.flatMap((role) => [
    `--md-sys-typescale-${role.name}-font: var(--md-ref-typeface-${role.typeface});`,
    `--md-sys-typescale-${role.name}-size: ${rem(role.size)};`,
    `--md-sys-typescale-${role.name}-line-height: ${rem(role.lineHeight)};`,
    `--md-sys-typescale-${role.name}-weight: ${role.weight};`,
    `--md-sys-typescale-${role.name}-tracking: ${rem(role.tracking)};`,
  ])
}

/**
 * The seven-step corner scale, and no eighth step.
 *
 * "Which of seven" is a decidable question. "What looks right here" is how six modules
 * drifted into 5px, 1rem and 3px between them.
 */
const shapeTokens = [
  "--md-sys-shape-corner-none: 0;",
  "--md-sys-shape-corner-extra-small: 4px;",
  "--md-sys-shape-corner-small: 8px;",
  "--md-sys-shape-corner-medium: 12px;",
  "--md-sys-shape-corner-large: 16px;",
  "--md-sys-shape-corner-extra-large: 28px;",
  "--md-sys-shape-corner-full: 9999px;",
]

/**
 * Material's shadow ladder, for the surfaces that genuinely float and occlude and no others.
 *
 * Hierarchy between *flat* surfaces comes from the `surface-container-*` roles instead.
 * Tonal-tint elevation -- painting a translucent primary over a surface to imply height --
 * is **not** adopted: it is the path Material's own 2023 container roles superseded, and it
 * is not to be reintroduced as "the Material way".
 *
 * The rgba values are Material's own umbra/penumbra pair. They are stated literally because
 * a hex token cannot carry an alpha, and this is the file where a literal colour belongs.
 */
const elevationTokens = [
  "--md-sys-elevation-level0: none;",
  "--md-sys-elevation-level1: 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);",
  "--md-sys-elevation-level2: 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);",
  "--md-sys-elevation-level3: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15);",
  "--md-sys-elevation-level4: 0 2px 3px 0 rgba(0, 0, 0, 0.3), 0 6px 10px 4px rgba(0, 0, 0, 0.15);",
  "--md-sys-elevation-level5: 0 4px 4px 0 rgba(0, 0, 0, 0.3), 0 8px 12px 6px rgba(0, 0, 0, 0.15);",
]

function block(selector: string, declarations: string[]): string {
  return `${selector} {\n  ${declarations.join("\n  ")}\n}`
}

/**
 * The whole token layer, as one stylesheet.
 *
 * Colour is stated twice, once per scheme, against the same selectors Quartz writes its own
 * theme with -- `:root` and `:root[saved-theme="dark"]`. Everything else is scheme-invariant
 * and stated once.
 *
 * It reaches a page as a component stylesheet, which Quartz emits into `@layer quartz-base`
 * and links *after* the base styles, so an identical `:root` selector wins on source order.
 * That is what lets the aliases above redefine Quartz's own nine. See `components/index.ts`.
 */
export const tokens = [
  block("/* prepper: Material 3 design tokens, derived from one seed. */\n:root", [
    ...colorTokens(false),
    ...typefaces,
    ...typescaleTokens(),
    ...shapeTokens,
    ...elevationTokens,
    ...quartzAliases,
  ]),
  block(':root[saved-theme="dark"]', [...colorTokens(true), ...quartzAliases]),
].join("\n")
