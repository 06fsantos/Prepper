---
id: 01M1943TDXMGME1J0BNJGQ4Z7T
title: HttpClient — cheat sheet
topic: httpclient
---

- **The handler owns the connection pool, not the client.** Every lifetime rule follows from
  this one fact.
- `new HttpClient()` per request exhausts **TCP source ports on your own machine** — disposal
  leaves connections in `TIME-WAIT` for minutes. No retry fixes it; the exhaustion is local.
- A client kept forever is the opposite bug: connections never recycle, so **DNS changes are
  never picked up**.
- Two sanctioned shapes, and no third: a long-lived client over a `SocketsHttpHandler` with
  `PooledConnectionLifetime` set (~2 minutes), or `IHttpClientFactory`, which recycles handlers
  for you.
- Disposing a client tears down the pool **only if that client owns the handler**.
- `HttpClient.Timeout` defaults to **100 seconds** and is a *total* timeout — DNS resolution
  alone can take 15 of them.
- One timeout cannot bound both an attempt and an operation. Per-attempt and total are
  different numbers doing different jobs.
- Polly's timeout throws `TimeoutRejectedException`, **not** `System.TimeoutException` — the
  difference bites when writing a `ShouldHandle` predicate.

The reach-for-it signal: a service that passes every test and starts failing connections under
production traffic. Look at how the client is constructed before looking at the network.

Full treatment: [[httpclient-connection-lifetime]] and [[total-versus-per-attempt-timeouts]].
