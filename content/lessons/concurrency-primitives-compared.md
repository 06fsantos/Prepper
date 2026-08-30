---
id: 01M19JW2EJYBER5PMVNQSZ67AJ
title: Each concurrency primitive answers a different question
topic:
  - concurrency-primitives
prerequisites:
  - the-async-state-machine
---

`async`/`await`, `Task.Run`, `Thread`, `Channel<T>` and `lock` are not five ways of doing the
same thing with different performance. Each of them answers a **different structural question**
about your code, and most of the confusion around them comes from asking one of them a question
it was never built to answer — most famously asking `Task.Run` to do I/O.

This note takes them one at a time: what each one is for, what it costs, and where it stops
working. Which one a given problem wants, side by side and in a table you can look up under
pressure, is [[choosing-a-concurrency-primitive]].

## `async`/`await` — suspension, not parallelism

**Reach for it when you are waiting for I/O**: a network call, a disk read, a database round
trip, a timer. Somebody else — the kernel, the network card, the remote server — is doing the
real work, and your job is only to arrange not to be standing there while it happens.

The mechanism is the reason it belongs to I/O and nothing else. An `await` does **not** run
anything in parallel and does not block a thread. It checks whether the awaited operation has
already finished; if it has not, it saves the method's state, hooks up a continuation, and
returns, leaving the thread free to do something else entirely. When the operation completes,
the continuation resumes the method. What that costs, and when it costs anything at all, is
[[the-async-state-machine]] — the short version is that the machinery is a struct on the stack
until the method actually suspends, so a path whose awaits complete synchronously allocates
nothing for them.

That is the whole of what `async` buys you: **the thread is not occupied during the wait.** No
extra work is happening at once. A single async operation, awaited, is exactly as fast as the
blocking version and no faster; the win shows up when there are a thousand of them and you did
not need a thousand threads.

```csharp
public async Task<string> FetchDataAsync(string url)
{
    var response = await _httpClient.GetAsync(url);
    return await response.Content.ReadAsStringAsync();
}
```

**The mistake this section exists for** is `await Task.Run(() => SomeIoMethod())` — reaching for
a background thread to perform I/O and then awaiting it. It is the worst of both: a pool thread
is taken out of circulation and parked on a blocking I/O call for the whole duration, so you pay
for a thread *and* wait just as long, and the caller's async-ness buys nothing back. If the API
you are calling has an async form, call it directly. If it does not, see the next section — and
understand what you are actually buying there, which is less than it looks.

## `Task.Run` — parallelism on demand

**Reach for it when you have CPU-bound work** you want off the calling thread: a parse, a
compression, a computation heavy enough that doing it inline would make an interactive caller
wait or an event loop stall.

`Task.Run(action)` queues `action` to the thread pool and hands you a `Task` representing its
completion. Awaiting that task suspends the caller — normal `await` mechanics — while a pool
worker runs the work. Two threads are now involved, and unlike the async case one of them is
genuinely busy computing.

```csharp
public async Task<Result> ProcessDataAsync(string largeInput)
{
    return await Task.Run(() => ExpensiveCalculation(largeInput));
}
```

The other use — breaking out of a synchronous call chain, when you are in an async method and
the only API available is blocking — is real but worth being honest about. `Task.Run` does not
make a blocking call non-blocking. It **moves the block onto a different thread**, which is
useful when the thread you are moving it off matters (a UI thread) and much less useful when it
does not (a server request already running on a pool thread, where you have swapped one occupied
pool thread for another plus a `Task`).

**Where it stops working is concurrency degree.** `Task.Run` is bounded by how many pool workers
are willing to run at once, and the pool grows its worker count deliberately slowly, by
experiment — see [[thread-pool-scheduling-and-starvation]]. Queue ten thousand `Task.Run` calls
and you do not get ten thousand things happening; you get a long queue, a pool climbing towards
some modest count, and latency that looks nothing like the parallelism you asked for. It is a
good answer for a handful of CPU-bound items and a poor one for a high-throughput pipeline.

### The long-running end of the same axis

There is a second way `Task.Run` misfits, at the other extreme: work that occupies a thread for
a *long* time. A pooled worker is meant for short items, and the pool's sizing logic is watching
throughput to decide whether more threads would help. Work that sits on a worker for seconds
looks, from the outside, indistinguishable from a pool that is short of threads.

`TaskCreationOptions.LongRunning` says so explicitly:

```csharp
Task.Factory.StartNew(
    () => CpuBoundWork(),
    CancellationToken.None,
    TaskCreationOptions.LongRunning,
    TaskScheduler.Default);
```

It is a **hint to the scheduler**, not a guarantee — the default scheduler responds to it by
giving the work a dedicated thread instead of a pooled one, which keeps a long occupation out of
the pool's bookkeeping and out of the way of the short items the pool exists for. That makes it
the bridge to the next primitive: at some point "too long for a pooled thread" just means you
wanted a thread.

