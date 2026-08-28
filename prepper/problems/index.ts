/**
 * Problems: a note the dev can **attempt**, with the answer out of their peripheral vision.
 *
 * A Problem's body is written as **named H2 headings** -- `## Prompt`, `## Constraints`,
 * `## Hints`, `## Solution`, `## Complexity`, `## Follow-ups` -- and this transform folds
 * the tree on those boundaries, so that a section is a thing the page can seal, number, or
 * leave alone. Nothing about the fold is inferred: a heading is matched by the words the
 * author typed under it, which is the same contract Obsidian shows them.
 *
 * ## Why the seal is a `<details>` and not a class
 *
 * `## Solution` and `## Complexity` come out inside a closed `<details>`, and that is the
 * one decision in here that is not a preference.
 *
 * Quartz's search preview fetches a result's real HTML and injects its elements into the
 * preview pane. A seal that hid its section by having a script find it and hide it would
 * therefore render **open** in that pane -- the script never ran there -- and a search for
 * "hash map" would hand the dev the solution to the problem they were about to attempt. The
 * same hole opens on a slow page load, where the markup is on screen before any script has
 * parsed, and again with JavaScript off.
 *
 * `<details>` closes itself. It is closed by the HTML specification before a stylesheet
 * loads, before a script runs, and wherever the markup is pasted -- so the seal holds in
 * the preview pane, during the load, and in a reader with scripting disabled. The CSS below
 * dresses it; remove every line of it and the seal is still shut. It is the same mechanism
 * `prepper/topics` uses for its mobile sidebar, which is a checkbox and a label, and for
 * the same reason: an interaction the browser already owns is one no ticket can break.
 *
 * That also settles the hazard `prepper/quiz` walked around. A `display: none` shipped by a
 * build with nothing yet able to undo it takes content away from the reader for the length
 * of a ticket; a `<details>` ships the way *out* in the same element as the way in, so the
 * reader can open it with the click they would have used anyway. The browser half (ticket
 * 12) adds the hint ladder's control and whatever else the reading experience wants; it is
 * not what makes any of this work.
 *
 * The two seals are **separate elements carrying no `name`**, which is what makes them
 * independent: `name` is what groups disclosures into an exclusive accordion, and reading
 * the complexity of a solution you have already read should not re-hide the solution.
 *
 * Unsealing is the same element's other half, and it is the browser's: a click on the
 * `<summary>` opens the disclosure in place, moving nothing else on the page, so the scroll
 * position holds without anyone writing a line about scrolling. Prepper ships **no script
 * for it at all** -- one would have to fight the behaviour it was duplicating, and it would
 * be the exact script whose absence in the search preview pane the seal depends on.
 *
 * ## What is not sealed, and why
 *
 * `## Constraints` and `## Follow-ups` render open. Reading the follow-ups before attempting
 * sharpens the attempt rather than spoiling it, and the constraints *are* the problem.
 *
 * `## Hints` renders open too, and marked: an `ol` of rungs, one per top-level list item,
 * each numbered in `data-hint`, wrapped in a `<prepper-hint-ladder>`. The build ships that
 * open on purpose. `hints.js` is what takes the rungs away and hands the dev one control,
 * and it is allowed to because the *degraded* state -- every hint on screen, which is what
 * the vault says and what Obsidian shows -- is the harmless one. The seal cannot be built
 * that way round, and that asymmetry is the whole reason the two halves of a Problem page
 * are written in two different languages.
 *
 * ## Sealing is a rendering rule of the app alone
 *
 * The vault conceals nothing. A Problem read in Obsidian shows everything at once, which is
 * correct for the author, and the sealed prose stays in `contentIndex.json` because it is
 * still rendered -- a solution is often the richest writing on a topic, and it has to be
 * findable. What keeps a search result from spoiling a problem is the excerpt, which is a
 * question for the search work and not for this file.
 *
 * ## What a defective Problem does
 *
 * It renders the sections it has, and validation raises an error.
 *
 * There is nothing better to do. A Problem with no `## Solution` is a note whose author
 * stopped halfway, and inventing a section for it, or refusing to render the prompt that is
 * there, would take the half they wrote away from the reader as well. So the page is
 * exactly what the vault says and the dev is told on the other channel -- the shape
 * `prepper/links` and `prepper/quiz` both use.
 *
 * The defects are recorded on the vfile here and reported by the rules in
 * `prepper/validation/rules/problems.ts`, for the reason `quizDefects` is: this transform is
 * the half of the build that decided what this Problem is and rendered it accordingly, and
 * a rule that read `kind` for itself could eventually disagree with the page.
 */
