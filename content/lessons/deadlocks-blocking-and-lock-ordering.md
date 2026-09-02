---
id: 01M1GEXE74HH6541JWAJH112XB
title: Deadlocks, blocking, and lock ordering
topic:
  - database-transactions
prerequisites:
  - transactions-and-acid
  - isolation-levels-and-row-versioning
---

Two things go wrong when transactions collide, and they are not the same thing. **Blocking** is
one transaction waiting for another to release a lock: normal, temporary, and resolved by the
other transaction finishing. A **deadlock** is two transactions each holding a lock the other
needs, which no amount of waiting resolves — so the engine picks one and kills it.

The distinction matters because the fixes are different. Blocking is fixed by making transactions
shorter or by making them take fewer locks. A deadlock is fixed by making transactions take the
locks they need **in the same order**. Confusing the two produces the classic non-fix: raising a
lock timeout, which turns a deadlock nobody noticed into a timeout nobody understands.

## What is held, and for how long

A lock has a **mode**, a **granularity** and a **duration**, and almost every question about
concurrency is really a question about one of the three.

The modes worth knowing are three. A **shared (S)** lock is taken to read; several can be held on
the same resource at once. An **exclusive (X)** lock is taken to write, and it is compatible with
nothing — not another `X`, not an `S`. An **update (U)** lock is the interesting one: it is taken
where a read is about to become a write, it is compatible with `S` but not with another `U`, and
its whole purpose is to stop two transactions reading the same row with the intention of updating
it and then both trying to convert to `X`.

Granularity runs from a row up through a page to the whole table, and the engine chooses. The
duration is where the isolation level enters: under `READ COMMITTED` an `S` lock is released
after the statement reads the row, under `REPEATABLE READ` it is held until the transaction ends,
and under `SERIALIZABLE` it covers a key range rather than a row. Exclusive locks are always held
to the end of the transaction, at every level, because releasing one early would let another
transaction read work that could still be rolled back.

**So the length of a transaction is the length of its locks.** That single sentence explains most
production blocking.

## Lock escalation: many small locks become one large one

