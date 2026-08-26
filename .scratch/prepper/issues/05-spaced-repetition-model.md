# Spaced-repetition model

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 01

## Question

What scheduling algorithm drives review, and what exactly is reviewable?

To resolve:

- **Algorithm.** Leitner boxes, SM-2, FSRS, or something simpler. Weigh implementation cost against how much better the scheduling actually is for a library measured in dozens of items rather than thousands.
- **Reviewable units.** Quiz blocks, problems, whole lessons, or all three? A "review this lesson" item and a "answer this question" item behave very differently — one is a re-read, the other is retrieval.
- **Grading input.** Binary right/wrong, a confidence rating, or a four-point ease scale. This decides how much the reader has to do per item and how much signal the scheduler gets.
- **Graph-aware scheduling.** The stated appeal of the vault was following links rather than a flat queue. Does the scheduler use prerequisites — surfacing a prerequisite before the note that depends on it, or interleaving linked topics deliberately (`teach` names interleaving as a storage-strength technique)?
- **Content churn.** What happens to a review record when its note is edited, or when a quiz block within it changes.

## Answer

**There is no scheduler.** Prepper is an ad-hoc tool: the dev opens it when they want to
study and picks what to study. No algorithm, no grading scale, no queue, no due dates.
Spaced repetition is ruled **out of scope** for this map (see the map's Out of scope
section), deliberately and revisitably rather than rejected.

Every sub-question this ticket listed — Leitner vs SM-2 vs FSRS, binary vs three-point
grading, graph-aware ordering — dissolves rather than resolves. They were all downstream of
a queue that does not exist.

### What replaces it

**Browsing.** The topic index is the front door (ticket 04), search is the primary
jump-around affordance (ticket 15), and **cheat sheets are the quick-catchup tool** — the
dev named them as the thing they actually reach for when revisiting a topic. Revisiting a
lesson is navigation, not a scheduled item.

### The app is a read-only library

**No per-user state is stored at all.** Not review records, not attempt history, not
read/unread. Every screen is derivable from `content/`, so the build is a pure function of
the vault. Rejected alternative: keeping read/unread as "light state" — it was designed as a
signal for prerequisites that ticket 04 already refused to gate on, and an ad-hoc tool does
not need to remember that a page was scrolled months ago.

Consequences:

- **[Per-user state storage](07-per-user-state-storage.md) is ruled out of scope** — it
  existed only to store progress. Multi-user goes with it.
- **Ticket 11 is freed**: no client-side persistence layer, no state hydration, no
  storage API to satisfy. A static deploy of rendered Markdown is the whole runtime.
- **The mission** — one of the state questions ticket 07 carried — is settled by default:
  it is vault content, an authored note, like every other note.

### Quiz blocks survive, ephemerally

Ticket 03's format is **unchanged and fully in scope**. Blocks render interactively, grade
on click, and show their explanation — then record nothing. The scheduler was only ever what
happened *after* the answer. Ticket 04's rule that "a block enters the schedule only when
first answered" is now moot; there is no schedule to enter.

**ULIDs stay**, with a changed justification. They are no longer record keys (nothing keys
off them); they are stable anchors that keep the vault scheduler-ready, so spaced repetition
can return later as its own effort without re-identifying every block. ADR 0001 has been
amended accordingly — the two-identity split now rests on future-proofing rather than on
protecting a live schedule.

### Chrome: the review-queue badge is removed

This **invalidates part of [Lesson reading experience](04-lesson-reading-experience.md)**,
which put a queue badge in the top bar and a queue line at the top of the sidebar on every
screen. Both are cut — they have nothing to count. In their place, **cheat sheets get a
top-level sidebar entry** listing all of them, in addition to being pinned first inside each
topic. That is an input to [Cheat sheet note type](14-cheat-sheet-note-type.md).

### Content churn (the one sub-question that survives)

Answered anyway, because it governs ULID hygiene even with nothing scheduled: **edits never
invalidate identity — a new ULID is how the author says "this is a different question now."**
Consistent with ADR 0001 and with ticket 03's rejection of hash identity, and honest: only
the author knows whether an edit changed the question or only its wording.
