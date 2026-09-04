---
id: 01M1NJP99G6WAZJZP6C8C08540
title: How a DateTime is represented
topic:
  - dates-and-times
prerequisites:
  - value-types-versus-reference-types
---

A `DateTime` looks like a bundle of year, month, day, hour and so on, but it is not stored that
way. It is a **value type** holding a single 64-bit number: a count of **ticks**, where one tick is
100 nanoseconds, measured from midnight on 1 January of year 1 in the Gregorian calendar. Every
property you read — `.Year`, `.Hour`, `.DayOfWeek` — is computed from that one integer on demand.
Because it is a struct, the whole thing is eight bytes copied by value, with no heap allocation.

```csharp
DateTime d = new DateTime(2008, 5, 1, 8, 30, 52);
long ticks = d.Ticks;   // 100-nanosecond intervals since 0001-01-01 00:00:00
```

The tick count fixes the range: from `DateTime.MinValue`, midnight on 0001-01-01, to
`DateTime.MaxValue`, the last tick of 9999-12-31. There are 10,000 ticks in a millisecond, which is
the conversion you actually use when reading a raw tick number.

```quiz 01M1NJP99G9WMMBATFAN7DT31Q
Internally, what does a `DateTime` store?

- [x] A single 64-bit tick count of 100-nanosecond intervals since year 1
  > All the calendar fields are computed from that one integer; nothing stores year/month separately.
- [ ] Separate integer fields for year, month, day, hour, minute and second
  > Those are computed on read from the tick count, not stored as fields.
- [ ] A reference to a shared calendar object on the heap
  > `DateTime` is a value type holding an integer inline; there is no heap object.
```

## The other two bits: Kind

A `DateTime` also carries a `DateTimeKind` — `Utc`, `Local`, or `Unspecified` — saying what the
ticks *mean*. This is the part that bites. `Unspecified` is the default for a `DateTime` you build
yourself, and it means the value carries no time-zone information at all: the runtime will not
convert it, and two `Unspecified` values from different zones compare as if they were the same zone.

In the reference implementation the ticks and the `Kind` share one 64-bit field — the ticks need
62 bits, and the top two carry the `Kind` — so the "single 64-bit value" and "it also stores a
Kind" are the same eight bytes, not a contradiction. Treat that packing as an implementation
detail; the contract is simply "a tick count plus a Kind".

```quiz 01M1NJP99GNNMPZFGQ2AYY4CR5 cloze
Beyond the tick count, a `DateTime` carries a {{DateTimeKind}} — Utc, Local or Unspecified — and the
default for one you construct yourself is {{Unspecified}}, which carries no time-zone information.
```

## Why DateTimeOffset usually wins

Because `Kind` is a three-way tag rather than a real offset, a bare `DateTime` cannot say *which*
offset from UTC it represents — only the vague category. `DateTimeOffset` fixes this: it stores the
same tick count **plus an explicit `TimeSpan` offset from UTC**, so the instant it names is
unambiguous no matter where it is read. The senior guidance is to store and pass `DateTimeOffset`
(or a UTC `DateTime` you are disciplined about) and to reserve `Unspecified` for genuinely
zone-less wall-clock values like a store's opening time.

```quiz 01M1NJP99G0XFNG4BE3TT6HCPA
Why prefer `DateTimeOffset` over `DateTime` for a timestamp that crosses machines?

- [x] It stores an explicit UTC offset, so the instant is unambiguous everywhere
  > The extra `TimeSpan` offset pins the moment, unlike `DateTimeKind`'s vague three-way tag.
- [ ] It stores ticks at higher resolution than `DateTime` does
  > Both use the same 100-nanosecond tick; resolution is identical, not the reason.
- [ ] It is a reference type, so it survives being passed between machines
  > Both are value types; the difference is the stored offset, not heap versus stack.
```

## In an interview

Lead with "a 64-bit tick count of 100-nanosecond intervals since year 1, plus a `Kind`." That one
sentence answers the memory question and sets up the real discussion: `Kind` being `Unspecified` by
default is the bug factory, and `DateTimeOffset` is the fix because it stores a real offset instead
of a category. Reach for this whenever a timestamp is wrong by exactly some number of whole hours —
that is almost always a `Kind` or time-zone mistake, not a clock one.

Primary source worth reading in full: the .NET API reference for
[System.DateTime](https://learn.microsoft.com/en-us/dotnet/api/system.datetime).
