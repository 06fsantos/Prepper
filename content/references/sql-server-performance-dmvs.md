---
id: 01M1GGZXBKCR08ZHP3C5F84RFT
title: SQL Server performance DMVs
topic:
  - query-performance
---

The system views to open when something is slow, blocked, or suspiciously large, and the query
to run against each. This is the lookup the diagnostic notes point at: they say *which* number
settles the question, and the incantation for getting it is here.

> *Verified against Microsoft's SQL Server documentation on **2026-09-02**, current release
> **SQL Server 2025 (17.x)**.* Everything below is present from SQL Server 2016 (13.x) onwards
> unless a row says otherwise. These are system surfaces and they gain columns between
> versions; check a column name against the docs for the instance in front of you before
> quoting it.

## The map

| Question | Open |
|---|---|
| Is this index earning its keep? | `sys.dm_db_index_usage_stats` joined to `sys.indexes` |
| How big and how fragmented is it? | `sys.dm_db_index_physical_stats` |
| Which statistics exist, and how stale? | `sys.stats` with `sys.dm_db_stats_properties` |
| What does one statistic actually claim? | `DBCC SHOW_STATISTICS` — see [[statistics-and-cardinality-estimation]] |
| Is auto-update even on? | `sys.databases.is_auto_update_stats_on` |
| What did *this* run of *this* query cost? | `SET STATISTICS IO ON` / `SET STATISTICS TIME ON` |
| Which queries cost the server the most in total? | `sys.dm_exec_query_stats` with `sys.dm_exec_sql_text` |
| Has this query got slower than it was last week? | Query Store — `sys.query_store_*` |
| Why is `tempdb` growing? | `sys.dm_tran_version_store` |
| Who is blocking whom, right now? | `sys.dm_os_waiting_tasks`, `sys.dm_tran_locks` |
| What deadlocked, and in what order? | The `system_health` session's `xml_deadlock_report` |

## Index usage — is this index earning its keep?

`sys.dm_db_index_usage_stats` counts reads and writes per index. An index with no seeks, scans
or lookups and a large update count is pure cost on the write path.

```sql
SELECT OBJECT_NAME(i.object_id) AS TableName,
       i.name AS IndexName,
       s.user_seeks, s.user_scans, s.user_lookups, s.user_updates
FROM sys.indexes AS i
LEFT JOIN sys.dm_db_index_usage_stats AS s
       ON i.object_id = s.object_id
      AND i.index_id  = s.index_id
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
  AND (s.user_seeks + s.user_scans + s.user_lookups = 0 OR s.user_seeks IS NULL)
ORDER BY s.user_updates DESC;
```

The `LEFT JOIN` is what makes this a *find the dead ones* query rather than a usage report: an
index that has never been touched since the counters were last reset has no row in the DMV at
all, which is why `s.user_seeks IS NULL` is one of the two conditions.

**The counters reset when the instance restarts.** That is the caution that matters most here.
A sample taken three days after a patch window says nothing about the index the monthly billing
job uses. Sample over weeks, and check `sys.dm_os_sys_info.sqlserver_start_time` before believing
a zero. The other caution is that redundancy is judged against the rest of the index set, not per
index: one on `(A)` is subsumed by one on `(A, B)`, because a leading column is seekable alone.

## Index size and fragmentation

```sql
SELECT OBJECT_NAME(ips.object_id) AS TableName,
       ips.index_type_desc,
       ips.avg_fragmentation_in_percent,
       ips.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') AS ips
WHERE ips.page_count > 1000
ORDER BY ips.avg_fragmentation_in_percent DESC;
```

The last argument is the scan mode — `LIMITED` (default, cheapest, leaf level not read),
`SAMPLED`, or `DETAILED`, which reads every page and is expensive on a large table. Filtering out
small indexes is not cosmetic: fragmentation percentages on an index of a few pages are noise,
and a small index lives in the buffer pool anyway.

