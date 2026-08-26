# How `import` obtains a problem's text

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: resolved
Blocked by: 16

## Question

Given a list of externally-hosted problems, where does `import` get each problem's actual text — the text it needs in order to write the one-line paraphrase for `## Prompt` and to write `## Solution`?

[Ticket 06](06-problem-bank-note-format.md) established that the original prompt is **never stored in the repo** (licensing, in a repo that may go public): a `source` URL plus a paraphrase in the dev's own words is all that lands on disk. So the text has to reach the agent some other way, and it has to reach it reliably enough that the paraphrase and the solution are about the right problem.

[Ticket 16](16-problem-authoring-skill.md) resolved everything downstream of this and deliberately parked the question, but its **halt-on-unidentified rule presupposes an answer**: `import` stops rather than guessing when it cannot confidently identify a problem — which only means something once "identify" has a mechanism.

To resolve:

- **The three candidates.** (a) the agent browses to the `source` URL and reads it; (b) the dev pastes the prompt text into the session, and the paste never lands on disk; (c) the agent works from what it already knows about the named problem, given only the URL and title.
- **Whether they are exclusive.** A recall-first path with a paste fallback was the shape sketched during ticket 16 and never tested.
- **Fetching, if (a) survives.** LeetCode-class sites are hostile to automated reading, and ticket 06 avoided the licensing question by not copying prompts in — browsing reopens it in a different form.
- **Recall reliability, if (c) survives.** The standard LeetCode canon is well-attested; a niche or recently-added problem is not. What the confidence threshold is, and how the agent recognises it has fallen below it, is the whole safety story for the halt rule.
- **Batch consequences.** Ticket 16 chose a batch shape (a list, one note at a time). Pasting fifteen prompts by hand is a different ergonomic proposition from pasting one, and may not survive contact with the shape.
- **Verbatim-reproduction guard.** Whatever the source, the paraphrase must not be a lightly-reworded copy. Whether that needs a stated rule (no run of N words shared with the source) or is adequately handled by "one line, in your own words".

## Answer

**Recall, only — and the corpus scope is what makes that safe.** `import` works from what the agent already knows about each named problem. Nothing is fetched, nothing is scraped, and the dev pastes a prompt only on the items the agent's own confidence gate rejects. The three candidates did not survive as three: (a) is dead on the facts, (b) demoted to a fallback, (c) is the path.

### The facts that killed browsing

Both were checked in-session, and neither is a judgement call:

- `https://leetcode.com/problems/course-schedule/` returns **403 Forbidden** to a plain fetch — Cloudflare fronting the site, not a per-page quirk. The content sits behind a GraphQL endpoint wanting a POST and a session cookie.
- `https://neetcode.io/problems/course-schedule` and `https://neetcode.io/api/problems` both return the **empty Angular shell** — the site renders client-side, so a fetch sees a page title and nothing else.

That leaves browsing only in its expensive form: driving the dev's logged-in Chrome via `claude-in-chrome`. **Declined, and recorded as declined** so nobody re-proposes it on seeing the skill in the directory. It requires the dev present and per-site permissioned, which converts an unattended fifteen-problem batch back into an attended session — the exact property [ticket 16](16-problem-authoring-skill.md) chose the batch shape to avoid. It fails *mid-run* (a modal, a rate limit, a layout change kills item nine with eight notes already written). And it puts the verbatim copyrighted prompt in the context window on every item, satisfying the letter of [ticket 06](06-problem-bank-note-format.md)'s "never lands on disk" while making that text the agent's routine working material.

### Corpus scope and acquisition method are one decision

Recall's failure mode is **silent** — right title, drifted constraints, a variant conflated with the original, rendered as a confident well-formatted wrong note. That is exactly the poisoning ticket 16 named as the one failure worth halting for, so recall is only defensible if the corpus is one where recall is reliable.

It is. **The corpus is the NeetCode canon** — the 150/250 practice list — which is the densely-attested head of the distribution: every problem on it has editorials, videos, and hundreds of public solutions behind it. The agent is not inventing an approach, it is reproducing a published one. That is also what makes ticket 16's deferred execution-verification an accepted risk rather than a gamble.

So this ticket does not merely pick an acquisition method; it **scopes the corpus**, because the two cannot be chosen separately. Widening the corpus off the canon is not a content decision someone can make later in passing — it invalidates the acquisition method, and the confidence gate below is what stops that happening silently.

### `source` is demoted to a reader affordance

