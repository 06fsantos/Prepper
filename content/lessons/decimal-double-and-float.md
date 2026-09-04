---
id: 01M1NJP99GCAM375JDRWYMXPK0
title: decimal versus double and float
topic:
  - numeric-types
---

"What's the difference between a `decimal` and a `double`?" is a question about *base*, not about
size or speed. `double` and `float` are **binary** floating-point: they store a number as a base-2
fraction times a power of two, following the IEEE 754 standard. `decimal` is **base-10** floating
point: it stores a base-10 fraction and a scale. That one difference decides which numbers each can
represent exactly, and therefore which one belongs on money.

## The three types, by the numbers

| Type      | Size     | Base | Precision       | Approx. range                    |
| --------- | -------- | ---- | --------------- | -------------------------------- |
| `float`   | 4 bytes  | 2    | ~6–9 digits     | ±1.5×10⁻⁴⁵ to ±3.4×10³⁸          |
| `double`  | 8 bytes  | 2    | ~15–17 digits   | ±5.0×10⁻³²⁴ to ±1.7×10³⁰⁸        |
| `decimal` | 16 bytes | 10   | 28–29 digits    | ±1.0×10⁻²⁸ to ±7.9×10²⁸          |

Read the columns as a trade. `double` buys enormous range and hardware speed for eight bytes;
`decimal` buys base-10 exactness and more significant digits for twice the storage and far slower,
software-implemented arithmetic. `float` is the same bargain as `double`, halved — reach for it only
when the storage of very large data sets genuinely matters.

```quiz 01M1NJP99G4B5A64PV87Y6BCQ3
The real difference between `double` and `decimal` is best stated as which of these?

- [x] `double` is base-2 floating point; `decimal` is base-10 floating point
  > That base difference is what governs which values each represents exactly — the crux of the question.
- [ ] `double` is approximate; `decimal` is a fixed-point exact integer
  > `decimal` is floating point too, not fixed point — it has a scale, not a fixed number of places.
- [ ] `double` is smaller and always faster; `decimal` is just a bigger `double`
  > Size and speed differ, but the defining difference is base-2 versus base-10, not the byte count.
```

## Why 0.1 cannot be a `double`

There is no finite base-2 fraction equal to 0.1, exactly as there is no finite base-10 fraction
equal to ⅓. So `0.1` stored as a `double` is really the nearest representable binary value, a hair
off. One value looks fine when printed; the error compounds across arithmetic:

```csharp
double d = 0.1 + 0.2;      // 0.30000000000000004
decimal m = 0.1m + 0.2m;   // 0.3  exactly
```

`decimal` represents 0.1 exactly because 0.1 *is* a finite base-10 fraction. This is why the docs
say `decimal` is for numbers "whose precision is determined by the number of digits to the right of
the decimal point" — currency, interest rates, tax. The failure mode with `double` money is a total
that is off by a cent after enough additions, and it is the specific bug the interviewer is probing
for.

```quiz 01M1NJP99GWAS3GTKAJ4534YD9 cloze
`0.1` has no exact {{binary}} representation, so a `double` stores the nearest value and the error
compounds — which is why money uses {{decimal}}, where 0.1 is exact.
```

## The rules that trip people

- **No implicit mixing.** You cannot combine `decimal` with `double`/`float` in one expression; the
  compiler forces an explicit cast, because the conversion can lose data either way.
- **The literal suffix picks the type.** `m`/`M` is `decimal`, `f`/`F` is `float`, and a bare
  `3.14` or `d`/`D` is `double`. `decimal rate = 0.05;` is a compile error — it needs `0.05m`.
- **`==` on floating point is a smell.** Because `double` values are approximate, compare within a
  tolerance rather than for exact equality. `decimal` equality is safe when both sides came from
  base-10 sources.

```quiz 01M1NJP99GYWY5ZAVF53BJJWWG
You need to store an account balance in a banking app. Which type, and why?

- [x] `decimal`, because base-10 storage keeps cents exact across arithmetic
  > Money is base-10; `decimal` represents 0.01 exactly and will not drift by a cent.
- [ ] `double`, because it is faster and has a wider range than `decimal`
  > Speed and range are irrelevant next to a balance that drifts; base-2 cannot hold cents exactly.
- [ ] `float`, because currency needs only a few significant digits
  > `float` has the worst precision of the three and is still base-2 — the wrong bargain for money.
```

## In an interview

Answer with the base first — "`double` is base-2, `decimal` is base-10" — then the consequence
(`0.1` is exact in one and not the other), then the rule (money is `decimal`, scientific and
graphics work is `double`). If you have time, add that `decimal` costs sixteen bytes and software
arithmetic, so it is not a free default. Reach for `decimal` on anything counted in a currency and
`double` on anything measured.

Primary source worth reading in full: the .NET reference on
[floating-point numeric types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types).
