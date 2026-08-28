/**
 * The chrome's design tokens: Material 3, derived from one seed, delivered on a component.
 *
 * What the vocabulary is and why Material was chosen -- and why the reading surface is
 * exempt from it on the merits -- is
 * [ADR 0003](../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md). The tokens
 * themselves are `tokens.ts`; the delivery mechanism is `components/index.ts`.
 *
 * ## Why a component rather than an emitter
 *
 * The same reason `prepper/reading` is one: Quartz collects `Component.css` from the
 * configured component list rather than from what a page rendered, and links every collected
 * stylesheet on every laid-out page. An emitter writing a stylesheet of its own would then
 * have to get itself linked, which is work Quartz already does.
 *
 * It is placed at `beforeBody` with the lowest priority in the position, which is
 * arbitrary and says nothing: the component renders `null`, so its position affects nothing
 * but the order of an empty slot. It has to be *in* the layout somewhere for Quartz to
 * instantiate it, and that is the whole requirement.
 *
 * ## Why the component is `.ts` and not `.tsx`
 *
 * Quartz loads a local plugin by importing it, and Node -- which performs that import --
 * strips TypeScript types but does not compile JSX. Same constraint every component of ours
 * is written under.
 */
export const manifest = {
  name: "prepper-tokens",
  displayName: "Prepper design tokens",
  description: "The chrome's Material 3 token layer, derived from one seed.",
  version: "1.0.0",
  category: "component",
  components: {
    PrepperTokens: {
      displayName: "Prepper design tokens",
      defaultPosition: "beforeBody",
      defaultPriority: 1,
    },
  },
}
