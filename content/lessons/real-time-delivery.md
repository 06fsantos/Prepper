---
id: 01M22W1GTRK6NM6H2609CAKAQG
title: Real-time delivery
topic:
  - system-design
---

The "design a news feed" and "design a chat" prompts both turn on one question the interviewer
is waiting for you to notice: **how does a server get fresh data to a client that already has
the page open?** A feed has to show a new post, a chat has to show a new message, and a presence
dot has to go from grey to green — none of which the client knows to ask for, because the change
happened somewhere else. There are exactly four mechanisms the industry reaches for, and a
senior answer picks among them out loud with the trade-off named: **short polling, long polling,
Server-Sent Events, and WebSockets**. This is an applied [[system-design-building-blocks|building
block]] the same way [[caching-and-ttls|caching]] is — a component you select and defend, graded
[[system-design-is-graded-on-process|on the reasoning]], not on landing the "right" one.

Underneath all four is a single axis: **pull versus push**. In a *pull* model the client asks
and the server answers — this is ordinary HTTP, request then response, and the client has to
keep asking to find out whether anything changed. In a *push* model the server sends data to the
client without a fresh request for each message, over a connection that was opened once and held
open. Polling (short and long) is pull dressed up; SSE and WebSockets are genuine push. The
whole reason there is a choice to make is that push costs you a held-open connection per client —
state the app tier would rather not carry — and pull costs you wasted requests and latency. You
are trading one for the other.

## Short polling: ask on a timer

