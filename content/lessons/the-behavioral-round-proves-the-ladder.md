---
id: 01M1YJ4M3QWKJJCNKZ6QXA7YCP
title: The behavioral round proves the ladder — leadership, "I" not "we", and quantified results
topic:
  - behavioral-interviews
prerequisites:
  - what-senior-means-as-a-level
---

The behavioral round is the one senior candidates are most tempted to treat as a warm-up between
the technical stations, and that instinct costs offers. It is not a personality check; it is a
graded round with a rubric, and the rubric is [[what-senior-means-as-a-level|the level itself]].
Every other round infers your scope from how you solve a problem — the behavioral round asks you
to *evidence* it directly, with stories in which you owned ambiguity, led people through work, and
drove a project to a result. The through-line that runs under the whole senior loop surfaces here
in its plainest form: junior interviews ask for the right answer; senior interviews ask what you
*drove* and what you gave up to do it. This round is where you answer that question in the first
person.

That framing matters because it tells you what a good answer is made of. A story where things
simply went well is not evidence of scope. A story where the situation was under-specified, you
made a call under pushback, and you can name the result in numbers *is* — it is the same
ownership-of-ambiguity signal the [[system-design-is-graded-on-process|design round]] grades and
the same defended-trade-off the [[the-senior-coding-signal|coding round]] grades, told as a
narrative instead of drawn on a whiteboard.

## The rubric is explicit, and at Amazon it is written down

