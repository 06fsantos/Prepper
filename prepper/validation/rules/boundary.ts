/**
 * The Workshop boundary rules: what Library content may say about a note the reader
 * never sees.
 *
 * The two rules here are the same crossing at two severities, and the asymmetry is the
 * whole content of the boundary. A Library note **linking** a Workshop note warns: the
 * target is written, it is in the vault, Obsidian opens it, and the only thing wrong is
 * that the reader cannot follow it. A Library note **embedding** one errs: a link at
 * one's own reading notes can be deliberate -- *my reasoning is written up over there* --
 * and an embed never is, because an embed says *show this here* of something that will
 * not be shown.
 *
 * Neither shares a line with an unwritten link, and that is the point of them existing
 * separately rather than as a broader "link goes nowhere" rule. "Nothing answers to that
 * name" and "it is written and the reader cannot reach it" are different facts, they take
 * different actions, and merging them would send the dev off to write a note they have
 * already written.
 *
 * Both read a decision `prepper/links` already made while degrading the link in the page.
 * The rule never resolves anything itself, for the same reason no rule in the spine does:
 * a rule that resolved links could disagree with the build about which links resolved.
 */
import type { Finding, Rule } from "../rules.ts"
import type { Vault } from "../vault.ts"

const workshopLink: Rule = {
  name: "workshop-link",
  check(vault: Vault): Finding[] {
    return vault.notes.flatMap((note) =>
      note.workshopLinks.map((target): Finding => ({
        severity: "warning",
        note: note.path,
        message: `link to \`${target}\`, which is in the vault and not in the app: the reader cannot follow it`,
      })),
    )
  },
}

const workshopEmbed: Rule = {
  name: "workshop-embed",
  check(vault: Vault): Finding[] {
    return vault.notes.flatMap((note) =>
      note.workshopEmbeds.map((target): Finding => ({
        severity: "error",
        note: note.path,
        message: `embed of \`${target}\`, which is in the vault and not in the app: nothing would be shown here`,
      })),
    )
  },
}

export const boundaryRules: Rule[] = [workshopLink, workshopEmbed]
