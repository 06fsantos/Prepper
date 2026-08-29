/**
 * Typed edges, rendered **in context** -- and untyped ones, collected in one panel.
 *
 * Where a link is shown is part of what it means. A prerequisite is something the reader
 * needs *before* they start, so it goes at the top; what a Lesson unlocks is only
 * interesting once they have finished, so it goes at the bottom; the Problems that drill a
 * Lesson belong beside it, and the Lesson a Problem drills belongs beside the Problem. None
 * of that is a sidebar's job, which is why none of it is in a sidebar. What is left --
 * the body links, which mean only "these two notes came up together" -- is exactly the
 * thing a single **backlinks panel** is right for.
 *
 * That panel is the last of the four rather than a fifth kind of thing. It used to be a chrome
 * panel in the right column, which was the one placement that contradicted the argument above:
 * a rail is a rail wherever it renders, and a column at the edge of the page is not a category.
 * The column was retired in ticket 06 and the panel joined the other rails at the foot of the
 * article, ordered after them -- what this note practises, what it unlocks, and then what else
 * merely points at it.
 *
 * **Nothing is ever gated.** The prerequisite graph is a build-time integrity property, not
 * a runtime permission system: every rail here is a plain list of links, no entry is ever
 * disabled on the basis of another note, and a re-read is never obstructed.
 *
 * ## Why one component and four config entries
 *
 * Quartz places **one component per plugin entry**, from that entry's `layout:` block. The
 * four sections sit in two different positions -- "Read first" above the note, the other three
 * below it -- so the plugin is listed four times in `quartz.config.yaml`, each entry naming its
 * `section` in `options` and its own position and priority.
 * They are one component because they are one idea read four ways -- the same `LinkGraph`,
 * sliced by edge type and direction -- and splitting them into four plugin directories
 * would be four `package.json` files buying nothing.
 *
 * ## Why the components are `.ts` and not `.tsx`
 *
 * Quartz loads a local plugin by importing it, and Node -- which is what performs that
 * import -- strips TypeScript types but does not compile JSX. So these build their markup
 * with preact's `h` directly. It is the same tree either way; only the notation is denied
 * us, and only in the files Quartz imports at runtime.
 */
export const manifest = {
  name: "prepper-edges",
  displayName: "Prepper edges",
  description: "Renders typed edges in context, and untyped ones in one backlinks panel.",
  version: "1.0.0",
  category: "component",
  components: {
    PrepperEdges: {
      displayName: "Prepper edges",
      defaultPosition: "afterBody",
      defaultPriority: 50,
    },
  },
}
