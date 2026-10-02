---
id: 01M3EP0PS9445EFY1CDV4KAP5E
title: Application security
---

What stops a request from doing something its sender should not be able to do, beyond proving
who the sender is: forged requests (CSRF), acting on someone else's records (broken object-level
authorization), a server tricked into calling where it shouldn't (SSRF), secrets and card data
leaking through config and logs, and forged callbacks from third parties. It sits next to
[[authentication-and-authorization]], which answers *who* and *what may they do*; this topic is
about the ways a system gets that answer wrong in practice, and it comes up as the "how would you
secure it?" follow-up in any [[system-design]] round that touches money.
