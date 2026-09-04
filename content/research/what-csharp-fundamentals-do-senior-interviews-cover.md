---
id: 01M1P4PAWKEEVJ2HJD4RXFV3HG
title: What C# fundamentals do senior interviews cover?
date: 2026-09-04
topic:
  - csharp-type-fundamentals
sources:
  - https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/generics-in-the-run-time
  - https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode
  - https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals
  - https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/large-object-heap
  - https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose
  - https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers
  - https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-truth-about-value-types
  - https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-stack-is-an-implementation-detail-part-one
  - https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/records
  - https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct
  - https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-reference-types
  - https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types
  - https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance
  - https://learn.microsoft.com/en-us/dotnet/standard/linq/deferred-execution-lazy-evaluation
  - https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851
  - https://learn.microsoft.com/en-us/dotnet/api/system.linq.iqueryable-1
  - https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-span
  - https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc
  - https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings
  - https://learn.microsoft.com/en-us/dotnet/api/system.string.intern
  - https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/polymorphism
  - https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/knowing-when-to-use-override-and-new-keywords
  - https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions
  - https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exceptions-and-performance
  - https://devblogs.microsoft.com/premier-developer/dissecting-the-local-functions-in-c-7/
  - https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/expressions/equality
---

This is a Workshop note: it exists so that authoring has somewhere to put an
investigation, and the reader never sees it.

## The question

The vault's "C# type fundamentals" subject already covers *type representation* — value vs.
reference, boxing, nullable value types, `decimal` vs. `double`, `DateTime`. Beyond that raw
representation, what are the C# *fundamentals* umbrella areas a senior interviewer actually
reaches for — the ones that reveal understanding of the runtime and the machine below the
language, not syntax trivia? And where does each one overlap with the async/concurrency,
HTTP-resilience, and database subjects the vault covers elsewhere?

## Ranked shortlist — the highest-value additions

Ordered by how much a senior interview leans on them *and* how strongly they expose
machine-level understanding rather than syntax recall.

1. **Memory management & the GC.** Generational heap, the LOH, `IDisposable`/finalizers, and
   `Span<T>`/`stackalloc`. This is the single richest seam of "below the language" questions and
   it wires directly into the async and HTTP subjects (allocation pressure under load). Strongest
   machine signal.
2. **Equality & hashing.** The `Equals`/`GetHashCode` contract and *why a mutable key corrupts a
   dictionary* is the canonical senior probe: a concrete, mechanical failure that a junior cannot
   explain. Feeds the existing hash-map-lookup note.
3. **Generics and their runtime specialisation.** The JIT *reifies* value-type instantiations and
   *shares* one instantiation across all reference types — a fact with no syntax to memorise and
   direct performance consequences (no boxing in `List<int>`). Very strong machine signal.
4. **Delegates, events & closures.** How a captured variable becomes a heap-allocated display
   class, and the per-capture allocation cost. High machine signal and it *overlaps async heavily*
   — every `await` continuation and every LINQ predicate is a closure candidate.
5. **The type system beyond value/reference.** `class` vs `struct` vs `record` vs `record struct`,
   `readonly`/`ref struct`, `in`/`ref`/`out`. The organising frame the other areas hang off; more
   design-judgement than machine, but the `ref struct` stack-confinement rule is pure runtime.
6. **Collections & LINQ.** The cost model behind `List`/`Dictionary`/`HashSet`/array, plus deferred
   execution, multiple-enumeration bugs, and `IQueryable` vs `IEnumerable`. Bridges into the
   database subject (LINQ-to-EF translation).

Runners-up kept as sections below because they still surface, but they are more likely to be one
follow-up than a whole line of questioning: **nullability** (NRT compile-time vs `Nullable<T>`
runtime), **strings** (immutability, interning, comparison), **polymorphism & dispatch**
(`virtual`/`override`/`new`), and **exceptions** (filters, cost of throwing, control-flow abuse).

The four that most strongly reveal machine-level understanding: **GC/memory**, **generics
specialisation**, **closures**, and **equality/hashing** — each has a mechanical answer that is
either right or wrong, with no room to bluff.

---

