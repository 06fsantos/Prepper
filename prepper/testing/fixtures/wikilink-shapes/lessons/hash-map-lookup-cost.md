---
id: 01M0Z900000000000000000101
title: What a hash map lookup actually costs
topic:
  - hash-maps
---

A lookup hashes the key and reads one bucket, so its cost does not grow with the number
of entries. The note on [[hash-maps]] says what a bucket is.

## The shapes a link comes in

Obsidian lets the same target be written several ways, and every one of them has to reach
the same page:

- case is not significant, so [[Hash-Maps]] is the same note;
- the extension is optional, so [[hash-maps.md]] is too;
- the pipe fits the text to the sentence, so a lookup is a [[hash-maps|hash table]] read;
- an anchor points into the page, as [[hash-maps#Load factor]] does.

![[bucket-diagram.png]]
