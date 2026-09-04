---
id: 01M1P5GV5XTCZYE8DNZT8MQTP0
title: How a lambda captures a variable
topic:
  - delegates-and-closures
prerequisites:
  - value-types-versus-reference-types
---

When a lambda references a local from the method around it, the compiler cannot leave that local on
the stack: the lambda may run long after the method has returned, and the stack frame is gone by
then. So it rewrites your code. **The captured local is hoisted into a compiler-generated *display
class* — a plain heap object — and the local becomes a field on it.** From that point the local no
longer lives on the stack at all; every read and write, inside the lambda and out, goes through the
field on that heap object.

```csharp
int total = 0;
Action add = () => total += 10;   // `total` is captured
add();
Console.WriteLine(total);          // 10 — the lambda mutated the same storage
```

The two `total`s here are not two variables that happen to agree. There is exactly one storage
location — the field on the display-class instance — and both the surrounding method and the lambda
read and write it. That shared identity is the whole point of a closure: the lambda *closes over*
the variable, not over a snapshot of its value.

```quiz 01M1P5GV5YPW43Z6SSYW5F1N3H
A lambda captures a local `int count`. Where does `count` actually live once the compiler has
rewritten the method?

- [x] On the heap, as a field of a compiler-generated display class
  > The compiler hoists the captured local into a display-class instance so it can outlive the stack frame; the field is the single shared storage.
- [ ] On the stack, boxed into an `object` when the lambda runs
  > No boxing happens; the local is moved to a class field, and `int` is stored there unboxed. See [[value-types-versus-reference-types]].
- [ ] On the stack, copied into the delegate as a captured value
  > A closure shares the variable, not a copy of its value; a stack copy would not survive the method returning.
```

## Promoted off the stack, kept alive by the delegate

Hoisting has a consequence that shows up as a bug in production, not in a tutorial. The display-class
instance is an ordinary heap object, so it lives **as long as anything referencing it is
reachable** — and the delegate references it. As long as that delegate is reachable, so is the
display class, and so is *every* field on it.

That is how a small, innocent-looking lambda extends the lifetime of something large. Capture one
`int` you needed and you have also pinned everything else hoisted into the same display class for as
long as the delegate lives:

```csharp
byte[] hugeBuffer = LoadTenMegabytes();
int offset = ComputeOffset(hugeBuffer);

// You only meant to capture `offset`, but the compiler puts BOTH locals
// on one display class if the lambda touches either.
Action callback = () => Log(offset);

eventSource.OnTick += callback;   // callback is reachable for the app's lifetime...
                                  // ...and so is hugeBuffer, though nothing reads it again.
```

Nothing reads `hugeBuffer` after the callback is wired up, yet it cannot be collected: it is a field
on the same display class the reachable delegate holds. A profiler shows ten megabytes that "should"
be dead. The senior-level framing is that **a captured variable's lifetime is the delegate's
lifetime, not the enclosing method's** — and the fix is to null out or avoid capturing what you do
not need, so the display class does not carry it.

```quiz 01M1P5GV5Y2GB85VF2RY88G8CC recall
Explain how capturing one small local in a lambda can keep a large, unrelated object alive.

> If the lambda captures more than one local from the same scope, the compiler hoists them onto one
> display-class instance. The delegate holds a reference to that instance, so every field on it —
> including the large object — stays reachable for as long as the delegate does, even if nothing ever
> reads the large one again.
```

## The captured loop variable

The most-asked closure gotcha is the loop variable. Before C# 5, a `foreach` loop declared **one**
loop variable and reused it across every iteration — so a lambda made inside the loop captured that
single shared variable, and every lambda saw its *final* value.

```csharp
var actions = new List<Action>();
foreach (var s in new[] { "a", "b", "c" })
    actions.Add(() => Console.WriteLine(s));

foreach (var a in actions) a();
// Pre-C# 5: prints "c", "c", "c" — one hoisted `s`, all three closures share it.
// C# 5+:    prints "a", "b", "c" — the foreach variable is now fresh each iteration.
```

C# 5 changed the `foreach` variable to be a *fresh* variable per iteration, which gives each closure
its own hoisted copy and the intuitive result. The trap survives in one place the language did **not**
change: the classic `for (int i = 0; ...)` loop. Its `i` is genuinely one variable across all
iterations, so a lambda that captures `i` still sees the final value, and capturing a per-iteration
local (`var current = i;`) is the fix.

```quiz 01M1P5GV5YYSFNX9ZTKMBQ10GJ
In a `for (int i = 0; i < 3; i++)` loop you add `() => Console.WriteLine(i)` to a list each pass,
then invoke them all. What prints, on any modern C# version?

- [x] `3`, `3`, `3` — the closures share one `i`, left at its final value
  > A `for` loop's `i` is a single variable across iterations; C# 5's fix applied only to `foreach`, so all closures see the loop's terminal value.
- [ ] `0`, `1`, `2` — each closure captured its own copy of `i`
  > That is what a per-iteration local buys you; a raw `for` counter is shared, so no per-iteration copy exists to capture.
- [ ] `0`, `1`, `2` — modern C# gives every loop a fresh variable
  > Only `foreach` was changed in C# 5; the C-style `for` counter is still one shared variable.
```

## In an interview

Say the mechanism, not the metaphor: a captured local is **hoisted into a compiler-generated display
class on the heap and becomes a field there**, so the closure shares the variable rather than a copy
of its value. Then reach for the consequence the question wants — shared mutation, a lifetime bug
where a delegate pins a large captured object, or the loop-variable trap and why `foreach` (but not
`for`) was fixed in C# 5. If pushed on cost, that is the next lesson: capturing is not free, and
[[the-cost-of-a-closure]] counts the allocations. See also [[delegates-events-and-multicast]] for
what the delegate holding the display class actually is.

Primary source worth reading in full: Microsoft's devblog on
[local functions and display classes](https://devblogs.microsoft.com/premier-developer/dissecting-the-local-functions-in-c-7/).
