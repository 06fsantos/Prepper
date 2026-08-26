# Choose the build pipeline: framework or custom generator, and in what language

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 02, 03, 12

## Question

What builds this app — an existing static-site framework or a generator written from scratch — and in what language?

**Scope correction.** The research in [Static-site tooling for Obsidian vaults](08-static-site-tooling-for-obsidian-vaults.md) surveyed only the JavaScript ecosystem (Quartz, Astro, Next.js, Eleventy). That scoping was an unexamined assumption in the research brief, not a decision anyone made. The language and runtime for this app are **open**.

## The split that makes this two decisions

- **The build-time generator** is language-free. It walks `content/`, parses frontmatter, builds a corpus index, resolves wikilinks against it, folds the reverse backlink index, and emits HTML. Nothing about this choice reaches the browser.
- **The client-side interactive surface** — quiz blocks (ticket 03), review queue (ticket 05), page chrome (ticket 04) — runs in a browser, so it is JS/TS unless WASM (Leptos, Dioxus, Yew) is deliberately chosen.

These can be decided independently. Choosing Rust for the generator does not imply Rust in the browser.

## What the research already settled

- **No framework computes a backlink index natively.** It is a whole-corpus fold, structurally outside per-file pipelines like remark. This is custom work under *every* option — which removes the strongest reason to adopt a vault framework, and correspondingly raises the standing of a hand-written generator.
- **The ```quiz fence needs no plugin anywhere** — a fence is already a parsed node carrying its language tag. True of any CommonMark parser, not just remark.
- **Quartz** gives the most vault machinery free but server-renders only (no hydration; interactivity is inline script strings run as IIFEs). Its v5 re-architecture split plugins into ~45 `@quartz-community/*` packages at `0.1.x`–`0.2.x`, with the newest tagged release predating the split — stability unverified.
- **`remark-wiki-link`** is stale (repo untouched since Oct 2023) and its alias syntax uses a colon rather than Obsidian's pipe.

## To resolve

- **Framework or custom?** Given the backlink fold is custom regardless, quantify what a framework actually still buys: templating, asset pipeline, dev server, incremental rebuild. Weigh against carrying a dependency whose conventions fight the vault's.
- **Generator language.** If custom: Rust (`pulldown-cmark` — CommonMark, used by rustdoc; `comrak` — cmark-gfm port with GFM extensions; Zola as an existing Rust SSG worth studying), Go, Python, or TypeScript. Verify the wikilink and frontmatter story in whichever leads — none of these libraries were covered by the existing research.
- **Client-side approach.** Plain JS/TS with light components, a framework's island model, or WASM. Driven by how much interactive surface tickets 03–05 actually produce.
- **Authoring loop.** Whichever option wins has to make "run the skill, commit, see it rendered" fast. A slow or fiddly rebuild will quietly kill the habit this whole app exists to support.
- **Whether more research is needed.** The non-JS field is entirely uninvestigated. This ticket may spawn a second research ticket before it can be answered.

## Context from the non-JS research

[Markdown generator tooling in Rust, Go, Python, and Java](12-non-js-generator-languages.md) closed the other half of the field. It reframes this ticket:

- **The decision is no longer "which framework" but "adopt or build".** Every non-JS path is bespoke — no SSG in Rust, Go, Python, or Java clears the bar. So the real fork is **Quartz (the only genuine adoption option anywhere) vs a generator written from scratch in whatever language**, with Astro sitting in between as compose-your-own within JS.
- **If bespoke wins, Rust has a concrete edge**: it is the only ecosystem whose parsers natively understand Obsidian wikilinks, with Obsidian's exact pipe-alias order — solving by default the compatibility problem `remark-wiki-link` creates.
- **But Go is estimated the lowest-effort bespoke path**, and only Hugo ships an in-process bundler; every other bespoke route shells out to Node for the client bundle regardless, which erodes much of the reason to leave JS in the first place.
- **Two verification gates before deciding:** test whether `comrak`/`pulldown-cmark` cover `[[Note#Heading]]`, block refs, and `![[embeds]]` before choosing Rust; and confirm rather than assume that Hugo cannot load third-party goldmark extensions — that finding is inference from a closed config surface, not a documented denial.

## Constraint added by ticket 02

[Wikilink resolution and backlink graph rules](02-wikilink-resolution-and-backlink-graph.md) settled that **aliases use Obsidian's pipe syntax** (`[[lru-cache|LRU eviction]]`). `remark-wiki-link` ships colon syntax, which renders as literal text in Obsidian and breaks the premise of this map, so it is rejected as-shipped.

**Any candidate tooling must accept a custom wikilink parser.** This is not new cost — ticket 12 already found every non-JS path bespoke, and ticket 08 found the backlink index is custom work under every option — but it removes "just use the plugin" from the Quartz/Astro comparison.

Also required of the build, from ticket 02: case-insensitive filename resolution with a case-only-collision error, heading anchors, attachment embeds, a loud failure on `![[note]]` and block references, a whole-vault reverse index carrying placeholder nodes for unwritten links, and DAG validation over the prerequisite graph.

## Answer

**Quartz builds Prepper.** Adopt, do not build. The repo becomes a Quartz clone with `content/` inside it — which is already Quartz's default content directory, so [CONTEXT.md](../../../CONTEXT.md)'s layout is unchanged. Language is TypeScript by consequence, not by choice; it was never decided on its merits, because adopting settled it.

### What changed the terms of this decision

Both research files were written before [Spaced-repetition model](05-spaced-repetition-model.md), and **05 invalidated the axis they both turned on**. Each weighed the spaced-repetition queue and practice UI as the load-bearing client-side surface — Quartz's disqualifying weakness (no hydration) and Astro's entire justification (islands). That surface no longer exists. What remains in the browser, per the prototypes and tickets 03/04/06: grade-a-quiz-on-click (**8 lines** in the [lesson prototype](../prototypes/04-lesson-page.html)), unseal a section, reveal the next hint, a sidebar tree, search. No state, no persistence, no routing.

So the comparison was re-run on the real surface:

- **Quartz's fatal flaw was priced against a queue that no longer exists.** Its no-hydration model — interactivity as inline scripts on the `nav` event — is a fine fit for grade-on-click and unseal.
- **Astro's advantage was islands.** With nothing to hydrate, what remained was Zod-validated content collections, which validate one frontmatter object at a time — the easy fifth of [Vault validation rules](13-vault-validation-rules.md), whose hard rules (DAG, case collisions, unwritten-link ranking) are whole-corpus and sit above any per-file pipeline.
- **The research's case against leaving JS collapsed too** — "you'll shell out to esbuild anyway" (nothing to bundle) and "islands make the interactive surface natural" (no islands). The field was genuinely open, and the choice was made on adoption value rather than by default.

### Two facts checked in this session

- **The v5 instability worry was overweighted, by the research and by me.** The docs present v5 as *the* Quartz: `git clone`, `npm i`, `npx quartz create`, `npx quartz build --serve`, with `npx quartz plugin install --from-config` managing the `@quartz-community/*` split. No v4-vs-v5 choice is put to users. The stale `v4.0.8` tag (2023-08-21) is an un-updated release tag on a repo whose default branch is `v5`, pushed 2026-08-18, 13,095 stars, 60 open issues. — `https://api.github.com/repos/jackyzha0/quartz`, `/releases/latest`, `https://quartz.jzhao.xyz/`
- **Quartz has the seam this map's hardest requirement needs, and neither research file found it.** Emitters *reduce over the entire corpus*: `emit(ctx, content: ProcessedContent[], resources)`, with an optional `partialEmit(ctx, content, resources, changeEvents)` for incremental rebuilds. That is where [ticket 02](02-wikilink-resolution-and-backlink-graph.md)'s backlink fold and ticket 13's graph-level validation belong. Both research files said no framework computes backlinks natively; true, but Quartz gives you the documented place to do it. — `https://quartz.jzhao.xyz/advanced/making-plugins`

### The decisions

1. **Adopt Quartz.** Everything genuinely load-bearing — the backlink fold, the wikilink rules, the validation set, the sealed-section split on named H2s — is custom under every option. Quartz is the only one that also hands over search, a graph view, backlinks, popovers, and an incremental dev server.
2. **No framework or bundler of *ours* in the browser.** Our own interactivity is hand-written custom elements, one file per behaviour, no build step. Quartz's own client runtime (SPA router, popovers) is **accepted** — it ships JS on every page including prose pages, and that fixed baseline is the price of adoption. Disabling the SPA router is a config question, unverified.
3. **The authoring loop is `npx quartz build --serve`.** Watch, rebuild, refresh — Q5's tier (b) — and incremental for free via `partialEmit` rather than the ~40 hand-written lines a bespoke path needed.
4. **Upstream stays a git remote.** Quartz releases get merged in periodically, and our code lives in **our own plugin files and config, never as edits to Quartz's** — the same instinct that made [ticket 09](09-fork-teach-to-emit-markdown.md) build `author` as a sibling skill rather than editing vendored `teach`.
5. **Corpus folds go in emitters, per-file work in transformers.** The named seam for each half of the build.

### Amendment to ticket 02: the embed and block-reference bans are lifted

[Ticket 02](02-wikilink-resolution-and-backlink-graph.md) banned note embeds (`![[note]]`) and block references (`[[note#^abc]]`) as **hard build errors**. Both bans are lifted, and **no rule replaces them**.

Ticket 02 gave two reasons for the embed ban. **One was already dead**: "what backlinks and reading progress mean for content appearing twice" — [ticket 05](05-spaced-repetition-model.md) deleted reading progress and all per-user state, so there is nothing for duplicated content to corrupt. What survived was backlink ambiguity alone.

And **the cost calculus inverted with the tooling**. Under a bespoke generator, supporting transclusion was work and banning it was free. Under Quartz, supporting it is free and *banning* it is the work — a detector plugin written purely to switch off a feature we adopted Quartz to get.

**The accepted risk, recorded deliberately.** [Ticket 10](10-research-output-into-the-vault.md) made a Library→Workshop *wikilink* a warning, because a link only points. **An embed does not point, it publishes.** A single `![[some-research-note]]` inside a Lesson renders Workshop content — dead ends, ruled-out options — into the built site, and nothing catches it but reading the result. A targeted Library-embeds-Workshop error was offered and **declined in favour of no rules at all**. If a leak ever happens, that error is the fix.

**Block references stay out by convention, not by build error.** Quartz supports them; nothing enforces their absence; they simply are not typed. The reasons are their own rather than by association with embeds: Obsidian sprays generated `^a1b2c3` ids into Markdown the dev reads daily, and a block ref is the one link target that breaks *silently* when the paragraph around it is edited. [ADR 0001](../../../docs/adr/0001-split-note-identity.md) already gives blocks durable identity where it is actually needed — the quiz ULID.

**Consequence for [Vault validation rules](13-vault-validation-rules.md)**: it loses both syntax-policing errors and gains none. Every rule it still owns is about *structure* — resolution, uniqueness, cycles, required fields — and none about which Obsidian syntax is permitted. Also **the edge-ownership rule is not needed**, since no embed semantics are being specified at all.

### No further research is needed — and that is not a coincidence

This ticket named two verification gates that had to clear before deciding: whether `comrak`/`pulldown-cmark` handle `[[Note#Heading]]`, and whether Hugo can load third-party goldmark extensions. **Both dissolve**, because neither Rust nor Hugo is chosen. Adopting Quartz was the only option on the board committable without spawning a research ticket ahead of it.

**But it opens one new risk, and it is load-bearing.** [Quiz block schema](03-quiz-block-schema.md) requires the ```` ```quiz ```` fence body to be **re-parsed as Markdown with the wikilink transform running inside it**, and stated explicitly that "a raw-string fence handler is not enough". Quartz's reference implementation for a custom fence is mermaid, which treats the fence body as an opaque string. Whether a Quartz transformer can re-parse a fence body as Markdown *and* have wikilink resolution run inside it is **unverified**, and it is the assumption this whole choice rests on. Ticketed as [Quiz fence re-parsing under Quartz](17-quiz-fence-under-quartz.md).

### Tickets this reframes but does not resolve

- **[Vault search](15-vault-search.md)** — Quartz ships search. The question becomes "does Quartz's do what we want, and can its index be scoped to Library content", not "what do we build". Its "tooling consequence for ticket 11" bullet is discharged: 11 went first, so 15 inherits the choice and decides scope only.
- **Graph view** (fog) — Quartz ships `@quartz-community/graph`, fed by `contentIndex.json`. Same reframing.
- **Mermaid fences in lessons** (fog) — **dissolved**. Quartz ships mermaid; the fog patch existed only because it hung on this ticket.
- **Preview build on authoring** (fog) — **dissolved**. With `quartz build --serve` running as a watch process, an `/author` run's output appears without a build step to trigger.
- **[Vault structure and note schema](01-vault-structure-and-note-schema.md)** — Quartz's frontmatter is untyped, so ticket 01's fields (`id`, `topic`, `prerequisites`, `practices`, `kind`, `difficulty`, `source`) pass through. Worth noting that Quartz owns `draft`, which gives [ticket 09](09-fork-teach-to-emit-markdown.md)'s "the skill never sets `draft`" a concrete meaning it did not have when it was written.

Recorded as [ADR 0002](../../../docs/adr/0002-quartz-as-the-build-pipeline.md).

## Amended by ticket 18

[Library-to-Workshop embed rendering](18-library-to-workshop-embed-rendering.md) **withdraws this ticket's accepted risk** — the `![[research-note]]` leak — rather than mitigating it.

The risk was priced on the assumption that an embed is resolved at build time, inlining the target's content into the embedding page ("an embed publishes where a link only points"). Quartz resolves non-media embeds **client-side**, by fetching the target's rendered page. A Workshop note has no page, so the transclusion cannot publish anything; it fetches nothing and renders as an empty box. Ticket 18 converts that box into ticket 10's marked affordance at build and makes the occurrence an error.

The rest of this ticket is untouched: lifting the embed ban was still correct, and it is still correct that no rule replaced it — the rule ticket 18 adds is about the Workshop **boundary**, not about embeds as a syntax.
