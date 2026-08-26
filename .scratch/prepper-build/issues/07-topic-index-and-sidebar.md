# 07: The topic index, on the Term page and in the sidebar

**What to build:** Navigation that answers *what shall I study today* — a question the dev asks in
**topics, never in directories**. `topic` inverted on the term note is the generated topic index,
and the sidebar tree is that **same index, rendered early**. One index, two views: there is never
a second index to maintain, and no hand-maintained list of "what is here on Big-O".

A note about two topics appears under **both**, because the many-to-many-ness the vault was
designed around should be visible rather than deduped away. Under a topic, leaves are grouped by
note type with the **Cheat sheet pinned first**, so the quick-catchup document is the first thing
seen. Alongside the tree sits a **flat alphabetical Cheat sheets list**, for going straight to a
condensed topic without navigating into it.

A Term with no Lessons has no Cheat sheet, so its body is where an **area overview** lives — a
topic like "System Design" needs somewhere to explain itself. The app **opens on the topic index**,
and does not pretend to know what is due.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] The app's entry point is the topic index
- [ ] A Term page carries the generated index of every Library note about that topic
- [ ] The sidebar tree is keyed by topic and is generated from the same index as the Term page
- [ ] A note with two topics appears under both, not deduped to one
- [ ] A topic's leaves are grouped by note type, with the Cheat sheet first
- [ ] A flat alphabetical Cheat sheets list is reachable from the sidebar
- [ ] The sidebar goes off-canvas below ~900px and the app remains usable on a phone
- [ ] A Term with no Lessons renders its body as an area overview above its index
