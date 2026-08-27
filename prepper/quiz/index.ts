/**
 * Quiz fences: retrieval practice, written as a fenced code block and rendered in place.
 *
 * A Lesson interleaves questions with its prose, and a question is written as
 *
 *     ```quiz <ULID> [cloze|recall]
 *     …ordinary Markdown…
 *     ```
 *
 * The choice of a **fenced code block** is what makes the vault survive without the app.
 * Obsidian has never heard of `quiz`, so it renders the block as a code block: the prompt,
 * the options and the explanations are all still there, legibly, in the order they were
 * written. That is the degradation floor, and it is why the body is **ordinary Markdown**
 * rather than YAML or a notation of ours -- the dev is never learning a second language,
 * and what they read while authoring is what they wrote.
 *
 * ## Why the body is re-parsed rather than read
 *
 * The body arrives here as a *string*: the whole point of a code fence is that nothing
 * inside it is parsed. So this transform calls `self.parse()` on it -- the **frozen
 * processor**, carrying every micromark extension every plugin registered -- and splices
 * the result back into the tree. Quartz's parser, Quartz's transforms, and no second
 * implementation of anything.
 *
 * What that buys, in order of how much it would have cost to build instead: GFM task lists
 * and blockquotes, so an option and its explanation are ordinary Markdown; syntax
 * highlighting inside a quiz body, for free, because it is a rehype plugin a phase later;
 * and **wikilinks**. A `[[link]]` written in an explanation is resolved by
 * `obsidian-flavored-markdown` (order 30) exactly as one written in a sentence is, and
 * `crawl-links` (order 60) then walks the injected subtree and records the edge. A link is
 * a link wherever it is written, and the link graph gets that for nothing. The mechanism
 * was run before it was relied on:
 * [research 02](../../.scratch/prepper-build/research/02-quiz-fence-reparsing.md).
 *
 * ## Why order 25
 *
 * After `syntax-highlighting` (20) and **before `obsidian-flavored-markdown` (30)**. The
 * downstream half is the load-bearing one: OFM is what turns a wikilink into an anchor, so
 * the subtree has to be in the tree before OFM walks it. The upstream half costs nothing --
 * highlighting is a rehype plugin, a whole phase later, and cannot see a markdown tree at
 * all -- but 25 is the free slot between the two, and taking it states the constraint
 * where the config can be read.
 *
 * ## Why `position` is stripped from the injected subtree
 *
 * Every offset in the re-parsed subtree points into the *fence body*, and every consumer
 * downstream believes offsets point into the *file*. `remark-obsidian`'s task-character
 * transform is the one that bites: it slices the file with them, and left in place it would
 * read twenty characters from the wrong part of the note. Stripping `position` selects its
 * fallback path, which is correct.
 *
 * The cost is real and worth stating: **there are no line numbers inside a quiz body**. A
 * violation about a fence therefore names the fence -- by its ULID, or by the line the
 * fence itself opens on, which is a position in the note's own tree and survives -- and
 * never a line within it.
 *
 * ## What a defective fence does
 *
 * It stays a code block, and validation raises an error.
 *
 * Not rendering it half-answerable is the point: an mcq with two right answers cannot be
 * graded, a cloze with no holes has nothing to reveal, and a block that looks answerable
 * and is not is worse for the reader than a block that was never claimed to be one. Left as
 * a code block it is exactly what Obsidian shows, which is the floor this whole design
 * already stands on -- so the reader loses the interaction and loses none of the content.
 * The dev, meanwhile, is told: `error`, on the same channel as every other defect, gating
 * CI and nothing else. It is the same shape `prepper/links` uses for a link the reader
 * cannot follow -- degrade to something honest, and shout on the other channel.
 *
 * The defects themselves are recorded on the vfile here and reported by the rules in
 * `prepper/validation/rules/quiz.ts`, for the reason `unwrittenLinks` is: the transform is
 * the only thing in the build that has parsed the fence, and a rule that re-parsed the
 * vault's fences itself could eventually disagree with the page the reader gets.
 */
