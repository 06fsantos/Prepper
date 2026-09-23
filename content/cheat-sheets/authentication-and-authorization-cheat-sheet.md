---
id: 01M37Z75G3PKF0YWEXQWY7M8ZE
title: Authentication and authorization — cheat sheet
topic: authentication-and-authorization
---

- **OAuth 2.0 = authorization** ("what may this client do", delegated, no password shared).
  **OIDC = authentication** on top ("who is the user", adds the **ID token**). Don't conflate
  them — reading identity off an access token is the classic mistake OIDC fixes.
- **Four roles:** resource owner (user) · client (app) · authorization server (token issuer,
  e.g. Entra ID) · resource server (API that validates the token).

**Two grants worth knowing cold:**

- **Authorization code + PKCE** — user present (web/SPA/mobile). Redirect → login/consent →
  single-use **code** → exchange at token endpoint. **PKCE** (`code_verifier` → SHA-256
  `code_challenge`) binds the code to the client that started it. Implicit flow is deprecated.
- **Client credentials** — **service-to-service, no user**. Client authenticates as itself
  (secret/cert); permissions from **app roles**. No refresh token, no consent.

**JWT** = `header.payload.signature`, Base64URL — **encoded, not encrypted** (never put a secret
in it). Trust it by validating:

- **Signature** against the issuer's **public key**, fetched by `kid` from the **JWKS** endpoint
  (keys rotate — that's why it's a lookup). **Pin the algorithm**; reject `alg: none`.
- **Claims:** `iss`, **`aud`** (this API is the audience), `exp`, plus required **scope/role**.
  A valid signature is *not* authorization.

**Three tokens:** access (short-lived bearer, for the resource server) · ID (OIDC, proves login
to the *client*, not for APIs) · refresh (long-lived, revocable at the authz server, buys new
access tokens).

**On Azure:** **Entra ID** is the issuer at the edge; register client + API, API declares
scopes/app roles. Each service validates the JWT **statelessly** (no session store, no per-request
callback) and **rejects a wrong `aud`** (confused-deputy). Chained call as the user →
**on-behalf-of** exchange, never replay the token at the wrong audience.

The reach-for-it signal: any "how do the services authenticate / how does a request prove who it
is" question in a microservices design.

Full treatment: [[oauth-oidc-and-jwt]].
