---
id: 01M3AE639BVG9XJC60NY5KGKZX
title: Strategic design
---

The half of Domain-Driven Design that is about the relationships *between* models rather than
the objects inside any one of them: where a model boundary goes, and how boundaries integrate
without coupling. Its vocabulary is the [[ubiquitous-language]] that reveals a boundary, the
[[bounded-context]] that draws one, the [[context-mapping|context map]] that governs the seams
between contexts, and the [[subdomains-and-distillation|subdomains]] that say where to spend
your modelling effort. This is the topic the system-design round reaches for: it turns a
hand-wavy "we'll split it into services" into a defensible answer to the two hardest questions
of a design round — *where do the boundaries go?* and *how do they talk without coupling?*

It is the counterpart of [[tactical-design]], which builds a single model inside one boundary.
The two are Evans's own seam and map onto two distinct interview moments. Note one provenance
flag that runs through this topic: the tidy core/supporting/generic subdomain trichotomy is
Vaughn Vernon's later refinement (2013/16), not literal 2003 Evans, who named only Core Domain
and Generic Subdomain — standard modern DDD, but not to be put in Evans's mouth.
