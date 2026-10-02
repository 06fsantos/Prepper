---
id: 01M3Y57A6F01NYR6NGQ4PRY6W5
title: Feature flags and separating deploy from release
topic:
  - continuous-delivery
prerequisites:
  - trunk-based-development
---

**Deploying** puts new code on production servers. **Releasing** lets users see what it does. Most
teams treat these as one event, and a feature flag is what splits them. Pete Hodgson's
[Feature Toggles (aka Feature Flags)](https://martinfowler.com/articles/feature-toggles.html)
defines a flag as a way "to modify system behavior without changing code". Once a flag sits between
a deploy and a release, unfinished work can live on trunk, a release can wait for a marketing date,
and a bad feature can be switched off without a rollback. The senior part of the answer is knowing
that flags are not all one thing. Hodgson sorts them into four categories, each with a different
lifetime, and every one of them has a carrying cost.

## The two events, pulled apart

Hodgson's opening story is a team rewriting a core algorithm over several weeks. They want everyone
to keep working on trunk rather than on a long-lived branch, so the pair doing the rewrite put the
new code behind a flag:

```js
function reticulateSplines(){
  if( featureIsEnabled("use-new-SR-algorithm") ){
    return enhancedSplineReticulation();
  }else{
    return oldFashionedSplineReticulation();
  }
}
```

That `if` is a **toggle point**, the place in the code where the decision is made. The function
that answers it is the **toggle router**, and what the router reads is the **toggle
configuration**. That configuration can be hardcoded, a file, a database table or a distributed
key-value store. The more often you need to flip a flag, the further down that list you go.

The new code ships to production on every deploy, turned off. Hodgson calls it **latent code**:
code that is in production but that no user reaches. Using flags this way is, in his words, "the
most common way to implement the Continuous Delivery principle of 'separating [feature] release
from [code] deployment.'" Two consequences follow:

- **Trunk stays releasable while work is unfinished.** This is what makes
  [[trunk-based-development]] possible for any feature that takes longer than one commit, and it is
  how [[continuous-integration-delivery-and-deployment|continuous delivery]] keeps mainline
  deployable while half a feature sits on it.
- **Release becomes a configuration change, not a deploy.** The team can turn the feature on for
  internal users first (Hodgson's example uses a special cookie), then for a small random cohort
  while comparing business metrics against everyone else, then for all users. Turning it off again
  is also a configuration change. How the deploy itself is rolled out to servers is a separate
  question, covered in [[blue-green-canary-and-rolling-deployments]].

```quiz 01M3Y57A6MQ43BSV93MPSCB6QY cloze
A feature flag lets you {{deploy}} code without {{releasing}} it. The code ships to production
switched off, which Hodgson calls {{latent}} code. The `if` that checks the flag is the toggle
{{point}}, and the logic that answers it is the toggle {{router}}.
```

## Four categories, four lifetimes

Hodgson's warning is that "it can be tempting to lump all feature toggles into the same bucket, but
this is a dangerous path." He sorts flags along two axes: **longevity** (how long the flag will
live) and **dynamism** (whether the decision is the same for every request, or varies by user).

| Category          | What it is for                                                         | How long it lives                                       | How dynamic it is                          |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| **Release**       | Shipping unfinished or untested code paths as latent code              | "not … much longer than a week or two"                  | Very static: same answer for every request |
| **Experiment**    | A/B or multivariate tests: each user is placed in a cohort and kept there | Long enough for statistical significance: hours or weeks | Highly dynamic: decided per user           |
| **Ops**           | Letting operators disable or degrade a feature in production           | Mostly short; a few long-lived "kill switches"          | Must be re-configured "extremely quickly"  |
| **Permissioning** | Giving some users features others don't: premium, alpha, beta, internal | Can be "at the scale of multiple years"                 | Very dynamic: always per request           |

Some points that sound obvious only after you've heard them:

- **A release toggle can also serve the product.** Product managers use the same mechanism to
  hold back a fully built feature until it works for every shipping partner, or until a marketing
  campaign starts. Hodgson notes that these product-centric toggles may live longer than the usual
  week or two.
- **A long-lived ops toggle is a kill switch.** Hodgson's example is turning off an expensive
  recommendations panel under heavy load. He describes it as "a manually-managed Circuit Breaker"
  (compare the automatic kind in [[retry-versus-circuit-breaker]]). Because it is used during an
  incident, it must flip without a deploy: "needing to roll out a new release in order to flip an
  Ops Toggle is unlikely to make an Operations person happy."
- **The category decides how the flag is built.** A release toggle that will be gone in days can
  be a plain `if`. A permissioning toggle that will last for years cannot be scattered through the
  code as `if`s. Hodgson's fix is to put each decision behind a named method, for example
  `includeOrderCancellationInEmail()`, so that the toggle point never needs to know which flag
  or rule answers it.
- **The same feature can change category.** A recommendations section might start behind a release
  toggle, move to an experiment toggle to prove it earns revenue, and end up behind an ops toggle so
  it can be shed under load. Each move changes where the configuration lives and who manages it:
  developers first, then product, then operations.

```quiz 01M3Y57A6MR7T65FXR5QGHJMWC
During a flash sale, the site is overloaded and the operators want to turn off the expensive
"customers also bought" panel at once, without deploying. Which kind of toggle is this, and what
must be true of it?

- [x] An ops toggle, reconfigured at runtime very quickly, with no deploy needed
  > This is Hodgson's kill switch, a manually-managed circuit breaker. It is only useful if it can be
    flipped very quickly while the incident is happening.
- [ ] A release toggle, flipped by shipping a new build with a config change in it
  > Release toggles are static, and changing them with a new release is fine for them. In an
    incident a deploy is far too slow, so this is the wrong category.
- [ ] An experiment toggle, keeping each user in the same cohort for the whole sale
  > Experiment toggles keep users in fixed cohorts so you can compare them. Here the aim is to shed
    load for every user, not to compare two groups.
- [ ] A permissioning toggle, decided per request according to each user's account
  > Permissioning decides who is entitled to a feature, such as premium customers. Shedding load is
    an operational decision, not a question of entitlement.
```

## Toggle debt: every flag is inventory

Flags are cheap to add, and that is the danger. Hodgson: flags "have a tendency to multiply
rapidly", and each one adds conditional logic to the code and work to testing. His summary is
a line worth quoting in an interview: "Savvy teams view the Feature Toggles in their codebase as
inventory which comes with a carrying cost and seek to keep that inventory as low as possible." He
points to Knight Capital Group's $460 million loss as "a cautionary tale on what can go wrong when
you don't manage your feature flags correctly (amongst other things)."

The ways to keep the inventory low, all from the same section:

- **Add a removal task to the backlog** at the moment a release toggle is introduced.
- **Put an expiration date** on each toggle, recorded in the toggle configuration file next to a
  human-readable description and an owner.
- **Use time bombs**: a test fails, or the application refuses to start, if a flag is still present
  after its expiry date.
- **Cap the number of flags** a system may have at once, a Lean limit on inventory.

Flags also make testing harder. A build moving through [[the-deployment-pipeline]] cannot know
whether a flag will be on or off in production, so both states need testing, and the number of
combinations grows quickly. Hodgson's way out is that you do not test every combination, because
most flags do not interact and most releases change only one. Test the configuration you expect in
production (today's production configuration plus the flags you are about to turn on), test the
fallback with those flags off, and many teams also run with all flags on. All of this depends on
one convention: **off means the existing behaviour and on means the new behaviour.** Finally, the
system should expose its current flag configuration, for example through a metadata endpoint, so an
operator can see what is actually switched on.

```quiz 01M3Y57A6MCQWZ6DR1ESQDCTR3
Your service has twelve feature flags. A release candidate is about to go out, and it will turn on
one new release toggle. Which toggle configurations should the pipeline test?

- [x] Production's config with the new flag on, the same with it off, and often all on
  > This is Hodgson's advice. It assumes the convention that off means existing behaviour, which is
    what makes the "all on" run meaningful.
- [ ] Every combination of all twelve flags, because any of them could interact in production
  > That is the combinatorial explosion Hodgson says you do not need. Most flags don't interact, and
    most releases change only one.
- [ ] Only the new flag switched on, because the flags that are already live were tested before
  > The fallback matters too. If the new feature misbehaves you will switch it off, so the off state
    must be known to work.
- [ ] None: flags are runtime configuration, so testing them belongs to production monitoring
  > The artifact contains both code paths, and either one may go live. A pipeline that tests only
    one has not tested what it is shipping.
```

## Dark launches

A **dark launch** goes one step further than latent code: the new code actually *runs* in production,
on real traffic, and users still can't see it. Fowler's [DarkLaunching](https://martinfowler.com/bliki/DarkLaunching.html)
example adds cross-sell recommendations to a checkout. The checkout calls the recommendation engine
for every order, exactly as it will after release, but the results are never shown. The team can
then measure the extra load and latency. If the impact is worrying, they use a feature flag to turn
the calls off "before anyone really notices", tune the engine, and only then add the keystone, the
piece of UI that shows the feature to users.

Dark launching can also **run old and new implementations in parallel**: call both, compare the
results, and return only the old answer. Fowler gives one limit and one warning. It "works best when
it's a process that enhances existing user interactions and isn't something users choose to do",
and a feature users have to choose to use calls for a canary release instead. And the term has
drifted, so some people say "dark launch" when they mean a canary. In an interview, define it as
you use it.

```quiz 01M3Y57A6MKXV13NYK4X3JQQJ5 recall
An interviewer asks: "How would you roll out a risky new feature that takes three weeks to build,
on a team doing trunk-based development?" Answer using the separation of deploy from release.

> Merge to trunk continuously, with the new code behind a release toggle that is off by default,
> so it ships with every deploy as latent code and trunk stays releasable. Test both flag states in
> the pipeline. When the feature is ready, release it by changing configuration rather than by
> deploying: first to internal users, then to a small cohort while comparing metrics, then to
> everyone. If it is expensive on the backend, dark-launch it first, calling it on real traffic
> without showing the result, to measure the load. If something goes wrong, turn the flag off
> instead of rolling back. Add a backlog task to remove the toggle when the ticket is created, and
> give the flag an expiry date, because every flag carries a cost. A release toggle should be gone
> within a week or two of full release.
```

## What to take away

A feature flag separates **deploy** (code on servers) from **release** (users see the behaviour).
That lets unfinished work ship as latent code, and makes release and rollback configuration changes.
Hodgson's four categories, **release, experiment, ops and permissioning**, differ in how long they
live (days, weeks, a few kill switches, years) and how dynamic they are (static to per-request),
and the category decides how a flag is built and who manages it. Every flag is **inventory with a
carrying cost**, so plan its removal when you add it. Test the expected production configuration and
its fallback, not every combination. A **dark launch** runs the new code on real traffic without
showing it, which lets you measure the load before release.

Worth reading in full: Pete Hodgson's
[Feature Toggles (aka Feature Flags)](https://martinfowler.com/articles/feature-toggles.html) on
martinfowler.com (October 2017). Its implementation sections, on decoupling decisions and on where
to place toggle points, go further than this Lesson does.
