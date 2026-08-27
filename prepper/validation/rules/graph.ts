/**
 * Graph rules: the one property the prerequisite graph has to have.
 *
 * `prerequisites` describes a reading order, and a reading order with a loop is not one.
 * `a` requires `b` requires `a` is a pair of Lessons each of which has to be read first,
 * which is not a strong claim to fix later -- it is a claim with no meaning, and the dev
 * wrote it by accident, usually one field at a time over several sittings.
 *
 * **The message names the whole cycle.** That is the entire reason this rule is worth
 * having: `a -> b -> c -> a` is findable, "there is a cycle" is a hunt through every
 * `prerequisites` field in the vault. A loop of two is obvious once seen and nearly
 * invisible until then; a loop of five is neither.
 *
 * Being a DAG is checked, and being **connected**, **shallow**, or **complete** is not.
 * A Lesson with no prerequisites is a starting point, not a defect, and a chain fifteen
 * deep is a curriculum rather than a smell.
 *
 * ## Why the cycle is read from frontmatter and not from the link graph
 *
 * A rule reads `Vault` and nothing else, and that is not a technicality here. The link
 * graph drops a self-edge -- a note naming itself is not a link that can render -- so
 * `prerequisites: [itself]`, which is the single most common way to write a cycle, is
 * exactly the case the graph cannot see. The frontmatter still says it.
 */
import type { Finding, Rule } from "../rules.ts"
import type { Note, Vault } from "../vault.ts"
import { stemOf, targets } from "../../link-targets.ts"

/**
 * Every cycle in the prerequisite graph, each as the path that closes it.
 *
 * Depth-first, carrying the stack, which is what makes the *path* available rather than
 * only the fact. A cycle is recorded once however many of its members it is reached from:
 * the same loop reported five times, once per Lesson in it, would be five copies of one
 * sentence. Rotating each to start at its smallest member is what makes "the same loop"
 * decidable and the report a function of the vault rather than of the walk order.
 */
function cycles(edges: Map<string, string[]>): string[][] {
  const found = new Map<string, string[]>()
  const done = new Set<string>()
  const onStack = new Set<string>()
  const stack: string[] = []

  const walk = (node: string) => {
    if (done.has(node)) return
    if (onStack.has(node)) {
      const cycle = stack.slice(stack.indexOf(node))
      const key = canonical(cycle)
      if (!found.has(key)) found.set(key, cycle)
      return
    }

    onStack.add(node)
    stack.push(node)
    for (const next of edges.get(node) ?? []) walk(next)
    stack.pop()
    onStack.delete(node)
    done.add(node)
  }

  for (const node of [...edges.keys()].sort()) walk(node)

  return [...found.keys()].sort().map((key) => found.get(key)!)
}

/** One cycle's identity: the same loop entered at any point rotates to the same string. */
function canonical(cycle: string[]): string {
  const start = cycle.indexOf([...cycle].sort()[0])
  return [...cycle.slice(start), ...cycle.slice(0, start)].join(" -> ")
}

const prerequisiteDag: Rule = {
  name: "prerequisite-cycle",
  check(vault: Vault): Finding[] {
    const stems = new Map<string, Note>()
    for (const note of vault.notes) stems.set(stemOf(note.path), note)

    // Only edges between notes that exist. A `prerequisites` target naming nothing is
    // already an error of its own (`prerequisite-target`), and letting it in here would
    // report a second, stranger violation about the same typo.
    const edges = new Map<string, string[]>()
    for (const note of vault.notes) {
      const from = stemOf(note.path)
      edges.set(
        from,
        targets(note.frontmatter.prerequisites)
          .map((target) => target.stem)
          .filter((stem) => stems.has(stem)),
      )
    }

    return cycles(edges).map((cycle): Finding => {
      const path = [...cycle, cycle[0]].map((stem) => stems.get(stem)!.path)
      return {
        severity: "error",
        // Vault-wide: every note in the loop is equally the culprit, and pinning it on
        // one would send the dev to edit whichever happened to sort first.
        message:
          cycle.length === 1
            ? `\`${path[0]}\` lists itself as a prerequisite`
            : `prerequisite cycle: ${path.join(" -> ")}`,
      }
    })
  },
}

export const graphRules: Rule[] = [prerequisiteDag]
