---
id: 01M3Y55ASTYHD86YAE0VAPS22F
title: Zero-downtime schema changes
topic:
  - continuous-delivery
  - databases
prerequisites:
  - blue-green-canary-and-rolling-deployments
---

Rolling back application code is cheap. You redeploy the previous artifact, and the old code runs
again exactly as it did before. Rolling back a database is a different thing. The schema and the rows
written under the new version are still there after the old code comes back. So a deploy that
changes code and schema together, in one step, is the deploy you cannot undo. During a rolling,
canary or blue-green deploy it can also break the old version that is still serving traffic.

The fix is to never make a breaking schema change in one step. Split it into **expand, migrate,
contract**, so that at every moment the schema works for both the version that is running and the
version that is replacing it. That is what this Lesson teaches, along with when to roll back and when
to roll forward.

## Why the schema is what makes rollback hard

Every progressive deploy strategy in [[blue-green-canary-and-rolling-deployments]] has a period when
two versions of the application are live together. A rolling deploy has old and new instances behind
the load balancer at once. A canary sends a slice of traffic to the new version. Blue-green keeps the
old environment ready so you can switch back. All of them assume that the old version still works if
you send traffic back to it. With a stateless service, it does. With a shared database, it works only
if the database still looks the way the old version expects.

Martin Fowler says this directly in
[BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html): "Databases can often
be a challenge with this technique, particularly when you need to change the schema to support a new
version of the software." His answer is the core of this Lesson:

> The trick is to separate the deployment of schema changes from application upgrades. So first apply
> a database refactoring to change the schema to support both the new and old version of the
> application, deploy that, check everything is working fine so you have a rollback point, then
> deploy the new version of the application. And when the upgrade has bedded down remove the
> database support for the old version.