import { SKIP, visit } from "unist-util-visit"
import type { BlockContent, Blockquote, Code, List, Root, RootContent, Text } from "mdast"
import type { Data } from "unist"
import type { Processor } from "unified"
import type { VFile } from "vfile"

import type { QuartzTransformerPluginInstance } from "../../quartz/plugins/types"

import { articleFor, typeOf } from "../note-type.ts"
import { ULID } from "../ulid.ts"

/** The three kinds of question there are. `mcq` is what an omitted type word means. */
const quizTypes = ["mcq", "cloze", "recall"] as const

type QuizType = (typeof quizTypes)[number]

/** The two type words a fence may actually write. `mcq` is spelled by leaving it out. */
const writtenTypes: readonly string[] = quizTypes.filter((t) => t !== "mcq")

/**
 * Which rule reports a defect. Three, because they are three different mistakes: the
 * infostring is a line the dev typed, the body is a shape they built, and placement is a
 * fact about which note they put it in.
 */
export type QuizDefectKind = "infostring" | "body" | "placement"

/** One thing wrong with one fence, as the transform found it. */
export interface QuizDefect {
  kind: QuizDefectKind
  /** One line, naming the fence and what is wrong with it. No severity prefix. */
  message: string
}

declare module "vfile" {
  interface DataMap {
    /**
     * Every defective quiz fence in this note, in the order the fences appear.
     *
     * Written by this transform during the markdown phase, read by the quiz validation
     * rules in the emitter phase -- the same arrangement as `unwrittenLinks`, and for the
     * same reason. This is the only place in the build that has parsed a fence body, so a
     * rule that went looking for these itself would be a second reading of the vault, free
     * to disagree with the first.
     *
     * A fence with a defect is **not** rendered as a quiz: it is left as the code block it
     * was written as. So this list is also the exact set of fences the reader will meet as
     * code.
     */
    quizDefects: QuizDefect[]
  }
}

export const manifest = {
  name: "prepper-quiz",
  displayName: "Prepper quiz",
  description: "Turns a ```quiz fence into an answerable block, with its body parsed as Markdown.",
  version: "1.0.0",
  category: "transformer",
}

/**
 * What makes a quiz block read as one, rather than as three paragraphs and a list.
 *
 * Structural only, and deliberately: a quiz block has to look like a thing you answer, so
 * the card and the option column ship with the transform that makes them, the same way
 * `prepper/links` ships the mark for an unwritten link. What is *not* here is anything that
 * hides an explanation or a cloze answer until it is earned -- that is revealing, revealing
 * is interaction, and interaction is the browser half. Hiding it now, with nothing yet able
 * to unhide it, would take content away from the reader for the length of one ticket.
 */
const quizStyles = `
.quiz {
  border: 1px solid var(--lightgray);
  border-radius: 5px;
  padding: 0.5rem 1rem;
  margin: 1.5rem 0;
}
.quiz > .quiz-prompt > :first-child { margin-top: 0; }
.quiz-options { list-style: none; padding-left: 0; }
.quiz-option { border: 1px solid var(--lightgray); border-radius: 5px; padding: 0.4rem 0.8rem; margin: 0.4rem 0; }
.quiz-explanation { border-left: 3px solid var(--lightgray); color: var(--darkgray); }
.cloze { border-bottom: 1px solid var(--secondary); font-weight: 600; }
`

