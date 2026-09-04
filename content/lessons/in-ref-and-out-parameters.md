---
id: 01M1P5HK4G57NDZNQBJJREQ7WH
title: in, ref, and out parameters
topic:
  - records-structs-and-modifiers
prerequisites:
  - value-types-versus-reference-types
  - readonly-and-ref-struct
---

By default a C# argument is passed **by value** — the method gets a copy, and for a value type that
means the whole instance is copied in. Three modifiers change that, and each passes the argument **by
reference** so the method works on the caller's own variable. They differ only in what the method is
allowed to do with it:

- **`in`** — pass by reference, **read-only**. The method may read the argument but not assign to it.
- **`ref`** — pass by reference, **read-write**. The argument must be initialised by the caller, and
  the method may read *and* write it.
- **`out`** — pass by reference, **write-only obligation**. The argument need not be initialised, and
  the method *must* assign it before returning.

All three require the modifier at **both** the declaration and the call site (`out` and `in` can be
inferred at the call in modern C#, but writing them keeps intent visible), which is what makes
by-reference passing something the reader can see rather than guess.

```csharp
void Bump(ref int x) => x++;          // reads and writes the caller's variable
bool TryParse(string s, out int v);   // must assign v on every path
decimal Total(in Order o);            // may read o, may not reassign it
```

```quiz 01M1P5HK4GEQ303YH2H7N5JB0K
A method takes an `out int result`. What does the compiler require of that method's body?

- [x] It must assign `result` on every path before returning
  > `out` is a write obligation: the callee guarantees the variable is set, so the caller need not pre-initialise it.
- [ ] It must read `result` before assigning it a new value
  > `out` forbids reading the parameter before it is assigned; the caller may pass an uninitialised variable.
- [ ] It must leave `result` unchanged unless an error occurs
  > That would describe an optional in/out; `out` demands assignment on every path, error or not.
- [ ] It may return without touching `result` if it returns `false`
  > Even on the `false` path `result` must be assigned — commonly to `default`.
```

## `out` is how a method returns a second value

The everyday `out` pattern is the **Try** idiom: a method returns a `bool` for success and writes the
real result through an `out` parameter, so the caller branches without an exception.

```csharp
if (int.TryParse(input, out int n))
    Use(n);           // n is definitely assigned inside the if
```

Because `out` guarantees assignment, the compiler treats `n` as definitely assigned in the success
branch. This is the allocation- and throw-free alternative to parsing-and-catching.

```quiz 01M1P5HK4GNXPYK0WV3WR2ZNH9 cloze
`in` passes an argument by reference {{read-only}}; `ref` passes it by reference and allows
{{writing}}; `out` passes it by reference and *requires* the method to {{assign}} it before returning.
```

## `in` and the defensive-copy trap

`in` exists for performance: passing a **large `struct`** by reference avoids copying it into the
method, while `in`'s read-only promise means the caller's value is safe from mutation. But there is a
catch that ties straight back to [[readonly-and-ref-struct]]. If the struct is **not** a `readonly
struct`, the compiler cannot know that calling a member on the `in` parameter won't mutate it — so it
makes a **defensive copy** on each such access, silently reintroducing the very copy `in` was meant to
avoid. The fix is to pass `in` only for a `readonly struct`, where no defensive copy is needed.

```quiz 01M1P5HK4G2CMHA8YXYJH8CBHY
You pass a large *mutable* `struct` by `in` to avoid copying it. Why might you get no speed-up?

- [x] The compiler inserts a defensive copy on member access because the struct isn't `readonly`
  > Without the `readonly` guarantee, each member call may mutate `this`, so the compiler copies to protect the caller.
- [ ] `in` silently upgrades to `ref`, so the struct is still passed by value
  > `in` never becomes `ref`; the lost benefit is the defensive copy, not a change of passing mode.
- [ ] `in` boxes the struct onto the heap before the call
  > `in` passes by reference and does not box; the hidden cost is a stack copy, not an allocation.
- [ ] Large structs are always passed by value regardless of the modifier
  > `in` genuinely passes by reference — the defensive copy is what erases the gain for a mutable struct.
```

## In an interview

State the three as one system: all pass by reference, and they differ by permission — `in` reads,
`ref` reads and writes, `out` must write. Reach for `out` when a method has a second thing to return
(the Try pattern), `ref` when it genuinely mutates the caller's variable, and `in` to pass a large
value cheaply. The senior detail is the `in` / `readonly struct` pairing: `in` only pays off on a
`readonly struct`, otherwise the defensive copy hands the cost back.

Primary source worth reading in full: the .NET language reference on
[method parameters and the `in`, `ref`, and `out` modifiers](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters).
