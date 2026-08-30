---
id: 01M1924ABTVEFCTPW32SZWDQ5N
title: HttpClient handlers and connection lifetime
topic:
  - httpclient
---

Nearly every piece of advice about [[httpclient|`HttpClient`]] — do not `new` one per request,
do not make one and keep it forever either — is a consequence of a single fact that is easy to
state and easy to forget: **an `HttpClient` does not own a connection pool. Its
`SocketsHttpHandler` does.**

The client is a thin thing. It holds a base address, default headers, and a
[[total-versus-per-attempt-timeouts|timeout]]. Everything expensive — the TCP connections, the
TLS handshakes, the DNS results — lives in the handler underneath it.

## Why `new HttpClient()` per request is the classic bug

Disposing an `HttpClient` tears down the pool only if that client owns the handler beneath it.
So the per-request create-and-dispose pattern does two bad things at once: it builds a fresh
handler, and therefore a fresh TCP connection, for every single request; and its disposal
leaves those connections in `TIME-WAIT`, where the operating system holds them for a couple of
minutes before the source port can be reused.

Under load, ports are consumed faster than they are reclaimed. The symptom is a service that
runs fine in testing and then starts throwing connection failures in production under traffic —
and no amount of retrying fixes it, because the exhaustion is on *your* side of the wire. This
is the failure that any resilience pattern layered on top will paper over rather than solve.

```quiz 01M1924ABTNQN9YFPPGFDH8K03
Creating and disposing a new `HttpClient` for every request primarily risks exhausting which
resource?

- [x] TCP source ports on the calling machine
  > Each disposal leaves a connection in `TIME-WAIT`, holding its port for minutes.
- [ ] Managed thread pool threads on the caller
  > Threads are not what a disposed handler leaks; the sockets outlive the request.
- [ ] Cached DNS entries held by the resolver
  > Fresh handlers re-resolve rather than accumulate; staleness is the opposite problem.
- [ ] Connection slots on the remote server
  > The exhaustion is local. The remote end sees ordinary connections opening and closing.
```

## Two accepted strategies, and no third

The [.NET HttpClient guidelines](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines)
sanction exactly two shapes. Both work by keeping the handler alive across requests while
still recycling it periodically.

**A long-lived client with an explicit pooled-connection lifetime.** One static or singleton
`HttpClient`, over a `SocketsHttpHandler` whose `PooledConnectionLifetime` is set to something
like two minutes. No factory, no container. What matters is only that the instance is not
created and disposed per request, because it is the thing holding the pool.

```csharp
var handler = new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(2),
};
var client = new HttpClient(handler);   // keep this for the life of the process
```

**`IHttpClientFactory`.** The factory pools `HttpMessageHandler` instances — default lifetime
two minutes — and hands out a new, cheap `HttpClient` wrapper on each `CreateClient` call,
reusing the underlying handler until it expires. The client you get back is disposable and
short-lived by design; the expensive part behind it is not.

```csharp
builder.Services.AddHttpClient<PaymentClient>(c =>
    c.BaseAddress = new Uri("https://payments.example.com"));
```

The factory is what you want as soon as you have more than one dependency, because it lets each
named or typed client carry its own configuration — and it is the seam that
[[bulkheads-and-blast-radius|per-dependency isolation]] and the resilience handlers plug into.

```quiz 01M1924ABT7ND07JHPHRCFJFKX cloze
When `IHttpClientFactory.CreateClient` is called repeatedly, what gets pooled and reused is the
{{message handler}}, not the client. The default lifetime before that pooled item is retired is
{{two minutes}}.
```

## Why the handler has to expire at all

If reusing a handler is good, keeping one forever should be better. It is not, and the reason
is DNS.

`HttpClient` resolves a name once per connection, not once per request, and it does not honour
record TTLs. A pool that never recycles keeps talking to whichever IP it resolved at startup.
When a dependency fails over, scales, or has its load balancer swapped underneath it, your
service keeps dialling an address that is no longer serving — indefinitely, and with no error
that points at the cause.

`PooledConnectionLifetime` and the factory's handler lifetime exist for exactly this. They are
not optimisations. They are the mechanism that forces the process to re-ask a question whose
answer it has no other way of knowing has changed.

That framing is worth holding on to, because it recurs. A circuit breaker's half-open probe and
[[retry-versus-circuit-breaker|a retry's backoff]] are the same move: periodically re-test
whether an assumption about a dependency's reachability still holds, because nothing will send
you a notification when it stops.

```quiz 01M1924ABTSN599JA59Z9W70WC recall
A colleague argues that since connection reuse is the goal, `PooledConnectionLifetime` should be
set to `Timeout.InfiniteTimeSpan`. What breaks?

> DNS. A connection resolves its name once and then holds it. With no lifetime, the pool never
> recycles, so the process keeps using the IP address it resolved at startup — through a
> failover, a scale event, or a load-balancer swap — with no mechanism to ever learn the address
> changed. Recycling is what forces a fresh resolution.
```

## What to take away

The rule that is actually worth memorising is not "use `IHttpClientFactory`". It is: **the
handler is the expensive, stateful thing; keep it, and expire it on a schedule.** Both
sanctioned strategies are that sentence with different plumbing, and once you can say it, the
usual interview follow-up — *why two minutes, why not forever* — answers itself.

Worth reading in full: the
[.NET HttpClient guidelines for networking](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines).
It is short, and it is the source every other article on this is paraphrasing.
