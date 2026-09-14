---
id: 01M22WDNNM5945WDSWJZ73BRJH
title: Load balancing
topic:
  - system-design
---

The moment a design has more than one instance of a service, something has to decide which
instance each request goes to — and that decider is the load balancer. It is what turns "add a
box" into horizontal scale and turns a dead box into a non-event, "automatically distribut[ing]
your incoming traffic across multiple targets" and routing "only to the healthy targets"
([AWS ELB](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html)).
It is one of the [[system-design-building-blocks|building blocks]] a design round expects you to
**select and justify** rather than name, and — like every one of them — it is
[[system-design-is-graded-on-process|graded on the reasoning]]: placing a box labelled "LB"
earns nothing; defending the layer it works at, the algorithm it spreads by, and what you did
about session state is the signal. This Lesson is the four choices you defend.

## The first fork: L4 versus L7

The architectural fork inside a load balancer is the OSI layer it operates at, and it is the
first thing to say out loud. An **L4 (transport) balancer** works "at the fourth layer of the
Open Systems Interconnection (OSI) model," picking a target "using a flow hash algorithm based
on the protocol, source IP address, source port, destination IP address, destination port" (for
TCP traffic the hash also folds in the TCP sequence number) and
pinning "each individual TCP connection... to a single target for the life of the connection"
([AWS NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html)).
The decisive fact is what it does *not* do: it never reads the request. It forwards packets and
connections without decoding them, so it is fast, protocol-blind — anything over TCP/UDP/QUIC —
and cheap to run.

An **L7 (application) balancer** works "at the application layer, the seventh layer," and can
"route requests to different target groups based on the content of the application traffic" —
the host header, the URL path, the HTTP method
([AWS ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)).
To do that it has to **terminate the connection and parse the request** (and typically terminate
TLS), which is exactly what buys content routing: `/api/*` to one target group and `/images/*`
to another, host-based multi-tenancy, header rules, per-request retries. The cost is the decoded,
terminated connection — more work per request, and a box that now understands HTTP.

So the trade-off is **speed and protocol-agnosticism versus content-awareness**. Reach for L4
when you need raw throughput, a non-HTTP protocol, or static IPs, and nothing about routing
depends on what is *in* the request. Reach for L7 the instant a routing decision needs to read
the request — which, for a microservice or a multi-tenant HTTP surface, is most of the time.