```quiz 01M19JW2EKBNZ89DFY4S0SRG2Q
A method calls a synchronous, blocking database driver. A colleague wraps it as
`await Task.Run(() => _db.Query(id))` inside an ASP.NET Core request handler and calls it
"making the call async". What has actually changed?

- [x] The blocking wait moved to another pool thread; nothing was made asynchronous
  > Two pool threads are now involved where one was, and one is still parked for the duration.
- [ ] The call now suspends without a thread, the way async I/O does
  > Suspension needs an API that reports completion. A blocking call reports it by returning.
- [ ] The database driver is invoked through the I/O completion path instead
  > `Task.Run` schedules a delegate onto a worker. It cannot change how the driver waits.
- [ ] Throughput improves because the request thread is released early
  > It is released to the pool that the wrapped work immediately borrows another thread from.
```

## `Thread` — dedicated parallelism you own

**Reach for it when you want a thread of your own**: a long-lived loop that runs for the life of
the process, a listener, a worker with its own scheduling or priority needs, something that must
not be at the mercy of a pool's tuning decisions.

`new Thread(action)` creates an OS thread with its own stack and runs `action` on it. That is
the most direct control the platform gives you, and the price of it is the stack: **on x64 the
default is around 1 MB of reserved address space per thread**, a platform default rather than a
constant — it is configurable through the `Thread` constructor's `maxStackSize` and differs by
platform and process settings.

```csharp
public class Server
{
    private readonly Thread _listener;

    public Server()
    {
        _listener = new Thread(ListenForConnections)
        {
            IsBackground = false,
            Name = "ServerListener"
        };
        _listener.Start();
    }

    private void ListenForConnections()
    {
        while (!_shutdown)
        {
            HandleClient(_socket.AcceptSocket());
        }
    }
}
```

That default is the whole scaling story. A thread is a **resource you count**, not an ephemeral
object you create per unit of work:

```csharp
foreach (var request in requests)
{
    new Thread(() => HandleRequest(request)).Start(); // a memory disaster
}
```

Ten thousand requests here means ten thousand stacks and ten thousand entries for the OS
scheduler to timeshare between, on hardware that can genuinely run a couple of dozen of them.
The pool exists precisely so you do not write this; a raw `Thread` is for the small, fixed set
of workers whose lifetime is measured in "until shutdown".

```quiz 01M19JW2EMX3EQ8HFNFRCC6F0A cloze
A `Thread` gets its own stack, whose reserved size on x64 defaults to about {{1 MB}} — which is
why one thread per work item exhausts memory long before it exhausts the CPU. `async`/`await`
needs no thread while it {{waits}}, so a thousand in-flight operations do not cost a thousand
stacks.
```

## `Channel<T>` — decoupling, with backpressure

**Reach for it when producers and consumers run at different speeds** and you want that
difference handled rather than buffered. A `Channel<T>` created with a bounded capacity is a
queue with a contract on both ends: `Writer.WriteAsync` **suspends the producer when the buffer
is full**, `Reader.ReadAsync` suspends the consumer when it is empty. Neither side blocks a
thread while waiting — both suspend, on ordinary `await` mechanics.

```csharp
var channel = Channel.CreateBounded<WorkItem>(
    new BoundedChannelOptions(capacity: 100));

async Task ProduceAsync()
{
    try
    {
        for (int i = 0; i < 10_000; i++)
        {
            // suspends while the buffer is full — this is the backpressure
            await channel.Writer.WriteAsync(new WorkItem { Id = i });
        }
    }
    finally
    {
        channel.Writer.Complete();
    }
}

async Task ConsumeAsync()
{
    await foreach (var item in channel.Reader.ReadAllAsync())
        await ProcessAsync(item);
}
```

**Backpressure is the point, and the bound is what creates it.** The alternative people reach
for is a plain `Queue<T>` with a lock around it, which is unbounded: when producers outrun
consumers, the queue absorbs the difference and keeps absorbing it until memory runs out, and
the failure arrives late, far from its cause, as an out-of-memory. A bounded channel converts
that into slowing the producer down — the earliest and most legible place for the pressure to
surface. The capacity you choose is the explicit statement of how much slack you are willing to
carry.

The coordination between the two ends needs no locking **from you** — the channel does its own
synchronisation internally — and because waiting on either end is a suspension rather than a
blocked thread, the number of concurrent producers and consumers is not bounded by the number of
threads. That is what makes it the right shape for a pipeline where `Task.Run` per item is not.

## `lock` — mutual exclusion, at the price of serialisation

**Reach for it when several threads read and write the same mutable state** and you need them
not to interleave. `lock (obj) { ... }` admits one thread at a time; the rest wait. For state
with real invariants across several fields — a tree, a cache and its metadata, anything where
"correct" spans more than one write — that is far easier to get right than a lock-free scheme.

```csharp
public class Cache<K, V>
{
    private readonly Dictionary<K, V> _cache = new();
    private readonly object _lock = new();

    public V Get(K key)
    {
        lock (_lock) { return _cache[key]; }
    }

    public void Set(K key, V value)
    {
        lock (_lock) { _cache[key] = value; }
    }
}
```

The lock itself allocates nothing per operation. What it costs is **everything inside it running
one at a time**, and the cost of a waiting thread: a contended `Monitor` spins briefly on the
chance the lock frees up immediately, then falls back to a genuine wait. Either way that thread
is doing none of your work, and if it is a pool thread you have taken it out of the pool.

