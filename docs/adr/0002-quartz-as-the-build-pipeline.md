# Quartz as the build pipeline

Prepper's repo is a clone of [Quartz](https://github.com/jackyzha0/quartz) with `content/` inside it, rather than a static-site generator written for this vault. The alternative — a bespoke generator in Go or Rust — was seriously considered and was the stronger option right up until the interactive surface collapsed: research had priced Quartz's lack of client-side hydration against a spaced-repetition queue and practice UI that [the spaced-repetition decision](../../.scratch/prepper/issues/05-spaced-repetition-model.md) subsequently deleted. What remains in the browser is grade-a-quiz-on-click, unseal a section, and reveal a hint — all of which Quartz's inline-script model handles — while everything genuinely hard (the whole-corpus backlink fold, wikilink resolution rules, vault validation) was custom work under *every* option, and Quartz alone provides a documented seam for it in its corpus-reducing emitters.

## Consequences

- **Upstream is a git remote, not a snapshot.** Quartz releases are merged in periodically, so our code lives in our own plugin files and config and never as edits to Quartz's. Divergence is a maintenance cost we are deliberately not taking on.
- **Quartz's client runtime ships on every page**, including prose pages that need no JS. This contradicts the otherwise-strict "no framework in the browser" rule, which now reads "no framework *of ours*". Our own interactivity is hand-written custom elements with no build step.
- **We inherit features the vault had ruled out.** Note embeds and block references were hard build errors under the bespoke plan; under Quartz, banning them costs more than allowing them, so the bans were lifted. The accepted risk: an `![[research-note]]` embed inside a Lesson publishes Workshop content into the Library and nothing catches it.
- **Search and graph view become configuration questions rather than build questions**, since Quartz ships both.

## Amendment — the embed risk was priced on the wrong mechanism

The third consequence above books an accepted risk: "an `![[research-note]]` embed inside a Lesson publishes Workshop content into the Library and nothing catches it." [Library-to-Workshop embed rendering](../../.scratch/prepper/issues/18-library-to-workshop-embed-rendering.md) **withdraws it**.

Quartz resolves non-media embeds **client-side** — it emits a placeholder carrying the target slug, and a script in the browser fetches that target's *rendered page* and splices it in. Publication therefore requires the target to have a page, and a Workshop note has none by construction. The embed cannot leak; it fetches nothing and renders as an empty box. The build now converts that box into the marked, unclickable affordance a Library→Workshop link already gets, and makes the occurrence a validation error.

Lifting the embed ban remains correct, and it remains correct that no rule replaced it: the rule that now exists guards the **Workshop boundary**, not embeds as a syntax. Block references are untouched and stay out by convention.
