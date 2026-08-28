/**
 * The report, as a page.
 *
 * A whole, self-contained HTML document rather than a note rendered through Quartz's
 * layout, and that is not a shortcut -- it is the load-bearing constraint. The report is
 * **emitter output**, written after the last transform, so nothing on it can become a
 * graph edge. Were it a virtual `content/` file fed through the pipeline instead, it would
 * link to every orphan it lists, each orphan would gain an inbound link, and the hygiene
 * section would **erase itself on the second build** -- a failure that prints nothing,
 * exits zero and is caught by no other test
 * ([the spike](../../.scratch/prepper-build/research/02-emitter-output-and-the-link-graph.md)).
 * Being emitter output is also what keeps it out of `description` and `crawl-links`
 * structurally, the same category as `contentIndex.json` and the 404 page.
 *
 * Quartz's own page chrome is out of reach from here for a duller reason: `renderPage` is
 * a `.tsx` module, and the thing importing a local plugin is Node, which strips types but
 * does not compile JSX (see [`prepper/README.md`](../README.md)). The styles are therefore
 * this file's, and small -- the report is a build artifact the dev reads, not a surface the
 * reader browses.
 *
 * ## Its six hexes are a copy of a source of truth that no longer exists
 *
 * The colours below were pasted by hand from the palette in `quartz.config.yaml`, and that
 * palette is now **inert**: the chrome's colour comes from `prepper/tokens`, derived from one
 * seed through Material 3's roles, and Quartz's nine names are redefined as aliases onto them
 * ([ADR 0003](../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md)). Component
 * CSS cannot reach this document for the reason above, so these six cannot be tokens; they are
 * a stale copy, and they are stated as such rather than left to be discovered. Buying them
 * back would cost a coupling from an emitter to the chrome's stylesheet, which is a worse
 * trade for a page only the dev opens. If the seed is ever turned, this file will not follow.
 *
 * ## Unlisted, not `--serve`-only
 *
 * Every build writes it, published where anyone with the URL can read it and nothing links
 * to it. One build mode rather than two that diverge: a page that existed only under
 * `npm run serve` would be a second build whose output nobody ever checked.
 */
import type { Hygiene, QueueRow, VaultReport } from "./report.ts"

/**
 * How many rows stand open before the rest is folded.
 *
 * Folded, **never capped**: a queue that dropped its tail would quietly stop mentioning
 * the notes with one inbound link each, which is most of the backlog. Ten is what fits on
 * a screen, and the eleventh is one click away rather than gone.
 */
const openRows = 10

/** Where the report lands, and what a link to it reads as. */
export const reportSlug = "report"

/** The whole page. */
export function renderReport(report: VaultReport): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Vault report</title>
<style>${styles}</style>
</head>
<body>
<main class="report">
<h1>Vault report</h1>
<p class="whisper">What the build has to say about the vault that is not a failure.
Nothing here is a defect, and nothing here is validated.</p>
${queueSection(report.queue)}
${hygieneSection(report.hygiene)}
</main>
</body>
</html>
`
}

function queueSection(queue: QueueRow[]): string {
  const open = queue.slice(0, openRows)
  const tail = queue.slice(openRows)

  return `<section id="authoring-queue">
<h2>Authoring queue</h2>
<p class="whisper">What to write next, ranked by how much of the existing writing leans on
it: every note with a committed obligation on it first, and among those the one the most
notes reach for. No number decides how much a field outweighs a sentence.</p>
${
  queue.length === 0
    ? `<p class="none">Nothing is waiting to be written.</p>`
    : `<ol class="queue">
${open.map(queueRow).join("\n")}
</ol>` +
      (tail.length === 0
        ? ""
        : `
<details class="queue-tail">
<summary>${tail.length} more</summary>
<ol class="queue" start="${openRows + 1}">
${tail.map(queueRow).join("\n")}
</ol>
</details>`)
}
</section>`
}

function queueRow(row: QueueRow): string {
  const name = row.slug ? `<a href="./${row.slug}">${escape(row.title)}</a>` : escape(row.title)

  const counts = row.breakdown.map((group) => `${group.sources.length} ${group.type}`).join(", ")

  return `<li class="queue-row" data-target="${escape(row.target)}" data-reason="${row.reason}" data-typed="${row.typed}" data-total="${row.total}">