import { readFileSync } from "node:fs"

import { visit } from "unist-util-visit"
import type { Heading, List, Root, RootContent } from "mdast"
import type { Data } from "unist"
import type { VFile } from "vfile"

import type { QuartzTransformerPluginInstance } from "../../quartz/plugins/types"

import { typeOf } from "../note-type.ts"

/** The six sections the body contract names, in the order a Problem is written in. */
const sectionNames = [
  "Prompt",
  "Constraints",
  "Hints",
  "Solution",
  "Complexity",
  "Follow-ups",
] as const

type SectionName = (typeof sectionNames)[number]

/** The two that seal. Everything else the reader meets open. */
const sealedSections: readonly SectionName[] = ["Solution", "Complexity"]

/**
 * The three kinds, and what each requires. **Declared, never inferred**: it is the one
 * sub-classification the type-is-the-directory rule cannot read off a path, so a Problem
 * with no `kind` is a Problem the build does not know the shape of.
 */
const requiredByKind = {
  coding: ["Prompt", "Solution", "Complexity"],
  "system-design": ["Prompt", "Solution"],
  behavioural: ["Prompt", "Solution"],
} as const satisfies Record<string, readonly SectionName[]>

type ProblemKind = keyof typeof requiredByKind

const kinds = Object.keys(requiredByKind) as ProblemKind[]

/**
 * The three difficulties. Compared **only within a kind** -- a hard behavioural question is
 * not a hard graph problem -- which is why the rendered chip carries the kind it is scaled
 * by and never appears without it.
 */
const difficulties = ["easy", "medium", "hard"] as const

type Difficulty = (typeof difficulties)[number]

/**
 * Which rule reports a defect. Four, because they are four different mistakes: two words
 * from a closed vocabulary that the dev typed, a heading they did not write, and a list of
 * links that goes nowhere.
 */
export type ProblemDefectKind = "kind" | "difficulty" | "section" | "source"

/** One thing wrong with one Problem, as this transform found it. */
export interface ProblemDefect {
  kind: ProblemDefectKind
  /** One line, saying what is wrong with the note. No severity prefix, no note name. */
  message: string
}

declare module "vfile" {
  interface DataMap {
    /**
     * Everything wrong with this Problem, in the order the checks are written.
     *
     * Written here during the markdown phase, read by the problem validation rules in the
     * emitter phase -- the same arrangement as `quizDefects` and `unwrittenLinks`. Empty,
     * and absent, on every note that is not a Problem.
     */
    problemDefects: ProblemDefect[]
  }
}

export const manifest = {
  name: "prepper-problems",
  displayName: "Prepper problems",
  description: "Folds a Problem's body on its H2 headings and seals the solution with CSS.",
  version: "1.0.0",
  category: "transformer",
}

/**
 * What makes a Problem read as one thing to attempt and another to check afterwards.
 *
 * None of it seals anything. The seal is the `<details>` element, which is shut before any
 * of this loads; these rules only make a shut disclosure look like an invitation rather
 * than like a rendering bug. `list-style: none` takes the browser's own triangle off,
 * because the word beside it says the same thing in the vocabulary of the page.
 */
const problemStyles = `
.problem-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 1rem; }
.problem-kind, .problem-difficulty {
  border: 1px solid var(--lightgray);
  border-radius: 5px;
  padding: 0.1rem 0.5rem;
  font-size: 0.8rem;
  color: var(--darkgray);
}
.problem-sources { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 1.5rem; }
.problem-source {
  border: 1px solid var(--lightgray);
  border-radius: 5px;
  padding: 0.2rem 0.6rem;
}
.problem-source[data-attempt="true"] { border-color: var(--secondary); }
.problem-role { color: var(--darkgray); margin-right: 0.35rem; }
.problem-section > :first-child { margin-top: 0; }
.problem-seal {
  border: 1px solid var(--lightgray);
  border-radius: 5px;
  padding: 0 1rem;
  margin: 1.5rem 0;
}
.problem-seal > summary {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  cursor: pointer;
  list-style: none;
}
.problem-seal > summary::-webkit-details-marker { display: none; }
.problem-seal > summary > h2 { margin: 0.8rem 0; }
.problem-seal > summary::after { content: "Reveal"; color: var(--secondary); font-size: 0.8rem; }
.problem-seal[open] > summary::after { content: "Hide"; }
prepper-hint-ladder { display: block; }
.problem-hints { padding-left: 1.2rem; }
.problem-hint { margin: 0.4rem 0; }
.problem-hint-control {
  border: 1px solid var(--lightgray);
  border-radius: 5px;
  background: none;
  color: var(--secondary);
  font-family: inherit;
  font-size: 0.9rem;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
}
.problem-hint-control[disabled] { color: var(--gray); cursor: default; }
`