const PrepperQuiz = (): QuartzTransformerPluginInstance => ({
  name: "PrepperQuiz",
  externalResources: () => ({ css: [{ content: quizStyles, inline: true }] }),
  markdownPlugins() {
    return [
      function () {
        // `this` is the frozen processor. Reaching for it rather than building a parser
        // here is the whole mechanism: it carries every extension every other plugin
        // registered, wikilinks included, whatever our own order happens to be.
        const processor = this as unknown as Processor<Root>

        return (tree: Root, file: VFile) => {
          const defects: QuizDefect[] = []
          // Placement is a fact about the note, not about the fence, so it is read once.
          const noteType = typeOf(file.data.relativePath ?? "")

          visit(tree, "code", (node: Code, index, parent) => {
            if (node.lang !== "quiz" || !parent || index === undefined) return

            const fence = readFence(node)
            const defect = placementDefect(fence, noteType) ?? fence.defect
            if (defect) {
              // Left exactly as written. See the header: a fence that cannot be answered
              // is more use to the reader as the code block Obsidian would have shown.
              defects.push(defect)
              return SKIP
            }

            const built = buildQuiz(fence, processor)
            if ("message" in built) {
              defects.push({ kind: "body", message: built.message })
              return SKIP
            }

            parent.children[index] = built.node
            // The injected subtree is Markdown that has already been through this
            // transform's only question -- descending into it would find a nested
            // ```quiz fence, which is a code sample about quiz blocks and not one.
            return SKIP
          })

          file.data.quizDefects = defects
        }
      },
    ]
  },
})

/** One fence, as its infostring describes it. */
interface Fence {
  /** The ULID, or undefined where there was not a well-formed one to have. */
  id: string | undefined
  type: QuizType
  body: string
  /** How a violation names this fence: its ULID, or the line the fence opens on. */
  name: string
  /** What is wrong with the infostring, if anything. */
  defect: QuizDefect | undefined
}

/**
 * Read ```` ```quiz <ULID> [type] ````.
 *
 * The type word is **explicit or absent, never inferred from the body**. A body of task
 * list items is an mcq because the author did not write a type word, not because it looks
 * like one -- so a cloze whose holes were forgotten is a broken cloze rather than a
 * mysteriously empty mcq, and the error says so.
 *
 * Only the first defect is reported. A fence with no ULID *and* a misspelled type word has
 * one line to fix, and two violations about one line is two ways of saying it is wrong.
 */
function readFence(node: Code): Fence {
  const words = (node.meta ?? "").trim().split(/\s+/).filter(Boolean)
  const [id, typeWord, ...extra] = words
  const line = node.position?.start.line

  // Named by the ULID where there is one, because that is what the dev searches the note
  // for. The line is the fallback, and it is the fence's own line -- offsets inside a body
  // do not survive the re-parse, which is why no message here names one.
  const name = id && ULID.test(id) ? `quiz fence ${id}` : `quiz fence on line ${line ?? "?"}`
  const fence = { id: id && ULID.test(id) ? id : undefined, body: node.value, name }

  if (!id) {
    return {
      ...fence,
      type: "mcq",
      defect: infostring(name, "has no ULID in its infostring: mint one with `npm run ulid`"),
    }
  }
  if (!ULID.test(id)) {
    return {
      ...fence,
      type: "mcq",
      defect: infostring(name, `has \`${id}\` where a ULID goes: mint one with \`npm run ulid\``),
    }
  }
  const unknown = [typeWord, ...extra].filter(
    (word) => word !== undefined && !writtenTypes.includes(word),
  )
  if (unknown.length > 0) {
    return {
      ...fence,
      type: "mcq",
      defect: infostring(
        name,
        `has an unknown type word \`${unknown[0]}\`: the type is \`cloze\`, \`recall\`, ` +
          "or omitted for `mcq`",
      ),
    }
  }

  return { ...fence, type: (typeWord as QuizType) ?? "mcq", defect: undefined }
}

function infostring(name: string, said: string): QuizDefect {
  return { kind: "infostring", message: `${name} ${said}` }
}

/**
 * Whether this fence is somewhere a quiz block may not be.
 *
 * Lessons only. A Problem is itself a practice unit, and practice units never nest: a
 * mid-attempt mcq inside one would be indistinguishable, to the reader and to anything that
 * later grades an attempt, from the attempt itself. The other types decline for a quieter
 * reason -- a question is friction on a note somebody opened to get an answer fast.
 *
 * Checked before the body is, so that a fence in the wrong place is one violation about
 * where it is rather than a critique of a block that should not exist.
 */
