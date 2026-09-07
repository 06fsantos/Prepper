---
id: 01M1YJM3SYQQ6AY9JCA26E5HPP
title: The STAR method — Situation, Task, Action, Result
topic:
  - behavioral-interviews
prerequisites:
  - the-behavioral-round-proves-the-ladder
---

STAR — **Situation, Task, Action, Result** — is the four-part structure Amazon recommends for
answering a behavioral question, and it is worth learning even if you never interview there,
because it forces the shape a scorable answer already needs
([interviewing at Amazon](https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon)).
The reason to have a structure at all is the failure mode this round actually punishes: asked to
"tell me about a time you…," a strong engineer with a real story to tell rambles, buries the point,
or goes quiet — and the interviewer, who can only score what you say, writes down nothing. STAR is
a rail you run the answer along so that under pressure you always know which sentence comes next.
It is a delivery structure, not a script; the goal is a story that lands the signal, not four
labelled paragraphs recited aloud.

Each of the four parts does a specific job, and the senior version of each is different from the
generic one.

## Situation — the least of it, and lead with the ambiguity

The Situation sets the scene: enough context that the stakes are legible and the rest of the story
makes sense. Its danger is length. Situation is the part candidates over-invest in — it is the
easiest to talk about, because it happened *to* you rather than being something you *did* — and
every extra sentence spent here is a sentence stolen from the Action, which is what actually gets
scored. Keep it to two or three sentences, and spend them on the one thing that matters at senior
altitude: **how under-specified the situation was**. A tidy, well-defined problem is a small story;
"the requirements were a one-line ask from a VP and nobody owned the decision" is the setup for an
[[what-senior-means-as-a-level|ownership-of-ambiguity]] story, which is the scope claim the whole
round is reaching for.

## Task — where "I" starts

