---
id: 01M3EP0PS762AR6K2CFPTPT7JM
title: Securing a payment request end to end
topic:
  - application-security
  - authentication-and-authorization
prerequisites:
  - oauth-oidc-and-jwt
  - idempotency-and-safe-retries
---

"A payment request comes from the frontend to a controller, and the controller sends it on to an
external payment API. How do you secure it?" is a question fintech interviewers ask because it
has no single answer and a weak candidate gives one anyway — usually "HTTPS and a JWT". The
answer that lands treats the request as crossing **three trust boundaries** — browser → your
API, inside your service, your service → the provider — and secures each one for what can go
wrong *there*. One rule runs through all three: **the browser is untrusted, so everything it
sends is a claim, not a fact.** This Lesson gives you the controls per hop, the one reason each
exists, and a sixty-second version to say out loud before the interviewer picks a hop to dig into.

## Hop 1: the browser to your controller

Transport is the part everyone says, so say it in one breath and move on: **HTTPS only, with
HSTS**. The interesting controls are the four that follow.

**Authenticate, and know which kind of credential you chose.** The user signed in through
OIDC and the request carries either a session cookie or a bearer access token. The token is
validated the way any JWT is — signature, `iss`, `aud`, `exp` ([[oauth-oidc-and-jwt]]). The
choice between cookie and header is a security decision and not a style one, because it decides
whether the next control is needed at all.

**If the credential is a cookie, defend against CSRF.** A browser attaches a site's cookies to
every request to that site "regardless of how the request to app was generated within the
browser" ([Microsoft, prevent CSRF in ASP.NET
Core](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery)) — so a page
on another origin can make the victim's browser post a payment the victim never asked for. The
primary defence is an **antiforgery token** (the synchronizer-token pattern for a stateful app,
the *signed* double-submit cookie for a stateless one), which ASP.NET Core applies to every
unsafe method with `[AutoValidateAntiforgeryToken]`. `SameSite` cookies help, but OWASP is
explicit that SameSite "is useful as a defense-in-depth control but it does not replace a
proper CSRF defense" ([OWASP CSRF Prevention Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)).
A token sent in an `Authorization` header is not attached automatically, so it is not exposed to
CSRF — but a token a script can put in a header is a token a script can read, which moves the
risk to XSS rather than removing it.

```quiz 01M3EP0PS9E8QB05P3GSPN29XZ
The payment endpoint authenticates with a session cookie marked `HttpOnly`, `Secure` and
`SameSite=Lax`. Is it protected against CSRF?

- [x] Not fully — SameSite is defence in depth; add an antiforgery token to the POST
  > OWASP's CSRF guidance treats SameSite as a layer beneath a real defence, not a replacement —
    it is scoped to the registrable domain, so a sibling subdomain counts as same-site. A cookie
    credential still needs the synchronizer or signed double-submit token.
- [ ] Yes — `HttpOnly` stops any other site from sending the cookie with a request
  > `HttpOnly` stops *scripts* from reading the cookie, which is an XSS control. It says nothing
    about whether the browser attaches the cookie to a forged cross-site request.
- [ ] Yes — CSRF only applies to GET endpoints, and a payment is always a POST request
  > Backwards: CSRF is about state-changing requests, and a forged form can POST perfectly well.
    `Lax` blocks most cross-site POSTs, which is why it helps — but it is still not the defence.
- [ ] No — a cookie cannot be secured, so switch the endpoint to a bearer token in localStorage
  > That trades CSRF exposure for XSS exposure: any script on the page can read localStorage. A
    cookie with an antiforgery token is a sound design; it does not need replacing.
```

**Authorize the object, not just the user.** Authentication says the caller is Alice. It does
not say Alice may pay out of escrow account `4812`. The single most common API vulnerability is
exactly this gap — **broken object-level authorization**, ranked first in the [OWASP API Security
Top 10
(2023)](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/)
— which exists because the server "relies more on parameters like object IDs, that are sent from
the client to decide which objects to access". An attacker changes the ID in the request and pays
from someone else's account. The fix is a check in every action that loads a record by a
client-supplied ID: *does this user own, or have a role on, this specific record?*

**Rebuild the payment from your own data.** The browser sends *what it wants to pay for*, never
*what it costs*. The controller receives an order or invoice ID, loads the amount, currency and
payee from the database, and pays that. An amount that arrives in the request body is a price the
client chose. Money is `decimal`, never `double` ([[decimal-double-and-float]]).

