---
id: 01M3AFGYBSDDCR6RBXJ9PH47CQ
title: Carve bounded contexts for an online marketplace
kind: system-design
difficulty: hard
topic:
  - strategic-design
practices:
  - bounded-context
  - context-mapping
  - subdomains-and-distillation
---

## Prompt

A single-team online marketplace has grown into one large application, and the team wants to
pull it apart along boundaries it can defend rather than along whatever the code happens to
look like today. The system covers buyers browsing a catalogue, sellers listing goods, orders,
payments, shipping, product reviews, and fraud screening. You are asked to do three things and
to justify each one, not just assert it. First, identify the business's subdomains and say
which are the reason this company wins, which merely support it, and which are solved problems.
Second, propose the boundaries the software should be split along, and defend each one from the
business language rather than from the current tables. Third, describe how the resulting pieces
depend on and talk to each other — for every seam, which side leads, and what shape the
integration takes.

## Constraints

- One team owns everything today; the split is about model boundaries and future team ownership,
  not an immediate reorg.
- The same word means different things to different people, and that divergence is a given, not
  a modelling mistake to be normalised away — "order" to a buyer is a purchase they placed, and
  "order" to a seller is a fulfilment record they work; "user" is a buyer to the storefront, a
  seller to the listings side, and an account with credentials to whatever signs people in.
- Payments and identity touch money and security and are subject to obligations (PCI, auth) the
  team does not want to reinvent.
- There is no single right answer. A defensible decomposition with named seams beats a
  "complete" one asserted without reasons.

## Hints

1. Before drawing any box, list the places where one word carries two meanings. Each such place
   is a candidate boundary — the ambiguity is the signal, not the noise.
2. Sort the pieces by *why the business exists* before sorting them by size. The part a
   competitor could not simply buy is the part that decides where your best people go.
3. A boundary is only half the answer. For each pair of boxes that must talk, decide who leads
   and who follows, and whether the follower adopts the leader's model, translates it at the
   seam, or walks away from the integration entirely.

## Solution

This walks **one** defensible decomposition end to end — subdomains first, then the contexts
they motivate, then the context map with a named pattern on every seam. Another senior engineer
could carve it differently and defend it; what matters is that every boundary is argued from the
language and every seam names who leads and how the follower copes. The three moves are the
three things [[subdomains-and-distillation]], [[bounded-context]], and [[context-mapping]] each
own.

### Step 1 — Subdomains, and where to spend

Start in the **problem space**: what does this business actually do, and which parts of it are
the reason it beats a competitor? The three-way triage into **core / supporting / generic** —
the tidy symmetric split and the term "supporting subdomain" — is Vaughn Vernon's codification
of DDD; Evans's 2003 original named the **Core Domain** and the **Generic Subdomain** under
distillation, and Vernon later crystallised the middle category. It is what interviewers expect,
so use it, but attribute it rather than putting it in Evans's mouth. The point of the exercise
is [[subdomains-and-distillation|deciding where not to spend]] as much as where to.

- **Core.** For a marketplace the differentiators are **search and discovery / ranking** (which
  listings a buyer sees, in what order) and **matching supply to demand** — including the
  **fraud/trust** models that keep the market safe enough to use. These are what a rival cannot
  simply buy off the shelf; this is where the strongest people and the most careful modelling go,
  behind the firmest boundaries.
- **Supporting.** **Catalogue/listings**, **orders**, and **reviews** are necessary and specific
  to how this marketplace works, but they are not the differentiator. Build them, keep them
  in-house, but do not over-invest — they exist to let the core do its job.
- **Generic.** **Payments**, **identity/accounts**, **shipping/logistics**, and **notifications**
  are solved problems many businesses share. Buy or rent them — a payment gateway (Stripe/Adyen),
  a managed auth provider, a carrier/3PL for shipping — rather than hand-crafting what confers no
  advantage. Building your own generic subdomain spends complexity where it earns nothing.

Subdomains live in the problem space; the bounded contexts in step 2 live in the solution space.
The mapping is *ideally* one context per subdomain but is never guaranteed, and the reason to
keep the two ideas apart is that the triage tells you where to invest and the boundaries tell you
how to cut.

### Step 2 — Bounded contexts, drawn where the language changes

