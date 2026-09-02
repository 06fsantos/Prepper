---
id: 01M19YVM9RKNZFA3E7SC8MDB73
title: Relational schema design — cheat sheet
topic: relational-design
---

**A relation is a set of tuples over a fixed schema.** Set, so no duplicate rows — which is
where the primary key comes from: a claim you cannot address is not usable.

**Keys, and what each promises:**

- **Primary key** — unique **and** non-null, exactly one per table. The pair is **entity
  integrity**: knowing the key is the same as knowing the row.
- **`UNIQUE` constraint** — unique only. Permits a `NULL` (one, in SQL Server), and a table may
  carry any number of them. That is the whole of the difference.
- **Foreign key** — **referential integrity**, enforced by the engine on every write, from every
  code path, not just the one you tested. `ON DELETE CASCADE` is one statement that becomes an
  arbitrarily large transaction.
- **Surrogate by default** (`IDENTITY`, GUID): meaningless, so nothing in the business can make
  it wrong. A **natural key** inherits the domain's volatility — change it and every referencing
  table changes. Key width is copied into every nonclustered index and every referencing row:
  `INT` 4 bytes, `BIGINT` 8, GUID 16 and arrives in no order.
- **Scope a uniqueness claim before writing it.** "Email is unique" is almost always
  `UNIQUE (TenantID, Email)`.

**The ladder, and the anomaly each rung kills:**

| Form | Rule | Fixes |
| ---- | ---- | ----- |
| 1NF  | Atomic values; one row is one fact | Repeating groups; insertion and deletion anomalies |
| 2NF  | No non-key column depends on **part** of a composite key | Partial dependencies |
| 3NF  | No non-key column determines another (no transitive dependency) | Update and deletion anomalies |
| BCNF | Every **determinant** is a candidate key | Hidden constraints under overlapping keys |

The one-liner: every non-key column depends on **the key, the whole key, and nothing but the
key** — 1NF, 2NF, 3NF in that order.

**Three anomalies, by name:** *update* (a repeated fact rewritten in some rows, not all),
*insertion* (a fact with nowhere to live until an unrelated one exists), *deletion* (a fact lost
because the row that incidentally carried it went away).

**Say 3NF is the target.** Name BCNF as the stricter form and overlapping composite candidate
keys as where the two differ; do not volunteer a BCNF decomposition nobody asked for.

**Denormalizing is a trade-off only if you say all three parts:** which normal form you are
violating, which read it buys, and how the copy is kept consistent (trigger, batch job).
Summary tables buy staleness; a duplicated column buys a sync job; a JSON column costs you the
ability to index the value inside it.

**The reach-for-it signal:** the same fact appearing in a second row for a reason that has
nothing to do with that row — that is a dependency living in the wrong table.

**Designing out loud, in order:** entities and their keys → many-to-many relationships become
junction tables with composite keys → each non-key column against the *whole* key → any non-key
column determining another gets its own table → where you would denormalize, and why.

Full treatment: [[the-relational-model-and-keys]], then
[[normalization-to-third-normal-form]].
