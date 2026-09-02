---
id: 01M19YVM9QN4VQ2WCFCZTF9VGA
title: Normalization to third normal form
topic:
  - relational-design
prerequisites:
  - the-relational-model-and-keys
---

A schema can be entirely legal and still be wrong. Every table has a primary key, every
constraint is declared, nothing the engine checks is violated — and the same fact is written in
forty rows, so changing it means changing forty rows and getting all forty right. Normalization
is the systematic fix for that, and it is not one idea but a short ladder of them: a sequence of
rules, each removing one class of redundancy the rule before it left behind.

The reason to learn it as a ladder rather than as a rule of thumb is that in an interview you are
not asked "is this normalized?" You are asked to design a schema out loud, and the ladder is the
narration: *these are the entities, this column does not depend on the whole key so it moves,
this one is determined by another non-key column so it moves too.* That is a thought process an
interviewer can follow. "It looks about right" is not.

The vocabulary underneath all of it — what a relation is, what a primary key promises, what a
foreign key enforces — is [[the-relational-model-and-keys]].

## Redundancy is not the problem; anomalies are

Storage is cheap, and "the student's email is repeated" is a weak reason to restructure a schema.
The real cost is that a repeated fact can disagree with itself, and it does so in three distinct
ways that are worth naming separately, because each normal form is aimed at one of them.

Take the schema someone writes first, before thinking about it — one table holding everything a
course registration touches:

```sql
CREATE TABLE StudentCourseRegistration
(
    StudentID        INT PRIMARY KEY,
    StudentName      VARCHAR(100),
    StudentEmail     VARCHAR(100),
    CourseID         INT,
    CourseName       VARCHAR(100),
    Instructor       VARCHAR(100),
    Credits          INT,
    SemesterEnrolled VARCHAR(50)
);
```

A student takes more than one course, so one student needs more than one row — and the moment
that happens, their name and email are stored once per course. Three things now go wrong:

- **Update anomaly.** The student changes their email. It has to be rewritten in every row that
  carries it, in one statement or none, or the database holds two answers to the same question.
- **Insertion anomaly.** A course exists but nobody has enrolled in it yet. There is nowhere to
  put it: a row here needs a `StudentID`, so a course cannot be recorded until a student is
  attached to it.
- **Deletion anomaly.** The last student drops the course, the row goes, and the course's name,
  instructor and credit value go with it — facts about the course that were only ever stored
  incidentally, on a row about someone else.

Every rung of the ladder below is a rule that makes one of these unrepresentable rather than
unlikely. That framing is worth carrying into the room: the answer to "why normalize?" is not
"to save space", it is "so that one fact lives in one place, and there is no way for the database
to contradict itself."

```quiz 01M19YVM9R82A57XF9X5BEV9DS cloze
Three anomalies motivate the whole ladder. Rewriting a repeated fact in some rows but not all is
an {{update}} anomaly. Being unable to record a course because no student has enrolled in it yet
is an {{insertion}} anomaly. Losing the course's details when the last enrollment row is removed
is a {{deletion}} anomaly.
```

## 1NF: every column holds one value, and every row is one fact

A table is in **first normal form** when every column contains an atomic, indivisible value — no
arrays, no comma-separated lists, no `Course1`/`Course2`/`Course3` columns, and no attempt to fit
several of something into a row shaped for one.

The registration table fails on the last of those. It is trying to hold a many-to-many
relationship — students have many courses, courses have many students — in a shape that has room
for one course per student. The fix is not a wider table; it is three narrower ones, where each
table is about exactly one kind of thing and the relationship gets a table of its own:

```sql
CREATE TABLE Students
(
    StudentID    INT PRIMARY KEY,
    StudentName  VARCHAR(100) NOT NULL,
    StudentEmail VARCHAR(100) NOT NULL
);

CREATE TABLE Courses
(
    CourseID   INT PRIMARY KEY,
    CourseName VARCHAR(100) NOT NULL,
    Instructor VARCHAR(100) NOT NULL,
    Credits    INT NOT NULL
);

CREATE TABLE Enrollments
(
    StudentID        INT NOT NULL,
    CourseID         INT NOT NULL,
    SemesterEnrolled VARCHAR(50) NOT NULL,
    PRIMARY KEY (StudentID, CourseID),
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (CourseID)  REFERENCES Courses(CourseID)
);
```

