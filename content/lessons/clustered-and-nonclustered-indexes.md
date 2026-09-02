---
id: 01M19Z3W2S8PQC5AHQQ1XAFTS0
title: Clustered and nonclustered indexes
topic:
  - sql-server-indexing
prerequisites:
  - the-relational-model-and-keys
---

A schema can be logically perfect and still take thirty seconds to answer a question. Nothing in
the logical design says how rows are laid out on disk or how many of them the engine has to touch
to find one, and those are the two facts that decide whether a query returns in milliseconds. An
index is the structure that decides them — and it is bought, not given: every index speeds up
some reads and slows down every write to the table it sits on.

The thing to be able to say out loud is not "add an index on the `WHERE` clause". It is *which*
index, *why that column order*, and *what it costs the write path*. That is the whole of this
Lesson.

## Without an index, finding one row means reading all of them

Take a `Users` table of ten million rows and the most ordinary query there is:

```sql
SELECT * FROM Users WHERE Email = 'alice@example.com';
```

With nothing on `Email`, the engine has exactly one strategy available: read every row and
compare. That is a **table scan**, and its cost is proportional to the size of the table — ten
million rows means ten million comparisons whether the answer is the first row or the last.

An index on `Email` replaces that with a descent through a tree. The engine does not look at rows
it has ruled out; it navigates to them. That is a **seek**, and the difference between the two
words is the single most useful distinction in the subject — it is the first thing to look for in
[[reading-an-execution-plan]].

The catch arrives on the other side of the workload. Every `INSERT` into `Users` must also insert
into the index on `Email`, in the right place, keeping it sorted. Every `UPDATE` that changes an
indexed column must move the entry. Five indexes on a table means an insert writes six
structures, not one. **Indexes buy read speed with write cost**, and there is no configuration
that avoids the trade — only a choice about where to sit on it.

## The clustered index is the table

SQL Server has two kinds of index and the difference between them is not a matter of degree.

A **clustered index** defines the physical order of the rows. Creating one sorts the table by
that key, and from then on the table *is* that structure — there is no separate unsorted copy
somewhere underneath it. That is why there is **exactly one clustered index per table**: a set
of rows can only be in one order at a time. A table with no clustered index is a **heap**, rows
in no particular order at all.

```sql
CREATE TABLE Users
(
    UserID    INT PRIMARY KEY CLUSTERED,
    Email     VARCHAR(255) NOT NULL,
    FirstName VARCHAR(100),
    LastName  VARCHAR(100)
);
```

Two consequences follow from "sorted, and it is the table". A lookup by `UserID` navigates
straight to the row and the row is right there, complete. And a **range** query — `WHERE UserID
BETWEEN 1000 AND 1100` — is nearly free after the first row is found, because the next hundred
rows are physically the next hundred rows.

A **nonclustered index** is a second structure beside the table, sorted by its own key, whose
entries carry a pointer back into the clustered index. There may be many of them — the practical
number on a busy table is a handful rather than a dozen, for the write reason above.

```sql
CREATE NONCLUSTERED INDEX idx_Users_Email ON Users(Email);
```

Now the email query is answered in two movements: seek the `Email` index to find the entry, then
follow its pointer into the clustered index to fetch the columns the index does not hold. That
second movement is a **lookup**, and it is the subject of
[[covering-indexes-and-included-columns]] — it is cheap once and expensive a thousand times.

This is also where the width of the clustered key stops being an abstract concern. The clustered
key is the pointer, so it is copied into **every entry of every nonclustered index on the table**.
A four-byte `INT` key and a sixteen-byte GUID key are not the same decision once there are five
nonclustered indexes carrying it. What a key promises in the first place is
[[the-relational-model-and-keys]].

## Both kinds are B+ trees, and that is where `log n` comes from

Both index types are implemented as **B+ trees**: a balanced tree whose keys are held in sorted
order, whose leaf level holds the data (for a clustered index, the rows themselves), and whose
internal levels hold only the keys needed to route a search downwards.

You do not need node-splitting internals for an interview. You need the shape of the argument.
The tree is *balanced*, so every root-to-leaf path is roughly the same length, and it is
*sorted*, so at each level the engine can discard most of the remaining keys. A search therefore
costs a number of steps proportional to the **depth** of the tree rather than to the number of
rows in it — `O(log n)` instead of `O(n)`. Because each node holds many keys, the tree stays
extremely shallow: millions of rows are a handful of levels, not a thousand.