`page_count` is also the size answer, at 8KB a page. Total nonclustered index size growing large
relative to the table is a buffer-pool question rather than a disk one — index pages and data
pages compete for the same memory, so an index set that does not fit evicts the data that would
otherwise have been cached.

Microsoft's index maintenance guidance has long drawn the line at reorganising a moderately
fragmented index and rebuilding a heavily fragmented one; the mechanism is in
[[clustered-and-nonclustered-indexes]].

```sql
ALTER INDEX IX_Orders_Status ON Orders REORGANIZE;
ALTER INDEX ALL ON Orders REBUILD WITH (ONLINE = ON);
```

`DBCC DBREINDEX` does the rebuild half of this and Microsoft has documented it as deprecated in
favour of `ALTER INDEX ... REBUILD` for many major versions (verified 2026-09-02). It still runs;
it is not what to write, and it is not what to say in an interview. `REORGANIZE` is always online
and always single-threaded; `REBUILD` needs `ONLINE = ON` to avoid taking the table out, and that
option is Enterprise-only below SQL Server 2016 SP1.

## Statistics — which exist, and how stale

`sys.stats` lists them; `sys.dm_db_stats_properties` says when each was last built and how much
the data has moved since.

```sql
SELECT OBJECT_NAME(s.object_id) AS TableName,
       s.name AS StatName,
       s.auto_created, s.user_created, s.has_filter,
       sp.last_updated, sp.rows, sp.rows_sampled, sp.steps,
       sp.modification_counter
FROM sys.stats AS s
OUTER APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) AS sp
WHERE s.object_id = OBJECT_ID('Orders')
ORDER BY sp.modification_counter DESC;
```

`modification_counter` is the one to sort by: it is the number of changes to the **leading**
statistics column since the last update, so it is the closest thing to a staleness score that
does not require knowing the table. `rows_sampled` far below `rows` means the histogram is an
extrapolation. `last_updated` comes back `NULL` when no statistics blob was ever built — a new or
empty table, or a filtered statistic whose predicate matches nothing — which is not the same fact
as "never updated".

`OUTER APPLY` rather than `CROSS APPLY` is deliberate: the function returns an empty rowset for
anything it cannot read, and an inner apply would silently drop those rows.

What one statistic actually claims about the distribution is `DBCC SHOW_STATISTICS` and its three
result sets, which are read in [[statistics-and-cardinality-estimation]] rather than here — that
reading *is* the diagnosis, not a lookup.

Whether auto-update is on at all:

```sql
SELECT name, is_auto_create_stats_on, is_auto_update_stats_on, is_auto_update_stats_async_on
FROM sys.databases
WHERE name = DB_NAME();
```

A `0` in `is_auto_update_stats_on` means statistics maintenance is somebody's scheduled job, and
the first question is whether that job still runs.

## Measuring one query

```sql
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
```

`STATISTICS IO` reports logical reads per table — pages the query touched — and `STATISTICS TIME`
reports CPU and elapsed milliseconds. **Lead with logical reads.** Elapsed time on a shared
instance measures the rest of the workload as much as the query; the page count is a property of
the plan and barely moves run to run. Both are session-scoped and both write to the messages pane
rather than a result set, so they are for a console, not for a monitoring job. The discipline
around them is [[fixing-a-slow-query]].

## Ranking queries by impact

The plan cache's per-query aggregates, which is how you answer *which of these thousand slow
queries do I fix first*:

```sql
SELECT TOP 20
       SUM(qs.total_elapsed_time) / 1e6                                  AS TotalDurationSec,
       SUM(qs.execution_count)                                           AS Executions,
       SUM(qs.total_elapsed_time) / SUM(qs.execution_count) / 1e3        AS AvgDurationMS,
       SUM(qs.total_logical_reads)                                       AS LogicalReads,
       SUBSTRING(st.text, 1, 200)                                        AS QueryText
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
GROUP BY qs.sql_handle, st.text
ORDER BY TotalDurationSec DESC;
```

Ordering by total rather than by average is the whole point: *duration × frequency* is the cost
to the server, and a hundred-millisecond query run ten thousand times a day outranks a
thirty-second nightly one.

