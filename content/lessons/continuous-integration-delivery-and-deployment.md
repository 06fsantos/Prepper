---
id: 01M3Y4YNV133G1GM5F10ZJMRKZ
title: Continuous integration, continuous delivery and continuous deployment
topic:
  - continuous-delivery
---

Three practices hide behind the one abbreviation "CI/CD", and they are not three names for the same
thing. **Continuous integration** is about how often code meets mainline. **Continuous delivery** is
about whether what is on mainline could go to production right now. **Continuous deployment** is
about whether it actually does, automatically. Each one builds on the one before it, and each makes
a different claim about your team. The interview trap is using them interchangeably. "We do CI/CD"
says nothing until you say which D you mean, and a senior answer says it without being asked.

## Continuous integration: how often code meets mainline

Martin Fowler's definition, from the [2024 revision of his Continuous Integration
article](https://martinfowler.com/articles/continuousIntegration.html), is about a merge, not a
server: "a software development practice where each member of a team merges their changes into a
codebase together with their colleagues changes **at least daily**." The practices that make that
safe are listed in the same article:

- **Every push to mainline triggers a build.** The CI service checks out the head of mainline and
  does a full build. "Only once this integration build is green can the developer consider the
  integration to be complete."
- **The build is self-testing.** A build that compiles but runs no tests proves very little.
- **Fix broken builds immediately.** CI "can only work if the mainline is kept in a healthy state".
  Fowler quotes Kent Beck: "nobody has a higher priority task than fixing the build". The usual fix
  is to revert the faulty commit, which lets the rest of the team carry on.
- **Keep the build fast.** The XP guideline of a ten-minute build is, in Fowler's words, "perfectly
  within reason" for most projects.

The confusion Fowler names directly is about what "integration" means. A developer on a feature
branch who pulls from mainline regularly is not integrating. "Full mainline integration requires
that developers push their work back into the mainline." Running an automated build on every
feature branch "is useful, but it is only **semi-integration**." A CI server is a tool. The practice
is merging.

Jez Humble's [continuousdelivery.com](https://continuousdelivery.com/foundations/continuous-integration/)
turns this into a three-question test. Are all the engineers pushing to trunk (not to feature
branches) every day? Does every commit trigger a run of the unit tests? When the build is broken, is
it usually fixed within ten minutes? Answer yes to all three and you are practising CI. Humble
observes that fewer than 20% of teams who think they are doing CI can pass it. How branching makes
this possible or impossible is the subject of [[trunk-based-development]].

```quiz 01M3Y4YNV14T81R75A8W0YQS7C
A team works on feature branches that each live about two weeks. A CI server builds and tests every
branch on every push, and each branch is merged to mainline when its feature is done. Are they
practising continuous integration?

- [x] No: building branches is semi-integration, since nobody merges to mainline daily
  > Fowler's definition is a merge into mainline at least daily. A build on a branch is "useful, but
    it is only semi-integration", and the team fails the first of Humble's three questions.
- [ ] Yes: every push is built and tested automatically, which is what CI requires
  > Building every push is one CI practice, not the definition. The definition is how often work
    reaches mainline, and here that is once every two weeks.
- [ ] Yes: as long as each branch pulls mainline in daily, the team is integrated
  > Pulling from mainline is the confusion Fowler names. Full integration means pushing your work
    back into mainline, where everyone else's work can meet it.
- [ ] No: CI also needs every change deployed to production as soon as it is green
  > Deploying every green change is continuous deployment, which is a later practice. CI stops at
    a healthy, integrated mainline.
```

## Continuous delivery: always releasable, released on demand

CI ends at a healthy mainline. It says nothing about the journey from there to production. Fowler
says the early descriptions of CI "didn't talk much about" that journey. Continuous delivery is the
practice that covers it.

Fowler's [ContinuousDelivery](https://martinfowler.com/bliki/ContinuousDelivery.html) entry defines
it as building software "in such a way that the software can be released to production at any
time", and lists four signs that you are doing it:

1. Your software is deployable throughout its lifecycle.
2. Your team prioritizes keeping the software deployable over working on new features.
3. Anybody can get fast, automated feedback on the production readiness of their systems any time
   somebody makes a change to them.
4. You can perform push-button deployments of any version of the software to any environment on
   demand.

Humble's [continuousdelivery.com](https://continuousdelivery.com/) puts the aim in terms of
outcomes: getting changes of every kind (features, configuration, bug fixes, experiments) into
production "safely and quickly in a sustainable way", so that deployments become "predictable,
routine affairs that can be performed on demand." The route every change takes to get there is the
[[the-deployment-pipeline|deployment pipeline]].

The sentence that matters most in an interview comes from Fowler's CI article. The aim is that the
product "should always be in a state where we can release the latest build. This is essentially
ensuring that **the release to production is a business decision**." Continuous delivery does not
say that every change ships. It says that every change *could* ship, so whether it does is no longer
held up by engineering.

```quiz 01M3Y4YNV12AVTJ13KHGVAGX24 cloze
Under continuous delivery, every change is {{releasable}}, and whether it is released is a
{{business}} decision. Under continuous deployment, every change that passes the pipeline
{{is automatically put into production}}.
```

## Continuous deployment: every passing change ships

Continuous deployment removes the human decision. In the
[same bliki entry](https://martinfowler.com/bliki/ContinuousDelivery.html), Fowler writes that it
"means that every change goes through the pipeline and automatically gets put into production,
resulting in many production deployments every day. Continuous Delivery just means that you are able
to do frequent deployments but may choose not to do it, usually due to businesses preferring a
slower rate of deployment."

The two are nested, not alternatives: "in order to do Continuous Deployment you must be doing
Continuous Delivery." And continuous delivery relies on CI, because a mainline that is not
integrated and green cannot be releasable. So each practice in the chain includes the one before it:

| Practice              | The claim it makes                                  | Where a human decides            |
| --------------------- | --------------------------------------------------- | -------------------------------- |
| Continuous integration | Everyone merges to a green mainline at least daily | Everything after the green build |
| Continuous delivery    | Every green build is releasable, on demand          | Whether, and when, to release    |
| Continuous deployment  | Every change that passes the pipeline is released  | Nowhere, once the pipeline passes |

One consequence follows directly. CI means merging before a feature is finished, and continuous
delivery means mainline is always releasable, so unfinished work has to be on mainline without being
reachable by users. Fowler's CI article calls this hiding work-in-progress. One way is a keystone
interface, where the path into the new feature is the last thing added. The more general way is to
separate deploying code from releasing a feature, which is
[[feature-flags-and-separating-deploy-from-release]].

```quiz 01M3Y4YNV1APA0KPCCTC8A76TE
Every commit to mainline runs through an automated pipeline. Each green build is ready to deploy
with one click, and the product manager chooses when to click, usually twice a week. Which practice
is this?

- [x] Continuous delivery: every build is releasable, and a person chooses when to release
  > This matches Fowler's definition: frequent deployments are possible, but the business chooses
    the rate. Release is a business decision, which is the point.
- [ ] Continuous deployment: the pipeline is automated all the way up to production itself
  > Continuous deployment means every passing change goes to production without anyone choosing.
    A person clicking deploy twice a week is exactly what it removes.
- [ ] Continuous integration only: deploying twice a week is too slow for continuous delivery
  > Continuous delivery is about being *able* to release at any time, not about how often you do.
    A slower release rate chosen by the business is allowed by name.
- [ ] None of them: any manual step in the path to production rules out all three practices
  > CI does not cover deployment at all, and continuous delivery expects a push-button release.
    Only continuous deployment takes the human out.
```

## Saying it in the room

When an interviewer asks "how do you ship this?", name the practice before you describe any tooling:
how often code reaches mainline, whether mainline is always releasable, and who decides to release.
The honest answer for many teams is "CI and continuous delivery, with release on demand". That is a
deliberate choice the source names, not a failure to reach continuous deployment. How a team knows
whether its delivery is actually getting better is measured by [[dora-metrics]]. For a
[[microservices|service split]], all of this happens once per service: a service can be deployed
independently only if it has its own route to production.

```quiz 01M3Y4YNV12FY3BW7GM2T19VH1 recall
An interviewer says: "So you have CI/CD — does that mean every merge goes straight to production?"
Answer precisely, distinguishing the three practices.

> Not necessarily, because CI/CD covers three different practices. Continuous integration means
> everyone merges to mainline at least daily, every push triggers a self-testing build, and a red
> build is fixed at once, usually by reverting. Continuous delivery adds that mainline is always
> releasable: any green build can be deployed to any environment at the push of a button, so
> releasing is a business decision. Continuous deployment is the case where that decision is
> removed and every change that passes the pipeline goes to production automatically. Each one
> requires the one before it. So "every merge to production" is continuous deployment, and I'd say
> plainly which one we do and why. Releasing on demand rather than on every merge is a legitimate
> choice.
```

## What to take away

**CI** is a merge frequency: into mainline, at least daily, onto a green build that the team fixes
before doing anything else. A build on a feature branch is semi-integration. **Continuous
delivery** is a state: every build is releasable, deployment is push-button and routine, and
release is a business decision. **Continuous deployment** is a policy: every change that passes the
pipeline is released, with no human in the loop. Each one requires the one before it, so say which D
you mean.

Worth reading in full: Martin Fowler's
[Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) (revised
January 2024). It covers the practices one by one, explains where feature branching falls short, and
shows where CI ends and continuous delivery begins.
