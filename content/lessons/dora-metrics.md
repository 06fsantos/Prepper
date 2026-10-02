---
id: 01M3Y56D28MGMAFB8NPGYVNRQS
title: DORA metrics
topic:
  - continuous-delivery
prerequisites:
  - continuous-integration-delivery-and-deployment
---

"Are we actually getting better at shipping?" has a standard answer, and it comes from DORA, the
research programme behind the annual State of DevOps reports. DORA measures software delivery
performance with a small set of outcome metrics. They are best known as **"the four keys"**, but
that name is out of date. Today DORA uses **five** metrics in two groups, and one of the original
four has been renamed and redefined. Two claims come with them, and both matter in an interview.
Speed and stability are **not a trade-off**. And the metrics stop telling you anything the moment
they become **targets**.

## The five metrics, in two groups

DORA's guide,
[DORA's software delivery performance metrics](https://dora.dev/guides/dora-metrics/) (last updated
January 2026), sorts the metrics into **throughput**, meaning how many changes can move through the
system over a period of time, and **instability**, meaning how well the deployments go.

| Group       | Metric                          | DORA's definition                                                                                   |
| ----------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Throughput  | Change lead time                | Time for a change "to go from committed to version control to deployed in production"              |
| Throughput  | Deployment frequency            | "The number of deployments over a given period or the time between deployments"                    |
| Throughput  | Failed deployment recovery time | Time "to recover from a deployment that fails and requires immediate intervention"                  |
| Instability | Change fail rate                | Ratio of deployments that "require immediate intervention", likely a rollback or a hotfix           |
| Instability | Deployment rework rate          | Ratio of deployments "that are unplanned but happen as a result of an incident in production"       |

Two details catch people out.

First, **recovery time is filed under throughput**, not stability. In the 2015 model it was a
stability measure next to change fail rate. In the current model it sits with the speed metrics,
because it measures how fast a fix moves through the system. If you say "two speed metrics and two
stability metrics", you are quoting the old model.

Second, every metric is measured **at the level of one application or service**, not averaged
across an organisation. DORA says the metrics "are best suited for measuring one application or
service at a time", because context differs from one application to the next. Blending them across
teams "can be problematic."

