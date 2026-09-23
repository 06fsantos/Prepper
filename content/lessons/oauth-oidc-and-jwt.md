---
id: 01M37Z75G321BFN9H7HPA3CHPN
title: OAuth 2.0, OpenID Connect, and JWT
topic:
  - authentication-and-authorization
---

"REST and message-based service-oriented architecture" is a brief describing services that call
each other over the wire, and the moment you draw that on a whiteboard an interviewer asks the
quiet question: *how does a request prove who it is and what it may do, across a fleet of
services, without any of them holding the user's password?* The industry settled on one answer —
a **token model**, where a trusted issuer authenticates a caller once and hands back a signed
token that every service can validate on its own. This Lesson gives you the three names that
model goes by and the vocabulary to place them in a design answer: **OAuth 2.0** for delegated
authorization, **OpenID Connect** for authentication on top of it, and the **JWT** as the token
both mint. The bar here is to *place* auth in a system-design answer and defend the choices — not
to implement an identity provider.

## Authorization versus authentication — and the four roles

The single most common mix-up, and a fast down-level tell, is treating OAuth and OIDC as the
same thing. They are not, and the split is exactly [[authentication-and-authorization|the two
questions]]:

- **OAuth 2.0 is an *authorization* framework.** Its whole job is to let a **client** obtain
  *limited* access to a resource **on behalf of** a user, without the client ever seeing that
  user's credentials ([RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)). It answers
  *"what may this client do?"* — it does **not**, by itself, reliably tell you *who the user is*.
- **OpenID Connect (OIDC) is a thin *authentication* layer on top of OAuth 2.0.** It exists
  precisely because people were abusing OAuth access tokens as proof of identity — a token that
  grants access is not a statement about who logged in. OIDC adds a standard **ID token** and a
  userinfo endpoint, answering *"who is the user?"*
  ([OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)).

Four roles carry the whole model, and naming them is half of sounding fluent:

- **Resource owner** — the user who owns the data and can grant access to it.
- **Client** — the application that wants access (a SPA, a mobile app, a backend service).
- **Authorization server** — the **token issuer**; it authenticates the resource owner and mints
  tokens. This is the identity provider — Entra ID, Auth0, Okta.
- **Resource server** — the API holding the protected data, which **validates** the token and
  enforces what it permits.

The clarifying sentence: *the authorization server issues tokens, the resource server trusts
them, the client carries them, and the resource owner is who they are about.*

```quiz 01M37Z75G3PG8XKTWFMXSTKJPE
A colleague says "we use OAuth, so we already know which user is signed in from the access
token." What is the sharpest correction?

- [x] OAuth authorizes access and its access token is not proof of identity — you need OpenID Connect's ID token to establish who the user is
  > OAuth 2.0 is an authorization framework; an access token says what the bearer may do, not who
    they are. OIDC layers authentication on top and issues an ID token for exactly this — reading
    identity off an access token is the misuse OIDC was created to fix.
- [ ] Correct — the access token always contains the user's verified name and email as standard claims
  > An access token is for the resource server and its claims are not a defined identity contract;
    they can even be opaque. Identity is the ID token's job, not the access token's.
- [ ] Correct, as long as the access token is a JWT rather than an opaque reference token
  > The token's *format* is orthogonal. A readable JWT access token still is not an authentication
    statement about the user — that is a role, not an encoding, and the role belongs to the ID token.
- [ ] Only true for the client-credentials grant, where the token identifies the signed-in user
  > Backwards: client credentials has *no* user at all — the service is authenticating as itself,
    so there is no signed-in identity in that token to read.
```

## The two grants that matter: authorization code + PKCE, and client credentials

A **grant** (or flow) is *how a client gets a token*. OAuth defines several; a senior needs two
cold, because they are the two shapes an interview actually contains.

**Authorization code + PKCE — the user-facing flow.** When a human is present (web app, SPA,
mobile), the client redirects the browser to the authorization server, the user authenticates
and consents there, and the server redirects back with a short-lived, single-use
**authorization code**. The client then exchanges that code at the **token endpoint** for the
actual tokens. The code round-trip means the tokens never travel through the browser's address
bar or history. **PKCE** ([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)) closes the
remaining hole — a stolen authorization code — by binding the code to the client that began the
flow: the client generates a random `code_verifier`, sends only its SHA-256 hash
(`code_challenge`) when it asks for the code, and presents the raw verifier when it redeems the
code. An attacker who intercepts the code cannot redeem it without the verifier. PKCE was born
for **public clients** that cannot keep a secret (mobile apps, SPAs), and is now recommended for
*all* clients; the old **implicit flow** that returned tokens straight to the browser is
**deprecated**.

