---
id: 01M3AFQJNBFQRGFANAQGZK94RN
title: A reading order for Domain-Driven Design
topic:
  - strategic-design
  - tactical-design
---

Everything the vault holds about Domain-Driven Design, in the order that makes each note land —
first where a model boundary goes and how boundaries integrate, then how a single model is built
inside one of those boundaries. The vault carries no reading order of its own: `prerequisites` is a
graph and there are no lesson numbers. This is one path through that graph, and where a note
disagrees with this page the note wins.

The shape worth noticing before starting: **strategic comes before tactical**. Strategic design is
about the relationships *between* models — where the line goes and how two sides of it talk without
coupling — and tactical design is about the objects *inside* one model, once the line is drawn. You
can read them the other way and lose nothing on the individual notes, but boundaries-first is the
order in which each note is easiest to see, because an aggregate is a consistency boundary inside a
context, and the context is what step 2 draws.

The second thing worth noticing: **each topic is a spine with two forks**. Strategic is
`ubiquitous-language → bounded-context → {context-mapping, subdomains-and-distillation}` — the
language is *why* a boundary exists, so it comes first, and the context map and the subdomain triage
are two independent things you do once the boundary is there. Tactical is the same shape:
`entities-and-value-objects → aggregates → {repositories, domain-events}` — the equality
distinction underlies the aggregate, and the repository (how you fetch it) and the domain event
(what it publishes) are two independent things you do once you have one. The forks are read in
sequence here only because a page has one order; the graph says they do not depend on each other.

## The order

| # | Read | Why here |
|---|---|---|
| 1 | [[ubiquitous-language]] | The language the domain experts and the code share, and how a place where two teams mean different things by one word reveals a boundary. First because it is *why* boundaries exist — the vault records no prerequisite for it, and everything below is downstream of the idea that the words come first |
| 2 | [[bounded-context]] | The boundary itself: the scope within which one model and one language are consistent. Read straight after 1 because a bounded context is the answer to the question step 1 raises — where does this word stop meaning this thing — and it is the note both strategic forks below depend on |
| 3 | [[context-mapping]] | How two bounded contexts integrate without coupling: upstream and downstream, and the relationship pattern on each seam. One of the two things you do once boundaries exist; read before 4 only because integration is the half of strategic the system-design round pushes hardest on |
| 4 | [[subdomains-and-distillation]] | Where to spend the effort: sorting the domain into core, supporting and generic, and investing accordingly. The other independent fork off step 2 — it needs the boundary but nothing from the context map, so it can equally be read before 3 |
| 5 | [[entities-and-value-objects]] | The switch into tactical, and the first thing to settle inside a boundary: which objects have identity over time and which are defined only by their attributes. A tactical root — the vault records no prerequisite for it — and the equality distinction the aggregate is built on |
| 6 | [[aggregates]] | The consistency boundary inside the model: a cluster of objects with one root and one transaction. The one place this Plan reaches outside the two DDD topics — the vault names [[consistency-models]] as a prerequisite here, because the rule that consistency is synchronous inside the aggregate and eventual outside it is unreadable without it. **Read [[consistency-models]] first if you have not.** |
| 7 | [[repositories]] | How you fetch and persist an aggregate — the illusion of an in-memory collection over one aggregate root. Read after 6 because a repository is defined per aggregate root, so the aggregate has to be in place before the thing that stores it makes sense |
| 8 | [[domain-events]] | What an aggregate publishes when something the experts care about happens, and the seam by which one context tells another without a synchronous call. Read after 6 alongside 7 as the second independent fork; it is also where tactical meets strategic again, since an event crossing a context boundary is the low-coupling integration step 3 was about |

Steps 1–2 are one sitting and they are the core of the strategic vocabulary on their own. Steps 3–4
are the rest of strategic and are the run the system-design round reaches for — "where do the
service boundaries go, and how do they talk without coupling?" Steps 5–8 are tactical and are the
run the code/design round reaches for; 5–6 are the spine and 7–8 are best read together, because a
repository fronts the aggregate and a domain event leaves it, and both are things the aggregate in
step 6 has that the objects in step 5 do not.

## Look these up rather than reading them

- [[context-mapping-patterns]] — the full nine-pattern context-map catalogue (Partnership, Shared
  Kernel, Customer/Supplier, Conformist, Anti-Corruption Layer, Open Host Service, Published
  Language, Separate Ways, Big Ball of Mud), each with its definition, when to reach for it, and its
  provenance. Open it at step 3 and leave it open: the [[context-mapping]] Lesson teaches how a
  context map works and two or three headline patterns in prose, and this is the grid it links to
  rather than cataloguing all nine.

## Practice checkpoint

The ninth and last step is practice, not reading: [[carve-bounded-contexts-for-an-online-marketplace]].
A single-team marketplace — buyers, sellers, catalogue, orders, payments, shipping, reviews, fraud —
is being pulled apart, and the task is the whole strategic decision end to end: find the subdomains
and triage them core/supporting/generic (step 4), propose the bounded contexts and justify each one
from where the language changes — the two meanings of "order," of "user" (steps 1–2), then draw the
context map and name the relationship on every seam (step 3). It is the strategic run's capstone:
steps 1–4 teach the vocabulary one piece at a time, and this is where they stop being four separate
notes.

## On language: this subject is concept-level

Most of what this vault teaches is .NET-scoped, and a Plan is where that is normally flagged
step by step. This one is the exception, and it is worth saying plainly rather than leaving the
reader to infer it from an absent code fence: **Domain-Driven Design is a modelling discipline, not
a runtime feature, and none of these eight notes is about a language.** There is no Scope column
because no step earns one — the ideas transfer to any language with objects and types.

Two steps carry a one-line implementation aside, and only those two, so here is what each maps to
elsewhere:

| The aside | Where it points |
|---|---|
| Step 5 shows a value object as a C# `record` | The same instinct — a small immutable type compared by its contents — is a Java `record`, a Kotlin `data class`, a Scala `case class`, a Python `@dataclass(frozen=True)`, or a struct compared by value. The point is value equality, and every one of these gives it to you |
| Step 7 names Entity Framework Core's `DbContext` and `DbSet<T>` as the repository-shaped API you already use | The pattern is language-agnostic: it is Spring Data's `Repository` in Java, a repository over an ORM session in Python (SQLAlchemy) or Ruby (ActiveRecord is the pattern turned inside out), and any hand-written collection-shaped interface over a data store. What EF Core gives for free is the collection illusion step 7 is about |

Everything else — the boundary, the map, the subdomain triage, the aggregate, the event — is the
same in any stack. If the interview is not a .NET interview, nothing here is scoped away; only those
two asides are, and they are examples, not the subject.

## The night before

[[strategic-design-cheat-sheet]] and [[tactical-design-cheat-sheet]] — the boundary-finding
heuristic and the context-map names on one, the entity-versus-value-object call and the aggregate
rules on the other. A reading order is for the fortnight before; a cheat sheet is for the morning of.
