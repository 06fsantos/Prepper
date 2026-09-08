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
  that `DisableForUnsafeHttpMethods()` is a *retry* extension with no hedging counterpart.

### C# concurrency and allocation in .NET

Adopted from the `learning-csharp-concurrency` teaching workspace. Every source below was the
primary its lessons were written against.

- [How Async/Await Really Works in C# — Stephen Toub](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/)
  Primary source for the compiler-generated state machine, why a suspension is the moment of
  allocation, and the `AsyncStateMachineBox` that makes it one allocation on modern .NET. Use
  for: anything about *why* `async`/`await` allocates what it allocates. Its benchmark numbers
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
  for the one *enforced* stack-confinement rule, and [method parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters)
  for `in`/`ref`/`out`.
- [Eric Lippert: The Truth About Value Types](https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-truth-about-value-types) and [The Stack Is An Implementation Detail](https://learn.microsoft.com/en-us/archive/blogs/ericlippert/the-stack-is-an-implementation-detail-part-one)
  The correction to "structs live on the stack": the spec guarantees value *semantics*, not a
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

The sources the senior-interview path is written against — what a level *is* as a scope claim,
and what each round grades. See the research note
`content/research/what-do-senior-software-engineer-interviews-test.md` for how each claim is
chased to its owner.

- [levels.fyi: a standardized SWE level framework](https://www.levels.fyi/blog/swe-level-framework.html)
  A neutral, cross-company mapping of what each level owns. Primary for the mid→senior→staff
  scope lines: autonomy, component complexity, and the team-vs-org-wide impact radius. Use for:
  defending "senior means X" as scope rather than title.
- [progression.fyi](https://progression.fyi/about/)
  A collection of real companies' public progression frameworks / career ladders. Use for:
  seeing how much the *wording* of a level varies over a scope claim that does not, and why the
  framework travels where the title does not.

### Distributed-systems fundamentals

The theory under the system-design round — the theorems and impossibility results a senior
candidate is expected to reason from, not merely name.

- [Gilbert & Lynch, "Brewer's Conjecture and the Feasibility of Consistent, Available,
  Partition-Tolerant Web Services" (MIT)](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf)
  The primary source that turned Brewer's CAP *conjecture* into a *theorem*. Precise
  definitions of atomic consistency (linearizability), availability, and partition tolerance,
  and the impossibility proof for the asynchronous model plus the weaker partially-synchronous
  result. Use for: defending what CAP actually claims rather than the "pick two" folklore.
- [Abadi, "Consistency Tradeoffs in Modern Distributed Database System Design" (IEEE Computer,
  2012)](https://ieeexplore.ieee.org/document/6127847/)
  Introduces PACELC: CAP covers only the partition case; *else* (no partition) a system still
  trades latency against consistency, and the two branches are set independently (PA/EL, PC/EC,
  and the blends). Use for: the more complete senior framing, and classifying real datastores.
- [Vogels, "Eventually Consistent" (allthingsdistributed.com, 2007)](https://www.allthingsdistributed.com/2007/12/eventually_consistent.html)
  The vocabulary the field uses for consistency models: strong / weak / eventual, the
  inconsistency window, the client-centric variants (read-your-writes, monotonic read/write,
  causal, session), and the N/W/R quorum formula where `W + R > N` guarantees strong consistency.
  Written by the engineer who ran Amazon's storage. Use for: framing eventual consistency as a
  principled trade-off rather than degraded strong consistency, and for the quorum arithmetic.
- [Ongaro & Ousterhout, "In Search of an Understandable Consensus Algorithm" (USENIX ATC
  2014)](https://raft.github.io/raft.pdf)
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
  seek ≈ 10 ms, cross-continent round trip ≈ 150 ms. Use for: the *shape* of the latency ladder
  — memory ≪ network ≪ disk seek. The absolutes are dated (NVMe has collapsed the memory-to-disk
  gap), so carry the ratios and the method, never the nanoseconds; the ~150 ms round trip is the
  one durable rung, bounded by the speed of light rather than hardware.
- [AWS, "What is caching?"](https://aws.amazon.com/caching/)
  Vendor-neutral tour of the one component every design reaches for: the benefits (sub-millisecond
  reads, IOPS density, hot-spot relief) and the common placements (database, CDN/edge, session,
  API-response). Use for: the vocabulary a round expects you to select from, and for framing a TTL
  as the freshness-versus-speed knob rather than a default.
- [DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store" (SOSP
  2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
  The primary source for partitioning + replication in an always-available store: consistent
  hashing on a ring (with virtual nodes) for placement, a preference list of `N` replicas,
  object versioning (vector clocks) with application-level merge for reconciliation, and the
  `W + R > N` quorum dial. The blueprint under Cassandra, Riak, and DynamoDB. Use for: the
  concrete AP design the CAP/consistency theory turns into, and the section-4 architecture walk.

The five components a design round expects you to *select and justify* — load balancing, rate
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
  *taxonomy* itself is general-industry framing (**secondary**); the mechanism is first-party. Use
  for: the freshness/TTL trade-off and why invalidation is the hard part.
- [Fielding dissertation, Ch. 5 (REST)](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm), [gRPC introduction](https://grpc.io/docs/what-is-grpc/introduction/), [GraphQL introduction](https://graphql.org/learn/introduction/)
  Each is primary **for its own definition only** — the three-way *fit* comparison (ubiquity vs
  efficiency vs client-shaped fetches) has no canonical primary and is **secondary** as a
  head-to-head. Use for: defining each style precisely before comparing them.
- [Google AIP-158 (pagination)](https://google.aip.dev/158) and [Stripe API — pagination](https://docs.stripe.com/api/pagination) / [idempotent requests](https://docs.stripe.com/api/idempotent_requests)
  Primary for cursor/keyset pagination (opaque, non-user-parseable `page_token`; Stripe's
  `starting_after`/`ending_before` object-ID cursors) and the POST idempotency-key pattern. Use
  for: defending cursor over offset, and idempotency on non-idempotent methods.

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
- **.NET practitioner communities.** None adopted. `r/dotnet` and `r/ExperiencedDevs` are the
  obvious candidates for real-world failure postmortems, and neither has been judged yet.
- **The thread pool's sizing algorithm is undocumented.** Microsoft Learn's `ThreadPool` API
  reference describes behaviour at a high level and does not document hill climbing at all, so
  the only source is `dotnet/runtime` itself — implementation on a branch that moves, reached
  through a URL that does not. Every constant taken from it is a default rather than a contract,
  and a note citing it must say when it was read.
