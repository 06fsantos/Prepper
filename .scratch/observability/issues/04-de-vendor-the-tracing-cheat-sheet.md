# De-vendor the distributed-tracing cheat sheet

Type: task
Status: resolved
Blocked by: —

## Question

AFK, via `/author`. `content/cheat-sheets/distributed-tracing-cheat-sheet.md` states its rules
partly in Application Insights terms (`operation_Id`, `operation_ParentId`, the App Insights
registration-order bug). Restate the cheat sheet vendor-neutrally (trace id / span id / parent
span id; OTel terms), keeping the version-bounded registration bugs only if they can be phrased
as the general hazard with the product named as one instance. The three tracing Lessons are not
touched. `npm run validate` passes.

## Answer

Done in `content/cheat-sheets/distributed-tracing-cheat-sheet.md`; the three tracing Lessons
are untouched. `npm run validate`: 0 errors (one unrelated pre-existing warning, `build-vs-buy`).

- The `operation_Id` / `operation_ParentId` bullet became an OTel one: a span carries trace id,
  span id, parent span id; every backend shows those three under its own names, App Insights'
  names given as the instance; "group by trace id".
- The two registration bugs became one general hazard — registering tracing after the HTTP
  pipeline can drop outbound spans silently — with `Microsoft.ApplicationInsights` ≤ 2.22.0 as
  the named, version-bounded instance (recorded 2026-08-27).
- **The `Grpc.Net.ClientFactory` ≤ 2.63.0 bug was dropped from the sheet.** It throws at runtime,
  so it isn't a silent correlation loss and doesn't fit the general hazard. It stays in
  [[trace-context-across-retries]].
- Hedging: "read the dependency timeline" (an App Insights view) became "read the span tree".
