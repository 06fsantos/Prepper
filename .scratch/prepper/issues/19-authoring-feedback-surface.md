# Authoring feedback surface

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 02, 13, 14

## Question

Where do the **reports** — the facts about the vault that are not validation failures — reach the dev, and in what form?

[Vault validation rules](13-vault-validation-rules.md) fixed the *validation* channel (terminal, grouped by note, `path:line`, severity-prefixed, exit non-zero; CI is the hard gate) and then deliberately **split the reports off it**, on the grounds that nothing is wrong when a report prints. That split is what left this open rather than pre-decided. Three items are now known to belong to the report channel:

- **The unwritten-note ranking** — [ticket 02](02-wikilink-resolution-and-backlink-graph.md) carries unwritten links as placeholder nodes so notes can be ranked by inbound links. [Ticket 06](06-problem-bank-note-format.md) made this load-bearing: `practices` is required but an unwritten link satisfies it, so this ranking *is* the authoring queue.
- **The empty-`term` backlog** — [ticket 14](14-cheat-sheet-note-type.md) ruled this out as a validation rule, because `author` mints Terms the moment a topic is first used, ahead of anyone having prose for them.
- **The vault-hygiene facts** — ticket 13's *Deliberately not validated* set: unreferenced attachments, Terms nothing points at, Library notes with no inbound links. None is a defect; each is a thing the dev might want to see.

To resolve:

- **The surface.** Terminal output from a `npm run report`-ish command, a page in the built app, or a generated note written back into the vault? Each has a different failure mode: terminal output is invisible unless invoked, an app page is a Library page that is not Library content, and a generated note is the only option that is *editable by the thing it reports on*.
- **If it is a page**: does it live in the app's chrome (alongside the Cheat sheets list, ticket 14) or is it a route the reader never sees? The app has one reader, who is also the author, so the Library/Workshop boundary is about *rendering discipline*, not access control — which cuts both ways.
- **If it is a note**: which class does it belong to, and who owns it? It would be the first vault note written by the *build* rather than by `author` or the dev, which is a new category. [Ticket 10](10-research-output-into-the-vault.md)'s Workshop is the obvious home, but Workshop is currently defined as the dev's own side of the vault.
- **When it runs.** Every build, or on demand? Ticket 13 put validation on every build and gated CI on it; a report that recomputes on every build but that nobody reads is cost with no signal.
- **Is it one report or three?** The three items above have different audiences in time: the authoring queue answers "what next", the hygiene facts answer "what rotted". One artifact with sections, or separate ones with separate triggers.

Nothing here changes the validator: ticket 13's policy is settled and this ticket must not reopen it.

## Answer

**A build-emitted page called the Vault report, at `/report`, with two sections — and the thing that decides almost every sub-question is that it is emitter output rather than a note.**

### The surface: a page, because the other two options fail on mechanism, not taste

The ticket offered terminal / app page / vault note as three options with three failure modes. Two of them collapse once traced.

**A generated note inverts the build.** [Ticket 05](05-spaced-repetition-model.md) settled that the build is a pure function of `content/`. A note the build writes back into the vault makes the vault a function of the build — and it is a cycle with teeth, not merely an inelegance: the report contains wikilinks to the very unwritten notes it ranks, so the next build counts its own links as inbound edges and the queue begins feeding itself. [Ticket 13](13-vault-validation-rules.md)'s `draft` rule — unpublished links do not count toward the ranking — exists precisely to keep speculation out of the queue; a build-authored note walks it straight back in through a door nobody is watching.

**"A Library page that is not Library content" was a false problem.** The report is not a note. It is emitter output, the same category as `contentIndex.json`, the 404 page, and the search UI: things the build emits that were never in the vault. [Ticket 02](02-wikilink-resolution-and-backlink-graph.md)'s "the build renders Library content only" is a rule about *notes*, and this never touches it. No new class, no carve-out in the Library/Workshop boundary.

That leaves terminal vs page, decided on what the dev does next. The queue's output is a ranked list of links you want to *click* — through to the note that leans on the gap. Terminal output cannot be clicked into the vault; a page can, and the dev already has `quartz build --serve` running while authoring, which is where ticket 13 put the fast validation loop.

**Both channels, with the terminal demoted to a pointer.** The page holds the detail; each build prints one line (`14 unwritten notes, 6 empty terms, 3 orphans → /report`). That kills the "invisible unless invoked" failure of pure terminal output without paying for an `npm run report` nobody remembers to run, and it keeps ticket 13's channel discipline intact: **validation shouts, the report whispers a pointer.**

### Two sections, not three — the axis is audience-in-time

The ticket listed three items and asked one-or-three. Both counts are wrong, because the grouping axis is the one the ticket itself named: *what next* vs *what rotted*. Sorted that way the three items give two groups, because **the empty-`term` backlog is not hygiene, it is the queue.** A Term with no body is a note waiting to be written, exactly as an unwritten link is; [ticket 14](14-cheat-sheet-note-type.md) minted those Terms ahead of anyone having prose for them, which is the definition of a backlog item rather than a defect.

- **Authoring queue** — unwritten notes ranked by inbound links, plus empty Terms. Asked at the start of every authoring session.
- **Vault hygiene** — unreferenced attachments, Terms nothing is *about*, Library notes with no inbound links. Asked occasionally, when tidying.

