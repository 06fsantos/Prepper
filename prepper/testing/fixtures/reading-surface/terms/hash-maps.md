---
id: 01M0Z900000000000000000801
title: Hash maps
---

A hash map trades memory for a constant-time lookup.

## Where a hash map is slow

A resize copies every entry, and a bad hash turns every lookup into a walk. This heading
is here so that the Term page carries a table of contents as well as its generated index,
which is the pair the layout has to decide between.

## What a resize costs

Every entry is rehashed into a bigger bucket array. Two headings rather than one, because
upstream renders a table of contents only for a note that has more than one.