Most companies grade this round against an internal competency ladder they do not publish, which
is why the round feels vaguer than the technical ones. Amazon is the useful exception: its **16
[[amazons-16-leadership-principles|Leadership Principles]]** — Customer Obsession, Ownership, Have
Backbone; Disagree and Commit, Deliver Results, and the rest — *are* the evaluation framework, and
interviewers score your stories against named principles rather than against a general impression
([Amazon's Leadership Principles](https://www.aboutamazon.com/about-us/leadership-principles)).
Even when you are not interviewing at Amazon, the LPs are the best first-party proxy for what
every company's private rubric is reaching for, so they are worth studying as the shape of the
target.

The senior weighting of that rubric is not evenly spread. The principles that carry the most
weight at senior altitude are exactly the ones that restate the level: **mentorship** (Hire and
Develop the Best), **driving through ambiguity** (Ownership, Bias for Action), and **handling
conflict well** (Have Backbone; Disagree and Commit — the principle that you argue a decision
hard, then commit fully once it is made, even when you lost the argument). Those are the
[[what-senior-means-as-a-level|scope claims]] that separate senior from mid-level, which is why
the behavioral round is where the ladder is proved rather than merely asserted.

```quiz 01M1YJ4M3RZY5W5M1TRF6QMGTV cloze
The behavioral round is not a personality check — it is graded against a rubric, and that rubric
is {{the level}} itself. At Amazon the rubric is written down as the 16 {{Leadership Principles}},
and the ones weighted most heavily at senior altitude — mentorship, driving through {{ambiguity}},
and handling {{conflict}} — are the same scope claims that separate senior from mid-level.
```

## Say "I," not "we"

The single most common way a strong engineer under-sells themselves in this round is the reflexive
"we." Good engineers are trained by their teams to share credit, and in a behavioral answer that
training works against you: the interviewer is scoring *your* scope, and a story told entirely in
"we" leaves them unable to find you in it. Amazon's own recruiters put it directly — the interview
is an opportunity to sell yourself, so **use "I," not "we," and be specific about your individual
contributions** ([Amazon recruiter tips](https://www.aboutamazon.com/news/workplace/recruiters-offer-their-best-tips-for-interviewing-at-amazon)).

This is not a licence to erase the team or claim their work; doing that reads as exactly the
missing-Ownership, poor-Earn-Trust signal the round is built to catch. It is a discipline of
attribution: name what the team did in one clause, then spend the rest of the answer on the
decisions *you* made, the ambiguity *you* resolved, and the people *you* carried. "We migrated the
service" tells the interviewer nothing they can score; "the team owned the migration; I made the
call to run the old and new paths in parallel behind a flag so we could roll back in seconds, and
I paired with two engineers who had never done a cutover" tells them precisely what you own.

```quiz 01M1YJ4M3RGYTD6PPKTH88GT5C
An engineer answers "tell me about a hard project" with a fluent, modest story told almost
entirely in "we" — "we scoped it, we hit a wall, we shipped it." How does that read at the senior
bar?

- [x] Thin on signal — the interviewer cannot find the candidate's own scope in it
  > The round scores *your* individual scope, and a story told in "we" hides exactly the decisions
    and ambiguity-ownership it is trying to measure. The fix is to attribute the team's part in a
    clause and then say what *I* decided, resolved, and drove.
- [ ] Strong — sharing credit is the Earn Trust signal interviewers want
  > Earning trust is real, but it is shown by honest attribution, not by erasing yourself. A story
    with no visible individual contribution fails to evidence the level regardless of how gracious
    it sounds.
- [ ] Fine — the interviewer will assume the "we" means the candidate
  > They will not, and cannot fairly. An interviewer scores what you actually say; leaving your own
    role implicit forfeits the points, because the round exists precisely to make that role explicit.
- [ ] Weak — the candidate should have picked a solo project with no team
  > Senior work is rarely solo, and a story with no team can read as small. The fix is not to avoid
    teams but to say what *you* drove within one.
```

## Quantify the result

The Result is the part of an answer that most often evaporates into "and it went well," and that is
a wasted ending, because a number is the most compact evidence of impact there is. Amazon's
recruiters again say it plainly: **they want the numbers — how you delivered tangible results**
([Amazon recruiter tips](https://www.aboutamazon.com/news/workplace/recruiters-offer-their-best-tips-for-interviewing-at-amazon)).
"I cut p99 latency from 800ms to 120ms," "I reduced the on-call page volume by two-thirds," "the
change saved roughly $40k a year in compute" — each turns a claim of impact into a fact the
interviewer can write down. Where you genuinely cannot measure, reach for the nearest honest proxy
— tickets closed, incidents avoided, the time a manual process took before and after — rather than
retreating to an adjective. A quantified result is also what keeps your scope claim
[[what-senior-means-as-a-level|calibrated]]: a concrete number is much harder to accidentally
inflate into a Staff-level claim than a vague "it was a huge success" is.

## Prepare stories, not principles

The last piece of first-party guidance is the one candidates get backwards. It is tempting to
memorize the rubric — learn the 16 principles by heart and try to recite the right one on demand.
That is the wrong preparation and it shows: an answer reverse-engineered from a principle sounds
generic and hollow. The recruiters' advice is the inverse — **prepare a set of specific, real
stories from your own work, and let each one map to one or more principles**, so that when a
question comes you reach for a lived example rather than a definition. Amazon's recommended
structure for telling those stories is [[the-star-method|STAR]] — Situation, Task, Action, Result —
which forces the shape a scorable answer already needs: enough Situation to make the stakes legible,
a Task that is *yours*, an Action section that is the bulk of the answer and is full of "I," and a
Result that is quantified. Six to eight real stories, each rehearsed as STAR and each tagged with
the principles it evidences, covers the round far better than the whole rubric held in memory.

```quiz 01M1YJ4M3RNPBSWE3CBHA0QECK recall
You have a behavioral round next week and one prepared story: a service migration you led. In it,
the requirements were vague, you argued against the originally-planned big-bang cutover and were
overruled, then delivered the plan anyway and it went fine. How do you sharpen this into a
senior-strong answer?

> Rework it against the four disciplines this round grades, because as stated it buries every signal
> it contains:
>
> - **Move it into "I."** "We migrated" hides you. Attribute the team in a clause, then make the
>   Action section a list of *your* decisions: "I proposed the parallel-run design, I wrote the
>   rollback path, I paired with the two engineers doing their first cutover."
> - **Quantify the Result.** "It went fine" is a wasted ending. Replace it with the number: cutover
>   done with zero downtime, rollback tested and under 30 seconds, X requests migrated, no customer
>   incidents — whatever is true and measurable.
> - **Turn the conflict into the strongest beat, not a sore one.** Being overruled is a *Have
>   Backbone; Disagree and Commit* story if you tell it right: "I made the case for a phased cutover
>   with data on the blast radius, the call went the other way, and I committed fully and delivered
>   the agreed plan well." That is a senior signal — arguing hard, then owning the decision — not a
>   complaint.
> - **Lead with the ambiguity, not the outcome.** Open on how under-specified it was and what you
>   did to specify it, because ownership-of-ambiguity is the scope claim the story is really there
>   to evidence.
>
> Then map it: this one story covers Ownership, Bias for Action, and Have Backbone; Disagree and
> Commit at once. Do that for six to eight real stories and you have prepared the round.
```

## What to take away

The behavioral round is a graded round, not a soft one, and it grades the same senior scope claim
every other round does — told as stories in the first person. Study the rubric as
[[amazons-16-leadership-principles|Amazon's Leadership Principles]] and know that mentorship,
ambiguity, and conflict carry the senior weight; then say **"I," not "we,"** so the interviewer can
see your scope; **quantify the result** so impact is a fact rather than an adjective; and prepare
**specific stories mapped to principles**, told as [[the-star-method|STAR]], rather than memorizing
the principles themselves. Prove the ladder here — do not just claim it elsewhere.

Worth reading in full: [Amazon's Leadership Principles](https://www.aboutamazon.com/about-us/leadership-principles)
— the clearest first-party statement of what a behavioral round is actually scoring, and the best
proxy for the private rubrics other companies grade against.