Ticket 06 introduced `source` as the URL where the prompt is hosted, which made it sound like an input. It is not, and never will be: **the agent never reads it.** Its only job is to be clickable by the dev when they want to attempt the problem.

**`source` becomes an ordered list of URLs, first one the attempt link**, carrying both the LeetCode and NeetCode pages where both exist. Rejected: a scalar plus a named second field (`neetcode:`), because a field name is the worst place to record which list the corpus came from — the next source (Grokking, a company's published set, a blog) would need its own field or would sit under someone else's; and labelled `{url, label}` entries, because the label is derivable from the host, so the page renders `leetcode.com` / `neetcode.io` chips off the URL with nothing authored and nothing to drift. A bare ordered list states the one thing that is not derivable — which link you would click to *attempt* it — by position.

### Identification, and the confidence gate

**Identification keys on the canonical title**, not the URL — the URL is no longer an input. `import` **restates the title it resolved** for each item as it writes, so a misidentification is visible in the run log during the run, not only in the diff afterwards.

The gate that ticket 16's halt rule presupposed is **two tests, both cheap**:

1. **On-list is above the line, off-list is presumed below.** A problem on the NeetCode canon is trusted; anything else — a contest problem, a recently-added one, a company-specific list, a blog's invention — is presumed unrecallable regardless of how confident it feels.
2. **The worked-example self-test.** Before writing anything, the agent must produce the problem's constraints and at least one worked example (concrete input → expected output) from recall. If it cannot, or produces an example that contradicts the constraints it stated, the item fails.

Test 2 earns its place *beside* the published-solutions argument rather than being replaced by it, because the two guard different things. Widely-published solutions make the **solution** reliable; they do nothing for **identification**, and the two come apart — an agent can be entirely right about the canonical solution to *Course Schedule* while having misidentified a list item that was *Course Schedule II*. A worked example is where a conflated variant contradicts itself. The gate also sits in front of the failure it guards for a second reason: an agent that cannot produce a worked example cannot write a correct `## Solution` or `## Complexity` either.

### Defer and ask once, not halt

**Amends ticket 16.** Its halt-on-first-unidentified rule made sense when a miss might mean the agent had lost the plot entirely. With an on-list/off-list test, a miss means one item wandered off the canon — so the run **writes every item that passes, collects the failures, and asks once at the end**: *these two I could not identify; paste the prompts or drop them.*

This is the same reasoning ticket 16 already applied to duplicates: fifteen problems should not be punished for one. It also keeps the fallback **self-limiting** — the dev feels the paste cost exactly in proportion to how far off-canon their list wandered, which is the right feedback signal and needs no infrastructure to maintain.

### The verbatim guard is structural

A word-run metric ("no run of N words shared with the source") is **unenforceable and was never a candidate**: the source text is not in the repo, so nothing exists to diff against and no validation rule could ever run. The guard is structural and lives in `PROBLEM-FORMAT.md`:

- On the recall path there is **no source text to copy from** — the constraint is satisfied by construction.
- On the paste path, **the pasted prompt is a working input**: never quoted, never stored, and the note is written as though the paste had not been seen.
- Ticket 06's one-line, what-is-asked-never-how paraphrase already makes a reproduction structurally impossible at that length.

### `system-design` needs no acquisition path

Stated so nobody later hunts for the missing half. "Design a URL shortener" has no authoritative prompt text to be faithful to: the `## Prompt` is the title restated and the substance is all in `## Solution`. Acquisition was a **`coding`-only question** throughout.

### Amendments and appends

- **[Ticket 06](06-problem-bank-note-format.md)**: `source` scalar → ordered URL list; `source` demoted from prompt-host to reader affordance.
- **[Ticket 16](16-problem-authoring-skill.md)**: halt-on-first → defer-and-ask-once; duplicate matching now **any URL in common, falling back to title**.
- **[Ticket 13](13-vault-validation-rules.md)**: one error — a pointer problem needs at least one well-formed `source` URL. The list shape makes an empty list newly expressible, so it needs saying.
- **[CONTEXT.md](../../CONTEXT.md)**: the *Pointer problem* entry said "a `source` URL".

### Stated plainly

**Recall reliability is asserted, not measured.** No sample of NeetCode problems was drafted and checked against the real statements in this session. The gate is designed to make a miss loud rather than to make misses impossible, and the first real batch is where that gets its evidence — if items on the canon start failing test 2, the corpus assumption, not the gate, is what is wrong.