```csharp
[HttpPost("orders/{orderId}/pay")]
public async Task<IActionResult> Pay(Guid orderId, [FromHeader(Name = "Idempotency-Key")] string key)
{
    var order = await _orders.FindAsync(orderId);
    if (order is null || order.OwnerId != User.FindFirstValue(ClaimTypes.NameIdentifier))
        return NotFound();                  // object-level check; 404 so IDs can't be probed

    var payment = await _payments.StartAsync(order.Id, order.Amount, order.Currency, key);
    return Accepted(new { payment.Id, payment.Status });
}
```

Two more controls finish the hop. Put **rate limiting** on the endpoint ([[rate-limiting]]) —
card-testing fraud is brute force against a payment form. And know that in the UK and EEA, a
customer-initiated online payment needs **Strong Customer Authentication**: at least two of
knowledge, possession and inherence, delivered for cards through 3-D Secure 2, with exemptions
such as low-value payments ([Stripe, SCA
guide](https://stripe.com/guides/strong-customer-authentication)). Saying "the provider's SDK runs
the 3DS challenge, and my backend reacts to the result" is the right altitude.

## Keep card data off your servers

One decision shrinks the whole problem, and saying it early marks you as someone who has shipped a
payment integration. **Don't let a card number touch your backend at all.** The provider's hosted
fields — Stripe Elements, Adyen's drop-in — are iframes served from the provider's own domain,
so the card goes browser → provider and your frontend receives a **token** that stands in for it.
That is the difference between PCI DSS **SAQ A**, where "your customers' card information never
touches your servers", and **SAQ D**, the heaviest assessment, when your integration handles raw
card data ([Stripe, PCI compliance
guide](https://stripe.com/guides/pci-compliance)). The best way to protect card data is never to
hold it.

```quiz 01M3EP0PS9BVHRN0P9DC592XXG cloze
The browser sends the controller an {{order ID}}, and the controller loads the {{amount}} from its
own database. The card itself goes straight to the provider through {{hosted fields}}, so the
backend only ever sees a {{token}} and the merchant's PCI scope stays at {{SAQ A}}.
```

## Hop 2: inside your service

**Record the intent before you call out.** Write the payment as `Pending`, with its idempotency
key, *before* the outbound call. If the process dies between the provider charging and your
database recording it, you still have a row that says a payment was started, and reconciliation
has something to reconcile against. A row written only after success is a charge you can lose.

**Secrets live in a secrets manager.** The provider's API key and webhook signing secret are
never in source control, `appsettings.json` or a container image. OWASP's guidance is to
centralise them, give each service only the secrets it needs, rotate them automatically, and audit
who read what ([OWASP Secrets Management Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)). On
AWS that is Secrets Manager behind an IAM role; on Azure, Key Vault behind a managed identity.

**Log for investigation, not for leaks.** Structured logs with a correlation ID, and nothing in
them that OWASP lists as never-log-directly: "access tokens", "database connection strings",
"bank account or payment card holder data" — these are "removed, masked, sanitized, hashed, or
encrypted" instead ([OWASP Logging Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)). Separate from
the logs, keep an **audit trail** of who initiated the payment and every status change — in a
regulated business that is the record an auditor asks for, and logs rotate.

**Never let the request choose where you call.** The provider's base URL is configuration. If
any part of an outbound URL comes from the request, the controller becomes a proxy into your own
network — server-side request forgery. OWASP's defence for a known set of external services is
to allowlist the host, "build the request yourself", and disable redirects in the HTTP client
([OWASP SSRF Prevention Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)).

## Hop 3: your service to the payment provider

**Authenticate as the service, over TLS.** TLS 1.2 or higher with certificate validation left on,
and mutual TLS if the provider offers it. The credential is the service's own — an API key or an
OAuth client-credentials token — and it never reaches the browser.

**Send the idempotency key the provider understands.** A timeout on a payment call is the worst
kind of failure because it is *ambiguous*: the charge may have happened. The provider-side
idempotency key makes the retry safe. Stripe's version "works by saving the resulting status code
and body of the first request made for any given idempotency key", replays that result to a
retry — "including `500` errors" — and errors if the retry's parameters differ from the original
([Stripe, idempotent requests](https://docs.stripe.com/api/idempotent_requests)). Generate the key
once, when the intent is recorded, and reuse it on every attempt; a fresh key per retry is two
payments. The full treatment is [[idempotency-and-safe-retries]].

**Bound the call.** A total timeout rather than only a per-attempt one
([[total-versus-per-attempt-timeouts]]), retries only on the idempotent path, and a circuit
breaker so a provider outage does not starve your thread pool ([[retry-versus-circuit-breaker]]).
When the outcome is unknown, **ask the provider** for the payment's status rather than guessing
— that is the whole of [[payment-status-polling-client]].

**Treat the synchronous response as a hint and the webhook as the truth.** The final state of a
payment — succeeded, failed, disputed — often arrives later, pushed to your webhook endpoint.
That endpoint is public, so an unverified webhook is an open door: anyone can post "payment
succeeded". Verify the signature: Stripe signs the timestamp and the **raw** body with HMAC-SHA256,
and you compare in constant time and reject timestamps outside a tolerance window (five minutes
by default) to stop replays. Events can arrive twice and out of order, so de-duplicate on the
event ID and never infer order from timestamps ([Stripe,
webhooks](https://docs.stripe.com/webhooks)). Return `2xx` fast and do the work off a queue
([[message-queues]]). Then run **reconciliation** against the provider's records, because a
webhook you never received is a payment you never booked.

```quiz 01M3EP0PS9FVSW0E3XVDB4BKWR
The call to the payment provider times out after the request was sent. What should the service
do next?

- [x] Retry with the same idempotency key, or query the payment's status before any retry
  > The timeout is ambiguous — the charge may exist. The original key makes the provider replay the
    first result instead of charging again, and a status query resolves the ambiguity outright.
- [ ] Retry with a fresh idempotency key, since the first attempt is known to have failed
  > Nothing is known to have failed; only the response was lost. A new key tells the provider this
    is a new payment, and if the first one went through the customer is charged twice.
- [ ] Mark the payment failed and ask the customer to try again from the checkout page
  > The customer may already have been charged. Telling them it failed invites a second payment
    and a support ticket — the state is *unknown*, and your model needs a state for that.
- [ ] Mark the payment succeeded, because a request that timed out usually did complete
  > "Usually" is not a ledger entry. Recording success you have not confirmed ships goods or
    releases escrow for money that may never arrive; confirm by status query or webhook.
```

## The sixty-second version

Say the frame, one line per hop, and stop — the interviewer will choose where to go deeper.

```quiz 01M3EP0PS9M62RRTRKTSE1HYMN recall
"How would you secure a payment request that goes from the frontend to a controller, which then
calls an external payment API?" Give the answer you would say out loud.

> I'd treat it as three trust boundaries, and the browser as untrusted throughout.
>
> **Browser to controller:** HTTPS with HSTS; the user authenticated through OIDC — a validated
> JWT, or a session cookie, in which case antiforgery tokens, because SameSite is only defence in
> depth. Then **object-level authorization** — this user may pay from *this* account — and the
> controller takes an order ID and loads the amount and payee itself, never trusting an amount
> from the client. Rate limiting, and SCA/3-D Secure where the regulation requires it. The card
> itself never reaches us: the provider's hosted fields tokenize it, which keeps us at PCI SAQ A.
>
> **Inside the service:** record the payment as pending with an idempotency key *before* calling
> out; secrets in a secrets manager, least privilege, rotated; structured logs with no tokens or
> card data, and a separate audit trail; the provider's URL is config, never request input.
>
> **Service to provider:** TLS — mTLS if offered — with the service's own credentials, and the same
> idempotency key on every attempt so a retry after a timeout can't double-charge. A total timeout
> and a circuit breaker. On an ambiguous timeout, query the status instead of guessing. And the
> final state comes from **signature-verified webhooks**, de-duplicated by event ID, plus
> reconciliation — the synchronous response is a hint, not the ledger.
```

## What to take away

Frame it as **three hops** and hold one rule: the browser is untrusted. On the way in:
authenticate, add **CSRF** protection if the credential is a cookie, check the caller may act on
**this object** (BOLA is the top API vulnerability), and **re-derive the amount server-side** from
an ID. Keep the card number **off your servers** with hosted fields and a token. Inside: record
the intent **before** the outbound call, keep secrets in a manager, log without secrets, and never
let the request pick the URL. On the way out: the service's own credentials over TLS, the **same
idempotency key** on every attempt, bounded time, a status query when the outcome is unknown, and
**verified webhooks plus reconciliation** as the source of truth. In a payments interview, safety
against paying twice or paying the wrong amount matters as much as safety against an attacker.

Worth reading in full: the [OWASP API Security Top 10
(2023)](https://api-security.owasp.org/editions/2023/en/0x11-t10/) — ten entries, each with an
attack scenario, and the first is the object-level check this Lesson turns on.
