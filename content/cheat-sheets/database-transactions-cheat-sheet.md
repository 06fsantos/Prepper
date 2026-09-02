---
id: 01M1GEZRYZD7K0Z9ZGS10Z7MMH
title: Transactions and isolation — cheat sheet
topic: database-transactions
---

**ACID, one line each:**

- **Atomicity** — all or nothing. The engine logs what it is about to change, so any transaction
  can be undone. Same structure gives durability.
- **Consistency** — every *declared* constraint holds at both ends. It is narrower than the
  English word: business rules SQL Server cannot express are not covered. Put rules in the schema
  where they fit — a foreign key is enforced on every code path, including the forgotten one.
- **Isolation** — uncommitted work is invisible to others. **The only letter that is a dial.**
- **Durability** — write-ahead logging: the log record reaches disk *before* the commit is
  acknowledged. Data pages are written lazily; the log is what recovery replays.

**Autocommit is the default** — each statement its own transaction. `SET IMPLICIT_TRANSACTIONS
ON` (or an ORM/driver setting it) makes every statement open a transaction that holds its locks
until an explicit `COMMIT`.

**The three anomalies, named precisely:**

- **Dirty read** — reading uncommitted data. If it rolls back, you acted on a value never true.
- **Non-repeatable read** — the same **row** read twice, two values.
- **Phantom read** — the same **query** run twice, a different set of rows.

The last two differ as a *row changing* differs from *set membership changing*.

**The levels, as a ladder — each rung removes one anomaly by holding something longer:**

- `READ UNCOMMITTED` — takes and respects **no** shared locks. Admits all three.
- `READ COMMITTED` (**default**) — S lock released after the **statement**. That release is
  exactly what admits non-repeatable reads.
- `REPEATABLE READ` — S locks held to the end of the **transaction**. Rows you read cannot
  change; rows can still *appear*, so phantoms survive.
- `SERIALIZABLE` — **key-range** locks, so an insert into the range you queried waits. Needs an
  index for the range to be taken on.
- **RCSI** — `READ COMMITTED`'s guarantees, version per **statement**, no blocking.
- **`SNAPSHOT`** — version per **transaction**, so all three anomalies are prevented.

X locks are held to the end of the transaction at *every* level. **The length of a transaction is
the length of its locks.**

**Row versioning** keeps prior row versions in the **version store** in `tempdb`. Removes
**reader/writer** blocking; does nothing for **writer/writer**. RCSI is per-database
(`ALTER DATABASE … SET READ_COMMITTED_SNAPSHOT ON`) and needs no code change — the low-risk first
move against blocking. `SNAPSHOT` is per-transaction and brings **update conflicts (error 3960)**
the app must retry. Cost: the **oldest open transaction pins the version store**, so one long
transaction can fill `tempdb`.

**`SNAPSHOT` is not `SERIALIZABLE` with versioning.** It prevents all three anomalies and is
still not serialisable — **write skew** survives: two transactions each read a set, each write a
*different* row, neither conflicts, the rule breaks jointly. (Two on-call doctors each signing
off.)

**`NOLOCK` / `READ UNCOMMITTED`** also lets a scan read a row **twice or miss it entirely** while
a writer moves rows. It is not "slightly stale" — it is occasionally wrong, silently.

**Blocking vs. deadlock — different fixes:**

- **Blocking**: waiting on a lock; resolves when the holder finishes. Fix = shorter transactions,
  fewer/narrower locks, RCSI.
- **Deadlock**: a cycle of waits; resolves never. Engine kills the cheapest **victim**, rolls it
  back, returns **error 1205**. Fix = **consistent lock ordering**.

**Lock modes:** **S** (read, many at once) · **X** (write, compatible with nothing, held to
commit) · **U** (read-about-to-write; blocks another U but not S — stops two readers both
converting to X). `WITH (UPDLOCK)` takes it up front.

**Lock escalation** — past roughly **5,000 locks on one table or index by one statement**, row
locks become one **table** lock and everything on the table waits. It is a cliff, not a slope.
Fix: batch the write into chunks that each commit.

**Deadlock prevention, in order:** consistent lock order → short transactions → index the
predicates (a scanning write locks everything it scanned) → `UPDLOCK` on a read-then-update →
**retry on 1205 with randomised backoff**, which the app should do regardless.

**Optimistic concurrency** for anything spanning think-time: `UPDATE … WHERE Id = @id AND Version
= @versionIRead`. Zero rows affected means someone got there first; re-read and retry. Nothing
locked while a human decides.

**The reach-for-it signal:** two sessions that could read the same state and both act on it. Name
the *anomaly* first, then the cheapest level that excludes it, then what it costs.

Anomaly-by-level lookup and the T-SQL syntax: [[sql-server-isolation-levels]].
Full treatment: [[transactions-and-acid]], then [[isolation-levels-and-row-versioning]], then
[[deadlocks-blocking-and-lock-ordering]].
