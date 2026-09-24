---
id: 01M3AES131MKEGSMM6AP7WWC5T
title: Subdomains and distillation, and where the effort goes
topic:
  - strategic-design
prerequisites:
  - bounded-context
---

A subdomain is a slice of the **problem space** — one of the areas of the business the
software has to address. The whole *domain* is everything the business does; a subdomain is
one coherent piece of it: pricing, catalogue, payments, notifications. This is a different cut
from the [[bounded-context]], which is a boundary in the **solution space** — a region where
one model and its [[ubiquitous-language|ubiquitous language]] stay consistent. The distinction
is one interviewers probe directly: a subdomain is *what the business does*, a bounded context
is *how you carved the software to serve it*. The two are **ideally** aligned — one context per
subdomain — but the alignment is a goal, not a guarantee: a messy legacy system can smear one
subdomain across three contexts, or force two subdomains into one.

Once you can name the subdomains, the strategic question is no longer "where does the boundary
go" but "which of these deserves my best people and my best modelling?" That is the question
distillation answers, and it is the one that turns a design round from a feature tour into a
statement about where engineering budget earns its return.

## Distillation: finding the Core Domain

**Distillation** is Eric Evans's term (2003, Part IV) for the process of progressively
separating the **Core Domain** — the distilled essence that delivers the differentiating value
— from the mass of supporting and generic material around it. The point is a refusal: **not
every part of the system is equally important**, and pretending otherwise spends your scarcest
attention evenly across parts that do not repay it. The Core Domain is *the reason to build
rather than buy* — the part that is your competitive differentiator, unique to this business,
where your strongest modelling and your best people belong. Everything else exists to support
it, and should be given proportionally less.

Evans's own tools in that chapter are mostly about making the core *visible*: a Domain Vision
Statement that writes down what the core's value is, a Highlighted Core that flags it inside a
larger model, and the Segregated/Abstract Core that physically isolates it so it stands clear.
Those last ones are in-a-monolith code-organisation moves; the modern equivalent is
architectural — put the core in its own [[bounded-context]] with its own team and lifecycle,
and buy or thin-slice everything around it. The strategic *intent* is identical across twenty
years: protect the part that matters and spend elsewhere as little as you can.

```quiz 01M3AES132MY0M1T32P3AAFB68
A payments startup's whole reason to exist is its fraud-scoring engine; it also needs user
login, a general ledger, and email receipts. Which is the Core Domain, in Evans's sense?

- [x] The fraud-scoring engine, because it is the differentiating reason the business exists
  > The Core Domain is the distilled part that delivers competitive value and is the reason to
    build rather than buy — here, the fraud scoring nobody else can replicate.
- [ ] The general ledger, because accounting is where the money is counted
  > Accounting is real work but a solved, common problem — a generic capability to buy, not the
    thing that differentiates this business from a competitor.
- [ ] User login, because every request depends on authenticating first
  > Being on the critical path is not the same as being differentiating; auth is a generic
    subdomain you should buy rather than hand-craft.
- [ ] Email receipts, because they are what the customer actually sees
  > Visibility is not differentiation; notification delivery is a generic capability with
    off-the-shelf providers, not where your best modelling belongs.
```

## The triage: core, supporting, generic → invest, build-thin, buy

The practical payload — the thing to be able to say under pressure — is a three-way
classification of subdomains and the build decision each one implies:

- **Core subdomain → invest.** The differentiator, unique to this business. Model it
  carefully, keep it in-house, give it your strongest boundary and your best people.
- **Supporting subdomain → build thin.** Necessary for the core to function but not a
  differentiator, and with no off-the-shelf option that fits — so you build it, but you build
  it plainly, without your best modelling effort. Thin CRUD, not a masterpiece.
- **Generic subdomain → buy.** A solved problem common to many businesses: authentication,
  notifications, tax tables, billing plumbing. Buy it, outsource it, or pull in a library — do
  **not** hand-craft what a managed service already does well. This is the
  [[build-vs-buy|build-versus-buy]] decision in its sharpest form: the generic subdomain is
  the part you have no business building.

