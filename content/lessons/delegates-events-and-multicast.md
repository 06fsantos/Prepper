---
id: 01M1P5GV5XVWMM2QE3C851BM9Z
title: Delegates, events, and multicast
topic:
  - delegates-and-closures
---

Before a lambda can capture anything, there has to be a thing it becomes, and that thing is a
delegate. **A delegate is a type-safe reference to a method: a type whose values are methods with a
matching signature, so you can pass behaviour the way you pass data.** Declaring `delegate int
Transform(int x)` creates a type; a variable of that type can hold any method — static, instance, or
lambda — that takes an `int` and returns an `int`, and invoking the variable invokes the method.

"Type-safe" is the load-bearing word. A delegate's signature is checked at compile time, so you
cannot assign a method whose parameters or return type do not match. That is what separates it from a
raw function pointer: the compiler guarantees the call site and the target agree.

```csharp
delegate int Transform(int x);

int Square(int x) => x * x;

Transform t = Square;      // a method as a value
Console.WriteLine(t(5));   // 25 — invoking the delegate invokes Square
t = x => x + 1;            // any matching method, including a lambda
Console.WriteLine(t(5));   // 6
```

```quiz 01M1P5GV5YSBFJJHHCDQ0M8GR7
What does "type-safe" buy you in the phrase "a delegate is a type-safe method reference"?

- [x] The compiler rejects any target whose signature does not match the delegate
  > A delegate declares a parameter and return signature, and assignment is checked against it at compile time, unlike a raw function pointer.
- [ ] The delegate can only ever point at one method for its lifetime
  > A delegate variable can be reassigned freely, and can even hold several targets at once; safety is about the signature, not immutability.
- [ ] The delegate boxes its arguments so any type can be passed
  > No boxing is implied; the signature must match exactly, which is the opposite of accepting any type.
```

## Func and Action, the families you actually use

You rarely declare a `delegate` type by hand any more, because the framework ships two generic
families that cover almost every signature. **`Func<...>` is a delegate that returns a value — its
last type argument is the return type — and `Action<...>` is a delegate that returns `void`.** A
`Func<int, int>` is the `Transform` above without the named declaration; an `Action<string>` takes a
`string` and returns nothing; `Predicate<T>` is the special case `Func<T, bool>`.

```csharp
Func<int, int> square = x => x * x;      // takes int, returns int
Action<string> log     = s => Console.WriteLine(s);  // takes string, returns void
```

These are the types LINQ, tasks, and event handlers are written in terms of, which is why a lambda
flows straight into them: the lambda's inferred signature matches the generic delegate, and the
compiler builds the delegate for you.

```quiz 01M1P5GV5Y23YA3NZCNTSTSJRH cloze
`Func<T, TResult>` names a delegate that {{returns}} a value, while `Action<T>` names one that returns
{{void}}.
```

## Multicast: a delegate can hold many targets

Here is the property that surprises people: **a delegate does not hold one method, it holds an
ordered *invocation list* of them.** Combine two delegates with `+` (or `+=`) and you get a delegate
whose invocation list is both; invoke it, and every target runs in order. Remove one with `-=`. This
is *multicast*, and it is built into every delegate type, not an opt-in.

```csharp
Action pipeline = () => Console.WriteLine("first");
pipeline += () => Console.WriteLine("second");
pipeline();   // runs both, in order: "first" then "second"
```

Two sharp edges an interviewer reaches for. First, a multicast `Func` that returns a value **only
returns the result of the last target** — the earlier returns are discarded — which is why multicast
is used almost exclusively with `Action`-shaped, `void` delegates. Second, if one target throws, the
remaining targets **do not run**: invocation stops at the exception.

```quiz 01M1P5GV5Y6DEK73E9A25CJ6BQ
You combine three `Func<int>` delegates into one multicast delegate and invoke it. What value do you
get back?

- [x] Only the return value of the last target in the invocation list
  > A multicast invocation runs every target in order but yields just the final target's return value; the earlier ones are discarded.
- [ ] An array holding the return value of every target
  > The runtime does not collect the returns; to get all of them you invoke `GetInvocationList()` and call each yourself.
- [ ] The sum of every target's return value
  > Nothing aggregates the results; multicast simply returns the last, which is why value-returning multicast is rarely useful.
```

## Events are multicast delegates with a subscription discipline

An **event** is not a new mechanism — it is a publish/subscribe pattern layered on a multicast
delegate. A class exposes an event; other objects subscribe with `+=` and unsubscribe with `-=`; when
the class *raises* the event it invokes the delegate, running every subscriber's handler. The
`event` keyword adds one restriction on top of a plain delegate field: **outside code may only `+=`
and `-=`, never assign the whole thing or invoke it.** That stops a subscriber from clobbering every
other subscriber with `=`, or raising the event on the publisher's behalf.

```csharp
public event Action<Order> OrderPlaced;   // publisher exposes it
// ...inside the class:
OrderPlaced?.Invoke(order);               // raise it — null-checked in case no one subscribed

// elsewhere:
shop.OrderPlaced += SendReceipt;          // subscribe; can only += and -=
```

The `?.Invoke` matters: a delegate with no subscribers is `null`, not empty, so raising it
unconditionally throws. And subscription is the other closure-lifetime trap from
[[how-a-lambda-captures-a-variable]] — a subscriber the publisher outlives, and that never
unsubscribes, is kept alive by the event's invocation list.

## In an interview

Build the ladder: a **delegate is a type-safe method reference**; **`Func`/`Action` are the ready-made
generic families** (`Func` returns a value, `Action` returns `void`); every delegate is **multicast**,
holding an invocation list where value returns collapse to the last and an exception halts the rest;
and an **event** is that multicast delegate wrapped so subscribers can only add and remove handlers.
If asked why events over a public delegate field, the answer is encapsulation of the invocation list.
For what a lambda target costs once it captures, see [[the-cost-of-a-closure]].

Primary source worth reading in full: the .NET guide to
[delegates](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/delegates/).
