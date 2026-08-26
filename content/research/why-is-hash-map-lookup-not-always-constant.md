---
id: 01M0Z7K6MVDQ43PYKCGNPXZSC2
title: Why is a hash map lookup not always constant time?
date: 2026-08-26
topic:
  - hash-maps
sources:
  - https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2
  - https://en.wikipedia.org/wiki/Hash_table
---

This is a Workshop note: it exists so that authoring has somewhere to put an
investigation, and the reader never sees it.

## The question

"`O(1)` average, `O(n)` worst case" is repeated everywhere. What has to be true for the
average to hold, and what breaks it?

## What I found

- The average rests on **uniform hashing** — keys spread evenly over buckets. It is an
  assumption about the hash function meeting the key distribution, not a property of the
  data structure.
- The **load factor** is the maintained invariant. .NET's `Dictionary` resizes to the next
  prime above twice the current bucket count once it fills.
- Worst case is adversarial, not accidental: colliding keys can be *constructed*, which is
  the hash-flooding DoS. Runtimes that expose hashes over the network seed them randomly.

## Dead ends

- Went looking for a documented .NET load-factor constant and there isn't a public one;
  the growth policy is an implementation detail and has changed between versions. Do not
  quote a number in an interview.
- Chased Robin Hood hashing and open addressing for a while. Interesting, and irrelevant
  to anything anyone will ask.

Distilled for the reader into [[hash-map-lookup-cost]].
