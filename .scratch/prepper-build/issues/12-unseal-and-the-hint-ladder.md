# 12: Unseal and the hint ladder work in the browser

**What to build:** The click behaviour over 11's markup. Two things, both custom elements with no
build step.

**Unseal**: a sealed section opens **in place** so scroll position holds, and the dev can read the
complexity without the solution. The seal itself is CSS (11) — this ticket only adds the click, and
the seal must still be closed with JS disabled and when the markup is injected into the search
preview pane. That is the property worth testing hardest: **a search result never leaks a solution.**

**The hint ladder**: `## Hints` is revealed **one at a time** by a "next hint" control, so the dev
can take the smallest nudge that unblocks them rather than the whole ladder at once. The ordering
is semantic — hint one is a nudge, the last is near the answer — so revealing is strictly in order.
Hints may use JS, unlike the seal.

Seam 2, over markup produced by the build.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Clicking a sealed section's control expands it in place, with scroll position held
- [ ] Opening `## Complexity` leaves `## Solution` closed, and vice versa
- [ ] The sections render closed with JS disabled
- [ ] A Problem injected into the search preview pane renders with its sections still sealed
- [ ] "Next hint" reveals exactly one further hint per activation, in authored order
- [ ] The control disappears or disables once the last hint is revealed
- [ ] The seam-2 tests run against markup emitted by the build
