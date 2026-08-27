/**
 * Quiz rules: what a quiz fence has to be before the build will render one.
 *
 * All three are **errors**, and none of them re-reads the vault. `prepper/quiz` is the only
 * thing in the build that parses a fence body, and it records what it found wrong on the
 * vfile; these rules report that list. The alternative -- a rule that went looking for
 * fences in `note.source` itself -- would be a second reading, free to disagree with the
 * page the reader gets, which is the drift the whole validation design is arranged against.
 * It is the same arrangement `unwritten-link` uses, and for the same reason.
 *
 * Why errors, all of them. A defective fence is not rendered as a quiz: the transform
 * leaves it as the code block it was written as, so the reader meets prose where a question
 * was meant to be. That is a note that does not do what its author wrote it to do, which is
 * the line between the two severities -- unlike an unwritten link, there is no reading of
 * it under which the vault is as intended.
 *
 * Three rules rather than one, because they are three different mistakes with three
 * different fixes: a line the dev typed, a shape they built, and the note they put it in.
 */
import type { QuizDefectKind } from "../../quiz/index.ts"
import type { Finding, Rule } from "../rules.ts"
import type { Vault } from "../vault.ts"

/**
 * One rule per defect kind. The message is the transform's, verbatim: it is the half of the
 * build that knows which fence this was and what it was supposed to be, and rewording it
 * here would mean keeping two vocabularies for one fence in step.
 */
function reporting(name: string, kind: QuizDefectKind): Rule {
  return {
    name,
    check(vault: Vault): Finding[] {
      return vault.notes.flatMap((note) =>
        note.quizDefects
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

export const quizRules: Rule[] = [
  reporting("quiz-infostring", "infostring"),
  reporting("quiz-body", "body"),
  reporting("quiz-placement", "placement"),
]
