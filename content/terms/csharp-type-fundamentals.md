---
id: 01M1NJP99EAB2M40DDCZY82GP5
title: C# type fundamentals
---

What every value in a C# program actually is underneath the syntax: whether it lives inline in
its variable or behind a reference, how many bits it occupies and what those bits can and cannot
represent, and where the runtime spends an allocation you did not write. The topics filed here are
the ones an interviewer reaches for to check that you know the machine below the language — the
value/reference split that governs copying and equality, the numeric types and the precision each
one buys, and the way a date collapses to a single integer count of ticks.

The through-line is that a type's *representation* explains its *behaviour*: a struct copies
because it is the instance, `double` loses a cent because it is base-2, and `decimal` keeps it
because it is base-10. Reach for these when a question starts "what's the difference between…" or
"how is … stored".
