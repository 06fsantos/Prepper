---
id: 01M3Y5GPY3RYFCECAW2C6YNBA2
title: A reading order for continuous delivery
topic:
  - continuous-delivery
  - system-design
---

Everything the vault holds on getting a change from a commit to production safely, in the order
that makes each note land — what the practices are, then the route every change takes, then how
unfinished work lives on trunk, then how a version reaches users and how you get back when it is
bad, and finally how a team knows it is getting better. The vault carries no reading order of its
own: `prerequisites` is a graph and there are no lesson numbers. This is one path through that
graph, and where a note disagrees with this page the note wins.

Two things are worth noticing before starting. **The vocabulary comes first** —
[[continuous-integration-delivery-and-deployment]] is step 1 because "we do CI/CD" is three claims,
and every step after it assumes you can say which one you mean. **And flags come before the deploy
strategies**, though the graph would allow either order: trunk-based development leaves unfinished
work on trunk and points at flags to keep it dark, so step 4 answers the question step 3 raises.
Reading the deploy strategies straight after that makes the line between *releasing a feature* and
*rolling out a version* the one you carry into them.

## The order

| # | Read | Scope | Why here |
|---|------|-------|----------|
| 1 | [[continuous-integration-delivery-and-deployment]] | Concept | The three practices behind "CI/CD", told apart: a merge frequency, a releasable state, a release policy. Read first because every later step is the mechanism of one of them, and the root of the graph — steps 2, 3 and 7 record it as a prerequisite, and the other three reach it through them |
| 2 | [[the-deployment-pipeline]] | Concept | The route every change takes: stages ordered by cost, build once and promote, the only road to production. Read second because each later step happens *inside* it — branching feeds it, flags ride through it, strategies are its last stage, and DORA times it |
| 3 | [[trunk-based-development]] | Concept | How code reaches mainline daily without merge pain: short-lived branches, release branches cut from trunk, and why merge cost grows with branch age. Placed after the pipeline because it is what keeps the commit stage fed with small changes |
| 4 | [[feature-flags-and-separating-deploy-from-release]] | Concept | Deploy is not release: latent code, Hodgson's four toggle categories, and flags as inventory. Read straight after trunk-based development, which records it as the way unfinished work stays dark — this step is the answer to that step's open question |
| 5 | [[blue-green-canary-and-rolling-deployments]] | Concept | How a *version* reaches users: three strategies on rollback speed, blast radius, capacity and infrastructure. Read after flags so a canary and a flag cohort are not confused; it also prerequisites [[metrics-logs-and-the-golden-signals]], outside this path, because canary analysis compares golden signals |
| 6 | [[zero-downtime-schema-changes]] | Concept, SQL Server example | Expand, migrate, contract, and rollback versus roll-forward. Read after the strategies, its prerequisite, because every one of them runs two versions against one schema — this is why a schema change is what makes rollback hard |
| 7 | [[dora-metrics]] | Concept | The five metrics, speed and stability as correlated, and using them without gaming them. Read last because it measures everything above — lead time is the pipeline, change fail rate and recovery time are the strategies and the rollback — and a metric is only legible once you know what moves it |

Steps 1–3 are **delivery practice** and can be read in one sitting: what the practices claim, the
pipeline that carries a change, and the branching that feeds it. Steps 4–6 are **release and
deploy**, read close together: a feature released by configuration, a version rolled out by
strategy, and the shared schema that decides whether either can be undone. Step 7 is how the whole
system is judged, and the numbers a behavioural story about shipping puts in its Result.

## What to look up rather than read

- [[deployment-strategies-compared]] — recreate, rolling, blue-green, canary, feature-flag release
  and shadow traffic in one grid: rollback speed, blast radius, extra capacity, what the
  infrastructure needs, and whether two versions coexist. It is not a step in the path; keep it open
  beside steps 4–6 and come back to it whenever a prompt asks "how would you roll it out?".

## Companion reading order

- [[reading-order-for-microservices]] — why independent deployability is the prize. This path is
  the *how* of shipping one service; that one is the *why* a split is worth paying for. Read it when
  "independently deployable" stops being a phrase and becomes the question.

## Practice checkpoint

There is no Problem for this subject: it is asked as a **spoken follow-up**, not a solved artifact —
"how do you ship this?", "how would you roll it out?", "what if the deploy is bad?". So the rehearsal
is spoken. After step 6, take a design you know and answer all three aloud, in that order: name the
practice (step 1), walk a commit through the pipeline (step 2), pick a rollout strategy and say what
it costs on each axis (step 5), then change a column in the same release and walk it through expand,
migrate, contract, saying where you would roll back and where you would have to roll forward (step
6). After step 7, tell one shipping story in STAR shape with a DORA metric in the Result, by its
current name. If you go quiet, that is the [[what-senior-means-as-a-level|mission's]] named failure
mode surfacing, and it is exactly what the rehearsal is for.

## The .NET-specific half, stated plainly

There almost isn't one. **All seven steps are concepts**, and the subject is tool-agnostic by
design: no step teaches a vendor's pipeline syntax. The one place a product shows through is step
6, whose worked example renames a column on **SQL Server**, in C# — the Sch-M lock and the
metadata-only `NOT NULL` default are SQL Server facts, while expand, migrate, contract is not tied to
any database, and the Lesson says which is which. The one other product step 5 names is Kubernetes,
and only for its vocabulary: its Deployments call the two in-place strategies *recreate* and *rolling*.

The claim that survives any stack: **a deploy is only as safe as your way back from it**, and the
way back depends on two versions sharing whatever state the new one touched — so the answer to "how
do you ship this?" is never a tool, it is a route, a rollout, and the schema change that keeps the
rollback open.

## The night before

[[continuous-delivery-cheat-sheet]] for this whole path, and [[system-design-cheat-sheet]] for the
round these follow-ups come up in. A reading order is for the fortnight before; a cheat sheet is for
the morning of.
