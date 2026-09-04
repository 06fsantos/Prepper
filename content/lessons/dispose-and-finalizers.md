---
id: 01M1P5J8NB2BFE9R7MGPV9XYHN
title: Dispose and finalizers
topic:
  - garbage-collection
prerequisites:
  - the-generational-heap
---

The garbage collector reclaims **memory**, and it reclaims it whenever it decides to. But a file
handle, a socket, a database connection, an unmanaged buffer — these are resources the GC knows
nothing about and cannot free, and holding them until "whenever the GC decides" is often far too late.
C# has two mechanisms for cleaning them up, and the interview turns on knowing that they are
**different in kind**: one is deterministic and yours to trigger, the other is non-deterministic and
the collector's.

## Two mechanisms, one of which you do not control

**`IDisposable` and `using` are deterministic.** You call `Dispose`, or let a `using` block call it at
a scope you can see in the source, and the cleanup runs *there* — at a known point, on your thread, in
an order you control.

```csharp
using (var file = new StreamReader(path))
{
    return file.ReadToEnd();
} // Dispose() runs here, deterministically, before the method returns
```

**A finalizer is non-deterministic.** Declared with the `~ClassName()` syntax, it is the CLR's
last-resort hook for an object that owns an unmanaged resource and was *not* disposed. And the fact to
state precisely is this: **the programmer has no control over when — or, strictly, whether — a
finalizer runs.** The GC decides. When it finds an unreachable object that has a finalizer, it does
not reclaim the object; it queues it, and a **dedicated finalizer thread** runs the finalizer at some
later point of the runtime's choosing. You cannot make it run now, you cannot order two finalizers,
and on an abrupt process exit some may not run at all. The
[finalizers](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers)
docs are the primary source.

```quiz 01M1P5J8NB5P591VKZ61N4YBTM
What determines the moment a finalizer runs?

- [x] The garbage collector decides, and runs it later on a dedicated finalizer thread
  > Finalization is non-deterministic; you cannot trigger it or order it, unlike Dispose.
- [ ] It runs the instant the object becomes unreachable, on the current thread
  > Nothing runs the instant an object is unreachable; the finalizer is queued for a separate thread.
- [ ] It runs at the end of the scope where the object was declared
  > That is `using`/`Dispose`, the deterministic path. A finalizer has no scope tied to it.
- [ ] It runs when you call `GC.Collect()`, and only then
  > `GC.Collect` may queue it, but the finalizer thread still runs it later; you do not control when.
```

## Why a finalizer costs the object an extra collection

Here is the mechanical consequence that makes finalizers something to *avoid*, not reach for. When the
collector reaches an object with a finalizer that has not yet run, it cannot reclaim the memory —
because the finalizer might still need the object's fields. So the object is placed on the finalization
queue and **kept alive**, which means it is *promoted* to the next generation (see
[[the-generational-heap]]) instead of being collected. The finalizer thread runs the finalizer later,
and only on the *next* collection of that generation is the memory finally reclaimed.

So an object with a finalizer **survives at least one extra collection** and is promoted a generation
it would not otherwise have reached — the exact retention that [[the-generational-heap]] flags as the
anomaly worth chasing. A finalizer is not free insurance; it is a standing cost on every instance of
the type.

```quiz 01M1P5J8NB508D948ANVTJN0JF cloze
When the collector finds an unreachable object whose finalizer has not run, it cannot reclaim the
memory yet, so the object is {{promoted}} to the next generation and survives at least one {{extra}}
collection before its memory is freed.
```

## The dispose pattern, and the two things it is doing

A type that owns an unmanaged resource wants both: deterministic cleanup when the caller does the right
thing and disposes, *and* a finalizer as a backstop for when they forget. The standard shape, from
[implementing a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose):

```csharp
public void Dispose()
{
    Dispose(disposing: true);
    GC.SuppressFinalize(this);
}

~Resource() => Dispose(disposing: false);

protected virtual void Dispose(bool disposing)
{
    if (disposing)
    {
        // called from Dispose(): safe to touch other managed objects
        _managedChild?.Dispose();
    }
    // always: release the unmanaged resource (handle, buffer, ...)
    ReleaseHandle();
}
```

Two design decisions in there are what an interviewer is checking.

**`GC.SuppressFinalize(this)` in `Dispose`.** Once `Dispose` has run the cleanup, the finalizer has
nothing left to do — so this call tells the collector to take the object *off* the finalization queue.
That removes exactly the penalty above: the object no longer needs to be kept alive for finalization,
so it can be reclaimed on the ordinary collection of its generation rather than surviving the extra
one. The deterministic path, done right, buys back the cost the backstop would have imposed.

**The `Dispose(bool disposing)` overload.** The two entry points run in different worlds. Called from
`Dispose` (`disposing: true`), you are on the caller's thread and the object graph is intact, so it is
safe to dispose the *managed* children you own. Called from the **finalizer** (`disposing: false`),
you are on the finalizer thread during a collection, and **the managed objects this one referenced may
already have been collected** — touching them is a bug, potentially a crash. So the finalizer path
does only the one thing that is always safe and always necessary: release the *unmanaged* resource.
The `bool` is how one method serves both callers while touching managed state on only the path where it
is alive.

```quiz 01M1P5J8NBZ8KJGF3XX6J7P7KJ
Why must the finalizer path (`Dispose(disposing: false)`) avoid calling `Dispose` on other managed
objects the instance holds?

- [x] Those managed objects may already have been collected, so touching them is unsafe
  > During finalization the GC may have already reclaimed them; only unmanaged cleanup is safe here.
- [ ] Managed objects clean themselves up, so disposing them from a finalizer is redundant work
  > They do not deterministically self-dispose; the real reason is they may already be gone.
- [ ] The finalizer thread is not allowed to call methods on managed objects at all
  > It can call managed methods; the hazard is specifically that these objects may be collected.
- [ ] Disposing them twice would throw, because `Dispose` had already run
  > A correct `Dispose` is idempotent; the actual danger is the objects no longer being alive.
```

## In an interview

Open on the distinction: **`IDisposable`/`using` is deterministic cleanup you control; a finalizer is
non-deterministic cleanup the GC controls, and you should avoid needing one.** Then show you know the
cost — a finalizer promotes the object and costs it an extra collection — which is *why*
`GC.SuppressFinalize` exists and *why* the modern advice is to wrap the raw unmanaged handle in a
`SafeHandle` so your own type needs no finalizer at all. If pushed on the `bool disposing` parameter,
the answer is the managed-objects-may-be-gone rule, not "code reuse." Prefer `using`; treat a
hand-written finalizer as a smell that a `SafeHandle` usually removes.

Primary source worth reading in full:
[Implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose).
</content>