Both of the ways `lock` goes wrong follow from that.

**Holding it across I/O** is the acute one:

```csharp
public string GetFromDatabase(int id)
{
    lock (_lock)
    {
        return _database.Query(id);   // every other thread waits out the round trip
    }
}
```

The critical section is now as long as a network call, and every thread that wants the lock is
parked for that whole duration. It is also why you cannot simply make this method async and keep
the `lock`: a `lock` is thread-affine and the compiler will not let you `await` inside one at
all. The async-compatible alternatives are in [[choosing-a-concurrency-primitive]].

**High contention** is the chronic one. A lock that many threads want most of the time has
turned your concurrent program back into a sequential one with extra overhead — you are paying
for threads and getting one thread's throughput. The answer is rarely a better lock; it is a
shorter critical section, or a design where the state is not shared in the first place, which is
exactly the trade a `Channel<T>` makes by handing ownership from one stage to the next instead
of sharing it.

```quiz 01M19JW2EMWEACEVRZMK9F8BS6
A service holds a `lock` around a call to a remote API so that only one request hits it at a
time. Under load, throughput collapses and the CPU sits nearly idle. What is the best reading?

- [x] Every thread wanting the lock is parked for a full network round trip
  > The critical section is as long as the remote call, so the lock serialises the whole system.
- [ ] The lock is being taken so often that spinning is burning the cores
  > Idle CPU is the tell against that: spinning is short and would show up as CPU, not absence.
- [ ] Threads waiting on a lock are added to the pool's starvation count
  > The pool reacts to queued work, and does not track why an existing worker stopped running.
- [ ] The remote API is the bottleneck and the lock is incidental to it
  > One caller at a time is a limit the lock imposed; the API was never asked for more.
```

## `async void` — the signature that swallows the failure

One trap does not belong to any of the five and is worth stating on its own, because it is
almost never stated until something has already gone wrong in production.

An `async void` method **cannot be awaited**. There is no `Task` to hold, so the caller has no
way to know when it finished, and — the part that bites — **no way to catch what it threw**. A
`try`/`catch` around the call site catches only what goes wrong before the first suspension;
after that, the method's continuation is running somewhere the call site has already left.

Where "somewhere" is, is [[capturing-a-synchronization-context]]. An unhandled exception from an
`async void` method is raised on the `SynchronizationContext` that was captured when the method
started, not returned to the caller. On a UI framework that means it surfaces through the
message loop's unhandled-exception path. Where there is no context to raise it on — a console
app, ASP.NET Core — there is nothing to catch it and the process goes down.

```csharp
try
{
    FireAndForget();          // returns at the first await
}
catch (Exception)
{
    // never runs for anything thrown after that first suspension
}

async void FireAndForget()
{
    await Task.Delay(100);
    throw new InvalidOperationException();   // nobody's problem, and everybody's
}
```

**The one place the signature is legitimate is a UI event handler**, where the framework fixed
the delegate's shape before you got there — `async void Button_Click(object sender, EventArgs e)`
— and even there the body wants a `try`/`catch` around everything it does. Everywhere else,
return `async Task`. If the caller genuinely does not want to wait, that is a decision it should
make with a `Task` in its hand, not one forced on it by a return type.

```quiz 01M19JW2EME6DZ95FY14Q7CYE8 recall
A background refresh is written as `async void RefreshAsync()` and called inside a
`try`/`catch`. It sometimes fails silently, and once took the process down. Reconstruct why the
`try`/`catch` does not help, and what the signature should have been.

> The `catch` only covers the part of `RefreshAsync` that runs before its first suspension.
> After that the call returns — there is no `Task`, so the caller cannot wait for the rest — and
> the remainder resumes as a continuation, long after the `try` block has been left. An
> exception thrown there has no caller to propagate to, so it is raised on the
> `SynchronizationContext` captured when the method started; on a UI framework that goes to the
> message loop's unhandled-exception path, and where there is no context it becomes an
> unhandled exception that terminates the process. The fix is `async Task RefreshAsync()`, so
> the failure lands on a task the caller can await, observe and handle — and if the caller
> really wants fire-and-forget, it makes that choice explicitly, with a continuation that logs.
```

## What to take away

**Name the question before the primitive.** Am I waiting, or am I working? Is the work short or
does it own a thread for its lifetime? Are two stages running at different speeds, or is one
piece of state being touched by several threads? `async`/`await` frees a thread during a wait
and adds no parallelism; `Task.Run` adds parallelism bounded by the pool; `Thread` buys a
dedicated stack you must count; `Channel<T>` decouples two stages and makes the mismatch
between them visible as backpressure; `lock` buys safety by serialising. Reaching for the wrong
one usually produces code that works in development and falls over exactly when concurrency
arrives.

Worth reading in full: Microsoft's [Asynchronous programming (C#
docs)](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/) for the model
these choices sit inside, and Stephen Toub's [How Async/Await Really Works in
C#](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/) for what `await`
actually compiles to.
