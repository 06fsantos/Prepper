# 01: One graph, not two

Parent: [Chrome layout — spec](../spec.md)
Type: task
Status: resolved
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

- [x] The cause of the double placement is identified and recorded in this file's `## Comments`
- [x] The fix addresses that cause; a second copy is not simply deleted downstream
- [x] Seam 1: exactly one `.graph` in the emitted markup, asserted per page type -- home, Lesson,
      Term, Problem, 404
- [x] `npm test` and `npx tsc --noEmit` pass

## Comments

**The cause.** Not `layout.byPageType`, not `layout.groups`, and not the object-vs-string
`source` forms in themselves. It is `buildLayoutForEntries` in
`quartz/plugins/loader/config-loader.ts`, whose **second** pass -- the `defaultPosition`
fallback -- places a component for every enabled entry that declares **no `layout:` block**:

```ts
for (const entry of entries) {
  if (!entry.enabled || entry.layout) continue
  const name = extractPluginName(entry.source)      // basename of the path
  const registered = componentRegistry.get(name) ?? …
  const pascalName = /* name split on "-", each part capitalised */
  const reg = registered ?? componentRegistry.get(pascalName)
  …
  posArray.push({ component, priority: layoutDefaults?.defaultPriority ?? 50 })
}
```

Three facts compose into the bug:

1. `extractPluginName` derives a plugin's name from the **basename of its source path**, never
   from the `manifest.name` the module exports. `"./prepper/graph"` is therefore the plugin
   named `graph`, notwithstanding that `prepper/graph/index.ts` exports
   `manifest.name = "prepper-graph"`.
2. The fallback pass is what gives a component-only package a position without the config
   naming one, and it keys on that derived name plus its PascalCase form -- `graph` -> `Graph`.
3. `loadComponentsFromPackage` registers each component under its **unqualified export name**
   as well as its fully-qualified key, into one flat global registry. So
   `@quartz-community/graph` owns the key `Graph`.

`./prepper/graph` is a whole-corpus **emitter** that renders nothing and so declares no
`layout:`. The fallback looked up `Graph`, found the community graph panel, read its manifest
(`defaultPosition: right`, `defaultPriority: 10`) and pushed it into `right` -- on top of the
copy the `@quartz-community/graph` entry's own `layout:` block had already put there. Nothing
warned; the plugin is named exactly once in `quartz.config.yaml`. Confirmed by instrumenting
`buildLayoutForEntries` to print the resolved `right` array, which came out
`[TableOfContents, Graph, Edges, Graph]` -- note the second `Graph` sorted last, at priority
10, i.e. placed by a pass that runs after the configured entries rather than by the entry.

The generality the ticket asked about is real: any layout-less local plugin whose directory
basename PascalCases onto a registered component adopts it. `./prepper/search` or
`./prepper/footer` would do the same thing tomorrow. It is *only* the layout-less entries that
are exposed -- an entry with a `layout:` block never reaches the fallback -- which is why our
other local plugins escaped.

**The fix.** `./prepper/graph` takes the object source form with `name: prepper-graph`, the
same mechanism `prepper/edges` and `prepper/topics` already use (there for distinct names
across several entries of one module). `parsePluginSource` honours `source.name` for local
paths, so the plugin installs, loads and emits exactly as before -- `static/linkGraph.json` is
asserted still to be written -- and `PrepperGraph` matches nothing in the registry. No copy was
deleted downstream; the second copy was never requested.

One residue worth knowing about: the plugin cache symlinks a local plugin as
`.quartz/plugins/<name>`, so the stale `.quartz/plugins/graph` was removed by hand. It is
gitignored and a fresh checkout never has it.

**The tripwire.** `prepper/testing/layout.test.ts`, seam 1 over the `topic-index` fixture: the
graph panel is counted on a home page, a Lesson, a Term, a Problem, a folder index and 404
(the last two are 0 by `layout.byPageType`, and they are there because they are resolved
through a separate pass of the loader), plus that the surviving panel is the one in the right
rail and that the renamed plugin still emits its graph. `prepper/README.md`, `CLAUDE.md` and
`docs/upstream-merges.md` record the constraint.
