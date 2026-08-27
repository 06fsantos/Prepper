/**
 * Link rules: what a body wikilink is allowed to point at.
 *
 * There is one here, and it is the first rule in the spine that **warns** rather than
 * erring. An unwritten link -- a body wikilink whose target does not exist -- is
 * legitimate authoring practice: it marks intent, the reading surface doubles as a todo
 * list, and a gap surfaces where the dev noticed it. So it is a fact worth saying and
 * never a fact worth failing a build over, which is exactly the line between the two
 * severities.
 *
 * What this rule does **not** cover, deliberately: a missing `prerequisites` or `topic`
 * target. Those are frontmatter, they are errors, and they belong to the vocabulary
 * rules. The distinction is the domain's, not an implementation detail -- an unwritten
 * link is a sentence the dev has not written yet, a broken `topic` is a note filed under
 * something that does not exist.
 */
import type { Finding, Rule } from "../rules.ts"
import type { Vault } from "../vault.ts"

const unwrittenLink: Rule = {
  name: "unwritten-link",
  check(vault: Vault): Finding[] {
    return vault.notes.flatMap((note) =>
      // `unwrittenLinks` is what the build itself resolved and found nothing for, so
      // this rule reads a decision rather than repeating it. It is already deduplicated
      // per note: pointing at one gap three times is one gap, and three identical lines
      // would say nothing the first did not.
      note.unwrittenLinks.map((target): Finding => ({
        severity: "warning",
        // The target is the slug the build resolved to, not the text the author typed --
        // `[[Hash-Maps]]`, `[[hash-maps.md]]` and `[hash maps](./hash-maps.md)` all
        // arrive here as `hash-maps`. So the message names the *note that is missing*
        // rather than quoting a wikilink back, which for anything but the plainest
        // spelling would be a quotation the dev could not find in the file.
        note: note.path,
        message: `unwritten link to \`${target}\`: nothing in the vault answers to that name yet`,
      })),
    )
  },
}

export const linkRules: Rule[] = [unwrittenLink]
