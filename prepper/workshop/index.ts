/**
 * The Workshop boundary, page half: a Workshop note is in the vault and gets no page.
 *
 * `research`, `record` and `mission` are the dev's own working material -- reading notes,
 * learner state, the mission. They live in `content/` because that is where the vault is
 * and because Obsidian is where they are written, and the reader never sees them. Ticket
 * 05 made that true of the link graph, where a Workshop note is neither a node nor the
 * source of an edge. This is the other half: it is not emitted at all.
 *
 * ## Why a filter, and what a filter costs
 *
 * Removing a note from the corpus is a Quartz **filter** -- `shouldPublish` -- and a
 * filter runs *before any emitter sees the content*. That is the whole mechanism and also
 * the whole problem, because **validation is an emitter over the whole corpus**. A filter
 * added naively would silently stop validating every Workshop note in the vault: a
 * `research` note with no `sources` and a `record` with no `date` both have required
 * fields of their own, and both would start passing by being invisible.
 *
 * It is the same collision ticket 03 hit with `@quartz-community/remove-draft`, which is
 * disabled for exactly this reason -- and there the answer was to keep the note. Here it
 * cannot be, because "the reader never sees a Workshop note" is the requirement. So the
 * two are reconciled instead of traded off: the filter **hands the notes it withheld to
 * the emitter that needs them**, and validation reads the corpus plus that list. The rule
 * module's contract is unchanged -- `Vault` is still every note the build parsed -- and
 * `draft: true` still softens nothing, because this is not a filter on publication.
 *
 * ## Why the handoff is keyed on `ctx.allSlugs`
 *
 * A withheld note has to be remembered from the filter pass until the emitter pass, and
 * forgotten when that build is over. Quartz reassigns `ctx.allSlugs` to a **new array** at
 * the top of every build pass, full and partial alike, and the filter and the emitters of
 * one pass all see that same array -- so its identity *is* the pass. Keying a `WeakMap` on
 * it gives exactly one record per build, fresh without being reset and collected with the
 * build it belonged to. Under `--serve` that matters: a note deleted between rebuilds must
 * not go on being validated, and a note is never carried over from a pass it was not in.
 */
import { slugifyFilePath } from "../../quartz/util/path.ts"
import type { FilePath } from "../../quartz/util/path.ts"
import type { BuildCtx } from "../../quartz/util/ctx"
import type { ProcessedContent } from "../../quartz/plugins/vfile"
import type { QuartzFilterPluginInstance } from "../../quartz/plugins/types"

import { isWorkshop as isWorkshopType, typeOf } from "../note-type.ts"

export const manifest = {
  name: "prepper-workshop",
  displayName: "Prepper workshop boundary",
  description: "Withholds Workshop notes from the emitted site, and hands them to validation.",
  version: "1.0.0",
  category: "filter",
}

/** One build pass's withheld notes, in the order the filter met them. See the header. */
const withheld = new WeakMap<readonly string[], ProcessedContent[]>()

/**
 * Whether a note is Workshop, from the directory it sits in.
 *
 * A page Quartz generated has no `filePath` -- no file was read to make it -- and is not
 * a note at all, so it is never withheld. The same test `prepper/graph` and
 * `prepper/validation` make, for the same reason.
 *
 * The question asked is `isWorkshop` and not `!isLibrary`, which are not the same question
 * about a note in a directory the layout names no type for. See `../note-type.ts`.
 */
function isWorkshop(content: ProcessedContent): boolean {
  const { relativePath, filePath } = content[1].data
  if (!relativePath || !filePath) return false
  return isWorkshopType(typeOf(relativePath))
}

/**
 * The notes this build withheld, for the emitter that still has to see them.
 *
 * Empty when the filter is not installed, which is the honest answer rather than a
 * failure: validation then reads the corpus alone, and the corpus is everything.
 */
export function withheldNotes(ctx: BuildCtx): readonly ProcessedContent[] {
  return withheld.get(ctx.allSlugs) ?? []
}

/**
 * Every slug a Workshop note answers to, for the transform that has to recognise one.
 *
 * Read from `ctx.allFiles`, which is every *file* in the vault -- so it is complete during
 * the html phase, long before this filter has run, and complete regardless of whether the
 * filter is installed at all. That matters: the thing being recognised is "a note that
 * exists and the reader cannot reach", and a transform cannot ask the corpus about a note
 * the corpus no longer holds.
 *
 * Slugs are computed rather than read off a vfile for the same reason. `ctx.allSlugs` is
 * the same list slugified, but it is a flat array with nothing left of the paths the types
 * came from, and a slug alone cannot always answer the question -- `MISSION.md` slugifies
 * to `mission`, which no directory rule would recognise.
 *
 * A set of plain strings rather than of `FullSlug`, because every question asked of it is
 * "is this `data-slug` one of these", and `data-slug` is what the tree happens to hold.
 */
export function workshopSlugs(ctx: BuildCtx): ReadonlySet<string> {
  const slugs = new Set<string>()
  for (const filePath of ctx.allFiles) {
    if (isWorkshopType(typeOf(filePath))) slugs.add(slugifyFilePath(filePath as FilePath))
  }
  return slugs
}

const PrepperWorkshop = (): QuartzFilterPluginInstance => ({
  name: "PrepperWorkshop",
  shouldPublish(ctx: BuildCtx, content: ProcessedContent): boolean {
    if (!isWorkshop(content)) return true

    const pass = withheld.get(ctx.allSlugs) ?? []
    pass.push(content)
    withheld.set(ctx.allSlugs, pass)
    return false
  },
})

export default PrepperWorkshop
