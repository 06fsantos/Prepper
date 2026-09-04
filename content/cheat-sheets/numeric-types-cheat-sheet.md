---
id: 01M1NJP99GV1V92JM1RC9TVQA3
title: Numeric types — cheat sheet
topic: numeric-types
---

- The defining split is **base**: `float`/`double` are base-2 (IEEE 754), `decimal` is base-10.
- `float`: 4 bytes, ~6–9 digits. `double`: 8 bytes, ~15–17 digits, huge range, hardware-fast.
  `decimal`: 16 bytes, 28–29 digits, base-10 exact, software-slow.
- `0.1` has **no exact binary form**, so `0.1 + 0.2 == 0.30000000000000004` as `double`; it is
  exactly `0.3` as `decimal`. Error compounds across arithmetic.
- **Money is `decimal`** (currency, rates, tax — precision set by digits after the point).
  Measurements and science are `double`.
- Literal suffix picks the type: `m` decimal, `f` float, bare/`d` double. No implicit mixing of
  `decimal` with `double`/`float`.
- Never `==` two `double`s for exactness — compare within a tolerance.

The reach-for-it signal: a total that is off by a cent → `double` money, switch to `decimal`.

Full treatment: [[decimal-double-and-float]].
