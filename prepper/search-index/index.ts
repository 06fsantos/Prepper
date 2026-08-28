/**
 * The search index, deliberately unlike the page.
 *
 * `contentIndex.json`'s `content` field is what search reads, and it is the **rendered tree
 * flattened**: `@quartz-community/description` sets `file.data.text = escapeHTML(toString(tree))`
 * as an htmlPlugin, and `@quartz-community/content-index` writes whatever it finds there.
 * So *anything the app renders is searchable, including what the page visually conceals* --
 * which is the load-bearing fact of the whole ticket, and the trap in it.
 *
 * The trap: the obvious way to keep a cloze answer out of search is to take the node out of
 * the tree, and that takes it off the **page** as well. So this plugin **never mutates the
 * tree**. It walks it, collects the text a reader should be able to search for, and
 * overwrites `file.data.text` with the result. One extra walk per note, and nothing
 * downstream can tell it happened.
 *
 * ## Why the order is an expression
 *
 * This has to run **after** `description`, because it overwrites what `description` wrote.
 * The order is therefore `descriptionOrder + 1`, read out of that package's own manifest at
 * load time, rather than the number 71 typed into `quartz.config.yaml`. A literal would be
 * a fact about upstream's config recorded in ours, silently wrong the day upstream moves
 * `description`, and wrong in the quietest possible way: the index would still be emitted,
 * still be searchable, and still contain every answer this plugin exists to strip.
 *
 * The config entry accordingly declares **no `order`** -- Quartz reads `defaultOrder` off
 * the manifest when an entry omits one, so leaving it out is how the expression wins.
 *
 * ## What is dropped, per quiz type
 *
 * The rule is per type, and the type is read off the block itself: `prepper/quiz` carries
 * `data-quiz-type` through to the rendered element for exactly this second consumer.
 *
 * | Quiz type | Indexed                                          | Dropped                            |
 * | --------- | ------------------------------------------------ | ---------------------------------- |
 * | mcq       | the prose prompt                                 | every option, every explanation    |
 * | cloze     | the sentence, minus what is inside the `{{holes}}` | the answer in each hole          |
 * | recall    | the prompt                                       | the reveal                         |
 *
 * The reasoning differs by type. **mcq** options are noise as much as spoiler: options are
 * required to be of equal length so that formatting leaks no clue, which makes four
 * near-identical strings per block -- poison for a prose search even before the explanations
 * hand over the answer. A **cloze** sentence is genuine authored prose worth finding, and it
 * is findable by the words around the holes; the hole's own word is the question, so it goes.
 * A **recall** reveal is a full answer and sits on the same footing as a sealed solution.
 *
 * ## What is *not* dropped
 *
 * **A Problem's sealed sections stay in.** Stripping them was rejected outright: a solution
 * is often the richest prose written on a topic, and "where did I write about tombstones"
 * has to find it. The spoiler is handled at the **result** instead -- `prepper/search`
 * suppresses the excerpt for `problems/` -- so a solution is findable without being shown,
 * and opening the note puts the reader at their own choice to unseal.
 *
 * **Workshop notes** are not mentioned here, and must not be: `prepper/workshop` is a
 * filter, so a Research note never reaches an htmlPlugin at all. There is no type-level
 * exclusion list anywhere in search, and adding one would be a second, weaker copy of a
 * boundary that already holds structurally.
 *
 * ## `topic` becomes `tags`, and feeds search only
 *
 * Quartz's tag index and search's `#`-prefixed queries read frontmatter `tags`; Prepper
 * authors `topic`. So `topic` is **copied** into `tags` here -- the field is never renamed,
 * because `topic` is a controlled vocabulary resolving to Term notes that must exist and
 * `tags` actively misdescribes it. A Cheat sheet's scalar `topic` becomes a one-element
 * array, which is the same reading `prepper/link-targets` already gives it.
 *
 * Two consequences, both settled in `quartz.config.yaml` beside this plugin's entry:
 * `tag-page` stays **disabled**, because the Term page is already the canonical topic index
 * and `/tags/big-o` would be a second one at a second URL that nothing links to; and `tags`
 * is not among `note-properties`' `includedProperties`, because a derived field rendered on
 * the page would be a second topic display competing with the chips, pointing at pages that
 * deliberately do not exist.
 */
import { createRequire } from "node:module"

import type { Element, Root, RootContent } from "hast"
import type { VFile } from "vfile"

import type { QuartzTransformerPluginInstance } from "../../quartz/plugins/types"

import { escapeHTML } from "../../quartz/util/escape.ts"
import { targets } from "../link-targets.ts"

const require = createRequire(import.meta.url)

