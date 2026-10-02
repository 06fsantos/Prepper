---
id: 01M3Y56FEZNJX5FQMYDACPP0A3
title: The deployment pipeline
topic:
  - continuous-delivery
prerequisites:
  - continuous-integration-delivery-and-deployment
---

A deployment pipeline is the route every change takes from version control to production. It is
built on two ideas. First, the build is split into **stages**: fast, cheap checks run first and
slow, thorough ones run later. Second, **one package is built once** and the same package is
promoted through every stage, deployed the same way at each one. Jez Humble calls it "the key
pattern introduced in continuous delivery." If you understand why the package is built only once,
you can answer "how do you ship this?" in terms of a mechanism and not a vendor's product.

## Why stages: fast feedback versus thorough tests

Martin Fowler's [DeploymentPipeline](https://martinfowler.com/bliki/DeploymentPipeline.html) entry
starts from a tension. You want the build to be fast so that you get fast feedback, "but
comprehensive tests take a long time to run." The pipeline resolves this "by breaking up your build
into stages. Each stage provides increasing confidence, usually at the cost of extra time. Early
stages can find most problems yielding faster feedback," while later stages probe more slowly and
more thoroughly.

Humble's [Patterns](https://continuousdelivery.com/implementing/patterns/) page describes the
stages in order:

1. **The commit stage.** Every change in version control triggers a process, usually on a CI
   server, that "creates deployable packages and runs automated unit tests and other validations
   such as static code analysis." It is "optimized so that it takes only a few minutes to run."
   This is the [[continuous-integration-delivery-and-deployment|CI]] build. Its rule is the same
   one: "If this initial commit stage fails, the problem must be fixed immediately—nobody should
   check in more work on a broken commit stage."