```quiz 01M22WDNNN79V7QW0RVNM8JPBZ
A design puts an API gateway in front of several microservices and routes `/orders/*` to one
service and `/payments/*` to another. Which balancer does that routing demand, and why?

- [x] L7, because path-based routing requires reading the request, which means terminating and parsing it
  > Routing on a URL path is a decision about request *content*, and only an application-layer
    balancer decodes the request to see it — it terminates the connection (usually TLS too) and
    parses the HTTP to route on the path. That parse is the cost you pay for content routing.
- [ ] L4, because a flow hash over IP and port already sends each path to the right service
  > A flow hash is computed from protocol, IPs, and ports — it never sees the URL, so it cannot
    tell `/orders` from `/payments`. L4 pins a whole connection to one target blind to its content.
- [ ] Either one, because the routing rule lives in the service and not the balancer at all
  > The premise is that the *balancer* fans paths out to different services; that is content
    routing, and it is precisely the job an L4 balancer cannot do because it never reads the path.
- [ ] L4, because terminating TLS at an L7 balancer would break path-based routing entirely
  > It is the reverse: terminating TLS is what *lets* an L7 balancer read the decrypted request
    and route on its path. L4 forwards the encrypted bytes without ever decoding them.
```

## The second choice: which algorithm spreads the load

Once the layer is settled, the balancer needs a rule for *which* healthy target gets the next
request. NGINX names the common ones verbatim
([NGINX HTTP load balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)):

- **Round robin** — "requests are distributed evenly across the servers, with server weights
  taken into consideration." The default, and the right default: with roughly uniform requests
  and roughly identical servers, even distribution is what you want, and weights let a beefier
  box carry proportionally more.
- **Least connections** — "a request is sent to the server with the least number of active
  connections." This is the one to reach for when request *durations vary widely*: round robin
  counts requests, not work, so a server that drew several slow requests keeps getting more;
  least-connections tracks who is actually busy and steers away from it.
- **IP hash** — the target is "determined from the client IP address," so a given client keeps
  landing on the same server. That is stickiness by hashing — useful only if a server holds
  something for that client, and a trap otherwise (below).
- **Generic hash**, with an optional `consistent` parameter that enables "ketama consistent-hash
  load balancing." This is the [[partitioning-replication-and-consistent-hashing|consistent
  hashing]] you place data with, applied to routing: when a server is added or removed "only a
  few keys are remapped, which minimizes cache misses," so a membership change reshuffles roughly
  one server's share of clients instead of remapping nearly all of them. Reach for it when the
  target holds a per-key cache you do not want to cold-start on every scale event.

The honest line to draw in the round: *round robin* and *least connections* are the workhorse
defaults, and choosing between them is a real, defensible call about whether your request
durations are uniform; the hash algorithms exist to create stickiness on purpose, and whether
you *want* stickiness is the next question — usually the answer is no.

## The trap: session stickiness undercuts the thing you built

Here is the senior trap, and interviewers wait for it. A **sticky session** pins a client to
one backend — by IP hash, or by a cookie the L7 balancer sets — so that a server can keep
per-client state in memory between requests. It is tempting because it is the path of least
resistance: store the login session on the box, pin the user to the box, done. But stickiness
quietly undoes two things the load balancer exists to provide.

First, it **breaks even distribution**. The balancer can no longer send the next request to the
least-loaded server; it must honour the pin, so load follows however the clients happened to
hash rather than however busy the servers are. A few heavy clients pinned to one box create a
hot server the balancer is contractually forbidden from relieving.

Second, and worse, it **turns a server's death into lost sessions**. The whole point of many
backends is that one dying is a non-event — the balancer routes around it. But if a user's
session lives only in that box's memory, that box dying logs them out, drops their cart, loses
their upload. You have coupled user state to a specific machine's uptime, which is exactly the
coupling horizontal scale was supposed to remove.

The fix is not a cleverer stickiness scheme — it is to **make the service stateless** so any
algorithm works and any server can take any request. Push the session out of the box and into
somewhere shared: a [[caching-and-ttls|session store]] (Redis, a database) that every server
reads, so the state survives a server's death and the balancer is free to pick the
least-loaded target again. Stickiness then becomes a performance nicety at most (keep warming
one box's local cache), never a correctness requirement. When you *cannot* avoid a pinned
connection — a [[real-time-delivery|WebSocket]] is inherently one long-lived connection to one
server — you name that explicitly as the exception and design the reconnect and
missed-message recovery around it, rather than letting stickiness leak into your ordinary
request handling.

```quiz 01M22WDNNN8EW7EHVZS5H38ZHM
A candidate stores each user's login session in the web server's memory and pins the user there
with a sticky cookie. The interviewer asks what breaks. What is the sharpest answer?

- [x] A server's death logs out every user pinned to it, because their session lived only in that box's memory
  > Stickiness couples user state to one machine's uptime, so the box dying takes the sessions
    with it — undoing the whole point of running many backends. It also stops the balancer
    steering by load. The fix is a stateless service with the session in a shared store.
- [ ] Nothing breaks; a sticky cookie is the standard, recommended way to run a scaled web tier
  > It is a common shortcut, not a recommended target. It reintroduces exactly the
    machine-coupling horizontal scale removes, which is why the interviewer is probing it.
- [ ] Round robin stops working, so the balancer must be reconfigured to use least connections
  > The algorithm is not the problem — any algorithm is undercut by a pin. Switching to
    least-connections still cannot move a session that only exists in one server's memory.
- [ ] TLS termination fails, because a sticky cookie cannot be read without decrypting the request
  > Reading the cookie is routine for an L7 balancer and unrelated to the failure. The failure is
    that the session state is trapped on one mortal machine, cookie or not.
```

## The fourth choice: health checks and slow-start

The load balancer's promise to route "only to the healthy targets" is only as good as how it
*decides* healthy, and that machinery is load-bearing and imperfect — so name it. A balancer
marks a target down after failed probes: NGINX's passive check trips a server after `max_fails`
failures within `fail_timeout` and stops sending to it; AWS spreads nodes across Availability
Zones and even "remove[s] the IP address for the corresponding subnet from DNS" when a zone has
no healthy target
([AWS NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html)).
The health check is a poll of an endpoint *you* own, which is the one piece of this a C#
service actually writes — a cheap readiness endpoint the balancer hits, that returns 200 only
when the process can really serve:

```csharp
// The endpoint the load balancer probes. Keep it cheap and honest:
// 200 only when this instance can actually serve a request right now.
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy())
    // AddDbContextCheck needs the Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore package
    .AddDbContextCheck<OrdersDbContext>();   // report unhealthy if the DB is unreachable

app.MapHealthChecks("/healthz");             // the balancer polls this on an interval
```

The subtle failure the round is listening for is **what happens when a downed server comes
back**. A recovered instance is at nominal weight the instant it passes one health check, so the
balancer floods it with its full share of traffic — into cold caches, an empty connection pool,
a JIT that has not warmed. It buckles and fails the *next* check, and you get a server flapping
in and out of the pool. The fix is **slow-start**: NGINX Plus's `slow_start` lets a recovered
server "gradually recover its weight from 0 to its nominal value" over a window, so it eases back
into rotation and warms up before it carries full load — a feature that is
"[only available in NGINX Plus](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)",
so on open-source NGINX you ramp a recovered server back some other way (raise its weight by hand,
or hold it out until it is warm). It is the
routing cousin of easing redundant capacity across [[bulkheads-and-blast-radius|failure
domains]]: defend against the recovered box being swamped, not just against it being down.

And do not forget the balancer is itself a tier you must run and make redundant — a single load
balancer is a single point of failure that caps the very [[availability-and-the-nines|availability]]
it was added to improve, which is why real deployments run it as a redundant, multi-zone tier
rather than one box.

```quiz 01M22WDNNNX898CWNBX70VNTWF recall
An interviewer says: "You've drawn a load balancer in front of three stateless API servers.
Defend it — what layer, what algorithm, and what did you do about sessions and health?" Give
the answer you would say out loud.

> I'd run it at **L7**, because it fronts an HTTP API and I want to route on path and method to
> the right service and get per-request retries — that means terminating TLS and parsing the
> request, which is the cost I accept for content routing. If it were raw TCP throughput or a
> non-HTTP protocol I'd drop to **L4** for a flow-hash-per-connection instead.
>
> For the algorithm I'd start with **round robin** since the servers are identical, and switch
> to **least connections** if request durations vary a lot, because round robin counts requests
> not work and would keep feeding a server that drew several slow ones.
>
> On sessions: the servers are **stateless on purpose**, so I keep them that way — the session
> lives in a shared store every server can read, not in any one box's memory. That means I do
> **not** need sticky sessions, so the balancer stays free to steer by load, and a server dying
> logs nobody out. Stickiness would recouple user state to one machine's uptime, which is the
> thing running three servers was meant to remove.
>
> On health: each server exposes a cheap readiness endpoint the balancer polls, and it's pulled
> from rotation after a few failed checks. The bit I'd call out is **slow-start** — on NGINX Plus
> its `slow_start` ramps a recovered server's weight from zero rather than hitting it with full
> load into cold caches, or it just fails the next check and flaps; on open-source NGINX there's
> no `slow_start`, so I'd ease a recovered box back by hand instead. And the balancer itself is redundant across
> zones, since one of them is otherwise a single point of failure on the availability I added it
> to raise.
```

## What to take away

A load balancer is four defensible choices, not a box. **Layer:** L4 forwards connections by a
flow hash without reading them — fast, protocol-blind; L7 terminates and parses the request to
route on its content — the cost of path, host, and header routing. **Algorithm:** round robin
by default, least connections when request durations vary, and a consistent hash only when you
deliberately want stickiness to a per-key cache. **Sessions:** the stickiness trap couples user
state to one mortal machine and forbids the balancer from steering by load — the fix is a
stateless service with the session in a shared store, not a smarter pin. **Health:** the health
check is only as good as the endpoint you own, and a recovered server needs slow-start or it is
swamped the instant it returns. Lead with what each choice gives up, and the box becomes an
argument. The scan-grid companion is [[system-design-building-blocks]].

Worth reading in full: the
[NGINX HTTP load balancing guide](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)
— it is the one primary source that names every algorithm (round robin, least connections, IP
hash, and the `consistent` ketama hash) and the `slow_start` ramp in one place, with the exact
directives, so it repays reading past the interview.
