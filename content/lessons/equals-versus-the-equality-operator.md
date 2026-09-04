---
id: 01M1P5FTXENF17PX7DPFS2M7YN
title: Equals versus the equality operator
topic:
  - equality-and-hashing
prerequisites:
  - value-types-versus-reference-types
  - the-equals-and-gethashcode-contract
---

`==` and `Equals` look interchangeable and are not, and the difference is a favourite way to catch
whether a candidate knows how dispatch works. The sentence that resolves it: **`==` is a static
operator bound at compile time, while `Equals` is a virtual method dispatched at run time — so for a
reference type, `==` defaults to identity even when `Equals` is overridden.** They only agree when
the type deliberately makes them agree.

## Compile-time binding versus runtime dispatch

`==` is an *operator*, and operators are resolved by the compiler against the **static type** of the
operands. There is no vtable, no runtime lookup: the compiler picks an `operator ==` overload — or,
finding none for a reference type, emits a reference comparison — and that choice is frozen into the
IL. It cannot change based on what the object turns out to be at run time.

`Equals` is a *virtual method* on `object`. A call to it is dispatched on the object's **runtime
type**: override `Equals` in a derived class and the override runs even through a base-typed
reference. This is the same virtual-dispatch machinery any `override` uses. So the two mechanisms ask
different questions — `==` asks "what does the compiler know here?" and `Equals` asks "what is this
object, really?"

```csharp
object a = "hello";
object b = new string("hello".ToCharArray());  // a distinct instance

a == b;        // false — operands are typed `object`, so this is a reference comparison
a.Equals(b);   // true  — virtual dispatch runs string's value-based Equals
```

The `==` here is a reference comparison because the operands are statically typed `object`, and
`object` has no value `==`. Had they been typed `string`, the compiler would have picked
`string`'s `operator ==` and returned `true`. Same objects, different answer, decided entirely by
the declared type.

```quiz 01M1P5FTXEK3770CR331MY2CPT
Why can `==` and `Equals` return different results for the same two objects?

- [x] `==` binds to the static type at compile time; `Equals` dispatches on the runtime type
  > The operator is resolved against the declared type and frozen into IL, while the virtual method looks up the object's actual type at run time.
- [ ] `==` compares fields while `Equals` always compares references
  > It is the reverse of a rule, and neither half holds: default `==` on a reference type compares references, and `Equals` can be overridden to compare fields.
- [ ] `==` unboxes value types while `Equals` boxes them
  > Boxing is unrelated to the divergence. The split is compile-time operator resolution versus runtime virtual dispatch.
```

## The reference-type default is identity

Because `==` on a reference type falls back to a reference comparison unless the type provides an
`operator ==`, **overriding `Equals` does not change what `==` does.** A class with a value-based
`Equals` but no `operator ==` will have `a.Equals(b)` return `true` for two equal instances while
`a == b` returns `false`. That split is a genuine bug magnet: code that compares with `==` silently
gets identity semantics the author of `Equals` never intended.

The lesson from [[the-equals-and-gethashcode-contract]] applies here too — if you make `Equals`
value-based you have taken on obligations, and keeping `==` consistent with it is one of them.
`string` overloads `operator ==` so the two agree; a plain `class` does not, so they diverge unless
you say otherwise.

```quiz 01M1P5FTXEBPR7MGP59X30SFJB cloze
For a reference type, `==` defaults to comparing {{identity}} (the references), and overriding
`Equals` alone does {{not}} change that — you must also overload `operator ==` for the two to agree.
```

## IEquatable&lt;T&gt; and why collections prefer it

The `object.Equals(object)` method takes an `object`, so calling it on a value type **boxes** the
argument — an allocation, and a slow reflective comparison for a plain struct. `IEquatable<T>` fixes
this: it declares a strongly-typed `Equals(T other)` that takes the concrete type directly, with no
boxing. Generic collections like `Dictionary<TKey,TValue>` and `List<T>` look for `IEquatable<T>` and
call it in preference to the boxing `object` overload, which is why implementing it matters for any
type used heavily as a key or searched in bulk.

So a well-behaved equatable type implements a coherent set: `IEquatable<T>.Equals`, an override of
`object.Equals`, a matching `GetHashCode`, and usually `operator ==`/`!=` — all telling the same
story. That is a lot of boilerplate to keep consistent by hand, which is the motivation for the next
point.

```quiz 01M1P5FTXEQ82F2W54A4TSWFRC
Why do generic collections prefer `IEquatable<T>.Equals(T)` over `object.Equals(object)`?

- [x] The typed overload avoids boxing the argument on value types
  > `object.Equals` takes `object`, so a struct argument is boxed — an allocation the strongly-typed `Equals(T)` skips entirely.
- [ ] The typed overload is dispatched virtually and the other is not
  > Both are ordinary method calls; the difference is the parameter type and the boxing it forces, not the dispatch mechanism.
- [ ] The typed overload guarantees a unique hash per element
  > Hashing is `GetHashCode`'s job, and no method guarantees uniqueness. `IEquatable<T>` is about comparing without boxing.
```

## Records generate all of it

A `record` (and `record struct`) generates the whole consistent set for you: a value-based
`Equals`, a matching `GetHashCode`, `operator ==`/`!=`, `IEquatable<T>`, and a `ToString`, all
comparing every field and property. For an immutable data type that needs value equality — the exact
thing you want as a dictionary key — a record removes the boilerplate *and* removes the failure mode
where one of the hand-written members drifts out of step with the others. When an interviewer asks
"how does a record's equality differ from a class's?", the answer is: a class defaults to identity
and you implement value equality by hand; a record generates value equality over its members by
default.

## In an interview

Lead with the mechanism, not the symptom: `==` is compile-time operator resolution on the static
type, `Equals` is runtime virtual dispatch on the actual type. Then give the consequence they are
fishing for — a reference type's `==` stays identity even after you override `Equals`, so the two can
disagree. Bring in `IEquatable<T>` as the allocation-free, boxing-free path collections prefer, and
close with records as the way to get a coherent equality set without writing four members that must
agree. Naming *why* they can disagree, rather than just noting that they do, is the senior signal.

Primary source worth reading in full: the [.NET guide on equality
comparisons](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/expressions/equality),
which lays out reference, value, and record equality and how the operators relate to `Equals`.
