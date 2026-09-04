---
id: 01M1PD1VA4DE10TZ9GHM3KE3N6
title: A reading order for C# fundamentals
topic:
  - value-and-reference-types
  - records-structs-and-modifiers
  - equality-and-hashing
  - delegates-and-closures
  - generics
  - garbage-collection
  - linq-and-deferred-execution
---

Everything the vault holds about the C# a senior interview actually probes, in the order that makes
each note land — where a value lives and what an assignment copies, then the ways to declare a type
on top of that distinction, then how equality is decided and why a broken hash corrupts a
dictionary, then what a lambda captures and what it costs, then how the JIT specialises a generic,
then what the collector does with what you leave behind, and finally why a LINQ query does nothing
until you iterate it. The vault carries no reading order of its own: `prerequisites` is a graph and
there are no lesson numbers. This is one path through that graph, and where a note disagrees with
this page the note wins.

The shape worth noticing before starting: **the first note is under everything else**. Whether a
type is a value type or a reference type decides what a copy copies, what default equality compares,
where an allocation happens, and what the collector ever sees — so [[value-types-versus-reference-types]]
is not an introductory chapter to be skipped, it is the thing the twenty-one notes below it are
about from seven different angles. Read it slowly; every "why" later resolves back to it.

The second thing worth noticing: **the seven topics are read in dependence order, not in the order
an interviewer asks them**. Generics come after boxing because the payoff of runtime specialisation
is "a `List<int>` never boxes"; the closure notes come before the GC notes but the GC notes explain
where the closure's captured local actually went. Each topic is placed where the one before it makes
it readable, which is not the order the questions arrive in.

## The order

| #   | Read                                       | Topic                       | Why here                                                                                                                             |
| --- | ------------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [[value-types-versus-reference-types]]     | Value & reference types     | The root. What a variable holds, what an assignment copies, and where the instance lives. Everything below is a consequence         |
| 2   | [[boxing-and-unboxing]]                     | Value & reference types     | The bridge between the two categories, and the hidden allocation a value type pays to become an `object`. Step 13 needs this        |
| 3   | [[nullable-value-types]]                    | Value & reference types     | `Nullable<T>` as a struct, not a reference — the last piece of the value/reference picture before it is built on                     |
| 4   | [[class-struct-record-and-record-struct]]   | Records, structs, modifiers | The four ways to declare a type, and which copy and compare by value. The first design choice built on step 1                       |
| 5   | [[readonly-and-ref-struct]]                 | Records, structs, modifiers | The two modifiers that confine a struct — one forbids mutation, one forbids the heap. Read after 4: it tunes what 4 introduced       |
| 6   | [[in-ref-and-out-parameters]]               | Records, structs, modifiers | Passing a value by reference, and the three modes that say why. Last of the type layer because `in` is a `readonly ref` from step 5 |
| 7   | [[the-equals-and-gethashcode-contract]]     | Equality & hashing          | The contract every hash-based collection assumes. A hinge: nothing above needs it and everything in this topic does                 |
| 8   | [[equals-versus-the-equality-operator]]     | Equality & hashing          | Why `==` and `Equals` can disagree — one is static and bound at compile time, one is virtual. Read after 7's contract               |
| 9   | [[why-a-mutable-key-corrupts-a-dictionary]] | Equality & hashing          | The contract from 7, broken: a key whose hash changes after insert is lost in its own bucket. The interview payoff of this topic     |
| 10  | [[how-a-lambda-captures-a-variable]]        | Delegates & closures        | Where a captured local goes — hoisted onto a heap object so it outlives the frame. The first note that spends an allocation you wrote |
| 11  | [[the-cost-of-a-closure]]                    | Delegates & closures        | What that hoisting costs, and when the compiler can avoid it. Straight after 10: it prices what 10 described                        |
| 12  | [[delegates-events-and-multicast]]          | Delegates & closures        | A delegate as a type-safe method reference, and the multicast invocation list an event is built on. Rounds out the topic            |
| 13  | [[how-generics-are-specialised-at-runtime]] | Generics                    | Why C# generics are not erasure: the JIT reifies a distinct body per value type, which is why `List<int>` never boxes. Needs step 2 |
| 14  | [[generic-constraints-and-default]]         | Generics                    | `where T :` and what `default(T)` is for a struct versus a class. Read after 13, because a constraint is what the JIT specialises on |
| 15  | [[variance-in-generic-interfaces]]          | Generics                    | `in`/`out` on a type parameter, and why `IEnumerable<T>` is covariant but `List<T>` is not. The subtlest generics question          |
| 16  | [[the-generational-heap]]                    | Garbage collection          | Where a reference-type object is born and what promotes it through the generations. The prerequisite the other three GC notes name  |
| 17  | [[the-large-object-heap]]                    | Garbage collection          | The separate heap for large allocations, why it is not compacted, and the fragmentation that follows. Read after 16                 |
| 18  | [[dispose-and-finalizers]]                   | Garbage collection          | Deterministic cleanup versus the finalizer queue — what the collector does *not* do for you. Needs the generations from 16          |
| 19  | [[span-and-stackalloc]]                      | Garbage collection          | Keeping a buffer off the heap entirely — the payoff of everything above, and where `ref struct` from step 5 earns its confinement   |
| 20  | [[deferred-execution-in-linq]]              | LINQ & deferred execution   | The defining behaviour: a query describes work and runs nothing until iterated. The prerequisite for the other two LINQ notes       |
| 21  | [[iqueryable-versus-ienumerable]]           | LINQ & deferred execution   | The same query, in memory or translated to SQL, decided by which interface it stands on. Read after 20                             |
| 22  | [[the-multiple-enumeration-trap]]           | LINQ & deferred execution   | The bug deferred execution invites: iterating the same query twice does the work twice. The one to close on                        |

Steps 1–3 are one sitting and they are the foundation the whole subject rests on — do not rush them.
Steps 4–6 are the type-declaration layer and steps 7–9 the equality one; each is a self-contained
interview on its own. Steps 10–12 (closures) and 13–15 (generics) are best read as pairs of sittings
close together, because 13 pays back the allocation 10 spent. Steps 16–19 are one continuous run
about the heap and are best read together rather than a week apart. Steps 20–22 are the shortest
topic and a good one to end on.

## From another topic — look this up rather than blocking on it

- [[hash-map-lookup-cost]] — the vault records it as a prerequisite of step 9, but it lives in the
  data-structures topic, not here. It is the O(1)-average bucket-and-probe mechanism that step 9's
  corruption breaks. If hash tables are already familiar, read step 9 straight through and only open
  this if the phrase "same bucket" does not land.

## The night before

[[value-and-reference-types-cheat-sheet]], [[records-structs-and-modifiers-cheat-sheet]],
[[equality-and-hashing-cheat-sheet]], [[delegates-and-closures-cheat-sheet]],
[[generics-cheat-sheet]], [[garbage-collection-cheat-sheet]] and
[[linq-and-deferred-execution-cheat-sheet]] — one per topic. A reading order is for the fortnight
before; a cheat sheet is for the morning of.
