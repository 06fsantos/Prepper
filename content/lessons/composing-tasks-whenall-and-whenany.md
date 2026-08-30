---
id: 01M19J52DFA5P8P87AZ4XH25X4
title: Composing tasks with WhenAll and WhenAny, and what each one does not do
topic:
  - async-await
prerequisites:
  - the-async-state-machine
---

A single `await` describes one operation suspending at one point. Most real work is several
independent operations that want to overlap: three service calls, a fan-out over a list of ids, a
race between a fetch and a timer. `Task.WhenAll` and `Task.WhenAny` are how those are expressed —
and most of what is worth knowing about them is what they leave for you to do.

## Concurrency comes from starting, not from composing

```csharp
// Sequential: the second fetch does not begin until the first has finished.
int a = await FetchAsync(1);
int b = await FetchAsync(2);

// Concurrent: both are in flight before anything is awaited.
Task<int> t1 = FetchAsync(1);
Task<int> t2 = FetchAsync(2);
int a2 = await t1;
int b2 = await t2;

// Concurrent, with one synchronisation point.
Task<int> t3 = FetchAsync(1);
Task<int> t4 = FetchAsync(2);
await Task.WhenAll(t3, t4);
```

The second and third forms are equally concurrent. What made them concurrent is that both calls
were **made** before either was awaited — a task-returning method starts running when it is
called, not when it is awaited. `Task.WhenAll` adds a single place to wait, which reads better
over a list than a chain of awaits, and adds nothing to the overlap.

That also explains a trap worth naming early. Passing calls straight into `WhenAll` is fine:

```csharp
await Task.WhenAll(FetchAsync(1), FetchAsync(2));   // both start; the arguments are evaluated first
```

but building the sequence lazily is not:

```csharp
var lazy = ids.Select(id => FetchAsync(id));   // IEnumerable, nothing has started
await Task.WhenAll(lazy);                      // WhenAll enumerates it, and only then do they start
```

The deferred `Select` is the version that surprises people. Materialise it — `.ToList()` or
`.ToArray()` — so the calls are made once, at a point you can see, rather than during whatever
enumerates the sequence.

```quiz 01M19J52DFJ2AKJ8YMEWM01Y5D cloze
Two independent operations run concurrently because both were {{called}} before either was
awaited. `Task.WhenAll` contributes a single place to {{wait}}, and no additional overlap of its
own.
```

## `WhenAll`: everything, and every failure

`Task.WhenAll` takes tasks and returns a new task that completes once all of them have completed,
successfully or not. The `Task<TResult>` overloads return `TResult[]`, in the order the tasks were
given rather than the order they finished:

```csharp
Task<int>[] tasks = ids.Select(id => FetchAsync(id)).ToArray();
int[] results = await Task.WhenAll(tasks);
```

It waits for **all** of them even when one has already failed. There is no fail-fast: a batch
whose second task throws immediately still takes as long as its slowest member.

## `WhenAny`: the first one, and nothing else

`Task.WhenAny` returns a task that completes as soon as any input task completes, and its result
is the task that won:

```csharp
Task<int> winner = await Task.WhenAny(fromCache, fromService, fromFallback);
```

The losers keep running. `WhenAny` cancels nothing, stops nothing, and observes nothing — it
reports which one finished first and leaves the rest exactly as they were. If they hold
connections, buffers or pool threads, they still hold them, and if one of them faults later with
nobody awaiting it, the exception is unobserved.

The winner is also not necessarily a success. It is whichever task completed first, and completing
by throwing counts:

```csharp
Task winner = await Task.WhenAny(tasks);
if (winner.IsFaulted)                  { /* handle */ }
else if (winner.IsCanceled)            { /* handle */ }
else if (winner.IsCompletedSuccessfully) { /* await it for the value */ }
```

The pattern this powers most often is a timeout:

```csharp
Task<int> work = FetchAsync();
if (await Task.WhenAny(work, Task.Delay(TimeSpan.FromSeconds(5))) != work)
    throw new TimeoutException();
int value = await work;
```

which times out **your waiting** and not the work. The fetch is still running afterwards, still
holding whatever it holds. A timeout with teeth passes a `CancellationToken` into the operation
itself, and this composition is the fallback for operations that do not accept one. The same
distinction shows up wherever timeouts are stacked — see
[[total-versus-per-attempt-timeouts]] for the version of it that bites in an HTTP client.

```quiz 01M19J52DFPNJSB9V2DVAZXXTJ recall
A service races a primary call against a five-second `Task.Delay` using `Task.WhenAny`, and when
the delay wins it logs a timeout and returns a fallback. Load tests show the downstream dependency
receiving far more concurrent work than the request rate suggests. Explain the mechanism.

> `WhenAny` reports which task finished first; it does not cancel, stop or observe the others. So
> every timed-out call is still in flight against the downstream dependency after the caller has
> given up on it, and under load these accumulate — the dependency sees the sum of everything
> started rather than everything being waited on, which is exactly the condition that keeps it
> slow and keeps producing timeouts.
>
> The fix is to make the timeout reach the work: pass a `CancellationToken` into the operation and
> cancel it when the timer wins, so the abandoned call actually stops. A faulted abandoned task
> also has nobody awaiting it, so plan for observing its exception rather than discovering it in
> a log you did not expect.
```

## Exceptions: one is re-thrown, the rest are still there