2. **The acceptance stage.** Every passing commit stage triggers the next step, "which might
   consist of a more comprehensive set of automated tests." On Humble's
   [Continuous Testing](https://continuousdelivery.com/foundations/test-automation/) page, these are
   automated acceptance tests run against the packages that passed the commit stage.
3. **The later stages.** Versions that pass all the automated tests "can then be deployed on
   demand to further stages such as exploratory testing, performance testing, staging, and
   production."

Fowler adds that stages "can be automatic, or require human authorization to proceed", that they
can run in parallel across many machines, and that "deploying into production is usually the final
stage." Human authorization before production is what separates continuous delivery from continuous
deployment. The pipeline itself is the same either way.

The testing here is described by stage, not as a testing strategy. Each stage is a filter, and
filters are ordered by cost. Humble describes the
[feedback rule](https://continuousdelivery.com/foundations/test-automation/) that keeps the order
honest: a bug found in exploratory testing means the automated tests need improving, and a defect
found by an acceptance test should prompt the question of whether a unit test could have caught
it. "Most of our defects should be discovered through unit testing." For the same reason he
recommends running activities in parallel, "not have many stages executing in series", because the
aim is to "make the lead time from check-in to release as short as possible."

```quiz 01M3Y56FF1Y39NPFGQYYAJWC93
Why does a deployment pipeline run its tests in stages, not as one big test run on every commit?

- [x] Cheap fast checks run first, so most problems surface in minutes, before the slow ones run
  > This is the tension Fowler starts from: fast feedback against comprehensive tests. Early
    stages find most problems quickly, and each later stage adds confidence at the cost of time.
- [ ] Each environment needs its own build, so every stage compiles the code again for itself
  > The opposite is true. The commit stage builds the package once, and every later stage
    receives that same package. Rebuilding per stage is the mistake the pipeline exists to avoid.
- [ ] Only the final stage is allowed to fail, and every earlier stage is there just to warn you
  > Any stage can stop a change. A failed commit stage stops the whole team: nobody checks in more
    work until it is fixed.
- [ ] Stages let each team pick its own tools, so the pipeline mainly serves organisation charts
  > Fowler does say a pipeline should help the groups involved collaborate and give them
    visibility. But stages exist to buy fast feedback, not to divide up tooling.
```

## Build once, promote the same package

The commit stage does any compilation and, in
[Fowler's words](https://martinfowler.com/bliki/DeploymentPipeline.html), "provide[s] binaries
for later stages." Later stages never rebuild. Humble's first pipeline practice
[says why](https://continuousdelivery.com/implementing/patterns/): "Only build packages once. We
want to be sure the thing we're deploying is the same thing we've tested throughout the deployment
pipeline, so if a deployment fails we can eliminate the packages as the source of the failure."

The point is that what you tested is what you ship. A pipeline that rebuilds from source for
staging and again for production has tested one artifact and shipped another. Every difference
between the two, such as a different dependency version or a different compiler flag, is a
difference no test saw. When a package is built once and promoted, a passing stage is evidence
about the exact bytes that move on to the next stage.

That is also why Humble
[writes](https://continuousdelivery.com/foundations/test-automation/) that "in the deployment pipeline, every change is effectively a
**release candidate**." If the pipeline finds no known problems, "we should feel totally
comfortable releasing any packages that have gone through it." If you would not, or if defects turn
up later, the fix is to improve the pipeline, "perhaps adding or updating some tests". You do not
add a manual gate after it.

The package can be the same everywhere only if what differs between environments lives outside
it. Humble's packages "can be deployed to any environment", and the environments are configured
"purely from configuration files stored in version control." The binary is the same in every
environment. Only the configuration changes.

```quiz 01M3Y56FF1RGG2TV0EX2MQDH4Z cloze
In a deployment pipeline, the {{commit}} stage builds the package {{once}}, and every later stage
deploys that {{same}} package, so a failed deployment rules out the package as the cause. What
changes between environments is {{configuration}}, kept in version control.
```

## Deploy the same way everywhere

Humble's [second practice](https://continuousdelivery.com/implementing/patterns/) applies the same
reasoning to the deployment process: "Deploy the same way to every environment—including
development. This way, we test the deployment process many, many times before it gets to
production, and again, we can eliminate it as the source of any problems." A production deploy
that runs a script nobody uses anywhere else is the least tested step in the whole path.

He adds two supporting practices. **Smoke test the deployment**: a script checks that the
application's dependencies are available where configured, and that the application is up, as part
of the deploy itself. **Keep environments similar**: hardware can differ, but the operating system,
the middleware versions and the configuration approach should match.

These three practices make a production deploy routine. Each one removes a possible cause of
failure: the package, the deployment process, or the environment. So when a production deploy does
fail, there are fewer places to look. How the new version then takes traffic is a separate choice,
covered in [[blue-green-canary-and-rolling-deployments]].

## The pipeline is the only road to production

A pipeline helps only if changes cannot go around it. Fowler says its job is "to detect any changes
that will lead to problems in production", including performance, security and usability problems,
and to provide "a thorough audit trail." Both stop being true for any change that skips it.

The usual way around is the emergency fix. Humble's
[configuration management](https://continuousdelivery.com/foundations/configuration-management/)
page names it. Many organisations have "an emergency process for this type of change which goes
faster by bypassing some of the testing and auditing." His answer is that "our goal should be to be
able to use our normal release process for emergency fixes—which is precisely what continuous
delivery enables." If the pipeline is too slow for a hotfix, the pipeline needs to be faster. A
faster pipeline is cheaper than a second, less tested way into production. The same page explains
that the audit trail is only complete this way: you can "show the path backwards from every
deployment to the elements it came from," and that is possible only when every deployment has
travelled the same path.

This covers more than application code. Humble notes that with infrastructure as code, pipelines
can take "all kinds of changes—including database and infrastructure changes—from version control
into production in a controlled, repeatable and auditable way." Getting a schema change through the
pipeline without breaking the version still running is its own problem, covered in
[[zero-downtime-schema-changes]].

```quiz 01M3Y56FF1PX85TMF2BRWQS3EW
Production is down. The pipeline takes forty minutes, so an engineer proposes building the fix on
their laptop and copying it to the servers. What does the deployment-pipeline answer say?

- [x] Ship the fix through the normal pipeline, and make that pipeline fast enough for emergencies
  > Humble's goal is to use the normal release process for emergency fixes. A bypass skips the tests
    and breaks the audit trail at the moment the risk is highest.
- [ ] Ship the laptop build now, and run it back through the full pipeline once things are calm
  > That ships a package no stage has tested, built on a machine no stage controls. Testing it
    afterwards cannot make the deployment you already did any safer.
- [ ] Keep a separate, lighter hotfix pipeline that skips acceptance tests for emergencies
  > This is the "emergency process" Humble warns about: a faster route that bypasses testing and
    auditing. It is a second road to production, and the less tested one.
- [ ] Rebuild the fix from source in production, so at least the binary matches that environment
  > Building per environment is what build once, promote prevents. The binary should be the one
    that was tested. Only configuration should differ.
```

## Saying it in the room

When asked how a change reaches production, describe the pipeline before naming any product. A
commit triggers a build that produces one versioned package and runs the unit tests in minutes. A
red commit stage stops the team. The same package goes through automated acceptance tests and then
into staging and production, deployed by the same script each time with smoke tests, and with only
the configuration differing. Nothing reaches production any other way, hotfixes included. The time
from commit to production is one of the [[dora-metrics]], so a slow pipeline also shows up as a
slow team.

For a [[microservices|service split]], this is what "independently deployable" means in practice.
Each service has its own pipeline and its own path to production
([[the-operational-surface-of-a-service-split|part of the operational cost a split pays]]), so it can ship without waiting
for another service's release.

```quiz 01M3Y56FF1BEDWVKMNBS0YEZ8V recall
An interviewer asks: "Walk me through how a commit gets to production on your team, and why you
built it that way." Answer in terms of the pipeline, not the tool.

> Every commit to mainline triggers the commit stage. It compiles once, produces a versioned
> package, and runs the unit tests and static analysis in a few minutes. If it goes red, fixing it
> comes first. A green package moves on to slower automated acceptance tests, and then it can be
> deployed on demand to staging and production. Every stage gets the same package. We never
> rebuild, so what we tested is what we ship, and if a deploy fails we can rule out the package.
> Every environment is deployed by the same automated process with a smoke test, so production
> runs a script that has already run many times, and only configuration differs. Stages are
> ordered cheapest first, so most problems surface in minutes. The pipeline is the only route to
> production, emergency fixes included, which is what gives us a complete audit trail. Whether the
> last step is automatic or a button someone presses is the difference between continuous
> deployment and continuous delivery.
```

## What to take away

A deployment pipeline breaks the build into **stages ordered by cost**. The commit stage takes a
few minutes, and the slower acceptance and manual stages come after it. That way most problems show
up quickly and confidence grows with every stage. **Build the package once and promote it**: every
stage tests and deploys the same artifact, so what you tested is what you ship. **Deploy the same
way to every environment**, with smoke tests, and keep only configuration different between them.
Make the pipeline **the only road to production**, hotfixes included. A bypass removes the tests
and the audit trail exactly when the risk is highest.

Worth reading in full: Jez Humble's
[Patterns](https://continuousdelivery.com/implementing/patterns/) page on continuousdelivery.com. It
tells where the deployment pipeline came from, describes its stages, and lists the four practices
in a few paragraphs. Chapter 5 of Humble and Farley's *Continuous Delivery* is the long version.