Locks cost memory, and a statement taking hundreds of thousands of row locks costs a great deal
of it. So the engine watches, and when a statement has acquired enough locks on one table or
index it converts them into a single lock at table level — **lock escalation**. Microsoft's
[transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
puts the threshold at around 5,000 locks on a single table or index by one statement, or earlier
under memory pressure (verified September 2026).

The behaviour to be able to predict is the cliff. A bulk `UPDATE` touching a few hundred rows
blocks those rows; the same statement touching six thousand blocks **the entire table**, and
everything reading any part of it stops. The workload did not change gradually — a threshold was
crossed. And a table carrying several nonclustered indexes multiplies the exposure, because each
index is a separate structure being locked and maintained.

The remedy is the same one that fixes long-held locks generally: do the work in batches small
enough to stay under the threshold, committing each one.

```sql
WHILE 1 = 1
BEGIN
    BEGIN TRANSACTION;
        UPDATE TOP (1000) Orders SET Status = 'Processed' WHERE Status = 'Pending';
        IF @@ROWCOUNT = 0 BEGIN COMMIT; BREAK; END
    COMMIT;
END
```

Each batch takes a bounded number of row locks and releases them within milliseconds. The total
work is the same and the total time is slightly longer; what changes is that readers get in
between the batches instead of waiting for all of it.

```quiz 01M1GEXE75KVM9R6PM4M7FSPSM
A nightly `UPDATE` that used to touch ~800 rows now touches ~9,000, and unrelated reads on the
table have started timing out during the run. What is the most likely cause?

- [x] Lock escalation — the statement crossed the threshold and now locks the whole table
  > Past roughly 5,000 locks on one table or index, the row locks are converted to a single
  > table-level lock, so readers of *any* row wait until the transaction commits.
- [ ] The transaction now takes longer, so its row locks are simply held for longer
  > Ten times the rows is not enough to explain reads on unrelated rows blocking; row locks only
  > block contention on those rows. The change is which resource is locked, not for how long.
- [ ] The isolation level escalated because more rows were read
  > Isolation level is a session setting and never changes on its own. Escalation is about lock
  > granularity, which is the engine's choice at any level.
- [ ] The reads deadlocked with the update and were chosen as victims
  > A deadlock is killed immediately with error 1205, not left to time out. Waiting until a
  > timeout is the signature of blocking.
```

## A deadlock is a cycle, and the engine breaks it by killing someone

```sql
-- Transaction A
BEGIN TRANSACTION;
    UPDATE Users    SET ... WHERE UserID = 1;      -- takes X on Users
    UPDATE Accounts SET ... WHERE UserID = 1;      -- wants X on Accounts

-- Transaction B, concurrently
BEGIN TRANSACTION;
    UPDATE Accounts SET ... WHERE UserID = 1;      -- takes X on Accounts
    UPDATE Users    SET ... WHERE UserID = 1;      -- wants X on Users
```

Each holds what the other is waiting for. Neither can proceed and neither will give way, so this
would wait forever. SQL Server's deadlock monitor detects the cycle, chooses a **victim** — by
default the transaction that is cheapest to roll back, influenced by `SET DEADLOCK_PRIORITY` —
rolls it back entirely, and returns **error 1205** to that session. The other transaction
proceeds as if nothing happened.

Two consequences follow, and both are load-bearing.

**A deadlock is not an error condition of the database; it is a normal outcome of concurrency.**
Any application doing concurrent writes should catch 1205 and retry the transaction, with a small
randomised backoff so the two contenders do not collide again in step. A transaction that is
retried must be safe to run twice, which is a design constraint on the transaction, not on the
retry loop.

**The cycle is created by the order the locks were taken in.** Which is what makes the fix
available: if both transactions had touched `Users` before `Accounts`, one would simply have
waited for the other. This is the single most useful prevention, and it is a code convention
rather than a database setting — **acquire locks on shared resources in one agreed order**,
everywhere.

The other three preventions are worth naming because interviewers expect more than one:

- **Keep transactions short.** A cycle can only form while both parties are holding something.
- **Index the predicates.** A write that scans to find its rows locks everything it scanned; a
  write that seeks locks what it changes. Indexing is a concurrency fix as much as a speed one —
  see [[clustered-and-nonclustered-indexes]].
- **Take the right lock up front** when a read is going to become a write. Reading with the
  intention of updating and then updating gives two transactions the chance to both read first;
  `WITH (UPDLOCK)` on the read takes the update lock immediately, so the second one waits rather
  than joining a cycle.

```quiz 01M1GEXE75QM8RAKV6A5FM3M4P cloze
{{Blocking}} is one transaction waiting for a lock another holds, and it resolves when that
transaction ends. A {{deadlock}} is a cycle of such waits that resolves never, so SQL Server
detects it, rolls back the cheapest transaction as the {{victim}}, and returns error {{1205}}
to it. The most effective prevention is for all code to acquire locks in a consistent
{{order}}, and any application doing concurrent writes should {{retry}} the killed transaction.
```

## The locks nobody meant to take

Three ways a transaction ends up holding locks that the code does not appear to ask for.

**Implicit transactions.** SQL Server autocommits by default — one statement, one transaction —
but `SET IMPLICIT_TRANSACTIONS ON` makes every statement open a transaction that stays open until
an explicit `COMMIT`. Now a `SELECT` that looks like a single read is an open transaction holding
whatever it took, for as long as that connection is idle. Drivers, ORMs and pooled connections can
turn this on without the application ever saying so, and the signature is locks held by a session
that appears to be doing nothing.

**A transaction wrapped around a wait.** Any transaction that stays open across a network call,
a message publish, or worse a user interaction, holds its locks for the duration of that wait.
The rule is that a transaction covers the writes that must agree, and nothing else; where a
human's thinking time falls inside the window, the answer is optimistic concurrency — a version
column checked in the `WHERE` clause — rather than a held lock. That mechanism is in
[[transactions-and-acid]].

**Reader/writer contention that need not exist.** Under the default `READ COMMITTED`, readers and
writers on the same rows block each other. Row versioning removes that collision entirely, which
is why RCSI is the usual first response to widespread blocking on a read-heavy system. It does
**not** help with deadlocks between two writers — versioning does nothing about write/write
conflicts — which is a good sanity check on any diagnosis: if the blocked sessions are both
writing, versioning is not the fix. See [[isolation-levels-and-row-versioning]].

```quiz 01M1GEXE75RV04GQ1VTVXVATPR recall
An interviewer says: "We deadlock a few times an hour in production. How do you approach it?"

> First, separate deadlock from blocking, because people report them interchangeably. A deadlock
> comes back immediately as error 1205 with a rolled-back transaction; blocking shows up as
> queries that are slow or that hit a timeout. If it is really blocking, I am looking for a long
> transaction or lock escalation, not for a cycle.
>
> For genuine deadlocks I want the deadlock graph, which SQL Server captures — it names both
> transactions, the resources each held, and the resource each was waiting on. That turns the
> question from speculation into reading a cycle off a diagram.
>
> Then I look at the order the two paths take their locks in, because that is nearly always the
> cause: two code paths touching the same two tables in opposite orders. The fix is a convention
> that everything acquires them in one agreed order, enforced in review. If one path reads a row
> and then updates it, I would also consider taking an update lock on the read so two readers
> cannot both get there first.
>
> Alongside that I would look at whether the transactions need to be as long as they are, and
> whether the statements involved are seeking or scanning — a write that scans locks everything
> it scanned, so an index can remove a whole class of collisions.
>
> And regardless of the fix, the application should be retrying on 1205 with a randomised
> backoff. A few deadlocks an hour under concurrency is a normal outcome, not necessarily a
> defect, and the transaction has to be safe to run twice for that to be true.
>
> What I would not do is raise the lock timeout or lower the isolation level to make the symptom
> quieter. Neither breaks the cycle; the first hides it and the second trades it for wrong data.
```

## What this buys you in the room

The sequence for any concurrency incident is: is anything actually deadlocked, or is it waiting?
If waiting — what is the blocker holding, and why is it holding it for that long? If deadlocked —
what were the two lock orders, and which one changes?

The views for finding the blocking session, reading the deadlock graph and measuring how long
locks are held collect in [[sql-server-performance-dmvs]]. The one thing to go and read in full
is Microsoft's
[SQL Server transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide),
which is the primary source for lock modes and their compatibility, escalation, and how deadlocks
are detected and resolved.