The Task is *your* responsibility within that situation — the specific thing you were on the hook
for. It is a distinct beat from the Situation for one load-bearing reason: the Situation is what was
happening, and the Task is what was **yours**, which is the moment the answer switches from "we" to
"I." A story that never separates the two tends to stay in "we" the whole way through and hides the
candidate inside the team — the single most common way a strong engineer under-sells themselves,
and one this round is built to catch ([[the-behavioral-round-proves-the-ladder#Say "I," not "we"|say "I," not "we"]]).
State the Task in the first person and make it a decision or an outcome you owned, not a ticket you
were assigned: "I was responsible for getting the cutover done with no customer-visible downtime,"
not "the team was asked to migrate the service."

```quiz 01M1YJM3SZR5608M5PYK9WDZJB cloze
STAR structures a behavioral answer as {{Situation}}, {{Task}}, {{Action}}, {{Result}}. The
Situation should be the {{shortest}} part, and the switch from "we" to "I" happens at the {{Task}},
because that is the beat that names what was yours rather than what was happening.
```

## Action — the bulk of the answer, and full of "I"

The Action is where you spend most of the answer, and it is the part the interviewer is actually
scoring. It is the sequence of things *you* did: the decisions you made, the trade-offs you weighed,
the people you carried, the pushback you handled. This is where the [[the-senior-coding-signal|same
defended-trade-off signal]] the technical rounds grade shows up as narrative — "I chose X over Y
because Z, knowing it cost us W." Attribute the team's part in a clause when you must, then return
to "I" and stay there. If your Action section is one sentence and your Situation was a paragraph,
you have told the interviewer about a thing that happened to a team; if it is the bulk of the answer
and it is full of concrete decisions in the first person, you have evidenced your scope.

```quiz 01M1YJM3T06SDQMA2X4X9G5Y3E
A candidate answers a behavioral prompt with a vivid two-minute setup — the org, the deadline, the
stakes — and then finishes with "so I coordinated with everyone and we got it shipped." Where does
this answer go wrong under STAR?

- [x] The Action is starved — the scored part collapsed into one vague sentence
  > Action is the bulk of the answer and the part the interviewer scores, so a rich Situation
    followed by a one-line Action inverts the budget. The fix is to cut the setup and spend the time
    naming the specific decisions *you* made, in the first person.
- [ ] The Situation is missing — there was not enough context to follow
  > There was plenty of context; the setup was the strong part. The problem is the opposite — the
    Situation crowded out the Action, which is where the scope actually lives.
- [ ] The Result is missing — it should have opened with the outcome
  > A missing Result is a real flaw, but it is not the main one here, and STAR ends on the Result
    rather than opening on it. The dominant failure is the collapsed Action.
- [ ] The Task was too specific — it should have covered the whole team's goal
  > Senior answers get *more* specific and more personal, not less. Broadening the Task to the whole
    team's goal is how a story slides back into "we" and hides the candidate.
```

## Result — quantified, and mapped to a principle

The Result closes the story with what happened, and its discipline is the one from the round itself:
**give the number** ([[the-behavioral-round-proves-the-ladder#Quantify the result|quantify the
result]]). "It went well" is a wasted ending; "I cut p99 from 800ms to 120ms," "zero customer
incidents, rollback tested under 30 seconds," "saved roughly $40k a year" are facts the interviewer
can write down. Where nothing is measurable, reach for the nearest honest proxy rather than an
adjective. And close the loop back to the rubric: each finished story should map cleanly to one or
more [[amazons-16-leadership-principles|Leadership Principles]], because that mapping is what the
interviewer is silently doing anyway.

## Prepare stories, not the letters

The trap is to treat STAR as something you improvise live — to hear a question, then try to
manufacture a Situation-Task-Action-Result on the spot. That produces exactly the stilted,
paragraph-by-paragraph recital the structure is supposed to prevent. STAR is preparation
scaffolding: take **six to eight real stories** from your own work, draft each one as
Situation-Task-Action-Result until the beats are natural, tag each with the principles it evidences,
and rehearse them until you can tell any of them conversationally. Do not memorize the sixteen
principles and try to reverse-engineer a story from whichever one is asked; that reads as hollow.
Prepare the stories, let STAR give each one its shape, and let the [[amazons-16-leadership-principles|principles]]
be the index you reach into rather than the thing you recite.

```quiz 01M1YJM3T0QV5TKG7EPQWX7XWK recall
Two candidates prepare for the behavioral round the same amount of time. One memorizes all sixteen
Leadership Principles and plans to recite the matching one on demand; the other drafts seven real
stories as STAR and tags each with the principles it shows. Why does the second candidate do better?

> Because the round scores lived evidence of scope, not knowledge of the rubric — and the two
> preparations produce opposite-sounding answers:
>
> - **A story reverse-engineered from a principle sounds generic and hollow.** Starting from
>   "which principle does this question want?" and building an example to fit it produces an answer
>   the interviewer can hear is manufactured, and it evidences nothing about what the candidate
>   actually did.
> - **A prepared real story told as STAR lands the signal directly.** It has a short Situation that
>   leads with the ambiguity, a Task in "I," an Action full of the candidate's own decisions, and a
>   quantified Result — which is precisely the scope evidence the round grades.
> - **The mapping runs the right direction.** You do not need the principle to *find* the story; you
>   tell the story and the principles it evidences are self-evident. One good story usually covers
>   several — Ownership, Bias for Action, and Have Backbone at once — so six to eight stories cover
>   the whole rubric better than the whole rubric held in memory covers a single question.
>
> The letters are scaffolding for the preparation, not a script for the delivery. Prepare the
> stories; let STAR shape them.
```

## What to take away

STAR is the rail that keeps a behavioral answer from wandering: a short **Situation** that leads
with the ambiguity, a **Task** stated in "I," an **Action** that is the bulk of the answer and full
of your own decisions, and a **Result** that is quantified and maps to a principle. It is delivery
structure, not a script — prepare six to eight real stories against it rather than improvising the
letters live, and rehearse them until they are conversational. Together with [[the-behavioral-round-proves-the-ladder|the
disciplines the round grades]] — say "I," quantify, prepare stories — STAR is how you make sure the
scope you actually have is the scope the interviewer gets to write down.

Worth reading in full: [interviewing at Amazon](https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon)
— the first-party statement of STAR as the recommended structure, with examples mapped to the
Leadership Principles.
