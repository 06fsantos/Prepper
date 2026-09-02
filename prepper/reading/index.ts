/**
 * The reading surface: the measure, the serif, the chips under the title, and nothing else.
 *
 * Long-form reading that reads like a **document rather than like documentation**. Two
 * halves, in one plugin because they are one decision about what a page is:
 *
 * - **Markup**: a note's topics, rendered as chips under its title. A note is filed under
 *   every subject it is about, and the chips say all of them -- the alternative is picking
 *   one arbitrarily and calling it the note's home, which the vault does not believe.
 * - **Style**: the ~52rem measure the prose column holds at every viewport width, the serif
 *   it is set in, and the blockquote that carries an aside. This is where the page's own
 *   layout is declared rather than a component's -- every other module's CSS is deliberately
 *   in Quartz's theme variables so that it lands here. It is also the **only** module that
 *   declares this grid: `prepper/sidebar` hides the left rail with `display: none` and
 *   re-declares no track, which is what makes the prose column stay exactly where it is when
 *   the rail goes away. And since there is no right column, the grid is what places the one
 *   thing left over from it -- upstream's table of contents, as a sticky element in the margin
 *   rather than the top of a 320px track. It is also where the app's one **layout
 *   distinction** is drawn: a page whose body is prose holds the measure and spends the rest
 *   on margin, and a page whose body is a **generated index** spends it on the index. That is
 *   keyed off the class the index views render themselves with (`prepper-generated-index`),
 *   through `:has()`, and never off a slug, a filename or a page type -- so a Term page, which
 *   is both a definition and an index, keeps the measure above and goes wide below.
 *
 * ## Why the page styles ride on a component
 *
 * Quartz collects `Component.css` from the **configured component list**, not from what a
 * given page rendered, and links every collected stylesheet on every page. So the reading
 * surface arrives on a Term with no topics and on the 404 page exactly as it arrives on a
 * Lesson, and there is no need for a second emitter that writes a stylesheet of its own.
 *
 * The chrome this plugin does *not* render is as much of the ticket as what it does: no
 * breadcrumb, no next/previous, no progress bar, no review-queue badge, no read/unread
 * state. There is no reading order for chrome to imply -- the vault is a library, not a
 * course -- and there is no per-user state for it to display. Upstream's `breadcrumbs` is
 * disabled in `quartz.config.yaml` for that reason, which is where that decision is
 * written down.
 *
 * ## Why the component is `.ts` and not `.tsx`
 *
 * Quartz loads a local plugin by importing it, and Node -- which is what performs that
 * import -- strips TypeScript types but does not compile JSX. So it builds its markup with
 * preact's `h` directly.
 */
export const manifest = {
  name: "prepper-reading",
  displayName: "Prepper reading surface",
  description: "The prose measure and serif, and a note's topics as chips under its title.",
  version: "1.0.0",
  category: "component",
  components: {
    PrepperReading: {
      displayName: "Prepper reading surface",
      defaultPosition: "beforeBody",
      defaultPriority: 12,
    },
  },
}