The senior move in a design round is to run this triage out loud: "the recommendation engine
is our core, so I'd give it its own context and my best effort; the seller dashboard is
supporting, so thin CRUD; and I'd use a managed auth provider and an off-the-shelf
notification service rather than build either." That single sentence tells the interviewer you
spend complexity where it earns competitive advantage and refuse to spend it where it does
not — which is exactly the judgement the round is testing.

```quiz 01M3AES132EWXGEH7BN7G8BW70 cloze
The subdomain triage maps three-to-three: a {{core}} subdomain you invest in and keep
in-house, a {{supporting}} subdomain you build but build thin, and a {{generic}} subdomain you
buy or outsource rather than hand-craft.
```

## The provenance to get right: Evans versus Vernon

Here is the claim to state carefully, because it reads twenty years old if you get it wrong and
because an interviewer who knows the source will notice. The tidy, symmetric **three-way split
— core / supporting / generic — is not literal 2003 Evans.** Evans introduced **Core Domain**
and **Generic Subdomain** under Distillation; he did *not* codify the neat trichotomy, and the
term **"supporting subdomain"** as a named third category is not his. The symmetric taxonomy —
and that middle term — were crystallised and popularised later by **Vaughn Vernon**
(*Implementing Domain-Driven Design*, 2013; *Domain-Driven Design Distilled*, 2016).

So hold the two apart cleanly:

- **Evans's (2003):** Distillation, the Core Domain, the Generic Subdomain.
- **Vernon's (2013/16):** the symmetric core/supporting/generic trichotomy, and "supporting
  subdomain" as a named category.

Teach and use the trichotomy anyway — it is standard modern DDD and it is what an interviewer
expects to hear — but attribute the three-way split to Vernon rather than putting it in Evans's
mouth. Saying "the core/generic distinction is Evans; the tidy three-way version is Vernon's
refinement" is itself a senior signal: it shows you know the literature well enough to know
which idea came from where.

```quiz 01M3AES132AVT51CT2RE74HA8G recall
Which parts of the subdomain vocabulary are Evans's (2003) and which are Vernon's later
refinement, and why is keeping them straight worth doing?

> Evans (2003) gave us **Distillation**, the **Core Domain**, and the **Generic Subdomain** —
> a two-poled distinction between the differentiating essence and the solved, commodity part.
> The tidy, symmetric **three-way split — core / supporting / generic** — and the term
> **"supporting subdomain"** as a named middle category are **Vaughn Vernon's** (Implementing
> DDD, 2013; DDD Distilled, 2016), not literal 2003 Evans.
>
> It is worth keeping straight because the trichotomy is what interviewers expect, so you teach
> and use it — but attributing the whole thing to Evans is a small, checkable error that a
> knowledgeable interviewer will catch. Being able to say "the core/generic idea is Evans, the
> symmetric three-way codification is Vernon" shows you know the source material rather than a
> blog-post summary of it, which is the difference between reciting DDD and understanding its
> history.
```

## Why this scores in a design round

Subdomains and distillation are the **prioritisation** half of strategic design — the
companion to [[context-mapping|the context map]]'s integration half. Both follow from having
[[bounded-context|boundaries]]: once you know where the lines go, distillation tells you which
side of which line earns the investment. Asked to design a large system, the candidate who
identifies the core and *explicitly declines to over-engineer the generic parts* reads as
senior, because they are reasoning about where complexity pays off rather than treating every
component as a fresh modelling challenge. The trap to avoid is gold-plating a generic
subdomain — writing a bespoke auth system to show off — which signals the opposite of
judgement. Spend your budget on the core; buy the rest.

Worth reading in full: Eric Evans's free
[*Domain-Driven Design Reference*](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
(2015, CC-licensed) — the Distillation and Core Domain pattern summaries in the author's own
words, which is the right primary to cite when you want Evans's terms rather than a secondary
gloss of them.