**One page, one trigger, queue first and hygiene collapsed below it.** Separate triggers would buy nothing: both fall out of the same whole-corpus fold the build already computes for validation, so there is no cost to recomputing the half you are not reading. Cadence therefore never became a question — it is a page, it is emitted every build, and a stale report is worse than a recomputed one.

### The ranking: typed edges outrank untyped ones, and the breakdown is load-bearing

Ticket 02 ranked by raw inbound count. [Ticket 06](06-problem-bank-note-format.md) then pushed a structurally different signal through that same counter: `practices` is *required* on every Problem but an unwritten link satisfies it, so fifteen imported problems all declaring `practices: [[Sliding Window]]` score identically to fifteen passing mentions in Lesson prose. A required field the author has committed to filling is not the same obligation as a mid-sentence mention.

**Sort by typed inbound count first, then by total, and print the breakdown** — `Sliding Window — 9 inbound (6 practices, 3 body)`. No weighting constant: a magic number nobody can defend, in place of a two-key sort anyone can read. The dev sees *why* a row is top and can disagree with it.

The breakdown is not decoration. An unwritten note has no page, so ticket 02 renders links to it as a marked **unclickable** affordance — a queue row cannot link to its own subject, because there is nothing there yet. What it links to is the **inbound sources**: the six Problems and three Lessons that lean on the gap, which is exactly what you open when you sit down to write it. The breakdown *is* the row's navigation.

**The long tail is shown, not capped.** A cap invites "what is N", which has no defensible answer. Instead the single-untyped-inbound tail folds into one group (`+ 34 mentioned once`) — the same collapse affordance hygiene already uses, so it is one pattern rather than two. Nothing is hidden; the tail just does not set the page's length.

### It publishes, unlisted

Two options: a conditional emitter that exists only under `--serve`, or always emitted with no nav entry and no sitemap entry.

**Always emitted, unlisted.** The conditional version costs the thing ticket 13 deliberately paid to avoid — builds that differ by mode. Its whole "one rule module, two consumers" design exists so that CI validates what the dev sees; a page present in one mode and absent in another reintroduces exactly that divergence, and it buys privacy for content that is, at worst, a public list of topics the author has not written up yet.

### Excluded from search and the link graph — structurally, and it matters

The report page is not a vault file. [Ticket 15](15-vault-search.md) established that `contentIndex.json`'s `content` comes from the `description` plugin setting `file.data.text` on *processed files*; [ticket 17](17-quiz-fence-under-quartz.md) established that `crawl-links` walks the mdast of those same files. An emitter writing a page directly — the 404 page's pattern — produces no file for either to see. Both exclusions fall out with no rule to write.

**The link-graph exclusion is load-bearing.** Queue rows link to their inbound sources, and hygiene lists Library notes with no inbound links. If the report's own links became graph edges, the report would link to every orphan it found, each orphan would thereby acquire an inbound link, and the section would erase itself on the second build. The same cycle that disqualified a build-authored note comes back through the page, and the only thing preventing it is that emitter output is not a file.

So this is recorded as a **constraint on the implementation, not a happy accident**: the vault report must be emitted as a page, and must never be generated as a virtual `content/` file fed through the transform pipeline. That shortcut looks tidier, would pass review, and silently breaks the orphan section.

### Hygiene's three facts, one of them narrowed

Ticket 13 parked these as *deliberately not validated… if they are ever wanted*; that `if` closes here.

- **Unreferenced attachments** — survives as-is. Cheap, unambiguous, occasionally real.
- **Library notes with no inbound links** — survives; the exclusion above is what keeps it honest.
- **Terms nothing points at** — **narrowed to "no inbound `topic` edge"**. As written it was two facts under one name. A Term with no inbound `topic` edge means *nothing in the vault is about this topic* — a stale rename, or one of ticket 01's area-Terms minted ahead of content. A Term with no inbound links *of any kind* fires constantly on correct authoring, and reported as such the section is mostly legitimate notes: the noise-that-takes-the-real-signal-with-it failure ticket 13 rejected an `info` severity to avoid, arriving on the report channel instead. The narrowed version is also disjoint from the queue's empty-Term list — empty *body* versus nothing *about* it, and a Term can be either, both, or neither.

### Consequences

- **Amends [CONTEXT.md](../../CONTEXT.md)**: adds **Vault report** under Cross-cutting. The name resolves a three-way collision — the map called it "the authoring feedback surface", ticket 13 "the reports channel", ticket 02 "the authoring queue" — and the last of those now names only one of its two sections.
- **Appends to [ticket 13](13-vault-validation-rules.md)**: no rules — one deliberate non-rule and the emitter constraint above, since this ticket's whole subject is the channel ticket 13 split off. Its `Deliberately not validated` entries for the empty-`term` body and the three hygiene facts now have a stated destination rather than a conditional one.
- **Nothing reopens.** Ticket 13's validation policy is untouched, as the question required.

### Carry-forward

The search and link-graph exclusions are inferred from the mechanisms tickets 15 and 17 cited, **not verified against a build** — same standing as those tickets. If some Quartz configuration does route emitter pages through `contentIndex`, the orphan section is the thing that breaks, and it breaks quietly. Confirm it in the build spike ticket 17 already demands for `self.parse()`.
