---
id: 01M1GETH95T6CKZKGR418DA59D
title: Isolation levels and row versioning
topic:
  - database-transactions
prerequisites:
  - transactions-and-acid
---

Isolation is the one ACID guarantee that is sold in degrees. Every degree of it costs
concurrency, because the only ways to stop one transaction seeing another's half-finished work
are to make it wait or to give it something older to read. An **isolation level** is the choice
of how much to buy, and it is a per-session setting that two connections to the same database
can disagree about.

The way to hold the levels in your head is not as a ranked list but as a set of **anomalies each
one admits**. There are three classical ones, and naming them precisely is most of what an
interview is testing:

- A **dirty read** — reading a value another transaction has written and not committed. If that
  transaction rolls back, you acted on a value that was never true.
- A **non-repeatable read** — reading a row twice in one transaction and getting two different
  values, because someone committed a change in between.
- A **phantom read** — running the same *query* twice and getting a different set of rows,
  because someone committed an insert or delete that matches your `WHERE` clause.

The difference between the last two is the difference between a **row** changing and the
**membership of a set** changing, and that distinction is what separates the two strictest
levels.

## `READ UNCOMMITTED` takes no shared locks at all

At this level a read acquires no shared locks and respects none, so it sees whatever is currently
in the page — including uncommitted writes.

```sql
-- Session A
BEGIN TRANSACTION;
UPDATE Inventory SET Quantity = Quantity - 5 WHERE ProductID = 1;   -- 100 becomes 95
-- ... still open ...

-- Session B
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT Quantity FROM Inventory WHERE ProductID = 1;                 -- 95

-- Session A
ROLLBACK;                                                            -- back to 100
```

Session B read 95, a number that was never a committed state of the database. All three anomalies
are admitted. Less famously, because the reader ignores locks entirely, it can also read a row
**twice or not at all** while a concurrent write moves rows around within an index — a scan can
miss rows that were there the whole time.

`WITH (NOLOCK)` is a table hint that means the same thing on one table. It is common in the wild
and it is common precisely because its cost is invisible until it is not: the returned number is
simply wrong occasionally, with nothing in the plan or the logs to say so. What this level *does*
is remove locking overhead; whether that trade is acceptable is a judgement about how wrong an
answer is allowed to be, and if the motivation is a report being blocked by writers, row
versioning below solves that without giving up correctness.

## `READ COMMITTED` is the default, and its shared locks are statement-scoped