## Memory management & the GC

**What it is.** The CLR runs a generational, mark-and-sweep, compacting collector over the managed
heap, with three generations: gen 0 (youngest, short-lived, collected most often), gen 1 (a buffer
between short- and long-lived), and gen 2 (long-lived; a full gen-2 collection also collects gens 0
and 1). Objects ≥ 85,000 bytes go on the **Large Object Heap**, which is "sometimes referred to as
generation 3" but is physically collected *as part of gen 2* and is **not compacted by default**
because copying large objects is expensive
([GC fundamentals](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals),
[LOH](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/large-object-heap)).

**What an interviewer probes.** "Where does a `new` object get allocated, and how does it get
promoted?" — the senior answer is that user code only allocates in gen 0 or the LOH; *only the GC
promotes* survivors into gen 1 and gen 2. "You have a 90 KB buffer allocated per request — what
happens?" tests whether they know it lands on the LOH, is only reclaimed on an (expensive) gen-2
collection, and fragments a heap that isn't compacted — hence pooling / `ArrayPool<T>`. Then the
`IDisposable` fork: "what's the difference between `Dispose` and a finalizer?"

**The runtime insight.** Deterministic cleanup (`IDisposable`/`using`) and non-deterministic cleanup
(finalizers) are different mechanisms. **The programmer has no control over when a finalizer runs —
the GC decides**, it runs on a dedicated finalizer thread, and an object with a finalizer *survives
at least one extra collection* because it must be queued and run before its memory is reclaimed.
That is why the dispose pattern calls `GC.SuppressFinalize(this)`: it tells the GC the cleanup
already happened so the object need not be promoted for finalization and its memory can be reclaimed
in the current generation
([finalizers](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers),
[implementing Dispose](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose),
[CA1816](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1816)).
The `Dispose(bool disposing)` overload exists precisely because the finalizer path (`disposing:
false`) must *not* touch other managed objects — they may already be collected.

`Span<T>`/`stackalloc` is the other half. `Span<T>` is a `ref struct`: a lightweight window over
managed, unmanaged, or **stack** memory that can only live on the stack, so `stackalloc` memory
"isn't subject to garbage collection and doesn't need to be pinned"
([Span](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-span),
[stackalloc](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc)).
The senior point: because a `Span<T>` cannot be a field on a heap object, **it cannot cross an
`await` or be captured by a lambda** — which is why `Memory<T>` exists for async paths. That is the
direct overlap with the async subject.

**Overlap flag.** Strong. Allocation pressure, gen-0 churn, and `Span` vs `Memory` are exactly the
knobs that show up under the async/concurrency and HTTP-resilience subjects (per-request
allocations at throughput).

## Equality & hashing

**What it is.** `Object.Equals` defines equality; `Object.GetHashCode` returns a bucket hint. The
binding contract: **if two objects are equal, they must return the same hash code**, and an
object's hash code must not change while it is used as a key
([GetHashCode](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode)). `==` is a
*static, compile-time-bound operator* while `Equals` is a *virtual, runtime-dispatched method*, so
for reference types `==` defaults to reference identity even when `Equals` is overridden
([equality comparisons](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/expressions/equality)).
`IEquatable<T>` provides a strongly-typed, allocation-free `Equals` that collections prefer over the
boxing `object`-based one.

