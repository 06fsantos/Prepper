---
id: 01M19YK304HXM5HRV9W09NR5SD
title: SQL Server indexing
topic:
  - databases
---

The physical structures underneath a table: one clustered B+ tree that *is* the table in key
order, and any number of nonclustered trees beside it. Every one of them is built for a
particular query and paid for on every write, so indexing is a design act rather than a
setting.
