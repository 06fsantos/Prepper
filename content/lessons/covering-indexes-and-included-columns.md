---
id: 01M1GEM0TKAY3CKPMGA7YREWWR
title: Covering indexes and included columns
topic:
  - sql-server-indexing
prerequisites:
  - clustered-and-nonclustered-indexes
---

A nonclustered index finds a row quickly and then, very often, does not have the row. It has the
key it was built on and a pointer, so the engine follows the pointer back into the table to
collect the columns the query actually asked for. That second movement is a **lookup**, and it is
charged once per matching row: negligible for one row, and the dominant cost of the query for a
thousand.

A **covering index** is an index that holds every column the query touches, so the lookup never
happens. It is the highest-leverage index design move there is, and it is also the one most
easily overdone — every column added to an index is a column that must be maintained on every
write to it.

## The lookup is a per-row cost, and that is what makes it dangerous

Take a `Users` table with a clustered index on `UserID` and a nonclustered index on `Email`:

```sql
CREATE NONCLUSTERED INDEX idx_Users_Email ON Users(Email);

SELECT UserID, Email, FirstName, LastName FROM Users WHERE Email LIKE 'a%';
```

The plan has two parts. The engine seeks `idx_Users_Email` to find the matching entries — fast,
a descent through a shallow tree. Then, for **each** entry it found, it follows the pointer into
the clustered index to fetch `FirstName` and `LastName`, which the `Email` index does not carry.

That second step is a random access into the table, repeated once per row. A predicate matching
one row costs one of them. A predicate matching a large fraction of the table costs one per
matching row, each landing in an unpredictable place, and at some point the optimiser decides
that reading the whole table sequentially would be cheaper and gives you a scan instead — which
is not the optimiser being wrong. **A lookup-heavy plan and a scan are the two ways the same
query goes slow**, and the lookup count is the number to look at first when
[[reading-an-execution-plan]].

## `INCLUDE` puts the missing columns in the index

The fix is to carry the extra columns in the index itself:

```sql
CREATE NONCLUSTERED INDEX idx_Users_Email_Covering
ON Users(Email)
INCLUDE (FirstName, LastName);
```

Now the same query is answered from `idx_Users_Email_Covering` alone: the engine seeks on
`Email`, and `FirstName` and `LastName` are sitting in the entry it lands on. The plan shows a
seek and no lookup at all. (`UserID` needs no mention — it is the clustered key, so every
nonclustered entry already carries it as its pointer.)

"Covering" is a relationship between an index and a **query**, not a property of an index on its
own. The same index covers one query and not the next one that adds a column to its `SELECT`
list. That is why the design procedure starts at the query text and why an index built for "any
query someone might write" is an index built for none of them.

## Key columns and included columns are structurally different

Everything before the `INCLUDE` is a **key column**; everything inside it is an **included
column**, and the two are not interchangeable.

Key columns are what the index is **sorted by**. They are what makes a seek possible, what a
range scan walks along, and what can remove a sort operator from a plan. Included columns are
stored only at the leaf level, in no order at all. The engine can *read* them once it has found
an entry; it cannot *search* them, and it cannot use them to satisfy an `ORDER BY`.

```sql
-- SELECT Email, FirstName FROM Users WHERE LastName = 'Smith' ORDER BY Email

CREATE NONCLUSTERED INDEX idx_Users_LastName_Email
ON Users(LastName, Email)   -- keys: sought on, and already in ORDER BY order
INCLUDE (FirstName);        -- included: carried, never searched
```

So the split falls out of the query almost mechanically: columns in `WHERE`, `JOIN`, `ORDER BY`
and `GROUP BY` are candidates for the key, in the order the [[clustered-and-nonclustered-indexes]]
rule gives them — equality predicates first, range last — and columns that appear only in the
`SELECT` list go in `INCLUDE`.

There is a size argument for the split as well. Key columns are stored at every level of the
B+ tree, because the internal levels are what routing reads; included columns exist only in the
leaves. Moving a wide column out of the key and into `INCLUDE` therefore keeps the upper levels
narrow, which keeps the tree shallow. Included columns also sidestep the key-width limit and may
be of types that cannot be indexed at all.

```quiz 01M1GEM0TP6NW963KJCMR4DH9K
`SELECT OrderID, TotalAmount FROM Orders WHERE CustomerID = 42 ORDER BY OrderDate` runs
constantly. Which index serves it best?

- [x] `ON Orders(CustomerID, OrderDate) INCLUDE (TotalAmount)`
  > `CustomerID` is sought on, `OrderDate` supplies the ordering so no sort operator is needed,
  > `TotalAmount` is carried, and `OrderID` is already there as the clustered key.
- [ ] `ON Orders(CustomerID) INCLUDE (OrderDate, TotalAmount)`
  > Included columns are unordered, so the engine has to sort the matched rows by `OrderDate`
  > itself — a sort operator this index could have removed.
- [ ] `ON Orders(CustomerID, OrderDate, TotalAmount, OrderID)`
  > It covers the query, but it widens every level of the tree with two columns nothing seeks or
  > sorts on, where `INCLUDE` would hold them in the leaves only.
- [ ] `ON Orders(OrderDate, CustomerID) INCLUDE (TotalAmount)`
  > `CustomerID` is only sorted within each date, so customer 42's rows are scattered and there
  > is no single run of them to seek to.
```

