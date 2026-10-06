# Prepper Resources

The curated set of trusted sources the authoring skills draw on. **Author-side only:** this
file lives at the repo root, outside `content/`, because no source ever becomes a note.
Citations are written into notes as inline external links; this file is where the sources
themselves are kept and judged.

## Knowledge

- [Book: _Introduction to Algorithms_ (CLRS), 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/)
  The reference for correctness and complexity arguments. Use for: anything where a
  hand-wave about a bound needs to become a proof.
- [Book: _Designing Data-Intensive Applications_ by Martin Kleppmann](https://dataintensive.net/)
  Use for: system-design vocabulary — replication, partitioning, consistency, the actual
  tradeoffs rather than the diagram.
- [.NET API reference](https://learn.microsoft.com/en-us/dotnet/api/)
  Primary source for what a BCL collection actually guarantees. Use for: complexity and
  ordering claims about C# types, which is the interview language for this vault.
- [The NeetCode problem list](https://neetcode.io/practice)
  The problem canon. Use for: what to import, and as the on-list gate the `import` skill
  checks against — widening past it invalidates the acquisition method.
- [The NeetCode roadmap](https://neetcode.io/roadmap)
  The common coding patterns organised as a dependency graph — two pointers, sliding window,
  binary search, stacks, graph traversal, and the rest. Use for: mapping the fixed core of
  patterns a coding round reduces to, mined for a few representative problems rather than
  completed end to end.

### HttpClient and HTTP resilience in .NET

Adopted from the `learning-httpclient-dotnet` teaching workspace. Every source below was the
primary the workspace's lessons were written against.

- [.NET: HttpClient guidelines for networking](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines)
  Primary source for pooled-connection ownership, DNS staleness, and the two recommended
  lifetime-management strategies. Use for: why an `HttpClient` is configured the way it is.
- [ASP.NET Core: IHttpClientFactory and HttpClient](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests)
  Primary source for factory consumption patterns, handler pooling and lifetime, delegating
  handlers, and logging categories. Use for: `HttpClient` inside a DI container.
- [.NET: Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
  Primary source for `Microsoft.Extensions.Http.Resilience` — the standard resilience handler
  and its defaults, the standard hedging handler, and custom Polly pipelines. Use for: what
  the code actually looks like.
- [.NET API docs: HttpClient.Timeout](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.timeout)
  Primary source for the 100-second default and the caveat that DNS resolution alone can take
  15 seconds. Use for: defending a timeout number rather than asserting one.
- [Azure Architecture Center: Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)
  Use for: retry strategy selection, the idempotency precondition, why retries must not be
  stacked across call layers, and `Retry-After` hints.
- [Azure Architecture Center: Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
  Use for: the Closed/Open/Half-Open state machine, how a breaker differs from a retry, and the
  sharded-dependency pitfall.
- [Azure Architecture Center: Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
  Use for: isolating resource pools per dependency so one slow call cannot starve the rest.
- [Azure Service Bus: Queues, topics, and subscriptions](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions)
  Primary source for the Service Bus building blocks. Use for: queue (FIFO, competing consumers) vs
  topic/subscription (pub/sub, filters), and receive-and-delete (at-most-once) vs peek-lock (at-least-once).
- [Azure Service Bus: Compare messaging services](https://learn.microsoft.com/en-us/azure/service-bus-messaging/compare-messaging-services)
  Use for: the Service Bus (messages) vs Event Hubs (event streams) vs Event Grid (discrete events)
  line, and the events-vs-messages distinction; the feature table (ordering, dedup, dead-lettering, replay).
- [Azure Architecture Center: Transactional Outbox](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-out-box-cosmos)
  Use for: the dual-write problem and the outbox pattern — committing the event in the same transaction
  as the state change and relaying it, plus Service Bus duplicate detection on `MessageId`.
- [Azure Architecture Center: Saga pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)
  Use for: distributed consistency without 2PC — local transactions, compensating transactions, and the
  choreography vs orchestration fork; the command-vs-event definition.
- [Azure Architecture Center: Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
  Primary source for event sourcing. Use for: append-only event store as source of truth, rehydration,
  materialized views, snapshots, and the benefits/issues lists (audit trail, eventual consistency, no
  ad-hoc querying, event versioning, idempotent at-least-once handlers).
- [Azure Architecture Center: CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
  Use for: the command/query read-write split, single-store vs separate-store CQRS, syncing separate
  stores via the outbox, and how event sourcing pairs with CQRS (event store = write model, projections
  = read model); the when-to-use / when-not lists.
- [Martin Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
  The canonical definition ("capture all changes to an application state as a sequence of events").
  Use for: the fundamental idea, temporal queries, and the external-systems-on-replay caution.
- [RFC 7231 §4.2 — Safe and Idempotent Methods](https://www.rfc-editor.org/rfc/rfc7231#section-4.2)
  The definition everything else defers to. Use for: which HTTP methods are safe to retry, and
  why "unsafe" is a specification term rather than a judgement call.
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
  The standard for propagating trace context over HTTP. Use for: the `traceparent` format, and
  the linear parent-child assumption that parallel attempts strain.
- [Azure Monitor: Distributed trace data](https://learn.microsoft.com/en-us/azure/azure-monitor/app/distributed-trace-data)
  How Application Insights correlates telemetry through `operation_Id` and `operation_ParentId`.
  Use for: what automatic correlation does and does not do for you.
- [Google: The Tail at Scale (Dean & Barroso, 2013)](https://research.google/pubs/the-tail-at-scale/)
  The paper hedging comes from. Use for: why a p99 tail is usually one unlucky server rather
  than a systemic problem.
- [.NET API reference: Microsoft.Extensions.Http.Resilience namespace](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.http.resilience)
  The member list, and the arbiter when the prose docs and a secondary source disagree about
  what an API offers. Use for: settling whether a lever exists at all — it is what established
  that `DisableForUnsafeHttpMethods()` is a _retry_ extension with no hedging counterpart.

### C# concurrency and allocation in .NET

Adopted from the `learning-csharp-concurrency` teaching workspace. Every source below was the
primary its lessons were written against.

- [How Async/Await Really Works in C# — Stephen Toub](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/)
  Primary source for the compiler-generated state machine, why a suspension is the moment of
  allocation, and the `AsyncStateMachineBox` that makes it one allocation on modern .NET. Use
  for: anything about _why_ `async`/`await` allocates what it allocates. Its benchmark numbers
  are measurements of its own benchmark — attribute them, never assert them as current.
- [ConfigureAwait FAQ — Stephen Toub](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
  Primary source for what a suspension captures, what `ConfigureAwait(false)` does and does not
  change, and the classic sync-over-async deadlock. Use for: precise rules rather than the
  folklore that surrounds them.
- [Understanding the Whys, Whats, and Whens of ValueTask — Stephen Toub](https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/)
  Primary source for the single-await-only contract, `IValueTaskSource<T>`, and when a
  `ValueTask` actually saves an allocation. Use for: defending a return type rather than
  preferring one.
- [Asynchronous programming (C# docs) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/)
  The TAP model: composition with `Task.WhenAll`/`WhenAny` and how exceptions flow through
  composed tasks. Use for: what the language and library guarantee about composition.
- [dotnet/runtime: PortableThreadPool.HillClimbing.cs](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/PortableThreadPool.HillClimbing.cs)
  The worker-thread injection algorithm itself, with `PortableThreadPool.cs`,
  `PortableThreadPool.GateThread.cs` and `PortableThreadPool.WorkerThread.cs` for how starvation
  and thread timeout force a change. Use for: the thread pool's sizing behaviour — but see the
  gap below, because this is implementation on a moving branch and not a documented contract.
- [Fundamentals of garbage collection — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)
  Generations 0/1/2, the Large Object Heap and its 85,000-byte default, ephemeral segments, and
  what triggers a collection. Use for: why a Gen 0 allocation is cheap and a survivor is not.
- [BenchmarkDotNet documentation](https://benchmarkdotnet.org/)
  `[MemoryDiagnoser]` and what it reports. Use for: the lab half of an allocation claim — one
  method, one hypothesis, a byte count instead of a belief.
- [dotnet-trace — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-trace)
  EventPipe collection from a live process: GC, thread-pool and JIT events. Use for: the field
  half — a running process with a symptom and no hypothesis yet.

### C# language fundamentals

The primary sources the "C# fundamentals" subject — generics, equality, records/modifiers,
delegates and closures, garbage collection, and LINQ — was written against. All Microsoft
Learn unless noted.

- [Generics in the run time — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/generics-in-the-run-time)
  Primary source for the fact with no syntax to it: the JIT reifies a separate body per value
  type and shares one across all reference types. Use for: why `List<int>` never boxes, and why
  variance is reference-types-only. With [constraints on type parameters](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters)
  and [covariance and contravariance](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance).
- [Object.GetHashCode — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode)
  The binding contract in the remarks: equal objects hash equal, and the hash must not change
  while the object is a key. Use for: why a mutable key strands its dictionary entry. With
  [equality comparisons](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/expressions/equality)
  for `==` (static) versus `Equals` (virtual).
- [Records — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/records)
  Compiler-generated value equality, `ToString`, and `with`. Use for: how a record's equality
  differs from a class's and from a plain struct's reflective `ValueType.Equals`. With
  [`ref struct`](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct)
  for the one _enforced_ stack-confinement rule, and [method parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters)
  for `in`/`ref`/`out`.
- [Eric Lippert: The Truth About Value Types](https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-truth-about-value-types) and [The Stack Is An Implementation Detail](https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-stack-is-an-implementation-detail-part-one)
  The correction to "structs live on the stack": the spec guarantees value _semantics_, not a
  storage location. Use for: retiring the myth precisely rather than repeating it — `ref struct`
  is the sole place stack-confinement is a real guarantee.
- [Large Object Heap — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/large-object-heap)
  The 85,000-byte threshold, collection as part of gen 2, and no compaction by default. Use for:
  what happens to a large per-request buffer. With [implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)
  and [finalizers](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/finalizers)
  for deterministic versus GC-timed cleanup and `GC.SuppressFinalize`. (Generational
  fundamentals are already listed above under concurrency and allocation.)
- [System.Span overview — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-span) and [stackalloc](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc)
  `Span<T>` as a stack-only `ref struct`, and stack memory that is not GC-tracked. Use for: why a
  `Span` cannot cross an `await` and why `Memory<T>` exists.
- [Deferred execution and lazy evaluation — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/linq/deferred-execution-lazy-evaluation)
  A LINQ query runs when iterated, not when built. Use for: the double-enumeration trap, with
  [CA1851](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851)
  for the analyzer and [`IQueryable<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.linq.iqueryable-1)
  for the expression-tree-versus-delegate boundary where a query stops being SQL.
- [Delegates (C# programming guide) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/delegates/) and [Dissecting the local functions in C# 7 — Microsoft DevBlogs](https://devblogs.microsoft.com/premier-developer/dissecting-the-local-functions-in-c-7/)
  Multicast delegates and events, and how a captured local is hoisted into a heap display class.
  Use for: the two-allocations-when-capturing / zero-when-not cost of a closure.

### Relational databases and SQL Server

- [Database normalization description — Microsoft Learn](https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description)
  1NF, 2NF and 3NF worked on one example, with a paragraph on BCNF and 4NF. Use for:
  justifying a decomposition from the dependency it removes rather than from the rule's number.
- [SQL Server and Azure SQL index architecture and design guide — Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide)
  Clustered and nonclustered B+ tree architecture, row locators, included columns, filtered
  indexes, and the column-order guidelines. Use for: any "why did the optimiser not use my
  index" question, and for what an index costs a write.
- [SQL Server Transaction Locking and Row Versioning Guide — Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
  ACID, lock modes and granularity, escalation, the row-versioning levels, the version store in
  `tempdb`, and how a deadlock is detected and chosen. Use for: everything about two sessions
  touching the same rows.
- [SET TRANSACTION ISOLATION LEVEL (Transact-SQL) — Microsoft Learn](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-transaction-isolation-level-transact-sql)
  The exact semantics of each level and the syntax for setting it. Use for: a precise
  isolation-level definition, in preference to any prose summary of one.
- [Execution Plan Overview — Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/performance/execution-plans)
  What a plan is, estimated versus actual, and how to capture one. Use for: the vocabulary
  before reading a real plan in SSMS.
- [Statistics — Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/statistics/statistics)
  How statistics are created and updated, what a histogram holds, `DBCC SHOW_STATISTICS`, and
  the auto-update threshold. Use for: why a plan that used to be right stopped being right.
- [Monitor and Tune for Performance — Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitor-and-tune-for-performance)
  The index of SQL Server's own tooling — DMVs, Query Store, the Tuning Advisor. Use for:
  picking the right diagnostic before guessing.
- [Intelligent query processing in SQL databases — Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/performance/intelligent-query-processing)
  The 2017–2022 runtime-adaptive features — adaptive joins, memory-grant feedback, interleaved
  execution — and the compatibility level each needs. Use for: why the engine can correct a bad
  cardinality estimate without a recompile, and why an upgrade sometimes changes nothing.

### Interview levels and process

The sources the senior-interview path is written against — what a level _is_ as a scope claim,
and what each round grades. See the research note
`content/research/what-do-senior-software-engineer-interviews-test.md` for how each claim is
chased to its owner.

- [levels.fyi: a standardized SWE level framework](https://www.levels.fyi/blog/swe-level-framework.html)
  A neutral, cross-company mapping of what each level owns. Primary for the mid→senior→staff
  scope lines: autonomy, component complexity, and the team-vs-org-wide impact radius. Use for:
  defending "senior means X" as scope rather than title.
- [progression.fyi](https://progression.fyi/about/)
  A collection of real companies' public progression frameworks / career ladders. Use for:
  seeing how much the _wording_ of a level varies over a scope claim that does not, and why the
  framework travels where the title does not.

### Distributed-systems fundamentals

The theory under the system-design round — the theorems and impossibility results a senior
candidate is expected to reason from, not merely name.

- [Gilbert & Lynch, "Brewer's Conjecture and the Feasibility of Consistent, Available,
  Partition-Tolerant Web Services" (MIT)](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf)
  The primary source that turned Brewer's CAP _conjecture_ into a _theorem_. Precise
  definitions of atomic consistency (linearizability), availability, and partition tolerance,
  and the impossibility proof for the asynchronous model plus the weaker partially-synchronous
  result. Use for: defending what CAP actually claims rather than the "pick two" folklore.
- [Abadi, "Consistency Tradeoffs in Modern Distributed Database System Design" (IEEE Computer, 2012)](https://ieeexplore.ieee.org/document/6127847/)
  Introduces PACELC: CAP covers only the partition case; _else_ (no partition) a system still
  trades latency against consistency, and the two branches are set independently (PA/EL, PC/EC,
  and the blends). Use for: the more complete senior framing, and classifying real datastores.
- [Vogels, "Eventually Consistent" (allthingsdistributed.com, 2007)](https://www.allthingsdistributed.com/2007/12/eventually_consistent.html)
  The vocabulary the field uses for consistency models: strong / weak / eventual, the
  inconsistency window, the client-centric variants (read-your-writes, monotonic read/write,
  causal, session), and the N/W/R quorum formula where `W + R > N` guarantees strong consistency.
  Written by the engineer who ran Amazon's storage. Use for: framing eventual consistency as a
  principled trade-off rather than degraded strong consistency, and for the quorum arithmetic.
- [Ongaro & Ousterhout, "In Search of an Understandable Consensus Algorithm" (USENIX ATC 2014)](https://raft.github.io/raft.pdf)
  The Raft paper. Consensus decomposed into leader election, log replication, and safety;
  explicitly equivalent to Paxos in fault-tolerance and performance but designed to be
  understandable. Majority voting (`2f + 1` tolerates `f`), terms as a logical clock, the commit
  rule, and the election restriction that keeps committed entries final. Use for: explaining how
  a cluster agrees and why a consensus cluster is CP.
- [The Raft website and visualisation (raft.github.io)](https://raft.github.io/)
  Interactive animations of an election, log replication, and a partition, plus links to
  implementations. Use for: making the majority rule and leader election click faster than prose.
- [Sookocheff, "Unpacking the eight fallacies of distributed computing"](https://sookocheff.com/post/distributed-systems/unpacking-the-eight-fallacies-of-distributed-computing/)
  Secondary compilation of the eight fallacies (network reliable, latency zero, …); the list has
  no canonical primary paper — it is oral history from the Sun engineers. Takes each fallacy in
  turn and says what it breaks and how modern systems cope. Use for: the failure-mode checklist a
  design conversation runs through.

### Behavioral / leadership round

The first-party rubric for the behavioral round. Amazon is the useful exception among big-tech
companies: its evaluation framework is published rather than internal, so it is the best proxy for
the private ladders other companies grade against. See Track 5 of the research note
`content/research/what-do-senior-software-engineer-interviews-test.md`.

- [Amazon: Leadership Principles](https://www.aboutamazon.com/about-us/leadership-principles)
  Primary for the 16 Leadership Principles — the explicit framework a behavioral answer is scored
  against. Use for: the shape of what the round is measuring, and which principles carry the senior
  weight (mentorship, ownership of ambiguity, Have Backbone; Disagree and Commit).
- [Amazon jobs: interviewing at Amazon](https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon)
  Primary for the STAR structure (Situation, Task, Action, Result) as Amazon's recommended way to
  tell a story, populated with examples mapped to the principles. Use for: the answer structure a
  scorable behavioral response needs.
- [Amazon: recruiters' interview tips](https://www.aboutamazon.com/news/workplace/recruiters-offer-their-best-tips-for-interviewing-at-amazon)
  Primary for the concrete senior-relevant guidance: say "I," not "we" and be specific about your
  own contribution; quantify results; and prepare specific real stories rather than memorizing the
  principles. Use for: defending the "I"/quantify/stories-not-principles habits.

### System-design building blocks and estimation

The applied half of the design round — the components and the arithmetic — sitting on top of
the distributed-systems theory above.

- [Dean & Norvig, "Numbers Everyone Should Know" (brenocon mirror)](https://brenocon.com/dean_perf.html)
  **Secondary** mirror of Jeff Dean's latency slides: L1 ≈ 0.5 ns, main memory ≈ 100 ns, disk
  seek ≈ 10 ms, cross-continent round trip ≈ 150 ms. Use for: the _shape_ of the latency ladder
  — memory ≪ network ≪ disk seek. The absolutes are dated (NVMe has collapsed the memory-to-disk
  gap), so carry the ratios and the method, never the nanoseconds; the ~150 ms round trip is the
  one durable rung, bounded by the speed of light rather than hardware.
- [Google, "Site Reliability Engineering" — Embracing Risk](https://sre.google/sre-book/embracing-risk/) and its [availability table](https://sre.google/sre-book/availability-table/)
  First-party for the _nines_: the availability-to-downtime table (99.9% ≈ 8.8 h/year, 99.99% ≈
  53 min, 99.999% ≈ 5 min) and the error-budget framing that turns an availability target into a
  number a team spends against. Use for: the downtime budget behind an availability figure, and
  for treating a target as a negotiated requirement rather than a maximized virtue. Pair with the
  series-multiply / parallel-`1 − (1 − a)ⁿ` composition arithmetic (standard reliability math, no
  single owning paper).
- [Google, "Site Reliability Engineering" — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
  First-party for the **four golden signals** — latency (measured separately for successful vs
  failed requests), traffic, errors, saturation (a leading indicator; latency rises before a
  resource maxes out) — and for **alerting on symptoms, not causes**. Use for: what to measure when
  you cannot measure everything, and why a symptom-based page earns the interruption.
- [Google, "Site Reliability Engineering" — Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
  First-party for the **SLI / SLO / SLA** ladder: indicator (the measure) → objective (the target
  on it) → agreement (an SLO with a _consequence_; no consequence means it is only an SLO). Use
  for: the internal-SLO-tighter-than-SLA rule, why the target is never 100%, and the error-budget
  framing of the gap to perfect.
- [AWS, "What is caching?"](https://aws.amazon.com/caching/)
  Vendor-neutral tour of the one component every design reaches for: the benefits (sub-millisecond
  reads, IOPS density, hot-spot relief) and the common placements (database, CDN/edge, session,
  API-response). Use for: the vocabulary a round expects you to select from, and for framing a TTL
  as the freshness-versus-speed knob rather than a default.
- [DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store" (SOSP 2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
  The primary source for partitioning + replication in an always-available store: consistent
  hashing on a ring (with virtual nodes) for placement, a preference list of `N` replicas,
  object versioning (vector clocks) with application-level merge for reconciliation, and the
  `W + R > N` quorum dial. The blueprint under Cassandra, Riak, and DynamoDB. Use for: the
  concrete AP design the CAP/consistency theory turns into, and the section-4 architecture walk.

The five components a design round expects you to _select and justify_ — load balancing, rate
limiting, message queues, CDNs, API design — are each pinned to a first-party implementation
below rather than to interview-prep folklore. See the research note
`content/research/which-building-blocks-does-a-system-design-round-expect-you-to-select.md`.

- [AWS Elastic Load Balancing — NLB (L4) and ALB (L7) developer guides](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html)
  Primary for the L4/L7 fork in the words that own it: the NLB "functions at the fourth layer,"
  flow-hash, connection-pinned; the [ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)
  "functions at the seventh layer" and routes on content. Use for: defending L4-vs-L7 as
  speed/protocol-agnostic versus content-aware, and health checks across AZs.
- [NGINX HTTP load balancing admin guide](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/) and [rate limiting with NGINX](https://blog.nginx.org/blog/rate-limiting-nginx)
  Primary for the load-balancing algorithms named verbatim (round robin, least connections, IP
  hash, generic/`consistent` ketama hash) and `slow_start`; and for `limit_req` as the **leaky
  bucket** (default rejection is 503, overridable via `limit_req_status`). Use for: the algorithm
  list and the leaky-bucket implementation.
- [AWS API Gateway request throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
  Primary for the **token bucket** (steady `rate` + `burst` capacity) and the 429 response. Use
  for: token bucket as burst-tolerant, and the throttle response contract.
- [Cloudflare, "Counting things — a lot of different things"](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/) and [WAF rate-limiting-rules parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/)
  First-party (the counting numbers live in the engineering **blog**): the **sliding-window
  counter** — two numbers per counter, ≈0.003% wrongly limited, ≈6% rate error — and the
  distributed-limiter propagation lag. Use for: sliding-vs-fixed window and its accuracy cost.
- [RFC 6585 §4 — 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585) and [RFC 9110 §9.2.2 — idempotent methods](https://www.rfc-editor.org/rfc/rfc9110)
  The definitions everything defers to: 429 MAY carry `Retry-After`; an idempotent method has the
  same effect for N identical requests as for one (GET, HEAD, PUT, DELETE). Use for: the
  rate-limit response contract and which HTTP methods are safe to retry.
- [Apache Kafka introduction](https://kafka.apache.org/intro) and [KIP-98 / Idempotent Producer (Apache cwiki)](https://cwiki.apache.org/confluence/display/KAFKA/Idempotent+Producer)
  Primary for the **log** shape (append-only, partitioned, retained, replayable), per-partition
  ordering, and that "exactly-once" is producer-side **dedup** (PID + sequence number), not a wire
  guarantee. The main single-page docs render as a JS shell to a fetcher, so the delivery-semantics
  detail is pinned to the cwiki KIP. Use for: queue-vs-log, ordering scope, and the effectively-once
  correction.
- [RabbitMQ — consumer acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms)
  Primary for the **classic queue** delivery model: unacked deliveries are requeued (at-least-once,
  duplicates possible) and consumers must be "implemented with idempotence in mind." Use for: the
  competing-consumers side of the queue-vs-log choice.
- [AWS CloudFront — introduction](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) and [invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
  Primary for CDN mechanics: edge locations, the **pull** miss-then-fetch model, the default 24-hour
  TTL, and AWS's own recommendation of **versioned filenames over invalidation**. The push/pull
  _taxonomy_ itself is general-industry framing (**secondary**); the mechanism is first-party. Use
  for: the freshness/TTL trade-off and why invalidation is the hard part.
- [Fielding dissertation, Ch. 5 (REST)](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm), [gRPC introduction](https://grpc.io/docs/what-is-grpc/introduction/), [GraphQL introduction](https://graphql.org/learn/introduction/)
  Each is primary **for its own definition only** — the three-way _fit_ comparison (ubiquity vs
  efficiency vs client-shaped fetches) has no canonical primary and is **secondary** as a
  head-to-head. Use for: defining each style precisely before comparing them.
- [Google AIP-158 (pagination)](https://google.aip.dev/158) and [Stripe API — pagination](https://docs.stripe.com/api/pagination) / [idempotent requests](https://docs.stripe.com/api/idempotent_requests)
  Primary for cursor/keyset pagination (opaque, non-user-parseable `page_token`; Stripe's
  `starting_after`/`ending_before` object-ID cursors) and the POST idempotency-key pattern. Use
  for: defending cursor over offset, and idempotency on non-idempotent methods.
- [RFC 6455 — The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455) and [WHATWG HTML — Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) (with [MDN's `EventSource` overview](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events))
  First-party for **real-time delivery**, a gap with no pre-pinned source. RFC 6455 owns the
  WebSocket `Upgrade` handshake and full-duplex framing; the WHATWG standard owns the
  `text/event-stream` format and `EventSource`'s automatic-reconnect / last-event-id model. Use
  for: the push half of short-poll / long-poll / SSE / WebSocket, and why SSE is one-way over HTTP
  while a WebSocket switches transports. Polling itself is just [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)
  request/response; the pull-vs-push framing is general-industry (**secondary**), the two specs are primary.

### Modernizing a monolith

The migration story behind "how would you break up / modernize this monolith?" — a distinct
concern from the target patterns above, and the framing an "assist with modernizing monolith
applications while delivering business value" brief asks for.

- [Martin Fowler: StranglerFigApplication](https://martinfowler.com/bliki/StranglerFigApplication.html) and [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)
  First-party for the **strangler fig** metaphor (grow the new system around the old, route traffic
  incrementally, let the monolith shrink) and the **start-with-a-monolith** argument (you don't know
  the right service boundaries until the domain teaches them). Use for: why a big-bang rewrite fails
  and why a modular monolith can be the destination.
- [Microsoft: Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig) and [Anti-corruption Layer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
  First-party for the **routing-facade mechanism** (intercept requests, route to legacy or new) and
  the **ACL** that isolates the two models during coexistence. Use for: the concrete machinery of an
  incremental migration and the pattern pairing.
- Sam Newman, _Monolith to Microservices_ (O'Reilly)
  The decomposition playbook: extracting along **bounded contexts**, sequencing by ease/value, and
  the **database-splitting** patterns (giving each service its own data). Secondary as a book (no
  free canonical URL), primary for the decomposition-and-data guidance. Use for: where to cut and how
  to decouple the shared database.

### Microservices: the operational surface

The cross-cutting infrastructure a service split forces you to run — discovery, the edge gateway,
the mesh — behind "what do you now operate that a monolith didn't?"

- Sam Newman, _Building Microservices_ (2nd ed., O'Reilly, 2021)
  Secondary as a book (no free canonical URL), primary for the operational surface: chapters on
  service communication and on running many services cover service discovery, and it has a
  service-mesh section describing the control-plane / data-plane / sidecar shape. Use for: the
  discovery, gateway, and mesh story in the order a real system meets it.
- [Chris Richardson: microservices.io pattern catalog](https://microservices.io/patterns/service-registry.html)
  First-party pattern catalog for the discovery patterns by name: the
  [service registry](https://microservices.io/patterns/service-registry.html),
  [client-side discovery](https://microservices.io/patterns/client-side-discovery.html), and
  [server-side discovery](https://microservices.io/patterns/server-side-discovery.html). Use for:
  citing the client-side-vs-server-side split and the registry/health-check mechanics.

### Authentication and authorization

OAuth 2.0 / OIDC / JWT — the token model behind "how do the services authenticate?" in a
microservices design round.

- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
  First-party for the **authorization** half: the four roles (resource owner, client,
  authorization server, resource server) and the grant types, including client-credentials
  (§4.4) for service-to-service. Use for: the vocabulary and the "OAuth is authorization, not
  authentication" line. Pair with [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
  for the `code_verifier`/`code_challenge` binding that hardens the authorization-code flow.
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
  First-party for the **authentication** layer OAuth lacks: the **ID token** and what it means
  to prove _who_ logged in on top of OAuth. Use for: the OAuth-vs-OIDC distinction and why an
  access token is not an identity statement.
- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
  First-party for the token itself: `header.payload.signature`, the registered claims
  (`iss`/`aud`/`exp`/`nbf`), and the fact that the payload is **encoded, not encrypted**. Use for:
  validation rules and the access-vs-refresh-vs-ID distinction. Signing/keys live in the JOSE
  family ([RFC 7515 JWS](https://datatracker.ietf.org/doc/html/rfc7515),
  [RFC 7517 JWKS](https://datatracker.ietf.org/doc/html/rfc7517)).
- [Microsoft identity platform documentation](https://learn.microsoft.com/en-us/entra/identity-platform/)
  First-party for the **Azure-concrete** layer: Entra ID as the issuer, the
  [auth-code](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
  and [client-credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
  flows, [access](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens) /
  [ID](https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens) tokens,
  [scopes and permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc),
  and the on-behalf-of flow for propagating a user's identity down a call chain. Use for: what a
  senior narrates when the whiteboard says "Azure".

### Application security and payment integrations

What a "how would you secure this request?" answer draws on beyond the token model.

- [OWASP API Security Top 10 (2023)](https://api-security.owasp.org/editions/2023/en/0x11-t10/)
  Primary for API-specific vulnerabilities, each entry with attack scenarios and prevention.
  [API1: Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/)
  is the "authenticated is not allowed on this record" check. Use for: naming and ranking API
  risks.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/): specifically
  [CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
  (synchronizer vs signed double-submit, SameSite as defence in depth only),
  [SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html),
  [Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) (what never
  to log) and
  [Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).
  Use for: the defence OWASP names as primary, quoted, rather than a remembered one.
- [Microsoft — Prevent CSRF attacks in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery)
  First-party for when antiforgery applies (cookie credentials, not header tokens) and
  `[AutoValidateAntiforgeryToken]`. Use for: the .NET-concrete half of CSRF.
- [Stripe — webhooks](https://docs.stripe.com/webhooks) and
  [idempotent requests](https://docs.stripe.com/api/idempotent_requests)
  The clearest provider documentation of HMAC signature verification over the raw body,
  timestamp replay tolerance, duplicate and out-of-order events, and what an idempotency key
  replays. Use for: the outbound-call and callback half of a payment flow. (`docs.stripe.com/security/guide`
  could not be fetched from here; the PCI facts come from the guide below.)
- [Stripe — PCI compliance guide](https://stripe.com/guides/pci-compliance) and
  [SCA guide](https://stripe.com/guides/strong-customer-authentication)
  Secondary but precise: hosted fields → SAQ A vs raw card data → SAQ D; SCA's two-of-three
  elements, 3-D Secure 2 and the exemptions. The [FCA's SCA page](https://www.fca.org.uk/firms/strong-customer-authentication)
  is the UK regulator's own statement, but it is thinner. Use for: the compliance vocabulary in a
  fintech interview.

### Applied AI in insurance / reinsurance

Where AI actually fits a document-and-judgment domain, and the governance a $bn-payout system
forces. Lead with the reinsurance-specific papers; treat vendor blogs as directional.

- [_Prudential Reliability of LLMs in Reinsurance_ — arXiv 2511.08082](https://arxiv.org/html/2511.08082v1)
  The single best source: a reinsurance-specific benchmark (RAIRAB) with the numbers that turn
  hand-waving into engineering — zero-shot ~0.63 grounding / 21.4% hallucination vs RAG + logging +
  human-in-the-loop at 0.91 / 12.8% — plus the "governance not scale" thesis and the SR 11-7 /
  Solvency II framing. Use for: the eval, hallucination and governance tradeoffs.
- [ClauseLens — arXiv 2510.08429](https://arxiv.org/pdf/2510.08429)
  Constrained, interpretable ML pricing: clause-grounding plus a worst-case-tail-loss (CVaR)
  constraint so a learned pricer stays auditable under Solvency II / the EU AI Act. Use for: the
  "constrained pricing is the credible moonshot, not autonomous pricing" line.
- [LMA — 2026 AI adoption survey](https://lmalloyds.com/ai-adoption-more-than-doubles-across-the-lloyds-market-in-12-months-with-93-of-survey-respondents-building-governance-frameworks/)
  Market-wide adoption and governance figures across the Lloyd's market. Use for: calibrating the
  "adoption doubled but stays in efficiency, not decisions" opener.
- Cat-modelling frontier — [Insurance Journal](https://www.insurancejournal.com/news/national/2025/03/26/817293.htm)
  and [Moody's RMS](https://www.moodys.com/web/en/us/insights/insurance/catastrophe-modeling-for-a-resilient-future-powered-by-ai.html)
  for how Verisk / Moody's use generative AI on extreme events and post-event imagery. Use for: the
  moonshot lane, and the "plausible but physics-violating" hallucination risk that feeds pricing.

### Reinsurance domain

The business a reinsurance-backend engineer plugs into: the contract vocabulary, the placement
lifecycle, cat modelling, and cyber as the data-heavy line. Fluency-and-curiosity depth, not
actuarial depth — distilled into [[reinsurance-domain-primer]].

- [Triple-I — Background on: Reinsurance](https://www.iii.org/article/background-on-reinsurance)
  First stop for the vocabulary: cede/cedent, the capital & capacity rationale, treaty vs
  facultative, proportional vs excess of loss. Use for: getting the two axes right.
- [Munich Re — Types of Reinsurance](https://www.munichre.com/content/dam/munichre/contentlounge/website-pieces/documents/Types-of-Reinsurance.pdf/_jcr_content/renditions/original./Types-of-Reinsurance.pdf)
  (LIMA programme) with companion notes on
  [non-proportional](https://www.munichre.com/content/dam/munichre/contentlounge/website-pieces/documents/NL-Non-Proportional_30-03-2023.pdf/_jcr_content/renditions/original./NL-Non-Proportional_30-03-2023.pdf)
  and [proportional treaties](https://www.munichre.com/content/dam/munichre/contentlounge/website-pieces/documents/Proportional-Treaties-29-03-2023.pdf/_jcr_content/renditions/original./Proportional-Treaties-29-03-2023.pdf).
  First-party structure of quota share, surplus, and XoL layers. Use for: what a layer looks
  like ("limit xs retention").
- [ACORD — Global Reinsurance & Large Commercial Data Standards](https://www.acord.org/standards-architecture/acord-data-standards/Global_Reinsurance_Data_Standards)
  The message standard the placement lifecycle actually runs on (Placing / Accounting / Claims),
  plus the [Ruschlikon ePlacing guide](<https://www.acord.org/docs/default-source/ruschlikon-documents-newsletters/ruschlikon-member-resources/best-practice-guide-(eplacing).pdf>).
  Use for: why a system here is largely moving structured messages through stages.
- [Moody's RMS — Catastrophe Risk Modeling](https://www.rms.com/catastrophe-modeling) and
  [CAS — Homer & Li, "Notes on Using Property Catastrophe Model Results"](https://www.casact.org/sites/default/files/2021-02/2017_most-practical-paper_homer-li.pdf)
  The vendor cat-model concept — event catalog / hazard / vulnerability / financial — and the
  EP-curve → PML / AAL outputs an engineer passes around. Use for: how cat layers get priced.
- [CAS — David R. Clark, "Basics of Reinsurance Pricing"](https://www.casact.org/sites/default/files/old/studynotes_clark_2014.pdf)
  Experience vs exposure rating, burning cost, working layers, rate on line, reinstatements.
  Use for: the actuarial touchpoints a Fellow-actuary COO will recognise.
- [Swiss Re — Cyber reinsurance in the "new normal"](https://www.swissre.com/reinsurance/insights/cyber-reinsurance-in-the-new-normal.html)
  and [Guy Carpenter — Measuring Cyber Aggregation Risk](https://www.guycarp.com/content/dam/guycarp/en/documents/dynamic-content/Measuring%20Cyber%20Aggregation%20Risk.pdf).
  Why cyber accumulation is through shared technology rather than geography, and why it's a data
  problem. Use for: the emerging-line answer.
- [Arch Reinsurance — offering pages](https://reinsurance.archgroup.com/) —
  [property](https://reinsurance.archgroup.com/offering/property-treaty),
  [casualty](https://reinsurance.archgroup.com/offering/casualty-treaty/),
  [marine](https://reinsurance.archgroup.com/offering/marine-and-offshore-energy/).
  Arch's own named lines. Use for: placing Property Cat / Property XoL / Professional Liability /
  Marine Treaties onto the two axes before the interview.

### Continuous delivery

How a change gets from a commit to production, without depending on any one tool. These are the
sources behind "how do you ship this?" and "do you do CI/CD?".

- [Martin Fowler: Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html)
  (revised January 2024)
  The primary source for CI. It defines CI as merging into mainline at least daily, lists the
  practices (self-testing build, every push builds, fix broken builds immediately, ten-minute
  build, hide work-in-progress), and calls branch builds **semi-integration**. Use for: what CI is
  and is not, and the line where CI ends and continuous delivery begins ("release to production is
  a business decision").
- [Martin Fowler: ContinuousDelivery](https://martinfowler.com/bliki/ContinuousDelivery.html)
  Gives the four "you're doing continuous delivery when" tests and the exact distinction between
  continuous delivery and continuous deployment. Use for: telling the two Ds apart, quoted.
- [Jez Humble: continuousdelivery.com](https://continuousdelivery.com/), including its
  [principles](https://continuousdelivery.com/principles/) and
  [CI foundations](https://continuousdelivery.com/foundations/continuous-integration/) pages
  The site by the co-author of _Continuous Delivery_. It defines continuous delivery as getting
  changes into production safely, quickly and sustainably, lists the five principles, and gives the
  three-question CI test. Use for: the discipline's own definitions and the CI self-check.
- [Martin Fowler: DeploymentPipeline](https://martinfowler.com/bliki/DeploymentPipeline.html)
  Breaks the build into stages that each give more confidence at more cost in time; the first stage
  makes the binaries, gates can be automatic or manual, and the pipeline leaves an audit trail. Use
  for: why a pipeline has stages at all.
- [Jez Humble: Patterns](https://continuousdelivery.com/implementing/patterns/)
  The commit stage against the later stages, and the four practices: build packages once, deploy
  the same way to every environment, smoke-test deploys, keep environments similar. Use for: build
  once, promote the same package.
- [Jez Humble: Continuous Testing](https://continuousdelivery.com/foundations/test-automation/)
  Every change is a release candidate; push defects down to cheaper tests; run stages in parallel.
  Use for: test stages as pipeline stages rather than a testing strategy.
- [Jez Humble: Configuration Management](https://continuousdelivery.com/foundations/configuration-management/)
  Emergency fixes go through the normal release process, and every deployment can be traced back to
  what it came from. Use for: the pipeline as the only route to production, hotfixes included.
- [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/), including its pages on
  [short-lived feature branches](https://trunkbaseddevelopment.com/short-lived-feature-branches/),
  [committing straight to the trunk](https://trunkbaseddevelopment.com/committing-straight-to-the-trunk/),
  [branch for release](https://trunkbaseddevelopment.com/branch-for-release/) and
  [branch by abstraction](https://trunkbaseddevelopment.com/branch-by-abstraction/)
  The definition of trunk-based development; branches of at most two days with one owner; small
  teams committing straight to trunk; release branches cut just in time, fixed on trunk and
  cherry-picked across ("CD teams do not do release branches"); the five steps of branch by
  abstraction. Use for: what trunk-based development allows and forbids.
- [Martin Fowler: Patterns for Managing Source Code Branches](https://martinfowler.com/articles/branching-patterns.html)
  Builds every branching pattern from first principles: integration frequency, semantic conflicts,
  integration fear, release branches, and the State of DevOps finding on branch lifetimes. Use for:
  why merge pain grows with branch age.
- [Martin Fowler: BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
  Two environments and a router switch, instant rollback, missed transactions, and separating schema
  deploys from application upgrades. Use for: blue-green, and why the shared database is the hard
  part.
- [Danilo Sato: CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html) (martinfowler.com)
  Routing a small subset of users to the new version first, how to choose them, the cost of running
  several versions at once, and why a canary is not an A/B test. Use for: canary release, defined.
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/)
  Canary against a concurrent control, SLIs as canary metrics, the 5% × 20% = 1% arithmetic, one
  canary at a time, and how canarying compares with blue-green, artificial load and traffic teeing.
  Use for: canary analysis done rigorously, and shadow traffic's limits.
- [Google SRE Book: Release Engineering](https://sre.google/sre-book/release-engineering/)
  Rollouts fitted to a service's risk profile: start in one cluster and expand exponentially, or
  interleave across regions over days. Use for: staged rollouts at Google scale.
- [Kubernetes docs: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
  `Recreate` against `RollingUpdate`, max surge and max unavailable (25% defaults), and rolling a
  revision back. Use for: the concepts of rolling and recreate deploys, not the YAML.
- [Pete Hodgson: Feature Toggles (aka Feature Flags)](https://martinfowler.com/articles/feature-toggles.html)
  The four toggle categories on longevity and dynamism; toggle point, router and configuration;
  flags as inventory with a carrying cost; which flag configurations to test. Use for: separating
  deploy from release, and keeping flags under control.
- [Martin Fowler: DarkLaunching](https://martinfowler.com/bliki/DarkLaunching.html)
  Calling new back-end behaviour on real traffic without users seeing it, to measure load before
  release; why the term has drifted towards meaning a canary. Use for: dark launches, defined.
- [Danilo Sato: ParallelChange](https://martinfowler.com/bliki/ParallelChange.html) (martinfowler.com)
  Expand, migrate, contract: breaking a backward-incompatible change into three releasable phases.
  Use for: the pattern behind every zero-downtime schema change.
- [Pramod Sadalage & Martin Fowler: Evolutionary Database Design](https://martinfowler.com/articles/evodb.html)
  Migrations as version-controlled scripts, destructive against backward-compatible changes, the
  transition phase, and why reverse migrations rarely pay. Use for: schema change in a delivery
  pipeline.
- [Google SRE Workbook: On-Call](https://sre.google/workbook/on-call/)
  Detect, roll back, fix, roll forward; avoid changes that can't be rolled back; a rollback does not
  repair corrupted data. Use for: rollback versus roll-forward.
- [Google SRE Book: Production Services Best Practices](https://sre.google/sre-book/service-best-practices/)
  Roll back first and diagnose afterwards. Use for: the default response to a bad deploy, quoted.
- [Microsoft Learn: ALTER TABLE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql)
  `ALTER TABLE` takes a schema modification (Sch-M) lock; adding a `NOT NULL` column with a
  runtime-constant default is metadata-only. Use for: keeping the expand step quick on SQL Server.
- [DORA: Software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
  The current five metrics in throughput and instability groups, the finding that speed and
  stability are not a trade-off, batch size, and the pitfalls of using the metrics as targets. Use
  for: the metrics by their current names.
- [DORA: A history of DORA's software delivery metrics](https://dora.dev/insights/dora-metrics-history/)
  From the four keys to failed deployment recovery time (2023) and deployment rework rate (2024).
  Use for: why the names changed, and what "MTTR" now means.
- [DORA Quick Check](https://dora.dev/quickcheck/)
  A baseline for the metrics with no tooling. Use for: starting the improvement loop.

### Event-driven architecture

What a senior event-driven round asks once the broker has been chosen: ordering and invariants,
loss, duplicates and replay, schema evolution, tracing, and coupling between domains. Adopted
from the research note on that question. _DDIA_ ch. 11 could not be read as text, so Kleppmann
appears here through his own paper and blog.

- [Kleppmann, Beresford & Svingen: Online Event Processing (ACM Queue, 2019)](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)
  The primary source for "enforce the invariant where writes are serialised": the
  single-threaded payment executor, deterministic recovery, and the point that exactly-once
  frameworks "still exhibit at-least-once processing when interacting with external storage". Its
  "Disadvantages" section (no upper bound on processing time, no read isolation) is the case
  against EDA. Use for: Q1, Q2, Q3 and Q4. The text was extracted from the PDF by hand, so cite it
  without page numbers.
- [Martin Kleppmann: Stream processing, Event sourcing, Reactive, CEP… and making sense of it all (2015)](https://martin.kleppmann.com/2015/01/29/stream-processing-event-sourcing-reactive-cep.html)
  "The database you read from is just a cached view of the event log." Use for: the
  source-of-truth vs derived-state split that makes replay possible.
- [Martin Fowler: What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html)
  Separates event notification, event-carried state transfer, event sourcing and CQRS. Names
  the passive-aggressive command, and warns that a choreographed flow is "not explicit in any
  program text". Use for: event vs command, and the runtime-vs-schema coupling trade.
- [Confluent: Schema evolution and compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
  First-party definitions of `BACKWARD`, `FORWARD`, `FULL` and their `_TRANSITIVE` variants, which
  changes each one allows field by field, and the upgrade order for each. Use for: "who deploys
  first?", quoted.
- [Greg Young: _Versioning in an Event Sourced System_ (Leanpub, free reader)](https://leanpub.com/read/esversioning/leanpub-auto-why-cant-i-update-an-event)
  The primary source for why events are never edited, "if it is not convertible it is a new
  event", upcasting, weak schema, full vs partial reversal, and internal vs external event models.
  Use for: Q6, Q9 and Q10. It was read through a summarising fetcher, so check the wording against
  the chapter before quoting it.
- [Chris Richardson: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html),
  [Idempotent consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html)
  and [Saga](https://microservices.io/patterns/data/saga.html) (microservices.io)
  What the outbox guarantees and admits (the relay may publish twice), the `PROCESSED_MESSAGES`
  dedup table committed with the effect, and choreography vs orchestration presented as peers.
  Use for: Q5 and Q7, and the consumer half of Q2.
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
  "Producers MUST ensure that `source` + `id` is unique for each distinct event", an event as
  "a statement of fact", and `dataschema`. Use for: the dedup key as a spec requirement.
- [OpenTelemetry: Semantic conventions for messaging spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
  and [messaging attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/)
  A creation context per message, consumers that link rather than parent, and
  `messaging.message.conversation_id` as the correlation id. Still **Development** status. Use
  for: Q8, and say the status out loud.

### Observability

- [.NET: Compile-time logging source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logger-message-generator)
  and [Logging in C#](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging)
  Primary for `[LoggerMessage]` (its constraints, name-matched placeholders, dynamic level), message
  templates versus interpolation (CA2254), the level table, scopes, and redaction through
  `Microsoft.Extensions.Compliance.Redaction`. Use for: what .NET logging code actually looks like.
- [`ActivityTrackingOptions`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.activitytrackingoptions)
  and the [OTel .NET logs-correlation doc](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/logs/correlation/README.md)
  How trace ids reach a log record: through logging scopes (the host's default is
  `SpanId | TraceId | ParentId`, set in `dotnet/runtime`'s `HostingHostBuilderExtensions`), or
  stamped from `Activity.Current` by the OTel provider. Use for: the logs-to-traces join in .NET.
- [Google SRE workbook: Monitoring](https://sre.google/workbook/monitoring/)
  Structured over plain-text logs, logs for root cause and metrics for alerting, and the delay before
  logs are visible. Use for: why you alert on metrics and read logs after.
- [Google SRE workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
  Burn rate, the four scores (precision, recall, detection time, reset time), and the multiwindow,
  multi-burn-rate table (14.4 over 1 h/5 min, 6 over 6 h/30 min, 1 over 3 d/6 h). Use for: what to page
  on once an SLO exists.
- [Stripe: Canonical log lines](https://stripe.com/blog/canonical-log-lines)
  One wide line per request, and why it is cheap to query. Use for: the wide-event answer to log
  volume. It is a practitioner post, not a standard.
- [OpenTelemetry specification overview](https://opentelemetry.io/docs/specs/otel/overview/)
  and [library guidelines](https://opentelemetry.io/docs/specs/otel/library-guidelines/)
  Primary for the API/SDK split, signals, resource and baggage, and the rule that libraries depend
  on the API only and get a no-op without an SDK. Use for: what OpenTelemetry *is*, in its own words.
- [OpenTelemetry Collector docs](https://opentelemetry.io/docs/collector/), with the
  [architecture](https://opentelemetry.io/docs/collector/architecture/) page and the
  [agent](https://opentelemetry.io/docs/collector/deploy/agent/) and
  [gateway](https://opentelemetry.io/docs/collector/deploy/gateway/) deployment pages
  Receivers, processors, exporters and pipelines, plus the two deployment shapes with their own
  pros and cons lists. Use for: where backend choice, redaction and sampling live.
- [Microsoft Learn: Use OpenTelemetry with OTLP and the Aspire Dashboard](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-otlp-example)
  and the [OTel .NET OTLP exporter README](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.OpenTelemetryProtocol/README.md)
  Wiring all three signals in ASP.NET Core; `UseOtlpExporter`, its constraints and its environment
  variables. Use for: what the SDK setup actually looks like in .NET.
- [OpenTelemetry metrics API](https://opentelemetry.io/docs/specs/otel/metrics/api/),
  [SDK](https://opentelemetry.io/docs/specs/otel/metrics/sdk/) and
  [data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)
  Primary for the instrument kinds and which are additive, the 2000-series default cardinality limit
  and the `otel.metric.overflow` series, and cumulative versus delta temporality with its memory
  cost. Use for: what an instrument promises and what the SDK does with it.
- [Microsoft Learn: Creating Metrics](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)
  and the [OTel .NET metrics README](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/metrics/README.md)
  Every `Meter` instrument in C#, `IMeterFactory`, the tag-combination numbers (under 1000, histograms
  10-100 times lower), and overflow on by default since 1.10.0. Use for: instruments and cardinality in
  .NET code.
- [Prometheus: naming](https://prometheus.io/docs/practices/naming/),
  [metric types](https://prometheus.io/docs/concepts/metric_types/) and
  [when to use the Pushgateway](https://prometheus.io/docs/practices/pushing/)
  The one-series-per-label-combination caution, the four client types including Summary, and the
  costs of pushing. Use for: the Prometheus data model as a concept, not as a product to operate.
- [Prometheus: histograms and summaries](https://prometheus.io/docs/practices/histograms/)
  Where a quantile is computed, why averaging summaries' quantiles is "statistically nonsensical",
  error in φ versus error in the observed value, and the 443 ms-versus-320 ms bucket example. Use for:
  why percentiles don't aggregate, and how to choose buckets.
- [OTel .NET: customizing the metrics SDK](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/metrics/customizing-the-sdk/README.md)
  Views, `ExplicitBucketHistogramConfiguration`, `Base2ExponentialBucketHistogramConfiguration` and
  their defaults, and that a View wins over `InstrumentAdvice`. Its Exemplars section: off by
  default (`AlwaysOff`) unlike the spec, `SetExemplarFilter` since 1.9.0, and dropped tags kept on
  exemplars. Use for: histogram aggregation and exemplars in .NET.
- [OpenTelemetry: Sampling](https://opentelemetry.io/docs/concepts/sampling/), the
  [SDK spec's built-in samplers](https://opentelemetry.io/docs/specs/otel/trace/sdk/#built-in-samplers)
  and [probability sampling](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)
  When to sample and when not to, head versus tail, the default `ParentBased(root=AlwaysOn)`, and
  adjusted count. Use for: what a sampling decision is and what it costs.
- [Tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
  and [load-balancing exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md)
  Policies, the one-instance-per-trace rule, the two-tier shape, `decision_wait` / `num_traces` and
  dropping early. Use for: what running tail sampling actually involves.
- [OTel .NET: customizing the tracing SDK](https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md)
  `SetSampler`, `OTEL_TRACES_SAMPLER`, and the troubleshooting entry on spans dropped under an
  unsampled parent. Pair with Microsoft's
  [distributed tracing concepts](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts)
  for the under-100 ns cost of an unsampled `Activity`. Use for: sampling in .NET code.
- [.NET: Log sampling](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/log-sampling)
  The per-level policy table (sample Information, never Error), rule selection, the trace-based sampler,
  and the one-sampler-at-a-time limit. The `dotnet/extensions` source (`TraceBasedSampler`,
  `LogSamplingRuleSelector`) settles what the page leaves loose. Use for: thinning logs in .NET.
- [Filter processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md)
  and [probabilistic sampler processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md)
  Dropping telemetry by OTTL condition (alpha; syntax documented from v0.146.0), the orphaned-telemetry
  warning, and log sampling by trace id with priority only through an attribute. Use for: cost policy
  in the Collector.
- [Prometheus: recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
  and the [Thanos compactor](https://thanos.io/tip/components/compact.md/)
  A recording rule writes new series. Downsampling "doesn't save you any space" and exists to speed up
  long-range queries. Use for: why rollups cut cost only when raw retention is cut. Thanos stands in here
  for the concept, not as a product to operate.

## Wisdom (Communities)

- [r/cscareerquestions interview experiences](https://reddit.com/r/cscareerquestions)
  Low signal-to-noise, occasionally the only place a company's actual loop is described.
  Use for: calibrating what a given company asks, never for technique.
- [Hacker News threads on hiring](https://news.ycombinator.com/)
  Use for: dissent — the arguments against the format, which are worth having heard before
  being asked to perform in it.

## Gaps

- **From-scratch ER modelling.** Every relational source here starts from a table that already
  exists. Nothing trusted covers going from a written domain to entities, relationships and
  cardinalities — which is the first half of "design a schema from scratch" in an interview.
  Raised and unresolved by the workspace that raised it.
- **Behavioural interviewing beyond Amazon.** Amazon's Leadership Principles and STAR are now
  adopted above as genuinely first-party, but they are the exception: no other big-tech company
  publishes its behavioural rubric, so Amazon's is used as the proxy. Behavioural Problems are
  still hand-authored against the template in `PROBLEM-FORMAT.md`.
- **System-design rubrics.** Plenty of material on the systems; almost none on what a
  forty-five-minute answer is graded against.
- **Hedging and trace context.** W3C Trace Context assumes a linear parent-child hierarchy;
  parallel hedged attempts do not fit it, and neither Microsoft Learn nor Polly documents which
  way `AddStandardHedgingHandler()` propagates `traceparent`. Unresolved by the workspace that
  raised it. The honest answer in a Lesson is that this has to be verified empirically.
- **Trace context over Kafka.** W3C Trace Context is defined only for HTTP. A Kafka binding is an
  open issue labelled `revisit-later`
  ([w3c/trace-context#504](https://github.com/w3c/trace-context/issues/504)), so `traceparent` in
  a Kafka header is OpenTelemetry practice that no standard backs.
- **.NET practitioner communities.** None adopted. `r/dotnet` and `r/ExperiencedDevs` are the
  obvious candidates for real-world failure postmortems, and neither has been judged yet.
- **The thread pool's sizing algorithm is undocumented.** Microsoft Learn's `ThreadPool` API
  reference describes behaviour at a high level and does not document hill climbing at all, so
  the only source is `dotnet/runtime` itself — implementation on a branch that moves, reached
  through a URL that does not. Every constant taken from it is a default rather than a contract,
  and a note citing it must say when it was read.
