/**
 * The top bar: one persistent place for the app's controls, across the top of every page.
 *
 * The controls -- the app's name, search, the theme switch, reader mode -- used to be
 * scattered down the left rail, above a topic tree they have nothing to do with, in a column
 * that is about to become hideable. A control that disappears with the navigation it sits
 * beside is a control the reader has to restore the navigation to reach. So they move out of
 * `left` and into Quartz's **`header` position**, and this module is what turns that position
 * into a bar.
 *
 * ## Why the bar is Quartz's own `<header>` and this module renders nothing
 *
 * `header` is a flat array of components that `DefaultFrame` renders as the children of one
 * `<header>` element. A component placed there is a *sibling* of the other controls and can
 * never be their wrapper -- so there is nothing for this module to render that would contain
 * the bar's contents. What the bar needs is not another element inside it; it is for the
 * element that already exists to become fixed, full width, and laid out in three slots.
 *
 * That is a stylesheet, and a stylesheet reaches every page here the way `prepper/tokens`'
 * and `prepper/reading`'s do: on a component that renders `null` and carries `.css`, which
 * Quartz collects from the **configured component list** rather than from what a page
 * happened to render. So the bar is styled on 404 and on a folder index exactly as it is on
 * a Lesson.
 *
 * The bar is therefore `.page-header > header`, and that selector is this module's whole
 * contract with upstream. It is the same kind of coupling `prepper/reading` already has to
 * `.page > #quartz-body`, and it is checked by `prepper/testing/layout.test.ts` rather than
 * assumed.
 *
 * ## The slots are priorities, not wrappers
 *
 * Left to right the bar holds: the rail toggle, the app's name, search, the theme switch,
 * reader mode, the graph. Which side of the bar a control lands on is decided by **one CSS
 * rule** -- `.search` takes `margin-inline: auto` -- so everything ordered before search is
 * pushed left and everything after it is pushed right. The order is the `priority` each
 * entry declares in `quartz.config.yaml`:
 *
 * | Priority | Control                          |
 * | -------- | -------------------------------- |
 * | 5        | the rail toggle (ticket 03)      |
 * | 10       | the app's name (`page-title`)    |
 * | 20       | search, **the centre and the split** |
 * | 30       | the theme switch (`darkmode`)    |
 * | 35       | reader mode                      |
 * | 40       | the graph                        |
 *
 * A control arrives in a slot by being given a number, and nothing here needs re-laying out
 * to accept it -- the rail toggle and the graph both arrived that way. Quartz's Flex `group:`
 * mechanism is
 * deliberately not used: a group renders an anonymous `<div class="flex-component">` with no
 * name of its own, so grouping would buy a wrapper nothing can style and cost the ordering
 * that already does the job. The retired `toolbar` group is exactly that lesson.
 *
 * ## Why `position: fixed`, and what may never sit above it
 *
 * Quartz's grid (`quartz/styles/variables.scss`) has **no full-width row**: `grid-header` is
 * the centre column's top cell, with the rail beside it. A bar drawn in that cell would be a
 * banner over the article and nothing else. So the bar is taken out of flow -- which also
 * means the empty header cell contributes no height -- and the page is offset instead by
 * `--prepper-topbar-height`, published in `:root` here and consumed by everything that has
 * to start below the bar. The number is written once; no offset restates it.
 *
 * `position: fixed` resolves against the viewport only while **no ancestor establishes a
 * containing block for it** -- which `transform`, `filter`, `backdrop-filter`, `perspective`,
 * `will-change` and `contain` all do. The bar's ancestors are `.center`, `#quartz-body`,
 * `.page`, `body` and `html`, and none of them carries any of those today. The same
 * prohibition binds this module going forward, and it binds twice: `.search`'s own overlay is
 * `position: fixed` **inside the bar**, so a frosted-glass `backdrop-filter` on the bar, or a
 * `transform` used to centre the search field, would silently reposition the search modal
 * against the bar and shrink it to a 64px strip. Hence a solid surface colour, and hence
 * `margin-inline: auto` rather than `left: 50%; transform: translateX(-50%)`.
 *
 * ## The hazard that forced `prepper/sidebar` into `left` does not apply here
 *
 * `beforeBody` sits inside the `.popover-hint` that the search preview clones out of a
 * fetched page and splices into the live document; a control rendered there arrives as a
 * second copy of itself over the top of the page. `header` does not: `DefaultFrame` renders
 * it inside `<header>`, a **sibling** of `.popover-hint` and not a descendant, and the
 * vendored search client clones `getElementsByClassName("popover-hint")` and nothing else.
 * Asserted, not assumed, in `prepper/testing/layout.test.ts`.
 *
 * ## Reader mode hides the bar too
 *
 * Reader mode fades the rails and restores them on hover. A control that hides the chrome
 * while the chrome's most prominent element stays nailed to the top of the window does not do
 * what it says, so the bar fades with them, by the same gesture and on the same attribute.
 * Nothing here animates: motion is `prepper/tokens`' subject and its own ticket, and an
 * ad-hoc `transition` in a module that has no motion vocabulary is how a design system
 * becomes a suggestion.
 */
export const manifest = {
  name: "prepper-topbar",
  displayName: "Prepper top bar",
  description: "The persistent bar across the top of every page, and the offset it publishes.",
  version: "1.0.0",
  category: "component",
  components: {
    PrepperTopbar: {
      displayName: "Prepper top bar",
      defaultPosition: "header",
      defaultPriority: 1,
    },
  },
}