<p class="queue-name">${name}</p>
<p class="queue-breakdown">${row.typed} typed of ${row.total} total${counts === "" ? "" : `: ${counts}`}</p>
${
  row.breakdown.length === 0
    ? `<p class="none">Nothing links here yet.</p>`
    : `<ul class="queue-sources">
${row.breakdown
  .flatMap((group) =>
    group.sources.map(
      (source) =>
        `<li><a href="./${source.slug}" data-edge="${group.type}">${escape(source.title)}</a> <span class="edge">${group.type}</span></li>`,
    ),
  )
  .join("\n")}
</ul>`
}
</li>`
}

function hygieneSection(hygiene: Hygiene): string {
  return `<section id="vault-hygiene">
<h2>Vault hygiene</h2>
<p class="whisper">What has rotted: things to go and look at, not things to fix by rule.</p>
<section id="unreferenced-attachments">
<h3>Unreferenced attachments</h3>
${list(
  hygiene.unreferencedAttachments.map(
    (file) => `<li data-file="${escape(file)}">${escape(file)}</li>`,
  ),
  "Every attachment is shown somewhere.",
)}
</section>
<section id="notes-with-no-inbound-links">
<h3>Library notes nothing links to</h3>
${list(
  hygiene.notesWithNoInboundLinks.map(
    (note) =>
      `<li data-slug="${escape(note.slug)}"><a href="./${note.slug}">${escape(note.title)}</a></li>`,
  ),
  "Every note is reachable from another.",
)}
</section>
<section id="terms-with-no-topic-edge">
<h3>Terms nothing is filed under</h3>
${list(
  hygiene.termsWithNoTopicEdge.map(
    (note) =>
      `<li data-slug="${escape(note.slug)}"><a href="./${note.slug}">${escape(note.title)}</a></li>`,
  ),
  "Every term has a note about it.",
)}
</section>
</section>`
}

function list(items: string[], empty: string): string {
  if (items.length === 0) return `<p class="none">${empty}</p>`
  return `<ul>\n${items.join("\n")}\n</ul>`
}

function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

const styles = `
:root { color-scheme: light dark; }
body {
  margin: 0;
  padding: 2rem 1.5rem 6rem;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.5;
  color: #2b2b2b;
  background: #faf8f8;
}
.report { max-width: 44rem; margin: 0 auto; }
h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
h2 { font-size: 1.25rem; margin: 2.5rem 0 0.25rem; }
h3 { font-size: 1rem; margin: 1.5rem 0 0.25rem; }
.whisper, .none { color: #6b6b6b; margin: 0.25rem 0 1rem; }
.queue { margin: 0; padding-left: 1.5rem; }
.queue-row { margin: 0 0 1.25rem; }
.queue-name { margin: 0; font-weight: 600; }
.queue-breakdown { margin: 0.1rem 0 0.3rem; color: #6b6b6b; font-size: 0.9rem; }
.queue-sources { margin: 0; padding-left: 1rem; list-style: none; }
.queue-sources li { font-size: 0.9rem; }
.edge { color: #6b6b6b; font-size: 0.8rem; }
.queue-tail { margin-top: 1rem; }
.queue-tail summary { cursor: pointer; color: #6b6b6b; }
a { color: #284b63; }
@media (prefers-color-scheme: dark) {
  body { color: #ebebec; background: #161618; }
  .whisper, .none, .queue-breakdown, .edge, .queue-tail summary { color: #a0a0a0; }
  a { color: #7b97aa; }
}
`