**What an interviewer probes.** The classic: "you use an object as a dictionary key, then mutate a
field that feeds its hash code — what happens?" A senior explains the object becomes *unreachable*:
the dictionary stored it in the bucket for its *old* hash, a lookup now computes the *new* hash,
lands in a different bucket, and the entry is effectively lost even though it is still in the
dictionary
([Object.GetHashCode remarks](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode);
Microsoft's own guidance is to derive `GetHashCode` only from *immutable* fields). Follow-up: "why
must you override `GetHashCode` whenever you override `Equals`?" — because a type where equal objects
hash differently silently breaks every hash-based collection.

**The runtime insight.** A dictionary buckets by hash, then confirms with `Equals`; the hash is
computed *once at insert* and never recomputed for the stored key. That is the mechanical reason
mutation corrupts lookup, and it is the same machinery behind the vault's existing
[[hash-map-lookup-cost]] note. `GetHashCode` is *not* a unique id and *not* stable across processes
or runs — leaning on it for persistence is a senior red flag.

**Overlap flag.** None with async. Direct tie to the existing hash-maps subject.

## Generics and their runtime specialisation

**What it is.** Generics are a *runtime* feature, not erasure (unlike Java). The JIT compiles a
**separate specialised instantiation for each value type** used as a type argument, but produces
**one shared instantiation for all reference types**, because every reference is the same size
([generics in the runtime](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/generics-in-the-run-time)).
Constraints (`where T : class`, `struct`, `new()`, an interface, `notnull`) let generic code call
members without boxing or reflection.

**What an interviewer probes.** "Does `List<int>` box its elements?" — no, and the senior explains
*why*: the value-type instantiation is reified with `int`-sized storage, so there is no `object`
boxing anywhere, unlike the old `ArrayList`. "What's the memory cost of using `List<T>` with 50
different reference types vs. 50 different value types?" — reference types share one native code body
and one method table pattern; each distinct value type forces its own JIT-compiled body.

**The runtime insight.** This is the cleanest "below the language" question in C#: there is no syntax
to it, only the JIT's reification strategy. It also explains `default(T)` (null for reference types,
the zeroed value for value types, resolved per instantiation) and why variance (below) is restricted
to reference types — value-type instantiations are distinct, unrelated native types.

**Overlap flag.** None with async directly, though `ValueTask<T>` (async subject) is itself a value
type chosen precisely to avoid the allocation a reference-type `Task` instantiation would force.

## Delegates, events & closures

