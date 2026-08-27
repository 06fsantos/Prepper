/**
 * The topic index, rendered: in the sidebar, and on the Term page it belongs to.
 *
 * Navigation here answers *what shall I study today*, and the dev asks that question in
 * **topics, never in directories** -- so this is what replaces the file explorer. There is
 * one index (`../topics/topic-index.ts`), and these are two views of it: the sidebar tree
 * is the Term page's index rendered early, for a reader who has not arrived anywhere yet.
 * A third view, the app's entry point, is `prepper/home`, and it renders from the same
 * function so that it cannot drift from these.
 *
 * ## Why one component and two config entries
 *
 * Quartz places **one component per plugin entry**, from that entry's `layout:` block, so
 * a component that renders in two positions is listed twice and told which view it is by
 * `options.view`. They are one component because they are one index read two ways --
 * exactly the arrangement `prepper/edges` is in, and the reasoning there applies here
 * unchanged.
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
