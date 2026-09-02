---
id: 01M1GGSE31EV6Q8C3VT4WE5FMA
title: SQL Server isolation levels
topic:
  - database-transactions
---

The six isolation levels SQL Server offers, what each one admits, how to ask for it, and which
one to reach for from a given symptom. What each level *does* and why is
[[isolation-levels-and-row-versioning]]; this is the grid and the syntax to look up.

> *Verified against Microsoft's
> [SQL Server transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
> and
> [SET TRANSACTION ISOLATION LEVEL (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-transaction-isolation-level-transact-sql)
> on **2026-09-02**, for **SQL Server 2022** and the versions those pages cover.* `READ
> COMMITTED` is the default level for SQL Server; note that it is **not** the default on Azure
> SQL Database, where `READ_COMMITTED_SNAPSHOT` is on for new databases.

## Anomaly by level

Four of the six are the ANSI levels; two are SQL Server's row-versioning pair. "Admitted" means
the level permits the anomaly, not that it will happen.

| Level | Dirty read | Non-repeatable read | Phantom read | Update conflict at commit | How reads are made safe |
|---|---|---|---|---|---|
| `READ UNCOMMITTED` | admitted | admitted | admitted | no | nothing — no shared locks taken or respected |
| `READ COMMITTED` (default) | prevented | admitted | admitted | no | shared locks, released when the statement has read the row |
| `READ COMMITTED` under RCSI | prevented | admitted | admitted | no | row versions, snapshot per **statement** |
| `REPEATABLE READ` | prevented | prevented | admitted | no | shared locks, held to end of transaction |
| `SNAPSHOT` | prevented | prevented | prevented | **yes — error 3960** | row versions, snapshot per **transaction** |
| `SERIALIZABLE` | prevented | prevented | prevented | no | key-range locks over the predicate |

Two things the grid cannot say on its own:

- **`SNAPSHOT` and `SERIALIZABLE` are not the same guarantee**, even though the three anomaly
  columns match. Snapshot isolation excludes those three and is still not serialisable: **write
  skew** survives it — two transactions each read a set, each check a rule over it, and each
  write a *different* row, so nothing conflicts and both commit with the rule jointly broken.
  The update-conflict column is why error 3960 exists at all: conflicts on the **same** row are
  detected at commit, and a disjoint pair of writes is not a conflict. If the requirement is
  literally "as if run one after another", `SERIALIZABLE` is the level that says so.
- **`READ UNCOMMITTED` admits more than the three named columns.** Because the scan respects no
  locks, a row can be read twice or missed entirely while a concurrent write moves rows within
  an index — a wrong count with nothing in the plan or the logs to mark it.

Under every level, **writers still block writers**. Row versioning removes the reader/writer
collision and nothing else.

## Which level, from the symptom

Read this as *what changes*, not as a ranking to climb.

| Situation | Level | What it costs you |
|---|---|---|
| Ordinary OLTP work, nothing wrong | `READ COMMITTED` | Non-repeatable reads and phantoms; readers and writers block each other |
| Reads intermittently time out behind writers | **RCSI** | `tempdb` version-store space. Same guarantees as `READ COMMITTED`, so no application change and no new failure mode — the low-risk first move |
| A value read twice in one transaction must not move | `REPEATABLE READ` | Locks held to commit: more blocking, and materially more deadlock risk ([[deadlocks-blocking-and-lock-ordering]]) |
| A transaction needs one consistent point in time across many statements, and contention on the same rows is low | `SNAPSHOT` | `tempdb` version store, plus **retry logic** for error 3960. Do not adopt it without that retry path |
| The set a predicate matches must not change, and correctness is worth the blocking | `SERIALIZABLE` | Key-range locks: maximum blocking, maximum deadlock risk. Needs an index for the range to be taken on, or it locks far more than the predicate describes |
| A read-only report on live data, staleness acceptable | see below | — |

That last row is deliberately not an answer. `READ UNCOMMITTED` removes the locking overhead and
in exchange returns values that were never committed, plus rows counted twice or skipped; whether
a report may be wrong in those ways is a judgement about the report, not a property of the level.
If the reason for reaching for it is that the report is *blocked by writers*, RCSI removes the
blocking without giving anything up, and that is what the guide above supports.

## Setting a level

The level is **per session** and persists until changed or the connection closes; two sessions
against one database can run at different levels. Row versioning is the exception: RCSI and
`SNAPSHOT` are **per database**, enabled once by an administrator.

```sql
-- Per session. Applies to every subsequent transaction on this connection.
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- ... also: READ UNCOMMITTED | REPEATABLE READ | SNAPSHOT | SERIALIZABLE

BEGIN TRANSACTION;
    SELECT * FROM Orders WHERE CustomerID = 5;
COMMIT;
```

```sql
-- Per database, once. RCSI redefines what READ COMMITTED means for every
-- transaction in the database; ALLOW_SNAPSHOT_ISOLATION only permits sessions
-- to opt in with SET TRANSACTION ISOLATION LEVEL SNAPSHOT.
ALTER DATABASE YourDB SET READ_COMMITTED_SNAPSHOT ON;
ALTER DATABASE YourDB SET ALLOW_SNAPSHOT_ISOLATION ON;
```

`READ_COMMITTED_SNAPSHOT` needs exclusive access to the database to flip, so schedule it; use
`WITH ROLLBACK IMMEDIATE` only when kicking every other session off is acceptable.

```sql
-- Per table, per statement: a hint, not a level.
SELECT * FROM Orders WITH (NOLOCK);    -- READ UNCOMMITTED, on this table only
SELECT * FROM Users  WITH (UPDLOCK);   -- take an update lock now, not at write time
```

To read the current level:

```sql
SELECT transaction_isolation_level FROM sys.dm_exec_sessions WHERE session_id = @@SPID;
-- 0 unspecified, 1 read uncommitted, 2 read committed, 3 repeatable read,
-- 4 serializable, 5 snapshot
```

Whether the database has versioning on:

```sql
SELECT name, is_read_committed_snapshot_on, snapshot_isolation_state_desc
FROM sys.databases WHERE name = 'YourDB';
```

Note that `is_read_committed_snapshot_on` being 1 makes `transaction_isolation_level = 2` mean
RCSI rather than locking `READ COMMITTED` — the session-level view cannot distinguish them, so
the two queries are read together.

## Three that cost people points

- **Calling `SNAPSHOT` "`SERIALIZABLE` with row versioning."** It is the tidiest-sounding wrong
  answer in the topic, and the follow-up — *so what does it not prevent?* — has a name: write
  skew. See the grid above.
- **Adopting `SNAPSHOT` without a retry path.** Error 3960 is a normal outcome of the level, not
  an incident, and a transaction that fails on it has to be resubmitted from the top. RCSI raises
  no such error, which is the whole reason it is the cheaper move against blocking.
- **Forgetting that versioning has a storage bill with a *duration* driver.** Versions are kept
  while any transaction might still need them, so the **oldest open transaction** sets how much
  `tempdb` holds. One long-running `SNAPSHOT` report can grow the store for its whole life; the
  views that find it are in [[sql-server-performance-dmvs]].