/**
 * `description`'s order, read from the package that defines it.
 *
 * Not a number typed here. See the header: this plugin's whole job is to overwrite what
 * `description` wrote, so "after `description`" is the requirement and the arithmetic is
 * how it is stated.
 */
function descriptionOrder(): number {
  const pkg = require("@quartz-community/description/package.json") as {
    quartz?: { defaultOrder?: number }
  }
  const order = pkg.quartz?.defaultOrder
  if (typeof order !== "number") {
    throw new Error(
      "prepper-search-index: @quartz-community/description declares no `quartz.defaultOrder`, " +
        "so there is no order to run after. The search index would silently keep every quiz " +
        "answer it exists to strip, so this refuses to load instead.",
    )
  }
  return order
}

export const manifest = {
  name: "prepper-search-index",
  displayName: "Prepper search index",
  description: "Recomputes the search index text so that searching a topic hands over no answers.",
  version: "1.0.0",
  category: "transformer",
  defaultOrder: descriptionOrder() + 1,
}

/**
 * `description`'s own URL rewrite, applied here for the same reason it applies it: the index
 * is `description`'s text minus the quiz material, and every *other* difference between the
 * two would be one more thing search behaves unlike the page about.
 */
const urlRegex = new RegExp(
  /(https?:\/\/)?(?<domain>([\da-z.-]+)\.([a-z.]{2,6})(:\d+)?)(?<path>[/\w.-]*)(\?[/\w.=&;-]*)?/,
  "g",
)

const PrepperSearchIndex = (): QuartzTransformerPluginInstance => ({
  name: "PrepperSearchIndex",
  htmlPlugins() {
    return [
      () => (tree: Root, file: VFile) => {
        copyTopicToTags(file)
        file.data.text = escapeHTML(indexText(tree)).replace(urlRegex, "$<domain>$<path>")
      },
    ]
  },
})

/** The three quiz types, as `prepper/quiz` writes them onto the block. */
type QuizType = "mcq" | "cloze" | "recall"

/**
 * The text a reader should be able to search this page for.
 *
 * Concatenation with no separator, which is what `hast-util-to-string` does and therefore
 * what the index has always held: the alternative is to invent word boundaries `description`
 * does not invent and have the two disagree about what a match is.
 */
function indexText(tree: Root): string {
  const collected: string[] = []
  collect(tree, collected, undefined)
  return collected.join("")
}

function collect(node: Root | RootContent, into: string[], quiz: QuizType | undefined): void {
  if (node.type === "text") {
    into.push(node.value)
    return
  }
  if (node.type === "element") {
    const within = quizTypeOf(node) ?? quiz
    if (isDropped(node, within)) return
    for (const child of node.children) collect(child, into, within)
    return
  }
  if ("children" in node) {
    for (const child of node.children) collect(child, into, quiz)
  }
}

/** The type of the quiz block this element opens, if it opens one. */
function quizTypeOf(element: Element): QuizType | undefined {
  if (!hasClass(element, "quiz")) return undefined
  const written = element.properties.dataQuizType
  return typeof written === "string" ? (written as QuizType) : undefined
}

/**
 * Whether this element's text is answer material for the quiz block it sits in.
 *
 * Each class is asked about only under the type that produces it, so the table in the
 * header is the rule rather than a description of one -- a `.cloze` that somehow turned up
 * inside an mcq would be indexed, because nothing has said what it means there.
 */
function isDropped(element: Element, quiz: QuizType | undefined): boolean {
  switch (quiz) {
    case "mcq":
      return hasClass(element, "quiz-options")
    case "cloze":
      return hasClass(element, "cloze")
    case "recall":
      return hasClass(element, "quiz-reveal")
    default:
      return false
  }
}

function hasClass(element: Element, name: string): boolean {
  const written: unknown = element.properties.className
  if (Array.isArray(written)) return written.includes(name)
  if (typeof written === "string") return written.split(/\s+/).includes(name)
  return false
}

/**
 * Copy `topic` into `tags`, so that search has the field it reads.
 *
 * The stems rather than the written values: `topic: "[[hash-maps]]"` is what Obsidian's
 * property UI writes to disk, and `#[[hash-maps]]` is not a query anybody types. Resolution
 * is `prepper/link-targets`, which is the same reading the link graph and the vocabulary
 * rules give the field -- one implementation, so search can never file a note under a topic
 * the rest of the build resolved elsewhere.
 */
function copyTopicToTags(file: VFile): void {
  const frontmatter = file.data.frontmatter
  if (!frontmatter) return
  const topics = targets(frontmatter.topic).map((target) => target.stem)
  if (topics.length === 0) return
  frontmatter.tags = [...new Set(topics)]
}

export default PrepperSearchIndex
