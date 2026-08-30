/**
 * The topic index, rendered: in the sidebar, and on the Term page it belongs to.
 *
 * Navigation here answers *what shall I study today*, and the dev asks that question in
 * **topics, never in directories** -- so this is what replaces the file explorer. There is
 * one index (`../topics/topic-index.ts`) and three views of it, two placed from here and one
 * in `prepper/home`:
 *
 * | View       | Function     | Where                   | Shape                                   |
 * | ---------- | ------------ | ----------------------- | --------------------------------------- |
 * | `sidebar`  | `TopicTree`  | the rail, every page    | a bare foldable name list               |
 * | entry page | `TopicCards` | `prepper/home`'s body   | a card per topic, note types as columns |
 * | term-index | `TermIndex`  | a Term's `.page-footer` | the one card for the page's own topic   |
 *
 * They share the inversion and they share `filed()`, the group markup below each heading, so
 * they cannot disagree about what is filed where. They **do not** share a wrapper, and that is
 * the point rather than an oversight: the rail is a jump list beside something the reader is
 * already reading and has to stay short, while the entry page is a landing and exists to be
 * looked at. Up to ticket 08 the entry page rendered the rail's own view, which is how the app
 * came to open on a folded 38rem column of names in a 1500px window.
 *
 * ## Why one component and two config entries
 *
 * Quartz places **one component per plugin entry**, from that entry's `layout:` block, so
 * a component that renders in two positions is listed twice and told which view it is by
 * `options.view`. They are one component because they are one index read two ways --
 * exactly the arrangement `prepper/edges` is in, and the reasoning there applies here
 * unchanged.
 *
 * ## What this module no longer does
 *
 * It used to render its own off-canvas drawer for the rail -- a checkbox, two labels, a scrim
 * and a 900px breakpoint of its own -- so that navigation opened on a phone whether or not the
 * page's scripts ran. That is retired. The rail's presentation, at every width, is
 * `prepper/sidebar`'s: a column above 800px, a drawer over the article below it, both driven
 * by the one attribute and the one remembered word. This module renders what goes *inside* the
 * rail, which is the same list whatever the rail is doing.
 *
 * ## Why the components are `.ts` and not `.tsx`
 *
 * Quartz loads a local plugin by importing it, and Node -- which is what performs that
 * import -- strips TypeScript types but does not compile JSX. So these build their markup
 * with preact's `h` directly.
 */
export const manifest = {
  name: "prepper-topics",
  displayName: "Prepper topic index",
  description: "Renders the generated topic index: the sidebar tree, and a Term's own index.",
  version: "1.0.0",
  category: "component",
  components: {
    PrepperTopics: {
      displayName: "Prepper topic index",
      defaultPosition: "left",
      defaultPriority: 50,
    },
  },
}
