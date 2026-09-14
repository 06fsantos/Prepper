---
id: 01M22XTPQEAXPWR2S31QM7YMQ2
topic:
  - system-design
  - http-resilience
title: API design
---

An API is a contract between a client and a server, and in a design round it is one of the
[[system-design-building-blocks|building blocks]] you are expected to *select and justify*
rather than assume. Like the [[load-balancing|load balancer]], the [[rate-limiting|rate
limiter]], the [[message-queues|queue]] and the [[content-delivery-networks|CDN]], the
contract shape is a decision with a named cost, and the round is
[[system-design-is-graded-on-process|graded on process]]: "we'll expose a REST API" earns
nothing; saying which axis you optimised and what you gave up is the signal. This Lesson is
about four such decisions — the style, how you page a list, how you version, and how you make a
write safe to retry — at the altitude where you have to defend one, not implement it.

## Three styles, each winning a different axis

There are three defaults, and each is precisely defined by the group that owns it. Define each
before you compare, because the comparison is a synthesis and the definitions are not.

**REST** is a resource-oriented style layered over HTTP: a uniform interface, stateless
interactions, and resources addressed by URL and manipulated with the HTTP methods. It is
Fielding's, from [Chapter 5 of his
dissertation](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — the one
thing worth reading in full on this subject, because most of what is called "REST" in practice
is HTTP-with-JSON and the chapter is what the word actually means.

**gRPC** lets a client "directly call a method on a server application on a different machine as
if it were a local object," using Protocol Buffers as its interface definition language and
message format ([gRPC](https://grpc.io/docs/what-is-grpc/introduction/)); it runs over HTTP/2. The
contract is a `.proto` file, and code for every language is generated from it.

**GraphQL** is a query language for an API where "a response contains exactly what a client asks
for and no more," letting a client "fetch lots of related data in one request, instead of making
several roundtrips" ([GraphQL](https://graphql.org/learn/introduction/)). One endpoint, a typed
schema, and the shape of the response is dictated by the query rather than by the server.

The **fit** between them is where the judgement lives, and it is worth being honest that no
single source owns this comparison — each project's docs describe *itself*, and the head-to-head
below is a **secondary** synthesis of those primaries, not a claim any one vendor makes. The
axis each one wins:

- **REST buys ubiquity.** Universal tooling, HTTP caching for free, human-readable, every client
  and proxy already speaks it. It is the correct default for a public surface. The cost is
  over- and under-fetching — a fixed representation is rarely the exact shape a given screen
  wants — and chatty round-trips to assemble related resources.
- **gRPC buys efficiency.** A binary payload over a multiplexed HTTP/2 connection, with
  first-class streaming, is the low-latency pick for **internal** service-to-service traffic. The
  cost is that it is not browser-native and not readable by eye, and you take on a schema and a
  codegen build step.
- **GraphQL buys client-shaped fetches.** When many different clients each need differently
  shaped data out of many resources, letting the client ask for exactly its shape kills the
  over-/under-fetching REST suffers. The cost lands on the server: caching is harder than
  HTTP-native REST, and a naive resolver invites the N+1 query problem.

Which one fits a given surface is engineering judgement, but the *reason* is structural: the
three optimise ubiquity, efficiency, and client-shaped fetching, and no design gets all three.

```quiz 01M22XTPQFXVG7GNMRM8BTQ4G5
An internal service fans a request out to six downstream services on the hot path, and latency
is the thing under scrutiny. Which style is the first reach, and why?

- [x] gRPC, for a binary payload over HTTP/2 and streaming
  > It optimises efficiency for internal service-to-service calls — the axis under scrutiny here.
- [ ] REST, for its universal tooling and HTTP caching
  > That buys ubiquity for a public surface, which an internal hot path does not need.
- [ ] GraphQL, so each caller asks for its own shape
  > That buys client-shaped fetches for diverse clients, not raw latency between two services.
- [ ] Any of them, since the style is an implementation detail
  > The style is the trade-off being graded; picking it by its axis is the whole signal.
```

## Cursor pagination beats offset at scale

A list endpoint has to return its results a page at a time, and there are two idioms. **Offset**
pagination is `LIMIT 20 OFFSET 40` — "give me page 3." It is simple and it is what most people
reach for first, and it has two failures that both get worse as the data grows. It **drifts**:
if a row is inserted or deleted between two page requests, every later page shifts by one, so the
reader sees an item twice or skips one entirely. And it **slows on deep pages**: the database
still has to walk and discard all the skipped rows, so `OFFSET 1000000` reads a million rows to
return twenty.

**Cursor** (or **keyset**) pagination fixes both by paging relative to a stable point instead of
a count. Instead of "page 3" the client says "the twenty after *this item*," where *this item* is
an opaque token the previous response handed back. Stripe's list APIs do exactly this: they "use
cursor-based pagination through the `starting_after` and `ending_before` parameters," each of
which is "an object ID that defines your place in the list"
([Stripe](https://docs.stripe.com/api/pagination)). Because the cursor names a row rather than a
count, an insert elsewhere in the list does not shift your place, and the query is an indexed
seek to the cursor rather than a scan-and-discard.

The token should be **opaque**. Google's [AIP-158](https://google.aip.dev/158) makes this a
rule: page tokens "must be opaque (but URL-safe) strings, and must not be user-parseable." The
point is freedom — if clients cannot read the token, the server can change what it encodes (a
row id today, a composite keyset tomorrow) without breaking anyone. Stripe exposes an object id
as the cursor; AIP-158 hides it entirely behind a `page_token` / `next_page_token` pair. Both
are cursor pagination; they differ only in how much of the cursor the client is allowed to see.

Following the cursor is a loop that carries the last id forward:

```csharp
string? startingAfter = null;

do
{
    var url = "/v1/charges?limit=100";
    if (startingAfter is not null)
        url += $"&starting_after={startingAfter}";

    var page = await client.GetFromJsonAsync<ChargePage>(url);

    foreach (var charge in page.Data)
        Process(charge);

    // The cursor is the id of the last row this page returned — not a page number.
    startingAfter = page.HasMore ? page.Data[^1].Id : null;
}
while (startingAfter is not null);
```

The trade you accept for it: cursor pagination gives up random access. There is no "jump to page
50," because there is no page 50 — only "the next 20 after the ones you have." For an infinite
scroll or a batch export that is no loss at all; for a UI with numbered page links it is, and
that is the one case where offset's simplicity earns its keep.

```quiz 01M22XTPQFCMBXZND3R8TQBQCK cloze
Offset pagination {{drifts}} when a row is inserted or deleted between two requests, and it
{{slows}} on deep pages because the database still walks and discards every skipped row. Cursor
pagination pages relative to an {{opaque}} token — an object id in Stripe's `starting_after` —
so the query becomes an indexed seek and an edit elsewhere does not shift your place. What you
give up is {{random access}}: there is no jump-to-page-50, only the next page after this one.
```

## Versioning keeps the contract stable while it changes

A published contract will need to change, and a change that removes a field or renames one
breaks every client written against the old shape. Versioning is how you evolve the contract
without breaking the people already on it: you run more than one version at once, move clients
across on their own schedule, and retire the old one when it is empty. The three common places to
carry the version are the **URL path** (`/v2/charges`), a **request header**, or the **media
type** in `Accept`. Which one is a matter of taste and tooling more than correctness; what
matters is that there is a version at all and that a breaking change takes a new one rather than
mutating the old.

The instinct that makes this concrete is the same one the whole round rewards: additive changes
— a new optional field, a new endpoint — are backwards-compatible and need no new version;
removing, renaming, or changing the meaning of something is breaking and does. Deciding which
kind of change you are making, before you ship it, is the discipline versioning enforces.

## Idempotency keys make a POST safe to retry

The last decision is the one that ties this Lesson to its second topic. Every resilience pattern
that re-sends a request assumes sending it twice is the same as sending it once — and for a
`POST` that creates a charge or an order, it is not. The caller
[[idempotency-and-safe-retries|cannot tell a lost response from a lost request]], so a retry
after a dropped connection can charge the card a second time even though the first attempt
succeeded. `GET`, `PUT` and `DELETE` are idempotent by
[the HTTP spec](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2); `POST` is the method that
is not, and it is also where the duplicate hurts most.

The **idempotency-key pattern** makes a non-idempotent method safe anyway, and it needs the
server's cooperation. The client mints a unique key for each *logical* operation and sends it
with the request — payment providers commonly take it in an `Idempotency-Key` header. The server
records the key with the result of the first execution; if a request arrives carrying a key it
has already seen, it returns the stored result instead of executing again
([Stripe](https://docs.stripe.com/api/idempotent_requests)). The retried charge is recognised as
the same charge and answered from the record, so the card is charged once.

```csharp
// One key per logical operation, minted BEFORE the first attempt
// and reused unchanged by every retry — not regenerated per attempt.
var idempotencyKey = Guid.NewGuid().ToString();

var request = new HttpRequestMessage(HttpMethod.Post, "/v1/charges")
{
    Content = JsonContent.Create(new { amount = 5000, currency = "usd" }),
};
request.Headers.Add("Idempotency-Key", idempotencyKey);
```

Two mistakes undo it, and both are easy. Mint the key **inside** the retry loop and every attempt
carries a fresh key, which is a plain duplicate with extra ceremony. Reuse **one** key across two
genuinely different charges and the second is swallowed as a duplicate of the first. The key must
be one-per-logical-operation: stable across the retries of a single charge, distinct across
separate charges. Nothing in HTTP or in a resilience library implements this for you — it is a
term in the API's own contract, which is why it belongs in a Lesson about designing the contract.

```quiz 01M22XTPQF1D7PP2WKA6KQYWX4
A payment API takes an `Idempotency-Key` header. A junior generates a new key with
`Guid.NewGuid()` on each retry attempt inside the retry loop. What happens on a retry after a
dropped response?

- [x] The card is charged twice, because each key looks like a new charge
  > A fresh key per attempt defeats the dedup — the server has never seen it, so it executes again.
- [ ] The retry is rejected, because the key format is invalid
  > A GUID is a fine key; the bug is that it changes per attempt, not that it is malformed.
- [ ] Nothing changes, because the server dedups on the request body
  > The server dedups on the key, not the body; the body is identical but the key is not.
- [ ] The retry succeeds safely, because a GUID is always unique
  > Uniqueness is the problem here — the key must be stable across a charge's retries, not unique.
```

## The framework to say out loud

Four decisions, each a fork with a cost, is the shape of an API-design answer:

1. **Style** — REST for a ubiquitous public surface, gRPC for internal low-latency traffic,
   GraphQL for diverse clients that each want their own shape. Name the axis, not just the box.
2. **Pagination** — cursor/keyset by default because it does not drift and does not slow on deep
   pages; offset only when the UI genuinely needs numbered pages.
3. **Versioning** — additive changes are compatible and free; breaking changes take a new
   version, carried in the path, a header, or the media type.
4. **Idempotency** — a `POST` that writes money or state gets an idempotency key so a retry after
   a dropped response is safe, which is what lets the client's resilience layer retry it at all.

None of these is a fact to recite. Each is a place where you say what you bought and what you
paid, which is the same move every other building block asks for. The companion
[[system-design-building-blocks]] Reference is the scan-grid for all five when you want them side
by side.
