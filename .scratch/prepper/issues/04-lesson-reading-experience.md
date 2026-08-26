# Lesson reading experience

Parent: [Prepper — wayfinder map](../map.md)
Type: prototype
Status: resolved
Blocked by: 02, 03

## Question

What does a lesson page look and feel like?

Make a clickable artifact. This question is answered far better by something concrete than by more discussion.

To resolve:

- **Page chrome.** What surrounds the lesson prose: area navigation, progress indicator, what-is-due badge, backlinks panel.
- **Inline quiz feel.** How a quiz block interrupts reading, and whether it blocks scrolling past or is skippable. `teach`'s pedagogy wants desirable difficulty; the UI decides whether that lands as useful friction or as an obstacle.
- **Typography.** `teach` asks for Tufte-like, print-friendly documents. That was in service of standalone HTML files; decide what survives into an app shell.
- **Navigation between lessons.** Next/previous by prerequisite chain, by area, or only by following links.
- **Entry point.** What the reader sees on opening the app: a due queue, an area index, or the last thing they were reading.

## Answer

Settled form, clickable: [prototypes/04-lesson-page.html](../prototypes/04-lesson-page.html).

The governing decision, which reshaped every other answer here: **there is no reading
order.** The dev jumps around, picking what to study today. Every affordance that assumed
linear consumption — breadcrumb, next/previous, a percentage progress bar — was cut for
arguing with that.

### Entry point — the library, with a persistent topic tree

The app opens on the **topic index**, not a due drill: a grid of topics with counts and how
much of each is read. A due queue as the front door lies on day one (it opens on a zero) and
misrepresents what this thing is.

Navigation is a **persistent sidebar tree**, open beside the content on wide viewports,
off-canvas below ~900px. The prose column stays ~38rem regardless — the sidebar takes the
leftover width rather than squeezing the measure.

**The tree is by topic, not by directory.** The vault on disk is typed directories
(`lessons/`, `problems/`, …) with topic deliberately kept out of the path (ticket 01), so a
literal file mirror is a four-item menu over sixty flat files — accurate and useless. The
menu answers "what shall I study today", which is asked in topics and never in types. A note
under two topics appears twice; that is the many-to-many-ness the vault was designed around,
not a bug to dedupe.

Leaves are **every Library note about the topic**, grouped by type inside it, cheat sheet
pinned first. This is the same generated topic index ticket 02 already puts on the term page
— the sidebar renders it early. **One index, two views**, never two indexes to maintain.

The **review queue is a badge in the top bar** and one line at the top of the sidebar, so it
is visible on every screen. A queue that only appears on the home screen is a queue that
stops being seen.

### Page chrome — Library, badge, search

No breadcrumb. It implied a hierarchy the vault does not have, and its middle segment had to
arbitrarily pick one of a note's several topics. Topics render as **chips under the title**,
where their many-to-many nature is honest.

**No reading-progress bar.** Reading state is an **explicit read/unread**, nothing derived
from scroll depth — a scroll-derived percentage is meaningless on the re-reads that are the
normal case here.

### Prerequisites — state, never a gate

The "Read first" block stays at the top of a lesson, each prerequisite marked read or unread.
It is a signal that you may want these first. **Nothing is ever locked**: no lesson, no
problem, no quiz. The DAG rule from ticket 02 is a build-time integrity property, not a
runtime permission system.

Relationships render as footer rails — *This unlocks*, *Practise this*, *Linked from* —
which state adjacency without implying sequence. **Next/previous is cut entirely**: the
prerequisite graph is a DAG, so a "next" would have to silently pick one of several unlocked
lessons and teach a sequence that does not exist.

### Inline quiz — skippable, and skipping is not recorded

The block sits in the reading flow. You can scroll straight past it; the friction that
matters is that the question is *there* mid-scroll, not that it is a wall. A gate was
rejected: the reader is the same person who authored the lesson, and on every re-read a gate
is pure obstruction.

**A quiz block enters the review schedule only when first answered.** Rendering it schedules
nothing. The accepted cost is that a fast read-through generates no reviews; the rejected
alternative — schedule on render — fills the queue with questions the dev never engaged with,
which is how a review queue gets abandoned. Consequence for ticket 05: the scheduler's input
is a first-answer event, and "seen but unanswered" is not a state the system stores.

### Typography — the measure survives, the margins do not

Serif body at a ~38rem measure: kept, and cheap. **Margin notes are cut.** They need a
reserved second column in a shell that has just spent its left margin on the sidebar, and —
decisively — an authoring notation for sidenotes that does not exist in Obsidian Markdown.
Ticket 03 refused new notation for exactly this reason. Ordinary blockquotes carry asides.

### Surfaced by this ticket

- **Search** was drawn in the chrome three times without ever being decided, and is
  plausibly a more important way to jump around than the tree is. Spun out as
  [Vault search](15-vault-search.md): titles-only vs full text, and where the index is built,
  which carries a tooling consequence for ticket 11.
- **The review session itself has no ticket.** Ticket 05 owns the scheduling model, this
  ticket owns the reading surface, and nobody owns what a review looks like — a full-screen
  drill, an inline reveal, how a problem attempt differs from a quiz block. Left in the map's
  fog until 05 lands, since its shape depends on what 05 decides a review *is*.

## Amended by ticket 05

[Spaced-repetition model](05-spaced-repetition-model.md) removed the scheduler, which
invalidates three decisions recorded above:

- **The review-queue badge is cut** — both the top-bar badge and the sidebar queue line.
  There is no queue to count. In its place, cheat sheets get a top-level sidebar entry
  (input to [Cheat sheet note type](14-cheat-sheet-note-type.md)).
- **Read/unread state is cut.** No per-user state is stored at all, so prerequisites render
  as plain links rather than as read/unread markers. The "Read first" block survives as a
  signal; it just carries no state.
- **"A quiz block enters the review schedule only when first answered" is moot.** Blocks
  still render, grade on click, and show their explanation — then record nothing.

Everything else — no reading order, the topic-keyed sidebar tree, no breadcrumb, no
next/previous, nothing gated, the ~38rem serif measure, no margin notes — stands.
