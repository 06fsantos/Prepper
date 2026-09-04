---
id: 01M1NJP99G0MDTQYC0ABDXY7C5
title: Boxing and unboxing
topic:
  - value-and-reference-types
prerequisites:
  - value-types-versus-reference-types
---

Boxing is what happens when a value type has to pretend to be an object. The CLR wraps the value
inside a fresh `System.Object` on the managed heap and copies the value into it; unboxing pulls the
value back out. Boxing is **implicit** — it happens silently, wherever a value type meets a slot
typed as `object` or as an interface — and that silence is the whole reason it matters in an
interview: it is an allocation you did not write.

```csharp
int i = 123;
object o = i;      // boxing — a new heap object is allocated, 123 copied in
int j = (int)o;    // unboxing — explicit cast, value copied back out
```

The box is a genuine copy. Change `i` after boxing and the box still holds the old value; the two
live in separate memory. This is the same value-copy rule from [[value-types-versus-reference-types]],
now crossing into the heap.

## Where it hides

You rarely type `object o = i`. Boxing sneaks in wherever a value type flows through a
reference-typed API:

- A value type added to a non-generic collection (`ArrayList`, `Hashtable`), or to anything typed
  `List<object>`.
- A `struct` passed where an `object` or a boxed interface is expected — `string.Concat("x", 42)`
  boxes the `42`.
- A value type formatted through an `object`-typed parameter, or compared via a non-generic
  `IComparable`.

Generics are the fix: `List<int>` stores its elements as `int`, no box. The reason `List<T>` and
the generic collections exist at all is largely to make this class of hidden allocation go away.

```quiz 01M1NJP99GHHSPWJBZY57ZK1WX
Why is boxing a performance concern in a hot loop rather than a mere correctness footnote?

- [x] Each box is a heap allocation the GC must later collect
  > A new object per box means allocation pressure and future collection work, unlike a plain copy.
- [ ] Each box mutates the original value type in place
  > A box is an independent copy; the original is untouched. The cost is the allocation, not mutation.
- [ ] Each box blocks the thread until the GC runs
  > Boxing does not synchronise on the GC; the cost is the allocation and eventual collection.
```

## Unboxing is exact, and explicit

Unboxing needs a cast, and the cast is strict: the object must be a box of *exactly* that value
type. Unboxing to a wider or narrower type fails at run time. A boxed `int` unboxes to `int`, never
to `long` or `short`, and getting this wrong throws `InvalidCastException` — unboxing `null` throws
`NullReferenceException`.

```csharp
object o = 123;        // boxed int
int ok  = (int)o;      // fine
long no = (long)o;     // throws InvalidCastException, not a widening conversion
```

The senior point: the error message says "Specified cast is not valid", and the fix is to unbox to
the exact type and *then* convert — `long n = (int)o;`.

```quiz 01M1NJP99GMRZPXNB0PWVVBSBZ cloze
Boxing is {{implicit}}; unboxing is {{explicit}} and must name the exact boxed type, throwing
{{InvalidCastException}} on a type mismatch.
```

## In an interview

Define it in one breath — "boxing wraps a value type in a heap object so it can be treated as a
reference; unboxing copies it back" — then show you know it is a hidden allocation and name where
it hides. The follow-up is usually "how do you avoid it", and the answer is generics: a `List<T>`
or a generic interface keeps the value type as itself. Reach for boxing whenever a profiler shows
allocations you cannot account for on a path that only touches value types.

Primary source worth reading in full: the .NET guide on
[boxing and unboxing](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing).