/**
 * The hint ladder's control, as the page will run it.
 *
 * Read off disk rather than written here as a string, so that the browser half is a real
 * `.js` file the editor, the formatter and the reader all treat as code. There is no build
 * step and nothing is bundled: what is in `hints.js` is what reaches the page.
 */
const hintLadderScript = readFileSync(new URL("hints.js", import.meta.url), "utf8")

const PrepperProblems = (): QuartzTransformerPluginInstance => ({
  name: "PrepperProblems",
  externalResources: () => ({
    css: [{ content: problemStyles, inline: true }],
    // `afterDOMReady`, so the ladder is in the document by the time the element is
    // registered; `spaPreserve`, so an SPA navigation does not tear the registration out
    // of the page and put a fresh copy back. Neither matters to the seal, which is shut
    // whether this script arrives, arrives late, or never arrives at all.
    js: [
      {
        script: hintLadderScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
        spaPreserve: true,
      },
    ],
  }),
  markdownPlugins() {
    return [
      () => (tree: Root, file: VFile) => {
        // Type is the directory, so this is the whole of "is this a Problem". A `##
        // Solution` written in a Lesson is a heading in a Lesson and nothing more.
        if (typeOf(file.data.relativePath ?? "") !== "problem") return

        const frontmatter = (file.data.frontmatter ?? {}) as Record<string, unknown>
        const defects: ProblemDefect[] = []

        const kind = declaredKind(frontmatter, defects)
        declaredDifficulty(frontmatter, defects)
        const chips = sourceChips(frontmatter, defects)

        const { preamble, parts } = fold(tree)
        // Only a Problem whose kind the build recognises has a required section list to be
        // judged against. With an unknown `kind` there is one line to fix and it is the
        // `kind` line; a list of sections derived from a guess at what the author meant
        // would be three more lines about a decision nobody has made yet.
        if (kind) requiredSections(kind, parts, defects)

        tree.children = [...meta(frontmatter, kind), ...chips, ...preamble, ...parts.map(rendered)]

        file.data.problemDefects = defects
      },
    ]
  },
})

/** One section of the body: its heading, what the contract calls it, and its blocks. */
interface Part {
  /** The H2 this section opened with. */
  heading: Heading
  /** The contract's name for it, or undefined for a heading the contract has none for. */
  name: SectionName | undefined
  /** Everything under the heading, up to the next one. The heading itself is not in here. */
  children: RootContent[]
}

/** A folded body: whatever was written above the first H2, and then the sections. */
interface Folded {
  preamble: RootContent[]
  parts: Part[]
}

/**
 * Cut the body into sections at each H2.
 *
 * Depth two only, and deliberately: an `### ` inside a solution is the author's own
 * structure, and folding on it would make a subsection into a section the seal could miss.
 * Anything written above the first H2 is not a section and is not made into one, because a
 * Problem with a sentence before `## Prompt` is a Problem whose author wrote a sentence
 * there, not one to be filed.
 */
function fold(tree: Root): Folded {
  const preamble: RootContent[] = []
  const parts: Part[] = []

  for (const child of tree.children) {
    if (child.type === "heading" && child.depth === 2) {
      parts.push({ heading: child, name: nameOf(textOf(child)), children: [] })
    } else {
      ;(parts.at(-1)?.children ?? preamble).push(child)
    }
  }

  return { preamble, parts }
}

/** The contract's name for a heading, matched on the words rather than on their casing. */
function nameOf(text: string): SectionName | undefined {
  const written = text.trim().toLowerCase()
  return sectionNames.find((name) => name.toLowerCase() === written)
}

/** One section, rendered as what it is: sealed, laddered, or simply itself. */
function rendered(part: Part): RootContent {
  const slug = slugOf(part.name ?? textOf(part.heading))
  const under = part.name === "Hints" ? ladder(part.children) : part.children
  const children =
    part.name && sealedSections.includes(part.name)
      ? [seal(part.heading, under)]
      : [part.heading, ...under]

  return element(
    "problemSection",
    "section",
    { className: ["problem-section"], "data-section": slug },
    children,
  )
}

