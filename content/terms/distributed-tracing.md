---
id: 01M1924ABTGAHMTWHH7J32TMYR
title: Distributed tracing
topic:
  - http-and-resilience
---

Correlating one logical request across every service and every attempt it produced. A trace id
groups the whole chain, a span id identifies each attempt, and W3C Trace Context is the header
format that carries both between processes.
