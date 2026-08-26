# Library-to-Workshop embed rendering

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: —

## Question

When a Library note embeds a Workshop note — `![[some-research-note]]` inside a Lesson — does the build render the transclusion, or degrade it to the unclickable affordance a Library→Workshop *link* gets?

Three decisions collide here and none of them settles it:

- [How `/research` output lands in the vault](10-research-output-into-the-vault.md) ruled that a wikilink from Library content to a Workshop note **warns** and **renders as a marked, unclickable affordance**. It was written about links; an embed is also a wikilink.
- [Choose the build pipeline](11-choose-static-site-tooling.md) lifted the ban on `![[note]]` embeds with no rule replacing it, and named the consequence as an **accepted risk**: an embed publishes where a link only points, so a `![[research-note]]` in a Lesson leaks Workshop content "with nothing to catch it".
- [Vault validation rules](13-vault-validation-rules.md) observed that ticket 10's warning *does* catch it, since an embed is a wikilink — so the risk is warned, never blocked. That fixes the report line and deliberately leaves the **rendering** open.

To resolve:

- **Render or degrade.** If the embed degrades, ticket 11's accepted risk disappears entirely and the Workshop boundary is enforced by the build rather than by author discipline. If it renders, the warning is the only guard and the leak is real but visible.
- **Is the warning enough?** A warning that fires on every deliberate use trains the author to ignore it. If embedding research into a lesson is a thing the dev actually wants to do, warning is the wrong instrument and the question becomes what the *right* one is.
- **Does the reason for embedding matter?** Pulling a table out of a Research note into a Lesson is plausible authoring; the alternative is promoting that content to a Reference via `/author reference`, which ticket 10 already built as the deliberate promotion step. Whether the embed is a shortcut around promotion, or a legitimate second path, decides this.

## Answer

**Degrade — and it was never really a choice, because Quartz already degrades it for us.**

### The premise underneath ticket 11's accepted risk was wrong

[Ticket 11](11-choose-static-site-tooling.md) lifted the embed ban and booked the consequence as an accepted risk: "an embed publishes where a link only points, so a `![[research-note]]` in a Lesson leaks Workshop content with nothing to catch it." That sentence assumes the embed is resolved at build time, inlining the target's content into the embedding page.

It isn't. Quartz's non-media embeds are **client-side**: the transform emits a `<blockquote class="transclude" data-url="…">` placeholder, and a script in the browser fetches the target's *rendered page* and splices its HTML in — done client-side deliberately, to allow arbitrarily deep recursive transclusion. Sources: [Quartz docs](https://quartz.jzhao.xyz/), [DeepWiki — Obsidian Flavored Markdown](https://deepwiki.com/jackyzha0/quartz/3.1-obsidian-flavored-markdown). Not verified against a build; see *Carry-forward* below.

**Transclusion therefore requires the target to have a page.** Workshop notes have none, by [ticket 10](10-research-output-into-the-vault.md)'s definition of the class. So an embed cannot publish where a link only points — publication requires a page, and the leak ticket 11 accepted is not reachable. The fetch 404s and the reader gets an empty box.

This inverts the cost the same way ticket 11 found Quartz inverting the cost of banning embeds. **Rendering the transclusion is the expensive option**: it would mean emitting hidden pages for Workshop notes, or building build-time inlining Quartz does not do. Degrading is the default. The decision criterion for this ticket was *whatever is easiest for the LLM authoring notes and for the build*, and on that criterion the question answers itself.

### One rule for all of Workshop, no per-type carve-out

`research`, `record`, and `mission` are treated identically. [Ticket 10](10-research-output-into-the-vault.md) defined Workshop by **renderability, not subject matter**, precisely so that a Research note being *about* the subject does not earn it a page. A rule that let `research` embed but not Learner state would reintroduce the subject-matter axis through the back door and give one class two rulebooks — the failure mode [ticket 14](14-cheat-sheet-note-type.md) rejected when it declined to collapse Cheat sheet into Reference.

