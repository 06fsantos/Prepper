---
id: 01M3AFD6RE53FN7F57DBGETJBH
title: Context-mapping patterns
topic:
  - strategic-design
---

The nine relationship patterns a [[context-mapping|context map]] can name on the seam between
two [[bounded-context|bounded contexts]]. Each is a different answer to "how does the
**downstream** context cope with the **upstream** one?" — the upstream's changes flow to the
downstream, which depends on it. The rows run cooperative → upstream/downstream →
defensive → no integration → anti-pattern.

| Pattern | Definition | When to reach for it | Provenance |
|---|---|---|---|
| **Partnership** | Two contexts (and their teams) succeed or fail together; they coordinate planning and joint-manage the integration so features and interfaces evolve in lockstep. | Mutual dependency between two teams with the communication bandwidth to stay synchronised. | Added in Evans's **2015 [*DDD Reference*](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)** — **not** in the 2003 blue book. |
| **Shared Kernel** | Two teams agree to share an explicit *subset* of the model — and its code/schema — as common ground; any change to it needs consultation because it ripples across both. | Small shared core, high-trust colocated teams; keep the shared part *small*. | Evans (2003). **A smell across service boundaries**: a shared library/schema reintroduces exactly the coupling microservices exist to avoid — a narrow-exception pattern now, not a default. |
| **Customer/Supplier** | Upstream ("supplier") and downstream ("customer") with a real co-dependency; the downstream's needs are a first-class item in the upstream's planning and backlog. | The upstream is willing and able to accommodate the downstream's needs. | Evans (2003), Part IV context mapping. |
| **Conformist** | The downstream *slavishly adheres* to the upstream model with **no translation** — trading the fit of its own model for zero integration friction. | The upstream won't cooperate and its model is good-enough; you accept it to save the translation cost. | Evans (2003), Part IV context mapping. |
| **Anti-Corruption Layer (ACL)** | An isolating translation layer the downstream builds so the upstream's model can **never leak into** its own; all cross-talk is translated at the seam. | Integrating a legacy or third-party system whose model you refuse to let infect yours. The most-cited strategic pattern. | Evans (2003), Part IV context mapping. |
| **Open Host Service (OHS)** | The upstream publishes a *stable, documented, general-purpose* protocol/API as a set of services for *many* downstreams, rather than a bespoke integration per consumer. | You are the upstream serving several consumers; standardise once instead of N one-offs. | Evans (2003), Part IV context mapping. |
| **Published Language** | A well-documented **shared interchange format** (a schema/language — historically XML DTDs, today JSON Schema, Avro, Protobuf, OpenAPI) used as the common tongue for model-to-model translation. Often paired with OHS. | Multiple parties need a stable contract to integrate against. | Evans (2003), Part IV context mapping. |
| **Separate Ways** | Decide the two contexts have *no* meaningful integration and cut it entirely, accepting duplication, because integrating costs more than it is worth. | Weak or no functional overlap; integration ROI is negative. | Evans (2003), Part IV context mapping. |
| **Big Ball of Mud** | Not a target — a *diagnosis*: a sprawling area with no consistent boundaries or model. You fence it off (often behind an ACL) and stop trying to model it cleanly. | Label the legacy morass honestly so you protect *new* contexts from it. | **Foote & Yoder ([1997/1999](http://www.laputan.org/mud/))**, adopted into the catalogue by Evans — he did not coin it. |

## What costs people points

- **OHS and Published Language travel together but are two things.** OHS is the *decision to
  publish one protocol for many consumers*; Published Language is *the documented format* that
  protocol speaks. Naming the pattern is the OHS half; naming JSON Schema / Protobuf / OpenAPI
  as the interchange contract is the Published Language half.
- **Conformist vs. ACL is the downstream's whole choice.** Both face an uncooperative
  upstream; the Conformist *adopts* its model wholesale, the ACL *translates* it away. Reaching
  for an ACL says the upstream model is bad enough to pay a translation layer to keep out.
- **Three attributions are the dated-DDD tells.** Partnership is a 2015 addition, so calling it
  "one of Evans's original patterns" is wrong; Big Ball of Mud is Foote & Yoder, not Evans; and
  Shared Kernel is now a smell across service boundaries rather than a neutral option. The other
  six are Evans (2003), Part IV.
