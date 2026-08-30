---
id: 01M193DZM48MB18GW0HEPVQK6E
title: Idempotency is what makes a retry safe, and the method only tells you half of it
topic:
  - http-resilience
prerequisites:
  - httpclient-connection-lifetime
---

Every resilience pattern that re-issues a request is making the same unexamined assumption:
that sending it twice is the same as sending it once. When that assumption holds, a retry is
free insurance. When it does not, the retry is the outage.

The failure is worth walking through slowly, because it is not a bug in anybody's code. You
`POST` a charge for $50. The server receives it, charges the card, and begins writing the
response. The connection drops on the way back. Your client sees a timeout — which is
indistinguishable, from where it stands, from the request never having arrived — and the retry
strategy does exactly what it was configured to do. The card is now charged $100, and every
component behaved correctly.

**The caller cannot tell a lost response from a lost request.** That asymmetry is the whole
subject. No amount of client-side cleverness closes it, so the question is never "did it
succeed?" but "what happens if I ask again?"

## Idempotent means the *outcome* repeats, not the response

An operation is **idempotent** if performing it twice leaves the system in the same state as
performing it once. Note that this is a claim about state, not about what comes back on the
wire. `DELETE /orders/123` may answer `204` the first time and `404` the second — two different
responses, one outcome: the order is gone. That is still idempotent.