Now the **solution space**. The governing rule is [[bounded-context|draw the boundary where the
ubiquitous language changes meaning]] — where the same word stops referring to the same thing.
The marketplace hands us two textbook divergences:

- **"Order" splits in two.** To a buyer, an order is a **purchase**: a cart checked out, a total
  paid, a thing to track. To a seller, the "order" is a **fulfilment record**: line items to pick,
  pack, and ship, tied to inventory and a payout. These are two models of one word, and forcing
  them into one `Order` table is the classic failure — a bloated entity serving two masters that
  drift apart. So: a **Purchasing / Checkout** context owns the buyer's order, and an **Order
  Fulfilment / Seller** context owns the seller's. They are related but not the same model, and
  each stays internally consistent.
- **"User" splits three ways.** The storefront's **buyer** (preferences, cart, purchase history),
  the listings side's **seller** (storefront, payout account, ratings), and the thing that
  authenticates a human — an **account with credentials**. Rather than one god-like `User`, an
  **Identity / Accounts** context owns authentication and the account, and both Buyer and Seller
  are *profiles* that reference an account by identity. "Seller" and "buyer" are roles in their
  own contexts; "account" is the identity context's word.

That yields a decomposition roughly like:

1. **Identity / Accounts** (generic) — authentication, the account, credentials.
2. **Catalogue / Listings** (supporting) — products, sellers' listings, inventory, the
   seller-facing model of a "product".
3. **Search & Discovery** (core) — indexing, ranking, recommendations; the buyer-facing view of
   what exists.
4. **Purchasing / Checkout** (supporting) — the buyer's cart and order, pricing at checkout.
5. **Order Fulfilment** (supporting) — the seller's fulfilment record, pick/pack/ship state.
6. **Payments** (generic) — charging, payouts, refunds; wraps the external gateway.
7. **Shipping / Logistics** (generic) — rates, labels, tracking; wraps the carrier/3PL.
8. **Reviews & Ratings** (supporting) — buyer reviews of products and sellers.
9. **Trust & Safety / Fraud** (core) — screening orders and accounts, risk scoring.

Each context **owns its model and its data** and exposes contracts to its neighbours — which is
almost word for word the definition of a well-designed service. That is deliberate, and it is the
bridge step 3 leans on.

### Step 3 — The context map: who leads, and how the follower copes

A [[context-mapping|context map]] names every context and the **relationship** on each seam — the
direction of dependency (**upstream** leads, **downstream** follows) and the integration
**pattern** that governs it. Its whole value is making explicit the integrations that otherwise
accrete by accident. The nine patterns live in [[context-mapping-patterns]]; the seams that
matter here:

- **Payments is wrapped in an Anti-Corruption Layer.** The external gateway has its own model —
  its own idea of a "charge", a "customer", a "dispute". Purchasing and Fulfilment must never let
  that vocabulary leak inward, so the Payments context is an **ACL**: all cross-talk is translated
  at the seam, and if you swap Stripe for Adyen tomorrow, only the ACL changes. The gateway is
  upstream and indifferent to us; the ACL is how a downstream refuses to be corrupted by an
  upstream it does not control. The same shape wraps **Shipping** around the carrier API.

- **Search & Discovery is downstream of Catalogue, and consumes it as a Conformist or via events.**
  Search does not own products; it indexes them. Catalogue is upstream. The cheap option is
  **Conformist** — Search adopts Catalogue's product model wholesale to avoid translation cost —
  but because Search is *core*, the better answer is event-driven: Catalogue publishes
  product-changed events and Search maintains its own read-optimised index, inverting the
  dependency so a slow indexer never stalls a listing edit. (Domain events crossing a context seam
  are taught tactically in [[domain-events]]; here they are the integration mechanism.)

- **Identity is an Open Host Service with a Published Language.** Several contexts need "who is
  this account" — Buyer, Seller, Purchasing, Reviews, Fraud. Rather than a bespoke integration per
  consumer, Identity publishes a **stable, documented, general-purpose** service (**Open Host
  Service**) speaking a **Published Language** — a versioned auth/account contract (OIDC tokens, a
  documented account schema). One upstream, many downstreams, one contract instead of N one-offs.
  Payments similarly acts as an OHS to Purchasing and Fulfilment (charge on checkout, payout on
  fulfilment).