**This reads the plan cache, so it is a partial history and a moving one.** A plan evicted under
memory pressure, recompiled, or lost to a restart takes its counters with it, and a query that
runs with `OPTION (RECOMPILE)` never accumulates any. That gap is exactly what Query Store exists
to close. `sys.dm_exec_query_plan(qs.plan_handle)` cross-applies onto the same rows if you want
the cached plan alongside the numbers — see [[execution-plan-operators]] for reading it.

## Query Store

Query Store persists query text, plans and runtime statistics **in the database**, so it survives
restarts and evictions. It arrived in **SQL Server 2016 (13.x)** and is on by default for new
databases from **SQL Server 2022 (16.x)** onwards (verified 2026-09-02); on anything older, or on
a database upgraded in place, assume it is off until you have checked
[`sys.database_query_store_options`](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store).

```sql
ALTER DATABASE <database_name> SET QUERY_STORE = ON (OPERATION_MODE = READ_WRITE);
```

```sql
SELECT q.query_id,
       qt.query_sql_text,
       rs.avg_duration / 1e3      AS AvgDurationMS,
       rs.avg_logical_io_reads,
       rs.count_executions,
       p.plan_id
FROM sys.query_store_query AS q
JOIN sys.query_store_query_text AS qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan AS p        ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats AS rs ON p.plan_id = rs.plan_id
WHERE qt.query_sql_text LIKE '%Orders%'
ORDER BY rs.avg_duration DESC;
```

The shape worth remembering is the join chain — text → query → plan → runtime stats — because it
is what makes *the same query, two plans, different costs* a single result set. That is the
regression signal: one `query_id` with two `plan_id`s and a step change between them.

When a regression has to be stopped before it can be fixed properly:

```sql
EXEC sp_query_store_force_plan @query_id = 123, @plan_id = 456;
EXEC sp_query_store_unforce_plan @query_id = 123, @plan_id = 456;
```

Forcing is safer than a query hint because it changes no code and is reversible in one statement.
It is still a freeze: a forced plan does not adapt when the data distribution moves, which is the
same objection that applies to hints, just with a shorter fuse to undo. Fix the estimate or the
access path, then unforce.

## Version store and `tempdb`

Row versioning under RCSI or `SNAPSHOT` keeps old row versions in `tempdb` for as long as any
transaction might still read them — see [[isolation-levels-and-row-versioning]].

```sql
SELECT SUM(record_length_first_part_in_bytes + record_length_second_part_in_bytes) / 1024.0 / 1024 AS VersionStoreMB
FROM sys.dm_tran_version_store;

SELECT TOP 10 s.session_id, s.login_name, s.host_name,
       t.transaction_begin_time, DATEDIFF(MINUTE, t.transaction_begin_time, SYSDATETIME()) AS AgeMinutes
FROM sys.dm_tran_active_transactions AS t
JOIN sys.dm_tran_session_transactions AS st ON t.transaction_id = st.transaction_id
JOIN sys.dm_exec_sessions AS s ON st.session_id = s.session_id
ORDER BY t.transaction_begin_time;
```

The size query is the symptom and the second one is the cause: the **oldest open transaction**
sets how much the store has to keep, so a growing version store is nearly always one long-running
reader, not a busy workload. Note that `sys.dm_tran_version_store` scans the whole store, so it is
itself expensive on an instance where the store has already got large —
`sys.dm_tran_version_store_space_usage` gives the per-database totals more cheaply.

## Blocking, right now

```sql
SELECT owt.session_id,
       owt.blocking_session_id,
       owt.wait_duration_ms,
       owt.wait_type,
       owt.resource_description,
       est.text AS BlockedSql
FROM sys.dm_os_waiting_tasks AS owt
JOIN sys.dm_exec_sessions AS es ON owt.session_id = es.session_id
LEFT JOIN sys.dm_exec_requests AS er ON es.session_id = er.session_id
OUTER APPLY sys.dm_exec_sql_text(er.sql_handle) AS est
WHERE owt.blocking_session_id IS NOT NULL
  AND es.is_user_process = 1
ORDER BY owt.wait_duration_ms DESC;
```

