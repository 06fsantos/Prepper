# Per-user state storage and multi-user migration path

Parent: [Prepper — wayfinder map](../map.md)
Type: grilling
Status: out-of-scope
Blocked by: 05

## Question

Where does per-user state live in the static-first build, and what keeps the multi-user migration from being a rewrite?

State in question: review schedule, attempt history, quiz results, reading progress, mission.

To resolve:

- **Store.** `localStorage`, IndexedDB, or a file the reader exports and re-imports. Review history is the one thing here that is genuinely painful to lose, and browser storage can vanish silently — a cleared site, a different browser, a private window.
- **Durability.** Whether an export/backup path is required in the first slice given that risk.
- **Keying.** State points at content by whatever identity ticket 01 settles. Confirm the keys survive note renames and content edits.
- **Migration seam.** What shape the state has to take so that moving it to a server later is a transport change rather than a redesign. Naming the boundary now is most of the work.
- **Mission.** `teach`'s `MISSION.md` maps almost exactly onto "the role I am interviewing for", and it is the spine that grounds what gets taught. Decide whether it is vault content or per-user state — under multi-user those answers diverge sharply.

## Ruled out of scope

Closed by [Spaced-repetition model](05-spaced-repetition-model.md), which removed the
scheduler and with it every category of state this ticket existed to store: review
schedule, attempt history, quiz results, reading progress. The app is a **read-only
library** — every screen derives from `content/`, so there is no per-user state to place.

The one sub-question that was not about progress — whether the **mission** is vault content
or per-user state — is settled by default: it is vault content, an authored note like any
other. Multi-user, which this ticket was charged with keeping the door open for, is out of
scope with it.

Returns only if spaced repetition returns, and then as part of that effort.