**Client credentials — the service-to-service flow.** When there is **no user** — a batch job, a
pricing engine, one reinsurance backend service calling another's API — the client authenticates
**as itself** with a client id plus a **secret or (better) a certificate**, and receives an
access token for its *own* identity
([Microsoft: client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)).
There is no redirect, no consent screen, no refresh token — nothing to prompt. Permissions come
from **application roles / app-only scopes** granted to that service, not from a user's delegated
consent. This is the grant behind almost every internal "how do the services authenticate each
other?" answer.

```quiz 01M37Z75G34FF21JT1E5G8QFPW cloze
When a human is present you use the {{authorization code}} grant, hardened with {{PKCE}} so an
intercepted code cannot be redeemed without the matching `code_verifier`. When one service calls
another with no user in the loop, you use the {{client credentials}} grant, where the service
authenticates as itself with a secret or certificate and its permissions come from app
{{roles}} rather than a user's delegated consent.
```

## JWT: what is in the token and why you can trust it

A **JSON Web Token** ([RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)) is a compact,
URL-safe, **self-contained** token: three Base64URL segments joined by dots —
`header.payload.signature`. The **header** names the signing algorithm (`alg`) and the key id
(`kid`); the **payload** is a set of **claims** (who issued it, who it is for, when it expires,
what it grants); the **signature** covers the first two parts. The critical caveat is that
Base64URL is **encoding, not encryption** — anyone can read the payload — so a JWT never carries
a secret, only claims.

Trust comes entirely from the **signature**, and validating it is more than a checkbox:

- The issuer signs `header.payload` with its **private key** (asymmetric, e.g. `RS256`/`ES256`);
  the resource server verifies with the issuer's **public key**, fetched from the issuer's
  **JWKS** endpoint (discovered via OIDC's `/.well-known/openid-configuration`) and matched by
  `kid`. Fetching by `kid` is *why* it is a lookup and not a pinned constant: **signing keys
  rotate**, and a validator that hard-codes one breaks at the next rotation.
- Signature alone is not enough. Check the registered claims: **`iss`** (issued by the issuer you
  expect), **`aud`** (this API is the intended **audience**), **`exp`** (not expired), `nbf` (not
  used early), and the **scopes/roles** the endpoint requires.
- **Never trust unsigned claims.** Reject `alg: none`, and *pin the expected algorithm* rather
  than letting the token's own header choose it — the classic JWT attack is talking a naïve
  validator into accepting an unsigned or attacker-signed token.

Expiry and rotation follow from one fact: a JWT is a **bearer token** — whoever holds it can use
it — and, being self-contained, it cannot easily be revoked mid-flight. So **access tokens are
deliberately short-lived** (minutes to about an hour): the blast radius of a leaked one is
bounded by its own `exp`. A long-lived **refresh token**, stored securely by the client, buys a
fresh access token without re-prompting the user, and *unlike* the access token it lives at the
authorization server and **can be revoked**. That gives three token types, and confusing them is
a real interview stumble:

- **Access token** — authorizes API calls; its audience is the **resource server**.
- **ID token** — an OIDC token that proves *authentication* to the **client**; it is **not** for
  calling APIs.
- **Refresh token** — exchanged at the authorization server for new access tokens.

```quiz 01M37Z75G3GTRM4X6Y8GQF04H9
A resource server receives a JWT, checks the signature against the issuer's public key, and
accepts the request. What is the most important thing it is still missing?

- [x] It must also validate the audience, issuer, and expiry, and require the right scope — a valid signature is not authorization
  > A signature only proves the token is authentic and untampered. Without checking `aud` the API
    accepts tokens minted for a *different* API (a confused-deputy hole), and without `exp`/scope it
    honours stale or under-privileged tokens. Signature is necessary, not sufficient.
- [ ] It must decrypt the payload first, since a JWT's claims are encrypted and unreadable until then
  > A standard signed JWT is Base64URL-encoded, not encrypted — the claims are already readable.
    There is nothing to decrypt, which is also why you never put a secret in the payload.
- [ ] It should call the authorization server to confirm the token on every request before trusting it
  > Phoning home per request throws away the whole point of a self-contained token — stateless,
    local validation. You validate against the issuer's *published keys*, not a live callback.
- [ ] It should trust the algorithm named in the token header so the issuer can rotate freely
  > Letting the token pick its own algorithm is the `alg: none` / algorithm-confusion attack. You
    pin the expected algorithm; key *rotation* is handled by `kid` lookup, not by trusting `alg`.
```

## Where it sits in an Azure microservices world

On Azure the authorization server is **Microsoft Entra ID** (the service formerly called Azure
Active Directory). You **register** each client and each API in Entra; the API declares the
**scopes** it exposes for delegated (user-present) access and the **app roles** it grants for
application (service-to-service) access
([Microsoft: scopes and permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)).

The shape a senior draws: a client obtains a token from Entra — via authorization-code+PKCE for a
user or client-credentials for a service — and that **token flows inward** with the request. Each
service **validates the JWT itself** against Entra's published keys and checks `aud` plus the
required scope or role. That local validation is the architectural payoff: auth is **stateless**,
so there is no shared session store and no per-request callback to the issuer to become a
bottleneck or single point of failure — the same "self-contained token" property from the last
section, now paying for itself at scale.

Two knobs settle most follow-ups:

- **Audience (`aud`)** says *which API this token is for*; **scopes/roles** say *what the bearer
  may do there*. A service must **reject a token whose `aud` is not itself** — accepting a token
  minted for another API is the confused-deputy / token-passthrough vulnerability.
- For a **chained call** — service A, holding a *user's* token, needs to call service B as that
  user — you do not replay A's token at B (wrong audience). Entra's **on-behalf-of** flow
  exchanges the incoming token for a new one scoped to B, so the user's identity propagates
  without any service reusing a token issued for someone else.

```quiz 01M37Z75G3NF52KG06EGYYD7KH recall
An interviewer says: "You have a set of ASP.NET services on Azure behind a gateway. Walk me
through how a request authenticates and how one service calls another." Give the answer you would
say out loud.

> The identity provider is **Entra ID** — every client and every API is registered there. A
> user-facing client signs the user in with **authorization code + PKCE** and gets an **access
> token** (a JWT); a background service with no user uses **client credentials** and gets a
> token for its own identity. The token rides with the request.
>
> Each service **validates the JWT locally** — signature against Entra's published keys, fetched
> by `kid` from the JWKS endpoint so key rotation just works — and then checks `iss`, `exp`, that
> the **`aud` is this service**, and that the required **scope or app role** is present. It's
> **stateless**: no session store, no callback to Entra per request, which is what lets it scale
> across many services.
>
> For one service calling another *as the user*, I wouldn't replay the incoming token — its
> audience is wrong. I'd use the **on-behalf-of** flow to exchange it for a token scoped to the
> downstream API, so the user's identity propagates safely. Between two services with no user, it's
> plain client credentials with an app role.
>
> And access tokens are **short-lived** on purpose — they're bearer tokens I can't easily revoke —
> with a **refresh token** at the authorization server, which *can* be revoked, to get new ones.
```

## What to take away

Auth in a design round is a token model with three names. **OAuth 2.0** is *authorization* — a
client getting delegated, limited access without the user's password; **OIDC** adds
*authentication* and the **ID token** so you actually know who logged in; treating the two as one
is the classic tell. Learn two grants: **authorization code + PKCE** when a human is present
(PKCE binds the code to the client that started the flow), and **client credentials** for
service-to-service with no user, permissions coming from **app roles**. A **JWT** is a
self-contained `header.payload.signature` whose payload is *encoded, not encrypted*; you trust it
by validating the **signature** against the issuer's rotating keys **and** the `iss`/`aud`/`exp`
claims and required scope — signature alone is not authorization, and `alg: none` is an attack.
Access tokens are **short-lived bearer tokens**, refresh tokens are the revocable long-lived ones,
and the **ID token is not for calling APIs**. On Azure it is all **Entra ID** at the edge, each
service validating tokens **statelessly**, rejecting a wrong **`aud`**, and using **on-behalf-of**
to propagate a user's identity down a call chain.

Worth reading in full: the [Microsoft identity platform
documentation](https://learn.microsoft.com/en-us/entra/identity-platform/) for the Entra-concrete
flows and token handling, and [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) with
[RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) for the OAuth roles and the JWT
structure the whole model rests on.