HTTP names two properties, and conflating them is the most common mistake here.
[RFC 7231 §4.2](https://www.rfc-editor.org/rfc/rfc7231#section-4.2) is short, precise, and the
one thing to go and read in full on this subject:

- **Safe** — `GET`, `HEAD`, `OPTIONS`, `TRACE`. The method is read-only by definition; the
  request is not intended to change anything on the server.
- **Idempotent** — `PUT` and `DELETE`, plus every safe method. These *do* change state, but
  the change does not accumulate. Deleting a deleted order deletes nothing further.
- **Neither** — `POST`. Each call is a fresh act, so two calls are two acts: two orders, two
  charges, two emails.

Safe implies idempotent; idempotent does not imply safe. That is the sentence to have ready,
because the interesting methods live in the gap between them.

`PATCH` is not in RFC 7231's lists at all, and its idempotency genuinely depends on what you
send. `PATCH /orders/123 {"status": "shipped"}` sets a field to a value and repeating it is
harmless. `PATCH /balances/123 {"delta": -50}` applies an increment, and repeating it takes
another $50. The method does not tell you which one you wrote, so `PATCH` is best treated as
not retryable unless you know the patch document is a set rather than an increment.

```quiz 01M193DZM5KBGY54CY3Q30VA7E cloze
RFC 7231 calls a method {{safe}} when it is not intended to change server state at all, and
{{idempotent}} when repeating it leaves the same state as performing it once. The second
category is the larger one: it adds {{PUT}} and {{DELETE}} to the four read-only methods.
`POST` is in neither.
```

## Safe and idempotent are properties of the *server*, not of the verb

The specification says what a method means. It cannot make a particular server honour it, and
this is where a table of verbs stops being enough.

A `DELETE` handler that decrements a counter on every call is idempotent on paper and
destructive in practice. A `GET` that writes an audit row or increments a view count is not
safe in any operational sense, whatever RFC 7231 says about intent. And a `PUT` that generates
a fresh server-side identifier each time is a `POST` wearing a `PUT`'s clothes. So the method
is a **default and a starting point**: it tells you what the server has promised, and you still
have to know whether it keeps the promise.

The practical version of the rule: retry on the method by default, and downgrade to "do not
retry" the moment you have any evidence about the specific endpoint that contradicts it.

## .NET retries everything unless you say otherwise

`AddStandardResilienceHandler()` retries **every** HTTP method by default — which is the wrong
default for anything that writes, and it is the default precisely because the library cannot
know which of your calls are safe. Excluding the unsafe methods is one explicit call on the
retry options:

```csharp
builder.Services
    .AddHttpClient<OrderClient>(c =>
        c.BaseAddress = new Uri("https://api.example.com"))
    .AddStandardResilienceHandler(options =>
    {
        // Leaves GET, HEAD, OPTIONS and TRACE retryable.
        options.Retry.DisableForUnsafeHttpMethods();
    });
```

`DisableForUnsafeHttpMethods()` disables retries for `POST`, `PUT`, `PATCH`, `DELETE` and
`CONNECT`. *API surface checked against the `Microsoft.Extensions.Http.Resilience` reference,
**2026-08-30**; the handler's own defaults are pinned to Polly **v8.7.0**, verified
**2026-08-27**, and are laid out in [[retry-versus-circuit-breaker]] rather than repeated
here.*

The list is worth reading carefully, because it is drawn on **safety**, not on idempotency.
`PUT` and `DELETE` are idempotent under RFC 7231 and are still switched off, since neither is
safe. That is a deliberately conservative line: the library excludes everything that writes,
rather than trusting each server to have implemented its idempotent methods idempotently. If
you know a particular `DELETE` is well-behaved and you want it retried, that is a decision you
make per endpoint — usually by giving it its own client — and not one the blanket switch will
make for you.

```quiz 01M193DZM6PCT66TCQHPHHVRQM
`options.Retry.DisableForUnsafeHttpMethods()` stops the standard handler retrying `DELETE`.
Why, given that RFC 7231 calls `DELETE` idempotent?

- [x] The switch is drawn on safety, and `DELETE` writes
  > It excludes every method that modifies state, idempotent or not — a deliberate floor.
- [ ] RFC 7231 lists `DELETE` as neither safe nor idempotent
  > It lists `DELETE` as idempotent. Only `POST` among the common verbs is neither.
- [ ] A repeated `DELETE` returns `404`, which counts as a failure
  > The second status differs, but the switch never inspects a response to decide.
- [ ] Idempotent methods are retried by a separate strategy instead
  > There is no second retry path. The excluded methods are simply not reissued.
```

## Making a `POST` retryable instead of merely excluded

Switching retries off for writes is the floor, not the answer. Charges, orders and bookings are
exactly the calls where a dropped response hurts most, and "fail the user and let them press the
button again" moves the duplicate risk onto a human rather than removing it.

The move is to make the operation idempotent even though the method is not, and that requires
the **server's cooperation**. The caller generates a unique key per logical operation and sends
it with the request; the server records it, and if the same key arrives again it returns the
result of the first execution rather than executing anything. Payment providers commonly expose
this under a header named `Idempotency-Key`, but the name and the semantics are that provider's
API contract — there is nothing in HTTP, and nothing in the resilience handler, that implements
it for you.

```csharp
// One key per logical operation — minted before the first attempt,
// and reused unchanged by every retry of it.
var idempotencyKey = Guid.NewGuid().ToString();

var request = new HttpRequestMessage(HttpMethod.Post, "/charges")
{
    Content = JsonContent.Create(new { amount = 5000, currency = "USD" }),
};
request.Headers.Add("Idempotency-Key", idempotencyKey);
```

Two details do all the work and both are easy to get wrong. The key must be minted **outside**
the retry loop — a key generated per attempt is a new key per attempt, which is a plain
duplicate with extra ceremony. And it must be scoped to the *logical operation*, not to the
message: two genuinely separate $50 charges must carry different keys, or the second one will
be swallowed as a duplicate of the first. The
[Azure Architecture Center's Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)
covers the caller's side of this.

Note where this leaves the standard handler. `DisableForUnsafeHttpMethods()` is a blanket
switch on a client; a `POST` you have made idempotent by agreement with the server is one you
*want* retried. That is one more reason those calls tend to get their own
`IHttpClientFactory` registration — the safety of a call is a property of the endpoint, and a
client is the smallest thing you can configure separately.

## Parallel duplicates are the same problem, sharper

Retry sends the second request only after the first has finished failing. Hedging sends it
while the first is still in flight, which means a non-idempotent operation hedged is not a
*risk* of a duplicate — it is very nearly a guarantee of one, since both attempts are typically
accepted before either could have been deduplicated by anything but an explicit key.

There is no method-based exclusion for hedging, so keeping duplicate writes off the wire is a
**routing decision rather than a handler flag**: the hedged client gets the read paths, and
writes go through a client that does not hedge. That argument, and what the delay costs when it
is set wrong, is [[hedging-against-tail-latency|hedging's own subject]].

```quiz 01M193DZM6K9BSDQXVA7SW4A1H recall
You are writing a client for a payment API. Charges are `POST /charges`, and the provider
documents support for an idempotency key. Three options are on the table: never retry a charge
and surface the failure; retry with the key attached; or hedge charges with the key attached.
Argue for one.

> Retry with the key. The key is what converts a non-idempotent operation into one the server
> treats as idempotent: the second attempt is recognised as the same logical charge and returns
> the first result rather than charging again. That removes the duplicate risk while keeping
> the property you wanted from retry, which is surviving a dropped response on a call that had
> already succeeded.
>
> Never retrying is safe and expensive. It converts every lost response into a user-visible
> failure on the operation the user cares about most, and pushes the retry onto the customer —
> who will press the button again, without a key, and produce exactly the duplicate you were
> avoiding.
>
> Hedging is wrong here even with the key. It buys latency, and a charge is not a call whose
> p99 anyone is optimising; it spends a second charge attempt on every slow request; and it
> leans on the provider's deduplication for correctness under genuine concurrency rather than
> for recovery after a failure. A key is a safety net for a retry, not a licence to race two
> writes.
```

## The framework to say out loud

When someone asks whether a call can be retried, four questions settle it in order, and the
first one that answers "no" is the answer:

1. **What is the method?** `GET`, `HEAD`, `OPTIONS`, `TRACE` — retry freely. `PUT`, `DELETE` —
   idempotent by specification, so retryable if you trust this server's implementation. `POST`,
   `PATCH` — not without something more.
2. **Does the server actually honour it?** The verb is the promise; the endpoint is the fact.
3. **Is there deduplication?** An idempotency key, a client-supplied identifier, a natural
   unique constraint. Any of them makes a `POST` retryable.
4. **What does one duplicate cost?** A double charge is an incident. A duplicate welcome email
   is embarrassing. The threshold for "retry it anyway" is not the same in both cases.

That last question is the one that makes this an engineering decision rather than a lookup.
Everything above it narrows the odds of a duplicate; only the cost of a duplicate tells you
what odds are acceptable.

## What to take away

A retry is a bet that the operation can be repeated, and the HTTP method tells you what the
server *intended* rather than what it will do. Take the method as the default, verify it
against the endpoint, and where the answer is "no" either exclude the call from retries or
negotiate an idempotency key that makes the answer "yes". The wrapping this sits inside — which
strategies run in what order, and which timeout bounds which attempt — is
[[composing-a-resilience-pipeline|the composition argument]] and
[[total-versus-per-attempt-timeouts|the timeout one]].

Worth reading in full:
[RFC 7231 §4.2](https://www.rfc-editor.org/rfc/rfc7231#section-4.2) — two pages, and it is the
source every framework's method list is derived from. The .NET mapping is in
[Build resilient HTTP apps](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience).