## A filtered index covers a subset of the rows

If the queries that matter only ever look at part of the table, the index only has to hold that
part:

```sql
CREATE NONCLUSTERED INDEX idx_Employees_Active_Phone
ON Employees(Phone)
INCLUDE (Email, Department)
WHERE IsActive = 1;
```

The index is smaller, so more of it fits in memory; writes to rows outside the filter do not
touch it at all; and the statistics behind it describe only the rows it holds, which tends to
make the estimates over it better. The condition on which all of that rests is that the
optimiser can *prove* the query only wants rows the filter admits — a query for `IsActive = 0`,
or one whose predicate is a parameter the plan must work for every value of, cannot use this
index.

The shape to look for is a natural, stable split where nearly all the queries live on one side:
active versus soft-deleted, current versus archived, or a column that is `NULL` in most rows and
only interesting where it is not.

```quiz 01M1GEM0TP2HHQ95KJYF8JD4RP cloze
In `ON Orders(CustomerID, Status) INCLUDE (OrderDate, TotalAmount)`, the columns before the
`INCLUDE` are the {{key}} columns — the ones the index is sorted by, so they are what a
{{seek}} navigates on and what can satisfy an `ORDER BY`. The columns inside it are stored
only in the {{leaf}} level, in no order, and exist to remove the {{lookup}} back to the table.
An index that holds every column a query needs is said to {{cover}} that query.
```

## What it costs, and the arithmetic to do out loud

Everything above buys reads with writes, and the write cost of a covering index has three
separate faces.

**Write amplification.** Every `INSERT` writes the table plus every index on it, so a table with
five nonclustered indexes turns one row insert into six structures maintained, each with its own
tree work and its own transaction-log volume. An `UPDATE` is worse than it looks: changing a
column that appears in an index — as a key *or* as an included column — is a delete and reinsert
in that index. Adding a column to `INCLUDE` therefore adds that column's updates to that index's
write path, which is the cost people forget when they include "just in case".

**Memory.** Indexes and data compete for the same buffer pool. A set of wide covering indexes
large enough to matter evicts data pages to make room for itself, and a query that used to be
served from memory starts reading from disk. Index size relative to table size is the quantity
to keep an eye on.

**Fragmentation and storage**, which grow with the width of the index like everything else.

Against that sits the read benefit, and it is worth being able to sketch the trade with numbers
even though any specific figures are arithmetic rather than a measurement. A query that matches
a thousand rows and runs a thousand times a second is doing a million lookups a second without a
covering index and none with one; that index is almost certainly worth its write cost. A table
taking a hundred thousand inserts a second, queried once a night for a report, is the exact
inverse: the index would be maintained on every one of those inserts to save a single scan that
nobody is waiting on. Same structure, opposite answer, and the thing that decided it was the
**ratio of reads to writes**, not the size of the table.

```quiz 01M1GEM0TPAMB3Z46J97NAQ8TN recall
An interviewer says: "The query is still slow after we added the covering index. What do you
look at?" Say what you would check, and in what order.

> First, whether the index is actually being used — the plan will say. A covering index is
> covering only for a specific query, so the usual reason is that the query is not the one the
> index was designed for: a column was added to the `SELECT` list, so the lookup is back; or the
> predicate is not sargable, because the indexed column is wrapped in a function or buried in an
> expression, so it cannot be sought on at all; or the leading key column is not the one being
> filtered on with equality.
>
> If it is a filtered index, the extra question is whether the optimiser can prove the query
> stays inside the filter. A parameterised predicate often defeats that, because the plan has to
> be correct for every parameter value.
>
> If the index *is* being used and the query is still slow, the lookup was not what was costing
> the time. Then it is the estimates — the plan's estimated row count against the actual — or
> the query is returning far more rows than a seek can help with, or it is being blocked rather
> than being slow.
>
> And it is worth asking what the index cost. It is now maintained on every write to that table,
> so if it is not buying anything it should be dropped rather than left in place.
```

## Knowing when to drop one

Covering indexes accumulate. Each was added for a query, some of those queries no longer run, and
nothing removes the index when they stop. SQL Server tracks per-index usage — seeks, scans and
lookups against updates — and an index with no reads and a high update count is pure cost. The
views and the exact queries for this collect in [[sql-server-performance-dmvs]].

Two cautions before dropping anything. The usage counters reset when the instance restarts, so a
sample has to be long enough to include the monthly job as well as the hourly one. And redundancy
is judged against the other indexes, not in isolation: an index on `(A)` is subsumed by one on
`(A, B)`, because a leading column is seekable on its own.

The one thing to go and read in full is Microsoft's
[SQL Server index architecture and design guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide),
whose sections on included columns and filtered indexes are the reference a covering-index
decision can be defended from.
