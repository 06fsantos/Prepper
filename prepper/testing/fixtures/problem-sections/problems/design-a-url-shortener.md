---
id: 01M0Z900000000000000000905
title: Design a URL shortener
topic:
  - interviewing
kind: system-design
difficulty: hard
practices:
  - hash-map-lookup-cost
---

## Prompt

Design a service that turns a long URL into a short one and redirects on the short one.

## Solution

A key generator, a store keyed by the short code, and a cache in front of the read path.
There is no `## Complexity` here, and a system-design problem does not require one.