/**
 * A sealed section: the heading is the control, the prose is behind it.
 *
 * The heading stays a real `h2` and stays in the document, so Quartz's table of contents
 * still lists the section and its permalink anchor still resolves -- a sealed section that
 * had quietly stopped being a heading would be a solution nobody could link to. `<summary>`
 * takes exactly one heading, which is what this is.
 */
function seal(heading: Heading, children: RootContent[]): RootContent {
  const summary = element(
    "problemSealSummary",
    "summary",
    { className: ["problem-seal-summary"] },
    [heading],
  )
  return element("problemSeal", "details", { className: ["problem-seal"] }, [summary, ...children])
}

/**
 * The hint ladder: the section's first list, one rung per **top-level** item.
 *
 * Numbered on the item rather than left to the list marker, because the rung number is what
 * `hints.js` counts and a nested bullet under hint two is part of hint two rather than a
 * rung of its own. The list's own `ordered` flag is left exactly as the author wrote it:
 * how the numbers *look* is theirs to decide, and the order is in the document either way.
 *
 * The whole section body goes inside a `<prepper-hint-ladder>`, which is what the browser
 * upgrades and what the control is appended to. A `## Hints` with no list gets no wrapper:
 * there is no ladder there, only prose, and an element with nothing to reveal would sit on
 * the page announcing a control it could not offer.
 */
function ladder(children: RootContent[]): RootContent[] {
  const list = children.find((child): child is List => child.type === "list")
  if (!list) return children

  hProperties(list, { className: ["problem-hints"] })
  list.children.forEach((item, index) => {
    hProperties(item, { className: ["problem-hint"], "data-hint": String(index + 1) })
  })

  return [element("problemHintLadder", "prepper-hint-ladder", {}, children)]
}

/**
 * The kind and difficulty chips.
 *
 * The difficulty carries the kind it is scaled by, in `data-kind`, so that a difficulty
 * never appears anywhere -- on the page or in anything reading the page -- without the kind
 * that gives it a meaning. Both are shown exactly as the dev declared them, an unrecognised
 * word included: the vocabulary error already says that word is not one of the three, and a
 * page that quietly showed something else would be a second, quieter account of the note.
 */
function meta(frontmatter: Record<string, unknown>, kind: ProblemKind | undefined): RootContent[] {
  const written = (field: string) => {
    const value = frontmatter[field]
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
  }

  const kindWord = written("kind")
  const difficultyWord = written("difficulty")
  if (!kindWord && !difficultyWord) return []

  const chips: RootContent[] = []
  if (kindWord) {
    chips.push(element("problemKind", "span", { className: ["problem-kind"] }, [text(kindWord)]))
  }
  if (difficultyWord) {
    chips.push(
      element(
        "problemDifficulty",
        "span",
        { className: ["problem-difficulty"], "data-kind": kind ?? kindWord },
        [text(difficultyWord)],
      ),
    )
  }

  return [element("problemMeta", "div", { className: ["problem-meta"] }, chips)]
}

/**
 * A pointer Problem's `source` list, as chips labelled by host.
 *
 * **Nothing is authored per link.** The label is the host with any `www.` taken off, which
 * is the word the dev already reads on every external problem -- "leetcode.com" says where
 * this goes more exactly than any sentence somebody would have to keep writing. The
 * **first** URL is the attempt link, because that is the click made most often, and it is
 * marked rather than merely first so that the page can say so out loud.
 *
 * Ordinary mdast links, so `crawl-links` marks them external and the rest of the pipeline
 * treats them as the links they are.
 *
 * An entry that is not a well-formed `http(s)` URL gets no chip: a chip has to be labelled
 * by a host, and one that went nowhere would be worse than the absence. Only a list with
 * **nothing** usable in it is shouted about, and the message says why -- one bad entry
 * beside two good ones still leaves the problem reachable, which is what the error is
 * about.
 */
