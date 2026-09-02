---
id: 01M1GEQNWHEYZQY1CSYPSGE3CG
title: Transactions and ACID
topic:
  - database-transactions
prerequisites:
  - the-relational-model-and-keys
---

Two customers book the last hotel room a millisecond apart. Both sessions check availability,
both see one room free, both insert a booking. Nothing in the schema is violated and the table
now holds two bookings for one room. Separately: a transfer debits one account, the server loses
power, and the credit never happens. A hundred pounds has left the system.

Neither failure is a design mistake in the tables. They are failures of *when* work is visible
and *whether* work survives, which is a different layer of the database's promise. A
**transaction** is that promise: a sequence of statements the engine treats as one indivisible
unit of work. **ACID** names the four things it guarantees, and the useful version of knowing
ACID is being able to say which letter each failure above breaks.

```sql
BEGIN TRANSACTION;
    UPDATE Accounts SET Balance = Balance - 100 WHERE AccountID = 1;
    UPDATE Accounts SET Balance = Balance + 100 WHERE AccountID = 2;
COMMIT;
```

Either both updates apply or neither does. SQL Server runs in **autocommit** by default — every
statement is its own transaction — so the two statements written without the `BEGIN` are two
transactions, and the interval between them is a state in which the money exists nowhere.

## Atomicity — all of it, or none of it

A transaction either fully succeeds or fully fails; there is no partial application and no state
in which half of it is visible. If a statement raises an error, or the connection drops, or the
process dies, the engine rolls back everything the transaction had done.

That word — **rollback** — is the whole mechanism. The engine records what it is about to change
before it changes it, so an uncommitted transaction can always be undone. The same record is what
makes crash recovery possible, which is why atomicity and durability come out of one structure
rather than two.

Handled explicitly in T-SQL, it looks like this:

```sql
BEGIN TRANSACTION;
BEGIN TRY
    UPDATE Accounts SET Balance = Balance - 100 WHERE AccountID = 1;
    UPDATE Accounts SET Balance = Balance + 100 WHERE AccountID = 2;
    COMMIT;
END TRY
BEGIN CATCH
    ROLLBACK;
    THROW;
END CATCH;
```

The `CATCH` block matters more than it looks. Not every error aborts a transaction on its own,
so a batch that hits a constraint violation and carries on to `COMMIT` can commit a partial
result — atomicity is a guarantee the engine gives, but which statements are inside the
transaction is a decision the code makes.

## Consistency — the constraints hold at both ends, and only those

Consistency says a committed transaction moves the database from one valid state to another,
where "valid" means every declared constraint is satisfied: primary keys, foreign keys, `UNIQUE`,
`CHECK`, `NOT NULL`. A transaction that would leave a foreign key pointing at nothing does not
commit.

The letter is narrower than the English word, and the gap is worth being precise about because
interviewers push on it. **The engine enforces the rules you declared to it, and nothing else.**
"An order's total equals the sum of its lines" is not a constraint SQL Server can express, so it
is not consistency in the ACID sense — it is application logic, and the way to make it hold is to
put the writes that must agree inside one transaction so atomicity carries them together.

This is also the argument for pushing rules **into** the schema wherever they will fit. A foreign
key is enforced on every write from every code path, including the ones nobody remembered. A rule
that only lives in one service's code is enforced only where that code runs — the point made at
length in [[the-relational-model-and-keys]].

```quiz 01M1GEQNWJWNA5Q76J01WYPX7B
A transaction inserts an order and then updates the customer's running total. The insert
succeeds; the update violates a `CHECK` constraint. What is the state of the database, and which
letter is doing the work?

- [x] Neither change is applied — atomicity rolls back the insert as well
  > The failed statement takes the whole unit with it. Consistency is what *detected* the
  > violation; atomicity is what ensures the insert does not survive it.
- [ ] The insert stands and the update is discarded, since only one statement failed
  > That is what happens *without* an explicit transaction, where each statement autocommits —
  > and it is exactly the partial state transactions exist to prevent.
- [ ] Neither change is applied — consistency rolls back the whole transaction
  > Consistency is the property that the constraint is checked at all. Undoing the work already
  > done is atomicity; the two letters are easy to merge and interviewers separate them.
- [ ] Both changes are applied and the constraint is re-checked at commit time
  > Constraints are checked as the statement runs, not deferred to commit. Nothing invalid is
  > held pending a later verdict.
```

## Isolation — concurrent transactions do not see each other's unfinished work

Isolation is the property that one transaction's in-progress changes are invisible to another.
Without it, a session can read a value that is later rolled back — a value that never existed in
any committed state of the database — and act on it.

```sql
-- Session A
BEGIN TRANSACTION;
UPDATE Inventory SET Quantity = Quantity - 5 WHERE ProductID = 1;
-- ... not yet committed ...

-- Session B, concurrently
SELECT Quantity FROM Inventory WHERE ProductID = 1;
```

