---
id: 01M19YK304R7GSGSNJSA28THQ8
title: The relational model and keys
topic:
  - relational-design
---

"Design a schema for X" is one of the two or three questions a database interview is actually
made of, and almost every answer that goes wrong goes wrong in the same place: the tables are
plausible, and nothing in them says which row is which. A key is not decoration on a `CREATE
TABLE`. It is the only reason a row can be found, changed, or pointed at from somewhere else.

The word **relational** is the first thing to get straight, because it does not mean what it
sounds like. It has nothing to do with relationships between tables. A *relation* is a
mathematical object — a set of tuples over a fixed schema — and in SQL it is spelled `TABLE`.
Two properties come with that definition, and the second one does all the work:

- It has a **schema**: column names and types, fixed for every row.
- It is a **set**, so it holds **no duplicate rows**. Two rows agreeing on every column are not
  two rows; they are one row written twice.

That second property is where primary keys come from. A table is a claim about the world, and a
claim you cannot address is not usable: `UPDATE Users SET Email = '…' WHERE UserID = 5` has to
mean exactly one row, or it means nothing you can reason about.

## A primary key is a promise about identity

The primary key is the column or columns the engine guarantees to be **unique** and **non-null**.
Exactly one per table.

```sql
CREATE TABLE Users
(
    UserID    INT PRIMARY KEY,
    Email     VARCHAR(255) NOT NULL,
    FirstName VARCHAR(100),
    LastName  VARCHAR(100)
);
```

Those two guarantees together are called **entity integrity**: knowing a `UserID` is the same as
knowing a row. Drop either half and the promise fails differently. Without uniqueness you cannot
tell which row you addressed; without non-nullability you have rows the key does not address at
all, because `NULL` is not equal to anything, itself included.

It is worth separating the primary key from a `UNIQUE` constraint here, because the difference is
smaller than most people expect and is a standard follow-up. A `UNIQUE` constraint also enforces
uniqueness and is also backed by an index — but it permits `NULL` (SQL Server allows a single
`NULL` per unique index), and a table may carry as many of them as you like. The primary key is
the one that is *also* non-null and *also* singular, and that is the whole of the distinction.

```quiz 01M19YK304RYBHPD68R89RXR38 cloze
A primary key enforces two things a `UNIQUE` constraint does not both enforce: values are
{{unique}} and values are {{non-null}}. A table may have any number of unique constraints and
exactly {{one}} primary key. The guarantee the pair adds up to is called {{entity integrity}}.
```

## Natural keys describe the world; surrogate keys describe the row

A primary key can be built from real data or made up by the system, and the choice is one you
should be able to defend rather than recite.

A **natural key** is drawn from the domain: an email address, an ISBN, a URL slug. It is
meaningful and needs no extra column, and it inherits every property of the thing it names —
including the ability to change. Email addresses get updated. Slugs get rewritten when the title
does. A natural key that changes has to be rewritten in every table that references it.

A **surrogate key** is an arbitrary value the system assigns and never reuses — an `IDENTITY`
integer, or a GUID. It means nothing, which is exactly its virtue: nothing in the business can
make it wrong. It is narrow, stable, and cheap to join on.

Prefer surrogate keys, and know why: they decouple the schema from the volatility of the domain.
That is the interview answer, and it is also the design most systems land on. Natural keys are
not banned — they earn their place where the value genuinely cannot change and the table is
genuinely about that value.

The width of the surrogate is a real decision rather than a default, because the key is copied
into every nonclustered index on the table and into every row of every table that references it.
`INT` is four bytes and runs out at 2,147,483,647 rows, which a table taking a million inserts a
day reaches in under six years. `BIGINT` is eight and does not, at the cost of four more bytes
per index entry, repeated across every index. A GUID is sixteen, and a randomly generated one
also arrives in no particular order — so inserts land in the middle of the
[clustered index](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide)
rather than at its end, which is where page splits and fragmentation come from. Why that matters
is the subject of [[clustered-and-nonclustered-indexes]].

