---
id: 01M48MT6VFZ8KWEP2MYQGFFRG6
title: Observability
---

Being able to tell, from the telemetry a running system emits, whether it is healthy and — when it
is not — why, without shipping new code to find out. Metrics say *that* something is wrong, traces
say *where*, logs say *what*, and the craft is in joining them: an SLO and a burn-rate alert on the
metric, a trace id carried from the alert to the trace to the log line, and a bill that stays
proportional to what the answers are worth. The subject is the discipline and its open standards —
OpenTelemetry, OTLP, the semantic conventions, W3C Trace Context — not any one vendor's dashboard.