Whether session B sees the reduced quantity is precisely the question isolation answers, and it
is the only one of the four letters that is a **dial rather than a guarantee**. The others are on
or off; isolation is bought in degrees, and every degree of it is paid for in concurrency,
because holding another transaction back is how the engine keeps its work hidden.

The default in SQL Server is `READ COMMITTED`, verified against
[Microsoft's transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
in September 2026: a session will not see uncommitted data, but a value it read once may have
changed by the time it reads it again inside the same transaction. That is a real anomaly the
default admits, deliberately. Which anomalies each level admits, and what SQL Server's
row-versioning levels change about the trade, is [[isolation-levels-and-row-versioning]].

The double-booking at the top of this Lesson is an isolation failure, not an atomicity one. Both
transactions were individually atomic and both committed cleanly. What went wrong is that each
read the availability the other was about to invalidate.

## Durability — once it commits, it survives

When `COMMIT` returns, the change survives anything that happens next, including the machine
losing power a microsecond later. The mechanism is **write-ahead logging**: the engine writes
the change to the transaction log on durable storage *before* reporting the commit as done, so
recovery after a crash can replay everything committed and roll back everything that was not.

The ordering is the whole content of the guarantee. Data pages are written to disk lazily,
whenever it suits the engine; the log record is written eagerly, before the acknowledgement. So
after a crash the data files may be missing recent committed work, and the log is what puts it
back.

```quiz 01M1GEQNWKPDMXGYJXPQ6KQ2WE cloze
ACID's four letters: {{atomicity}} makes a transaction all-or-nothing, {{consistency}} means
every declared constraint holds before and after it, {{isolation}} keeps its uncommitted work
invisible to other transactions, and {{durability}} means a committed change survives a crash.
Only {{isolation}} is a dial rather than a guarantee — it is traded against concurrency. The
mechanism behind durability is {{write-ahead logging}}: the log record reaches disk before the
commit is acknowledged.
```

## What the guarantees do not cover

Three practical gaps, each of which is a genuine production failure rather than a technicality.

**A transaction holds its locks until it ends.** A batch job that opens a transaction and works
through a million rows for five minutes blocks everything that wants those rows for five minutes.
The fix is to make the transaction small rather than to make the lock weaker — chunk the work
into batches that each commit — and the diagnosis of what is blocking what is
[[deadlocks-blocking-and-lock-ordering]].

**Autocommit is not always on.** `SET IMPLICIT_TRANSACTIONS ON` makes every statement open a
transaction that stays open until an explicit `COMMIT`, which turns an ordinary `SELECT` into a
lock held indefinitely by a connection nobody is watching. ORMs and connection pools can set this
without the application ever saying so, and the symptom is locks that outlive the code that
appears to have taken them.

**The application is still responsible for its own invariants.** The standard tool is an
optimistic-concurrency check: carry a `Version` column, and write with the version you read as
part of the predicate.

```sql
UPDATE Orders SET Status = 'Shipped', Version = Version + 1
WHERE OrderID = @Id AND Version = @VersionIRead;
```

If another session got there first, no row matches, the update affects zero rows, and the caller
retries against fresh data. Nothing was locked while the user was thinking, and the conflict is
detected rather than prevented.

```quiz 01M1GEQNWKX1BTQ92RAXA8S98S recall
An interviewer asks: "Two customers try to book the last room at the same time. Walk me
through what the database does and what you would do about it."

> Wrapping the check and the insert in a transaction is not by itself enough. Both transactions
> can read "one room free", both can insert, and both can commit — each is atomic, each leaves
> every constraint satisfied, and the result is still two bookings for one room. The property
> that failed is isolation: each transaction read state the other was about to invalidate. Under
> the default `READ COMMITTED` the read takes a shared lock and releases it immediately, so
> nothing stops the second booking.
>
> There are three honest answers and I would say which I was choosing and why.
>
> The first is to make the database enforce it: a unique constraint on the thing that must not
> be duplicated — room and date — so one of the two inserts fails outright. That is the most
> robust, because it holds no matter which code path is writing, and the application's job
> becomes catching the violation and telling that customer the room is gone.
>
> The second is to take the conflict seriously in the transaction: raise the isolation level, or
> lock the row being checked as part of checking it, so the second transaction waits rather than
> reading stale availability. That costs concurrency and can deadlock, and it needs the
> transaction to be short.
>
> The third is optimistic: read a version, write conditionally on that version still being
> current, and retry on zero rows affected. That suits a booking flow where a human is thinking
> between the read and the write, because holding a lock across that is not acceptable.
>
> In an interview I would lead with the unique constraint, because it is the one that cannot be
> bypassed, and then say which of the other two the workload calls for.
```

## What this buys you in the room

Asked about anything concurrent, the sequence is: name the letter that is failing, then say what
you would do about it. Money vanishing in a crash is durability or atomicity. Two writers
clobbering each other, or one reading what the other has not committed, is isolation. A rule
about the shape of the data is consistency if it is a declared constraint and application logic
if it is not.

The one thing to go and read in full is Microsoft's
[SQL Server transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide),
which is the primary source for what a transaction guarantees, what locks it takes, and what each
isolation level changes.
