/**
 * Spike plugin — mechanism 2: the Workshop boundary is a filter, not a missing page.
 *
 * The ADR 0002 amendment withdrew an accepted risk on the claim that Quartz resolves
 * non-media embeds in the browser, so a Workshop note -- having no page -- could not be
 * fetched. Ticket 02 ran it: embeds resolve at **build time**, splicing the target's
 * rendered subtree out of the corpus. The outcome survives, but on a different footing.
 * What makes the boundary airtight is the target being absent from the corpus the build
 * renders from, and in Quartz the only thing that removes a note from that corpus is a
 * **filter**.
 *
 * So this is the shape Prepper's real Library/Workshop split has to take, standing in
 * for it until that ticket lands. It filters on a `workshop: true` frontmatter flag
 * rather than borrowing `draft`, which used to serve here: ticket 03 disabled
 * `@quartz-community/remove-draft` deliberately, because a filter drops drafts before
 * any emitter sees them and `draft: true` must soften no validation rule. Reusing
 * `draft` would tie this guarantee to a flag whose filter the project has committed to
 * not running.
 *
 * A design that kept Workshop notes in the corpus and merely suppressed their pages
 * would leak their prose into every Library note that embeds them -- on the page, in
 * `contentIndex.json`, and in search. That is what these assertions are the tripwire for.
 *
 * Registered only by `prepper/testing/spike-build.ts`, never by `quartz.config.yaml`.
 */
export default function WorkshopFilterSpike() {
  return {
    name: "WorkshopFilterSpike",
    shouldPublish(_ctx, [, file]) {
      return file.data.frontmatter?.workshop !== true
    },
  }
}