```quiz 01M19YK304F59KF0F54Q6ES89V
You are choosing the primary key for an `Articles` table in a blog. Which is the best choice?

- [x] An `ArticleID` the system assigns and never changes
  > A surrogate key survives every edit to the article, including the ones you have not thought
  > of, and stays narrow in every index that carries it.
- [ ] The article's URL slug, which is unique per post
  > Unique today, and it changes the first time a title is rewritten — along with every row in
  > every table that referenced it.
- [ ] The pair `(AuthorID, PublishDate)`, which no two articles share
  > Wider in every referencing table, and it stops being unique the day one author publishes
  > twice in the same instant.
- [ ] No primary key, since the slug column is already unique
  > A unique column permits `NULL` and is not the row's identity; nothing else can then declare
  > a foreign key against this table.
```

## A foreign key is the schema's other integrity promise

One table on its own is rarely a schema. A **foreign key** is a column in one table holding
values that must exist as a primary key in another.

```sql
CREATE TABLE Posts
(
    PostID  INT PRIMARY KEY,
    UserID  INT NOT NULL,
    Title   VARCHAR(255),
    Content NVARCHAR(MAX),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
```

The engine now enforces **referential integrity**, in both directions:

- No `Posts` row may name a `UserID` that is not in `Users`. A post for a user who does not exist
  cannot be written, by anyone, through any code path.
- No `Users` row may be deleted while posts reference it — unless the schema says what should
  happen instead, via `ON DELETE CASCADE` or `ON DELETE SET NULL`.

That "by anyone, through any code path" is the point of putting it in the schema rather than in
the application. Orphaned rows are not a class of bug you can test your way out of; they are a
class of bug you can make unrepresentable.

`ON DELETE CASCADE` is the part to be careful with, and the caution is about scale rather than
correctness. One `DELETE` against the parent becomes a delete of every matching child row, in one
transaction, holding every lock that implies — and a delete large enough will have its row locks
escalated to a table lock, at which point the statement blocks everything else touching that
table. It is not a reason to avoid the constraint; it is a reason to know that the elegant
one-line delete is a large transaction wearing a small statement's clothes. What escalation is
and when it fires is [[deadlocks-blocking-and-lock-ordering]].

## Uniqueness is usually narrower than it first looks

The constraint people most often get wrong is not the primary key but the unique one beside it,
and the tell is a multi-tenant system. "Email must be unique" is almost never the rule. The rule
is "email must be unique *within a tenant*", and the two are different schemas:

```sql
-- Wrong: two tenants can never have a customer with the same email.
CONSTRAINT UQ_Users_Email UNIQUE (Email)

-- Right: unique within the tenant, which is what the business actually said.
CONSTRAINT UQ_Users_Tenant_Email UNIQUE (TenantID, Email)
```

This is worth writing down on the first day, because a unique constraint is backed by an index
and changing it later means rebuilding that index against data that has already violated the new
rule. Getting the *scope* of a uniqueness claim right is a design skill in its own right, and it
is the same skill normalization formalises — see
[[normalization-to-third-normal-form]].

```quiz 01M19YK304AW2PFETRP80HJYKJ recall
An interviewer says: "Our application code already checks that every order belongs to a real
customer. Why bother with a foreign key?" Make the argument.

> Because the check in application code is a claim about *one* code path, and the database has
> many: a second service, a migration script, a bulk import, a manual fix at three in the
> morning, a bug in a branch nobody reviewed. A foreign key is enforced by the engine on every
> write regardless of who issued it, so an orphaned row stops being a thing that can be tested
> for and starts being a thing that cannot be written. It also declares the relationship where
> the next person will read it — the schema — rather than leaving it to be inferred from code.
> The cost is real and worth naming: it constrains delete order, and a cascading delete can be a
> much larger transaction than the statement that triggered it.
```

## What this buys you in the room

Four things, roughly in the order an interviewer will notice them missing:

1. **The entities.** Which tables exist at all. A missing table is a worse answer than a
   sub-optimal key, and it is the thing to spend the first minutes on.
2. **A deliberate primary key per table.** Surrogate by default, and a sentence ready for why.
   Do not reach for a composite primary key without a reason you can defend.
3. **Relationships expressed as foreign keys.** "A user has many posts" is not a design until it
   is a column with a `REFERENCES` clause. Saying it and not writing it is the most common way to
   look like you have not built one of these.
4. **Integrity stated in the schema.** Good schema design makes bad data impossible rather than
   unlikely, and every constraint you push into the engine is one your application no longer has
   to be trusted with.

The one thing to go and read in full is Microsoft Learn's
[database normalization description](https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description).
It is short, it works one example the whole way through, and it treats keys and normalization as
the single subject they are rather than two.
