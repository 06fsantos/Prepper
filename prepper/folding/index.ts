/**
 * Collapsible headings: a note's body folded on **every** heading it was written with.
 *
 * A Lesson is a document, and a document the reader has met before is one they want the
 * shape of rather than the whole of. So each heading becomes the summary of a `<details>`,
 * everything under it goes inside, and the page opens as its own outline -- the reader
 * unfolds the section they came for and leaves the rest shut.
 *
 * ## The fold is markup, and it arrives closed
 *
 * The same decision `prepper/problems` records at length, for the same reasons and with one
 * more of its own. `<details>` is shut by the HTML specification before a stylesheet loads,
 * before a script runs, and wherever the markup is pasted -- so a page whose scripts have
 * not arrived is a folded page rather than a page mid-rearrangement, and Quartz's search
 * preview pane, which injects a result's real HTML and runs none of its scripts, shows the
 * outline instead of the whole note. A fold built out of `display: none` and a click handler
 * would be open in the pane and open during the load, which is the state this exists to
 * avoid.
 *
 * It also means nothing is taken away from a reader with scripting off: a `<details>` ships
 * the way out in the same element as the way in.
 *
 * ## Nesting, and why the recursion is on the shallowest heading present
 *
 * `fold` cuts a list of blocks at the **shallowest heading depth in it** and recurses into
 * each section, so an `##` fold contains its `###` folds and those contain their `####`s.
 * Cutting on a fixed depth instead would leave a `###` written under an `##` outside the
 * fold that owns it, and a note that opened with `## Heading` for one section and `### ` for
 * the next -- which the vault is allowed to contain -- would come out half folded.
 *
 * Anything written **above the first heading** is not a section and is not made into one. A
 * note's opening paragraph is what the reader needs in order to choose a section, and a
 * folded page whose every word was folded would say nothing at all.
 *
 * ## A Problem is not folded here
 *
 * `prepper/problems` (order 35) has already folded a Problem's body on its named H2s, sealed
 * two of those sections, and laddered a third. Folding it again would put a `<details>`
 * round the seal's `<details>`, and the difference between "sealed because it is the answer"
 * and "folded because everything is folded" -- which is the whole point of the seal -- would
 * stop being visible. So this runs at order 36, after that transform, and returns early on
 * the note type that transform owns.
 *
 * ## The heading stays a heading
 *
 * It moves into the `<summary>`, and nothing else about it changes: same depth, same text,
 * so `rehype-slug` still gives it its id, the table of contents still lists it, and its
 * permalink still resolves. What a permalink cannot do on its own is open the fold it lands
 * in -- an anchor does not unfold a closed disclosure -- and that is the one job of
 * `reveal.js`, which is an enhancement over a page that is already correct without it.
 */
import { readFileSync } from "node:fs"

import type { Heading, Root, RootContent } from "mdast"
import type { VFile } from "vfile"

import type { QuartzTransformerPluginInstance } from "../../quartz/plugins/types"

import { typeOf } from "../note-type.ts"

export const manifest = {
  name: "prepper-folding",
  displayName: "Prepper collapsible headings",
  description: "Folds a note's body on its headings, nested, and ships every fold closed.",
  version: "1.0.0",
  category: "transformer",
}

/**
 * What a fold looks like once it is shut.
 *
 * The rules dress the disclosure and nothing more: delete every one of them and the page is
 * still folded, because the fold is the element. The hairline and the marker are **chrome**
 * -- the app's furniture round the author's prose -- so they are painted from the Material
 * roles like every other chip and rail, while the heading inside the summary stays exactly
 * the heading the reading surface set. See
 * [ADR 0003](../../docs/adr/0003-material-3-as-the-chromes-token-vocabulary.md).
 */