function placementDefect(
  fence: Fence,
  noteType: ReturnType<typeof typeOf>,
): QuizDefect | undefined {
  if (noteType === "lesson") return undefined
  const where = noteType ? `in ${articleFor(noteType)}` : "in a note the layout names no type for"
  return {
    kind: "placement",
    message:
      `${fence.name} is ${where}: quiz blocks are for lessons only, because practice ` +
      "units never nest",
  }
}

/** A built quiz block, or the one thing wrong with the body that stopped it being built. */
type Built = { node: RootContent } | { message: string }

function buildQuiz(fence: Fence, processor: Processor<Root>): Built {
  let subtree: Root
  try {
    subtree = processor.parse(fence.body)
  } catch (err) {
    // Markdown has no syntax errors, so this is all but unreachable -- and "all but" is
    // not "never", and a throwing transformer takes the whole build down with it.
    return { message: `${fence.name} could not be parsed as Markdown: ${messageOf(err)}` }
  }

  // Offsets in here index the fence body; everything downstream indexes the file. See the
  // header: this is the line that keeps `remark-obsidian` reading the right characters.
  visit(subtree, (child) => {
    delete child.position
  })

  const parts =
    fence.type === "mcq"
      ? multipleChoice(fence, subtree)
      : fence.type === "cloze"
        ? cloze(fence, subtree)
        : recall(fence, subtree)
  if ("message" in parts) return parts

  return {
    node: {
      type: "quiz",
      data: {
        hName: "div",
        hProperties: {
          className: ["quiz"],
          "data-quiz-id": fence.id,
          "data-quiz-type": fence.type,
        },
      },
      children: parts.children,
    } as unknown as RootContent,
  }
}

/** The children of a built quiz block, or what was wrong with the body. */
type Parts = { children: RootContent[] } | { message: string }

/**
 * An mcq: a prose prompt, a GFM task list of options, and a blockquote under each option.
 *
 * The task list is **unmade** rather than rendered. Left alone it would come out as three
 * checkboxes with the right one already ticked, in a block whose entire purpose is that the
 * reader answers it first -- so the checkbox is dropped and which option was ticked becomes
 * `data-quiz-correct` on the option instead.
 *
 * That attribute is readable by anyone who opens the inspector, and there is no arrangement
 * of a client-side quiz in which it is not: the browser has to be able to grade the answer.
 * What matters is that it is not *visible*, and it is not.
 */
function multipleChoice(fence: Fence, subtree: Root): Parts {
  const at = subtree.children.findIndex((child) => child.type === "list")
  if (at === -1) {
    return { message: `${fence.name} has no options: an mcq body is a prompt and a task list` }
  }

  const list = subtree.children[at] as List
  const options = list.children
  const correct = options.filter((option) => option.checked === true).length
  if (correct !== 1) {
    const marked = correct === 0 ? "no option" : `${correct} options`
    return { message: `${fence.name} marks ${marked} \`[x]\`: an mcq has exactly one` }
  }

  hProperties(list, { className: ["quiz-options"] })
  for (const option of options) {
    hProperties(option, {
      className: ["quiz-option"],
      "data-quiz-correct": option.checked === true ? "true" : "false",
    })
    // What makes it an option rather than a task. `mdast-util-to-hast` renders a
    // checkbox from this field alone, and `remark-obsidian`'s task-character transform
    // looks for one too; clearing it is what both of them read.
    option.checked = null

    // The option's own words, wrapped so the browser half has one thing to make a button
    // of. A custom node rather than a class on the paragraph, because a tight list item
    // has no paragraph by the time it is hast: `mdast-util-to-hast` unwraps it, and the
    // class would go with it. This node type has no such handler, so it survives.
    const [first] = option.children
    if (first?.type === "paragraph") {
      option.children[0] = {
        type: "quizOptionText",
        data: { hName: "span", hProperties: { className: ["quiz-option-text"] } },
        children: first.children,
      } as unknown as BlockContent
    }
    for (const child of option.children) {
      if (child.type === "blockquote") hProperties(child, { className: ["quiz-explanation"] })
    }
  }

  return {
    children: [prompt(subtree.children.slice(0, at)), list, ...subtree.children.slice(at + 1)],
  }
}

