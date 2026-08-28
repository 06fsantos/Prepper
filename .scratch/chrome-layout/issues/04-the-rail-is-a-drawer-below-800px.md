# 04: The rail is a drawer below 800px

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
Blocked by: 03

## What to build

On a phone, the top bar stays and the rail becomes an **overlay drawer** opened by the same
toggle.

Today, below 800px the left rail is the page's top strip unconditionally and the collapse
control is `display: none` -- so a phone reader gets the entire topic tree stacked above every
article and no way to dismiss it. The source document did not notice this; it is a defect, not
a matter of taste.

The toggle is rendered at **every** width. The drawer overlays the content rather than
reflowing it, and it uses the same `prepper-sidebar` state and the same `<head>` script as the
desktop collapse -- one mechanism, two presentations, not a second stateful control.

## Acceptance criteria

- [ ] Below 800px the topic tree is not stacked above the article
- [ ] The top bar's toggle is rendered and operable at every viewport width
- [ ] The drawer opens over the content and dismisses; the article does not reflow when it opens
- [ ] No second `localStorage` key and no second toggle script
- [ ] No horizontal page scroll at any supported width
- [ ] Nothing in this ticket's CSS carries a `transition` or `animation` (ticket 09 owns motion)
