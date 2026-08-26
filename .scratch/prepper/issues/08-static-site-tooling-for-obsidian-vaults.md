# Static-site tooling for Obsidian vaults

Parent: [Prepper — wayfinder map](../map.md)
Type: research
Status: resolved
Blocked by: —

## Question

Which static-site tooling handles an Obsidian-style Markdown vault well, and what does each actually support?

Investigate against primary sources — official docs and source repositories, not blog round-ups.

Specifically:

- **Quartz** exists specifically to publish Obsidian vaults. What does it give for free (wikilink resolution, backlinks, graph view, frontmatter), and how extensible is it for custom fenced blocks and a bespoke practice UI?
- **Astro**, **Next.js static export**, and **Eleventy**: what wikilink support exists (native, plugin, or roll-your-own), and how each handles custom fenced code blocks rendered as interactive components.
- **Markdown pipeline.** What remark/rehype plugins cover `[[wikilinks]]`, backlink computation, and custom directives, and how mature they are.
- **Backlink computation.** Whether any of these compute a reverse link index at build, or whether that is always custom work.
- **Interactive islands.** How each framework mixes mostly-static content pages with interactive widgets (quiz components, review queue) without shipping a full client app.

Capture findings as a Markdown file with a source citation per claim, saved under `.scratch/prepper/research/`.

## Answer

Full findings with a source URL per claim: [`research/08-static-site-tooling.md`](../research/08-static-site-tooling.md). Summary:

- **Nothing computes a reverse backlink index natively.** Two plugins do it: Quartz's `Backlinks` component (a per-page linear scan over all files, not an index) and `@photogabble/eleventy-plugin-interlinker` (genuinely tracks backlinks). Astro and Next.js are fully custom. This is structural, not an ecosystem gap — unified/remark is per-file, and reverse indexing is a whole-corpus fold. **The backlink graph is custom work under every option.**
- **Quartz's real limit is interactivity, not extensibility.** Custom fenced blocks are easy (mermaid is a copyable ~15-line template), but its Preact components are server-rendered only, with no hydration step; interactivity is inline script strings run as IIFEs on a `nav` event. A spaced-repetition UI would be vanilla JS.
- **Quartz v5 is a re-architecture.** Plugins moved out of core into ~45 `@quartz-community/*` packages, all `0.1.x`–`0.2.x`; config moved to YAML. `package.json` says 5.0.0 but the newest tagged release is `v4.0.8` from 2023. Stability unverified.
- **The ```quiz fence needs no plugin anywhere.** A fence is already an mdast `code` node carrying `lang: "quiz"`. `remark-directive` (`:::quiz`) is a healthier package but renders as literal text in Obsidian, so fences win on vault compatibility. This confirms the ticket 03 direction.
- **The wikilink ecosystem is the weak link.** `remark-wiki-link` has 83k downloads/month against a repo untouched since Oct 2023. Two structural catches: it requires a `permalinks` array, forcing a two-pass build, and its alias syntax is `[[Page:Alias]]` with a **colon**, not Obsidian's pipe.
- **Eleventy is cut off from the remark ecosystem entirely** — it uses markdown-it. Its interlinker plugin is unusually complete but single-maintainer at ~680 downloads/month.
- **Next.js static export offers the least**: no content layer, frontmatter unsupported by `@next/mdx` by default, and a Turbopack restriction on non-serializable plugin options that collides directly with the wikilink plugin's `permalinks`/`pageResolver`.

Ten items could not be verified; three are decision-relevant: Quartz v5's stability, the wikilink alias-syntax mismatch, and — most important — **no first-party Astro documentation was found showing a rehype plugin emitting a custom element that an island then hydrates.** That path follows from documented primitives but is inference, and warrants a spike before Astro is chosen.

This ticket found facts; it did not pick a tool. The choice is ticket 11.