`blocking_session_id` is the whole answer to *who is blocking whom*, and `wait_type` says what
kind of wait it is — an `LCK_M_*` wait is a lock and everything else is not, which is the first
fork in any concurrency incident. A `NULL` here means the request is not blocked; a negative value
is a special case (an orphaned distributed transaction, a deferred recovery transaction, an
undeterminable latch owner) rather than a session number.

For what the blocker is actually holding rather than merely that it holds something,
`sys.dm_tran_locks` has one row per lock: `request_session_id`, `resource_type`, `request_mode`
(`S`, `U`, `X`, `IS`, `IX`, `SIX`, the range modes) and `request_status` (`GRANT`, `WAIT`,
`CONVERT`). Its `resource_lock_partition` column is documented in Microsoft's
[transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide),
which is the primary source for the modes and their compatibility.

## Deadlocks, after the fact

A deadlock is over by the time you hear about it, so there is nothing live to query — you read
what was captured. The `system_health` Extended Events session **captures the
`xml_deadlock_report` event by default and is enabled by default**, so on any instance you have
not deliberately disabled it on, the last several deadlock graphs are already recorded and no
setup was needed (Microsoft's
[deadlocks guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-deadlocks-guide),
verified 2026-09-02). That fact is the good answer to "how would you catch it?".

```sql
SELECT xdr.value('@timestamp', 'datetime') AS deadlock_time,
       xdr.query('.') AS event_data
FROM (SELECT CAST(target_data AS XML) AS target_data
      FROM sys.dm_xe_session_targets AS xt
      JOIN sys.dm_xe_sessions AS xs ON xs.address = xt.event_session_address
      WHERE xs.name = N'system_health'
        AND xt.target_name = N'ring_buffer') AS XML_Data
CROSS APPLY target_data.nodes('RingBufferTarget/event[@name="xml_deadlock_report"]') AS XEventData(xdr)
ORDER BY deadlock_time DESC;
```

The graph has three nodes and each answers one question: `victim-list` (which transaction was
rolled back), `process-list` (what each participant was running, with its `executionStack` and
`isolationlevel`), and `resource-list` (the objects and lock modes involved). The lock ordering
that caused it is read out of the resource list — that argument is
[[deadlocks-blocking-and-lock-ordering]].

Trace flags **1204** and **1222** write the same information to the error log instead, 1204
organised by node and 1222 by process then resource. They predate Extended Events and Microsoft's
current guidance is to avoid them on a busy instance because of their performance cost, and to use
the event. Know them because older systems and older interviewers still have them on; do not
propose them as the first move.

## Three things that cost people points

- **Quoting a DMV number without saying when the counters started.** Every `sys.dm_*` view in this
  note except the Query Store ones is memory-resident and reset by a restart — index usage,
  `dm_exec_query_stats`, wait counters, all of it. "This index is unused" and "this instance was
  patched on Sunday" are the same sentence half the time.
- **Reading `sys.dm_exec_query_stats` as a complete workload history.** It is the plan cache. The
  worst query on the server may have been evicted an hour ago, and a `RECOMPILE` query is invisible
  to it entirely. Query Store is the persistent answer and the reason it was built.
- **Forgetting the permission.** These need `VIEW SERVER STATE` (`VIEW SERVER PERFORMANCE STATE`
  from SQL Server 2022 (16.x) onwards, verified 2026-09-02), and on Azure SQL Database
  `VIEW DATABASE STATE` or the `##MS_ServerStateReader##` role. A DMV query that returns nothing
  on a locked-down instance is not evidence that nothing is wrong.

The index for the rest of SQL Server's diagnostic surface — the DMV families, Query Store and the
tuning advisor — is Microsoft's
[Monitor and Tune for Performance](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitor-and-tune-for-performance),
which is where to start when the question is *which tool*, rather than *which column*.