SQL Server's default level, verified against
[Microsoft's transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
in September 2026. A read takes a shared lock, which prevents it seeing uncommitted data, and
**releases it as soon as the statement has read the row** rather than holding it to the end of
the transaction.

That release is exactly what admits the second anomaly:

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION;
    SELECT Price FROM Products WHERE ProductID = 1;   -- 100
    -- another session commits Price = 120 here
    SELECT Price FROM Products WHERE ProductID = 1;   -- 120
COMMIT;
```

One transaction, one row, two answers. Dirty reads are gone; non-repeatable reads and phantoms
remain. For most OLTP work that is the right trade, which is why it is the default — and the
practical consequence to remember is that under this level a reader and a writer on the same row
**block each other**, which is where most "the query intermittently times out" reports come from.

## `REPEATABLE READ` holds the shared locks to the end of the transaction

The one-line difference: the shared locks a read takes are kept until `COMMIT` or `ROLLBACK`, so
nothing can modify a row you have already read.

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;
    SELECT Price FROM Products WHERE ProductID = 1;   -- 100, lock held
    -- another session's UPDATE on that row now waits
    SELECT Price FROM Products WHERE ProductID = 1;   -- 100
COMMIT;                                               -- lock released, writer proceeds
```

What it does not do is stop rows *appearing*. A lock on the rows you read is not a lock on rows
that do not exist yet, so:

```sql
SELECT COUNT(*) FROM Orders WHERE CustomerID = 5;   -- 10
-- another session inserts an order for customer 5 and commits
SELECT COUNT(*) FROM Orders WHERE CustomerID = 5;   -- 11
```

That is the phantom, and it is the anomaly that survives here. The other cost is deadlock risk:
holding more locks for longer is precisely the condition under which two transactions end up
waiting on each other, which is [[deadlocks-blocking-and-lock-ordering]].

```quiz 01M1GETH97RKJW4RKKQ7C95XJF
Under `REPEATABLE READ`, a transaction runs `SELECT COUNT(*) FROM Orders WHERE CustomerID = 5`
twice and gets 10 then 11. What happened, and is it a bug in the level?

- [x] A phantom read — the level locks rows read, not rows that could match
  > Shared locks were held on the ten existing rows, but an insert creates a row no lock covered.
  > Preventing it needs a lock over the *range* the predicate describes.
- [ ] A non-repeatable read — the same query returned a different result
  > A non-repeatable read is one *row* changing value between reads. Here every original row is
  > unchanged; the set gained a member, which is the distinction the two names carry.
- [ ] A dirty read — the second count included an uncommitted insert
  > No level above `READ UNCOMMITTED` returns uncommitted data, and the inserting transaction
  > had committed before the second count ran.
- [ ] A bug — `REPEATABLE READ` is specified to prevent exactly this
  > It is specified to prevent dirty and non-repeatable reads only. Phantoms are what
  > `SERIALIZABLE` adds, and the gap between them is deliberate.
```

## `SERIALIZABLE` locks the range, not just the rows

The strictest level: dirty reads, non-repeatable reads and phantoms are all prevented, and the
result is as if the concurrent transactions had run one after another in some order.

The mechanism is **key-range locks**. A predicate like `CustomerID = 5` locks not the ten rows
that match but the *range of index keys* they occupy, so an insert that would fall into that
range waits. That is only possible when there is an index the range can be taken on — without
one, the engine locks a great deal more than the predicate describes.

The cost is proportional. More locks, held longer, over ranges rather than rows, is the maximum
of blocking and the maximum of deadlock risk. It is the right answer where a correctness failure
is unacceptable and the contention is genuinely low, and it is very often reached for as though
it were free.

## Row versioning: read an old version instead of waiting

Everything above buys isolation with locks, and locks are why readers and writers block each
other. SQL Server's second axis buys it a different way: when a row is modified, the previous
version is kept in the **version store** in `tempdb`, and readers are given the version that was
committed at the moment they are entitled to see. A reader that would have waited now reads.
**Writers still block writers** — versioning does nothing about two transactions modifying the
same row — but the reader/writer collision disappears.

Two levels use it, and they differ in *when* the snapshot is taken.

**Read committed snapshot isolation (RCSI)** is turned on for the database, and it changes what
`READ COMMITTED` means for every transaction in it: the snapshot is taken per **statement**.

```sql
ALTER DATABASE YourDB SET READ_COMMITTED_SNAPSHOT ON;
```

Each statement sees the data as committed at the moment that statement began. Dirty reads are
still impossible, non-repeatable reads and phantoms are still admitted — the guarantees are
exactly `READ COMMITTED`'s — but nothing blocks. This is why it is the usual first move against
lock contention on a read-heavy system: the application code does not change, no new failure mode
is introduced, and the blocking goes away.

**`SNAPSHOT`** is opted into per transaction, and the snapshot is taken once, at the **start of
the transaction**.

```sql
ALTER DATABASE YourDB SET ALLOW_SNAPSHOT_ISOLATION ON;

SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN TRANSACTION;
    SELECT COUNT(*) FROM Orders WHERE CustomerID = 5;   -- 10
    -- another session inserts and commits, without blocking
    SELECT COUNT(*) FROM Orders WHERE CustomerID = 5;   -- still 10
COMMIT;
```

Every statement in the transaction sees one consistent point in time, so dirty reads,
non-repeatable reads and phantoms are all prevented, without a single shared lock being taken.

The new failure mode is at the other end. If a `SNAPSHOT` transaction modifies a row that another
transaction has committed a change to since the snapshot was taken, the write fails with an
**update conflict** — error 3960 — and the application has to retry. That is the price of not
blocking: the conflict is detected at commit rather than prevented at read.

**`SNAPSHOT` is not `SERIALIZABLE` with versioning**, and equating them is the most common
overstatement about it. Snapshot isolation prevents the three classical anomalies and is still
not serialisable: **write skew** survives it. Two transactions can each read a set, each check a
rule over it, and each write a *different* row in a way that breaks the rule jointly — neither
touches a row the other wrote, so no conflict is detected and both commit. Two doctors each
checking that someone else is on call and each taking themselves off is the standard example. If
the requirement is genuinely "as if serial", `SERIALIZABLE` is the level that says so.

```quiz 01M1GETH970ATCTFTKQ9S11BPY cloze
Row versioning keeps prior versions of modified rows in the {{version store}}, which lives in
{{tempdb}}. Under {{RCSI}} the snapshot is taken per statement and the guarantees are exactly
those of `READ COMMITTED`; under {{SNAPSHOT}} it is taken once at the start of the transaction,
which additionally prevents non-repeatable and {{phantom}} reads. Versioning removes blocking
between readers and {{writers}}, but two writers on the same row still conflict — under
`SNAPSHOT` that surfaces as an {{update conflict}} the application must retry.
```

## What versioning costs

The version store is real storage with real limits, and the failure is a `tempdb` one.

Versions must be kept for as long as any transaction might still need to read them, so **the
oldest open transaction determines how much is retained**. One long-running `SNAPSHOT`
transaction — a report, a debugging session left open, a batch job — pins every version created
since it started, and the store grows for the duration. `tempdb` filling up takes the whole
instance's temporary workspace with it, not just the versioning.

So the operational rule that follows is: with versioning on, long transactions are expensive in
a way they were not before, and `sys.dm_tran_version_store` and the related views are where the
size and the culprit transaction are found. The queries collect in
[[sql-server-performance-dmvs]].

```quiz 01M1GETH97VHE3NM6BF7CP8YAD recall
An interviewer says: "Our read-heavy OLTP system gets intermittent lock timeouts on `SELECT`s
while a nightly job is writing. What would you change, and what would you *not* change?"

> The symptom is reader/writer blocking under the default `READ COMMITTED`: the reads take
> shared locks, the job holds exclusive locks on the rows it is writing, and the readers wait.
>
> What I would not do is add `WITH (NOLOCK)` or move the readers to `READ UNCOMMITTED`. That
> stops the waiting by allowing dirty reads — values that may be rolled back — and, because the
> scan respects no locks at all, rows read twice or skipped entirely while the writer moves them.
> It trades a visible symptom for silently wrong answers.
>
> The first thing I would try is RCSI, enabled on the database. Readers then read the version
> committed as of each statement rather than waiting for the writer's locks, and the guarantees
> are the same as the `READ COMMITTED` the application already assumes — no dirty reads, and no
> application changes. That is why it is the low-risk move.
>
> I would not jump to `SNAPSHOT`, because the stronger guarantee brings update conflicts the
> application would have to retry, and nothing in the symptom asks for phantom prevention.
>
> Then I would check the other half: whether the nightly job needs to hold one transaction over
> a million rows at all. Chunking it into batches that each commit shortens every lock it takes,
> which helps whatever isolation level is in force — and with versioning on, a long-running
> transaction is also what makes the version store grow, so the two fixes reinforce each other.
> After the change I would watch `tempdb` and the version store size.
```

## What this buys you in the room

"How do you choose an isolation level?" is the standard follow-up to an ACID question, and a good
answer names the anomaly rather than the level: say which of the three you cannot tolerate, then
name the cheapest level that excludes it, then say what that costs. Start at the default, move to
RCSI when the problem is blocking, move to `SNAPSHOT` or `SERIALIZABLE` only when the problem is
a specific anomaly, and say out loud which one.

The anomaly-by-level table, the syntax for setting a level, and the per-situation guide are
collected in [[sql-server-isolation-levels]] for looking up. The one thing to go and read in full
is Microsoft's
[SQL Server transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide),
which is the primary source for what each level locks and how the version store behaves.