**What it is.** A delegate is a type-safe method reference; `Func<>`/`Action<>` are the standard
generic delegate families; events are a publish/subscribe pattern layered on multicast delegates. A
lambda that references an enclosing local *captures* it: the compiler hoists the captured local into
a compiler-generated **display class** and the local then lives as a *field on that heap object*
([dissecting local functions / display classes](https://devblogs.microsoft.com/premier-developer/dissecting-the-local-functions-in-c-7/)).

**What an interviewer probes.** "What does capturing a variable cost?" — a lambda that captures at
least one local causes **two heap allocations** (the display-class instance and the delegate), while
a lambda that captures nothing or only static state causes **zero**. "What's wrong with capturing the
loop variable?" — the pre-C#-5 `foreach`/`for` gotcha where every closure shares one hoisted variable
and all observe its final value. "Where do closures bite in production?" — hot paths and LINQ
predicates that allocate a closure per call.

**The runtime insight.** The captured local is *promoted off the stack onto the heap* the moment it
is captured, and it lives there for as long as any delegate referencing the display class is
reachable — which is how a short-lived lambda can extend the lifetime of a large captured object and
show up as a leak. Local functions can capture via a *struct* passed by ref (no allocation) when they
are never converted to a delegate — the reason they are preferred in allocation-sensitive code.

**Overlap flag.** Heavy. Every `await` continuation, every `Task.Run(() => ...)`, and every
`WhenAll` projection is a closure; the allocation story here is the same one the async subject cares
about.

## The type system beyond value/reference

**What it is.** `class` (reference, identity equality), `struct` (value, copied on assignment),
`record` and `record struct` (compiler-generated *value equality*, `ToString`, and `with`
non-destructive mutation), plus modifiers: `readonly struct` (immutable value type), `ref struct`
(**stack-confined** — cannot be boxed, cannot be a field of a class, cannot be captured or cross an
`await`), and the parameter modes `in` (readonly by-reference), `ref` (mutable by-reference), `out`
(must-assign by-reference)
([records](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/records),
[ref struct](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct)).

**What an interviewer probes.** "class vs struct vs record — when each?" tests judgement:
`record`/`record class` for immutable data with value semantics, `struct` for small short-lived
values, `record struct` when you want value equality *and* value-type layout. Follow-up: "how does a
record's equality differ from a class's?" — the compiler generates `Equals`, `GetHashCode`, `==`/`!=`,
and `IEquatable<T>` that compare *every* field/property, whereas a plain `struct`'s default `Equals`
falls back to *reflection* and is slow (a record struct avoids the reflection).

**The runtime insight.** The precise correction to the "structs live on the stack" myth belongs here.
Per Eric Lippert, **the stack vs heap distinction is an implementation detail**: what the spec
guarantees is *value semantics* (a value type variable *contains* its value and is copied), not a
storage location — a struct that is a field of a class lives on the heap inside that object, and the
JIT may keep a "heap" local in a register
([The Truth About Value Types](https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-truth-about-value-types),
[The Stack Is An Implementation Detail](https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-stack-is-an-implementation-detail-part-one)).
The one place stack-confinement is a *hard, enforced* rule rather than an implementation choice is
`ref struct` — and that is a real runtime guarantee worth stating precisely.

**Overlap flag.** `ref struct` confinement is the mechanism that forces `Memory<T>` in async code
(async subject).

## Collections & LINQ

**What it is.** The cost model: `array`/`List<T>` are contiguous, O(1) indexed, O(n) search;
`Dictionary<TKey,TValue>`/`HashSet<T>` are hash-based, ~O(1) average add/lookup (see equality above
for what breaks the average). On top sits LINQ, whose operators over `IEnumerable<T>` use **deferred
execution**: "LINQ queries are always executed when the query variable is iterated over, not when it
is created," built on iterator `yield`
([deferred execution](https://learn.microsoft.com/en-us/dotnet/standard/linq/deferred-execution-lazy-evaluation)).

**What an interviewer probes.** "What's wrong with enumerating an `IEnumerable` twice?" — each
enumeration re-runs the whole pipeline; if the source is a database query or has side effects, that
is a correctness/perf bug (`CA1851` flags it, and the fix is to materialise with
`ToList`/`ToArray`) ([CA1851](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851)).
"`IQueryable` vs `IEnumerable`?" — the compiler turns `IEnumerable<T>` queries into **delegates** run
in-process, but `IQueryable<T>` queries into **expression trees** a provider (EF Core) translates to
SQL and runs at the source
([IQueryable](https://learn.microsoft.com/en-us/dotnet/api/system.linq.iqueryable-1)).

**The runtime insight.** The `IQueryable`/`IEnumerable` boundary is where a query stops being SQL and
becomes in-memory iteration — calling an `IEnumerable` operator (or a method the provider can't
translate) *materialises* everything up to that point and pulls it into the app. Getting that line
wrong turns a `WHERE` into a full table scan streamed over the wire. Deferred execution also means a
`Where` never allocates the filtered result until iterated — powerful, and the source of the
double-enumeration trap.

**Overlap flag.** Direct tie to the database subject (LINQ-to-EF translation, `IQueryable`
composition).

## Nullability — two unrelated features with one syntax

**What it is.** `int?` (nullable *value* type) is `System.Nullable<T>`, a real struct with runtime
representation and enforcement. `string?` (nullable *reference* type) is **entirely a compile-time
feature**: "there's no runtime difference between a non-nullable reference type and a nullable
reference type... `string` and `string?` are both `System.String`"
([NRT](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-reference-types),
[nullable value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types)).

**What an interviewer probes.** "What does `string?` actually guarantee at runtime?" — nothing; NRT is
static flow analysis that produces *warnings*, and the annotation does not change the type or add a
runtime check. A senior notes the caveats: the `!` null-forgiving operator suppresses analysis
without changing behaviour, and code from a `#nullable disable` context or reflection/serialisation
can still put `null` into a non-nullable reference.

**The runtime insight.** The whole point is that one piece of syntax (`T?`) means two mechanically
different things: a boxed-or-`HasValue` struct for value types vs. a pure annotation for reference
types. EF Core *reads* the NRT annotations via reflection to decide required vs optional columns —
one of the few places the compile-time annotation leaks into runtime behaviour.

**Overlap flag.** None with async.

## Strings

**What it is.** `String` is immutable; every "mutation" allocates a new object. The runtime keeps an
**intern pool** so identical literals share one instance, enabling fast reference comparison — but
interned strings "are not likely to be released until the CLR terminates," so interning at scale
leaks
([interning](https://learn.microsoft.com/en-us/dotnet/api/system.string.intern)). `StringBuilder`
mutates a buffer in place for loop-built strings. `StringComparison` selects **ordinal** (binary,
fast, machine-independent) vs **culture-sensitive** (linguistic, culture-dependent) comparison
([string best practices](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings)).

**What an interviewer probes.** "Why is building a string in a loop with `+=` slow?" — each `+=`
allocates a new string and copies, O(n²) total; `StringBuilder` is O(n). "Why specify
`StringComparison.Ordinal`?" — culture-sensitive comparison is the default for some operations and
gives *different results on different machines* (the Turkish-`i` problem); identifiers, protocol
tokens, and dictionary keys must use ordinal.

**The runtime insight.** Immutability is what *makes* interning and free cross-thread sharing safe —
the two facts are linked, not independent. Strings are UTF-16 internally (a `char` is 16 bits, so a
non-BMP code point is a surrogate pair — `Length` counts UTF-16 units, not visible characters).

**Overlap flag.** None.

## Polymorphism & dispatch

**What it is.** `virtual` marks a method as overridable; `override` provides a derived implementation
that participates in **virtual dispatch** (the CLR looks up the object's *runtime* type and invokes
its override even through a base-typed reference); `abstract` forces an override; `new` **hides**
rather than overrides
([polymorphism](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/polymorphism),
[override vs new](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/knowing-when-to-use-override-and-new-keywords)).

**What an interviewer probes.** "`override` vs `new` — what's the difference through a base-class
reference?" — an `override` is dispatched on the runtime type (the derived method runs); a `new`
member is bound at *compile time* to the static type of the reference, so a base-typed reference
calls the *base* method. The gotcha is that `new` silently changes behaviour based on the reference's
declared type.

**The runtime insight.** Virtual calls resolve through a method-table (vtable) slot at runtime;
interface calls go through interface dispatch (historically the "interface dispatch stub"). `new`
hiding sidesteps the vtable entirely — it is *static* binding wearing an override's clothes, which is
why it is a bug magnet. `sealed` on an override lets the JIT devirtualise.

**Overlap flag.** None.

## Exceptions

**What it is.** `try`/`catch`/`finally` with `finally` guaranteed to run; **exception filters**
(`catch (E e) when (condition)`) evaluate a predicate *before the stack unwinds*, so if no filter
matches the exception keeps propagating without the cost of unwinding and the original stack/locals
stay intact for the debugger
([best practices](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions),
[exceptions & performance](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exceptions-and-performance)).

**What an interviewer probes.** "What's the cost of throwing?" — throwing is "orders of magnitude
slower" than a normal return, but *only when actually thrown* — an unentered `try` block is
near-free, so wrapping code in `try` is cheap and the sin is using exceptions for control flow.
Follow-up: the Tester-Doer / Try-Parse patterns (`int.TryParse`) as the allocation- and
throw-free alternative.

**The runtime insight.** The cost is in capturing the stack trace and walking the two-pass
exception-handling machinery, not in the `try`. Exception *filters* are the senior detail: because
they run before unwinding, they can inspect the live frame and even be (ab)used for logging with a
`when` that returns `false`.

**Overlap flag.** Light — exceptions crossing `async`/`await` boundaries and `AggregateException`
from `WhenAll` are the async subject's territory.

## Notes on scope and dead ends

- **Variance** (`in`/`out` covariance/contravariance) is worth *one* subsection, folded under the
  type system, not a whole area: `out` = covariant (return position only), `in` = contravariant
  (input position only), invariant by default, and **it applies to reference types only** — a value
  type argument makes the parameter invariant, which ties straight back to generics specialisation
  ([variance](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance)).
  Kept as a pointer rather than a top-level area.
- **Default interface methods** came up in the candidate list but are a niche C# 8 feature; an
  interviewer rarely builds a senior line of questioning on them. Drop from the shortlist.
- Deliberately did **not** re-cover boxing, nullable value-type representation, or `decimal` vs
  `double` — the vault already owns those. Boxing is referenced only where generics/collections
  *avoid* it, which is the useful framing.

Distilled for the reader into the "C# type fundamentals" subject as new lessons on the six shortlist
areas.
