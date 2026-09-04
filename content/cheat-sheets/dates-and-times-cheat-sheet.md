---
id: 01M1NJP99GYDMH4PMBGSCHZEEC
title: Dates and times — cheat sheet
topic: dates-and-times
---

- `DateTime` is a **value type** (8 bytes): a 64-bit **tick count**, one tick = 100 ns, measured
  from midnight 0001-01-01. Every calendar property is computed from it. 10,000 ticks = 1 ms.
- Range: `MinValue` (0001-01-01) to `MaxValue` (end of 9999).
- It also carries a **`DateTimeKind`**: `Utc`, `Local`, or `Unspecified`. Default when you
  construct one is **`Unspecified`** — no time-zone info, no conversion, the bug factory.
- `DateTimeOffset` = the same ticks **plus an explicit UTC offset**, so the instant is unambiguous.
  Prefer it (or disciplined UTC `DateTime`) for anything crossing machines.
- Ticks + Kind share one 64-bit field in the runtime (top 2 bits = Kind) — an implementation
  detail, not the contract.

The reach-for-it signal: a timestamp wrong by a whole number of hours → a `Kind`/time-zone bug, not
a clock one.

Full treatment: [[how-datetime-is-represented]].