Pramod Sadalage and Fowler make the same point about rolling deployments and canaries in
[Evolutionary Database Design](https://martinfowler.com/articles/evodb.html). There, "the database has
to support multiple releases of the application", which forces it to be "backwards compatible with all
previous application releases that are live in production."

Google's SRE workbook adds the operational rule in its
[on-call chapter](https://sre.google/workbook/on-call/): "If at all possible, avoid changes that can't
be rolled back, such as API-incompatible changes and lockstep releases." A schema change shipped in
the same step as the code that needs it is a **lockstep release**. The old code cannot run against the
new schema, and the new code cannot run against the old one.

```quiz 01M3Y55ASXZDFAZS7T41972602
A team renames `Customers.Name` to `FullName` in one migration and deploys it in the same release as
the code that reads `FullName`. They use a rolling deploy across six instances. What goes wrong?

- [x] Instances still on the old version query a column that no longer exists, and fail
  > During a rolling deploy, old and new instances serve traffic together. The rename removed what
    the old instances need, so they fail until they are replaced. Rollback leads to the same failure.
- [ ] Nothing, because the rolling deploy replaces every old instance before the rename
  > The migration runs once, against the shared database. Instances are replaced one at a time, so
    for most of the deploy some instances are still old and depend on the old column.
- [ ] The rename itself is unsafe, because SQL Server cannot rename a column with data in it
  > The rename works. The problem is that two versions of the application depend on two different
    shapes of the same table at the same moment.
- [ ] Only the new instances fail, because they start before the migration has been applied
  > That can also happen if the order is wrong, but even with the migration first, every old
    instance still serving traffic breaks. Only expand/contract avoids both failures.
```

## Expand, migrate, contract

Danilo Sato's [ParallelChange](https://martinfowler.com/bliki/ParallelChange.html) names the pattern:
"Parallel change, also known as expand and contract, is a pattern to implement backward-incompatible
changes to an interface in a safe manner, by breaking the change into three distinct phases: expand,
migrate, and contract." A schema is an interface whose clients are every running version of your
application, so the pattern applies to it directly, the way it does to [[api-design#Versioning keeps the contract stable while it changes|an API's versions]]. Sato lists database refactoring and blue-green and
canary deployments among its uses.

- **Expand.** Change the interface so it supports both the old and the new version. In a schema, that
  means *adding*: a new column, a new table, or a view with the old name. Nothing that the old version
  uses is removed or changed.
- **Migrate.** Move every client from the old version to the new one. Sato notes this "can be done
  incrementally" and is usually the longest phase. In a schema, this is where the application moves to
  the new structure and the existing data is copied across.
- **Contract.** Once nothing uses the old version, remove it.

The property that matters for delivery is in Sato's article: the pattern "allows your code to be
released in any of these three phases." Each phase is a separate deploy, and each one is safe to roll
back to the phase before it. The same article gives the warning: "If the contract phase is not
executed you might end up in a worse state than you started, therefore you need discipline to finish
the transition successfully."

[Evolutionary Database Design](https://martinfowler.com/articles/evodb.html) calls the period between
expand and contract a **transition phase**: "a period of time when the database supports both the old
access pattern and the new ones simultaneously." Its own example renames a table and leaves a view
behind under the old name:

```sql
ALTER TABLE customer RENAME to client;

CREATE VIEW customer AS
SELECT id, first_name, last_name FROM client;
```

That view is the expand step. The authors say views are one way to build a transition phase and that
triggers are "handy for things like Rename Column". The transition phase "does add complexity, so
it's important that it gets removed once downstream systems have had time to migrate". That removal
is the contract step.

The same article sorts changes by whether they need this treatment. Adding a nullable column is
"backwards compatible", and code that doesn't know about it just ignores it. **Destructive changes**
break existing code. Making a column non-nullable is a minor one, because old code that doesn't set
the column now gets an error. Renaming or splitting a table is a larger one. Expand/contract exists
for destructive changes.

```quiz 01M3Y55ASXHHQ6G2390T45V33E cloze
Parallel change splits a backward-incompatible change into three phases: {{expand}}, where the schema
supports both the old and the new version; {{migrate}}, where clients move to the new one; and
{{contract}}, where the old one is removed. The danger in skipping the last phase is ending up
{{in a worse state than you started}}.
```

## A worked example: renaming a column on SQL Server

Here is one way to apply the pattern to the rename from the quiz above. It gives up the single-step
rename and uses a series of separate deploys. After each one, both the running version and the
version before it work against the schema.

**Deploy 1: expand the schema, with no application change.** Add the new column as nullable. This is
backwards compatible, so the code already in production doesn't notice it. Fowler's sequence says to
ship this on its own and check it works, "so you have a rollback point".

```sql
ALTER TABLE dbo.Customers ADD FullName nvarchar(200) NULL;
```

**Deploy 2: write both columns, read the old one.** The new version writes `Name` and `FullName` on
every insert and update, but it still reads `Name`. It has to read the old column. While deploy 2
rolls out, old instances are still updating only `Name`, so any `FullName` value could already be out
of date. Rolling back is safe because `Name` is still written and still read.

```csharp
// Deploy 2: write both columns, read the old one
const string Update = """
    UPDATE dbo.Customers
    SET Name = @FullName, FullName = @FullName
    WHERE CustomerId = @Id;
    """;
const string Read = """
    SELECT CustomerId, Name AS FullName
    FROM dbo.Customers WHERE CustomerId = @Id;
    """;
```

**Migrate the data.** Once no instance is left writing only `Name`, copy the existing rows across. Run
the copy in small batches, so that no single [[transactions-and-acid|transaction]] holds enough row
locks to [[deadlocks-blocking-and-lock-ordering#Lock escalation: many small locks become one large one|escalate]]
to a lock on the whole table. Because it updates only rows whose `FullName` is still null, it can safely be run
again after an interruption.

```sql
WHILE 1 = 1
BEGIN
    UPDATE TOP (1000) dbo.Customers
    SET FullName = Name
    WHERE FullName IS NULL AND Name IS NOT NULL;

    IF @@ROWCOUNT = 0 BREAK;
END;
```

**Deploy 3: read the new column, still write both.** `FullName` is now complete and kept current, so
the application can read it. It keeps writing `Name` as well, so rolling back to deploy 2, which reads
`Name`, is still safe.

**Deploy 4: write only the new column.** The application stops writing `Name`. Rolling back to
deploy 3 is safe, because deploy 3 reads `FullName`. Rolling back to deploy 2 is **not** safe: it
reads `Name`, which has stopped being updated. Each deploy can be undone by one step, not all the way
back. This is what "a rollback point" means in practice.

**Deploy 5: contract.** Once deploy 3 is no longer a rollback target, drop the old column. This is the
only irreversible step. A dropped column cannot be redeployed, and its data is gone.

```sql
ALTER TABLE dbo.Customers DROP COLUMN Name;
```

That is five deploys for one rename. It is the price of never having a moment when a running version
and the shared schema disagree. Evolutionary Database Design mentions triggers as another way to keep
the two columns in sync during the transition phase.

Two details are specific to SQL Server. First, the DDL is part of the downtime question too. The
[ALTER TABLE documentation](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql)
says that `ALTER TABLE` takes a **schema modification (Sch-M) lock**, so that "no other connections
reference even the metadata for the table during the change". The expand step should be one that
finishes quickly. Adding a nullable column is quick. So, in Enterprise edition from SQL Server 2012
onwards, is adding a `NOT NULL` column whose default is a runtime constant: the default "is stored
only in the metadata of the table", so the change "finishes almost instantaneously despite the number
of rows". A default that isn't a runtime constant, such as `NEWID()`, "is always run offline" and
holds the Sch-M lock for the whole operation. Second, the migration scripts themselves are versioned
and applied by tooling, never by hand. Evolutionary Database Design treats "every change to the
database as a database migration script which is version controlled together with application code
changes", and that script travels through [[the-deployment-pipeline]] like any other artifact.

How the code switches between columns can also be put behind a flag rather than tied to a deploy.
That is [[feature-flags-and-separating-deploy-from-release]], and Sato mentions it as an option for
choosing which version is used during the migrate phase.

```quiz 01M3Y55ASXVDQM4ENE1NA9N8ZS
In the rename above, deploy 4 (which writes only `FullName`) is live and causing errors. The team
wants to roll back to deploy 2, which writes both columns but reads `Name`. Why is that unsafe?

- [x] Deploy 2 reads `Name`, which stopped being written once deploy 4 went live
  > Deploy 4 writes only `FullName`, so every change since then is missing from `Name`. The safe
    rollback target is deploy 3, which already reads `FullName`.
- [ ] Deploy 2 cannot start, because the schema contains a column it does not expect
  > An extra nullable column is backwards compatible: code that doesn't know about it ignores it.
    The danger is stale data in the column deploy 2 reads, not the extra column.
- [ ] Rolling back any version is unsafe once a migration has run against production data
  > Then expand/contract would be pointless. Each phase is designed so the previous phase can run
    against the current schema. Only going back further than one phase is the problem.
- [ ] Deploy 2 would hold a Sch-M lock on the table while it reads the column it needs
  > Reads don't take schema modification locks. The Sch-M lock is about running DDL, which a
    rollback of application code doesn't do.
```

## Rollback or roll forward

To **roll back** is to redeploy the last good version. To **roll forward** is to fix the bug and
deploy a new version on top. The default is clear. The
[SRE book's production best practices](https://sre.google/sre-book/service-best-practices/) say: "If
unexpected behavior is detected, roll back first and diagnose afterward in order to minimize Mean
Time to Recovery." The [SRE workbook](https://sre.google/workbook/on-call/) gives the order of
operations, under "Mitigation delay": "detect, roll back, fix, and roll forward", because "it is
better to 'roll back, fix, and roll forward' rather than 'roll forward, fix, and roll forward again.'"
The previous version is known to work. A patch written during an incident is not.

Rolling back is the right call when the previous version is still a **safe target**: it can run
against the current schema and against the data the bad version wrote. Expand/contract exists to keep
that true. Between any two adjacent phases, the application can roll back while the schema stays
where it is.

Rolling forward is the right call when rollback is not safe:

- **The previous version can't run against the current schema.** A contract step has already run, or
  a change was shipped in lockstep. A dropped column cannot be redeployed.
- **The bad version damaged data.** The workbook notes that "a rollback alone may be necessary but is
  not sufficient if the bug caused data corruption". Redeploying old code stops new damage, but the
  rows that were already written stay wrong until a fix repairs them.
- **There is no rollback mechanism.** The SRE workbook's
  [Canarying Releases](https://sre.google/workbook/canarying-releases/) chapter works through a case
  where rollback isn't available, and the only remaining option is to "find defects in the production
  version, patch them, and deploy a new version during the outage".

Notice what is *not* on the list: rolling back the schema itself. Evolutionary Database Design says
that automating reverse migrations is possible, but the authors haven't found it "cost effective and
beneficial enough to try all the time". They "prefer to write our migrations so that the database
access section can work with both the old and new version of the database." In practice, the
application rolls back and the schema stays expanded. A new column that nobody reads is harmless, and
it gets removed by the next contract step rather than by an undo script. How quickly a team recovers
from a bad deploy is something [[dora-metrics]] measure.

```quiz 01M3Y55ASXG3JGADWJHWEGK4KQ recall
An interviewer asks: "You need to split the `Address` column into `Street` and `City` on a busy SQL
Server table, and you deploy with rolling updates. Walk me through it, and tell me what you'd do if
the new version misbehaves halfway through."

> I wouldn't change the column in place, because during a rolling deploy old and new instances share
> the database, and a lockstep change breaks the old ones and makes rollback impossible. I'd use
> expand, migrate, contract. First, expand: add `Street` and `City` as nullable columns, deployed on
> their own, which is backwards compatible and quick. Then a version that writes both shapes but still
> reads `Address`, because old instances are still writing only `Address` while it rolls out. Then
> backfill the existing rows in batches. Then a version that reads the new columns and still writes
> both. Then one that writes only the new columns. Finally, once nothing that might be rolled back to
> reads `Address`, contract by dropping it. Each phase is a separate deploy, and each can roll
> back to the phase before it. If the new version misbehaves, I roll back first and diagnose
> afterwards, because the previous phase is known to work against the current schema. I leave the
> schema expanded rather than reversing it. I'd roll forward instead only if rollback isn't safe:
> after the contract step, or if the bad version corrupted data that the old code can't repair.
```

## What to take away

A schema change makes rollback hard because the database is not redeployed. Its state stays behind
when the code goes back. During any progressive deploy, two versions of the application share one
schema, so a breaking change shipped in lockstep breaks the old version and removes the rollback.
**Expand, migrate, contract** fixes this. First add the new structure next to the old one. Then move
the code and the data across, one deploy at a time. Then remove the old structure, which is the only
irreversible step, once nothing that might need to be rolled back to still uses it. **Roll back first**
while the previous version is a safe target. **Roll forward** when it isn't: after a contract step,
after a lockstep change, or when the bad version corrupted data.

Worth reading in full: Sadalage and Fowler's
[Evolutionary Database Design](https://martinfowler.com/articles/evodb.html). It covers migrations as
versioned scripts, destructive changes, transition phases, and why a database that serves several live
releases has to stay backwards compatible with all of them.