The client sends a normal request every few seconds — `GET /feed?since=<cursor>` — and the
server answers with whatever is new, or with nothing. It is the simplest thing that works: plain
[HTTP request semantics](https://www.rfc-editor.org/rfc/rfc9110), no special protocol, no held
connection, and it degrades gracefully through every proxy and load balancer because each poll
is just another stateless request. That is its whole appeal.

The cost is that it is **wasteful and laggy at the same time**. Most polls return nothing, so you
pay full request overhead — TLS, headers, a round trip, a database hit unless you
[[caching-and-ttls|cache]] the answer — for no new data; and a message that arrives just after a
poll waits most of the interval before the next one collects it, so your worst-case latency is
the poll period. Shortening the interval cuts the latency and multiplies the wasted load,
linearly: a million idle clients polling every two seconds is half a million requests a second of
mostly-empty answers, which is real capacity you size for in a
[[back-of-envelope-estimation|back-of-envelope]] pass. Reach for it when updates are infrequent
and a few seconds of staleness is fine — a dashboard that refreshes a count, a job-status page.

## Long polling: hold the request until there is news

Long polling keeps the pull shape but removes the waste. The client makes a request and the
server **does not answer until it has something to send** — it holds the connection open,
parks the request, and responds the instant a new message arrives (or after a timeout, so the
connection does not live forever). The client, on receiving the response, immediately opens
another long-poll request. So there is almost always one outstanding request per client, waiting.

This buys near-real-time latency without a new protocol — a message is delivered when it
happens, not on the next tick — and it still rides ordinary HTTP, so it too passes through
infrastructure that only understands request/response. What it costs is a **held-open connection
and a parked request per waiting client**, which is server state (a socket, and whatever the
framework holds to resume the request) that short polling did not carry. It is best understood
as an emulation of push over a pull channel: you get push's latency and pay part of push's
connection cost, while still paying to re-establish the request after every single message. When
updates are frequent, that reconnect churn is exactly what SSE and WebSockets remove.

```quiz 01M22W1GTSA7Q92T4N6PHA9WXZ
A client uses long polling instead of short polling for a chat. What actually changes?

- [x] The server holds each request open until a message is ready, cutting delivery latency
  > The request parks server-side and returns the instant there is news, so a message is not
    stuck waiting for the next fixed tick. The cost moves to a held-open request per client.
- [ ] The client opens one connection and the server pushes many messages down it forever
  > That describes SSE or a WebSocket. Long polling still answers one request with one response;
    the client must re-issue a fresh request after each message it receives.
- [ ] Each poll is cached at the edge, so most requests never reach the origin server
  > Caching is orthogonal — it helps *short* polling's idle answers. Long polling's gain is
    holding the request until data exists, not serving a stored copy of an empty answer.
- [ ] The protocol switches from HTTP to a persistent binary transport for lower overhead
  > Long polling is still ordinary HTTP request/response. Switching transport is what a WebSocket
    does via the Upgrade handshake; long polling deliberately avoids that to stay compatible.
```

## Server-Sent Events: one-way push over a kept-open response

Server-Sent Events (SSE) is the first genuine push option, and it is deliberately narrow:
**the server streams messages to the client, one direction only**, over a single HTTP response
that is never closed. The client opens it with the browser's built-in
[`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) API; the
server replies with `Content-Type: text/event-stream` and then writes `data:` lines as events
happen, keeping the response body open. It is defined in the
[WHATWG HTML standard](https://html.spec.whatwg.org/multipage/server-sent-events.html), so it is
a web-platform primitive, not a library.

Because it is plain HTTP with a body that keeps flowing, SSE inherits a lot for free: it runs
over the existing connection, works through most proxies, and `EventSource` **reconnects
automatically** and can resume from the last event id it saw, so a dropped connection is a
non-event the browser handles. What you give up is the return channel — the client cannot send
on the same stream; to talk back it makes an ordinary request. That asymmetry is the point:
for a feed, a notification stream, a live score, a progress bar — anything where data flows
**server-to-client** and the client only ever reads — SSE is the least machinery that does the
job. In ASP.NET Core the endpoint is just a handler that writes to the response body and flushes:

```csharp
app.MapGet("/feed/stream", async (HttpContext ctx, IFeed feed, CancellationToken ct) =>
{
    ctx.Response.Headers.ContentType = "text/event-stream";
    await foreach (Post post in feed.Watch(ct))       // yields as posts arrive
    {
        await ctx.Response.WriteAsync($"data: {post.ToJson()}\n\n", ct);
        await ctx.Response.Body.FlushAsync(ct);         // push it now, do not buffer
    }
});
```

## WebSockets: a full-duplex pipe when both sides talk

A WebSocket is the heavyweight option and the only **bidirectional** one: after an initial HTTP
request carrying an `Upgrade: websocket` header, the connection is switched off HTTP entirely
onto a persistent, full-duplex, low-overhead channel where **either side sends a message at any
time**, defined in [RFC 6455](https://www.rfc-editor.org/rfc/rfc6455). Once established, frames
carry only a few bytes of framing rather than a full set of HTTP headers, so a chatty, symmetric
conversation is far cheaper per message than re-issuing requests.

Reach for a WebSocket when the client and server **both** need to send frequently and with low
latency: a chat where you send and receive, a multiplayer game, a collaborative editor, a
trading screen. The cost is the most operational weight of the four. The connection is
long-lived and stateful, which collides with the design instinct to keep the app tier stateless
— a [[load-balancing|load balancer]] has to route by connection and often pin a client to one
server (sticky), reconnection and missed-message recovery are yours to build (RFC 6455 gives you
a pipe, not delivery guarantees), and a server now holds tens of thousands of open sockets whose
memory and file-descriptor budget you size for deliberately. Do not reach for the bidirectional
pipe when the traffic is really one-way; SSE or long polling carries a feed for a fraction of the
complexity. In ASP.NET Core you opt a request into the upgrade explicitly:

```csharp
app.Map("/chat", async (HttpContext ctx) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest) { ctx.Response.StatusCode = 400; return; }
    using WebSocket socket = await ctx.WebSockets.AcceptWebSocketAsync();  // the Upgrade
    // read frames from the client and write frames back on the same socket, both directions
});
```

```quiz 01M22W1GTSQNPG9XE45CXDF0RA cloze
The dividing line between the two push transports is direction. {{Server-Sent Events}} pushes
messages in one direction, server to client, over a kept-open HTTP response, and the browser
reconnects for you. A {{WebSocket}} upgrades off HTTP onto a {{full-duplex}} channel where either
side sends at any time — more power, and more operational weight, than a one-way feed needs.
```

## Choosing, and what the feed and chat prompts are really testing

The move is to read the traffic's shape and pick the least machinery that carries it, then say
what you gave up. Roughly: **short poll** when updates are rare and seconds of lag are fine;
**long poll** when you want low latency without a new protocol or a stateful tier; **SSE** when
data flows server-to-client and the client only reads; **WebSocket** when both sides send often.
The honest caveat is that these boundaries are engineering judgement, not sourced constants — a
feed can be built on any of the four, and shops pick differently for reasons of existing
infrastructure and team familiarity. What is *not* judgement is the direction question (one-way
versus two-way) and the pull-versus-push cost (wasted requests versus held-open connections);
those are structural, and leading with them is the senior signal.

The two canonical prompts push on exactly this:

- **Feed fan-out.** A new post has to reach every follower's open feed. The delivery transport
  (usually SSE or long polling — it is one-way) is only half of it; behind it sits the fan-out
  problem of *getting* the post to each follower's server, which is where a
  [[message-queues|message queue]] and the write-fan-out-versus-read-fan-out decision live. The
  transport is how the last hop reaches the browser; the queue is how the post got to that hop.
- **Presence and typing indicators.** "User is online" and "user is typing…" are the textbook
  case for push: the state changes on someone else's action, it is worthless a few seconds
  stale, and typing is inherently bidirectional — which is part of why chat reaches for a
  WebSocket. Presence at scale is also a reminder that a held connection is itself the signal:
  a socket that is open *is* the "online" bit, and its drop is the "offline" one, so the
  transport choice and the feature are the same decision.

A last connective point: **push does not remove the need for pull on load**. The client still
fetches the initial page and history over ordinary requests, a CDN still serves the static
shell, and none of these live streams is cacheable at the edge the way a
[[content-delivery-networks|CDN]]'s static assets are — a real-time connection deliberately
bypasses the cache because its whole job is to be uncacheably fresh. The eighth of the
[[the-eight-fallacies-of-distributed-computing|fallacies]] applies with force here too: a
held-open connection is a network resource on a network that is not reliable, so every one of
these transports has to survive the connection simply vanishing, which is why SSE's built-in
reconnect and a WebSocket's you-build-it reconnect are load-bearing rather than nice-to-haves.

```quiz 01M22W1GTSFCREY4T4G4VVW51X recall
You are asked to add a live notification stream to a web app: the server needs to push alerts to
each user as they happen, and users never send anything back on that channel. Which transport do
you propose, and what is the one-sentence justification and the main cost you name?