/**
 * A cloze: prose with `{{holes}}` in it, any number, revealed together and graded once.
 *
 * The holes are found in **text nodes only**, which is what keeps a `{{literal}}` written
 * inside a code span literal: `inlineCode` carries its content as a value rather than as
 * text, so the walk never reaches inside one. That falls out of the tree shape rather than
 * being arranged for, and it is the right answer -- a cloze about a template language has
 * to be able to quote one.
 */
function cloze(fence: Fence, subtree: Root): Parts {
  let holes = 0

  visit(subtree, "text", (node: Text, index, parent) => {
    if (!parent || index === undefined) return
    const split = splitHoles(node.value)
    if (!split) return
    holes += split.filter((part) => part.hole).length
    const replacement = split.map((part) =>
      part.hole
        ? ({
            type: "cloze",
            data: { hName: "span", hProperties: { className: ["cloze"] } },
            children: [{ type: "text", value: part.value }],
          } as unknown as RootContent)
        : ({ type: "text", value: part.value } as RootContent),
    )
    parent.children.splice(index, 1, ...replacement)
    // Past what was just spliced in: a hole's own text must not be searched for holes.
    return [SKIP, index + replacement.length]
  })

  if (holes === 0) {
    return { message: `${fence.name} has no \`{{holes}}\`: a cloze body needs at least one` }
  }
  return { children: [prompt(subtree.children)] }
}

/**
 * A recall: a prompt, and a blockquote holding the answer to compare against.
 *
 * The only type the app cannot grade -- the reader reveals and marks themselves -- so the
 * two halves are told apart in the markup and nothing else is asked of the body.
 */
function recall(fence: Fence, subtree: Root): Parts {
  const at = subtree.children.findIndex((child) => child.type === "blockquote")
  if (at === -1) {
    return { message: `${fence.name} has no reveal: a recall body is a prompt and a blockquote` }
  }

  const reveal = subtree.children[at] as Blockquote
  hProperties(reveal, { className: ["quiz-reveal"] })

  return {
    children: [prompt(subtree.children.slice(0, at)), reveal, ...subtree.children.slice(at + 1)],
  }
}

/**
 * The question itself, wrapped so that the browser half has one thing to point at.
 *
 * Every type has a prompt and they are all found the same way -- everything before the part
 * that answers it -- so the wrapper is here rather than three times over.
 */
function prompt(children: RootContent[]): RootContent {
  return {
    type: "quizPrompt",
    data: { hName: "div", hProperties: { className: ["quiz-prompt"] } },
    children,
  } as unknown as RootContent
}

/**
 * Split a run of text on `{{…}}`, or undefined where there is nothing to split.
 *
 * Non-greedy and newline-tolerant: a hole may wrap across the lines of a paragraph, because
 * that is a decision about line width the author should not have to think about.
 */
function splitHoles(value: string): { value: string; hole: boolean }[] | undefined {
  const pattern = /\{\{([\s\S]+?)\}\}/g
  const parts: { value: string; hole: boolean }[] = []
  let last = 0

  for (const match of value.matchAll(pattern)) {
    const start = match.index
    if (start > last) parts.push({ value: value.slice(last, start), hole: false })
    parts.push({ value: match[1], hole: true })
    last = start + match[0].length
  }
  if (parts.length === 0) return undefined
  if (last < value.length) parts.push({ value: value.slice(last), hole: false })

  return parts
}

/**
 * Carry properties through to the hast element this node becomes.
 *
 * `data.hProperties` is Quartz's own pattern -- it is how `data-callout` and
 * `data-clipboard` reach the page -- and using it is what keeps the fence's type and ULID
 * recoverable at html-plugin time and in the browser, rather than only during the parse
 * that read them.
 */
function hProperties(node: { data?: Data }, properties: Record<string, unknown>) {
  const data = (node.data ??= {}) as Record<string, unknown>
  data.hProperties = { ...((data.hProperties as object) ?? {}), ...properties }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export default PrepperQuiz