const foldStyles = `
details.prepper-fold {
  border-top: 1px solid var(--md-sys-color-outline-variant);
  margin: 0.6rem 0;
}
details.prepper-fold > summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}
details.prepper-fold > summary::-webkit-details-marker { display: none; }
details.prepper-fold > summary::before {
  content: "";
  flex: 0 0 auto;
  width: 0;
  height: 0;
  border-left: 0.36rem solid var(--md-sys-color-on-surface-variant);
  border-top: 0.28rem solid transparent;
  border-bottom: 0.28rem solid transparent;
  transform: translateY(-0.15em);
}
details.prepper-fold[open] > summary::before { transform: translateY(-0.05em) rotate(90deg); }
details.prepper-fold > summary > :is(h1, h2, h3, h4, h5, h6) { margin: 0.7rem 0; }
details.prepper-fold > summary:hover > :is(h1, h2, h3, h4, h5, h6) {
  color: var(--md-sys-color-primary);
}
details.prepper-fold > :not(summary) { margin-left: 0.96rem; }
details.prepper-fold details.prepper-fold { border-top: none; }
`

/**
 * The one thing a closed fold cannot do for itself.
 *
 * Read off disk rather than written here as a string, for the reason `prepper/quiz` and
 * `prepper/problems` read theirs: what is in the `.js` file is what reaches the page, and
 * the editor, the formatter and the reader all treat it as the code it is.
 */
const revealScript = readFileSync(new URL("reveal.js", import.meta.url), "utf8")

const PrepperFolding = (): QuartzTransformerPluginInstance => ({
  name: "PrepperFolding",
  externalResources: () => ({
    css: [{ content: foldStyles, inline: true }],
    js: [
      {
        script: revealScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
        spaPreserve: true,
      },
    ],
  }),
  markdownPlugins() {
    return [
      () => (tree: Root, file: VFile) => {
        // A Problem folded itself at order 35, on the six section names its body contract
        // knows, and sealed two of them. See the note at the head of this file.
        if (typeOf(file.data.relativePath ?? "") === "problem") return

        tree.children = folded(tree.children)
      },
    ]
  },
})

/**
 * One list of blocks, cut into folds at the shallowest heading it contains.
 *
 * Pure and recursive: what comes back is the same blocks in the same order, with the runs
 * that sit under a heading moved inside the disclosure that heading became. A list with no
 * heading in it is handed back untouched, which is what ends the recursion.
 */
function folded(children: RootContent[]): RootContent[] {
  const headings = children.filter(isHeading)
  if (headings.length === 0) return children

  const shallowest = Math.min(...headings.map((heading) => heading.depth))

  const out: RootContent[] = []
  let open: { heading: Heading; children: RootContent[] } | undefined

  for (const child of children) {
    if (isHeading(child) && child.depth === shallowest) {
      if (open) out.push(fold(open))
      open = { heading: child, children: [] }
    } else if (open) {
      open.children.push(child)
    } else {
      // The preamble: what the author wrote before the first heading, left where it is.
      out.push(child)
    }
  }
  if (open) out.push(fold(open))

  return out
}

/** One section, as the closed disclosure the reader meets. */
function fold(section: { heading: Heading; children: RootContent[] }): RootContent {
  const summary = element(
    "prepperFoldSummary",
    "summary",
    { className: ["prepper-fold-summary"] },
    [section.heading],
  )

  return element(
    "prepperFold",
    "details",
    { className: ["prepper-fold"], "data-depth": String(section.heading.depth) },
    [summary, ...folded(section.children)],
  )
}

function isHeading(node: RootContent): node is Heading {
  return node.type === "heading"
}

/**
 * A node that exists only to become one element.
 *
 * `data.hName` is Quartz's own pattern, and a node type nothing downstream has a handler for
 * is what keeps the element from being unwrapped on the way to hast -- the same trick
 * `prepper/quiz` and `prepper/problems` build their markup with.
 */
function element(
  type: string,
  tag: string,
  properties: Record<string, unknown>,
  children: RootContent[],
): RootContent {
  return {
    type,
    data: { hName: tag, hProperties: properties },
    children,
  } as unknown as RootContent
}

export default PrepperFolding