> I'd propose **Server-Sent Events**. The justification is that the traffic is strictly
> one-directional — server to client — so SSE is the least machinery that does the job: a single
> kept-open HTTP response the server writes events onto, using the browser's built-in
> `EventSource`, which reconnects and resumes on its own. Because it is ordinary HTTP with a
> streaming body, it passes through proxies and load balancers that a raw protocol upgrade can
> trip over, and I don't pay for a full-duplex channel the feature never uses.
>
> The cost I'd name is the **held-open connection per client**: it is push, so the app tier now
> carries a socket and some state for every connected user, which I have to size for and which
> nudges the tier away from being cleanly stateless. If the client later needed to send on the
> same channel — a chat, say — I'd move up to a **WebSocket** for the bidirectional pipe and
> accept the extra operational weight (sticky routing, self-built reconnection and missed-message
> recovery) that comes with it. I would *not* reach for that here, because paying for two-way
> when the traffic is one-way is the over-engineering the round is watching for.
```

## What to take away

Four ways a server delivers fresh data, on one axis. **Short polling** asks on a timer — simplest,
but wasteful and laggy. **Long polling** holds each request open until there is news — pull's
compatibility with push's latency, paying a parked request per client. **Server-Sent Events**
streams one-way server-to-client over a kept-open HTTP response, with automatic reconnect — the
right size for a feed or notifications. **WebSockets** upgrade off HTTP onto a full-duplex pipe
where both sides send freely — the pick for chat and collaboration, and the heaviest to operate.
Underneath: polling is **pull** and pays in wasted requests and latency; SSE and WebSockets are
**push** and pay in held-open connections. Read the traffic's direction and frequency, pick the
least machinery that carries it, and lead with the cost — that is the answer the feed and chat
prompts are grading.

Worth reading in full: [RFC 6455, The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
for the handshake and framing, and the [WHATWG HTML Server-Sent Events
section](https://html.spec.whatwg.org/multipage/server-sent-events.html) for the `text/event-stream`
format and the `EventSource` reconnect model — the two first-party specs the push half rests on.
