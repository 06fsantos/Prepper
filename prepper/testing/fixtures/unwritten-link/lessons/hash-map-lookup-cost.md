---
id: 01M0Z900000000000000000201
title: What a hash map lookup actually costs
topic:
  - hash-maps
---

A lookup reads one bucket, and [[hash-maps]] says what a bucket is. That note exists.

## What is not written yet

Collisions are handled two ways, and neither has a note: [[open-addressing]] is one, and
[[robin-hood-hashing|Robin Hood hashing]] is a refinement of it. Writing them is the
point of leaving the links here.

The same gap can be pointed at twice — [[open-addressing]] again — without becoming two
gaps.

## What an embed does instead

![[cuckoo-hashing]]

## What is generated rather than written

Neither of these is a note anybody can write, and neither is missing: #hashing is a tag,
and [[terms/]] is a folder. Quartz generates a page for each at emit time.