- **Purchasing → Fulfilment is Customer/Supplier.** When a buyer's order is placed, it becomes a
  seller's fulfilment record. Purchasing is upstream (the order originates there) and Fulfilment
  downstream, but this is an *internal* seam where the upstream is willing to accommodate the
  downstream's needs — so **Customer/Supplier**, with Fulfilment's requirements a first-class item
  in Purchasing's backlog, rather than Conformist. The handoff is an order-placed event carrying
  just what fulfilment needs, translated into the fulfilment model on arrival.

- **Fraud reads broadly and is deliberately coupled loosely.** Trust & Safety needs signals from
  Purchasing, Identity, and Fulfilment. It sits downstream of all three and consumes their
  published events — never reaching into their databases — so that adding a new signal is a new
  subscription, not a new coupling.

- **Reviews and the recommendation side of Search go Separate Ways where integration is not worth
  it.** Reviews needs product identity and buyer identity, and that is all; it does **not** need to
  integrate with Fulfilment's internal state. Where two contexts have weak or no functional overlap
  and the integration would cost more than it returns, the honest choice is **Separate Ways** — cut
  the seam, accept a little duplication. Naming a non-integration explicitly is as much a
  context-map decision as naming an integration.

Two provenance flags worth stating so the answer does not read as frozen in 2003: **Partnership**
(two contexts that succeed or fail together and joint-manage the seam) is a **2015 addition** to
Evans's *DDD Reference*, not in the original blue book — you could argue Purchasing and Fulfilment
into a Partnership if the same sub-team owned both, but Customer/Supplier is the cleaner call while
one team owns everything. And **Big Ball of Mud** — the diagnosis you apply to a legacy morass you
fence off behind an ACL rather than try to model — was coined by **Foote & Yoder (1997/99)** and
only *adopted* into Evans's catalogue; if the current monolith's tangled middle cannot be cleanly
carved, that is what you label it, and you protect the new contexts from it. A last modern caution:
**Shared Kernel** — two contexts sharing a subset of model and code — is the pattern to avoid here.
It looks tempting for the shared "product id" or "money" types, but a shared library across future
services reintroduces exactly the coupling the split exists to remove; prefer a Published Language
at the seam over a Shared Kernel through the middle.

### The map in one breath

Identity and Payments are **open host services** the rest integrate against through a **published
language**; the two external providers (gateway, carrier) sit behind **anti-corruption layers**;
Catalogue feeds **core** Search through events; Purchasing hands off to Fulfilment as
**customer/supplier**; Fraud subscribes to everyone's events; and Reviews goes **separate ways**
from the parts it does not need. Every seam has a leader, a follower, and a named way the follower
copes — which is the whole job.

## Follow-ups

- **Where do the best engineers go?** The triage says *core* — Search & Discovery and Trust &
  Safety — is where differentiation lives, so that is where the strongest people and the most
  careful boundaries belong, while the generic subdomains (payments, identity, shipping) are bought
  or rented. Defend that allocation: what is the cost of a mediocre ranking model versus a mediocre
  notification service, and would you ever staff a *generic* context heavily? (Only if it stopped
  being generic — if your logistics became a competitive weapon, it has migrated toward core.)

- **When does one context become several services?** A bounded context is the *starting*
  granularity for a service, not the final one — and this bridge from context to microservice is
  **Sam Newman's**, not Evans's, and it is explicitly **not one-to-one**: one context may be
  composed of several services, but a single service should never straddle two contexts. Begin
  coarse, at context-sized services, and split further only under real pressure — independent
  scaling (Search's index vs. its query side), separate deployment cadence, or a team-ownership
  boundary (Conway's law: the context boundary tends to follow the team boundary, and you can pick
  team structure to force the architecture you want). Which of the nine contexts here would you
  expect to split first, and on which of those three pressures?

- **What if the same word diverges again later?** Suppose "inventory" starts meaning one thing to
  Catalogue (what's listed) and another to Fulfilment (what's physically on a shelf). That is the
  same signal that split "order" — a new boundary announcing itself in the language. Would you carve
  a new context, or is this a case for keeping one context and two models inside it?