A faulted task carries an `AggregateException`. Awaiting it does not give you that — the await
unwraps and re-throws the **first** exception, which is what makes ordinary `catch` clauses work
against async code at all:

```csharp
try
{
    int[] results = await Task.WhenAll(tasks);
}
catch (InvalidOperationException ex)
{
    // Reached if that was the first exception. The other failures are not in `ex`.
}
```

This is the part that catches people out with `WhenAll`: three tasks fail, one exception is
thrown, and the handler quietly represents one third of what went wrong. To see all of them, keep
the composed task and read its `Exception` after the await has thrown:

```csharp
Task<int[]> all = Task.WhenAll(tasks);
try { await all; }
catch
{
    foreach (var inner in all.Exception!.Flatten().InnerExceptions)
        Log(inner);
}
```

`Flatten()` collapses nesting, which composition of composed tasks produces. In most code letting
the first exception surface is the right call — one exception is simpler to log and to propagate.
Reach for the full set when you actually intend to act on each failure separately, which is
usually a sign that the next section is what you wanted.

```quiz 01M19J52DF88TMDCDMX04SGDJ4
`await Task.WhenAll(t1, t2)` runs, `t1` throws `ArgumentException` and `t2` throws
`InvalidOperationException`. What does the `await` expression throw?

- [x] `ArgumentException` alone, with the other failure still on the composed task
  > An await unwraps the aggregate and re-throws the first; the rest live on `.Exception`.
- [ ] An `AggregateException` holding both of the failures together
  > That is what a blocking wait surfaces, not what awaiting a faulted task surfaces.
- [ ] `InvalidOperationException`, the more specific of the two failures
  > Nothing ranks the exceptions by type; ordering is the tasks' own, not a priority.
- [ ] Nothing — `WhenAll` completes and the failures are on the results
  > It faults whenever any input faults, and the await propagates that fault as a throw.
```

## Composition moves allocation; it does not remove it

Two suspending fetches awaited one after another suspend the calling method twice. The same two
composed under one `WhenAll` suspend the calling method once. That is a real difference in the
calling method's own accounting — but the individual tasks are unchanged: each still suspends and
each still promotes its own state machine, exactly as
[[the-async-state-machine|a suspension always does]]. `WhenAll` itself allocates too: an array or
list to track the children, and a result array for the values.

The supportable statement is that **`WhenAll` changes where allocation happens, not how much**.
Choose between the shapes on the grounds that actually differ — whether the operations are
independent, and whether one synchronisation point reads better than several — rather than on an
allocation argument that does not survive being measured. If it matters enough to trade clarity
for, measure it; [[allocation-profiling-in-practice]] is that job.

## Cancellation is threaded, never inherited

`Task.WhenAll` has no cancellation-aware overload that reaches into its children. A token gets to
the work only because you passed it there:

```csharp
async Task FetchAllAsync(IEnumerable<int> ids, CancellationToken ct)
{
    var tasks = ids.Select(id => FetchAsync(id, ct)).ToList();
    await Task.WhenAll(tasks);
}
```

And a child failing does not cancel its siblings. `WhenAll` waits for all of them regardless; if
one failure should abandon the batch, that is a `CancellationTokenSource` you own, linked into
every child and cancelled from your own exception handling. Nothing about composition arranges it
for you.

## Partial failure is data, not an exception

Fan-out to N services where some results are acceptable is a different problem from "did the batch
succeed". Unwinding the whole batch on the first exception throws away the successes you already
paid for. Catch inside each child, and let `WhenAll` return a mixture:

```csharp
var outcomes = await Task.WhenAll(ids.Select(async id =>
{
    try { return (Id: id, Ok: true, Value: await FetchAsync(id, ct)); }
    catch (Exception ex) { Log(id, ex); return (Id: id, Ok: false, Value: default(int)); }
}).ToList());
```

Now `WhenAll` never faults, every child is accounted for, and the caller decides what a
sufficient quorum is. The shape is worth recognising as a design decision rather than an
idiom — you are choosing to model failure as a value because partial success is meaningful here,
and choosing exceptions where it is not.

## Large N wants a bound, not a bigger `WhenAll`

`WhenAll` over a thousand tasks starts a thousand operations at once. Nothing in it limits
concurrency; it is a synchronisation point, not a scheduler. Two things get hurt at that scale:
your own process, which now holds a thousand in-flight operations' worth of state, and the
dependency on the other end, which is receiving a thousand simultaneous requests from one caller.

The answer is to bound the fan-out — a `SemaphoreSlim` gating the calls, a channel with a fixed
number of workers, or `Parallel.ForEachAsync` with `MaxDegreeOfParallelism` — and let `WhenAll`
wait on a bounded set. Which mechanism suits is its own question:
[[concurrency-primitives-compared]] and [[choosing-a-concurrency-primitive]] are where it is
answered. The reason to bound it on the *dependency's* behalf is the same argument as
[[bulkheads-and-blast-radius]]: a cap on concurrent calls to one dependency is what stops your
fan-out from being the reason it falls over.

## What to take away

**`WhenAll` waits for everything and hides all but the first failure; `WhenAny` waits for the
first and abandons the rest still running.** Both are synchronisation points and neither is a
scheduler, a canceller, or a bound — concurrency comes from calling, cancellation comes from a
token you threaded, and a limit comes from a primitive you chose.

Worth reading in full: Microsoft Learn's
[Asynchronous programming with async and await](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/),
which works through the composition patterns and how exceptions flow out of them.
