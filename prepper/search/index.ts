/**
 * Search -- **vendored**, not forked and not patched.
 *
 * Quartz's search is adopted whole in mechanism: a build-time `contentIndex.json`, three
 * Flexsearch indexes over title, content and tags, top-five results, a thirty-word excerpt
 * with match highlighting, and a preview pane. None of that is rebuilt here, and no server
 * endpoint appears -- the static deploy is untouched. What changes is **what lands in the
 * index** (`prepper/search-index`) and **how a result reads** (this directory).
 *
 * ## Why this one is vendored when everything else is configured
 *
 * The two changes a result needs -- a type chip, and no excerpt on a `problems/` result --
 * are both edits to the client script `@quartz-community/search` ships. There is no option
 * for either: `enablePreview` is the component's only knob and it is global. So the rule
 * `prepper/README.md` states -- our behaviour lives in our own files and reaches Quartz
 * through configuration -- does not reach this case, and the line gets drawn here:
 *
 * - **Core Quartz stays a remote**, merged periodically, never edited in place. Unchanged.
 * - **A community plugin we alter is vendored in-tree.** `vendor/` holds
 *   `@quartz-community/search` 0.1.0's two built assets, pinned by version and by the
 *   sha256 of the pristine originals in `README.md`, with our alterations marked in place.
 *   The npm dependency is dropped: we are changing what a result *means* rather than
 *   fixing a bug worth upstreaming, so there is no upstream to track.
 *
 * A GitHub fork was rejected as a second repo to maintain for no gain, and a patch file
 * re-applied at install was rejected because it breaks silently on any upstream refactor
 * of the render function it edits. Vendoring breaks loudly, once, at merge time -- which
 * is the only honest option when the thing being changed is nobody else's idea of a bug.
 *
 * ## What is not here
 *
 * **No type-level exclusion list.** All five Library types are searchable, and Workshop is
 * out **structurally**: `prepper/workshop` is a filter, so a Research note never reaches an
 * emitter, never gets a page, and never gets an index entry. Nothing in search knows the
 * word "Workshop", and nothing should -- a rule here would be a second, weaker copy of a
 * boundary that already holds.
 */
export const manifest = {
  name: "prepper-search",
  displayName: "Prepper search",
  description:
    "Quartz's search, vendored: results carry a type chip, and a Problem carries no excerpt.",
  version: "1.0.0",
  category: "component",
  components: {
    PrepperSearch: {
      displayName: "Search",
      defaultPosition: "left",
      defaultPriority: 20,
    },
  },
}
