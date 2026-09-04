---
id: 01M1NJP99FAH56KR35QZXPPCFN
title: Value types versus reference types
topic:
  - value-and-reference-types
---

Nearly every C# type is one of two things, and which one it is decides what an assignment copies,
what `==` compares, and where the object's data actually sits. The one-line version an interviewer
wants first: **a variable of a value type contains the instance; a variable of a reference type
contains a reference to an instance stored elsewhere.** Everything else follows from that sentence.

A value type is a `struct` or an `enum` — and that includes `int`, `double`, `bool`, `char`,
`DateTime` and every other built-in except `string` and `object`, all of which are structs
underneath. A reference type is a `class`, an `interface`, a delegate, an array, or `string`.

## What a copy copies

Assign one value-type variable to another, pass it to a method, or return it, and you copy the
instance. The two variables are now independent:

```csharp
var a = new Point(1, 2);
var b = a;      // b is a full copy
b.Y = 200;      // a.Y is still 2
```

Do the same with a reference type and you copy the *reference*, not the object. Both variables now
point at one shared instance, so a mutation through either is visible through the other. This is
the single most common source of "why did that other variable change?" bugs, and naming the
mechanism out loud — "I copied the reference, not the object" — is the senior-level answer.

The subtle case, and a favourite follow-up: a `struct` that *holds* a reference-type field. Copying
the struct copies the field's reference, so both copies share whatever it points at. The value
part is copied; the thing behind the reference is not.

```quiz 01M1NJP99FXD7CGEHZ52WCPT2G
`class Box { public int N; }`. You write `var x = new Box { N = 1 }; var y = x; y.N = 9;`. What is
`x.N` afterwards?

- [x] `9`, because `y` copied the reference, so both name one object
  > `Box` is a class, so `x` and `y` hold references to the same instance; writing through `y` is seen through `x`.
- [ ] `1`, because `y` copied the object, so the two are independent
  > That is value-type copy semantics. A `class` copies the reference, not the object.
- [ ] `1`, because assigning `y = x` clones every field across
  > No clone happens on assignment for a reference type; only the reference is duplicated.
```

## Where the instance lives — and the myth to retire

The interview trap is "value types live on the stack, reference types on the heap." It is close
enough to be dangerous and wrong often enough to catch you out. The accurate version: **a value
type is stored inline wherever its variable lives.** A local value-type variable sits on the stack;
a value-type *field of a class* lives on the heap inside that object; a boxed value type lives on
the heap; a captured local can end up on the heap too. The reference type's *object* is always on
the managed heap, and the reference to it lives wherever its variable lives.

So the honest sentence is about the variable, not the type. Where a given value ends up is an
implementation detail of the runtime — which is exactly why the docs define the categories by what
the variable *contains*, never by where it is stored.

```quiz 01M1NJP99FAVE7D28X1G6KB0SH cloze
A value type is stored {{inline}} wherever its variable lives, so a value-type field of a class
lives on the {{heap}} inside that object — not always on the stack.
```

## Default equality

`==` and `Equals` diverge by category, and this bites in real code. For a reference type, the
default `Equals` and `==` compare **identity** — are these the same object? — unless the type
overrides them (as `string` and records do). For a value type, the default `Equals` compares
**the fields**, structurally, value by value.

That default structural comparison uses reflection and is slow, which is why a `struct` used as a
dictionary key or compared in a hot loop should override `Equals` and `GetHashCode` (or be a
`record struct`, which generates them). The interviewer is checking whether you know the default
exists *and* that it is not free.

```quiz 01M1NJP99GNT9WNX50HWFJHASX
Two separate `class` instances have identical field values. Default `Equals` returns what, and why?

- [x] `false` — reference types compare identity, not fields, by default
  > Without an override, a class compares object identity, so two distinct instances are unequal.
- [ ] `true` — reference types compare fields the way structs do
  > That is the value-type default. A class compares identity unless it overrides `Equals`.
- [ ] `false` — comparing two class instances is a compile error
  > It compiles fine; it simply returns `false` because the references differ.
```

## In an interview

Lead with the contains-an-instance-versus-contains-a-reference sentence, then reach for the
consequence the question is fishing for: copy semantics, default equality, or where an allocation
happens. If pushed on "stack versus heap", correct the premise rather than repeating it — that
correction is the signal that you understand the model instead of the slogan. The trade a value
type makes is no heap allocation and no indirection, paid for with copying cost and value semantics
you have to keep in mind. See [[boxing-and-unboxing]] for what happens when the two worlds meet.

Primary source worth reading in full: the .NET reference on
[value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types).
