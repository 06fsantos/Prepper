---
id: 01M37Z75G2DT6SMGNMQ05PJ1HC
title: Authentication and authorization
---

The two questions every protected request has to answer: **authentication** is *who is
making this call*, **authorization** is *what are they allowed to do*. The modern answer to
both is a **delegated-token model** — an identity provider vouches for a caller, and the
caller carries a signed token that services check for themselves, so a password is never
passed around and no service holds the user's credentials. [[oauth-oidc-and-jwt|OAuth 2.0
supplies the authorization framework, OpenID Connect layers authentication on top, and the
JWT is the token they mint]]. It sits on [[distributed-systems]] because the hard part is not
one login screen but **trust flowing between services** — which is why it is the natural
"how do the services authenticate?" follow-up in a [[system-design]] round.