function sourceChips(
  frontmatter: Record<string, unknown>,
  defects: ProblemDefect[],
): RootContent[] {
  if (frontmatter.source === undefined || frontmatter.source === null) return []

  const written = Array.isArray(frontmatter.source) ? frontmatter.source : [frontmatter.source]
  const urls = written.filter((entry): entry is string => typeof entry === "string").flatMap(hosted)

  if (urls.length === 0) {
    defects.push({
      kind: "source",
      message:
        "`source` holds no well-formed URL: the first one is the attempt link, and a " +
        "problem the reader cannot reach is not one",
    })
    return []
  }

  const chips = urls.map(
    ({ url, host }, index) =>
      ({
        type: "link",
        url,
        children: [
          ...(index === 0
            ? [element("problemRole", "span", { className: ["problem-role"] }, [text("Attempt")])]
            : []),
          element("problemHost", "span", { className: ["problem-host"] }, [text(host)]),
        ],
        data: {
          hProperties: {
            className: ["problem-source"],
            ...(index === 0 ? { "data-attempt": "true" } : {}),
          },
        },
      }) as unknown as RootContent,
  )

  return [element("problemSources", "div", { className: ["problem-sources"] }, chips)]
}

/** A `source` entry that is a URL a chip can be labelled by, or nothing. */
function hosted(entry: string): { url: string; host: string }[] {
  let parsed: URL
  try {
    parsed = new URL(entry.trim())
  } catch {
    return []
  }
  // http(s) only. A chip is labelled by its host, and a `mailto:` or a `file:` has none --
  // nor is it somewhere the dev goes to attempt a problem.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return []
  return [{ url: entry.trim(), host: parsed.hostname.replace(/^www\./, "") }]
}

/** The declared `kind`, or nothing plus a defect where the word is not one of the three. */
function declaredKind(
  frontmatter: Record<string, unknown>,
  defects: ProblemDefect[],
): ProblemKind | undefined {
  const written = frontmatter.kind
  // A missing `kind` is the schema rule's, not this one's: "no frontmatter `kind`" and
  // "`kind: ` is not a kind" are the same line of the same file said twice.
  if (written === undefined || written === null || written === "") return undefined
  if (typeof written === "string" && kinds.includes(written as ProblemKind)) {
    return written as ProblemKind
  }

  defects.push({
    kind: "kind",
    message:
      `\`kind: ${String(written)}\` is not a kind: the three are ${list(kinds)}, and a ` +
      "kind is declared rather than inferred",
  })
  return undefined
}

/** The declared `difficulty`, checked and otherwise unused: nothing here sorts by it. */
function declaredDifficulty(
  frontmatter: Record<string, unknown>,
  defects: ProblemDefect[],
): Difficulty | undefined {
  const written = frontmatter.difficulty
  if (written === undefined || written === null || written === "") return undefined
  if (typeof written === "string" && (difficulties as readonly string[]).includes(written)) {
    return written as Difficulty
  }

  defects.push({
    kind: "difficulty",
    message: `\`difficulty: ${String(written)}\` is not a difficulty: the three are ${list(difficulties)}`,
  })
  return undefined
}

/** Every section this kind requires and this body does not have, in contract order. */
function requiredSections(kind: ProblemKind, parts: Part[], defects: ProblemDefect[]) {
  const written = new Set(parts.map((part) => part.name))
  const required = requiredByKind[kind]

  for (const name of required) {
    if (written.has(name)) continue
    defects.push({
      kind: "section",
      message: `no \`## ${name}\`: a ${kind} problem is written under ${list(required.map((s) => `## ${s}`))}`,
    })
  }
}

/** `a`, `b` and `c` -- the vocabulary of a closed set, read out. */
function list(words: readonly string[]): string {
  const quoted = words.map((word) => `\`${word}\``)
  return quoted.length < 2
    ? (quoted[0] ?? "")
    : `${quoted.slice(0, -1).join(", ")} and ${quoted.at(-1)}`
}

/** How a heading reads, with any link or emphasis in it flattened to its words. */
function textOf(node: RootContent): string {
  let out = ""
  visit(node, (child) => {
    if ("value" in child && typeof child.value === "string") out += child.value
  })
  return out
}

/** A heading's name as an attribute: `Follow-ups` and `Notes to self` alike. */
function slugOf(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * A node that exists only to become one element.
 *
 * `data.hName` is Quartz's own pattern -- it is how `data-callout` reaches the page -- and
 * a node type nothing downstream has a handler for is what keeps the element from being
 * unwrapped on the way to hast, which is the trick `prepper/quiz` uses for the same reason.
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

function text(value: string): RootContent {
  return { type: "text", value } as RootContent
}

/** Carry properties through to the hast element an ordinary mdast node becomes. */
function hProperties(node: { data?: Data }, properties: Record<string, unknown>) {
  const data = (node.data ??= {}) as Record<string, unknown>
  data.hProperties = { ...((data.hProperties as object) ?? {}), ...properties }
}

export default PrepperProblems