That shallowness is the whole benefit, and the arithmetic is worth being able to do out loud on a
whiteboard: doubling the table adds at most one level to the tree, while doubling a scan doubles
the work.

```quiz 01M19Z3W2SQBQMW1T8GFE7WC0V cloze
A table has exactly {{one}} clustered index, because that index defines the order the rows are
physically stored in — the table *is* the index. It may carry many {{nonclustered}} indexes,
each a separate structure whose entries point back into the clustered one. Both kinds are
{{B+ tree}} structures, which is why a seek costs {{O(log n)}} while a table scan costs
{{O(n)}}.
```

## Index design starts at the query, not at the table

There is no such thing as a good index in the abstract. An index is good for a query, so the
design procedure is to take the queries that matter and read four things off each of them:

- **The `WHERE` clause.** These are the key-column candidates: the columns the engine will
  navigate by.
- **The `ORDER BY` and `GROUP BY`.** An index already sorted the way the query wants results is
  an index that removes a sort operator from the plan.
- **The `SELECT` list.** Columns here are not searched, but holding them in the index removes
  the lookup back to the table — see [[covering-indexes-and-included-columns]].
- **The selectivity.** An index earns its keep when the predicate eliminates most of the table.
  A predicate matching a small fraction of rows is a seek worth doing; one matching most of them
  is a scan the engine will choose anyway, and choosing it is not a bug. Why the optimiser
  believes a predicate is selective in the first place is
  [[statistics-and-cardinality-estimation]].

The corollary is the one candidates miss: **an index that duplicates one you already have is
pure write cost.** A nonclustered index on the clustered key column adds no navigation the
clustered index does not already provide, and it still has to be maintained on every write.

```quiz 01M19Z3W2S0KSZ2F23DZJ6DTDA
`Orders` has a clustered index on `OrderID`. A nightly job runs `SELECT OrderID, TotalAmount FROM
Orders WHERE OrderID BETWEEN 1000 AND 2000`. Would you add a nonclustered index on `OrderID`?

- [x] No — the clustered index already seeks and then scans that range in order
  > The rows are stored sorted by `OrderID`, so the engine finds 1000 and walks forwards,
  > collecting `TotalAmount` from the rows themselves. The second index would add write cost and
  > no navigation.
- [ ] Yes — a nonclustered index is smaller, so scanning it is cheaper
  > It would still be an index on the same column with no extra columns, so any row it found
  > would need a lookup back into the clustered index anyway.
- [ ] Yes — a range predicate needs a nonclustered index to be seekable
  > Range predicates seek perfectly well on a clustered key; that ordering is precisely what a
  > clustered index gives you over a heap.
- [ ] No — but only because the job runs nightly rather than continuously
  > Frequency changes whether an index is *worth* it, not whether it is redundant. This one adds
  > nothing at any frequency.
```

## Column order in a composite index is the design decision

An index on `(UserID, OrderDate)` and an index on `(OrderDate, UserID)` are different structures
that serve different queries, and treating them as interchangeable is one of the more expensive
mistakes available.

A composite index is sorted by its **leading column first**, then by the next within each value
of the first, exactly like a phone book sorted by surname then forename. So for:

```sql
SELECT OrderID FROM Orders WHERE UserID = 5 AND OrderDate >= '2024-01-01';
```

`(UserID, OrderDate)` lets the engine seek directly to `UserID = 5` and then range-scan the dates
inside that one contiguous run. `(OrderDate, UserID)` cannot: `UserID` is only sorted *within*
each date, so there is no single place to jump to, and the engine has to work through the date
ranges instead. The rule of thumb that falls out is **equality predicates first, ranges last** —
put the columns tested with `=` at the front, in the order the queries use them, and the ranged
column after.

The related trap is **sargability**: a predicate is only seekable if the indexed column appears
by itself on one side of the comparison. Wrapping it in a function destroys that.

```sql
-- Not sargable: the engine cannot seek on YEAR(OrderDate), only on OrderDate.
WHERE YEAR(OrderDate) = 2024

-- Sargable: the same rows, expressed as a range over the indexed column itself.
WHERE OrderDate >= '2024-01-01' AND OrderDate < '2025-01-01'
```

The second form is a seek plus a range scan; the first is a scan that evaluates a function per
row. Nothing about the index changed — only how the predicate was written.