All five measure what happens to a change after it is committed: how quickly it reaches production
through [[the-deployment-pipeline|the deployment pipeline]], how often that happens, and how often
it goes wrong. None of them measures availability. DORA did track availability, later broadened to
"reliability", but its own [history of the
metrics](https://dora.dev/insights/dora-metrics-history/) calls that "more a measure of operational
performance than a measure of software delivery performance." Operational health is what
[[availability-and-the-nines]] and [[metrics-logs-and-the-golden-signals]] cover.

```quiz 01M3Y56D2BTMVJ4ETQB2S2B270 cloze
DORA now uses {{five}} software delivery metrics. The throughput group is change lead time,
deployment frequency and {{failed deployment recovery time}}. The instability group is change fail
rate and {{deployment rework rate}}.
```

## What changed, and why

Per DORA's [history of its metrics](https://dora.dev/insights/dora-metrics-history/), the set has
changed several times:

- **2014–2015: the four keys.** The first study started from deployment frequency, lead time for
  changes, mean time to recover (MTTR) and change fail rate. By 2015 they were split into
  throughput (frequency, lead time) and stability (MTTR, change fail rate).
- **2018 and 2021: availability, then reliability, added alongside.** The 2021 report called
  reliability "the fifth metric". DORA now says that label was inaccurate, because reliability is an
  operational measure.
- **2023: MTTR renamed and redefined as failed deployment recovery time.** The old "mean time to
  recover" or "time to restore service" did not distinguish between a failure caused by a software
  change and one caused by something external, such as a data centre outage. The new definition
  counts **only recovery from an impairment that a change to production caused.**
- **2024: deployment rework rate added**, making five. Change fail rate had been working as a proxy
  for how much rework a team does, so DORA added a metric that measures rework directly. The groups
  were renamed **Software Delivery Throughput** and **Software Delivery Instability**, and "lead
  time for changes" became **change lead time**.

The 2023 rename changes what you can claim. Recovering from a cloud-region outage in twenty minutes
is a good incident story. It is not a failed-deployment-recovery-time story, because no deployment
caused it.

```quiz 01M3Y56D2B54Z9CP1AF0C2QQPQ
A team's service goes down because its cloud provider loses a data centre, and the team restores
service in 25 minutes. Which DORA software delivery metric does this incident count towards?

- [x] None of them, since no change the team deployed to production caused the failure
  > Since 2023, failed deployment recovery time covers only recovery from an impairment caused by a
    change to production. External failures were left out on purpose, which is the reason for
    the rename.
- [ ] Failed deployment recovery time, since the team restored production service in 25 minutes
  > This is how the old MTTR or "time to restore service" metric would have counted it. The
    redefinition excludes failures with external causes, such as a data centre outage.
- [ ] Change fail rate, since production needed immediate intervention to get back to healthy
  > Change fail rate is the ratio of *deployments* that need immediate intervention. There was no
    deployment here, so there is nothing for it to count.
- [ ] Deployment rework rate, since recovering service was unplanned work done after an incident
  > Rework rate counts unplanned *deployments* made because of a production incident. If restoring
    service needed no deployment, this metric does not count it either.
```

## Speed and stability are not a trade-off

The intuitive belief is that shipping more often means breaking things more often. DORA's guide
says the opposite: its research "has repeatedly demonstrated that speed and stability are not
tradeoffs. In fact, we see that the metrics are correlated for most teams. Top performers do well
across all five metrics, and low performers do poorly." The history dates this finding back to
2015, when it "debunked the myth that speed comes at the expense of stability." The guide quotes
Dave Farley: over long periods of time, "the real trade-off … is between better software faster and
worse software slower."

The guide names the usual way to improve all five together: **reduce the batch size**. "Smaller
changes are easier to rationalize and to move through the delivery process. Smaller changes are
also easier to recover from if there's a failure." This is the same idea behind daily integration
in [[continuous-integration-delivery-and-deployment|continuous integration]] and short-lived branches
in [[trunk-based-development]]. Release techniques such as
[[blue-green-canary-and-rolling-deployments]] and
[[feature-flags-and-separating-deploy-from-release|feature flags]] change how much a failed
deployment costs.

DORA also describes the metrics as both kinds of indicator. They are **lagging indicators for
delivery practices**, because they show the effect of how you work after the fact. They are
**leading indicators for organisational performance** and team well-being, because they predict
those outcomes.

## Using them without gaming them

The metrics are easy to game, so DORA's guide lists pitfalls along with them. The ones that come up
in interviews:

- **Setting metrics as a goal.** A mandate like "every application must deploy multiple times per
  day by year's end" ignores Goodhart's law and "increases the likelihood that teams will try to
  game the metrics."
- **One metric to rule them all.** Track several, "including some with a healthy amount of tension
  between them". Deployment frequency without change fail rate rewards shipping broken things.
- **Disparate comparisons and competing.** A mobile app and a mainframe system should not be ranked
  against each other. The goal is "to improve your team's performance over time, not to compete
  against other teams or organizations."
- **Siloed ownership.** Give all five metrics to development, operations and release together.
  Splitting them up "can lead to friction and finger-pointing."
- **Measurement at the expense of improvement.** Start with a conversation or the
  [DORA Quick Check](https://dora.dev/quickcheck/) before you build integrations to measure
  precisely.

The improvement loop DORA recommends follows from these. Set a baseline for one application. Find
the biggest constraint together as a team. Commit to fixing it, using narrower leading measures
such as code-review time if they help. Check the metrics again later, and repeat.

```quiz 01M3Y56D2B6WDMZAB3HFX1353S
An engineering director announces: "Every team must deploy daily by Q4. We'll publish a league
table of deployment frequency per team." What is the strongest objection, using DORA's guidance?

- [x] A metric set as a target gets gamed, and ranking unlike teams against each other misleads
  > This combines two of DORA's named pitfalls: setting a metric as a goal (Goodhart's law) and
    comparing or competing across different applications. Each team's own trend is what counts.
- [ ] Deploying daily trades away stability, so change fail rate is certain to rise as a result
  > DORA's research finds the opposite. Speed and stability are correlated, and top performers do
    well on all five metrics. The objection is to the mandate, not to deploying often.
- [ ] Deployment frequency is no longer part of DORA's model since the move to five metrics
  > Deployment frequency is still a throughput metric. In 2024 DORA added rework rate, and in 2023
    it redefined recovery time. Nothing was removed.
- [ ] The metrics should be averaged across the whole organisation rather than kept per team
  > DORA says the opposite. The metrics are best applied to one application or service at a time,
    and blending them across teams can be problematic.
```

## Saying it in the room

The metrics come up in two places. In a [[system-design]] round, after "how would you ship this?",
naming the five shows you know how a team would tell whether its delivery is healthy. In a
behavioural round, they are the numbers for a story about improving how a team ships. The pitfalls
above give the rules for using them there:

- **Report a trend for one service, not a target you hit.** It is how you
  [[the-behavioral-round-proves-the-ladder#Quantify the result|quantify the result]]. "Change lead time on the billing service
  went from about a week to under a day over two quarters" is an improvement story. "We hit our
  deploy-frequency OKR" is a gaming story, because you have just told the interviewer the number
  was a goal.
- **Pair throughput with instability.** If deployment frequency went up, say what happened to
  change fail rate and rework rate. A senior interviewer will ask, and DORA's point is that both
  should move in the right direction together.
- **Name the cause, and make it a practice.** The Action in your story is the constraint you
  removed, such as smaller batches, a faster pipeline or shorter-lived branches. The metric is only
  the evidence. That keeps the answer in [[the-star-method|STAR]] shape, with the number in the
  [[the-star-method#Result — quantified, and mapped to a principle|Result]] where it belongs.
- **Use the current names.** "Failed deployment recovery time, which used to be MTTR" shows you know
  the field has moved on.

```quiz 01M3Y56D2B4QNHRAC4RYK2ZZRP recall
An interviewer asks: "How would you know whether your team's delivery process is getting better?"
Answer in under a minute, naming the metrics and how you would use them.

> I'd use DORA's five software delivery metrics, measured for each service and tracked over time.
> For throughput: change lead time from commit to production, deployment frequency, and failed
> deployment recovery time, which replaced MTTR in 2023 and counts only failures that a deployment
> caused. For instability: change fail rate, meaning deployments that needed a rollback or hotfix,
> and deployment rework rate, meaning unplanned deployments made because of an incident. DORA's
> research finds that speed and stability move together rather than trading off, so I'd want both
> groups improving at once. I'd use them for the team's own improvement: set a baseline, fix the
> biggest bottleneck (often batch size), and measure again. I would not set them as targets or
> compare teams with them, because that invites gaming.
```

## What to take away

DORA's model has **five** metrics now, not four. **Throughput** is change lead time, deployment
frequency and failed deployment recovery time. **Instability** is change fail rate and deployment
rework rate. **MTTR was renamed failed deployment recovery time in 2023** and now covers only
failures that a deployment caused. **Rework rate was added in 2024.** Speed and stability are
correlated, not traded off, and smaller batches improve both. Measure each service against its own
past, keep metrics with tension between them, and never turn them into targets or league tables.

Worth reading in full: DORA's guide
[DORA's software delivery performance metrics](https://dora.dev/guides/dora-metrics/), with its
companion [A history of DORA's software delivery
metrics](https://dora.dev/insights/dora-metrics-history/) for why the names changed. The research
behind the original four keys is in Forsgren, Humble and Kim's book *Accelerate* (2018).
