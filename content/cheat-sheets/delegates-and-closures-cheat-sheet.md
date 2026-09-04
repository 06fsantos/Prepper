---
id: 01M1P5GV5YE9H3WA5QR8SKNG6F
title: Delegates and closures — cheat sheet
topic: delegates-and-closures
---

- **Delegate** = type-safe reference to a method; signature checked at compile time. `Func<...>`
  returns a value (last type arg), `Action<...>` returns `void`, `Predicate<T>` is `Func<T,bool>`.
- **Every delegate is multicast** — it holds an ordered invocation list. `+=` adds, `-=` removes.
  Value returns collapse to the **last** target; an exception in one target **halts the rest**.
- **Event** = multicast delegate + a subscription discipline: outside code may only `+=`/`-=`, never
  assign or invoke. Raise with `?.Invoke(...)` because a subscriber-less delegate is `null`.
- **Capture** = a lambda referencing an enclosing local. The compiler hoists that local into a
  heap **display class** and the local becomes a *field* on it — the closure shares the variable,
  not a copy.
- **Lifetime**: the captured variable lives as long as the delegate does, not as long as the
  method. A reachable delegate pins its whole display class, so one small capture can keep a large
  co-captured object alive — a leak.
- **Cost**: capture ≥ 1 local → **two** heap allocations (display class + delegate). Capture
  nothing / only static → **zero** (the delegate is cached and reused).
- **Loop-variable gotcha**: `foreach` gives a fresh variable per iteration since C# 5, so closures
  differ. A C-style `for` counter is still **one shared `i`** — all closures see the final value;
  capture a per-iteration local to fix.

The reach-for-it signal: a lambda in a hot path or a captured LINQ predicate (`Where`/`Select`) —
that is where per-call closure allocation shows up in a profiler. Same allocation story as every
`await` continuation and `Task.Run(() => ...)`.

Full treatment: [[how-a-lambda-captures-a-variable]], [[the-cost-of-a-closure]], and
[[delegates-events-and-multicast]].