```quiz 01M19Z3W2S0VCK062MVF026XQ9
A reporting query filters `WHERE CustomerID = 42 AND OrderDate >= '2024-01-01'`. Which composite
index serves it best?

- [x] `(CustomerID, OrderDate)` — equality on the leading column, range on the second
  > The engine seeks to the single run of rows for customer 42, then walks the dates inside it,
  > which are contiguous and in order.
- [ ] `(OrderDate, CustomerID)` — the more selective column belongs last
  > `CustomerID` is only sorted within each date here, so customer 42's rows are scattered across
  > every date the range covers.
- [ ] Either one, since both indexes contain both of the filtered columns
  > Containing a column and being *sorted* by it are different things. Only the leading column
  > can be sought on directly.
- [ ] Neither — two single-column indexes on each would beat any composite
  > The engine can combine two indexes, but that costs an extra join of their results, which one
  > correctly ordered composite avoids entirely.
```

## What indexes cost the write path

Three costs, worth naming separately because they show up in different places.

**Maintenance per write.** Every index is another structure to insert into, delete from, or
update. The write path grows with the number of indexes, which is why "add an index" is never
free advice and why unused indexes are worth finding and dropping.

**Locking.** A write holds locks on everything it touches, and a large enough write has its row
locks **escalated** to coarser locks covering more of the table — at which point a statement that
was blocking a few rows is blocking a great deal more, on the base table and on the indexes it
maintains. When escalation fires, what it escalates to, and how to keep two writers from
deadlocking each other is [[deadlocks-blocking-and-lock-ordering]].

**Fragmentation.** Inserts and updates that do not land at the end of an index split pages and
leave gaps, so the index occupies more pages than its data needs and the engine reads pages that
are mostly empty. This is what makes a randomly-ordered clustered key — a random GUID, say —
expensive over time: every insert lands in the middle. SQL Server measures it through the
`sys.dm_db_index_physical_stats` dynamic management view, and Microsoft's index maintenance
guidance has long drawn the line at reorganising a moderately fragmented index and rebuilding a
heavily fragmented one. The DMVs and the exact incantations collect in
[[sql-server-performance-dmvs]].

```quiz 01M19Z3W2SKP7QF65C9JSV76H4 recall
An interviewer says: "This table has eight nonclustered indexes and the reads are all fast.
What's the problem?" Make the argument, and say what you would do about it.

> Every one of those indexes is maintained on every write. A single-row insert becomes nine
> writes — the clustered index plus eight B+ trees, each needing the new entry placed in sorted
> position — and an update to an indexed column becomes a delete-and-reinsert in each index that
> carries it. That is CPU for the tree maintenance and extra transaction-log volume for all of
> it, and it lengthens the time each write holds its locks, so a write-heavy table with many
> indexes is also a table that blocks more.
>
> The other half of the problem is that a fast read is not evidence an index is being used. Some
> of the eight are probably serving nothing, and some are probably redundant with each other —
> an index on `(A)` when an index on `(A, B)` exists adds nothing, because the leading column is
> already sought on.
>
> What I would do: measure rather than guess. Sample the usage statistics over weeks — long
> enough to cover a monthly job — and look for indexes with no seeks or scans against a high
> update count. Those are candidates to drop, one at a time, with the query workload watched
> after each.
```

## Two things that exist and are out of scope here

**Filtered indexes.** An index can carry a `WHERE` clause of its own and cover only the rows
matching it, which is how a column that is `NULL` in nearly every row gets an index that is not
mostly empty. That belongs with covering design and is treated in
[[covering-indexes-and-included-columns]].

**Columnstore indexes.** A different storage model entirely — data organised and compressed by
column rather than by row, built for analytical scans over large fact tables rather than for the
transactional lookups everything above is about. Name it, say it is for OLAP, and move on.

## What this buys you in the room

Asked to make a query fast, the sequence is short and always the same:

1. **Look at the query, not the table.** Which columns does it filter on, sort by, and return?
2. **Check what already exists.** The clustered index may already serve it; a redundant index is
   a cost with no benefit.
3. **Choose the key columns and their order** — equality predicates first, range last — and check
   the predicates are sargable.
4. **Say what it costs the writes**, including that a heavily-indexed table is a table whose
   writes hold locks for longer.

The one thing to go and read in full is Microsoft's
[SQL Server index architecture and design guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide),
which covers clustered and nonclustered structures, included columns and filtered indexes in one
document and is the reference an indexing choice can actually be defended from.
