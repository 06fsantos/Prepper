# 05: The graph opens on purpose

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
Blocked by: 01, 02

## What to build

The rail's graph panel is removed entirely, and the top bar's graph control opens the graph
deliberately, at size.

A 250px box at the edge of the page showing four nodes is the "large container for tiny
content" the source document objects to. The answer is not to enlarge the box.

Quartz's graph plugin **already ships a global-graph modal**, opened today from the panel's
expand icon (`.global-graph-icon`) and by Ctrl/Cmd-G. Promote that modal to the bar's graph
control. **Reuse it -- do not build a second one**, and do not fork the plugin: the vendoring
line in this repo is drawn at `prepper/search`, and core Quartz stays a remote.

The keyboard shortcut keeps working.

## Acceptance criteria

- [ ] Seam 1: no `.graph` panel renders in `right` on any page
- [ ] The bar's graph control opens Quartz's own global-graph modal
- [ ] Ctrl/Cmd-G still opens it
- [ ] No second modal implementation, and `@quartz-community/graph` is neither forked nor patched
- [ ] The control has an accessible name (ticket 10 audits the set; do not ship it nameless here)
