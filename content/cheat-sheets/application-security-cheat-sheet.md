---
id: 01M3EP0PS9E7FV60EQ98GZSFSX
title: Application security — cheat sheet
topic: application-security
---

- **The browser is untrusted.** Everything it sends is a claim. Frame a "secure this request"
  question as **trust boundaries**, and name the controls per hop.
- **CSRF** only matters when the credential is a **cookie** (the browser attaches it to forged
  requests). Defence: an **antiforgery token** (synchronizer, or signed double-submit);
  `[AutoValidateAntiforgeryToken]` in ASP.NET Core. **SameSite is defence in depth, not the
  defence.** A bearer token in a header isn't CSRF-exposed, but a script can read it, so the
  risk moves to XSS.
- **BOLA (broken object-level authorization)** is the #1 item in the OWASP API Security Top 10.
  Authenticated ≠ allowed on *this record*. Check ownership in every action that loads by a
  client-supplied ID; answer 404, not 403.
- **Never trust a client-sent amount.** Take an ID and load the price, currency and payee
  server-side. Money is `decimal`.
- **Keep card data off your servers.** Hosted fields (a provider iframe) → a token → **PCI SAQ A**.
  Raw card data through your API → **SAQ D**.
- **SCA (UK/EEA):** two of knowledge / possession / inherence; 3-D Secure 2 for cards; exemptions
  exist (low value, TRA, recurring after the first payment).
- **Secrets** in a secrets manager (AWS Secrets Manager, Azure Key Vault): least privilege,
  rotation, audit. Never in source, config files or images.
- **Logs:** no tokens, connection strings or card/bank data. Mask or hash instead. Keep a
  separate **audit trail**.
- **SSRF:** the outbound URL is config, never request input. Allowlist hosts, build the request
  yourself, disable redirects.
- **Outbound payment call:** record the intent as `Pending` **before** calling. Use the **same
  idempotency key on every attempt** (a fresh key is a second charge). On an ambiguous timeout,
  **query the status**.
- **Webhooks are public endpoints.** Verify the **HMAC signature** over the raw body with a
  constant-time compare. Reject stale timestamps (replay). De-duplicate by event ID and don't
  assume order. Return `2xx` fast and do the work off a queue. **Reconcile.**

The reach-for-it signal: "how would you secure…", or any design where money or someone else's
data moves because a browser asked.

Full treatment: [[securing-a-payment-request-end-to-end]].
