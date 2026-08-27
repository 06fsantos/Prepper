/**
 * Problem rules: what a Problem has to be before it is a problem the dev can attempt.
 *
 * All four are **errors**, and none of them reads the vault a second time. `prepper/problems`
 * is the half of the build that folded this body and decided what to seal, and it records
 * what it found wrong on the vfile; these rules report that list. A rule that read `kind`
 * out of the frontmatter for itself would be a second reading, free to disagree with the
 * page the reader gets -- the drift the whole validation design is arranged against, and
 * the same arrangement the quiz and unwritten-link rules use.
 *
 * Why errors, all of them. A Problem with an unknown `kind` is a Problem whose required
 * sections nothing can check; one missing a required H2 is a note that does not do what its
 * author wrote it to do; one whose `source` list holds no URL is a pointer to a problem
 * nobody can reach. None of the four has a reading under which the vault is as intended,
 * which is the line between the two severities.
 *
 * Four rules rather than one, because they are four different mistakes with four different
 * fixes: two words from a closed vocabulary, a heading that was never written, and a list
 * of links that goes nowhere.
 */
import type { ProblemDefectKind } from "../../problems/index.ts"
import type { Finding, Rule } from "../rules.ts"
import type { Vault } from "../vault.ts"

/**
 * One rule per defect kind. The message is the transform's, verbatim, for the reason the
 * quiz rules keep theirs: it is the half of the build that knows what this Problem was
 * supposed to be, and rewording it here would mean keeping two vocabularies in step.
 */
function reporting(name: string, kind: ProblemDefectKind): Rule {
  return {
    name,
    check(vault: Vault): Finding[] {
      return vault.notes.flatMap((note) =>
        note.problemDefects
          .filter((defect) => defect.kind === kind)
          .map((defect): Finding => ({
            severity: "error",
            note: note.path,
            message: defect.message,
          })),
      )
    },
  }
}

export const problemRules: Rule[] = [
  reporting("problem-kind", "kind"),
  reporting("problem-difficulty", "difficulty"),
  reporting("problem-section", "section"),
  reporting("problem-source", "source"),
]
