# De-vendor the distributed-tracing cheat sheet

Type: task
Status: open
Blocked by: —

## Question

AFK, via `/author`. `content/cheat-sheets/distributed-tracing-cheat-sheet.md` states its rules
partly in Application Insights terms (`operation_Id`, `operation_ParentId`, the App Insights
registration-order bug). Restate the cheat sheet vendor-neutrally (trace id / span id / parent
span id; OTel terms), keeping the version-bounded registration bugs only if they can be phrased
as the general hazard with the product named as one instance. The three tracing Lessons are not
touched. `npm run validate` passes.
