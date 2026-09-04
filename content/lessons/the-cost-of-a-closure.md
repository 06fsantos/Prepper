---
id: 01M1P5GV5X1NTRA4JJ3ST16A44
title: The cost of a closure
topic:
  - delegates-and-closures
prerequisites:
  - how-a-lambda-captures-a-variable
---

A lambda looks weightless in the source, which is exactly why its cost is a favourite senior probe.
The rule is mechanical and worth memorising: **a lambda that captures at least one local allocates
twice on the heap — once for the display class, once for the delegate — while a lambda that captures
nothing, or only static state, allocates nothing after the first call.** The difference is not style;
it is two garbage-collected objects per invocation versus zero.

The two-allocation case follows straight from how capture works. The captured local is hoisted onto a
[[how-a-lambda-captures-a-variable|display class]], which is one heap object, and the delegate that
points at the method on that class is a second. Both are created every time control reaches the
lambda expression with a live capture.

```csharp
int threshold = GetThreshold();
var big = items.Where(x => x.Score > threshold);  // captures `threshold`:
                                                  // 1 display-class instance + 1 delegate
```

The zero-allocation case is the one people miss. A lambda that captures nothing is *cacheable*: the
compiler can build the delegate once and reuse the same instance forever, because it depends on no
per-call state. A lambda that touches only `static` members is the same — static state is not
hoisted, so there is nothing to capture.

```csharp
var evens = items.Where(x => x.Value % 2 == 0);   // captures nothing: cached, zero per-call cost
var ids   = items.Select(x => x.Id);              // same — no enclosing local touched
```

```quiz 01M1P5GV5YG6M9TBHH1VZ4CFX6
How many heap allocations does a lambda that captures one enclosing local incur each time it is
created?

- [x] Two — the display-class instance and the delegate object
  > The captured local is hoisted onto a heap display class, and the delegate pointing at it is a second heap object; both are allocated per creation.
- [ ] One — just the delegate that wraps the method
  > That is the count for a capture-free lambda; capturing a local adds the display class as a second allocation.
- [ ] Zero — the compiler caches every lambda as a static field
  > Only capture-free lambdas are cached; a live capture depends on per-call state and cannot be reused.
```

## Where it bites

Two allocations sound trivial, and for a lambda that runs once they are. The cost is a problem only
where the lambda is created *often*, and there are two classic sites.

The first is a **hot path** — a loop, a per-request handler, a per-frame update — where a capturing
lambda is built on every pass. Each pass mints a fresh display class and delegate, and gen-0 fills
with short-lived garbage. The fix is usually to hoist the lambda out so it is created once, or to
pass the needed state as an argument rather than capturing it.

The second is a **LINQ predicate that captures**. `Where`, `Select`, `First`, `Any` and the rest take
a delegate, and if the predicate captures a local, the closure is allocated once per call to the
enclosing method. Called in a loop or per request, that is one closure allocation each time — cheap
individually, real in aggregate at throughput.

```quiz 01M1P5GV5YY10E621BBMSCAB8F cloze
A capturing lambda allocates once per {{creation}}, so it is harmless when built once but a source of
gen-0 churn inside a {{loop}} or a per-request handler.
```

The reach-for-it correction, when someone calls all lambdas free: they are not, but the ones that
matter are the *capturing* ones, and the profiler will point at the display class, not the lambda
syntax.

```quiz 01M1P5GV5YWJ2EJM58AF4DN9Y4
Which lambda passed to `Where` allocates nothing on repeated calls?

- [x] `x => x.Age > 18`, comparing a field against a constant
  > It captures no enclosing local and touches no instance state, so the compiler caches one delegate and reuses it — zero per-call cost.
- [ ] `x => x.Age > minAge`, where `minAge` is a local
  > Capturing the local `minAge` forces a display class plus a delegate, so this allocates on each call.
- [ ] `x => x.Age > this.MinAge`, reading an instance field
  > Reading an instance member captures `this`, which allocates a delegate bound to that instance rather than a cached one.
```

## The same story the async subject tells

This is not a corner of LINQ; it is the allocation model behind async too. Every `await` continuation
is compiled into a delegate over captured state, and every `Task.Run(() => ...)` hands a lambda to the
thread pool — both are closure candidates that allocate exactly when they capture. So the reasoning
here transfers directly: the [[the-async-state-machine]] and a `WhenAll` projection are counting the
same display-class-plus-delegate cost, under load, per request. If you can explain why a capturing
LINQ predicate allocates, you can explain why an async hot path does.

## In an interview

Lead with the count: **capture at least one local, two heap allocations; capture nothing or only
static state, zero.** Name the two objects — display class and delegate — because that is the proof
you know *why*, not just the number. Then place it: hot paths and captured LINQ predicates are where
it moves a profiler, and the same model explains async continuation and `Task.Run` allocations. The
senior note is that the fix is never "avoid lambdas" — it is avoid *capturing* in the hot spot, by
hoisting the delegate or passing state as an argument.

Primary source worth reading in full: Microsoft's devblog on
[local functions and display classes](https://devblogs.microsoft.com/premier-developer/dissecting-the-local-functions-in-c-7/),
which shows the allocation a captured local forces and how a local function can avoid it.