`Enrollments` is a **junction table**, and its primary key is composite —
`(StudentID, CourseID)` — because what identifies an enrollment is the pair. That composite key
is not an accident of this example; it is what the next rung is entirely about.

All three anomalies are already gone. The email is stored once. A course can exist with no
students. Dropping an enrollment removes an enrollment and nothing else.

## 2NF: a non-key column depends on the whole key, not part of it

**Second normal form** adds one rule to 1NF: every non-key column must depend on the *entire*
primary key. It has something to say only where the key is composite — with a single-column key
there is no "part of the key" to depend on, so such a table is in 2NF the moment it is in 1NF.

A **functional dependency** `A → B` says: fix a value of `A`, and the value of `B` is determined.
A **partial dependency** is one where `A` is only part of a composite key. Here is one:

```sql
CREATE TABLE Courses -- violates 2NF
(
    CourseID        INT,
    SemesterOffered VARCHAR(50),
    CourseName      VARCHAR(100),
    Instructor      VARCHAR(100),
    Credits         INT,
    PRIMARY KEY (CourseID, SemesterOffered)
);
```

The key says a row is a course *in a semester*. But `CourseName` and `Credits` are properties of
the course alone — "Databases" is called "Databases" and is worth four credits in every semester
it runs. They depend on `CourseID`, half of the key, and so they are repeated once per semester
the course is offered, and the update anomaly is back: rename the course, and you must rename it
in every semester's row.

`Instructor` is the interesting one, because it genuinely does depend on the pair — a different
person may teach it in the spring than in the autumn. That is the test: ask each non-key column
which part of the key it actually needs. The ones that need only part of it leave.

```sql
CREATE TABLE Courses
(
    CourseID   INT PRIMARY KEY,
    CourseName VARCHAR(100) NOT NULL,
    Credits    INT NOT NULL
);

CREATE TABLE CourseOfferings
(
    CourseID        INT NOT NULL,
    SemesterOffered VARCHAR(50) NOT NULL,
    Instructor      VARCHAR(100) NOT NULL,
    PRIMARY KEY (CourseID, SemesterOffered),
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID)
);
```

Two tables, and each column now sits with the key that determines it.

```quiz 01M19YVM9RN95B3XJ7J3HN6CA5
An `OrderLines` table has primary key `(OrderID, ProductID)` and the columns `Quantity`,
`UnitPrice`, `ProductName` and `ProductWeight`. Which columns violate 2NF?

- [x] `ProductName` and `ProductWeight`, which depend on `ProductID` alone
  > Both are facts about the product, not about this line of this order, so they are repeated on
  > every line that sells that product. They belong in a `Products` table.
- [ ] `Quantity` and `UnitPrice`, which depend on `ProductID` alone
  > Both are facts about this line: how many of this product on this order, at the price agreed
  > for it. Neither is determined by the product by itself.
- [ ] `ProductName` alone, since a weight is numeric and a name is text
  > The column's type says nothing about what determines it. Both columns are determined by the
  > same half of the key, so both move together.
- [ ] None of them, since the key already covers every row uniquely
  > A key that identifies rows is a 1NF concern. 2NF asks a further question: whether each
  > column needs all of that key or only part of it.
```

## 3NF: no non-key column determines another

**Third normal form** adds: no non-key column may be determined by another non-key column. Such a
chain is a **transitive dependency** — the key determines `A`, `A` determines `B`, so the key
determines `B` only by going through something that is not a key.

```sql
CREATE TABLE Enrollments -- violates 3NF
(
    StudentID        INT NOT NULL,
    CourseID         INT NOT NULL,
    SemesterEnrolled VARCHAR(50) NOT NULL,
    DepartmentCode   VARCHAR(10),
    DepartmentName   VARCHAR(100),
    PRIMARY KEY (StudentID, CourseID)
);
```

Trace the dependencies and the problem names itself:

- `(StudentID, CourseID) → SemesterEnrolled` — direct, fine.
- `(StudentID, CourseID) → DepartmentCode` — direct, fine.
- `DepartmentCode → DepartmentName` — a non-key column determining another, which is the
  violation.

The department's name is now stored once per enrollment in that department. Rename the
department and there are thousands of rows to rewrite; remove the last enrollment in it and the
name is gone from the database entirely, though the department has not closed. Both of the
anomalies the ladder started with, back again one rung higher.

The fix is the same move as before — the dependency gets a table where it is the key:

```sql
CREATE TABLE Departments
(
    DepartmentCode VARCHAR(10) PRIMARY KEY,
    DepartmentName VARCHAR(100) NOT NULL
);

CREATE TABLE Enrollments
(
    StudentID        INT NOT NULL,
    CourseID         INT NOT NULL,
    SemesterEnrolled VARCHAR(50) NOT NULL,
    DepartmentCode   VARCHAR(10) NOT NULL,
    PRIMARY KEY (StudentID, CourseID),
    FOREIGN KEY (DepartmentCode) REFERENCES Departments(DepartmentCode)
);
```

There is a compact way to say 1NF through 3NF as one sentence, and it is worth having ready:
**every non-key column depends on the key, the whole key, and nothing but the key.** "The key"
is 1NF, "the whole key" is 2NF, "nothing but the key" is 3NF.

```quiz 01M19YVM9RAAT26W972R7CYRR4 recall
An interviewer points at a table storing `DepartmentCode` and `DepartmentName` on every
enrollment row and asks what is actually wrong with it — "disk is cheap". Make the argument
without using the word redundancy.

> Because the schema has no way to say what the department's name *is*. The name is only ever
> recorded as a side effect of somebody enrolling, so the database can hold two spellings at once
> — a rename that touched some rows and not others leaves both in the table, and nothing marks
> either as authoritative. It can also lose the name completely: delete the last enrollment in a
> department and the fact goes with it, even though the department still exists. Extracting it
> into a `Departments` table keyed on `DepartmentCode` makes the name a fact in its own right,
> with one row that can be corrected in one statement and a foreign key ensuring no enrollment
> names a department that does not exist.
```

## BCNF, and why it is a footnote rather than a rung

**Boyce-Codd normal form** replaces 3NF's rule with a stricter one: every **determinant** — every
column or set of columns that determines another — must be a candidate key. It is worth being
able to state, and it is worth knowing where it bites, which is a narrow place: tables with
overlapping composite candidate keys, where 3NF's rule is satisfied and a hidden constraint
survives anyway.

```sql
CREATE TABLE CourseInstructorAssignment
(
    CourseID   INT,
    Instructor VARCHAR(100),
    TimeSlot   VARCHAR(50),
    PRIMARY KEY (CourseID, Instructor)
);
-- Business rule: an instructor teaches in exactly one time slot.
```

This passes 3NF. Every column is atomic; the only non-key column, `TimeSlot`, depends on the
whole key rather than half of it; and no non-key column determines another, because there is only
one non-key column. Yet the business rule says `Instructor → TimeSlot`, which makes `Instructor`
a determinant — and `Instructor` alone is not a candidate key. The schema therefore permits two
rows giving the same instructor different time slots, which the business says cannot happen. The
constraint is real and the schema is silent about it.

The fix is the same decomposition: give the dependency a table where its determinant is the key.

```sql
CREATE TABLE Instructors
(
    Instructor VARCHAR(100) PRIMARY KEY,
    TimeSlot   VARCHAR(50) NOT NULL
);

CREATE TABLE CourseInstructorAssignment
(
    CourseID   INT,
    Instructor VARCHAR(100),
    PRIMARY KEY (CourseID, Instructor),
    FOREIGN KEY (Instructor) REFERENCES Instructors(Instructor)
);
```

Now `Instructor → TimeSlot` is enforced by the primary key of `Instructors` rather than left to
the application to remember.

```quiz 01M19YVM9R3DT5QSKH6J37CDNT
What does BCNF forbid that 3NF permits?

- [x] A determinant that is not a candidate key of its table
  > 3NF only bars a non-key column determining another. A column can determine something and
  > still not be a key, and BCNF is the rule that closes that gap.
- [ ] A primary key made of more than one column at a time
  > Composite keys are ordinary and neither form objects to them. 2NF is the rule that has
  > anything to say about a key with parts.
- [ ] A column whose value repeats across more than one row
  > Repeated values are normal in any schema — every foreign key is one. What matters is which
  > column determines which.
- [ ] A table that carries a foreign key into another table's key
  > That is how a decomposition is put back together, and both forms depend on it rather than
  > forbidding it.
```

**3NF is the target you should say out loud in an interview**, with BCNF named as the stricter
form and the overlapping-key case as where the two differ. Reaching for BCNF on a schema whose
keys do not overlap buys nothing, and volunteering a decomposition nobody asked for costs you the
minutes you needed for the entities.

## Where to stop, and when to go back down

