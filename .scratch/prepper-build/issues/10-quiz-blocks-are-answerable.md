# 10: Quiz blocks are answerable

**What to build:** The browser half of the quiz block. Hand-written **custom elements with no
build step** — Quartz's own client runtime ships on every page regardless, so the "no framework in
the browser" rule reads "no framework *of ours*".

**MCQ grades the instant an option is clicked** — the feedback loop is as tight as it can be, which
is also why it is strictly single-select. A click reveals the blockquote on the **clicked** option
*and* on the **correct** one, and leaves the rest closed: the dev learns why they were wrong
without being handed the whole answer key. **Cloze** reveals all its spans together on one grade,
so a sentence with three holes is one question rather than three. **Free recall** shows a prompt,
reveals on click, and lets the dev grade themselves — the only type the app cannot grade.

Two properties matter as much as the grading. Scrolling **straight past** a block has no
consequence, so a re-read is never obstructed. And answering **records nothing at all** — no
score, no attempt, no timestamp — so the app stays a read-only library and there is no state the
dev did not ask for to manage. The ULID in the fence is what keeps the vault scheduler-ready
should spaced repetition ever return as its own effort; nothing reads it now.

This is **seam 2**, and its input is markup **produced by 09**, never markup hand-written for the
test — otherwise the two seams can pass while disagreeing with each other.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] Clicking an mcq option grades immediately, with no submit control
- [ ] A wrong click opens the clicked option's explanation and the correct option's, and leaves the others closed
- [ ] A right click opens that option's explanation
- [ ] A cloze block reveals every span on one grade
- [ ] A recall block reveals on click and offers a self-grade that goes nowhere
- [ ] Scrolling past an unanswered block leaves the page in exactly its prior state
- [ ] Answering writes nothing to storage of any kind, and issues no request
- [ ] The seam-2 tests run against markup emitted by the build, not hand-written fixtures
