---
id: 01M1924ABTC9PPE4PNHZAXG3N5
title: HTTP resilience
topic:
  - http-and-resilience
---

What you wrap around a call to a dependency you do not control — retry, circuit breaker,
timeout, bulkhead, hedging — and the order they have to go in. Each one is a bet about why the
call failed, so choosing between them is choosing which failure you think you are looking at.
