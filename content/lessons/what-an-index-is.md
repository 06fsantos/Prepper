---
id: 01M21DWQPSXSFZ69H88DAVQY83
title: What an index is
topic:
  - sql-server-indexing
prerequisites:
  - the-relational-model-and-keys
---

An index is the thing that lets a database find a handful of rows without reading all of them.
That is the whole idea, and it is worth holding on to before any product, any syntax, or any
tree diagram: without an index the engine has exactly one way to answer "which rows match this?"
— look at every row and check. An index is a second, ordered structure kept beside the data that
turns that question into a navigation instead of a search. This Lesson is the engine-neutral
concept; the SQL Server specifics — what kinds there are, and which one *is* the table — are
[[clustered-and-nonclustered-indexes]].

## A scan reads everything; a seek jumps

Take a table of ten million rows and the most ordinary request there is: find the row whose email
is `alice@example.com`. If nothing is organised by email, the engine has one strategy — read every
row and compare. That is a **scan**, and its cost is proportional to the size of the table. Ten
million rows means ten million comparisons, and it costs the same whether the match is the first
row or the last or absent entirely, because the engine cannot know it is done until it has looked
at all of them.

A **seek** is the alternative, and it is only available when something has already put the rows in
order by the column you are asking about. Given that order, the engine does not examine rows it has
ruled out; it navigates to the ones that can match and reads only those. The gap between the two
words is the single most useful distinction in the whole subject, and it is the first thing to look
for when [[reading-an-execution-plan|reading a query's execution plan]]: a seek where the engine
went straight to the rows, or a scan where it read the lot.

```quiz 01M21DWQPVQ6FFE6FD00NT0FJA
A query filters a ten-million-row table on a column with no index on it. What does the engine do,
and what does it cost?

- [x] A scan — it reads every row and compares, costing time proportional to the table
  > With no order to exploit, there is no way to rule rows out without looking at them, so the
  > work grows with the number of rows regardless of how many actually match.
- [ ] A seek — it navigates straight to the matching rows in `O(log n)`
  > A seek needs the rows already ordered by that column. With no index there is no such order to
  > navigate, so the engine has nothing to descend.
- [ ] A scan, but it stops early as soon as the first match is found
  > It cannot stop early: without an ordered structure it has no way to know more matches do not
  > lie further on, so it must read to the end.
- [ ] Neither — the query fails until an index exists to serve it
  > A query never requires an index to be legal. The engine always has the scan available; the
  > index only offers it a cheaper path.
```

## An index *is* an ordered lookup structure

So a seek needs the data ordered by the column being queried. An index is exactly that order,
maintained as a structure the engine can descend: almost always a **B-tree** (SQL Server, like
most relational engines, uses a B+ tree). You do not need the node-splitting internals for an
interview; you need the shape of the argument. The tree is *balanced* and
*sorted*, so at each level the engine discards most
of the remaining keys and follows one branch down. A search therefore costs a number of steps
proportional to the **depth** of the tree rather than to the number of rows in it — `O(log n)`
instead of the scan's `O(n)`, in the vocabulary of [[big-o-notation]]. Because each node holds many
keys, the tree stays shallow: millions of rows are a handful of levels, not a thousand.

That shallowness is the entire benefit, and the arithmetic is worth being able to say out loud on a
whiteboard: **doubling the table adds at most one level to the tree, while doubling the rows a scan
reads doubles its work.** The ordering also comes with a bonus the scan never had — once a seek has
found the first matching row, the next rows in the range are physically the neighbours, so a range
query like "orders between these two dates" walks forward from the entry point instead of searching
again.

```quiz 01M21DWQPVE44EHC82Y47YJBFH cloze
An index keeps the data ordered in a {{B-tree}}, which is both balanced and sorted. A search
follows one branch down per level and so costs steps proportional to the tree's {{depth}} — that
is {{O(log n)}}, against the {{O(n)}} of a scan that must read every row.
```

## The order is not free — every write has to maintain it

The catch is on the other side of the workload, and naming it is what separates a real answer from
"add an index on the `WHERE` clause". A sorted structure only stays sorted if every change to the
data updates it. Every `INSERT` must place the new entry in its correct position in the index, not
just append it. Every `DELETE` must remove its entry. Every `UPDATE` to an indexed column must move
the entry from its old sorted position to its new one. So each index on a table is a second
structure the write path has to maintain: five indexes mean one insert becomes six writes, not one.

This is why there is no such thing as a good index in the abstract — only an index that is good for
a particular query, bought with cost paid on every write to that table. The trade is real and
unavoidable; the design skill is knowing where to sit on it, which is a question of the read-to-write
ratio rather than the table's size. That trade, and the SQL-Server-specific machinery for making it
— the clustered index that *is* the table, the nonclustered ones beside it, covering, and column
order — is [[clustered-and-nonclustered-indexes]].

```quiz 01M21DWQPVSQAXQXWNKF12QFKE recall
An interviewer says: "Indexes make queries faster, so why not index every column?" Give the
argument against it.

> Because an index is an ordered structure that has to be kept ordered, and keeping it ordered is
> work done on every write, not on every read. Each index is a second structure the engine
> maintains: an insert has to place the new entry in the right sorted position in every index on
> the table, a delete has to remove it from each, and an update to an indexed column has to move
> it. Index every column and a single-row insert becomes a write to a dozen structures — so a
> write-heavy table drowns in maintenance.
>
> An index earns its place only against real queries: it speeds up the reads that actually filter
> or sort on its columns, and it slows down every write regardless. The right number is therefore
> a handful chosen from the query workload, not one per column, and an index no query uses is pure
> cost with no benefit.
```

## What to carry into the room

The concept compresses to three sentences. A scan reads every row; a seek navigates an ordered
structure to just the matching ones. That structure is an index — a B-tree kept sorted, giving
`O(log n)` search against the scan's `O(n)`. And it is paid for on every write, because the order
only survives if each insert, update, and delete maintains it. Everything else in indexing is a
consequence of those three facts applied to a specific engine.

The one thing to go and read in full is Microsoft's
[SQL Server index architecture and design guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide),
which lays out the B+ tree structure and the design guidelines in one document; pair it with the
[Execution Plan Overview](https://learn.microsoft.com/en-us/sql/relational-databases/performance/execution-plans)
for the seek-versus-scan vocabulary as the optimiser reports it.
