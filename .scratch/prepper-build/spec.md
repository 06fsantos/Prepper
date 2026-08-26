# Prepper — implementation tickets

Labels: `ready-for-agent`

The spec these tickets implement lives at [Prepper — spec](../prepper/spec.md), with its
charting history in [the wayfinder map](../prepper/map.md). Domain vocabulary is
[`CONTEXT.md`](../../CONTEXT.md); the two standing decisions are
[ADR 0001](../../docs/adr/0001-split-note-identity.md) and
[ADR 0002](../../docs/adr/0002-quartz-as-the-build-pipeline.md).

This directory holds only the implementation tickets. `../prepper/issues/` holds the twenty
resolved wayfinder tickets that produced the spec; nothing here renumbers or supersedes them.

Tickets are numbered in dependency order, blockers first. Work the frontier: any ticket whose
blockers are all resolved.