### Degrade loudly, and as an error

The free 404 degrades *badly*: silently, in the reader's browser, at read time. So the build catches it instead.

- **Render**: the Workshop-targeted embed is converted, at build, into the same marked, unclickable affordance [ticket 10](10-research-output-into-the-vault.md) gave a Library→Workshop *link*. This lands in the transform [ticket 17](17-quiz-fence-under-quartz.md) already places at order 25 — the embed arrives as a real `wikilink` mdast node with its embed flag intact, so it is a few lines in a plugin we are writing anyway, not a new component.
- **Severity**: **error**, where a Library→Workshop *link* stays a **warning**. The asymmetry is honest. A link pointing at Workshop is an authoring smell — a note that will be promoted, a pointer left deliberately. An embed targeting Workshop is **broken output**: it renders as nothing. And per the authoring rule below, no human hand writes one, so every occurrence is an agent bug or a stale link. A warning that nothing legitimate ever fires is an error wearing the wrong label.

CI is the only hard gate ([ticket 13](13-vault-validation-rules.md)), so the error costs a red build on a genuine defect and nothing else.

### The constraint lands on the skills, not on the dev

The dev does not hand-manage this. When a Lesson genuinely needs content that lives in a Research note, `author` has two sanctioned moves and a rule for picking between them:

- **Promote** — the material is looked up repeatedly and stands on its own (a table, an API surface, a comparison): `/author reference <research note>`, [ticket 10](10-research-output-into-the-vault.md)'s deliberate promotion step, and the Lesson links to the resulting Reference.
- **Write it in** — the material only supports the argument this Lesson is making: `author` writes it into the Lesson prose, in the Lesson's own words.

This is the Lesson/Reference boundary [CONTEXT.md](../../CONTEXT.md) already draws — "read roughly once" versus "looked up repeatedly" — so it introduces no new concept. It belongs in the FORMAT docs, where `author` reads it on every run, not in the validator. **Fragment promotion is not built**: `/author reference` stays whole-note, and a fragment that deserves a Reference of its own gets one.

Consequence: **`author` never emits a Library→Workshop embed**, and neither does `import`. The validator rule is the backstop for a stale link or an agent bug, not a workflow step.

### The rule is directional — the reverse is a deliberate non-rule

A **Workshop note embedding a Library note** — `![[Big-O]]` inside a Research note — is fine and stays unvalidated. Workshop never renders, so nothing can leak, and while authoring in Obsidian it is genuinely useful. Recorded in ticket 13's *Deliberately not validated* section rather than left unmentioned, the way ticket 14 recorded its three: the direction **is** the point, and a reader of the rule table should see that it was considered.

### Amends and appends

- **Amends [ticket 11](11-choose-static-site-tooling.md)**: its accepted risk is **withdrawn, not merely mitigated**. The risk was priced on a build-time-inlining model of embeds that Quartz does not implement.
- **Amends [CONTEXT.md](../../CONTEXT.md)**: the *Library* entry's "the one leak is the Embed", the *Workshop* entry's "though an Embed in a Library note will render Workshop content onto that page", and the *Embed* entry's "the discipline is the author's, not the build's" were all written on that same premise and are now false. Rewritten.
- **Appends to [ticket 13](13-vault-validation-rules.md)**: one error and one deliberate non-rule.

### Carry-forward

The client-side transclusion mechanism is cited from Quartz's docs, **not verified against a build**. It is load-bearing here in one specific way: if some Quartz version does inline embeds at build time, the leak ticket 11 accepted becomes real again and the *render* half of this decision (convert to the affordance) is what prevents it — the *error* half is unaffected either way. So this decision is robust to being wrong about the mechanism; only the reasoning for why it was cheap would change. Confirm it in the same build spike [ticket 17](17-quiz-fence-under-quartz.md) already demands for `self.parse()`.
