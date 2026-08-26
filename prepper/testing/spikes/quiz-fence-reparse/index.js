/**
 * Spike plugin — mechanism 1: a quiz fence body re-parsed with `self.parse()`.
 *
 * This is **not** the quiz transform. It is the smallest thing that can answer one
 * question: does re-parsing a fence body on the frozen processor yield real `wikilink`
 * mdast nodes that Quartz's own downstream transforms then resolve into links?
 *
 * It therefore does no validation, reads no infostring beyond splitting it, and handles
 * no question types. Ticket 09 owns the real transform; this file exists so that ticket
 * can be written against a mechanism that has been run rather than read.
 *
 * Registered only by `prepper/testing/spike-build.ts`, never by `quartz.config.yaml`.
 */
import { visit, SKIP } from "unist-util-visit"

export default function QuizFenceReparseSpike() {
  return {
    name: "QuizFenceReparseSpike",
    markdownPlugins() {
      return [
        function () {
          // `this` is the frozen processor, carrying every micromark extension every
          // plugin registered -- wikilinks included, whatever our own order is.
          const processor = this
          return (tree) => {
            visit(tree, "code", (node, index, parent) => {
              if (node.lang !== "quiz" || !parent || index === undefined) return
              const [id = "", type = "mcq"] = (node.meta ?? "").trim().split(/\s+/)

              const subtree = processor.parse(node.value)
              // Offsets in the subtree point into the fence body, not the file, and
              // remark-obsidian's task-char transform slices the file with them.
              visit(subtree, (child) => {
                delete child.position
              })

              parent.children[index] = {
                type: "quiz",
                data: {
                  hName: "div",
                  hProperties: {
                    className: ["quiz"],
                    "data-quiz-id": id,
                    "data-quiz-type": type,
                  },
                },
                children: subtree.children,
              }
              return SKIP
            })
          }
        },
      ]
    },
  }
}
