# 08: The reading surface

**What to build:** Long-form reading that feels like a document, not like documentation. The prose
column holds a **~38rem measure regardless of viewport** — the sidebar takes the leftover width
rather than the text being stretched to fill it — and body prose is set in a **serif**.

The chrome states only what is true. A note's topics render as **chips under its title**, so its
several subjects are stated honestly rather than one being picked arbitrarily. There is **no**
breadcrumb, no next/previous, no progress bar, no review-queue badge, and no read/unread state,
because there is no reading order for chrome to imply and no per-user state for it to display.
Asides are ordinary blockquotes — margin notes would need a notation Obsidian Markdown does not
have.

**Blocked by:** 07

**Status:** resolved

- [x] The prose column holds a ~38rem measure at every viewport width, with the sidebar absorbing the remainder
- [x] Body prose is serif
- [x] A note's topics render as chips under its title, linking to their Terms
- [x] No breadcrumb, next/previous control, progress bar, review badge, or read/unread indicator appears anywhere
- [x] A blockquote renders as an aside within the measure

## Comments

Built as `prepper/reading/`: one component at `beforeBody` priority 12, which renders the
chips and carries the page styles. The styles ride on a component because that is how a
stylesheet reaches every page — Quartz collects `Component.css` from the configured
component list, not from what a page rendered — so the measure lands on a Term with no chips
and on the 404 page too.

The measure is three `grid-template-columns` overrides, one per viewport band, on upstream's
own selector and breakpoints: the prose column is the measure and the left sidebar is `1fr`.
They are longhand overrides of upstream's `grid-template` shorthand, and they win on source
order — a component stylesheet is emitted into the same `@layer quartz-base` as the base
styles and linked after them.

The serif is `Source Serif 4` in `quartz.config.yaml`, restated at the head of a
generic-serif stack in `prepper/reading` because Quartz appends a hard-coded *sans* fallback
to `--bodyFont`, which would set prose in sans exactly while the webfont was arriving.

`@quartz-community/breadcrumbs` is now disabled, with the reasoning in the config comment.
Next/previous, a progress bar and a review badge were never rendered; the test asserts their
absence on the whole page rather than trusting a disabled config entry to stay disabled.

Two pieces of chrome left alone as out of scope: the `content-meta` reading-time line, which
states something true, and the properties view, which shows only what
`quartz.config.yaml` lists.

Four things the code review caught, all fixed before the commit: the aside rule was wide
enough to catch a transclusion and a quiz's explanation (it is `blockquote:not([class])`
now -- an aside is the blockquote nobody classed); the sidebar track could be starved to
nothing by a measure that never yields (it has upstream's 320px as its minimum, and the
measure gives way below that); the chips' `aria-label` collided with the sidebar tree's;
and an unwritten topic chip came out as a pill with one dashed edge, because
`prepper/links` ships its mark unlayered and no layered rule can override it -- so the pill
belongs to the written chip, and an unwritten topic reads as the gap it is.
