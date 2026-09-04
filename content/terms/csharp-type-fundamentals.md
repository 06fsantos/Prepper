---
id: 01M1NJP99EAB2M40DDCZY82GP5
title: C# fundamentals
---

The C# a senior interview actually probes: not syntax, but how the language sits on the runtime
beneath it — where a value lives and what an assignment copies, when the compiler or the JIT spends
an allocation you did not write, how equality and dispatch are decided, and what the garbage
collector does with what you leave behind. The topics filed here are the ones an interviewer reaches
for to check that you know the machine below the language rather than the keywords on top of it.

The through-line is that *representation and mechanism* explain *behaviour*: a struct copies because
it is the instance, a mutable dictionary key is lost because its hash was taken once at insert, a
`List<int>` never boxes because the JIT reifies value-type generics, and a captured local moves to
the heap because a lambda needs it to outlive the stack frame. Reach for these when a question
starts "what's the difference between…", "how is … stored", or "what does that cost".
