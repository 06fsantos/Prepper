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

**Status:** ready-for-agent

- [ ] The prose column holds a ~38rem measure at every viewport width, with the sidebar absorbing the remainder
- [ ] Body prose is serif
- [ ] A note's topics render as chips under its title, linking to their Terms
- [ ] No breadcrumb, next/previous control, progress bar, review badge, or read/unread indicator appears anywhere
- [ ] A blockquote renders as an aside within the measure
