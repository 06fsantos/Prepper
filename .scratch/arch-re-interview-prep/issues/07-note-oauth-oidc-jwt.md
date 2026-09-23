# Author: OAuth / OIDC / JWT note(s)

Type: task
Status: resolved
Claim: wayfinder session (Opus 4.8) — claimed 2026-09-23
Blocked by: 01

## Question

Author fluency-level vault note(s) on **OAuth 2.0 / OpenID Connect / JWT** — named in the brief, zero
coverage, and the natural "how do the services authenticate" follow-up in a microservices design.
Via `/author`, at the type/topic decided in 01. Must cover:

- OAuth 2.0 vs OIDC (authorization vs authentication); the roles (resource owner, client,
  authorization server, resource server).
- The grants that matter: **authorization code + PKCE** (user-facing), **client credentials**
  (service-to-service — the reinsurance-backend case).
- **JWT**: structure (header/payload/signature), validation, expiry/rotation, why not to trust
  unsigned claims; access vs refresh vs ID tokens.
- Where it sits in an Azure microservices world (Entra ID / a token issuer at the edge, tokens
  flowing between services); brief scopes/audiences.
- The fluency bar: enough to place auth in a system-design answer, not implement a provider.

## Decided attachment (from 01)

- **Type:** Lesson → `content/lessons/`
- **`topic:`** `authentication-and-authorization`
- **Also mint the new Term** `content/terms/authentication-and-authorization.md` as a **top-level
  topic** (no `topic:` field, like `databases`/`system-design`) — this ticket owns it.
- Files to mint: **1 Term + 1 Lesson**.

Resolved when the note(s) pass `npm run validate` and cover the above at fluency depth.

## Answer

Authored via `/author` and passing `npm run validate` (0 errors; the only warning in the run is
ticket 04's unwritten `reinsurance` link, not from these notes). Three files, not two — the
`authentication-and-authorization` topic got its cheat sheet alongside its first Lesson, matching
the effort's own precedent (ticket 05 minted a cheat sheet for its new topic) and the author
skill's ceiling habit; the ticket's "1 Term + 1 Lesson" line undercounts the same way ticket 01's
global tally omitted cheat sheets.

- **Term** `content/terms/authentication-and-authorization.md` — new **top-level** area Term (no
  `topic:`), framing authn ("who") vs authz ("what") and the delegated-token model, sitting on
  [[distributed-systems]] / [[system-design]].
- **Lesson** `content/lessons/oauth-oidc-and-jwt.md` (`topic: authentication-and-authorization`),
  four interleaved quiz blocks (mcq / cloze / mcq / recall). Covers: **OAuth = authorization vs
  OIDC = authentication** and the four roles (resource owner / client / authorization server /
  resource server); the two grants — **authorization code + PKCE** (user-facing; PKCE binds the
  code to its client) and **client credentials** (service-to-service, no user — the reinsurance
  backend case, permissions via app roles); **JWT** structure (`header.payload.signature`,
  encoded-not-encrypted), signature/`iss`/`aud`/`exp` validation, `alg:none` attack, key rotation
  via `kid`/JWKS, and access-vs-refresh-vs-ID tokens; and the **Azure/Entra ID** picture — issuer
  at the edge, stateless local validation, `aud` rejection (confused-deputy), on-behalf-of for
  chained calls.
- **Cheat sheet** `content/cheat-sheets/authentication-and-authorization-cheat-sheet.md` — the
  night-before 20%.
- **RESOURCES.md** — new "Authentication and authorization" subsection: RFC 6749, RFC 7636 (PKCE),
  OIDC Core, RFC 7519 (JWT) + JOSE, and the Microsoft identity platform docs.

Not committed — left for the dev to read the diff and commit.
