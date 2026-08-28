/**
 * `<prepper-quiz>` -- the browser half of a quiz fence.
 *
 * This file is **hand-written JavaScript with no build step**, shipped to the page as it is
 * written here. Quartz's own client runtime is on every page regardless, so the project's
 * "no framework in the browser" rule reads "no framework *of ours*" -- and a custom element
 * is the smallest thing that satisfies it. It is also the one that survives the SPA router:
 * `customElements.define` is called once, and every `<prepper-quiz>` that arrives in a swapped
 * body afterwards is upgraded by the browser without anything of ours listening for `nav`.
 *
 * ## What is concealed, and by whom
 *
 * Nothing here hides anything. A block arrives from the build already closed -- explanations
 * and reveals carry the `hidden` attribute, and a cloze hole ships a blank with its answer
 * hidden behind it -- because concealment has to hold where this script does not run: in
 * Quartz's search preview pane, which injects a result's real HTML; during a slow load,
 * before any script has run; and in a reader with scripting off. So this file only ever
 * *un*hides. There is no state in which it has to hide something first, and therefore no
 * frame in which the answer is on screen before the reader has answered.
 *
 * ## What answering does, and does not do
 *
 * An mcq grades **the instant an option is clicked** -- no submit control, strictly
 * single-select -- and opens the explanation on the clicked option *and* on the correct one,
 * leaving the rest closed: enough to learn from a wrong answer, never the whole answer key.
 * A cloze reveals every hole together, because a sentence with three holes is one question.
 * A recall reveals on click and offers a self-grade, since it is the one type the app cannot
 * grade.
 *
 * And answering **records nothing**: no storage, no request, no history entry, no timestamp.
 * Not "nothing yet" -- there is nothing to record into. The ULID in the fence is what keeps
 * the vault scheduler-ready if spaced repetition is ever built; nothing reads it here.
 *
 * The corollary is that scrolling straight past a block has no consequence: an untouched
 * block is untouched, so a re-read is never obstructed by a question the reader did not want
 * to answer.
 */
;(() => {
  /** Attributes the element writes on itself, so the stylesheet can dress the state. */
  const ANSWERED = "data-quiz-answered"
  const CHOSEN = "data-quiz-chosen"
  const REVEALED = "data-quiz-revealed"

  class PrepperQuizBlock extends HTMLElement {
    /** Whether the controls and listeners are already on. See `connectedCallback`. */
    #armed = false

    connectedCallback() {
      // The SPA router can move an element rather than build a new one, and an element that
      // re-enters the document runs this again. Arming twice would double every listener.
      if (this.#armed) return
      this.#armed = true

      const type = this.getAttribute("data-quiz-type")
      if (type === "mcq") this.#armMultipleChoice()
      else if (type === "cloze") this.#armCloze()
      else if (type === "recall") this.#armRecall()
    }

    /**
     * An mcq: every option is a control, and the first click is the answer.
     *
     * The options are made buttons *here* rather than in the markup, because a list item
     * that announces itself as a button and does nothing when pressed is a worse page than
     * a list item. Without this script they are what they read as: the options, in prose.
     */
    #armMultipleChoice() {
      const options = [...this.querySelectorAll(".quiz-option")]
      for (const option of options) {
        option.setAttribute("role", "button")
        option.setAttribute("tabindex", "0")
        option.addEventListener("click", () => this.#grade(option, options))
        option.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          this.#grade(option, options)
        })
      }
    }

    /**
     * Grade one click.
     *
     * A wrong answer opens the option the reader chose and the one that was right, and
     * leaves every other option closed -- the reader learns why they were wrong without
     * being handed the rest of the key. A right answer opens only itself, for the same
     * reason.
     *
     * The block locks afterwards. Single-select is what makes feedback immediate, and a
     * second click would either be a second answer to a question already answered or a way
     * to open the remaining explanations one at a time.
     */
    #grade(chosen, options) {
      if (this.hasAttribute(ANSWERED)) return

      const right = chosen.getAttribute("data-quiz-correct") === "true"
      this.setAttribute(ANSWERED, right ? "correct" : "wrong")
      chosen.setAttribute(CHOSEN, "true")
      open(chosen)
      if (!right) {
        const correct = options.find((o) => o.getAttribute("data-quiz-correct") === "true")
        if (correct) open(correct)
      }

      for (const option of options) {
        option.setAttribute("aria-disabled", "true")
        option.removeAttribute("tabindex")
      }
    }

    /**
     * A cloze: one control, and every hole opens at once.
     *
     * All of them together is the whole point -- a sentence with three holes is one question
     * about one sentence, not three questions -- so there is one control and it is spent
     * once.
     */
    #armCloze() {
      const holes = [...this.querySelectorAll(".cloze")]
      const controls = this.#controls()
      const reveal = button("Reveal", () => {
        for (const hole of holes) {
          hole.setAttribute(REVEALED, "true")
          for (const blank of hole.querySelectorAll(".cloze-blank")) blank.hidden = true
          for (const answer of hole.querySelectorAll(".cloze-answer")) answer.hidden = false
        }
        this.setAttribute(ANSWERED, "revealed")
        controls.remove()
      })
      controls.append(reveal)
      this.append(controls)
    }

    /**
     * A recall: reveal, then grade yourself.
     *
     * The app cannot mark prose the reader thought rather than typed, so it does not
     * pretend to. The self-grade is an affordance for the reader's own attention and it
     * **goes nowhere**: it marks the button it was pressed on and ends there.
     */
    #armRecall() {
      const reveal = this.querySelector(".quiz-reveal")
      const controls = this.#controls()
      const show = button("Show answer", () => {
        if (reveal) reveal.hidden = false
        this.setAttribute(ANSWERED, "revealed")
        show.remove()
        for (const grade of selfGrade(this)) controls.append(grade)
      })
      controls.append(show)
      this.append(controls)
    }

    /** The row this block's controls live in, made once and kept. */
    #controls() {
      const controls = document.createElement("div")
      controls.className = "quiz-controls"
      return controls
    }
  }

  /** Open every explanation an option carries. The only thing this file does to the page. */
  function open(option) {
    option.setAttribute(REVEALED, "true")
    for (const explanation of option.querySelectorAll(".quiz-explanation")) {
      explanation.hidden = false
    }
  }

  /** The two self-grade buttons, which mark themselves and tell nobody. */
  function selfGrade(block) {
    const grades = [
      ["got-it", "I knew it"],
      ["missed", "I did not"],
    ].map(([grade, label]) => {
      const control = button(label, () => {
        block.setAttribute("data-quiz-self-grade", grade)
        for (const other of grades) {
          other.setAttribute("aria-pressed", String(other === control))
          other.disabled = true
        }
      })
      control.setAttribute("data-quiz-grade", grade)
      control.setAttribute("aria-pressed", "false")
      return control
    })
    return grades
  }

  function button(label, onClick) {
    const control = document.createElement("button")
    control.type = "button"
    control.className = "quiz-control"
    control.textContent = label
    control.addEventListener("click", onClick)
    return control
  }

  // Defined once per document. Every block already on the page upgrades now, and every
  // block the SPA router brings in later upgrades as it is inserted.
  if (!customElements.get("prepper-quiz")) customElements.define("prepper-quiz", PrepperQuizBlock)
})()
