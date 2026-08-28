# 01: One graph, not two

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

Every built page renders the graph panel exactly once. `@quartz-community/graph` appears
exactly once in `quartz.config.yaml`, and `grep -c 'class="graph"' public/**/*.html` currently
returns 2 -- on the home page and on every Lesson. Layout resolution is placing a
singly-configured plugin twice.

**Find the cause before deleting a copy.** A resolver that does this to one plugin will do it
to the next component someone adds, and the next person will not know to grep for it. The
suspects are the interaction between `layout.byPageType` (which redeclares `positions` for
`404`, `folder` and `tag`), the `layout.groups` block, and the object-vs-string `source` forms
this repo uses -- but confirm rather than assume, and say in the ticket comments what it
actually was.

Nothing else in this effort is blocked on this, but ticket 05 removes the rail panel and
promotes the modal, and it should not be removing a panel that is still being drawn twice for
a reason nobody understands.

## Acceptance criteria

- [ ] The cause of the double placement is identified and recorded in this file's `## Comments`
- [ ] The fix addresses that cause; a second copy is not simply deleted downstream
- [ ] Seam 1: exactly one `.graph` in the emitted markup, asserted per page type -- home, Lesson,
      Term, Problem, 404
- [ ] `npm test` and `npx tsc --noEmit` pass
