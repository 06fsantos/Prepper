---
id: 01M3Y56KWEEA4JAC9Q2AEEZZQZ
title: Trunk-based development
topic:
  - continuous-delivery
prerequisites:
  - continuous-integration-delivery-and-deployment
---

Continuous integration asks everyone to merge into mainline at least daily. Your branching model
decides whether that is possible. **Trunk-based development** is the branching model that makes it
possible. Everyone works on one shared branch, and any other branch either lives for a day or two or
exists only to stabilise a release. Long-lived feature branches are what it gives up. The reason is
not taste: the cost of a merge grows with the age of the branch, and a team that merges rarely ends
up afraid to merge at all. In an interview, "how does your team branch?" is really a question about
how often your code meets everyone else's.

## One branch everyone shares

[trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/) defines it as "a source-control
branching model, where developers collaborate on code in a single branch called 'trunk' and resist
any pressure to create other long-lived development branches by employing documented techniques."
The same page calls it "a key enabler of Continuous Integration and by extension Continuous
Delivery."

Martin Fowler, in [Patterns for Managing Source Code
Branches](https://martinfowler.com/articles/branching-patterns.html), calls that shared branch the
**mainline**: "a single, shared, branch that acts as the current state of the product". Git users
usually name it `main` or `master`, and Subversion users name it `trunk`. Fowler prefers the name
"Continuous Integration" for the practice. He notes that people started saying "Trunk-Based
Development" because the meaning of "CI" had become diluted, and he treats the two as the same
practice of integrating into mainline often.

There are two ways to work this way, and team size decides which one fits:

- **Commit straight to trunk.** This suits teams that are "likely to be much smaller (say less than
  16)": a small team "with each team member knowing what the others are up to" ([committing straight to the
  trunk](https://trunkbaseddevelopment.com/committing-straight-to-the-trunk/)).
- **Short-lived feature branches.** This is the way to "scale up without having a bottleneck around
  check-ins or increased risk of broken builds". The branch exists for code review and a CI build
  before the change lands on trunk. It is not where artifacts are built or published.

A short-lived branch has rules that keep it short-lived. According to [the site's
page](https://trunkbaseddevelopment.com/short-lived-feature-branches/), "the branch should only last
a couple of days. Any longer than two days, and there is a risk of the branch becoming a long-lived
feature branch". It has one developer, or two if they are pairing. It is "not shared within a team
for general development activity", and it is deleted once it is merged. The research Fowler quotes
from the State of DevOps reports is stricter still: "branches or forks with very short lifetimes
(less than a day) before being merged into trunk, and less than three active branches in total, are
important aspects of continuous delivery, and all contribute to higher performance."

```quiz 01M3Y56KWFPXX3ZKQA6H5VVBDT
A team of forty raises a pull request for every change. Each branch is one developer's work, is
reviewed and built by CI, and is merged and deleted within a day or two. Is this trunk-based
development?

- [x] Yes: short-lived, single-owner branches merged within days are trunk-based development
  > This is the scaled form the site describes. The branch exists for review and a CI build, then
    lands on trunk and is deleted before it can turn into a long-lived feature branch.
- [ ] No: trunk-based development means every developer commits straight to trunk, no branches
  > Committing straight to trunk is the form for small teams. Short-lived feature branches are
    how trunk-based development scales past that, so a branch is not disqualifying in itself.
- [ ] No: a pull request means the work sits outside trunk, so this is feature branching instead
  > Feature branching keeps a whole feature on its branch until it is done. What decides it is
    how long the branch lives, and a day or two is short enough.
- [ ] Yes, but only because every branch is built by CI, and a team of forty has to work like that
  > A CI build on a branch is not the deciding factor. A branch that lived three weeks would
    still be long-lived, however often it was built.
```

## Why merge pain grows with branch age

Fowler builds the argument from two developers, Scarlett and Violet, who each branch from mainline.
In the low-frequency case they merge only when their work is finished. In the high-frequency case
they merge after every healthy commit. Three things follow, and they are the answer to "why not just
use feature branches?".

**A bigger merge is a harder merge.** "Smaller integrations mean less work, since there's less code
changes that might hold up conflicts." Each day a branch lives, both it and mainline move further
apart.

**Conflicts are found late.** Suppose Scarlett and Violet conflict in their very first commits. "In
the low-frequency case, they don't detect it until Violet's final merge, because that's the first
time S1 and V1 are put together. But in the high-frequency case, they are detected at Scarlett's
very first merge." Some conflicts do not show up as textual conflicts at all. Fowler calls them
**semantic conflicts**: one developer renames a function while the other adds a call to it under the
old name. The merge is clean and the build breaks. "Clean merges can hide semantic conflicts," so
the self-testing build is what catches them, and it catches them sooner the more often you merge.

**Integration fear.** "When teams get a couple of bad merge experiences, they tend to be wary of
doing integration. This can easily turn into a positive feedback loop - which like many positive
feedback loops, has very negative consequences." Merging less often makes each merge bigger, a
bigger merge is more painful, and the pain makes people merge even less. Fowler's answer is the
opposite reflex: "if it hurts... do it more often." His summary: "Higher frequency of integration
leads to less involved integration and less fear of integration."

This is also why trunk-based development is not the same as "keep features small". Fowler's point is
that CI "allows a team to get the benefits of high-frequency integration, while decoupling feature
length from integration frequency." A feature can take three weeks while its code reaches trunk
every day.

```quiz 01M3Y56KWFT4ZFPWEP99969VN1 cloze
Merging rarely makes each merge {{bigger}}, which makes it more painful, which makes the team merge
even less often: Fowler calls this {{integration fear}}. A merge with no textual conflict can still
break the build through a {{semantic conflict}}, such as a call to a function another branch renamed.
```

## Release branches, cut from trunk

Trunk-based development does allow one other kind of branch. Depending on how often a team releases,
"there may be release branches that are cut from the trunk on a just-in-time basis, are 'hardened'
before a release, and those branches are deleted some time after release"
([trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/)). A release branch is a snapshot
being stabilised. It is not where development happens.

The rule that keeps it that way is about which direction fixes go. [Branch for
release](https://trunkbaseddevelopment.com/branch-for-release/) says: "reproduce the bug on the
trunk, fix it there with a test, watch that be verified by the CI server, then cherry-pick that to
the release branch." Fixes go from trunk to the release branch, never the other way. A release
branch is never merged back into trunk. Fowler describes the same choice. You can fix on the release
branch and merge back, but that risks a fix being forgotten as the branches drift apart. Or you can
"create the commits on mainline" and cherry-pick them across.

Teams that release continuously usually don't cut release branches at all. The same page says
directly that "CD teams do not do release branches". They release from trunk, and when a release has
a bug they fix it on trunk and roll forward. Fowler agrees that "most of the best teams don't use
this pattern for single-production products, because they don't need to." A release branch is
something a slower release cadence needs. It is not a requirement of trunk-based development.

## Keeping unfinished work dark

If everything reaches trunk within a day or two, half-built features reach trunk too. Under
[[continuous-integration-delivery-and-deployment|continuous delivery]], trunk must stay releasable
anyway. So the unfinished code has to be in trunk without anyone being able to reach it. The
techniques that do this are the "documented techniques" the definition refers to:

- **Keystone interface.** Build the logic behind the scenes and add the user-facing entry point last.
  Fowler describes this as "hooking up a Keystone Interface last".
- **Branch by abstraction.** For a change that takes longer to finish, such as swapping out a
  library or a subsystem, the site describes [a set-piece
  technique](https://trunkbaseddevelopment.com/branch-by-abstraction/), the in-code sibling of
  [[monolith-to-microservices-modernization#The strangler fig, mechanically|the strangler fig]]. Put an abstraction around
  the code being replaced. Build the new implementation behind it, switched off. Switch it on. Then
  delete the old implementation, and finally the abstraction.
- **Feature flags.** The general mechanism, where code is deployed but not released. That is a
  subject of its own: [[feature-flags-and-separating-deploy-from-release]].

How a commit on trunk then travels to production is [[the-deployment-pipeline]].

```quiz 01M3Y56KWFKMXV5J105JCTFXZP recall
An interviewer asks: "Why does your team use trunk-based development instead of feature branches?
Isn't it risky to merge unfinished code?" Answer in a few sentences.

> Merge cost grows with branch age. A branch that lives for weeks drifts further from trunk every
> day, and conflicts, including semantic ones that merge cleanly but break the build, are found
> only at the end, when they are hardest to untangle. Bad merges make teams merge less often, which
> makes the next merge worse. With trunk-based development, everyone merges to trunk at least daily,
> directly or through a branch that lives a day or two. So merges are small and conflicts show up
> early, while the self-testing build catches them. That is what makes continuous integration
> possible in practice. Unfinished work isn't risky because it stays dark: the entry point goes in
> last, a large change is built behind an abstraction, or it is hidden behind a feature flag. Trunk
> stays releasable, and a feature can take weeks while its code is integrated every day.
```

## What to take away

**Trunk-based development** means one shared branch, and any other branch lives a day or two at most,
belongs to one developer (or a pair), and is deleted after it is merged. Small teams commit straight
to trunk, and larger teams use short-lived branches for review and a CI build. **Merge pain grows
with branch age**: bigger merges, conflicts found later, semantic conflicts that merge cleanly, and
integration fear that feeds on itself. **Release branches** are cut from trunk just in time, fixed
only by cherry-picking from trunk, and never merged back. Teams doing continuous delivery usually
don't need them. **Unfinished work** goes on trunk but stays dark: a keystone interface, branch by
abstraction, or a feature flag.

Worth reading in full: Martin Fowler's [Patterns for Managing Source Code
Branches](https://martinfowler.com/articles/branching-patterns.html). It builds every branching
pattern from first principles and explains why integration frequency, not the branching tool, is
what matters.
