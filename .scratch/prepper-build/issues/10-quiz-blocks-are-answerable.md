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

**Status:** resolved

- [x] Clicking an mcq option grades immediately, with no submit control
- [x] A wrong click opens the clicked option's explanation and the correct option's, and leaves the others closed
- [x] A right click opens that option's explanation
- [x] A cloze block reveals every span on one grade
- [x] A recall block reveals on click and offers a self-grade that goes nowhere
- [x] Scrolling past an unanswered block leaves the page in exactly its prior state
- [x] Answering writes nothing to storage of any kind, and issues no request
- [x] The seam-2 tests run against markup emitted by the build, not hand-written fixtures

## Comments

Built. The markup half moved with it, because concealment cannot live in the browser: an
explanation, a recall's reveal and a cloze answer now ship carrying the **`hidden`
attribute**, and a cloze hole ships a blank (`…`) with its answer hidden behind it. That is
the same argument ticket 11 makes for a CSS seal, one step further — an attribute needs not
even a stylesheet — so a block is closed in the search preview pane, mid-load, and with
scripting off. The script therefore only ever *opens* things, and there is no frame in which
an answer is on screen before the reader has answered.

`prepper/quiz/prepper-quiz.js` is the browser half: one hand-written custom element, no build
step, shipped as an inline JS resource that Quartz extracts into a hashed `static/` file and
links from every page. The emitted element is `<prepper-quiz>` rather than a `div`, which is
what makes it upgrade itself after an SPA navigation with no `nav` listener of ours — and the
`prepper-` prefix is the convention ticket 12 established for finding our scripts in seam 2,
since a tag name is a string literal that survives minification.

- **mcq** — every option becomes a control (`role`, `tabindex`, click and Enter/Space); the
  first click grades, sets `data-quiz-answered=correct|wrong`, opens the clicked option's
  explanation and the correct one's, and locks the block. No submit control exists.
- **cloze** — one *Reveal* control opens every hole together and is then spent.
- **recall** — *Show answer* opens the reveal, then offers two self-grade buttons that mark
  themselves and tell nobody.

Answering writes nothing anywhere: no storage, no cookie, no request, no history entry. Seam
2 asserts that with tripwires on every such API rather than by inspection.

**Seam 2 is shared with ticket 12.** That ticket landed `prepper/testing/browser.ts` first;
this ticket's own harness was discarded and its one addition — the tripwires and
`screen.recorded`, plus `click` / `press` / `isOpen` / `html` on `Screen` — folded into that
file, so the two branches converge on one harness rather than two.

Seam-1 assertions in `quiz.test.ts` and `mechanisms.test.ts` moved with the markup: the
element name, and explanation/reveal/cloze text now read off a shown copy, since the emitted
one is concealed and `hast-util-to-text` correctly reports a hidden element as no text.