Normalization has a cost, and it is a specific one: facts that were in one row are now in
several tables, so reading them means joining. On a hot read path, a join the schema forces on
every query can be the thing that is slow — and the first answers are indexing rather than
schema change, which is the subject of [[clustered-and-nonclustered-indexes]] and
[[covering-indexes-and-included-columns]].

When indexing is not enough, **denormalization** is a legitimate move, and the thing that makes
it legitimate is that it is deliberate:

- **A pre-computed summary table.** Aggregations that would otherwise scan a large fact table on
  every request — revenue by region by day, say — are computed on a schedule and stored. What you
  are buying is a read that touches a small table; what you are paying is staleness, plus a job
  that has to run and be monitored.
- **A duplicated column.** Copying `DepartmentName` back onto `Enrollments` to avoid a join is
  the 3NF violation from earlier, made on purpose. The copy has to be kept in step by something
  — a trigger on the source table, or a batch job — and that something is now part of the design.
- **A semi-structured column.** Storing tags on a product as JSON rather than in a junction table
  removes a join and simplifies the write path, at the cost of how the values can be searched:
  an individual tag is not an indexed column any more, and getting an index back means adding a
  computed column or an index type suited to the data.

The interview move, when you denormalize, is three sentences and always the same three: **name
the normal form you are violating, say what read it is buying, and say how the copy is kept
consistent.** Doing that is what separates a trade-off from a schema someone never normalized.
The wrong version of this answer is a schema that is denormalized by default with no story for
either half.

## Two shapes that normalization alone does not settle

Two design problems come up in schema interviews that the ladder does not answer, because the
question is not "which dependency moves?" but "which of several correct decompositions do you
want?"

**Polymorphism.** A payment is a card payment, a PayPal payment, or a bank transfer, and each
carries different columns. Three patterns, and none of them is wrong:

- **Single-table inheritance.** One `Payments` table with the columns of every type, most of them
  `NULL` on any given row, and a discriminator column saying which type a row is. Simple, one
  table to query, and the `NULL`s mean the schema itself cannot enforce that a card payment has a
  card number.
- **Class-table inheritance.** A `Payments` base table holding the common columns, plus one table
  per type keyed to it. Each type's columns are `NOT NULL` where they should be, and every query
  that needs type-specific data joins.
- **Shared primary key.** The specialised tables use the same key values as the base table
  without a declared relationship, making the join optional. It relies on discipline that nothing
  enforces, which is the reason to prefer one of the first two.

The answer that lands is the one that names the query pattern: if most queries want one type at a
time with its own columns, the per-type tables pay for themselves; if most queries want all
payments together in one list, the single table does.

**Audit history.** Recording what a row used to be is not something normalization gives you, and
the requirement usually arrives from outside engineering — a retention or right-to-erasure rule
that has to coexist with a log of what was changed and by whom. Again three patterns:

- **Trigger-based auditing.** Every `UPDATE` and `DELETE` fires an insert into a parallel
  `_Audit` table. Complete history, at the cost of doubling the writes and of an audit table that
  grows faster than the one it shadows.
- **Temporal tables.** SQL Server's built-in system-versioning
  ([system-versioned temporal tables](https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables),
  available since SQL Server 2016; verified 2026-08-30) keeps the history table and the period
  columns for you, and queries it with `FOR SYSTEM_TIME`. Less to write and less to get wrong
  than hand-rolled triggers.
- **Soft deletes.** An `IsDeleted` flag and a `DeletedAt` timestamp, and no row is ever really
  removed. Recovery is trivial; the cost is that *every* query must filter on the flag, and the
  one that forgets is a bug that returns deleted data with no error anywhere.

## What this buys you in the room

Asked to design a schema, the sequence to narrate is short:

1. **Name the entities**, one table each, and give each one a deliberate primary key.
2. **Make the relationships tables** where they are many-to-many, with a composite key.
3. **Check each non-key column against the whole key** — anything depending on part of it moves
   out with the part it depends on.
4. **Check for a non-key column determining another** — extract it into a table where it is the
   key.
5. **Say where you would denormalize and why**, if the read pattern warrants it, along with how
   the copy stays consistent.

Steps 3 and 4 are the ones candidates skip, and they are the ones that show you can reason about
a schema rather than recall a shape you have seen before.

The one thing to go and read in full is Microsoft Learn's
[database normalization description](https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description),
which takes a single example the whole way up the ladder and is short enough to finish in one
sitting.
