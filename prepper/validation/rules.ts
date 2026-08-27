/**
 * The rule module: every rule there is, and the one function that runs them all.
 *
 * A rule is a name and a function from the whole `Vault` to the violations it found. It
 * sees the entire corpus, because that is what makes one run enough: renaming one Term
 * must not mean one build run per note that referenced it.
 *
 * **Adding a rule** is adding a `Rule` to a file under `rules/` and listing it below.
 * Nothing else moves -- both consumers (the Quartz emitter in `index.ts` and the
 * `npm run validate` CLI in `validate.ts`) go through `validateVault`, so a rule added
 * here surfaces under `quartz build --serve` and gates CI at the same moment.
 *
 * Three things a rule must be:
 *
 * - **Total.** Collect every occurrence; never stop at the first. A rule that returns
 *   early hands the dev one violation per run.
 * - **Pure and order-free.** Same vault, same violations. Sorting is the reporter's job.
 * - **Blind to `draft`.** `draft: true` softens nothing; publication and validity are
 *   separate concerns.
 */
import type { Vault } from "./vault.ts"
import type { Violation } from "./violation.ts"
import { identityRules } from "./rules/identity.ts"
import { linkRules } from "./rules/links.ts"
import { schemaRules } from "./rules/schema.ts"

/** What a rule returns: a violation minus the rule's own name, which the runner fills in. */
export type Finding = Omit<Violation, "rule">

/** One checkable property of the vault. */
export interface Rule {
  /** How the rule is named in a report line, e.g. `filename-collision`. Kebab-case. */
  name: string
  /** Every violation of this rule in the whole vault. */
  check(vault: Vault): Finding[]
}

/**
 * Every rule, in reporting-neutral order.
 *
 * Schema and identity landed first, then links; the vocabulary, graph, and
 * Workshop-boundary rules join this list without reshaping anything around it.
 */
export const rules: Rule[] = [...schemaRules, ...identityRules, ...linkRules]

/**
 * Every violation in the vault, from every rule.
 *
 * A rule that throws is reported as a violation of itself rather than being allowed to
 * take the run down: a broken rule must not look like a clean vault, and must not stop
 * the other rules from being heard.
 */
export function validateVault(vault: Vault, ruleset: readonly Rule[] = rules): Violation[] {
  return ruleset.flatMap((rule) => {
    try {
      return rule.check(vault).map((violation) => ({ ...violation, rule: rule.name }))
    } catch (err) {
      return [
        {
          rule: rule.name,
          severity: "error" as const,
          message: `the rule itself failed to run: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]
    }
  })
}
