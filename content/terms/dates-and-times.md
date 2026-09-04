---
id: 01M1NJP99F5ANFE3DZ6D8S1R2X
title: Dates and times
topic:
  - csharp-type-fundamentals
---

How .NET represents an instant: `DateTime` as a single 64-bit count of 100-nanosecond ticks since
year 1, tagged with whether those ticks mean UTC, local, or nothing in particular — and the ways
that last tag quietly corrupts a value that crosses a time zone.
